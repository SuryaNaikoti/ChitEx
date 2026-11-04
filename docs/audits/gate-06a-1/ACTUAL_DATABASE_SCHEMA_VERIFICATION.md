# NECTAR — ACTUAL DATABASE SCHEMA VERIFICATION
**Milestone:** Gate 06A.1 — Independent Supabase Migration & Schema Verification  
**Auditor:** Independent Principal PostgreSQL Engineer & Database Reliability Auditor  
**Document Ref:** `docs/audits/gate-06a-1/ACTUAL_DATABASE_SCHEMA_VERIFICATION.md`  

---

## 1. Catalog Verification Methodology

The schema catalog declared across migrations `20261104000001` through `20261104000011` was verified against `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md` across 8 structural dimensions:
1. Enumerations (Custom Types)
2. Primary Keys and Type Invariants
3. Foreign Keys and Cascading Rules
4. Unique Constraints
5. Check Constraints and Domain Ranges
6. Covering and Performance Indexes
7. Updated-At Trigger Automation
8. Views and Query Aliases

---

## 2. Enumeration Verification (13 Custom Types)

| Enum Name | Migration File | Values Count | Canonical Values Verified | Canonical Status |
| :--- | :--- | :---: | :--- | :---: |
| `user_role` | `000001` | 4 | `user`, `creator`, `moderator`, `admin` | **EXACT MATCH** |
| `creator_verification_status` | `000001` | 5 | `not_applied`, `pending_review`, `approved`, `rejected`, `suspended` | **EXACT MATCH** |
| `age_assurance_tier` | `000001` | 4 | `declared_only`, `verified_id`, `verified_payment`, `rejected_minor` | **EXACT MATCH** |
| `gender_identity` | `000001` | 4 | `woman`, `man`, `non_binary`, `prefer_not_to_say` | **EXACT MATCH** |
| `call_session_status` | `000001` | 9 | `initiated`, `ringing`, `connecting`, `active`, `completed_normal`, `completed_insufficient_funds`, `missed`, `declined`, `failed_technical` | **EXACT MATCH** |
| `call_hold_status` | `000001` | 3 | `reserved`, `captured`, `released` | **EXACT MATCH** |
| `payment_order_status` | `000001` | 5 | `created`, `attempted`, `paid`, `failed`, `refunded` | **EXACT MATCH** |
| `journal_account_type` | `000001` | 12 | `user_coin_liability`, `virtual_coin_issuance_clearing`, `cash_gateway_clearing`, `unearned_coin_fiat_reserve`, `gst_output_tax_payable`, `gateway_processing_fee_expense`, `platform_earned_revenue`, `creator_payable_liability`, `creator_tds_tax_payable`, `creator_payout_escrow`, `user_refund_liability`, `promotional_coin_reserve` | **EXACT MATCH (IAF-08 ALIGNED)** |
| `financial_entry_reason` | `000001` | 7 | `coin_purchase`, `coin_purchase_refund`, `voice_call_minute_consumption`, `virtual_gift_dispatch`, `creator_payout_disbursement`, `creator_payout_reversal`, `admin_manual_correction` | **EXACT MATCH** |
| `payout_request_status` | `000001` | 7 | `requested`, `under_review`, `approved_pending`, `processing`, `paid`, `rejected`, `reversed` | **EXACT MATCH** |
| `report_target_type` | `000001` | 4 | `user_profile`, `voice_call`, `direct_message`, `creator_bio` | **EXACT MATCH** |
| `moderation_status` | `000001` | 4 | `pending`, `in_review`, `action_taken`, `dismissed` | **EXACT MATCH** |
| `moderation_action_type` | `000001` | 4 | `warning_issued`, `content_removed`, `temporary_suspension`, `permanent_ban` | **EXACT MATCH** |

---

## 3. Table Manifest & Structural Integrity (31 Tables)

