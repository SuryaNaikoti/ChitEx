-- NECTAR CANONICAL MIGRATION: 03_create_creator_management
-- Subsystem: Subsystem 02 — Creator Platform & Verification
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. creator_profiles (Creator Public Monetization State)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  verification_status creator_verification_status NOT NULL DEFAULT 'pending_review',
  is_available_for_calls BOOLEAN NOT NULL DEFAULT FALSE,
  call_rate_coins_per_minute INTEGER NOT NULL DEFAULT 60 CHECK (call_rate_coins_per_minute >= 10),
  voice_intro_url TEXT NULL,
  total_calls_received INTEGER NOT NULL DEFAULT 0 CHECK (total_calls_received >= 0),
  total_minutes_spoken INTEGER NOT NULL DEFAULT 0 CHECK (total_minutes_spoken >= 0),
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_average >= 1.00 AND rating_average <= 5.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_creator_profiles_updated_at ON creator_profiles;
CREATE TRIGGER trg_creator_profiles_updated_at
  BEFORE UPDATE ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_creator_profiles_available ON creator_profiles(is_available_for_calls, verification_status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);

-- 2. creator_applications (Onboarding & Verification Submissions)
CREATE TABLE IF NOT EXISTS creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sample_voice_url TEXT NOT NULL,
  application_notes TEXT NULL,
  reviewed_by UUID NULL REFERENCES profiles(id),
  review_notes TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_creator_applications_user ON creator_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_applications_reviewer ON creator_applications(reviewed_by);

-- 3. creator_kyc_details (Encrypted Financial & Tax Identification)
CREATE TABLE IF NOT EXISTS creator_kyc_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES creator_profiles(id) ON DELETE CASCADE,
  legal_full_name VARCHAR(150) NOT NULL,
  pan_number_encrypted TEXT NOT NULL,
  pan_masked VARCHAR(10) NOT NULL,
  payout_channel VARCHAR(20) NOT NULL CHECK (payout_channel IN ('upi', 'bank_transfer')),
  upi_id_encrypted TEXT NULL,
  upi_id_masked VARCHAR(50) NULL,
  bank_account_number_encrypted TEXT NULL,
  bank_account_masked VARCHAR(20) NULL,
  bank_ifsc_code VARCHAR(11) NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_creator_kyc_details_updated_at ON creator_kyc_details;
CREATE TRIGGER trg_creator_kyc_details_updated_at
  BEFORE UPDATE ON creator_kyc_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_creator_kyc_creator ON creator_kyc_details(creator_id);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE creator_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_kyc_details DISABLE ROW LEVEL SECURITY;
