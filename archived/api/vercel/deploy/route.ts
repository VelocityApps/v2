import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';
import { deployToVercel, pollDeploymentStatus, detectEnvironmentVariables } from '@/lib/vercel-client';
import { logEvent } from '@/lib/monitoring';

/**
 * Deploy code to Vercel
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

    // Get user's Vercel token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('vercel_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.vercel_token) {
      return NextResponse.json(
        { error: 'Vercel account not connected. Please connect your Vercel account first.' },
        { status: 400 }
      );
    }

    const { code, projectName, envVars = {} } = await request.json();

    if (!code || !projectName) {
      return NextResponse.json(
        { error: 'Code and project name are required' },
        { status: 400 }
      );
    }

    // Deploy to Vercel
    console.log('[VercelDeploy] Starting deployment:', projectName);
    const deployment = await deployToVercel(
      profile.vercel_token,
      code,
      projectName,
      envVars
    );

    // Poll for deployment status (non-blocking)
    pollDeploymentStatus(profile.vercel_token, deployment.deploymentId)
      .then((status) => {
        console.log('[VercelDeploy] Deployment status:', status);
        
        // Log deployment event
        logEvent('vercel_deploy', {
          projectName,
          deploymentUrl: status.url || deployment.deploymentUrl,
          success: status.status === 'READY',
          status: status.status,
        }, user.id).catch((err) => {
          console.error('[VercelDeploy] Failed to log event:', err);
        });
      })
      .catch((err) => {
        console.error('[VercelDeploy] Error polling status:', err);
      });

    // Log initial deployment event
    await logEvent('vercel_deploy', {
      projectName,
      deploymentUrl: deployment.deploymentUrl,
      success: true,
      status: 'BUILDING',
    }, user.id);

    return NextResponse.json({
      success: true,
      deploymentUrl: deployment.deploymentUrl,
      projectId: deployment.projectId,
      deploymentId: deployment.deploymentId,
      message: 'Deployment started! Your app is being deployed to Vercel.',
    });
  } catch (error: any) {
    console.error('[VercelDeploy] Error:', error);
    
    // Log error event
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await logEvent('error', {
            component: 'vercel_deploy',
            error: error.message || 'Unknown error',
          }, user.id);
        }
      }
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'Failed to deploy to Vercel' },
      { status: 500 }
    );
  }
}

/**
 * Get deployment status
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

    // Get user's Vercel token
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('vercel_token')
      .eq('user_id', user.id)
      .single();

    if (!profile?.vercel_token) {
      return NextResponse.json(
        { error: 'Vercel account not connected' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const deploymentId = searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      );
    }

    const status = await pollDeploymentStatus(profile.vercel_token, deploymentId, 1); // Single poll

    return NextResponse.json({
      status: status.status,
      url: status.url,
    });
  } catch (error: any) {
    console.error('[VercelDeploy] Error getting status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

