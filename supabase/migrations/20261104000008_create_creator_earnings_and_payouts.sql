-- NECTAR CANONICAL MIGRATION: 08_create_creator_earnings_and_payouts
-- Subsystem: Subsystem 06 — Creator Earnings Wallets & Payout Requests
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. creator_earnings_wallets (Creator Accrued INR Balance Cache)
CREATE TABLE IF NOT EXISTS creator_earnings_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES creator_profiles(id) ON DELETE CASCADE,
  available_balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (available_balance_inr >= 0.00),
  pending_payout_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (pending_payout_inr >= 0.00),
  lifetime_earnings_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (lifetime_earnings_inr >= 0.00),
  lifetime_paid_out_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (lifetime_paid_out_inr >= 0.00),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_creator_earnings_wallets_updated_at ON creator_earnings_wallets;
CREATE TRIGGER trg_creator_earnings_wallets_updated_at
  BEFORE UPDATE ON creator_earnings_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. creator_payout_requests (Payout Disbursements)
CREATE TABLE IF NOT EXISTS creator_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  gross_amount_inr NUMERIC(10,2) NOT NULL CHECK (gross_amount_inr >= 500.00),
  tds_withheld_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tds_withheld_inr >= 0.00),
  net_payable_inr NUMERIC(10,2) NOT NULL CHECK (net_payable_inr > 0.00),
  payout_channel VARCHAR(20) NOT NULL CHECK (payout_channel IN ('upi', 'bank_transfer')),
  payout_destination_masked VARCHAR(50) NOT NULL,
  status payout_request_status NOT NULL DEFAULT 'requested',
  rejection_reason TEXT NULL,
  banking_reference_id VARCHAR(100) NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_payout_math CHECK (net_payable_inr = (gross_amount_inr - tds_withheld_inr))
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_creator ON creator_payout_requests(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON creator_payout_requests(status, requested_at ASC);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE creator_earnings_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payout_requests DISABLE ROW LEVEL SECURITY;
