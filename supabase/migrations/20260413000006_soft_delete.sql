-- Allow 'deleted' status for soft-delete
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check CHECK(status IN ('live','hold','sold','deleted'));
