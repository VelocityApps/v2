import { NextRequest, NextResponse } from 'next/server';
import { detectEnvironmentVariables } from '@/lib/railway-client';
import { supabase } from '@/lib/supabase';

/**
 * Detect required environment variables from code
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

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    const envVars = detectEnvironmentVariables(code);

    return NextResponse.json({
      envVars,
    });
  } catch (error: any) {
    console.error('[RailwayDetect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect environment variables' },
      { status: 500 }
    );
  }
}

