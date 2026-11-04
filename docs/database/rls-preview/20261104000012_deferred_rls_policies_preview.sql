-- ==============================================================================
-- NECTAR CANONICAL RLS PREVIEW SPECIFICATION
-- File: 20261104000012_deferred_rls_policies_preview.sql
-- Milestone: Gate 06A — Supabase Database Foundation
-- Status: DEFERRED PREVIEW ONLY — STRICTLY INACTIVE IN GATE 06A
-- ==============================================================================
--
-- CRITICAL NOTICE:
-- Per Gate 06A milestone mandate, Row Level Security (RLS) policies are NOT
-- applied or enabled in this migration. All policy statements below are
-- provided in an inactive state for external architectural audit and review.
--
-- Authorization to activate these policies will be reviewed in a subsequent gate.
-- DO NOT EXECUTE THIS SCRIPT IN PRODUCTION OR NON-PRODUCTION GATE 06A ENVIRONMENTS.
-- ==============================================================================

/*
-- [DEFERRED POLICY SET 01: PROFILES]
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read_active"
  ON profiles FOR SELECT
  USING (is_suspended = FALSE);

CREATE POLICY "profiles_self_manage"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_suspended = (SELECT is_suspended FROM profiles WHERE id = auth.uid())
  );

-- [DEFERRED POLICY SET 02: PRIVATE USER PROFILES]
ALTER TABLE private_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "private_profiles_owner_access"
  ON private_user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- [DEFERRED POLICY SET 03: CREATOR PROFILES & APPLICATIONS]
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_profiles_public_read"
  ON creator_profiles FOR SELECT
  USING (verification_status = 'approved');

CREATE POLICY "creator_profiles_owner_toggle_availability"
  ON creator_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND verification_status = (SELECT verification_status FROM creator_profiles WHERE user_id = auth.uid())
    AND rating_average = (SELECT rating_average FROM creator_profiles WHERE user_id = auth.uid())
    AND total_calls_received = (SELECT total_calls_received FROM creator_profiles WHERE user_id = auth.uid())
    AND total_minutes_spoken = (SELECT total_minutes_spoken FROM creator_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_applications_owner_submit_and_view"
  ON creator_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "creator_applications_owner_insert"
  ON creator_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- [DEFERRED POLICY SET 04: CREATOR KYC DETAILS]
ALTER TABLE creator_kyc_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_kyc_owner_view"
  ON creator_kyc_details FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- [DEFERRED POLICY SET 05: WALLETS & FINANCIAL LEDGERS - STRICT BACKEND ISOLATION]
ALTER TABLE user_coin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_coin_wallets_owner_read_only"
  ON user_coin_wallets FOR SELECT
  USING (auth.uid() = user_id);
-- Strict No INSERT / UPDATE / DELETE for client authenticated role

ALTER TABLE creator_earnings_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_earnings_wallets_owner_read_only"
  ON creator_earnings_wallets FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );
-- Strict No INSERT / UPDATE / DELETE for client authenticated role

ALTER TABLE financial_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_journal_no_client_read"
  ON financial_journal_entries FOR SELECT
  USING (FALSE); -- Only accessible via service_role / security definer procedures
-- Strict No INSERT / UPDATE / DELETE for client authenticated role

-- [DEFERRED POLICY SET 06: CALLS & MESSAGING]
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_sessions_participant_read"
  ON call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_participant_read"
  ON conversations FOR SELECT
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_messages_participant_read"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "direct_messages_sender_insert"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- [DEFERRED POLICY SET 07: INBOUND WEBHOOKS & AUDIT LOGS]
ALTER TABLE inbound_webhook_events ENABLE ROW LEVEL SECURITY;
-- Locked to service_role only

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Append-only via server service_role, read restricted to admin role
*/
