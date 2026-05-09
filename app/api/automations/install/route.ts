import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';
import { encryptToken } from '@/lib/shopify/oauth';
import { validateShopifyStoreUrl, validateUUID, validateAutomationConfig } from '@/lib/validation';

/**
 * POST /api/automations/install
 * Install an automation for the user's store
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { automationId, config, shopifyStoreUrl, shopifyAccessToken, embedded } = await request.json();

    // Input validation
    if (!automationId || !shopifyStoreUrl) {
      return NextResponse.json(
        { error: 'automationId and shopifyStoreUrl are required' },
        { status: 400 }
      );
    }
    if (!shopifyAccessToken && !embedded) {
      return NextResponse.json(
        { error: 'shopifyAccessToken is required (or pass embedded:true for embedded app installs)' },
        { status: 400 }
      );
    }

    // Validate UUID
    if (!validateUUID(automationId)) {
      return NextResponse.json(
        { error: 'Invalid automation ID format' },
        { status: 400 }
      );
    }

    // Validate Shopify store URL
    if (!validateShopifyStoreUrl(shopifyStoreUrl)) {
      return NextResponse.json(
        { error: 'Invalid Shopify store URL format' },
        { status: 400 }
      );
    }

    // Normalize shop URL — strip protocol and trailing slashes so DB values are consistent
    const normalizedStoreUrl = shopifyStoreUrl
      .replace(/^https?:\/\//i, '')
      .toLowerCase()
      .split('/')[0];

    // Validate config
    if (config && !validateAutomationConfig(config)) {
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    // Resolve the access token — either provided directly or looked up from an
    // existing user_automation record (embedded installs reuse the stored token).
    let resolvedToken: string = shopifyAccessToken ?? '';

    if (embedded && !resolvedToken) {
      const normalizedShop = shopifyStoreUrl
        .replace(/^https?:\/\//i, '')
        .toLowerCase()
        .split('/')[0];

      const { data: existing } = await supabaseAdmin
        .from('user_automations')
        .select('shopify_access_token_encrypted')
        .eq('user_id', user.id)
        .or(`shopify_store_url.eq.${normalizedShop},shopify_store_url.eq.https://${normalizedShop}`)
        .not('shopify_access_token_encrypted', 'is', null)
        .limit(1)
        .maybeSingle();

      if (existing?.shopify_access_token_encrypted) {
        const { decryptToken } = await import('@/lib/shopify/oauth');
        resolvedToken = await decryptToken(existing.shopify_access_token_encrypted);
      }

      // Fallback: claim from server-side pending tokens table (set during OAuth callback)
      if (!resolvedToken) {
        const { data: pending } = await supabaseAdmin
          .from('shopify_pending_tokens')
          .select('encrypted_token')
          .eq('shop', normalizedShop)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (pending?.encrypted_token) {
          const { decryptToken } = await import('@/lib/shopify/oauth');
          resolvedToken = await decryptToken(pending.encrypted_token);
          // Claim and delete so it can't be reused
          await supabaseAdmin
            .from('shopify_pending_tokens')
            .delete()
            .eq('shop', normalizedShop);
        }
      }
    }

    if (!resolvedToken || resolvedToken.length < 20) {
      return NextResponse.json(
        { error: 'No valid Shopify access token found. Please reconnect your store.' },
        { status: 422 }
      );
    }

    // Get automation details
    const { data: automation, error: automationError } = await supabaseAdmin
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .single();

    if (automationError || !automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Check if already installed (ignore soft-deleted rows)
    const { data: existing } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .eq('user_id', user.id)
      .eq('automation_id', automationId)
      .eq('shopify_store_url', normalizedStoreUrl)
      .neq('status', 'uninstalled')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Automation already installed for this store' },
        { status: 400 }
      );
    }

    // One free trial per user per automation type
    const { data: priorTrial } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .eq('user_id', user.id)
      .eq('automation_id', automationId)
      .not('trial_started_at', 'is', null)
      .limit(1);

    const trialEligible = !priorTrial?.length;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      automation_id: automationId,
      shopify_store_url: normalizedStoreUrl,
      shopify_access_token_encrypted: await encryptToken(resolvedToken),
      config: config || {},
      status: trialEligible ? 'trial' : 'requires_payment',
    };
    if (trialEligible) {
      insertRow.trial_started_at = now.toISOString();
      insertRow.trial_ends_at = trialEndsAt.toISOString();
    }

    const { data: userAutomation, error: createError } = await supabaseAdmin
      .from('user_automations')
      .insert(insertRow)
      .select()
      .single();

    if (createError) {
      console.error('Error creating user automation:', createError);
      return NextResponse.json(
        { error: `Failed to install automation: ${createError.message}` },
        { status: 500 }
      );
    }

    // Run automation's install method
    const automationInstance = getAutomation(automation.slug);
    if (automationInstance) {
      try {
        await automationInstance.install(userAutomation.id);
      } catch (error: any) {
        console.error('Error during automation install:', error);
        // Update status to error
        await supabaseAdmin
          .from('user_automations')
          .update({ status: 'error' as const, error_message: error.message })
          .eq('id', userAutomation.id);
        
        return NextResponse.json(
          { error: `Failed to install automation: ${error.message}` },
          { status: 500 }
        );
      }
    }

    if (trialEligible && user.email) {
      try {
        const { sendTrialStartedEmail } = await import('@/lib/email/trial');
        await sendTrialStartedEmail(
          user.email,
          automation.name,
          new Date(userAutomation.trial_ends_at)
        );
      } catch (e) {
        console.error('[Install] Trial welcome email failed:', e);
      }
    }

    // Strip encrypted token before returning to client
    const { shopify_access_token_encrypted: _omit, ...safeAutomation } = userAutomation;

    return NextResponse.json({
      success: true,
      userAutomationId: userAutomation.id,
      userAutomation: safeAutomation,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automations/install:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to install automation' },
      { status: 500 }
    );
  }
}



