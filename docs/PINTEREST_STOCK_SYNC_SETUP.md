# Pinterest Stock Sync – Why pins aren’t created

If nothing is added to Pinterest when a product goes out of stock, check these in order.

## 1. Pinterest access token (required)

The automation needs a **Pinterest API access token** to create pins.

**Option A – In the app (recommended)**  
1. Open **Dashboard** → **Pinterest Stock Sync** → **Configuration**.  
2. Paste your token into **Pinterest Access Token**.  
3. Click **Save Configuration**.

**Option B – In .env**  
- Add to `.env.local`:
  ```bash
  PINTEREST_ACCESS_TOKEN=your_token_here
  ```
- Restart the dev server after adding the variable.

**Getting a token:** [Pinterest Developers](https://developers.pinterest.com/) → create an app → generate an access token with `boards:read`, `boards:write`, `pins:read`, `pins:write`.

If no token is set (neither in config nor in env), the automation will log an error asking you to add the Pinterest Access Token.

## 2. Webhooks must be reachable by Shopify

Pinterest pins are created when Shopify sends a **webhook** to your app (on inventory or product update).

- Shopify can only send webhooks to a **public URL** (e.g. `https://your-app.vercel.app` or an ngrok URL).
- If your app runs at **`http://localhost:3000`**, Shopify cannot reach it. You will get **no webhooks** and no new pins when you change quantity.

**Options:**

- **Deploy** the app (e.g. Vercel) and set `NEXT_PUBLIC_APP_URL` to the deployed URL. Reinstall the automation so the webhook is registered to that URL.
- **Local testing:** use a tunnel (e.g. [ngrok](https://ngrok.com/)) so Shopify can POST to your machine. Set `NEXT_PUBLIC_APP_URL` to the ngrok URL, reinstall the automation, then change quantity again.

## 3. Check Execution Logs

On the **Dashboard**, open the **Pinterest Stock Sync** automation and look at **Execution Logs**.

- **No logs at all** when you set quantity to 0 → webhooks are not reaching your app (see §2).
- **Error logs** (e.g. “PINTEREST_ACCESS_TOKEN is not set” or “Failed to create Pinterest pin”) → fix the reported issue (token, Pinterest app permissions, or API errors).

## 4. Shop URL matching

The webhook handler matches the incoming shop domain to your stored store URL (with or without `https://`). If you still see no logs and you’re sure webhooks are reaching the app, confirm the store URL stored for the automation matches the one Shopify sends (e.g. `your-store.myshopify.com`).

---

**Summary:** Set `PINTEREST_ACCESS_TOKEN` in `.env.local`, ensure your app is reachable at the URL used for webhooks (deployed or tunnel), then check Execution Logs to see whether webhooks are received and whether pin creation fails with a specific error.
