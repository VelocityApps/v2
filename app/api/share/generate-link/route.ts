import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/share/generate-link
 * Generate a temporary preview link for sharing
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { code, projectId, projectName } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Generate unique preview ID (UUID format to match database)
    const previewId = crypto.randomUUID();
    const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/preview/${previewId}`;

    // Calculate expiry (7 days for free, 30 for pro, unlimited for teams)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

    // Create preview record with explicit id
    const { data, error } = await supabaseAdmin
      .from('share_previews')
      .insert({
        id: previewId, // Use the generated UUID as the id
        project_id: projectId || null,
        user_id: user.id,
        code,
        preview_url: previewUrl,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preview:', error);
      return NextResponse.json({ error: 'Failed to create preview link' }, { status: 500 });
    }

    return NextResponse.json({
      url: previewUrl,
      previewId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error in generate-link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate link' },
      { status: 500 }
    );
  }
}

