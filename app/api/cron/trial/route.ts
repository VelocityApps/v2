/**
 * Trial cron: expire ended trials (pause + email), send "2 days left" reminders.
 * Call daily via GET/POST with CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendTrialReminderEmail, sendTrialEndedEmail } from '@/lib/email/trial';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  return runTrialCron(request);
}

export async function POST(request: NextRequest) {
  return runTrialCron(request);
}

async function runTrialCron(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      console.error('[TrialCron] CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

    // 1) Expire trials: trial_ends_at <= now, status = 'trial'
    const { data: expired, error: expError } = await supabaseAdmin
      .from('user_automations')
      .select('id, user_id, automation_id, trial_ends_at')
      .eq('status', 'trial')
      .lte('trial_ends_at', nowIso);

    if (!expError && expired?.length) {
      for (const ua of expired) {
        await supabaseAdmin
          .from('user_automations')
          .update({ status: 'paused', updated_at: nowIso })
          .eq('id', ua.id);

        const { data: aut } = await supabaseAdmin.from('automations').select('name').eq('id', ua.automation_id).single();
        const automationName = (aut as any)?.name || 'Automation';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const reactivateUrl = `${appUrl}/dashboard`;

        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(ua.user_id);
        const to = authUser?.email;
        if (to) {
          try {
            await sendTrialEndedEmail(to, automationName, reactivateUrl);
          } catch (e) {
            console.error('[TrialCron] sendTrialEndedEmail failed:', e);
          }
        }
      }
    }

    // 2) Reminder: trial_ends_at in ~2 days, reminder not yet sent
    const { data: endingSoon, error: remError } = await supabaseAdmin
      .from('user_automations')
      .select('id, user_id, trial_ends_at, trial_reminder_sent_at, automation_id')
      .eq('status', 'trial')
      .gte('trial_ends_at', nowIso)
      .lte('trial_ends_at', inTwoDays)
      .is('trial_reminder_sent_at', null);

    if (!remError && endingSoon?.length) {
      for (const ua of endingSoon) {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(ua.user_id);
        const to = authUser?.email;
        if (to) {
          try {
            const { data: aut } = await supabaseAdmin.from('automations').select('name').eq('id', ua.automation_id).single();
            await sendTrialReminderEmail(to, (aut as any)?.name || 'Automation', new Date(ua.trial_ends_at));
            await supabaseAdmin
              .from('user_automations')
              .update({ trial_reminder_sent_at: nowIso })
              .eq('id', ua.id);
          } catch (e) {
            console.error('[TrialCron] sendTrialReminderEmail failed:', e);
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Trial cron completed',
      expired: expired?.length ?? 0,
      reminders: endingSoon?.length ?? 0,
    });
  } catch (error: any) {
    console.error('[TrialCron] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
