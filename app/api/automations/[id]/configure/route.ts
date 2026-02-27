import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * PATCH /api/automations/[id]/configure
 * Update automation configuration
 */
export async function PATCH(
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
    const { config } = await request.json();

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config object is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: userAutomation, error: fetchError } = await supabaseAdmin
      .from('user_automations')
      .select('*, automation:automations(slug)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userAutomation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Merge with existing config
    const updatedConfig = {
      ...(userAutomation.config || {}),
      ...config,
    };

    const updatePayload: Record<string, unknown> = { config: updatedConfig };

    // Low Stock Alerts: when switching to daily-digest, set next_run_at so cron runs it
    const slug = (userAutomation as any).automation?.slug;
    if (slug === 'low-stock-alerts' && updatedConfig.frequency === 'daily-digest') {
      const now = new Date();
      let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0, 0));
      if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
      updatePayload.next_run_at = next.toISOString();
    }

    // Update configuration
    const { data, error } = await supabaseAdmin
      .from('user_automations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, userAutomation: data });
  } catch (error: any) {
    console.error('Error updating automation config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}



