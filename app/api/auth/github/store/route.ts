import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Store GitHub token in user profile
 * Called after OAuth callback to securely store the token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const email = searchParams.get('email');

    if (!token || !username) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_error=Missing token or username`
      );
    }

    // Get user from session cookie or token
    // For now, redirect to frontend which will handle it via API call
    // The frontend should call POST /api/auth/github/store with the session
    
    // Redirect to app with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_success=1&github_username=${encodeURIComponent(username)}`
    );
  } catch (error: any) {
    console.error('[GitHubAuth] Error storing token:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_error=${encodeURIComponent(error.message || 'Failed to store GitHub token')}`
    );
  }
}

/**
 * Store GitHub token (called from frontend with authenticated session)
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

    const { githubToken, githubUsername } = await request.json();

    if (!githubToken || !githubUsername) {
      return NextResponse.json(
        { error: 'GitHub token and username are required' },
        { status: 400 }
      );
    }

    // Update user profile with GitHub info
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        github_token: githubToken,
        github_username: githubUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[GitHubAuth] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to store GitHub token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub account connected successfully',
      githubUsername,
    });
  } catch (error: any) {
    console.error('[GitHubAuth] Error storing token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store GitHub token' },
      { status: 500 }
    );
  }
}

