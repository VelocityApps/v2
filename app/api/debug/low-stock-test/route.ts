import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

/**
 * DEBUG ONLY - remove before launch
 *
 * GET /api/debug/low-stock-test
 *   ?user_automation_id=xxx    (required)
 *   &to_email=you@example.com  (required) — injected into config.email_addresses
 *   &stock=5                   (default: 5) — simulated current stock level
 *   &threshold=10              (default: 10)
 *   &mode=immediate|digest     (default: immediate)
 *
 * immediate — simulates an inventory_levels/update webhook firing below threshold
 * digest    — runs runScheduled in daily-digest mode against the dev store's real products
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userAutomationId = searchParams.get('user_automation_id');
  const toEmail = searchParams.get('to_email');
  const stock = parseInt(searchParams.get('stock') ?? '5', 10);
  const threshold = parseInt(searchParams.get('threshold') ?? '10', 10);
  const mode = searchParams.get('mode') ?? 'immediate';

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

  const automation = getAutomation('low-stock-alerts');
  if (!automation) {
    return NextResponse.json({ error: 'low-stock-alerts automation not registered' }, { status: 500 });
  }

  const log: string[] = [];

  // Inject test email + config into the ua object
  const testUa = {
    ...ua,
    config: {
      ...(ua.config || {}),
      notification_method: 'email',
      email_addresses: toEmail,
      threshold,
      frequency: mode === 'digest' ? 'daily-digest' : 'immediate',
      alert_cooldown_hours: 0, // disable cooldown for testing
    },
  };

  if (mode === 'immediate') {
    // Simulate inventory_levels/update webhook with stock below threshold
    const fakePayload = {
      id: 'TEST-INVENTORY',
      inventory_item_id: '999000111',
      location_id: '111000999',
      available: stock,
    };

    try {
      await automation.handleWebhook('inventory_levels/update', fakePayload, testUa);
      log.push(`✅ webhook step: inventory_levels/update handled — stock: ${stock}, threshold: ${threshold}`);
    } catch (err: any) {
      log.push(`❌ webhook step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  } else {
    // Daily digest — run scheduled against real store products
    try {
      await automation.runScheduled!(testUa);
      log.push('✅ digest step: runScheduled completed — check your inbox and automation_logs');
    } catch (err: any) {
      log.push(`❌ digest step failed: ${err.message}`);
      return NextResponse.json({ log, error: err.message }, { status: 500 });
    }
  }

  const { data: recentLogs } = await supabaseAdmin
    .from('automation_logs')
    .select('event_type, message, created_at')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ log, recent_logs: recentLogs });
}
