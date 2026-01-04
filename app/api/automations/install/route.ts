import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';
import { encryptToken } from '@/lib/shopify/oauth';

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

    if (!automationId || !shopifyStoreUrl || !shopifyAccessToken) {
      return NextResponse.json(
        { error: 'automationId, shopifyStoreUrl, and shopifyAccessToken are required' },
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

    // Check if already installed
    const { data: existing } = await supabaseAdmin
      .from('user_automations')
      .select('id')
      .eq('user_id', user.id)
      .eq('automation_id', automationId)
      .eq('shopify_store_url', shopifyStoreUrl)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Automation already installed for this store' },
        { status: 400 }
      );
    }

    // Encrypt Shopify access token
    const encryptedToken = await encryptToken(shopifyAccessToken);

    // Create user_automation record
    const { data: userAutomation, error: createError } = await supabaseAdmin
      .from('user_automations')
      .insert({
        user_id: user.id,
        automation_id: automationId,
        shopify_store_url: shopifyStoreUrl,
        shopify_access_token_encrypted: encryptedToken,
        config: config || {},
        status: 'active',
      })
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
          .update({ status: 'error', error_message: error.message })
          .eq('id', userAutomation.id);
        
        return NextResponse.json(
          { error: `Failed to install automation: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      userAutomationId: userAutomation.id,
      userAutomation,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automations/install:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to install automation' },
      { status: 500 }
    );
  }
}

