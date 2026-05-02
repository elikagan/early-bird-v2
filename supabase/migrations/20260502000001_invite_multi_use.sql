-- Multi-use dealer invites. A dealer_invites row with multi_use=true
-- doesn't get marked used_at on redemption, so the same /invite/[code]
-- URL keeps working for every dealer who taps it. This is the
-- "universal link" Eli shares in IG bios / dealer group DMs / etc.
--
-- Single-use invites (multi_use=false, the default) keep the existing
-- behavior: used_at is set on first redemption and the code 410s after.
ALTER TABLE dealer_invites
  ADD COLUMN IF NOT EXISTS multi_use boolean NOT NULL DEFAULT false;
