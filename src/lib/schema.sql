-- Early Bird v2 — Database Schema
-- 13 tables, ordered by dependency

-- ============================================================
-- USERS & DEALERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  phone        TEXT UNIQUE NOT NULL,
  first_name   TEXT,
  last_name    TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  is_dealer    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dealers (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL UNIQUE REFERENCES users(id),
  business_name    TEXT NOT NULL,
  instagram_handle TEXT,
  verified         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dealer_payment_methods (
  id        TEXT PRIMARY KEY,
  dealer_id TEXT NOT NULL REFERENCES dealers(id),
  method    TEXT NOT NULL CHECK(method IN ('cash','venmo','zelle','apple_pay','card')),
  enabled   INTEGER NOT NULL DEFAULT 1,
  UNIQUE(dealer_id, method)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key     TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, key)
);

-- ============================================================
-- AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  phone      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MARKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS markets (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT,
  drop_at    TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  status     TEXT NOT NULL CHECK(status IN ('upcoming','live','closed')) DEFAULT 'upcoming',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyer_market_follows (
  id                  TEXT PRIMARY KEY,
  buyer_id            TEXT NOT NULL REFERENCES users(id),
  market_id           TEXT NOT NULL REFERENCES markets(id),
  drop_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(buyer_id, market_id)
);

-- ============================================================
-- BOOTH SETTINGS (dealer x market)
-- ============================================================

CREATE TABLE IF NOT EXISTS booth_settings (
  id           TEXT PRIMARY KEY,
  dealer_id    TEXT NOT NULL REFERENCES dealers(id),
  market_id    TEXT NOT NULL REFERENCES markets(id),
  booth_number TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(dealer_id, market_id)
);

-- ============================================================
-- ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id             TEXT PRIMARY KEY,
  dealer_id      TEXT NOT NULL REFERENCES dealers(id),
  market_id      TEXT NOT NULL REFERENCES markets(id),
  title          TEXT NOT NULL,
  description    TEXT,
  price          INTEGER NOT NULL,
  original_price INTEGER,
  price_firm     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL CHECK(status IN ('live','hold','sold')) DEFAULT 'live',
  held_for       TEXT REFERENCES users(id),
  sold_to        TEXT REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_photos (
  id       TEXT PRIMARY KEY,
  item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(item_id, position)
);

-- ============================================================
-- INQUIRIES & FAVORITES
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
  id         TEXT PRIMARY KEY,
  item_id    TEXT NOT NULL REFERENCES items(id),
  buyer_id   TEXT NOT NULL REFERENCES users(id),
  message    TEXT,
  status     TEXT NOT NULL CHECK(status IN ('open','held','sold','lost')) DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id         TEXT PRIMARY KEY,
  buyer_id   TEXT NOT NULL REFERENCES users(id),
  item_id    TEXT NOT NULL REFERENCES items(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(buyer_id, item_id)
);
