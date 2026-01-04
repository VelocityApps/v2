import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

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

    // Delete user automation (cascade will handle webhooks and logs)
    const { error: deleteError } = await supabaseAdmin
      .from('user_automations')
      .delete()
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

