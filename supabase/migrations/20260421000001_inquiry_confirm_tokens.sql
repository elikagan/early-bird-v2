-- Anon inquiry flow now verifies the buyer's phone BEFORE firing the
-- dealer SMS. When the form is submitted we stash the item + message
-- on an auth_tokens row (token_type='inquiry_confirm'); redemption
-- creates the real inquiry row and triggers the dealer notification.
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS inquiry_item_id text;
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS inquiry_message text;
