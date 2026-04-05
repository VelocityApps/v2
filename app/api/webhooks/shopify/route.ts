import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/shopify/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * POST /api/webhooks/shopify
 * Handle Shopify webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');

    if (!signature || !topic || !shop) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Reject any shop domain that isn't a legitimate myshopify.com host
    if (!shop.endsWith('.myshopify.com') || shop.includes('/') || shop.includes('..')) {
      return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
    }

    // Verify webhook signature — mandatory
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[ShopifyWebhook] SHOPIFY_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const isValid = verifyWebhookSignature(body, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // ── App-level billing webhook ────────────────────────────────────────────
    if (topic === 'app_subscriptions/update') {
      await handleAppSubscriptionUpdate(payload);
      return NextResponse.json({ success: true });
    }

    // ── Immediate app uninstall (fires the moment merchant uninstalls) ────────
    if (topic === 'app/uninstalled') {
      await handleAppUninstalled(shop);
      return NextResponse.json({ success: true });
    }

    // ── Description Writer: auto-generate on new product ─────────────────────
    if (topic === 'products/create') {
      // Fire-and-forget — respond 200 immediately to stay within Shopify's 5s window
      void handleProductCreated(payload, shop);
      return NextResponse.json({ success: true });
    }

    // ── Mandatory GDPR compliance webhooks ───────────────────────────────────
    if (topic === 'customers/data_request') {
      // Customer requested their data. Log it — no automated export required
      // by Shopify, but you must respond to the customer within 30 days.
      console.log(`[GDPR] customers/data_request from shop ${shop}`, {
        customer_id: payload.customer?.id,
        email: payload.customer?.email,
      });
      return NextResponse.json({ success: true });
    }

    if (topic === 'customers/redact') {
      // Customer requested deletion of their data.
      await handleCustomerRedact(payload, shop);
      return NextResponse.json({ success: true });
    }

    if (topic === 'shop/redact') {
      // Merchant uninstalled the app — delete all their data (fires 48h after uninstall).
      await handleShopRedact(shop);
      return NextResponse.json({ success: true });
    }

    // Filter by shop in the DB and inner-join to only get automations
    // that have a webhook registered for this topic — avoids fetching
    // all automations and per-automation webhook lookups.
    const { data: userAutomations, error } = await supabaseAdmin
      .from('user_automations')
      .select(`
        *,
        automation:automations(*),
        shopify_webhooks!inner(id)
      `)
      .in('status', ['active', 'trial'])
      .or(`shopify_store_url.eq.${shop},shopify_store_url.eq.https://${shop}`)
      .eq('shopify_webhooks.topic', topic);

    if (error) {
      console.error('Error fetching user automations:', error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }

    if (!userAutomations || userAutomations.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Process webhook for each matching automation
    const promises = userAutomations.map(async (userAutomation: any) => {
      const automation = userAutomation.automation;
      if (!automation) return;

      // Get automation instance and handle webhook
      const automationInstance = getAutomation(automation.slug);
      if (automationInstance) {
        try {
          await automationInstance.handleWebhook(topic, payload, userAutomation);
        } catch (error: any) {
          console.error(
            `Error handling webhook for automation ${automation.slug}:`,
            error
          );
          // Update automation status to error
          await supabaseAdmin
            .from('user_automations')
            .update({
              status: 'error',
              error_message: error.message,
            })
            .eq('id', userAutomation.id);
        }
      }
    });

    // Wait for all automations to process (but don't fail if one fails)
    await Promise.allSettled(promises);

    // Return success quickly (Shopify timeout is 5 seconds)
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Shopify webhook:', error);
    // Still return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: true });
  }
}

// ── app_subscriptions/update ────────────────────────────────────────────────
// Fires when a merchant's app subscription changes status (ACTIVE, CANCELLED,
// DECLINED, FROZEN, PENDING, EXPIRED).

async function handleAppSubscriptionUpdate(payload: any): Promise<void> {
  try {
    const appSubscription = payload.app_subscription;
    if (!appSubscription) return;

    const gid: string = appSubscription.admin_graphql_api_id || '';
    const shopifyStatus: string = (appSubscription.status || '').toUpperCase();

    // Extract numeric charge ID from GID: "gid://shopify/AppSubscription/12345"
    const chargeId = gid.split('/').pop();
    if (!chargeId) return;

    // ── Check if this is a description writer charge ──────────────────────────
    const { data: descProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('description_writer_charge_id', chargeId)
      .maybeSingle();

    if (descProfile) {
      if (shopifyStatus === 'CANCELLED' || shopifyStatus === 'DECLINED' || shopifyStatus === 'EXPIRED') {
        await supabaseAdmin
          .from('user_profiles')
          .update({ has_description_writer: false })
          .eq('user_id', descProfile.user_id);
      }
      return;
    }

    // ── Otherwise handle as an automation subscription ────────────────────────
    const { data: ua } = await supabaseAdmin
      .from('user_automations')
      .select('id, status')
      .eq('shopify_charge_id', chargeId)
      .maybeSingle();

    if (!ua) return; // Unknown subscription — ignore

    let newStatus: string;
    switch (shopifyStatus) {
      case 'ACTIVE':
        newStatus = 'active';
        break;
      case 'CANCELLED':
      case 'DECLINED':
        newStatus = 'cancelled';
        break;
      case 'FROZEN':
      case 'EXPIRED':
        newStatus = 'paused';
        break;
      default:
        return; // PENDING — no change needed
    }

    await supabaseAdmin
      .from('user_automations')
      .update({ status: newStatus, error_message: null })
      .eq('id', ua.id);
  } catch (err: any) {
    console.error('[app_subscriptions/update] Error:', err.message);
  }
}

// ── products/create auto-trigger ─────────────────────────────────────────────
// If the merchant has the Description Writer add-on with auto-trigger enabled,
// and the new product has no description, generate one and push it back.

async function handleProductCreated(payload: any, shop: string): Promise<void> {
  try {
    const product = payload;
    if (!product?.id) return;

    // Skip if product already has a description
    const existingDesc: string = product.body_html ?? '';
    if (existingDesc.trim().length > 0) return;

    // Resolve the user who owns this shop
    const shopNormalized = shop.replace(/^https?:\/\//i, '').toLowerCase().split('/')[0];

    const { data: uas } = await supabaseAdmin
      .from('user_automations')
      .select('user_id, shopify_access_token_encrypted, shopify_store_url')
      .in('status', ['active', 'trial'])
      .not('shopify_access_token_encrypted', 'is', null);

    const ua = (uas ?? []).find((r: any) => {
      const stored = (r.shopify_store_url ?? '').replace(/^https?:\/\//i, '').toLowerCase().split('/')[0];
      return stored === shopNormalized;
    });

    if (!ua) return;

    // Check user has Description Writer + auto-trigger enabled
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('has_description_writer')
      .eq('user_id', ua.user_id)
      .maybeSingle();

    if (!profile?.has_description_writer) return;

    const { data: settings } = await supabaseAdmin
      .from('description_writer_settings')
      .select('auto_trigger_enabled, default_tone, default_language, brand_voice_instructions')
      .eq('user_id', ua.user_id)
      .maybeSingle();

    if (!settings?.auto_trigger_enabled) return;

    const tone = settings.default_tone ?? 'premium';
    const language = settings.default_language ?? 'en';
    const brandVoice = settings.brand_voice_instructions ?? null;

    // Build bullet points from tags
    const tags: string[] = (product.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const bulletPoints = tags.length > 0 ? tags.slice(0, 5) : ['See product details'];

    const systemPrompt = buildAutoTriggerSystemPrompt(tone, brandVoice);
    const userMessage = `Product title: ${product.title}\n\nKey points to highlight:\n${bulletPoints.map((b: string) => `- ${b}`).join('\n')}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const output = (message.content[0] as Anthropic.TextBlock).text;

    // Push description back to Shopify
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const { ShopifyClient } = await import('@/lib/shopify/client');
    const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
    const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);
    await shopify.updateProduct(String(product.id), { body_html: output } as any);

    // Log to description_generations
    await supabaseAdmin.from('description_generations').insert({
      user_id: ua.user_id,
      product_id: String(product.id),
      input_data: { productTitle: product.title, bulletPoints, tone, language, trigger: 'auto' },
      output,
      tone,
      language,
    });
  } catch (err: any) {
    console.error('[products/create auto-trigger] Error:', err.message);
  }
}

const AUTO_TRIGGER_TONE_INSTRUCTIONS: Record<string, string> = {
  casual:    'Write in a friendly, conversational tone with contractions and a warm voice.',
  premium:   'Write in an elevated, sophisticated tone that conveys quality and exclusivity.',
  technical: 'Write in a precise, informative tone with accurate terminology.',
  playful:   'Write in a fun, energetic tone that resonates with a younger audience.',
};

function buildAutoTriggerSystemPrompt(tone: string, brandVoice?: string | null): string {
  const toneInstruction = AUTO_TRIGGER_TONE_INSTRUCTIONS[tone] ?? AUTO_TRIGGER_TONE_INSTRUCTIONS.premium;
  return `You are an expert Shopify product copywriter.
${toneInstruction}
Output clean semantic HTML for the Shopify product editor: one intro <p>, a <ul> of 3-5 benefit-led <li> items, and a closing CTA <p>.
Never use generic filler phrases. Be specific and vivid.${brandVoice ? `\n\nBrand voice: ${brandVoice}` : ''}`;
}

// ── app/uninstalled ──────────────────────────────���────────────────────────────
// Fires immediately when a merchant uninstalls. Cancel automations and clear
// the now-revoked access token. Shopify auto-cancels AppSubscriptions and will
// fire app_subscriptions/update CANCELLED for each one — this handler just
// makes the state change synchronous so automations stop running right away.

async function handleAppUninstalled(shop: string): Promise<void> {
  try {
    const shopNormalized = shop.replace(/^https?:\/\//i, '').toLowerCase();

    const { data: uas } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .ilike('shopify_store_url', `%${shopNormalized}%`)
      .in('status', ['active', 'trial', 'paused']);

    if (!uas?.length) return;

    const uaIds = uas.map((ua: any) => ua.id);

    // Cancel automations and wipe the revoked token immediately
    await supabaseAdmin
      .from('user_automations')
      .update({
        status: 'cancelled',
        shopify_access_token_encrypted: null,
        error_message: 'App uninstalled by merchant',
      })
      .in('id', uaIds);

    // Remove webhook registrations — Shopify already deleted them on their side
    await supabaseAdmin
      .from('shopify_webhooks')
      .delete()
      .in('user_automation_id', uaIds);

    console.log(`[app/uninstalled] Cancelled ${uaIds.length} automations for ${shop}`);
  } catch (err: any) {
    console.error('[app/uninstalled] Error:', err.message);
  }
}

// ── customers/redact ───────────────────────────────────���─────────────────────
// Delete any personal data we hold for this customer (email, name).
// Affects: abandoned_carts, scheduled_review_requests.

async function handleCustomerRedact(payload: any, shop: string): Promise<void> {
  try {
    const customerEmail: string | undefined = payload.customer?.email;
    if (!customerEmail) return;

    const shopNormalized = shop.replace(/^https?:\/\//i, '').toLowerCase();

    // Find user_automations for this shop
    const { data: uas } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .ilike('shopify_store_url', `%${shopNormalized}%`);

    if (!uas?.length) return;

    const uaIds = uas.map((ua: any) => ua.id);

    // Delete abandoned cart records for this customer
    await supabaseAdmin
      .from('abandoned_carts')
      .delete()
      .in('user_automation_id', uaIds)
      .eq('customer_email', customerEmail);

    // Delete scheduled review requests for this customer
    await supabaseAdmin
      .from('scheduled_review_requests')
      .delete()
      .in('user_automation_id', uaIds)
      .eq('customer_email', customerEmail);

    console.log(`[GDPR] customers/redact: deleted data for ${customerEmail} on ${shop}`);
  } catch (err: any) {
    console.error('[GDPR] customers/redact error:', err.message);
  }
}

// ── shop/redact ───────────────────────────────────────────────────────────────
// Merchant uninstalled — delete all their automations and associated data.
// Fires 48 hours after uninstall.

async function handleShopRedact(shop: string): Promise<void> {
  try {
    const shopNormalized = shop.replace(/^https?:\/\//i, '').toLowerCase();

    // Find all user_automations for this shop
    const { data: uas } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .ilike('shopify_store_url', `%${shopNormalized}%`);

    if (!uas?.length) return;

    const uaIds = uas.map((ua: any) => ua.id);

    // Cascade-delete dependent tables (RLS cascade should handle most, but be explicit)
    await supabaseAdmin.from('abandoned_carts').delete().in('user_automation_id', uaIds);
    await supabaseAdmin.from('scheduled_review_requests').delete().in('user_automation_id', uaIds);
    await supabaseAdmin.from('automation_logs').delete().in('user_automation_id', uaIds);
    await supabaseAdmin.from('shopify_webhooks').delete().in('user_automation_id', uaIds);

    // Mark automations as uninstalled rather than hard-deleting (preserves billing history)
    await supabaseAdmin
      .from('user_automations')
      .update({ status: 'uninstalled' })
      .in('id', uaIds);

    console.log(`[GDPR] shop/redact: cleaned up ${uaIds.length} automations for ${shop}`);
  } catch (err: any) {
    console.error('[GDPR] shop/redact error:', err.message);
  }
}



