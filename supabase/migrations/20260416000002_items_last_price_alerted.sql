-- Anti-yo-yo price-drop alerts.
-- Track the lowest price watchers have been texted about. A subsequent drop
-- only triggers an SMS if the new price is below this floor. Raising the
-- price does not reset the floor, so dealers can't spam watchers by
-- repeatedly dropping-raising-dropping around the same number.
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_price_alerted integer;
