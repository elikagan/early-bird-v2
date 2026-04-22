-- Early Bird v2 — Database Schema (Postgres)
-- 13 tables, ordered by dependency

-- ============================================================
-- USERS & DEALERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id           text PRIMARY KEY,
  phone        text UNIQUE NOT NULL,
  first_name   text,
  last_name    text,
  display_name text,
  avatar_url   text,
  is_dealer    integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dealers (
  id               text PRIMARY KEY,
  user_id          text NOT NULL UNIQUE REFERENCES users(id),
  business_name    text NOT NULL,
  instagram_handle text,
  verified         integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dealer_payment_methods (
  id        text PRIMARY KEY,
  dealer_id text NOT NULL REFERENCES dealers(id),
  method    text NOT NULL CHECK(method IN ('cash','venmo','zelle','apple_pay','card')),
  enabled   integer NOT NULL DEFAULT 1,
  UNIQUE(dealer_id, method)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id      text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  key     text NOT NULL,
  enabled integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, key)
);

-- ============================================================
-- AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         text PRIMARY KEY,
  phone      text NOT NULL,
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id),
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MARKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS markets (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  location   text,
  drop_at    timestamptz NOT NULL,
  starts_at  timestamptz NOT NULL,
  status     text NOT NULL CHECK(status IN ('upcoming','live','closed')) DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyer_market_follows (
  id                  text PRIMARY KEY,
  buyer_id            text NOT NULL REFERENCES users(id),
  market_id           text NOT NULL REFERENCES markets(id),
  drop_alerts_enabled integer NOT NULL DEFAULT 1,
  UNIQUE(buyer_id, market_id)
);

-- ============================================================
-- BOOTH SETTINGS (dealer x market)
-- ============================================================

CREATE TABLE IF NOT EXISTS booth_settings (
  id           text PRIMARY KEY,
  dealer_id    text NOT NULL REFERENCES dealers(id),
  market_id    text NOT NULL REFERENCES markets(id),
  booth_number text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, market_id)
);

-- ============================================================
-- ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id             text PRIMARY KEY,
  dealer_id      text NOT NULL REFERENCES dealers(id),
  market_id      text NOT NULL REFERENCES markets(id),
  title          text NOT NULL,
  description    text,
  price          integer NOT NULL,
  original_price integer,
  price_firm     integer NOT NULL DEFAULT 0,
  status         text NOT NULL CHECK(status IN ('live','hold','sold')) DEFAULT 'live',
  sold_to        text REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_photos (
  id       text PRIMARY KEY,
  item_id  text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url      text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  UNIQUE(item_id, position)
);

-- ============================================================
-- INQUIRIES & FAVORITES
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
  id         text PRIMARY KEY,
  item_id    text NOT NULL REFERENCES items(id),
  buyer_id   text NOT NULL REFERENCES users(id),
  message    text,
  status     text NOT NULL CHECK(status IN ('open','held','sold','lost')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id         text PRIMARY KEY,
  buyer_id   text NOT NULL REFERENCES users(id),
  item_id    text NOT NULL REFERENCES items(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, item_id)
);
