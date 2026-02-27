/**
 * Trial emails: welcome (Day 0), reminder (Day 5), trial ended (Day 7)
 * Uses sendEmail (Resend or SMTP) and optional sendAlertEmail for fallback.
 */

import { sendEmail } from '@/lib/email';

export async function sendTrialStartedEmail(to: string, automationName: string, trialEndsAt: Date): Promise<void> {
  const subject = `Your ${automationName} trial has started`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0066cc;">Your free trial has started</h2>
      <p>You now have full access to <strong>${automationName}</strong> for 7 days.</p>
      <p>Your trial ends on <strong>${trialEndsAt.toLocaleDateString(undefined, { dateStyle: 'long' })}</strong>. Add a payment method before then to continue without interruption.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="color: #0066cc;">Go to Dashboard</a></p>
    </div>
  `;
  await sendEmail({ to: [to], subject, html });
}

export async function sendTrialReminderEmail(to: string, automationName: string, trialEndsAt: Date): Promise<void> {
  const subject = `2 days left: Your ${automationName} trial is ending soon`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6600;">Trial ending in 2 days</h2>
      <p>Your free trial of <strong>${automationName}</strong> ends on <strong>${trialEndsAt.toLocaleDateString(undefined, { dateStyle: 'long' })}</strong>.</p>
      <p>Add a payment method to keep your automation running without interruption.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="color: #0066cc;">Add Payment Method</a></p>
    </div>
  `;
  await sendEmail({ to: [to], subject, html });
}

export async function sendTrialEndedEmail(to: string, automationName: string, reactivateUrl: string): Promise<void> {
  const subject = `Your ${automationName} trial has ended`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Trial ended</h2>
      <p>Your free trial of <strong>${automationName}</strong> has ended. The automation has been paused.</p>
      <p>Add a payment method to reactivate and continue.</p>
      <p><a href="${reactivateUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reactivate</a></p>
    </div>
  `;
  await sendEmail({ to: [to], subject, html });
}
