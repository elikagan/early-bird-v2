-- Scheduled blasts: one pending row per (market, kind) that Eli
-- approves + edits + sends from /admin. Replaces the idea of a
-- cron that auto-sends mass texts; every scheduled fan-out is
-- human-gated per commitment #9 in EB_DESIGN.md.
--
-- Kinds:
--   dealer_monday   — fires when market is ~6 days away.
--   dealer_thursday — fires when market is ~3 days away.
--   buyer_thursday  — fires when market is ~3 days away.
--
-- Flow:
--   1. Daily cron detects a market hitting the trigger window and
--      INSERTs a scheduled_blasts row (ON CONFLICT DO NOTHING so
--      the same blast is never double-queued).
--   2. Queue-side hook texts Eli a link: /v/[token]?to=/admin/blast/pending/[id]
--   3. Eli opens it, edits copy, hits Send — `sent_at` + counts fill
--      in, SMS goes to recipients.

CREATE TABLE IF NOT EXISTS scheduled_blasts (
  id              text PRIMARY KEY,
  market_id       text NOT NULL REFERENCES markets(id),
  kind            text NOT NULL CHECK (kind IN ('dealer_monday', 'dealer_thursday', 'buyer_thursday')),
  proposed_copy   text NOT NULL,
  queued_at       timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  sent_count      integer,
  failed_count    integer,
  sent_by_admin   text,
  UNIQUE(market_id, kind)
);

ALTER TABLE scheduled_blasts ENABLE ROW LEVEL SECURITY;
