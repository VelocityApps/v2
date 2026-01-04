import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Store Vercel token (called from frontend with authenticated session)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vercelToken, vercelUsername } = await request.json();

    if (!vercelToken || !vercelUsername) {
      return NextResponse.json(
        { error: 'Vercel token and username are required' },
        { status: 400 }
      );
    }

    // Update user profile with Vercel info
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        vercel_token: vercelToken,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[VercelAuth] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to store Vercel token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vercel account connected successfully',
      vercelUsername,
    });
  } catch (error: any) {
    console.error('[VercelAuth] Error storing token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store Vercel token' },
      { status: 500 }
    );
  }
}

