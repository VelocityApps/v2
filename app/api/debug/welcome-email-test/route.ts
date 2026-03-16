import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

/**
 * DEBUG ONLY - remove before launch
 *
 * GET /api/debug/welcome-email-test
 *   ?user_automation_id=xxx   (required) installed welcome-email-series automation
 *   &to_email=you@example.com (required) where test emails are sent
 *   &step=all|webhook|cron    (default: all)
 *   &skip_discount=true       (default: false) skip creating a real Shopify discount code
 *
 * Steps:
 *   webhook — inserts a fake welcome_email_series row (simulates orders/create)
 *   cron    — backdates the row to 8 days ago then runs runScheduled (sends all 3 emails)
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

  const automation = getAutomation('welcome-email-series');
  if (!automation) {
    return NextResponse.json({ error: 'welcome-email-series automation not registered' }, { status: 500 });
  }

  const log: string[] = [];
  const testOrderId = `TEST-${Date.now()}`;

  // ─── Step 1: Simulate orders/create webhook ───────────────────────────────

  if (step === 'webhook' || step === 'all') {
    const fakePayload = {
      id: testOrderId,
      name: `#TEST${Date.now().toString().slice(-4)}`,
      email: toEmail,
      created_at: new Date().toISOString(),
      total_price: '89.99',
      currency: 'USD',
      customer: {
        first_name: 'Test',
        last_name: 'Buyer',
        email: toEmail,
        orders_count: 1, // first-time buyer
      },
      line_items: [
        { title: 'Test Product Alpha', quantity: 1, price: '49.99', image: null },
        { title: 'Test Product Beta', quantity: 2, price: '20.00', image: null },
      ],
    };

    try {
      await automation.handleWebhook('orders/create', fakePayload, ua);
      log.push('✅ webhook step: orders/create handled — welcome_email_series row inserted');
    } catch (err: any) {
      log.push(`❌ webhook step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  // ─── Step 2: Backdate + run cron ──────────────────────────────────────────

  if (step === 'cron' || step === 'all') {
    // Backdate any unsent rows for this test (8 days ago = all 3 emails are due)
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();

    const { error: backdateErr } = await supabaseAdmin
      .from('welcome_email_series')
      .update({ ordered_at: eightDaysAgo })
      .eq('user_automation_id', userAutomationId)
      .is('email_1_sent_at', null);

    if (backdateErr) {
      log.push(`⚠️  backdate failed: ${backdateErr.message} — emails may not send if day offsets not met`);
    } else {
      log.push('✅ cron step: backdated unsent rows to 8 days ago');
    }

    // Temporarily patch config to skip real discount creation if requested
    const testUa = skipDiscount
      ? { ...ua, config: { ...(ua.config || {}), include_discount: false } }
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

  const { data: seriesRows } = await supabaseAdmin
    .from('welcome_email_series')
    .select('id, order_id, customer_email, ordered_at, email_1_sent_at, email_2_sent_at, email_3_sent_at, discount_code')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentLogs } = await supabaseAdmin
    .from('automation_logs')
    .select('event_type, message, created_at')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ log, series_rows: seriesRows, recent_logs: recentLogs });
}
