-- Add hidden flag to items so dealers can hide/show listings
ALTER TABLE items ADD COLUMN hidden integer NOT NULL DEFAULT 0;
