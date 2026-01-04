/**
 * Cron Job Endpoint
 * Runs scheduled automations (e.g., Best Sellers Collection)
 * 
 * Set up in Vercel: https://vercel.com/docs/cron-jobs
 * Or use external service like cron-job.org
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

// Verify cron secret (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.nextUrl.searchParams.get('secret');
    
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active automations that need to run
    const now = new Date().toISOString();
    
    const { data: userAutomations, error } = await supabaseAdmin
      .from('user_automations')
      .select(`
        *,
        automations (
          slug
        )
      `)
      .eq('status', 'active')
      .lte('next_run_at', now)
      .not('next_run_at', 'is', null);

    if (error) {
      console.error('[Cron] Error fetching automations:', error);
      return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
    }

    if (!userAutomations || userAutomations.length === 0) {
      return NextResponse.json({ 
        message: 'No automations scheduled to run',
        count: 0 
      });
    }

    const results = [];
    
    // Run each scheduled automation
    for (const userAutomation of userAutomations) {
      try {
        const automationSlug = (userAutomation as any).automations?.slug;
        if (!automationSlug) {
          console.error(`[Cron] No slug found for automation ${userAutomation.automation_id}`);
          continue;
        }

        const automation = getAutomation(automationSlug);
        if (!automation) {
          console.error(`[Cron] Automation not found: ${automationSlug}`);
          continue;
        }

        // Check if automation has runScheduled method
        if (!automation.runScheduled) {
          console.log(`[Cron] Automation ${automationSlug} does not support scheduled runs`);
          continue;
        }

        console.log(`[Cron] Running scheduled automation: ${automationSlug} for user ${userAutomation.user_id}`);

        // Run the scheduled automation
        await automation.runScheduled(userAutomation);

        results.push({
          automation_id: userAutomation.id,
          automation_slug: automationSlug,
          status: 'success',
        });

      } catch (error: any) {
        console.error(`[Cron] Error running automation ${userAutomation.id}:`, error);
        
        // Update automation status to error
        await supabaseAdmin
          .from('user_automations')
          .update({
            status: 'error',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userAutomation.id);

        results.push({
          automation_id: userAutomation.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${userAutomations.length} automations`,
      count: userAutomations.length,
      results,
    });

  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

