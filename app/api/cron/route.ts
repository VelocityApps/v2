/**
 * Cron Job Endpoint
 * Runs scheduled automations (e.g., Best Sellers Collection)
 * 
 * Set up in Vercel: https://vercel.com/docs/cron-jobs
 * Or use external service like cron-job.org
 */

import '@/lib/automations/load-all';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAutomation } from '@/lib/automations/base';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // CRON_SECRET must always be set — reject the request if it isn't configured
    if (!CRON_SECRET) {
      console.error('[Cron] CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
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
      .in('status', ['active', 'trial'])
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

    // Run all automations in parallel — each failure is isolated
    const settled = await Promise.allSettled(
      userAutomations.map(async (userAutomation) => {
        const automationSlug = (userAutomation as any).automations?.slug;
        if (!automationSlug) throw new Error(`No slug for automation_id ${userAutomation.automation_id}`);

        const automation = getAutomation(automationSlug);
        if (!automation) throw new Error(`Automation not found: ${automationSlug}`);
        if (!automation.runScheduled) return { skipped: true, slug: automationSlug };

        console.log(`[Cron] Running: ${automationSlug} for user ${userAutomation.user_id}`);
        await automation.runScheduled(userAutomation);
        return { slug: automationSlug };
      })
    );

    // Persist error status for failed automations
    await Promise.all(
      settled.map(async (result, i) => {
        if (result.status === 'rejected') {
          const ua = userAutomations[i];
          console.error(`[Cron] Error running automation ${ua.id}:`, result.reason);
          await supabaseAdmin
            .from('user_automations')
            .update({ status: 'error', error_message: result.reason?.message, updated_at: new Date().toISOString() })
            .eq('id', ua.id);
        }
      })
    );

    const results = settled.map((result, i) => ({
      automation_id: userAutomations[i].id,
      ...(result.status === 'fulfilled'
        ? { status: (result.value as any)?.skipped ? 'skipped' : 'success' }
        : { status: 'error', error: result.reason?.message }),
    }));

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



