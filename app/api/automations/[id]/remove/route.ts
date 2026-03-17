import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * DELETE /api/automations/[id]/remove
 * Remove an automation (uninstall)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user automation with automation details
    const { data: userAutomation, error: fetchError } = await supabaseAdmin
      .from('user_automations')
      .select(`
        *,
        automation:automations(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userAutomation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Run automation's uninstall method
    const automation = (userAutomation as any).automation;
    if (automation) {
      const automationInstance = getAutomation(automation.slug);
      if (automationInstance) {
        try {
          await automationInstance.uninstall(userAutomation.id);
        } catch (error: any) {
          console.error('Error during automation uninstall:', error);
          // Continue with deletion even if uninstall fails
        }
      }
    }

    // Cancel Stripe subscription if one exists
    if (userAutomation.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(userAutomation.stripe_subscription_id);
      } catch (err: any) {
        // Log but don't block removal — subscription may already be cancelled
        console.error('[Remove] Failed to cancel Stripe subscription:', err.message);
      }
    }

    // Soft-delete: preserve trial history so users can't re-trial by uninstalling and reinstalling.
    // Clear the encrypted token since it's no longer needed.
    const { error: deleteError } = await supabaseAdmin
      .from('user_automations')
      .update({
        status: 'uninstalled',
        shopify_access_token_encrypted: null,
        stripe_subscription_id: null,
      })
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove automation' },
      { status: 500 }
    );
  }
}



