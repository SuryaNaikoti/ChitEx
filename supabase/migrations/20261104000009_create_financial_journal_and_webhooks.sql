-- NECTAR CANONICAL MIGRATION: 09_create_financial_journal_and_webhooks
-- Subsystem: Subsystems 06 & 08 — General Ledger & Inbound Webhooks
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. financial_journal_entries (Balanced Double-Entry General Ledger)
CREATE TABLE IF NOT EXISTS financial_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_group_id UUID NOT NULL,
  account_type journal_account_type NOT NULL,
  user_id UUID NULL REFERENCES profiles(id),
  creator_id UUID NULL REFERENCES creator_profiles(id),
  debit_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_amount_cents >= 0),
  credit_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_amount_cents >= 0),
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('COIN', 'INR_SUBUNIT')),
  reason financial_entry_reason NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  reference_entity_type VARCHAR(50) NOT NULL,
  reference_entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_positive_entry CHECK (debit_amount_cents > 0 OR credit_amount_cents > 0),
  CONSTRAINT chk_not_both CHECK (NOT (debit_amount_cents > 0 AND credit_amount_cents > 0)),
  CONSTRAINT uq_journal_idempotency_account UNIQUE(idempotency_key, account_type)
);

CREATE INDEX IF NOT EXISTS idx_financial_journal_group ON financial_journal_entries(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_financial_journal_account ON financial_journal_entries(account_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_journal_user ON financial_journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_journal_creator ON financial_journal_entries(creator_id, created_at DESC);

-- 2. inbound_webhook_events (Webhook Deduplication & Audit Ledger)
CREATE TABLE IF NOT EXISTS inbound_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('razorpay', 'livekit')),
  event_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_webhook_provider_event UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_inbound_webhooks_lookup ON inbound_webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_inbound_webhooks_unprocessed ON inbound_webhook_events(is_processed, created_at ASC) WHERE is_processed = FALSE;

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE financial_journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_webhook_events DISABLE ROW LEVEL SECURITY;