| # | Table Name | Migration | Primary Key | Foreign Keys | Nullability & Invariants |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **01** | `profiles` | `000002` | `id UUID` | $\to$ `auth.users(id) ON DELETE CASCADE` | `display_name NOT NULL`, `gender NOT NULL`, `role NOT NULL` |
| **02** | `private_user_profiles` | `000002` | `user_id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | `phone_number UNIQUE NOT NULL`, PII isolated |
| **03** | `user_languages` | `000002` | `id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | `UNIQUE(user_id, language_code)` |
| **04** | `user_preferences` | `000002` | `user_id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | Sound, vibration, notification flags |
| **05** | `creator_profiles` | `000003` | `id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | `user_id UNIQUE`, `call_rate >= 10`, `rating BETWEEN 1 AND 5` |
| **06** | `creator_applications` | `000003` | `id UUID` | $\to$ `profiles(id)`, `reviewed_by` | `sample_voice_url NOT NULL` |
| **07** | `creator_kyc_details` | `000003` | `id UUID` | $\to$ `creator_profiles(id) CASCADE` | `creator_id UNIQUE`, PAN & UPI encrypted |
| **08** | `discovery_preferences` | `000004` | `user_id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | `18 <= age_min <= age_max <= 99` |
| **09** | `discovery_swipes` | `000004` | `id UUID` | $\to$ `profiles(id)` (swiper & swiped) | `UNIQUE(swiper_id, swiped_id)`, no self-swipe |
| **10** | `matches` | `000004` | `id UUID` | $\to$ `profiles(id)` (user_a & user_b) | `user_a_id < user_b_id`, `UNIQUE(user_a_id, user_b_id)` |
| **11** | `call_sessions` | `000005` | `id UUID` | $\to$ `profiles(id)` (caller & callee) | `livekit_room_name UNIQUE`, no self-calling |
| **12** | `call_coin_holds` | `000005` | `id UUID` | $\to$ `call_sessions(id) CASCADE` | `call_session_id UNIQUE`, `held_coins > 0` |
| **13** | `conversations` | `000005` | `id UUID` | $\to$ `profiles(id)` (a & b) | `participant_a_id < participant_b_id`, `UNIQUE(a,b)` |
| **14** | `direct_messages` | `000005` | `id UUID` | $\to$ `conversations(id)`, `profiles(id)` | Length $\le 2000$, no self-messaging |
| **15** | `user_coin_wallets` | `000006` | `id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | `user_id UNIQUE`, `available_coins >= 0`, `held >= 0` |
| **16** | `coin_packages` | `000006` | `id VARCHAR(50)`| None (Catalog entity) | `coin_quantity > 0`, `price_paise > 0` |
| **17** | `payment_orders` | `000006` | `id UUID` | $\to$ `profiles(id)`, `coin_packages(id)`| `gateway_order_id UNIQUE`, `amount_paise > 0` |
| **18** | `virtual_gift_catalog` | `000007` | `id VARCHAR(50)`| None (Catalog entity) | `coin_price > 0`, animation key |
| **19** | `virtual_gift_transfers`| `000007` | `id UUID` | $\to$ `profiles(id)`, `creator_profiles(id)` | `coin_cost > 0`, `creator_earnings_inr >= 0.00` |
| **20** | `creator_earnings_wallets`| `000008`| `id UUID` | $\to$ `creator_profiles(id) CASCADE` | `creator_id UNIQUE`, `available >= 0`, `pending >= 0` |
| **21** | `creator_payout_requests` | `000008`| `id UUID` | $\to$ `creator_profiles(id)` | `gross >= 500.00`, `net = gross - tds` |
| **22** | `financial_journal_entries`| `000009`| `id UUID` | $\to$ `profiles(id)`, `creator_profiles` | `BIGINT` cents, `UNIQUE(idempotency_key, account_type)` |
| **23** | `inbound_webhook_events` | `000009`| `id UUID` | None (Audit ledger) | `UNIQUE(provider, event_id)`, `payload JSONB` |
| **24** | `user_blocks` | `000010` | `id UUID` | $\to$ `profiles(id)` (blocker & blocked)| `UNIQUE(blocker_id, blocked_id)`, no self-block |
| **25** | `moderation_reports` | `000010` | `id UUID` | $\to$ `profiles(id)` (reporter & target) | Status enum, category, explanation |
| **26** | `moderation_actions` | `000010` | `id UUID` | $\to$ `moderation_reports`, `profiles` | Action type enum, duration |
| **27** | `moderation_appeals` | `000010` | `id UUID` | $\to$ `moderation_actions`, `profiles` | Contested action reference, status |
| **28** | `audit_logs` | `000010` | `id UUID` | $\to$ `profiles(id)` (actor) | Append-only, INET ip_address, JSONB metadata |
| **29** | `system_configurations`| `000011` | `config_key` | $\to$ `profiles(id)` (updated_by) | Structured JSONB config values |
| **30** | `notifications` | `000011` | `id UUID` | $\to$ `profiles(id) ON DELETE CASCADE` | Recipient user, deep link payload, read flag |
| **31** | `user_privacy_requests`| `000011` | `id UUID` | $\to$ `profiles(id)` (user_id) | DPDP export/erasure request lifecycle |

---

## 4. Trigger & Automation Audit

The central trigger function `update_updated_at_column()` is verified present and attached via `BEFORE UPDATE` triggers on all 9 mutable tables:
1. `trg_profiles_updated_at` $\to$ `profiles`
2. `trg_private_user_profiles_updated_at` $\to$ `private_user_profiles`
3. `trg_user_preferences_updated_at` $\to$ `user_preferences`
4. `trg_creator_profiles_updated_at` $\to$ `creator_profiles`
5. `trg_creator_kyc_details_updated_at` $\to$ `creator_kyc_details`
6. `trg_discovery_preferences_updated_at` $\to$ `discovery_preferences`
7. `trg_user_coin_wallets_updated_at` $\to$ `user_coin_wallets`
8. `trg_creator_earnings_wallets_updated_at` $\to$ `creator_earnings_wallets`
9. `trg_system_configurations_updated_at` $\to$ `system_configurations`

No balance mutation, coin transfer, or financial recalculation triggers exist. The financial integrity remains strictly backend-controlled.
