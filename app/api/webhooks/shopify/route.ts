import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/shopify/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

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

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body);

    // Find all active automations for this shop that listen to this topic
    const { data: userAutomations, error } = await supabaseAdmin
      .from('user_automations')
      .select(`
        *,
        automation:automations(*)
      `)
      .eq('shopify_store_url', shop)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching user automations:', error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }

    if (!userAutomations || userAutomations.length === 0) {
      // No automations for this shop, return success anyway
      return NextResponse.json({ success: true });
    }

    // Process webhook for each automation
    const promises = userAutomations.map(async (userAutomation: any) => {
      const automation = userAutomation.automation;
      if (!automation) return;

      // Check if this automation has a webhook registered for this topic
      const { data: webhooks } = await supabaseAdmin
        .from('shopify_webhooks')
        .select('*')
        .eq('user_automation_id', userAutomation.id)
        .eq('topic', topic);

      if (!webhooks || webhooks.length === 0) {
        return; // This automation doesn't listen to this topic
      }

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

