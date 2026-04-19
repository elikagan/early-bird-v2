-- Dealer market subscriptions — which shows a dealer typically sells at.
-- We key on show_name (not market_id) because markets recur: "Downtown
-- Modernism April" and "Downtown Modernism May" are different rows, but
-- a dealer's subscription should survive across dates.
CREATE TABLE IF NOT EXISTS dealer_market_subscriptions (
  id          text PRIMARY KEY,
  dealer_id   text NOT NULL REFERENCES dealers(id),
  show_name   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, show_name)
);

CREATE INDEX IF NOT EXISTS idx_dealer_market_subs_show
  ON dealer_market_subscriptions(show_name);

ALTER TABLE dealer_market_subscriptions ENABLE ROW LEVEL SECURITY;
