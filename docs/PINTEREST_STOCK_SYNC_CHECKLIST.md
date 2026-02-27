# Pinterest Stock Sync – First Automation Checklist

Use this to confirm what’s done and what’s left so nothing is missed.

---

## Completed

### Discovery & install flow
- [x] **Marketplace** – Automation listed with config schema (board name, pin template, Pinterest token).
- [x] **Install modal** – Connect Shopify → redirect to Shopify OAuth → return to app with **configure** step (not back to app selection).
- [x] **OAuth** – Store URL normalization (no `https://` in host), redirect URI / App URL host matching documented.
- [x] **Install API** – Creates `user_automation`, stores encrypted Shopify token, calls automation `install()`.

### Automation behaviour
- [x] **Webhooks** – Registers both `products/update` and `inventory_levels/update` on install; uninstall removes them.
- [x] **Webhook handler** – Handles both topics; for inventory, resolves product via `inventory_item_id` (GraphQL), then same “out of stock” logic.
- [x] **Shop matching** – Webhook route normalizes shop (with/without protocol) so delivery matches stored store URL.
- [x] **Out-of-stock logic** – Fetches product, checks all variants `inventory_quantity === 0`, creates pin with board name + pin template from config.
- [x] **Pinterest API** – `createPinterestPin`; token from config `pinterest_access_token` first, then `PINTEREST_ACCESS_TOKEN` env.

### Config & UI
- [x] **Config schema** – `board_name`, `pin_template`, `pinterest_access_token` (password field).
- [x] **ConfigForm** – Supports `password` type; no infinite loop (stable initial config).
- [x] **Dashboard** – Automation detail page: view status, **Configuration** (edit + Save), **Execution Logs**.
- [x] **Configure API** – PATCH `/api/automations/[id]/configure` saves config.

### Data & migrations
- [x] **Migration** – `add_pinterest_token_config.sql` adds `pinterest_access_token` to Pinterest Stock Sync `config_schema` (must be run).

### Docs & copy
- [x] **Setup guide** – `docs/PINTEREST_STOCK_SYNC_SETUP.md` (token options, webhooks, logs).
- [x] **App purpose & privacy link** – Purpose in relation to Pinterest and privacy policy URL documented.

---

## Remaining (to complete the first automation)

### Do now (no Pinterest API key needed)

#### 1. Run the Pinterest config migration
- [ ] Run migration so the **Pinterest Access Token** field exists in the automation config:
  - `npx supabase db push`  
  - or run `supabase/migrations/add_pinterest_token_config.sql` in Supabase SQL editor.

#### 2. Webhooks reachable by Shopify
- [ ] Ensure Shopify can POST to your app:
  - **Production:** Deploy (e.g. Vercel), set `NEXT_PUBLIC_APP_URL` to the live URL, then **reinstall** Pinterest Stock Sync so the webhook URL is the deployed one.
  - **Local test:** Use ngrok (or similar), set `NEXT_PUBLIC_APP_URL` to the tunnel URL, reinstall the automation. (You can verify webhooks in Execution Logs once you have the token.)

#### 3. (Optional) Privacy policy – Pinterest
- [ ] Add a short Pinterest-specific line to the privacy policy (see below; can be done now for when you submit to Pinterest).

### Do when you have the Pinterest API key (approved)

#### 4. Set the Pinterest token
- [ ] Either:
  - Set **Pinterest Access Token** in Dashboard → Pinterest Stock Sync → Configuration → Save, or  
  - Set `PINTEREST_ACCESS_TOKEN` in `.env.local` and restart the app.

#### 5. End-to-end test
- [ ] Set a product’s quantity to 0 in Shopify (or trigger product update so it’s out of stock).
- [ ] Confirm a new pin appears on the chosen Pinterest board.
- [ ] Check Dashboard → Pinterest Stock Sync → **Execution Logs** for a success entry (or fix any error shown).

### (Optional) Pinterest developer app
- [ ] If you need a “public” or approved Pinterest app: create app at [developers.pinterest.com](https://developers.pinterest.com/), set redirect/privacy/terms as needed, and use app purpose + privacy URL you already have.

---

## Quick reference

| Item                         | Status   | When / Notes                                |
|-----------------------------|----------|---------------------------------------------|
| Install flow (no redirect)  | Done     | —                                           |
| Webhooks (both topics)      | Done     | —                                           |
| Pinterest token in config   | Done     | —                                           |
| Shop matching               | Done     | —                                           |
| **Migration run**           | **Do now** | Run `add_pinterest_token_config.sql`       |
| **Webhook URL reachable**   | **Do now** | Deploy or ngrok; reinstall automation      |
| **Privacy (Pinterest)**     | **Done** | Added to `/privacy` (info + service provider) |
| **Token set**               | **When key approved** | Config or `.env`                    |
| **E2E test (pin created)**  | **When key approved** | Set qty to 0 → check pin + logs     |

---

**While waiting for Pinterest API approval:** run the migration, make webhooks reachable (deploy or ngrok), and optionally reinstall the automation. **Once approved:** add the token in Configuration (or `.env`), then run the E2E test.
