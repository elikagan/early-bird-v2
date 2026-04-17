-- system_events: canonical log of every operationally-significant
-- thing the app does. Used by the /admin Health tab and the
-- ops-check cron to detect failures + trends.
--
-- event_type: coarse category (e.g. 'sms.inquiry', 'cron.drop_markets',
--   'drop.fired', 'auth.magic_link_sent', 'ops.alert_fired', etc.)
-- severity: one of 'info' | 'warn' | 'error'
-- entity_type / entity_id: optional link to the row this relates to
-- payload: json blob for type-specific details
-- Indexed by (event_type, created_at DESC) for dashboard filters, and
-- by created_at alone for the retention prune job.

CREATE TABLE IF NOT EXISTS system_events (
  id           text PRIMARY KEY,
  event_type   text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('info','warn','error')),
  entity_type  text,
  entity_id    text,
  message      text,
  payload      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created
  ON system_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_created
  ON system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity_created
  ON system_events (severity, created_at DESC)
  WHERE severity IN ('warn', 'error');
