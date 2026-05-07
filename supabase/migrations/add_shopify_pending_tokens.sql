-- Temporary server-side storage for Shopify access tokens obtained via OAuth.
-- Keyed by shop domain. Claimed (and deleted) by the automation install API.
-- Prevents token loss when sessionStorage is unavailable (e.g. embedded app
-- context where third-party cookies are blocked and the email-verification
-- round-trip clears the 10-minute temp cookie window).

CREATE TABLE IF NOT EXISTS shopify_pending_tokens (
  shop             TEXT PRIMARY KEY,
  encrypted_token  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS shopify_pending_tokens_expires_at_idx
  ON shopify_pending_tokens(expires_at);

-- Service role only — no user-facing RLS needed for this internal table.
ALTER TABLE shopify_pending_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pending tokens"
  ON shopify_pending_tokens
  USING (true)
  WITH CHECK (true);
