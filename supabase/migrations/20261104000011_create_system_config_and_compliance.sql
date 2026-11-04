-- NECTAR CANONICAL MIGRATION: 11_create_system_config_and_compliance
-- Subsystem: Subsystem 08 — System Configurations, Notifications & Privacy Compliance
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. system_configurations (Configurable Commercial & Operational Parameters)
CREATE TABLE IF NOT EXISTS system_configurations (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value JSONB NOT NULL,
  description TEXT NOT NULL,
  updated_by UUID NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_system_configurations_updated_at ON system_configurations;
CREATE TRIGGER trg_system_configurations_updated_at
  BEFORE UPDATE ON system_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed canonical initial system parameters
INSERT INTO system_configurations (config_key, config_value, description)
VALUES
  ('commercial.creator_share_percentage', '{"value": 60}'::jsonb, 'Contractual creator gross revenue share percentage on coin redemptions'),
  ('commercial.platform_share_percentage', '{"value": 40}'::jsonb, 'Contractual platform commission share percentage on coin redemptions'),
  ('commercial.minimum_payout_amount_inr', '{"value": 500.00}'::jsonb, 'Minimum INR withdrawal threshold for creator payout disbursements'),
  ('commercial.default_call_rate_coins_per_minute', '{"value": 60}'::jsonb, 'Default calling rate in virtual coins per minute'),
  ('commercial.net_realization_rate_paise', '{"value": 8.390}'::jsonb, 'Net consideration in paise per coin ex-18% GST on Starter retail lot'),
  ('compliance.minimum_user_age', '{"value": 18}'::jsonb, 'Minimum legal age required for platform onboarding under India DPDP Act'),
  ('compliance.gst_tax_rate_percentage', '{"value": 18}'::jsonb, 'Statutory GST forward charge rate under SAC 998439'),
  ('compliance.tds_rate_percentage', '{"value": 1.0}'::jsonb, 'Section 194M/194J income tax deduction at source on creator payments')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;

-- 2. notifications (User Alerts & System Notices)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- 3. user_privacy_requests (DPDP Act 2023 Compliance)
CREATE TABLE IF NOT EXISTS user_privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('data_export', 'account_erasure', 'consent_withdrawal')),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'completed', 'rejected')),
  resolution_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON user_privacy_requests(user_id, status);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE system_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_requests DISABLE ROW LEVEL SECURITY;
