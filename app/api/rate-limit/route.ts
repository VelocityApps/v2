import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitRemaining } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/rate-limit
 * Get the current rate limit status for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Get rate limit status
    const rateLimit = getRateLimitRemaining(user.id);

    return NextResponse.json({
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn,
      maxRequests: 5,
    });
  } catch (error: any) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check rate limit' },
      { status: 500 }
    );
  }
}

