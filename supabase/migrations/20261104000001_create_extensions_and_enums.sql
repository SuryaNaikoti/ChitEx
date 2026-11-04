-- NECTAR CANONICAL MIGRATION: 01_create_extensions_and_enums
-- Milestone: Gate 06A — Supabase Database Foundation
-- Classification: Authoritative DDL Specification

-- 1. Essential PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth schema and auth.users stub exists for standalone verification
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Centralized Timestamp Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Canonical Enumerations (Custom Types)

-- User and Access Control Roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'user',
    'creator',
    'moderator',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Creator Approval & Lifecycle Status
DO $$ BEGIN
  CREATE TYPE creator_verification_status AS ENUM (
    'not_applied',
    'pending_review',
    'approved',
    'rejected',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Age Assurance & Verification Status (India DPDP 2023 Tiering)
DO $$ BEGIN
  CREATE TYPE age_assurance_tier AS ENUM (
    'declared_only',
    'verified_id',
    'verified_payment',
    'rejected_minor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Gender Identifiers
DO $$ BEGIN
  CREATE TYPE gender_identity AS ENUM (
    'woman',
    'man',
    'non_binary',
    'prefer_not_to_say'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Call Session Lifecycle States
DO $$ BEGIN
  CREATE TYPE call_session_status AS ENUM (
    'initiated',
    'ringing',
    'connecting',
    'active',
    'completed_normal',
    'completed_insufficient_funds',
    'missed',
    'declined',
    'failed_technical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Call Coin Hold States
DO $$ BEGIN
  CREATE TYPE call_hold_status AS ENUM (
    'reserved',
    'captured',
    'released'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment Order Lifecycle (Razorpay)
DO $$ BEGIN
  CREATE TYPE payment_order_status AS ENUM (
    'created',
    'attempted',
    'paid',
    'failed',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Financial Journal Account Types (Dual-Ledger COIN & INR_SUBUNIT)
DO $$ BEGIN
  CREATE TYPE journal_account_type AS ENUM (
    'user_coin_liability',
    'virtual_coin_issuance_clearing',
    'cash_gateway_clearing',
    'unearned_coin_fiat_reserve',
    'gst_output_tax_payable',
    'gateway_processing_fee_expense',
    'platform_earned_revenue',
    'creator_payable_liability',
    'creator_tds_tax_payable',
    'creator_payout_escrow',
    'user_refund_liability',
    'promotional_coin_reserve'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Financial Transaction Reason Codes
DO $$ BEGIN
  CREATE TYPE financial_entry_reason AS ENUM (
    'coin_purchase',
    'coin_purchase_refund',
    'voice_call_minute_consumption',
    'virtual_gift_dispatch',
    'creator_payout_disbursement',
    'creator_payout_reversal',
    'admin_manual_correction'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Creator Payout Request Lifecycle
DO $$ BEGIN
  CREATE TYPE payout_request_status AS ENUM (
    'requested',
    'under_review',
    'approved_pending',
    'processing',
    'paid',
    'rejected',
    'reversed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Moderation Report Targets & Status
DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM (
    'user_profile',
    'voice_call',
    'direct_message',
    'creator_bio'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM (
    'pending',
    'in_review',
    'action_taken',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_action_type AS ENUM (
    'warning_issued',
    'content_removed',
    'temporary_suspension',
    'permanent_ban'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
