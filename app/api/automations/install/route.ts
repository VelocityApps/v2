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

    const { automationId, config, shopifyStoreUrl, shopifyAccessToken } = await request.json();

    // Input validation
    if (!automationId || !shopifyStoreUrl || !shopifyAccessToken) {
      return NextResponse.json(
        { error: 'automationId, shopifyStoreUrl, and shopifyAccessToken are required' },
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

    // Validate config
    if (config && !validateAutomationConfig(config)) {
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    // Validate token format (basic check)
    if (typeof shopifyAccessToken !== 'string' || shopifyAccessToken.length < 20) {
      return NextResponse.json(
        { error: 'Invalid access token format' },
        { status: 400 }
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
      .eq('shopify_store_url', shopifyStoreUrl)
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
      shopify_store_url: shopifyStoreUrl,
      shopify_access_token_encrypted: await encryptToken(shopifyAccessToken),
      config: config || {},
      status: trialEligible ? 'trial' : 'active',
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
        { error: 'Failed to install automation' },
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



