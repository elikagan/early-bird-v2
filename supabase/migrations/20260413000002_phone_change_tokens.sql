-- Add token_type and user_id to auth_tokens for phone-change flow
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS token_type text NOT NULL DEFAULT 'login';
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS user_id text;
