import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';
import { deployToRailway, pollDeploymentStatus, detectEnvironmentVariables } from '@/lib/railway-client';
import { logEvent } from '@/lib/monitoring';

/**
 * Deploy code to Railway
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

    const { code, projectName, envVars = {} } = await request.json();

    if (!code || !projectName) {
      return NextResponse.json(
        { error: 'Code and project name are required' },
        { status: 400 }
      );
    }

    // Deploy to Railway
    console.log('[RailwayDeploy] Starting deployment:', projectName);
    const deployment = await deployToRailway(code, projectName, envVars);

    // Poll for deployment status (non-blocking)
    // We'll return immediately and let the frontend poll
    pollDeploymentStatus(deployment.serviceId)
      .then((status) => {
        console.log('[RailwayDeploy] Deployment status:', status);
        
        // Log deployment event
        logEvent('railway_deploy', {
          projectName,
          deploymentUrl: status.url || deployment.deploymentUrl,
          success: status.status === 'SUCCESS',
          status: status.status,
        }, user.id).catch((err) => {
          console.error('[RailwayDeploy] Failed to log event:', err);
        });
      })
      .catch((err) => {
        console.error('[RailwayDeploy] Error polling status:', err);
      });

    // Log initial deployment event
    await logEvent('railway_deploy', {
      projectName,
      deploymentUrl: deployment.deploymentUrl,
      success: true,
      status: 'DEPLOYING',
    }, user.id);

    return NextResponse.json({
      success: true,
      deploymentUrl: deployment.deploymentUrl,
      projectId: deployment.projectId,
      serviceId: deployment.serviceId,
      message: 'Deployment started! Your app is being deployed to Railway.',
    });
  } catch (error: any) {
    console.error('[RailwayDeploy] Error:', error);
    
    // Log error event
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await logEvent('error', {
            component: 'railway_deploy',
            error: error.message || 'Unknown error',
          }, user.id);
        }
      }
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'Failed to deploy to Railway' },
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

    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    const status = await pollDeploymentStatus(serviceId, 1); // Single poll

    return NextResponse.json({
      status: status.status,
      url: status.url,
    });
  } catch (error: any) {
    console.error('[RailwayDeploy] Error getting status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

