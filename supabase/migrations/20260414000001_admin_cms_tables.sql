-- Admin CMS tables: audit log + SMS blasts + market columns

CREATE TABLE IF NOT EXISTS admin_actions (
  id          text PRIMARY KEY,
  admin_phone text NOT NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_entity ON admin_actions(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sms_blasts (
  id          text PRIMARY KEY,
  market_id   text REFERENCES markets(id),
  audience    text NOT NULL CHECK(audience IN ('all','buyers','dealers')),
  message     text NOT NULL,
  sent_count  integer NOT NULL DEFAULT 0,
  fail_count  integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  errors      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE markets ADD COLUMN IF NOT EXISTS is_test integer NOT NULL DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS archived integer NOT NULL DEFAULT 0;
