# Resend Email Setup (VelocityApps)

Use your existing Resend account for **Supabase auth emails** (signup confirmation, password reset) and **app emails** (support, alerts).

---

## 1. Get your Resend API key

1. Go to [resend.com](https://resend.com) and sign in.
2. **API Keys** → **Create API Key** → name it (e.g. `VelocityApps`) → copy the key (starts with `re_`).
3. **Domains**: add and verify your sending domain (e.g. `velocityapps.dev`) so "From" can be `noreply@velocityapps.dev`.  
   - For testing you can use Resend’s sandbox: **From** must be `onboarding@resend.dev` and **To** must be your own verified email.

---

## 2. Supabase (auth emails: signup confirm, password reset)

So Supabase sends confirmation and password-reset emails **from your domain** via Resend:

1. **Supabase Dashboard** → your project → **Authentication** → **Notifications** → **Email** → **SMTP Settings**.
2. Turn **Enable custom SMTP** **ON**.
3. Fill in **every** field (Supabase requires all before saving):

| Field | What to enter |
|-------|----------------|
| **Sender email** | Your address on your verified domain, e.g. `noreply@velocityapps.dev` (or `onboarding@resend.dev` for sandbox only) |
| **Sender name** | `VelocityApps` |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` (literally the word “resend”) |
| **Password** | Your Resend API key from [resend.com/api-keys](https://resend.com/api-keys) (starts with `re_`) |

4. **Save**.

After this, signup and password reset emails will be sent by Supabase **through Resend** and will show as **from** your domain (e.g. `noreply@velocityapps.dev`).  
*(These values live only in Supabase’s form, not in `.env.local`. `.env.local` is for your app; Supabase has its own SMTP form.)*

---

## 3. App emails (.env.local)

So your app can send support tickets, test emails, welcome emails (React Email), and alerts:

1. In the project root, create or edit `.env.local`.
2. Add (replace with your real API key and sender):

```env
# Resend SMTP (same account as Supabase)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_YOUR_RESEND_API_KEY
SMTP_FROM="VelocityApps <noreply@yourdomain.com>"

# Resend API (for React Email welcome template; can use same key)
RESEND_API_KEY=re_YOUR_RESEND_API_KEY
```

- Use the **same API key** as in Supabase.
- For **SMTP_FROM**: use a verified domain address (e.g. `noreply@velocityapps.dev`) or, for testing only, `onboarding@resend.dev` (then recipients must be your verified email).

3. Restart the dev server after changing env vars.

---

## 4. Verify

- **Supabase:** Sign up with a new email or use “Resend verification” and check inbox (and spam).
- **App:** Use the `/test` page “Send test email” (or your support/alert flow) and confirm the email is received.

---

## Resend SMTP reference

| Setting | Value |
|--------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Your Resend API key |

Docs: [Resend – Send with SMTP](https://resend.com/docs/send-with-smtp)
