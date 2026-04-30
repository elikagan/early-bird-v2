-- inbound_sms: copy of every SMS reply Pingram pushes to our webhook.
-- Lets the admin "Responses" tab read replies in-app instead of needing
-- to log into Pingram. Pingram doesn't give us a stable event id, so
-- we dedup on (from_phone, received_at, body) — collision requires the
-- same number sending the same body at the same exact timestamp, which
-- is fine for our purposes.

CREATE TABLE IF NOT EXISTS inbound_sms (
  id              text PRIMARY KEY,
  from_phone      text NOT NULL,
  to_phone        text NOT NULL,
  body            text NOT NULL,
  received_at     timestamptz NOT NULL,
  -- Set at insert time by joining users.phone. Nullable because the
  -- sender may not have an EB account.
  matched_user_id text REFERENCES users(id) ON DELETE SET NULL,
  -- Pingram's reference (the userId we passed when sending the
  -- outbound). Useful when there's a phone-number mismatch.
  pingram_user_id     text,
  pingram_tracking_id text,
  is_reply        boolean NOT NULL DEFAULT false,
  raw_payload     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Dedup: same number + same body + same exact timestamp is a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_sms_dedup
  ON inbound_sms (from_phone, received_at, body);

-- Admin list view orders by newest first.
CREATE INDEX IF NOT EXISTS idx_inbound_sms_received
  ON inbound_sms (received_at DESC);

-- Same RLS posture as system_events: deny all by default; the service
-- role bypasses RLS. App code reads/writes through the server.
ALTER TABLE inbound_sms ENABLE ROW LEVEL SECURITY;
