import React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { WelcomeEmail } from './templates/welcome';

export interface SendWelcomeEmailResult {
  success?: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a welcome email to new users using Resend and the React Email template.
 * Requires RESEND_API_KEY (or SMTP_PASS with Resend API key) and SMTP_FROM in env.
 */
export async function sendWelcomeEmail(
  to: string,
  userName?: string
): Promise<SendWelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY (or SMTP_PASS) not set. Skipping welcome email.');
    return { error: 'Resend API key not configured' };
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    'VelocityApps <onboarding@resend.dev>';

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/dashboard`;

  const resend = new Resend(apiKey);

  const html = await render(
    React.createElement(WelcomeEmail, {
      userName,
      dashboardUrl,
    })
  );

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Welcome to VelocityApps',
    html,
  });

  if (error) {
    console.error('[Email] Welcome email failed:', error.message);
    return { error: error.message };
  }

  return { success: true, id: data?.id };
}
