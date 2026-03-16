import { Resend } from 'resend';
import { getEmailFrom } from './send';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendAlertEmail(subject: string, html: string): Promise<void> {
  const alertRecipients = (process.env.SUPPORT_ALERT_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!alertRecipients.length) return;
  await sendEmail({ to: alertRecipients[0], subject, html });
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

  if (error) throw new Error(error.message);
}
