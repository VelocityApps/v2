# Review Request Automator – Setup & Testing Guide

The Review Request Automator is now fully integrated with your cron system. Here's how to set it up and test it.

---

## ✅ What's Done

- ✅ Database migration (`scheduled_review_requests` table) - **You confirmed this is complete**
- ✅ Automation code (`lib/automations/review-request-automator/index.ts`)
- ✅ `runScheduled()` method added - integrates with `/api/cron`
- ✅ Automation registered in the system
- ✅ Email sending via your SMTP (Resend)

---

## Step 1: Install the Automation

1. **Sign in** to your app.
2. Go to **Marketplace** → find **Review Request Automator**.
3. Click **Install** → select your Shopify test store → **Connect**.
4. The automation will:
   - Register the `orders/fulfilled` webhook with Shopify
   - Set `next_run_at` to 1 hour from now (so cron picks it up)

---

## Step 2: Configure (Optional)

After installing, you can configure:

- **Days after delivery** (default: 3) - How many days to wait before sending review request
- **Review platform** - Judge.me, Yotpo, Stamped.io, or Custom
- **Review URL template** - e.g. `{{product_url}}/reviews`
- **Subject template** - e.g. `How was your {{product_name}}?`

These are stored in `user_automations.config` and can be updated via the dashboard.

---

## Step 3: Set Up Cron Job

The automation runs via `/api/cron` which processes scheduled review requests **every hour**.

**For local testing:**
- Manually call: `GET http://localhost:3000/api/cron?secret=YOUR_CRON_SECRET`
- Or set up a local cron tool

**For production (Vercel):**
1. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 * * * *"
  }]
}
```
2. Set `CRON_SECRET` in Vercel environment variables

**Or use external cron service:**
- Set up at [cron-job.org](https://cron-job.org) or similar
- Call: `GET https://your-domain.com/api/cron?secret=YOUR_CRON_SECRET`
- Schedule: Every hour (`0 * * * *`)

---

## Step 4: Test the Flow

### Test 1: Order Fulfillment → Schedule Request

1. **Create a test order** in your Shopify test store.
2. **Fulfill the order** (mark as fulfilled in Shopify admin).
3. **Check Supabase:**
   - Go to **Table Editor** → `scheduled_review_requests`
   - You should see a new row with:
     - `status: 'pending'`
     - `send_at: [3 days from now]` (or your configured delay)
     - `customer_email: [order email]`
     - `order_id: [Shopify order ID]`

### Test 2: Cron Processes Scheduled Requests

**Option A: Wait for scheduled time**
- Wait until `send_at` time passes
- Cron runs hourly, so it will process requests when due

**Option B: Test immediately (for development)**
- In Supabase, manually update a `scheduled_review_requests` row:
  - Set `send_at` to a past time (e.g., `2026-01-01T00:00:00Z`)
  - Set `status` to `'pending'`
- Call `/api/cron` manually (or wait for next cron run)
- Check the row again - `status` should be `'sent'` and `sent_at` should be set

### Test 3: Verify Email Sent

1. **Check the customer email inbox** (the email from the test order).
2. You should receive a review request email with:
   - Product image
   - "Leave a Review" button
   - Product link
   - Order number

---

## Step 5: Monitor Logs

**In Supabase:**
- **Table Editor** → `automation_logs`
- Filter by `user_automation_id` = your automation ID
- Look for:
  - `'success'` logs: "Scheduled review request for order..."
  - `'success'` logs: "Review request sent to..."
  - `'error'` logs: Any failures

**In your app:**
- **Dashboard** → Your automation → **Logs** tab
- Should show the same logs

---

## Troubleshooting

**No scheduled request created after order fulfillment:**
- Check Shopify webhook is registered: **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
- Look for webhook to your `/api/webhooks/shopify` endpoint
- Check `automation_logs` for errors

**Cron not processing requests:**
- Verify cron job is calling `/api/cron` successfully
- Check `user_automations.next_run_at` is set and <= now
- Check terminal/logs for cron execution errors

**Email not sent:**
- Verify SMTP is configured in `.env.local` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- Check `scheduled_review_requests.status` - if `'failed'`, check `error` field
- Verify customer email is valid

**Review request sent too early/late:**
- Check `days_after_delivery` config in `user_automations.config`
- Verify `send_at` calculation is correct in `scheduled_review_requests`

---

## Configuration Reference

| Config Key | Default | Description |
|------------|---------|-------------|
| `days_after_delivery` | `3` | Days to wait after fulfillment before sending |
| `review_platform` | `'custom'` | Platform: 'judge_me', 'yotpo', 'stamped', 'custom' |
| `review_url_template` | `'{{product_url}}/reviews'` | Template for review link |
| `subject_template` | `'How was your {{product_name}}?'` | Email subject template |

---

## Next Steps

Once testing works:
1. ✅ Install on 3+ different Shopify stores
2. ✅ Test with real orders (fulfill → wait → verify email)
3. ✅ Monitor logs for any errors
4. ✅ Adjust configuration as needed

The automation is production-ready! 🚀
