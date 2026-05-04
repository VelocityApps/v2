/**
 * Evo low-stock alert engine.
 *
 * Called by processInventoryUpdate() after every inventory level write.
 * Compares the new quantity against configured evo_alerts thresholds and
 * sends an email via the existing lib/email.ts integration (Resend or SMTP).
 *
 * Firing rules — an alert email is sent when ALL of the following are true:
 *   1. The alert is active (is_active = true)
 *   2. newQuantity <= low_stock_threshold
 *   3. Either:
 *      a) Stock just crossed the threshold downward
 *         (previousQuantity > threshold — first breach), OR
 *      b) The cooldown period has expired since the last alert
 *         (last_alerted_at is null OR more than COOLDOWN_HOURS ago)
 *
 * Rule 3 prevents a flood of emails when stock stays below threshold across
 * many webhook deliveries (e.g. high-volume sale days).
 *
 * Recipient list per alert:
 *   - The merchant's account email (always included)
 *   - Any addresses in evo_alerts.email_recipients (optional extras)
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS    = COOLDOWN_HOURS * 60 * 60 * 1_000;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

// ── Public entry point ────────────────────────────────────────────────────────

export async function checkAndSendAlerts({
  userId,
  masterSku,
  previousQuantity,
  newQuantity,
}: {
  userId: string;
  masterSku: string;
  previousQuantity: number;
  newQuantity: number;
}): Promise<void> {
  // Fast exit — quantity went up or stayed the same, no alert needed
  if (newQuantity >= previousQuantity) return;

  // Load all active alerts that apply to this SKU:
  //   - Specific: master_sku = masterSku
  //   - Global default: master_sku IS NULL
  // Two queries avoids PostgREST OR-with-NULL edge cases.
  const [{ data: specific }, { data: global }] = await Promise.all([
    supabaseAdmin
      .from('evo_alerts')
      .select('id, low_stock_threshold, email_recipients, last_alerted_at')
      .eq('user_id', userId)
      .eq('master_sku', masterSku)
      .eq('is_active', true),
    supabaseAdmin
      .from('evo_alerts')
      .select('id, low_stock_threshold, email_recipients, last_alerted_at')
      .eq('user_id', userId)
      .is('master_sku', null)
      .eq('is_active', true),
  ]);

  // Specific alerts take precedence over the global default.
  // If any specific alert exists for this SKU, ignore the global.
  const alerts = (specific?.length ? specific : global) ?? [];
  if (!alerts.length) return;

  // Resolve the merchant's account email (always first recipient)
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
  const accountEmail = authUser?.email;
  if (!accountEmail) {
    console.warn(`[EvoAlerts] No account email for user ${userId} — skipping alert`);
    return;
  }

  const now = Date.now();

  for (const alert of alerts) {
    const threshold: number    = alert.low_stock_threshold;
    const extras: string[]     = alert.email_recipients ?? [];
    const lastAlerted: string | null = alert.last_alerted_at;

    // ── Rule 2: quantity must be at or below threshold ───────────────────────
    if (newQuantity > threshold) continue;

    // ── Rule 3: threshold just crossed OR cooldown expired ───────────────────
    const justCrossed     = previousQuantity > threshold;
    const cooldownExpired = !lastAlerted || (now - new Date(lastAlerted).getTime() > COOLDOWN_MS);

    if (!justCrossed && !cooldownExpired) {
      console.log(
        `[EvoAlerts] SKU ${masterSku} below threshold (${newQuantity}/${threshold}) ` +
        `but within ${COOLDOWN_HOURS}h cooldown — skipping`,
      );
      continue;
    }

    // ── Build recipient list ──────────────────────────────────────────────────
    const recipients = [accountEmail, ...extras.filter(Boolean)];

    // ── Send email ────────────────────────────────────────────────────────────
    try {
      await sendEmail({
        to: recipients,
        subject: `Low stock alert: ${masterSku} is down to ${newQuantity} unit${newQuantity !== 1 ? 's' : ''}`,
        html: buildAlertEmailHtml({ masterSku, newQuantity, threshold }),
        text: buildAlertEmailText({ masterSku, newQuantity, threshold }),
      });

      console.log(
        `[EvoAlerts] Sent low-stock email for ${masterSku} ` +
        `(qty=${newQuantity}, threshold=${threshold}) to ${recipients.join(', ')}`,
      );
    } catch (err: any) {
      console.error('[EvoAlerts] Failed to send email:', err.message);
    }

    // ── Update cooldown timestamp ─────────────────────────────────────────────
    const { error } = await supabaseAdmin
      .from('evo_alerts')
      .update({ last_alerted_at: new Date().toISOString() })
      .eq('id', alert.id);

    if (error) {
      console.error('[EvoAlerts] Failed to update last_alerted_at:', error.message);
    }
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

interface AlertTemplateParams {
  masterSku: string;
  newQuantity: number;
  threshold: number;
}

function buildAlertEmailHtml({ masterSku, newQuantity, threshold }: AlertTemplateParams): string {
  const dashboardUrl = APP_URL ? `${APP_URL}/dashboard/evo` : null;
  const quantityColor = newQuantity === 0 ? '#d72c0d' : '#b45309';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e1e3e5;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:28px 32px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                Evo by VelocityApps
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#202223;letter-spacing:-0.4px;">
                Low stock alert
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6d7175;line-height:1.5;">
                A SKU you are monitoring has fallen to or below its configured threshold.
              </p>

              <!-- SKU card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;border:1px solid #e1e3e5;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6d7175;text-transform:uppercase;letter-spacing:0.6px;">Master SKU</p>
                    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#202223;font-family:'Courier New',monospace;">${escapeHtml(masterSku)}</p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-right:8px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6d7175;text-transform:uppercase;letter-spacing:0.6px;">Current stock</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:${quantityColor};">${newQuantity}</p>
                        </td>
                        <td width="50%" style="padding-left:8px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6d7175;text-transform:uppercase;letter-spacing:0.6px;">Alert threshold</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:#202223;">${threshold}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${newQuantity === 0
                ? `<p style="margin:0 0 24px;font-size:14px;color:#d72c0d;font-weight:600;background:#fff4f4;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;">
                    This SKU is out of stock across all connected platforms.
                  </p>`
                : ''}

              <p style="margin:0 0 24px;font-size:14px;color:#6d7175;line-height:1.6;">
                Review your inventory and restock before you run out.
                ${dashboardUrl ? 'You can view full details in your Evo dashboard.' : ''}
              </p>

              ${dashboardUrl
                ? `<a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                    View Evo Dashboard
                  </a>`
                : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e1e3e5;background:#f6f6f7;">
              <p style="margin:0;font-size:12px;color:#8c9196;line-height:1.5;">
                You received this alert because stock for <strong>${escapeHtml(masterSku)}</strong> reached your configured threshold of ${threshold} units.
                Adjust or disable this alert in Evo &rsaquo; Alerts.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAlertEmailText({ masterSku, newQuantity, threshold }: AlertTemplateParams): string {
  const dashboardUrl = APP_URL ? `${APP_URL}/dashboard/evo` : null;
  return [
    'LOW STOCK ALERT — Evo by VelocityApps',
    '',
    `SKU:               ${masterSku}`,
    `Current stock:     ${newQuantity} unit${newQuantity !== 1 ? 's' : ''}`,
    `Alert threshold:   ${threshold} unit${threshold !== 1 ? 's' : ''}`,
    '',
    newQuantity === 0 ? 'This SKU is out of stock across all connected platforms.' : '',
    'Review your inventory and restock before you run out.',
    dashboardUrl ? `\nDashboard: ${dashboardUrl}` : '',
    '',
    `---`,
    `You received this alert because stock for "${masterSku}" reached your configured threshold of ${threshold} units.`,
    `Adjust or disable this alert in Evo > Alerts.`,
  ].filter((l) => l !== undefined).join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
