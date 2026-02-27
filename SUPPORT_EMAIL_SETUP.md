# Support Email – Step-by-Step Setup

When a user submits a support ticket, the app sends **two** emails:

1. **To you (support team)** – New ticket alert  
2. **To the user** – “We’ve received your request” confirmation  

Both use your existing Resend SMTP. Follow these steps.

---

## Step 1: Open `.env.local`

In your project root (same folder as `package.json`), open `.env.local`.  
If it doesn’t exist, create it.

---

## Step 2: Add support alert address

Add this line so **you** get notified when someone opens a ticket:

```env
SUPPORT_ALERT_EMAILS=hello@velocityapps.dev
```

- Use the email where you want to receive new ticket alerts (e.g. `hello@velocityapps.dev` or `support@velocityapps.dev`).
- For multiple addresses, use commas:  
  `SUPPORT_ALERT_EMAILS=hello@velocityapps.dev,support@velocityapps.dev`

---

## Step 3: Ensure SMTP (Resend) is set

Support emails are sent via `lib/email.ts` using **SMTP**. You need these in `.env.local` (same as for Resend):

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_YOUR_RESEND_API_KEY
SMTP_FROM="VelocityApps <noreply@velocityapps.dev>"
```

- Use your real Resend API key for `SMTP_PASS`.
- `SMTP_FROM` must be an address on a domain you’ve verified in Resend (e.g. `noreply@velocityapps.dev`).

If these are already there (e.g. from welcome email / Resend setup), you don’t need to change them.

---

## Step 4: Save and restart

1. Save `.env.local` (Ctrl+S).
2. Restart the dev server: stop it (Ctrl+C), then run `npm run dev` again.

---

## Step 5: Test

1. **Sign in** to your app (user menu in the nav).
2. Open the **Support** item in the user menu (or wherever you open the support modal).
3. Fill in **Subject** and **Message**, then submit.
4. Check:
   - **Your inbox** (the address in `SUPPORT_ALERT_EMAILS`) – you should get “New Support Ticket” with user email and message.
   - **The user’s inbox** (the email they’re signed in with) – they should get “We’ve received your support request”.

If you don’t get either email, check the terminal where `npm run dev` is running for `[Email] SMTP not configured` or `[Email] SUPPORT_ALERT_EMAILS not set` (and fix the corresponding env vars).

---

## Summary of env vars

| Variable | Purpose | Example |
|----------|--------|--------|
| `SUPPORT_ALERT_EMAILS` | Where new ticket alerts are sent | `hello@velocityapps.dev` |
| `SMTP_HOST` | Resend SMTP host | `smtp.resend.com` |
| `SMTP_PORT` | Resend SMTP port | `465` |
| `SMTP_USER` | Resend SMTP user | `resend` |
| `SMTP_PASS` | Resend API key | `re_...` |
| `SMTP_FROM` | Sender for support emails | `VelocityApps <noreply@velocityapps.dev>` |

All of these live in **`.env.local`** in the project root. No code changes are required; the support ticket API already uses them.
