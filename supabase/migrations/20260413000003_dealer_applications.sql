-- Dealer application requests from buyers who want to become sellers
CREATE TABLE IF NOT EXISTS dealer_applications (
  id               text PRIMARY KEY,
  user_id          text NOT NULL REFERENCES users(id),
  name             text NOT NULL,
  business_name    text NOT NULL,
  instagram_handle text,
  phone            text NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dealer_applications_status ON dealer_applications(status);
