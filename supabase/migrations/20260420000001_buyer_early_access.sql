-- Buyer early-access grants — lets specific buyers pre-shop a market
-- before the general drop. Granted via the /early/[market-id] entry
-- point that dealers share with their audiences.
CREATE TABLE IF NOT EXISTS buyer_market_early_access (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id),
  market_id   text NOT NULL REFERENCES markets(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  source      text,  -- free-form attribution (e.g. "share", "dealer:<id>")
  UNIQUE(user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_early_access_user ON buyer_market_early_access(user_id);

ALTER TABLE buyer_market_early_access ENABLE ROW LEVEL SECURITY;

-- Extend auth_tokens to carry an optional market_id payload. Used by
-- the early-access SMS flow so that when the buyer taps the magic link,
-- /api/auth/verify knows which market to grant access to.
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS market_id text;
