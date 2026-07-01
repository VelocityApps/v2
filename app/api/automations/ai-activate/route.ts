import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUUID } from '@/lib/validation';

const AI_AUTOMATION_PRICE = 9.00; // $/mo for custom AI-built automations

/**
 * POST /api/automations/ai-activate
 * Converts a confirmed ai_automation_drafts row into live automation records:
 *   1. Creates a new row in `automations` (catalog entry, not visible in marketplace)
 *   2. Creates a `user_automations` trial row pointing to it
 *   3. Marks the draft as status='active'
 * Returns { userAutomationId } — the client calls /api/automations/{id}/subscribe to start billing.
 */
export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse body
  let draftId: string;
  let editedTrigger: unknown;
  let editedAction: unknown;
  try {
    const body = await request.json();
    draftId = String(body.draftId ?? '').trim();
    editedTrigger = body.trigger; // merchant may have tweaked these in the UI
    editedAction = body.action;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!validateUUID(draftId)) {
    return NextResponse.json({ error: 'Invalid draftId' }, { status: 400 });
  }

  // Fetch and verify draft ownership
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('ai_automation_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }
  if (draft.status === 'active') {
    return NextResponse.json({ error: 'Draft already activated' }, { status: 400 });
  }
  if (draft.status === 'error') {
    return NextResponse.json({ error: 'Draft is in error state and cannot be activated' }, { status: 400 });
  }

  // Use merchant-edited trigger/action if provided, otherwise fall back to original
  const trigger = editedTrigger ?? draft.parsed_trigger;
  const action = editedAction ?? draft.parsed_action;

  if (!trigger || !action) {
    return NextResponse.json({ error: 'Draft has no parsed trigger/action' }, { status: 400 });
  }

  // Derive a human-readable name from trigger + action types
  const triggerLabel: Record<string, string> = {
    'order/paid': 'Order Paid',
    'order/fulfilled': 'Order Fulfilled',
    'customer/create': 'New Customer',
    'refund/create': 'Refund Created',
  };
  const actionLabel: Record<string, string> = {
    tag_customer: 'Tag Customer',
    send_discount: 'Send Discount',
    add_order_note: 'Add Order Note',
    send_email: 'Send Email',
  };
  const triggerType = (trigger as any).type ?? 'event';
  const actionType = (action as any).type ?? 'action';
  const automationName = `${triggerLabel[triggerType] ?? triggerType} → ${actionLabel[actionType] ?? actionType}`;

  // Create a catalog entry in `automations` (active=false so it never appears in marketplace)
  const slug = `ai-${draftId.slice(0, 8)}`;
  const { data: catalogRow, error: catalogError } = await supabaseAdmin
    .from('automations')
    .insert({
      name: automationName,
      slug,
      description: `Custom automation: ${automationName}`,
      category: 'automation',
      price_monthly: AI_AUTOMATION_PRICE,
      icon: '✨',
      features: ['AI-generated', 'Custom trigger', 'Custom action'],
      config_schema: { trigger, action, ai_generated: true },
      active: false, // not visible in marketplace
    })
    .select('id')
    .single();

  if (catalogError || !catalogRow) {
    console.error('[ai-activate] Failed to create automations row:', catalogError);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }

  // Resolve Shopify access token from existing user_automations for this store
  const shopDomain = draft.shop_domain
    .replace(/^https?:\/\//i, '')
    .toLowerCase()
    .split('/')[0];

  const { data: existingUa } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_access_token_encrypted')
    .eq('user_id', user.id)
    .or(`shopify_store_url.eq.${shopDomain},shopify_store_url.eq.https://${shopDomain}`)
    .not('shopify_access_token_encrypted', 'is', null)
    .limit(1)
    .maybeSingle();

  const encryptedToken = existingUa?.shopify_access_token_encrypted ?? null;

  // Create the user_automations trial row
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data: userAutomation, error: uaError } = await supabaseAdmin
    .from('user_automations')
    .insert({
      user_id: user.id,
      automation_id: catalogRow.id,
      shopify_store_url: shopDomain,
      shopify_access_token_encrypted: encryptedToken,
      config: { trigger, action },
      status: 'trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select('id')
    .single();

  if (uaError || !userAutomation) {
    // Clean up the catalog row we just created
    await supabaseAdmin.from('automations').delete().eq('id', catalogRow.id);
    console.error('[ai-activate] Failed to create user_automations row:', uaError);
    return NextResponse.json({ error: 'Failed to activate automation' }, { status: 500 });
  }

  // Mark draft as active
  await supabaseAdmin
    .from('ai_automation_drafts')
    .update({ status: 'active' })
    .eq('id', draftId);

  return NextResponse.json({ userAutomationId: userAutomation.id });
}
