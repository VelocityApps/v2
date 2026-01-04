import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createRepoAndPush } from '@/lib/github-client';
import { logEvent } from '@/lib/monitoring';

/**
 * Export code to GitHub repository
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

    // Get user's GitHub token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('github_token, github_username')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.github_token) {
      return NextResponse.json(
        { error: 'GitHub account not connected. Please connect your GitHub account first.' },
        { status: 400 }
      );
    }

    const { repoName, description, code, projectDescription, projectId } = await request.json();

    if (!repoName || !code) {
      return NextResponse.json(
        { error: 'Repository name and code are required' },
        { status: 400 }
      );
    }

    // Create repo and push code
    const { repoUrl, repoFullName } = await createRepoAndPush(
      profile.github_token,
      repoName,
      description || '',
      code,
      projectDescription || '',
      true // private by default
    );

    // Update project with GitHub repo URL if projectId provided
    if (projectId) {
      await supabaseAdmin
        .from('projects')
        .update({
          github_repo_url: repoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', user.id);
    }

    // Log export event
    await logEvent('github_export', {
      repo_name: repoName,
      repo_url: repoUrl,
      project_id: projectId,
    }, user.id);

    return NextResponse.json({
      success: true,
      repoUrl,
      repoFullName,
      message: 'Code exported to GitHub successfully!',
    });
  } catch (error: any) {
    console.error('[GitHubExport] Error:', error);
    
    // Log error event
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await logEvent('error', {
            component: 'github_export',
            error: error.message || 'Unknown error',
          }, user.id);
        }
      }
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'Failed to export to GitHub' },
      { status: 500 }
    );
  }
}

