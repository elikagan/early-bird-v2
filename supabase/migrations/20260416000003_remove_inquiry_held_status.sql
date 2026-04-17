-- Hold is now a plain global item status with no per-inquiry concept.
-- Any existing inquiry rows with status='held' are stale artifacts from
-- the old flow — reset them back to 'open' so the UI treats them like
-- any other active inquiry.
UPDATE inquiries SET status = 'open' WHERE status = 'held';

-- Also null out any lingering items.held_for so it doesn't leak into
-- joins (holder.display_name as held_for_name, etc).
UPDATE items SET held_for = NULL WHERE held_for IS NOT NULL;
