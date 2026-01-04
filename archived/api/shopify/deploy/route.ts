import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';
import { autoDeployShopifyApp } from '@/lib/shopify-deploy';
import { detectShopifyApp, getShopifyAppType } from '@/lib/shopify-detector';
import { extractShopifyFeatures, detectShopifyAppType as detectAppType } from '@/lib/code-analysis';

/**
 * POST /api/shopify/deploy
 * Auto-deploy Shopify app for merchants
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, prompt, projectId } = await request.json();

    if (!code || !prompt) {
      return NextResponse.json(
        { error: 'Code and prompt are required' },
        { status: 400 }
      );
    }

    // Check if this is a Shopify app
    const shopifyDetection = detectShopifyApp(prompt);
    if (!shopifyDetection.isShopifyApp && !code.includes('shopify')) {
      return NextResponse.json(
        { error: 'This is not a Shopify app' },
        { status: 400 }
      );
    }

    // Get user preferences to determine view mode
    const { data: preferences } = await supabaseAdmin
      .from('user_preferences')
      .select('shopify_view_mode')
      .eq('user_id', user.id)
      .single();

    const viewMode = preferences?.shopify_view_mode || 'merchant';

    // Auto-deploy (for merchants) or prepare for download (for developers)
    if (viewMode === 'merchant') {
      // Auto-deploy for merchants
      const deployment = await autoDeployShopifyApp(code, prompt, user.id);

      if (!deployment.deployed) {
        return NextResponse.json(
          { 
            error: deployment.error || 'Deployment failed',
            friendlyError: 'We couldn\'t deploy your app right now. Our team has been notified and will fix this shortly. You\'ll receive an email when it\'s ready.'
          },
          { status: 500 }
        );
      }

      // Store deployment in database
      const { data: deploymentRecord, error: dbError } = await supabaseAdmin
        .from('shopify_deployments')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          app_name: deployment.appName,
          app_url: deployment.appUrl,
          shopify_app_id: deployment.shopifyAppId,
          install_url: deployment.installUrl,
          database_url: deployment.databaseUrl,
          original_code: code,
          status: 'active',
          deployed_at: new Date().toISOString(),
          app_type: detectAppType(code),
          features: deployment.features,
        })
        .select()
        .single();

      if (dbError) {
        console.error('[ShopifyDeploy] Database error:', dbError);
        // Don't fail the request, deployment succeeded
      }

      return NextResponse.json({
        success: true,
        deployment: {
          ...deployment,
          id: deploymentRecord?.id,
        },
      });
    } else {
      // Developer mode - return code for download/preview
      return NextResponse.json({
        success: true,
        deployment: {
          deployed: false,
          appName: extractAppName(prompt),
          installUrl: '',
          appUrl: '',
          previewUrl: '',
          code,
          features: extractShopifyFeatures(code),
          appType: detectAppType(code),
        },
      });
    }
  } catch (error: any) {
    console.error('[ShopifyDeploy] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Deployment failed',
        friendlyError: 'We encountered an issue deploying your app. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}

function extractAppName(prompt: string): string {
  const nameMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+)?(?:shopify\s+)?app\s+(?:for|called)?\s*['"]?([^'"]+)['"]?/i);
  if (nameMatch) {
    return nameMatch[1].trim();
  }
  return `My Shopify App ${new Date().getFullYear()}`;
}

