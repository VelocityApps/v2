import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

/**
 * DEBUG ONLY - remove before launch
 *
 * GET /api/debug/abandoned-cart-test
 *   ?user_automation_id=xxx   (required)
 *   &to_email=you@example.com (required)
 *   &step=all|webhook|cron    (default: all)
 *   &skip_discount=true       (default: false)
 *
 * Steps:
 *   webhook — inserts a fake abandoned_carts row (simulates checkouts/create)
 *   cron    — backdates the row to 73 hours ago then runs runScheduled (sends all 3 emails)
 *   all     — runs both in sequence
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userAutomationId = searchParams.get('user_automation_id');
  const toEmail = searchParams.get('to_email');
  const step = searchParams.get('step') ?? 'all';
  const skipDiscount = searchParams.get('skip_discount') === 'true';

  if (!userAutomationId) {
    return NextResponse.json({ error: 'user_automation_id is required' }, { status: 400 });
  }
  if (!toEmail) {
    return NextResponse.json({ error: 'to_email is required' }, { status: 400 });
  }

  const { data: ua, error: uaError } = await supabaseAdmin
    .from('user_automations')
    .select('*')
    .eq('id', userAutomationId)
    .single();

  if (!ua) {
    return NextResponse.json({ error: 'user_automation not found', supabase_error: uaError, id_received: userAutomationId }, { status: 404 });
  }

  const automation = getAutomation('abandoned-cart-recovery');
  if (!automation) {
    return NextResponse.json({ error: 'abandoned-cart-recovery automation not registered' }, { status: 500 });
  }

  const log: string[] = [];
  const testCheckoutToken = `TEST-${Date.now()}`;

  // ─── Step 1: Simulate checkouts/create webhook ────────────────────────────

  if (step === 'webhook' || step === 'all') {
    const fakePayload = {
      id: testCheckoutToken,
      token: testCheckoutToken,
      email: toEmail,
      created_at: new Date().toISOString(),
      total_price: '124.99',
      currency: 'GBP',
      abandoned_checkout_url: `https://test-store.myshopify.com/checkouts/${testCheckoutToken}`,
      customer: {
        first_name: 'Test',
        last_name: 'Shopper',
        email: toEmail,
      },
      line_items: [
        { title: 'Test Product Alpha', quantity: 1, price: '79.99' },
        { title: 'Test Product Beta', quantity: 1, price: '45.00' },
      ],
    };

    try {
      await automation.handleWebhook('checkouts/create', fakePayload, ua);
      log.push('✅ webhook step: checkouts/create handled — abandoned_carts row inserted');
    } catch (err: any) {
      log.push(`❌ webhook step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  // ─── Step 2: Backdate + run cron ──────────────────────────────────────────

  if (step === 'cron' || step === 'all') {
    // Backdate to 73 hours ago so all 3 emails are due (delays: 1h, 24h, 72h)
    const seventyThreeHoursAgo = new Date(Date.now() - 73 * 3_600_000).toISOString();

    const { error: backdateErr } = await supabaseAdmin
      .from('abandoned_carts')
      .update({ abandoned_at: seventyThreeHoursAgo })
      .eq('user_automation_id', userAutomationId)
      .is('email_1_sent_at', null);

    if (backdateErr) {
      log.push(`⚠️  backdate failed: ${backdateErr.message}`);
    } else {
      log.push('✅ cron step: backdated unsent rows to 73 hours ago');
    }

    // Patch config to skip real discount creation if requested
    const testUa = skipDiscount
      ? { ...ua, config: { ...(ua.config || {}), email_2_discount_percent: 0, email_3_discount_percent: 0 } }
      : ua;

    try {
      await automation.runScheduled!(testUa);
      log.push('✅ cron step: runScheduled completed — check your inbox and automation_logs');
    } catch (err: any) {
      log.push(`❌ cron step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  // ─── Fetch results ────────────────────────────────────────────────────────

  const { data: cartRows } = await supabaseAdmin
    .from('abandoned_carts')
    .select('id, checkout_id, customer_email, abandoned_at, status, email_1_sent_at, email_2_sent_at, email_3_sent_at, discount_code_2, discount_code_3')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentLogs } = await supabaseAdmin
    .from('automation_logs')
    .select('event_type, message, created_at')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ log, cart_rows: cartRows, recent_logs: recentLogs });
}
