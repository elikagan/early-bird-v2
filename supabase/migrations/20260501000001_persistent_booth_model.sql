-- Persistent-booth model migration. The site is moving from "items
-- belong to a specific market" to "items belong to a dealer; markets
-- are events the dealer attends." See BOOTH_MODEL_PLAN.md for the
-- full why.
--
-- This migration:
--   1. Drops the obsolete drop-era tables and columns
--   2. Adds booth_settings.declined so dealers can record "no, not
--      at this market" answers without us re-asking every week
--   3. Makes items.market_id nullable and clears every existing row
--      so items become persistent inventory
--   4. Deletes the now-meaningless 'drop_alerts' rows from
--      notification_preferences

-- ── 1. Obsolete drop-era plumbing ────────────────────────────────────

-- Buyer "follow market" with drop_alerts_enabled. The whole "drop"
-- concept is retired; the table powered nothing else.
DROP TABLE IF EXISTS buyer_market_follows;

-- Buyer early-access grants. Companion to the magic-link share flow.
-- The flow is being deleted; the table goes with it.
DROP TABLE IF EXISTS buyer_market_early_access;

-- "Shows I usually do" — was set during dealer onboarding, no longer
-- needed because the weekly prompt pre-fills from past booth_settings
-- history instead.
DROP TABLE IF EXISTS dealer_market_subscriptions;

-- The early-access magic-link flow stored a market_id on the auth
-- token so /api/auth/verify knew which market to grant access to.
-- The flow is gone; the column is dead weight.
ALTER TABLE auth_tokens DROP COLUMN IF EXISTS market_id;

-- Old default notification preference set at sign-up. The key is
-- referenced nowhere now.
DELETE FROM notification_preferences WHERE key = 'drop_alerts';

-- ── 2. New booth_settings.declined column ────────────────────────────

-- Lets the weekly /sell prompt record "no thanks" answers durably.
-- A row with declined=true and booth_number=null means the dealer
-- explicitly said no. A row with declined=false and booth_number set
-- means yes. Absence of a row means unanswered.
ALTER TABLE booth_settings
  ADD COLUMN IF NOT EXISTS declined boolean NOT NULL DEFAULT false;

-- ── 3. items.market_id becomes nullable; clear all existing rows ─────

-- Items are now owned by dealers, not markets. Existing rows get
-- their market_id cleared so they become persistent inventory. The
-- column is kept (nullable) for one release as a safety net; a
-- follow-up migration will drop it.
ALTER TABLE items ALTER COLUMN market_id DROP NOT NULL;
UPDATE items SET market_id = NULL WHERE market_id IS NOT NULL;

-- ── Sanity ───────────────────────────────────────────────────────────
-- (No CHECK constraints to add. The model now relies entirely on
--  booth_settings to express dealer×market relationships.)
