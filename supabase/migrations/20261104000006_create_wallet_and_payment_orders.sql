-- NECTAR CANONICAL MIGRATION: 06_create_wallet_and_payment_orders
-- Subsystem: Subsystem 06 — Financial Wallets & Payment Orders
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. user_coin_wallets (User Virtual Coin Balance Cache)
CREATE TABLE IF NOT EXISTS user_coin_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  available_coins INTEGER NOT NULL DEFAULT 0 CHECK (available_coins >= 0),
  held_coins INTEGER NOT NULL DEFAULT 0 CHECK (held_coins >= 0),
  lifetime_coins_purchased INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_coins_purchased >= 0),
  lifetime_coins_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_coins_spent >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_user_coin_wallets_updated_at ON user_coin_wallets;
CREATE TRIGGER trg_user_coin_wallets_updated_at
  BEFORE UPDATE ON user_coin_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. coin_packages (Catalog of In-App Purchases)
CREATE TABLE IF NOT EXISTS coin_packages (
  id VARCHAR(50) PRIMARY KEY,
  coin_quantity INTEGER NOT NULL CHECK (coin_quantity > 0),
  price_paise INTEGER NOT NULL CHECK (price_paise > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  badge_text VARCHAR(30) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Seed canonical retail coin packages
INSERT INTO coin_packages (id, coin_quantity, price_paise, is_active, badge_text, sort_order)
VALUES
  ('tier_starter_1000', 1000, 9900, TRUE, NULL, 1),
  ('tier_popular_3000', 3000, 24900, TRUE, 'Most Popular', 2),
  ('tier_value_7000', 7000, 49900, TRUE, 'Best Value', 3),
  ('tier_vip_15000', 15000, 99900, TRUE, 'VIP Pack', 4)
ON CONFLICT (id) DO UPDATE SET
  coin_quantity = EXCLUDED.coin_quantity,
  price_paise = EXCLUDED.price_paise,
  is_active = EXCLUDED.is_active,
  badge_text = EXCLUDED.badge_text,
  sort_order = EXCLUDED.sort_order;

-- 3. payment_orders (Razorpay Payment Lifecycle)
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  package_id VARCHAR(50) NOT NULL REFERENCES coin_packages(id),
  coins_purchased INTEGER NOT NULL CHECK (coins_purchased > 0),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency VARCHAR(5) NOT NULL DEFAULT 'INR',
  gateway_provider VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
  gateway_payment_id VARCHAR(100) NULL UNIQUE,
  gateway_signature TEXT NULL,
  status payment_order_status NOT NULL DEFAULT 'created',
  error_code VARCHAR(50) NULL,
  error_description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_gateway_order ON payment_orders(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_gateway_payment ON payment_orders(gateway_payment_id);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE user_coin_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE coin_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders DISABLE ROW LEVEL SECURITY;
