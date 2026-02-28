import React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { getEmailFrom } from './send';
import { TrialStartedEmail } from './templates/trial-started';
import { TrialReminderEmail } from './templates/trial-reminder';
import { TrialEndedEmail } from './templates/trial-ended';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  return new Resend(apiKey);
}

export async function sendTrialStartedEmail(
  to: string,
  automationName: string,
  trialEndsAt: Date
): Promise<void> {
  try {
    const resend = getResend();
    const html = await render(
      React.createElement(TrialStartedEmail, { automationName, trialEndsAt })
    );
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: `Your ${automationName} trial has started`,
      html,
    });
    if (error) console.error('[Trial] sendTrialStartedEmail error:', error.message);
  } catch (err: any) {
    console.error('[Trial] sendTrialStartedEmail failed:', err?.message || err);
  }
}

export async function sendTrialReminderEmail(
  to: string,
  automationName: string,
  trialEndsAt: Date
): Promise<void> {
  try {
    const resend = getResend();
    const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/dashboard`;
    const html = await render(
      React.createElement(TrialReminderEmail, { automationName, trialEndsAt, upgradeUrl })
    );
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: `2 days left: Your ${automationName} trial is ending soon`,
      html,
    });
    if (error) console.error('[Trial] sendTrialReminderEmail error:', error.message);
  } catch (err: any) {
    console.error('[Trial] sendTrialReminderEmail failed:', err?.message || err);
  }
}

export async function sendTrialEndedEmail(
  to: string,
  automationName: string,
  reactivateUrl: string
): Promise<void> {
  try {
    const resend = getResend();
    const html = await render(
      React.createElement(TrialEndedEmail, { automationName, reactivateUrl })
    );
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: `Your ${automationName} trial has ended`,
      html,
    });
    if (error) console.error('[Trial] sendTrialEndedEmail error:', error.message);
  } catch (err: any) {
    console.error('[Trial] sendTrialEndedEmail failed:', err?.message || err);
  }
}
