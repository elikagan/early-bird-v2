-- Automatic drop mechanic.
-- drop_notified_at: set once by the cron job when it fires the drop SMS
--   blast + flips status to 'live'. Idempotency guard so a cron replay
--   can never double-text.
-- dealer_preshop_enabled: per-market toggle for whether dealers can see
--   items before the drop. Defaults on. Admin toggles in the market
--   edit UI.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS drop_notified_at timestamptz;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS dealer_preshop_enabled integer NOT NULL DEFAULT 1;
