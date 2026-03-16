import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

/**
 * DEBUG ONLY - remove before launch
 *
 * GET /api/debug/review-request-test
 *   ?user_automation_id=xxx   (required)
 *   &to_email=you@example.com (required)
 *   &step=all|webhook|cron    (default: all)
 *   &platform=shopify|google|trustpilot|judge_me|custom (default: shopify)
 *
 * Steps:
 *   webhook — simulates orders/fulfilled, schedules a review request
 *   cron    — backdates send_at to now and runs runScheduled (sends the email)
 *   all     — runs both in sequence
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userAutomationId = searchParams.get('user_automation_id');
  const toEmail = searchParams.get('to_email');
  const step = searchParams.get('step') ?? 'all';
  const platform = searchParams.get('platform') ?? 'shopify';

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

  const automation = getAutomation('review-request-automator');
  if (!automation) {
    return NextResponse.json({ error: 'review-request-automator not registered' }, { status: 500 });
  }

  const log: string[] = [];
  const testOrderId = `TEST-${Date.now()}`;

  // ─── Step 1: Simulate orders/fulfilled webhook ────────────────────────────

  if (step === 'webhook' || step === 'all') {
    const fakePayload = {
      id: testOrderId,
      name: `#TEST${Date.now().toString().slice(-4)}`,
      email: toEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: {
        first_name: 'Test',
        last_name: 'Shopper',
        email: toEmail,
      },
      fulfillments: [{ created_at: new Date().toISOString() }],
      line_items: [
        { product_id: '123456789', variant_id: '987654321', title: 'Test Product Alpha', quantity: 1, price: '49.99', handle: 'test-product-alpha' },
        { product_id: '111222333', variant_id: '333222111', title: 'Test Product Beta', quantity: 2, price: '20.00', handle: 'test-product-beta' },
      ],
    };

    // Override platform in config for this test
    ua.config = { ...(ua.config || {}), review_platform: platform };

    try {
      await automation.handleWebhook('orders/fulfilled', fakePayload, ua);
      log.push(`✅ webhook step: orders/fulfilled handled — review request scheduled (platform: ${platform})`);
    } catch (err: any) {
      log.push(`❌ webhook step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  // ─── Step 2: Backdate send_at + run cron ─────────────────────────────────

  if (step === 'cron' || step === 'all') {
    const { error: backdateErr } = await supabaseAdmin
      .from('scheduled_review_requests')
      .update({ send_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('user_automation_id', userAutomationId)
      .eq('status', 'pending');

    if (backdateErr) {
      log.push(`⚠️  backdate failed: ${backdateErr.message}`);
    } else {
      log.push('✅ cron step: backdated pending review requests to now');
    }

    try {
      await automation.runScheduled!(ua);
      log.push('✅ cron step: runScheduled completed — check your inbox and automation_logs');
    } catch (err: any) {
      log.push(`❌ cron step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  // ─── Fetch results ────────────────────────────────────────────────────────

  const { data: reviewRows } = await supabaseAdmin
    .from('scheduled_review_requests')
    .select('id, order_id, order_name, customer_email, send_at, status, sent_at, error')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentLogs } = await supabaseAdmin
    .from('automation_logs')
    .select('event_type, message, created_at')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ log, review_rows: reviewRows, recent_logs: recentLogs });
}
