import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

/**
 * DEBUG ONLY - remove before launch
 *
 * GET /api/debug/best-sellers-test
 *   ?user_automation_id=xxx  (required)
 *   &sales_period=30         (default: 30) — days of order history to analyse
 *   &collection_size=20      (default: 20) — max products in collection
 *   &sort_by=units_sold|revenue|orders (default: units_sold)
 *
 * Runs runScheduled directly against the real Shopify store.
 * Check automation_logs for results and the Shopify admin to see the collection.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userAutomationId = searchParams.get('user_automation_id');
  const salesPeriod = parseInt(searchParams.get('sales_period') ?? '30', 10);
  const collectionSize = parseInt(searchParams.get('collection_size') ?? '20', 10);
  const sortBy = searchParams.get('sort_by') ?? 'units_sold';

  if (!userAutomationId) {
    return NextResponse.json({ error: 'user_automation_id is required' }, { status: 400 });
  }

  const { data: ua, error: uaError } = await supabaseAdmin
    .from('user_automations')
    .select('*')
    .eq('id', userAutomationId)
    .single();

  if (!ua) {
    return NextResponse.json({ error: 'user_automation not found', supabase_error: uaError, id_received: userAutomationId }, { status: 404 });
  }

  const automation = getAutomation('best-sellers-collection');
  if (!automation) {
    return NextResponse.json({ error: 'best-sellers-collection automation not registered' }, { status: 500 });
  }

  // Inject test params into config
  const testUa = {
    ...ua,
    config: {
      ...(ua.config || {}),
      sales_period: salesPeriod,
      collection_size: collectionSize,
      sort_by: sortBy,
      collection_name: ua.config?.collection_name || 'Best Sellers',
      collection_handle: ua.config?.collection_handle || 'best-sellers',
      update_frequency: 'weekly',
    },
  };

  const log: string[] = [];

  try {
    await automation.runScheduled!(testUa);
    log.push('✅ runScheduled completed — check automation_logs and your Shopify admin for the collection');
  } catch (err: any) {
    log.push(`❌ runScheduled failed: ${err.message}`);
    return NextResponse.json({ log, error: err.message }, { status: 500 });
  }

  const { data: recentLogs } = await supabaseAdmin
    .from('automation_logs')
    .select('event_type, message, created_at')
    .eq('user_automation_id', userAutomationId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ log, recent_logs: recentLogs });
}
