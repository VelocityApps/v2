import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';

/**
 * GET /api/description-writer/settings
 * Returns the current user's description writer settings.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: settings } = await supabaseAdmin
    .from('description_writer_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ settings: settings ?? null });
}

/**
 * PUT /api/description-writer/settings
 * Upserts the user's description writer settings.
 * When auto_trigger_enabled changes, registers / deregisters the products/create webhook.
 */
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { default_tone, default_language, auto_trigger_enabled, brand_voice_instructions } = body;

  // Load current settings to compare auto_trigger state
  const { data: current } = await supabaseAdmin
    .from('description_writer_settings')
    .select('auto_trigger_enabled, auto_trigger_webhook_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const wasEnabled: boolean = current?.auto_trigger_enabled ?? false;
  const nowEnabled: boolean = auto_trigger_enabled ?? wasEnabled;
  let webhookId: string | null = current?.auto_trigger_webhook_id ?? null;

  // Register / deregister webhook if the toggle changed
  if (nowEnabled !== wasEnabled) {
    const { data: ua } = await supabaseAdmin
      .from('user_automations')
      .select('shopify_store_url, shopify_access_token_encrypted')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial'])
      .not('shopify_access_token_encrypted', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ua) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
      const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
      const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

      if (nowEnabled) {
        try {
          const webhook = await shopify.createWebhook(
            'products/create',
            `${appUrl}/api/webhooks/shopify`
          );
          webhookId = String(webhook.id);
        } catch (err: any) {
          console.error('[description-writer/settings] Failed to register webhook:', err.message);
          // Non-fatal — proceed without webhook ID
        }
      } else {
        if (webhookId) {
          try {
            await shopify.deleteWebhook(webhookId);
          } catch {
            // Webhook may already be gone — ignore
          }
          webhookId = null;
        }
      }
    }
  }

  const { data: settings, error } = await supabaseAdmin
    .from('description_writer_settings')
    .upsert(
      {
        user_id: user.id,
        default_tone: default_tone ?? 'premium',
        default_language: default_language ?? 'en',
        auto_trigger_enabled: nowEnabled,
        brand_voice_instructions: brand_voice_instructions ?? null,
        auto_trigger_webhook_id: webhookId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[description-writer/settings] Save error:', error.message);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
