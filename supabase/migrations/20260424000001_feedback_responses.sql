-- feedback_responses: post-market user feedback collected via the
-- /feedback web form (linked to from a post-market SMS blast).
--
-- audience: 'buyer' | 'dealer' — determined at submit time from the
--   user's is_dealer flag. Stored on the row so the admin view can
--   filter without joining users.
-- market_id: which market this feedback is about. Markets get archived
--   so we keep the FK loose (text, no FK constraint) — same pattern
--   as inquiries.item_id.
-- responses: jsonb blob of { question_key: answer }. Lets us evolve
--   the form without a schema change.
-- One row per (user, market) — re-submission overwrites via the
-- unique index, so users can correct their answers.

CREATE TABLE IF NOT EXISTS feedback_responses (
  id           text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id    text NOT NULL,
  audience     text NOT NULL CHECK (audience IN ('buyer','dealer')),
  responses    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feedback_responses_user_market_uniq
  ON feedback_responses (user_id, market_id);

CREATE INDEX IF NOT EXISTS feedback_responses_market_created
  ON feedback_responses (market_id, created_at DESC);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Service role only — every write/read goes through our server with
-- the service key. No row-level access from the anon key.
CREATE POLICY feedback_responses_service_only
  ON feedback_responses
  AS RESTRICTIVE
  FOR ALL
  USING (false);
