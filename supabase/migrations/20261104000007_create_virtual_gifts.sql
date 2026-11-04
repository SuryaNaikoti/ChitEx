-- NECTAR CANONICAL MIGRATION: 07_create_virtual_gifts
-- Subsystem: Subsystem 06 — Virtual Gifts Catalog & Transfers
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. virtual_gift_catalog (Virtual Gifting Options)
CREATE TABLE IF NOT EXISTS virtual_gift_catalog (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  coin_price INTEGER NOT NULL CHECK (coin_price > 0),
  animation_key VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed canonical gift catalog
INSERT INTO virtual_gift_catalog (id, name, coin_price, animation_key, is_active)
VALUES
  ('rose', 'Rose', 50, 'gift_rose', TRUE),
  ('coffee', 'Coffee', 100, 'gift_coffee', TRUE),
  ('crown', 'Royal Crown', 500, 'gift_crown', TRUE),
  ('sports_car', 'Sports Car', 2000, 'gift_sports_car', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  coin_price = EXCLUDED.coin_price,
  animation_key = EXCLUDED.animation_key,
  is_active = EXCLUDED.is_active;

-- 2. virtual_gift_transfers (Gift Dispatch Log)
CREATE TABLE IF NOT EXISTS virtual_gift_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  gift_id VARCHAR(50) NOT NULL REFERENCES virtual_gift_catalog(id),
  call_session_id UUID NULL REFERENCES call_sessions(id),
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  creator_earnings_inr NUMERIC(10,2) NOT NULL CHECK (creator_earnings_inr >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gift_transfers_sender ON virtual_gift_transfers(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transfers_recipient ON virtual_gift_transfers(recipient_creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transfers_call ON virtual_gift_transfers(call_session_id);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE virtual_gift_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_gift_transfers DISABLE ROW LEVEL SECURITY;
