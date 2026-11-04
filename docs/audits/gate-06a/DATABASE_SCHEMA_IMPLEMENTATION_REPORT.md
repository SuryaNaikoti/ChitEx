# NECTAR — DATABASE SCHEMA IMPLEMENTATION REPORT
**Milestone:** Gate 06A — Supabase Database Foundation  
**Classification:** Core Engineering Technical Reference  
**Document Ref:** `docs/audits/gate-06a/DATABASE_SCHEMA_IMPLEMENTATION_REPORT.md`  

---

## 1. Relational Architecture & Entity Definitions

This document details the exact schema implemented across all 31 application tables in Nectar.

### 1.1 Core Identity & Profiles (Subsystem 01)
- **`profiles`**: Stores public social identity.
  - `id` (UUID PK): Cascading foreign key to `auth.users(id)`.
  - `display_name` (VARCHAR(50) NOT NULL): Publicly visible alias.
  - `avatar_url` (TEXT NULL): Public image URL.
  - `bio` (VARCHAR(300) NULL): Bio summary.
  - `gender` (gender_identity NOT NULL DEFAULT 'prefer_not_to_say').
  - `primary_language` (VARCHAR(10) NOT NULL DEFAULT 'te').
  - `role` (user_role NOT NULL DEFAULT 'user').
  - `is_suspended` (BOOLEAN NOT NULL DEFAULT FALSE).
  - `created_at`, `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())).
- **`private_user_profiles`**: Strictly isolated PII and compliance attributes.
  - `user_id` (UUID PK): Cascades to `profiles(id)`.
  - `phone_number` (VARCHAR(20) NOT NULL UNIQUE): E.164 verified phone.
  - `email` (VARCHAR(255) NULL): Optional verified email.
  - `birth_date` (DATE NULL): Date of birth.
  - `age_assurance_tier` (age_assurance_tier NOT NULL DEFAULT 'declared_only').
  - `age_declared_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())).
  - `age_verified_at` (TIMESTAMPTZ NULL).
  - `city`, `state` (VARCHAR(100) NULL): Coarse geographic location (no fine GPS).
  - `created_at`, `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())).
- **`user_languages`**: Language proficiencies.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_id` (UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE).
  - `language_code` (VARCHAR(10) NOT NULL).
  - `proficiency` (VARCHAR(20) NOT NULL DEFAULT 'fluent').
  - Unique constraint: `(user_id, language_code)`.
- **`user_preferences`**: Application interface preferences.
  - `user_id` (UUID PK REFERENCES profiles(id) ON DELETE CASCADE).
  - `theme` (VARCHAR(20) NOT NULL DEFAULT 'system').
  - `sound_enabled`, `vibration_enabled` (BOOLEAN NOT NULL DEFAULT TRUE).
  - Notification flags: `notification_match_alerts`, `notification_message_alerts`, `notification_promotional`.

### 1.2 Creator Platform & Verification (Subsystem 02)
- **`creator_profiles`**: Public creator monetization state.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_id` (UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE).
  - `verification_status` (creator_verification_status NOT NULL DEFAULT 'pending_review').
  - `is_available_for_calls` (BOOLEAN NOT NULL DEFAULT FALSE).
  - `call_rate_coins_per_minute` (INTEGER NOT NULL DEFAULT 60 CHECK >= 10).
  - `voice_intro_url` (TEXT NULL).
  - `total_calls_received`, `total_minutes_spoken` (INTEGER NOT NULL DEFAULT 0 CHECK >= 0).
  - `rating_average` (NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_average BETWEEN 1.00 AND 5.00)).
- **`creator_applications`**: Audition submissions.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_id` (UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE).
  - `sample_voice_url` (TEXT NOT NULL).
  - `application_notes` (TEXT NULL).
  - `reviewed_by` (UUID NULL REFERENCES profiles(id)).
  - `review_notes` (TEXT NULL), `reviewed_at` (TIMESTAMPTZ NULL).
- **`creator_kyc_details`**: Encrypted tax and banking details.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `creator_id` (UUID NOT NULL UNIQUE REFERENCES creator_profiles(id) ON DELETE CASCADE).
  - `legal_full_name` (VARCHAR(150) NOT NULL).
  - `pan_number_encrypted` (TEXT NOT NULL), `pan_masked` (VARCHAR(10) NOT NULL).
  - `payout_channel` (VARCHAR(20) NOT NULL CHECK IN ('upi', 'bank_transfer')).
  - `upi_id_encrypted` (TEXT NULL), `upi_id_masked` (VARCHAR(50) NULL).
  - `bank_account_number_encrypted` (TEXT NULL), `bank_account_masked` (VARCHAR(20) NULL).
  - `bank_ifsc_code` (VARCHAR(11) NULL).
  - `is_verified` (BOOLEAN NOT NULL DEFAULT FALSE), `verified_at` (TIMESTAMPTZ NULL).

