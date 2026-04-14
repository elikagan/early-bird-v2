-- Add thumbnail URL column to item_photos
-- Grid views use thumb_url (400px), detail views use url (1200px)
-- Nullable for backward compat with existing photos
ALTER TABLE item_photos ADD COLUMN IF NOT EXISTS thumb_url text;
