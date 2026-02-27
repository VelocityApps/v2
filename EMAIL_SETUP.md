# Email & Alerts Setup

## SMTP (recommended)

Add these to `.env.local`:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="VelocityApps <support@yourdomain.com>"

# Comma-separated list of recipients for alert emails
SUPPORT_ALERT_EMAILS=alerts@yourdomain.com,sre@yourdomain.com
```

## What it enables
- **Critical/High error alerts** (from automations)
- **Support ticket notifications** (to support + confirmation to user)

## Testing
1. Trigger a fake error (e.g., throw in an automation)
2. Create a support ticket from the user menu → Support
3. Check the inboxes receive the alerts