### 1.3 Discovery, Matching & Social Graph (Subsystem 03)
- **`discovery_preferences`**: Matching filter criteria.
  - `user_id` (UUID PK REFERENCES profiles(id) ON DELETE CASCADE).
  - `preferred_languages` (TEXT[] NOT NULL DEFAULT '{"te","hi","en"}').
  - `preferred_genders` (gender_identity[] NOT NULL DEFAULT '{"woman","man","non_binary"}').
  - `preferred_age_min` (INTEGER NOT NULL DEFAULT 18 CHECK >= 18).
  - `preferred_age_max` (INTEGER NOT NULL DEFAULT 99 CHECK <= 99).
  - Constraint: `preferred_age_min <= preferred_age_max`.
- **`discovery_swipes`**: Unidirectional actions.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `swiper_id`, `swiped_id` (UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE).
  - `direction` (VARCHAR(10) NOT NULL CHECK IN ('like', 'pass')).
  - Unique constraint: `(swiper_id, swiped_id)`. Self-swipe prevented.
- **`matches`**: Mutual connections.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_a_id`, `user_b_id` (UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE).
  - Canonical ordering constraint: `user_a_id < user_b_id`.
  - Unique pairing constraint: `(user_a_id, user_b_id)`.
  - `user_matches` view provides backward compatibility.

### 1.4 Voice Calling & Holds (Subsystem 04)
- **`call_sessions`**: Authoritative call ledger.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `caller_id`, `callee_id` (UUID NOT NULL REFERENCES profiles(id)). Self-calling prevented.
  - `livekit_room_name` (VARCHAR(100) NOT NULL UNIQUE).
  - `status` (call_session_status NOT NULL DEFAULT 'initiated').
  - `rate_coins_per_minute` (INTEGER NOT NULL CHECK > 0).
  - `duration_seconds`, `minutes_billed`, `total_coins_debited` (INTEGER NOT NULL DEFAULT 0).
  - `creator_earnings_inr` (NUMERIC(10,2) NOT NULL DEFAULT 0.00).
- **`call_coin_holds`**: Escrow reservations.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `call_session_id` (UUID NOT NULL UNIQUE REFERENCES call_sessions(id) ON DELETE CASCADE).
  - `user_id` (UUID NOT NULL REFERENCES profiles(id)).
  - `held_coins` (INTEGER NOT NULL CHECK > 0).
  - `status` (call_hold_status NOT NULL DEFAULT 'reserved').
  - `expires_at` (TIMESTAMPTZ NOT NULL), `settled_at` (TIMESTAMPTZ NULL).

### 1.5 Direct Messaging & Conversations (Subsystem 05)
- **`conversations`**: Chat thread header.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `participant_a_id`, `participant_b_id` (UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE).
  - Canonical ordering constraint: `participant_a_id < participant_b_id`.
  - Unique pairing constraint: `(participant_a_id, participant_b_id)`.
- **`direct_messages`**: Chat body.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `conversation_id` (UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE).
  - `sender_id`, `recipient_id` (UUID NOT NULL REFERENCES profiles(id)).
  - `content` (TEXT NOT NULL CHECK length <= 2000).
  - `is_read` (BOOLEAN NOT NULL DEFAULT FALSE), `read_at` (TIMESTAMPTZ NULL).

### 1.6 Financial Ledger & Wallet Subsystem (Subsystem 06)
- **`user_coin_wallets`**: User balance cache.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_id` (UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE).
  - `available_coins` (INTEGER NOT NULL DEFAULT 0 CHECK >= 0).
  - `held_coins` (INTEGER NOT NULL DEFAULT 0 CHECK >= 0).
  - `lifetime_coins_purchased`, `lifetime_coins_spent` (INTEGER NOT NULL DEFAULT 0).
