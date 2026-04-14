-- Performance indexes for scalability
-- Only adds indexes not already covered by UNIQUE constraints

-- Items: main feed filters by market + status, JOINs on dealer
CREATE INDEX IF NOT EXISTS idx_items_market_status ON items(market_id, status);
CREATE INDEX IF NOT EXISTS idx_items_dealer_id ON items(dealer_id);

-- Favorites: COUNT(*) by item_id (UNIQUE is on buyer_id,item_id — wrong prefix)
CREATE INDEX IF NOT EXISTS idx_favorites_item_id ON favorites(item_id);

-- Inquiries: COUNT(*) by item_id, lookups by buyer_id
CREATE INDEX IF NOT EXISTS idx_inquiries_item_id ON inquiries(item_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_id ON inquiries(buyer_id);

-- Cleanup: find expired sessions/tokens without full table scan
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);
