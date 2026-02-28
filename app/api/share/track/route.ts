import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/share/track
 * Track share events for analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, type, projectId, generationMode, previewId } = body;

    // Get user from auth header if available
    const authHeader = request.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    }

    // Track in monitoring_events table
    await supabaseAdmin
      .from('monitoring_events')
      .insert({
        event_type: 'share',
        user_id: userId,
        event_data: {
          platform,
          type,
          projectId,
          generationMode,
          previewId,
          timestamp: new Date().toISOString(),
        },
      });

    // If it's a share_link_clicked event, increment view count
    if (type === 'link_clicked' && previewId) {
      const { data: preview } = await supabaseAdmin
        .from('share_previews')
        .select('view_count')
        .eq('id', previewId)
        .single();
      if (preview) {
        await supabaseAdmin
          .from('share_previews')
          .update({ view_count: (preview.view_count || 0) + 1 })
          .eq('id', previewId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking share:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