- **`coin_packages`**: Retail package catalog.
  - `id` (VARCHAR(50) PK): e.g. `tier_starter_1000`.
  - `coin_quantity` (INTEGER NOT NULL CHECK > 0).
  - `price_paise` (INTEGER NOT NULL CHECK > 0).
  - `is_active` (BOOLEAN NOT NULL DEFAULT TRUE), `badge_text`, `sort_order`.
- **`payment_orders`**: Razorpay gateway orders.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `user_id` (UUID NOT NULL REFERENCES profiles(id)).
  - `package_id` (VARCHAR(50) NOT NULL REFERENCES coin_packages(id)).
  - `coins_purchased`, `amount_paise` (INTEGER NOT NULL CHECK > 0).
  - `gateway_provider` (VARCHAR(20) NOT NULL DEFAULT 'razorpay').
  - `gateway_order_id` (VARCHAR(100) NOT NULL UNIQUE).
  - `gateway_payment_id` (VARCHAR(100) NULL UNIQUE), `gateway_signature` (TEXT NULL).
  - `status` (payment_order_status NOT NULL DEFAULT 'created').
- **`virtual_gift_catalog`**: In-app gifting items.
  - `id` (VARCHAR(50) PK): `rose`, `coffee`, `crown`, `sports_car`.
  - `name`, `coin_price` (INTEGER CHECK > 0), `animation_key`, `is_active`.
- **`virtual_gift_transfers`**: Gifting ledger.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `sender_id` (UUID NOT NULL REFERENCES profiles(id)).
  - `recipient_creator_id` (UUID NOT NULL REFERENCES creator_profiles(id)).
  - `gift_id` (VARCHAR(50) NOT NULL REFERENCES virtual_gift_catalog(id)).
  - `call_session_id` (UUID NULL REFERENCES call_sessions(id)).
  - `coin_cost` (INTEGER NOT NULL CHECK > 0), `creator_earnings_inr` (NUMERIC(10,2) NOT NULL).
- **`creator_earnings_wallets`**: Creator accrued INR cache.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `creator_id` (UUID NOT NULL UNIQUE REFERENCES creator_profiles(id) ON DELETE CASCADE).
  - `available_balance_inr`, `pending_payout_inr` (NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK >= 0.00).
  - `lifetime_earnings_inr`, `lifetime_paid_out_inr` (NUMERIC(12,2) NOT NULL DEFAULT 0.00).
- **`creator_payout_requests`**: Creator withdrawals.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `creator_id` (UUID NOT NULL REFERENCES creator_profiles(id)).
  - `gross_amount_inr` (NUMERIC(10,2) NOT NULL CHECK >= 500.00).
  - `tds_withheld_inr` (NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK >= 0.00).
  - `net_payable_inr` (NUMERIC(10,2) NOT NULL CHECK > 0.00).
  - `payout_channel` (VARCHAR(20) CHECK IN ('upi', 'bank_transfer')).
  - Mathematical integrity constraint: `net_payable_inr = (gross_amount_inr - tds_withheld_inr)`.
- **`financial_journal_entries`**: Immutable general ledger.
  - `id` (UUID PK DEFAULT gen_random_uuid()).
  - `transaction_group_id` (UUID NOT NULL).
  - `account_type` (journal_account_type NOT NULL).
  - `user_id` (UUID NULL REFERENCES profiles(id)), `creator_id` (UUID NULL REFERENCES creator_profiles(id)).
  - `debit_amount_cents`, `credit_amount_cents` (BIGINT NOT NULL CHECK >= 0).
  - `currency` (VARCHAR(10) NOT NULL CHECK IN ('COIN', 'INR_SUBUNIT')).
  - `reason` (financial_entry_reason NOT NULL).
  - `idempotency_key` (VARCHAR(128) NOT NULL).
  - Unique constraint: `(idempotency_key, account_type)`.

### 1.7 Safety, Moderation & Audit Logging (Subsystem 07)
- **`user_blocks`**: Mutual blocking records.
  - Unique pairing constraint: `(blocker_id, blocked_id)`. Self-blocking forbidden.
- **`moderation_reports`**: User abuse submissions.
- **`moderation_actions`**: Account penalties.
- **`moderation_appeals`**: Action review requests.
- **`audit_logs`**: Append-only system audit events.

### 1.8 Platform Infrastructure & Configuration (Subsystem 08)
- **`system_configurations`**: Dynamic parameters.
- **`inbound_webhook_events`**: Webhook deduplication log (`provider`, `event_id` UNIQUE).
- **`notifications`**: User alerts.
- **`user_privacy_requests`**: DPDP compliance requests.
