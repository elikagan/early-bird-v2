-- Add view count column to items table (Session 6)
ALTER TABLE items ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
