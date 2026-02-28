'use server';

import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

const fromDefault = process.env.FROM_EMAIL
  ? `VelocityApps <${process.env.FROM_EMAIL}>`
  : process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    'VelocityApps <onboarding@resend.dev>';

/**
 * Send an email. Uses Resend if RESEND_API_KEY is set, otherwise SMTP (Nodemailer).
 * Resend: RESEND_API_KEY, optional RESEND_FROM / SMTP_FROM
 * SMTP: SMTP_HOST, SMTP_USER, SMTP_PASS, optional SMTP_FROM
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const to = Array.isArray(options.to) ? options.to : [options.to];
  const toFiltered = to.map((e) => String(e).trim()).filter(Boolean);
  if (toFiltered.length === 0) {
    console.warn('[Email] No recipients. Skipping send.');
    return;
  }

  const from = options.from || fromDefault;

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from,
        to: toFiltered,
        subject: options.subject,
        html: options.html ?? options.text ?? '',
      });
      if (error) {
        console.error('[Email] Resend error:', error.message);
      }
    } catch (err: any) {
      console.error('[Email] Resend send failed:', err?.message || err);
    }
    return;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('[Email] Neither RESEND_API_KEY nor SMTP configured. Skipping email send.');
    return;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: toFiltered.join(','),
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

/**
 * Convenience helper to send alert emails to the support team
 * Requires SUPPORT_ALERT_EMAILS (comma-separated)
 */
export async function sendAlertEmail(subject: string, html: string, text?: string): Promise<void> {
  const recipients = (process.env.SUPPORT_ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn('[Email] SUPPORT_ALERT_EMAILS not set. Skipping alert email.');
    return;
  }
  await sendEmail({ to: recipients, subject, html, text });
}

/**
 * Send a test email to verify SMTP configuration
 * @param to - Email address to send test email to
 */
export async function sendTestEmail(to: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const subject = 'VelocityApps - Test Email';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">✅ Test Email Successful</h2>
      <p>This is a test email from VelocityApps to verify your SMTP configuration.</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p>If you received this email, your email service is configured correctly!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated test email from VelocityApps.</p>
    </div>
  `;
  const text = `Test Email Successful\n\nThis is a test email from VelocityApps to verify your SMTP configuration.\n\nTimestamp: ${timestamp}\n\nIf you received this email, your email service is configured correctly!`;

  await sendEmail({ to, subject, html, text });
}

/**
 * Send a welcome email to new users
 * @param to - Email address of the new user
 * @param userName - Name of the user (optional)
 */
export async function sendWelcomeEmail(to: string, userName?: string): Promise<void> {
  const name = userName || 'there';
  const subject = 'Welcome to VelocityApps! 🚀';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Welcome to VelocityApps, ${name}!</h2>
      <p>We're excited to have you on board. VelocityApps helps you automate your Shopify store with powerful, easy-to-use automations.</p>
      
      <h3 style="color: #60a5fa;">Getting Started</h3>
      <ol>
        <li>Connect your Shopify store</li>
        <li>Browse our marketplace of automations</li>
        <li>Install and configure your first automation</li>
        <li>Watch your store run more efficiently!</li>
      </ol>
      
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/marketplace" style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Explore Marketplace</a></p>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} VelocityApps. All rights reserved.</p>
    </div>
  `;
  const text = `Welcome to VelocityApps, ${name}!\n\nWe're excited to have you on board. VelocityApps helps you automate your Shopify store with powerful, easy-to-use automations.\n\nGetting Started:\n1. Connect your Shopify store\n2. Browse our marketplace of automations\n3. Install and configure your first automation\n4. Watch your store run more efficiently!\n\nVisit: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/marketplace\n\nIf you have any questions, feel free to reach out to our support team.`;

  await sendEmail({ to, subject, html, text });
}

