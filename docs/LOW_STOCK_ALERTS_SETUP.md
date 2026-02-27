# Low Stock Alerts – Setup

Get email or Slack alerts when inventory drops below your threshold.

## 1. Run the migration

So the config form includes email and Slack fields:

```bash
npx supabase db push
```

Or run `supabase/migrations/add_low_stock_alerts_config.sql` in the Supabase SQL editor.

## 2. Email (Resend or SMTP)

- **Resend (easiest):** Set `RESEND_API_KEY` in `.env.local`. Alerts will send via Resend; no SMTP needed.
- **SMTP:** Or set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (and optional `SMTP_FROM`).

## 3. Install the automation

1. **Marketplace** → **Low Stock Alerts** → **Add to Store**
2. Connect your Shopify store (if needed)
3. **Configure:**
   - **Alert threshold** – e.g. `10` (alert when stock ≤ 10)
   - **Notify via** – Email or Slack
   - **Email addresses** – Comma-separated (e.g. `you@example.com, team@example.com`)
   - If you leave email addresses empty but have **SUPPORT_ALERT_EMAILS** in `.env`, those are used.
   - For Slack: paste your **Slack Webhook URL**
   - **Alert frequency** – **Immediate** (one alert per product when it goes low) or **Daily digest** (one email/Slack per day with all low-stock products; runs at 8:00 UTC)
4. **Install**

## 4. Webhooks

Shopify must be able to send webhooks to your app (same as Pinterest):

- **Production:** Deploy and set `NEXT_PUBLIC_APP_URL` to your live URL, then reinstall the automation.
- **Local:** Use ngrok (or similar), set `NEXT_PUBLIC_APP_URL` to the tunnel URL, then reinstall.

## 5. Test

Set a product’s quantity in Shopify to a value **at or below** your threshold (e.g. 9 if threshold is 10). You should get an email (or Slack message) and see a success entry in **Dashboard → Low Stock Alerts → Execution Logs**.

## 6. Troubleshooting (no alert when stock is low)

- **Check Execution Logs** (Dashboard → Low Stock Alerts → Execution Logs):
  - If you see **"Low stock webhook received: inventory_item_id=..., available=9, threshold=10"** → The webhook is reaching the app. If you still got no email/Slack, you'll likely see **"no email or Slack configured"** — add **Email addresses** in the automation config or set **SUPPORT_ALERT_EMAILS** in `.env`.
  - If you see **nothing** when you change stock in Shopify → The webhook is not reaching your app:
    - **Local dev:** Shopify cannot call `localhost`. Use a public URL: deploy the app or use **ngrok** (or similar), set **NEXT_PUBLIC_APP_URL** to that URL, then **reinstall** the automation so the webhook is registered to the public URL.
    - Ensure **SHOPIFY_WEBHOOK_SECRET** in `.env` matches the value in your Shopify app settings (otherwise Shopify's signature check fails and the request is rejected).
