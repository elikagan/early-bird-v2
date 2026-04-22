-- Drop dead columns from the retired "drop" mechanic.
--
-- items.held_for  — legacy per-inquiry hold; replaced by status='held'
--                   on the item itself. Every backend write path already
--                   sets held_for=NULL, and 0 rows currently hold a value.
-- markets.drop_notified_at — only ever written by the drop-markets cron
--                            (deleted in an earlier commit). 0 non-null.
-- markets.dealer_preshop_enabled — no backend code reads this column.
--                                  The admin UI toggle was removed in an
--                                  earlier commit; this drop cleans up
--                                  the now-unreachable writes too.

ALTER TABLE items          DROP COLUMN IF EXISTS held_for;
ALTER TABLE markets        DROP COLUMN IF EXISTS drop_notified_at;
ALTER TABLE markets        DROP COLUMN IF EXISTS dealer_preshop_enabled;
