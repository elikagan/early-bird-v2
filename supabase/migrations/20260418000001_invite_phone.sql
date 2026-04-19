-- Admin-created dealer invites can now pre-bind a phone number to the
-- invite code. This removes phone-typo risk from the dealer side and
-- lets the dealer skip the magic-link step entirely — they tap the
-- SMS link, fill in their name/business, and they're in.
--
-- Existing invites (with phone IS NULL) still work via the old flow
-- as a fallback.
ALTER TABLE dealer_invites ADD COLUMN IF NOT EXISTS phone text;
