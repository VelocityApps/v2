import { NextRequest, NextResponse } from 'next/server';
import { getGitHubAuthUrl } from '@/lib/github-client';

/**
 * Initiate GitHub OAuth flow
 * Redirects user to GitHub authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const authUrl = getGitHubAuthUrl();
    
    // Store state in session/cookie for verification
    // For now, we'll rely on GitHub's state parameter
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[GitHubAuth] Error initiating OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate GitHub authentication' },
      { status: 500 }
    );
  }
}

