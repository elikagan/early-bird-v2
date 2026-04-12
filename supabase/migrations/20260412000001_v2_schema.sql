-- Early Bird v2 — Drop v1 tables and create v2 schema

-- Drop v1 tables (reverse dependency order)
DROP TABLE IF EXISTS qa_notes CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS sms_blasts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS item_photos CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS market_booths CASCADE;
DROP TABLE IF EXISTS booth_settings CASCADE;
DROP TABLE IF EXISTS buyer_market_follows CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS dealer_payment_methods CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS dealers CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS & DEALERS
-- ============================================================

CREATE TABLE users (
  id           text PRIMARY KEY,
  phone        text UNIQUE NOT NULL,
  first_name   text,
  last_name    text,
  display_name text,
  avatar_url   text,
  is_dealer    integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dealers (
  id               text PRIMARY KEY,
  user_id          text NOT NULL UNIQUE REFERENCES users(id),
  business_name    text NOT NULL,
  instagram_handle text,
  verified         integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dealer_payment_methods (
  id        text PRIMARY KEY,
  dealer_id text NOT NULL REFERENCES dealers(id),
  method    text NOT NULL CHECK(method IN ('cash','venmo','zelle','apple_pay','card')),
  enabled   integer NOT NULL DEFAULT 1,
  UNIQUE(dealer_id, method)
);

CREATE TABLE notification_preferences (
  id      text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  key     text NOT NULL,
  enabled integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, key)
);

-- ============================================================
-- AUTH
-- ============================================================

CREATE TABLE auth_tokens (
  id         text PRIMARY KEY,
  phone      text NOT NULL,
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id),
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MARKETS
-- ============================================================

CREATE TABLE markets (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  location   text,
  drop_at    timestamptz NOT NULL,
  starts_at  timestamptz NOT NULL,
  status     text NOT NULL CHECK(status IN ('upcoming','live','closed')) DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE buyer_market_follows (
  id                  text PRIMARY KEY,
  buyer_id            text NOT NULL REFERENCES users(id),
  market_id           text NOT NULL REFERENCES markets(id),
  drop_alerts_enabled integer NOT NULL DEFAULT 1,
  UNIQUE(buyer_id, market_id)
);

-- ============================================================
-- BOOTH SETTINGS
-- ============================================================

CREATE TABLE booth_settings (
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

CREATE TABLE items (
  id             text PRIMARY KEY,
  dealer_id      text NOT NULL REFERENCES dealers(id),
  market_id      text NOT NULL REFERENCES markets(id),
  title          text NOT NULL,
  description    text,
  price          integer NOT NULL,
  original_price integer,
  price_firm     integer NOT NULL DEFAULT 0,
  status         text NOT NULL CHECK(status IN ('live','hold','sold')) DEFAULT 'live',
  held_for       text REFERENCES users(id),
  sold_to        text REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item_photos (
  id       text PRIMARY KEY,
  item_id  text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url      text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  UNIQUE(item_id, position)
);

-- ============================================================
-- INQUIRIES & FAVORITES
-- ============================================================

CREATE TABLE inquiries (
  id         text PRIMARY KEY,
  item_id    text NOT NULL REFERENCES items(id),
  buyer_id   text NOT NULL REFERENCES users(id),
  message    text,
  status     text NOT NULL CHECK(status IN ('open','held','sold','lost')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE favorites (
  id         text PRIMARY KEY,
  buyer_id   text NOT NULL REFERENCES users(id),
  item_id    text NOT NULL REFERENCES items(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, item_id)
);

-- ============================================================
-- RPC: run parameterized SQL from the app layer
-- Replaces $1..$N with quote_literal(params[N])
-- ============================================================

CREATE OR REPLACE FUNCTION run_sql(query_text text, params text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  safe_query text;
  i int;
  n int;
BEGIN
  safe_query := query_text;
  n := coalesce(array_length(params, 1), 0);

  -- Replace in reverse order so $10 is replaced before $1
  FOR i IN REVERSE n..1 LOOP
    IF params[i] IS NULL THEN
      safe_query := replace(safe_query, '$' || i, 'NULL');
    ELSE
      safe_query := replace(safe_query, '$' || i, quote_literal(params[i]));
    END IF;
  END LOOP;

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
    safe_query
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: run mutation SQL (INSERT/UPDATE/DELETE), returns empty array
CREATE OR REPLACE FUNCTION run_sql_mut(query_text text, params text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_query text;
  i int;
  n int;
BEGIN
  safe_query := query_text;
  n := coalesce(array_length(params, 1), 0);

  FOR i IN REVERSE n..1 LOOP
    IF params[i] IS NULL THEN
      safe_query := replace(safe_query, '$' || i, 'NULL');
    ELSE
      safe_query := replace(safe_query, '$' || i, quote_literal(params[i]));
    END IF;
  END LOOP;

  EXECUTE safe_query;
  RETURN '[]'::jsonb;
END;
$$;
