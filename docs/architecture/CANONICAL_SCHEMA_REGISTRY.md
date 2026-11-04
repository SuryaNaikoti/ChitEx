# NECTAR — CANONICAL DATABASE SCHEMA REGISTRY
**Document Reference:** `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Status:** Canonical Source of Truth (Authoritative)  
**Author:** Principal Software Architect, Database Architect & Application Security Engineer  

---

## 1. Schema Design Principles & Conventions

1. **Single Source of Truth:** This document defines the canonical naming, types, constraints, relationships, ownership, and indices for every persistent database entity in Nectar. All other architecture documents MUST align with this registry.
2. **Identifiers:** All entity IDs use PostgreSQL `UUIDv4` generated via `gen_random_uuid()`. Auto-incrementing serial IDs are strictly forbidden for public or business entities to prevent enumeration attacks.
3. **Temporal Invariants:** Every table includes `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Mutable tables include `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, maintained via a centralized trigger `set_updated_at()`.
4. **Data Separation:** 
   - Public social profile data is stored in `profiles`.
   - Private identity and personal data are strictly isolated in `private_user_profiles`.
   - Creator financial KYC details (PAN, Bank, UPI) are isolated in `creator_kyc_details`.
   - Financial balances and transaction journals are isolated in `user_coin_wallets` and `financial_journal_entries`.
5. **Immutability of Ledgers & Audits:** Journal entries, audit logs, webhook logs, and privacy consents are append-only. `UPDATE` and `DELETE` operations are revoked at the database role level.

---

## 2. Canonical Enumerations (PostgreSQL Custom Types)

```sql
-- User and Access Control Roles
CREATE TYPE user_role AS ENUM (
  'user',
  'creator',
  'moderator',
  'admin'
);

-- Creator Approval & Lifecycle Status
CREATE TYPE creator_verification_status AS ENUM (
  'not_applied',
  'pending_review',
  'approved',
  'rejected',
  'suspended'
);

-- Age Assurance & Verification Status (India DPDP 2023 Tiering)
CREATE TYPE age_assurance_tier AS ENUM (
  'declared_only',      -- User self-declared 18+ (Basic access)
  'verified_id',        -- Document-backed age assurance
  'verified_payment',   -- Verified via financial instrument KYC
  'rejected_minor'      -- Verified under 18; account quarantined
);

-- Gender Identifiers
CREATE TYPE gender_identity AS ENUM (
  'woman',
  'man',
  'non_binary',
  'prefer_not_to_say'
);

-- Call Session Lifecycle States
CREATE TYPE call_session_status AS ENUM (
  'initiated',          -- Caller created session, funds reserved
  'ringing',            -- Callee signaled, awaiting answer
  'connecting',         -- Callee accepted, LiveKit room establishing
  'active',             -- Both connected to media, billing actively running
  'completed_normal',   -- Gracefully ended by participant
  'completed_insufficient_funds', -- Ended by server billing cutoff
  'missed',             -- Callee did not answer within timeout (45s)
  'declined',           -- Callee explicitly rejected call
  'failed_technical'    -- Media/WebRTC negotiation failure
);

-- Call Coin Hold States
CREATE TYPE call_hold_status AS ENUM (
  'reserved',           -- Pre-call authorization hold active
  'captured',           -- Billed into ledger transactions
  'released'            -- Excess hold returned to user wallet
);

-- Payment Order Lifecycle (Razorpay)
CREATE TYPE payment_order_status AS ENUM (
  'created',
  'attempted',
  'paid',
  'failed',
  'refunded'
);

-- Financial Journal Account Types
CREATE TYPE journal_account_type AS ENUM (
  'user_coin_liability',            -- Coins owed to users (Virtual token pool)
  'virtual_coin_issuance_clearing', -- Token issuance/minting clearing account (COIN)
  'cash_gateway_clearing',          -- Gross funds collected via Razorpay (Paise)
  'unearned_coin_fiat_reserve',     -- Fiat deferred revenue held for unconsumed coins (Paise)
  'gst_output_tax_payable',         -- Statutory Goods & Services Tax (18% SAC 998439) (Paise)
  'gateway_processing_fee_expense', -- Razorpay transaction fee 2% + GST (Paise)
  'platform_earned_revenue',        -- Platform revenue upon coin consumption (Paise)
  'creator_payable_liability',      -- Net INR owed to creators (Paise)
  'creator_tds_tax_payable',        -- Tax Deducted at Source (TDS 194J/194M) (Paise)
  'creator_payout_escrow',          -- Funds reserved for in-flight payout (Paise)
  'user_refund_liability',          -- Reserved funds for user payment refund (Paise)
  'promotional_coin_reserve'        -- Platform-subsidized free coins
);

-- Financial Transaction Reason Codes
CREATE TYPE financial_entry_reason AS ENUM (
  'coin_purchase',
  'coin_purchase_refund',
  'voice_call_minute_consumption',
  'virtual_gift_dispatch',
  'creator_payout_disbursement',
  'creator_payout_reversal',
  'admin_manual_correction'
);

-- Creator Payout Request Lifecycle
CREATE TYPE payout_request_status AS ENUM (
  'requested',          -- Creator submitted request, balance reserved
  'under_review',       -- Admin/Compliance reviewing KYC & risk
  'approved_pending',   -- Approved, queued for bank/UPI disbursement
  'processing',         -- Dispatched to banking gateway
  'paid',               -- Gateway confirmed successful settlement
  'rejected',           -- Admin rejected (funds returned to creator balance)
  'reversed'            -- Bank transfer failed/returned
);

-- Moderation Report Targets & Status
CREATE TYPE report_target_type AS ENUM (
  'user_profile',
  'voice_call',
  'direct_message',
  'creator_bio'
);

CREATE TYPE moderation_status AS ENUM (
  'pending',
  'in_review',
  'action_taken',
  'dismissed'
);

CREATE TYPE moderation_action_type AS ENUM (
  'warning_issued',
  'content_removed',
  'temporary_suspension',
  'permanent_ban'
);
```

---

## 3. Canonical Subsystem Tables

### 3.1 Subsystem 01: Core Users & Profiles

#### `profiles` (Public Social Identity)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, REFERENCES `auth.users(id)` ON DELETE CASCADE | Primary identity matching Supabase Auth UID |
| `display_name` | VARCHAR(50) | NOT NULL | Public display name |
| `avatar_url` | TEXT | NULL | Public profile avatar image URL |
| `bio` | VARCHAR(300) | NULL | Short personal description |
| `gender` | gender_identity | NOT NULL DEFAULT 'prefer_not_to_say' | Declared gender for discovery filtering |
| `primary_language` | VARCHAR(10) | NOT NULL DEFAULT 'te' | ISO code ('te', 'hi', 'en') |
| `role` | user_role | NOT NULL DEFAULT 'user' | System role (Protected; read-only to user) |
| `is_suspended` | BOOLEAN | NOT NULL DEFAULT FALSE | Platform suspension flag |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record modification timestamp |

#### `private_user_profiles` (Protected Private Identity)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | UUID | PK, REFERENCES `profiles(id)` ON DELETE CASCADE | One-to-one link with profile |
| `phone_number` | VARCHAR(20) | NOT NULL UNIQUE | E.164 phone (+91XXXXXXXXXX) |
| `email` | VARCHAR(255) | NULL | Optional verified email |
| `birth_date` | DATE | NULL | Declared date of birth |
| `age_assurance_tier` | age_assurance_tier | NOT NULL DEFAULT 'declared_only' | Current verified tier |
| `age_declared_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp of initial 18+ declaration |
| `age_verified_at` | TIMESTAMPTZ | NULL | Timestamp of document/payment verification |
| `city` | VARCHAR(100) | NULL | Coarse city location (No GPS coordinates) |
| `state` | VARCHAR(100) | NULL | Coarse state location |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record modification timestamp |

#### `user_languages` (Spoken Languages)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Unique link ID |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | User owner |
| `language_code` | VARCHAR(10) | NOT NULL | Language code ('te', 'hi', 'en') |
| `proficiency` | VARCHAR(20) | NOT NULL DEFAULT 'fluent' | Proficiency level |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| *Constraint:* | `UNIQUE(user_id, language_code)` | | Prevents duplicate language entries |

---

### 3.2 Subsystem 02: Creator Platform & Verification

#### `creator_profiles` (Creator Public Monetization State)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Creator entity ID |
| `user_id` | UUID | NOT NULL UNIQUE REFERENCES `profiles(id)` ON DELETE CASCADE | Associated user account |
| `verification_status` | creator_verification_status | NOT NULL DEFAULT 'pending_review' | Approval status (Read-only to creator) |
| `is_available_for_calls` | BOOLEAN | NOT NULL DEFAULT FALSE | Real-time call toggle |
| `call_rate_coins_per_minute` | INTEGER | NOT NULL DEFAULT 60 | Active call rate in coins/min |
| `voice_intro_url` | TEXT | NULL | Short preview audio URL |
| `total_calls_received` | INTEGER | NOT NULL DEFAULT 0 | Cumulative completed calls counter |
| `total_minutes_spoken` | INTEGER | NOT NULL DEFAULT 0 | Cumulative spoken minutes counter |
| `rating_average` | NUMERIC(3,2) | NOT NULL DEFAULT 5.00 | Aggregate rating (1.00 - 5.00) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `creator_applications` (Onboarding & Verification Submissions)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Application submission ID |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Applicant |
| `sample_voice_url` | TEXT | NOT NULL | Audio audition submission URL |
| `application_notes` | TEXT | NULL | Creator bio/experience statement |
| `reviewed_by` | UUID | NULL REFERENCES `profiles(id)` | Admin/Moderator reviewer ID |
| `review_notes` | TEXT | NULL | Reason for approval or rejection |
| `reviewed_at` | TIMESTAMPTZ | NULL | Timestamp of review decision |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Submission timestamp |

#### `creator_kyc_details` (Encrypted Financial & Tax Identification)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | KYC record ID |
| `creator_id` | UUID | NOT NULL UNIQUE REFERENCES `creator_profiles(id)` ON DELETE CASCADE | Creator reference |
| `legal_full_name` | VARCHAR(150) | NOT NULL | Full name as per PAN / Bank records |
| `pan_number_encrypted` | TEXT | NOT NULL | AES-256 encrypted Permanent Account Number |
| `pan_masked` | VARCHAR(10) | NOT NULL | Masked display format (e.g. `ABCDE****F`) |
| `payout_channel` | VARCHAR(20) | NOT NULL | 'upi' OR 'bank_transfer' |
| `upi_id_encrypted` | TEXT | NULL | AES-256 encrypted UPI Virtual Payment Address |
| `upi_id_masked` | VARCHAR(50) | NULL | Masked UPI display (e.g. `user***@okaxis`) |
| `bank_account_number_encrypted` | TEXT | NULL | AES-256 encrypted Bank Account Number |
| `bank_account_masked` | VARCHAR(20) | NULL | Masked account display (`••••••••1234`) |
| `bank_ifsc_code` | VARCHAR(11) | NULL | Bank IFSC Code (Public routing code) |
| `is_verified` | BOOLEAN | NOT NULL DEFAULT FALSE | True if penny-drop / KYC confirmed |
| `verified_at` | TIMESTAMPTZ | NULL | Verification confirmation timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

---

### 3.3 Subsystem 03: Discovery, Matching & Social Graph

#### `discovery_preferences` (Matching Filter Settings)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | UUID | PK REFERENCES `profiles(id)` ON DELETE CASCADE | User preference owner |
| `preferred_languages` | TEXT[] | NOT NULL DEFAULT '{"te","hi","en"}' | Target language filters |
| `preferred_genders` | gender_identity[] | NOT NULL DEFAULT '{"woman","man","non_binary"}' | Gender discovery filters |
| `preferred_age_min` | INTEGER | NOT NULL DEFAULT 18 CHECK (preferred_age_min >= 18) | Minimum age filter |
| `preferred_age_max` | INTEGER | NOT NULL DEFAULT 99 CHECK (preferred_age_max <= 99) | Maximum age filter |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `discovery_swipes` (User Swipes & Impressions)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Swipe event ID |
| `swiper_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | User making the action |
| `swiped_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Profile acted upon |
| `direction` | VARCHAR(10) | NOT NULL CHECK (direction IN ('like', 'pass')) | Swipe decision |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| *Constraint:* | `UNIQUE(swiper_id, swiped_id)` | | Only one swipe interaction allowed per pair |

#### `matches` (Mutual Social Connections)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Match entity ID |
| `user_a_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Participant A (Lexicographically smaller UUID) |
| `user_b_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Participant B (Lexicographically larger UUID) |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Connection active status |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp match established |
| *Constraint:* | `CHECK (user_a_id < user_b_id)` | | Prevents permutation duplicates (A-B vs B-A) |
| *Constraint:* | `UNIQUE(user_a_id, user_b_id)` | | Guarantee unique mutual pairing |

---

### 3.4 Subsystem 04: Server-Authoritative Voice Calling & Holds

#### `call_sessions` (Call Metadata & Lifecycle Ledger)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Call session ID |
| `caller_id` | UUID | NOT NULL REFERENCES `profiles(id)` | User initiating the call |
| `callee_id` | UUID | NOT NULL REFERENCES `profiles(id)` | User/Creator receiving the call |
| `livekit_room_name` | VARCHAR(100) | NOT NULL UNIQUE | LiveKit SFU room identifier (`room_call_<id>`) |
| `status` | call_session_status | NOT NULL DEFAULT 'initiated' | Active lifecycle state |
| `rate_coins_per_minute` | INTEGER | NOT NULL | Locked rate at moment of call start |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Initial reservation timestamp |
| `ringing_started_at` | TIMESTAMPTZ | NULL | Timestamp callee received ring signal |
| `connected_at` | TIMESTAMPTZ | NULL | Timestamp both joined media (Billing starts) |
| `ended_at` | TIMESTAMPTZ | NULL | Media termination timestamp |
| `duration_seconds` | INTEGER | NOT NULL DEFAULT 0 | Total connected media duration |
| `minutes_billed` | INTEGER | NOT NULL DEFAULT 0 | Total atomic 60-second intervals billed |
| `last_billed_at` | TIMESTAMPTZ | NULL | Timestamp of most recent billing tick |
| `total_coins_debited` | INTEGER | NOT NULL DEFAULT 0 | Total coins deducted from caller |
| `creator_earnings_inr` | NUMERIC(10,2) | NOT NULL DEFAULT 0.00 | Net creator INR earnings |
| `end_reason` | VARCHAR(50) | NULL | Detailed technical or business disconnect code |
| *Constraint:* | `CHECK (caller_id != callee_id)` | | Cannot call oneself |

#### `call_coin_holds` (Pre-Call Fund Reservations)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Hold record ID |
| `call_session_id` | UUID | NOT NULL UNIQUE REFERENCES `call_sessions(id)` ON DELETE CASCADE | Call session |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Caller paying hold |
| `held_coins` | INTEGER | NOT NULL CHECK (held_coins > 0) | Quantity of coins reserved in escrow |
| `status` | call_hold_status | NOT NULL DEFAULT 'reserved' | Hold status |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Automatic release time if call never connects |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Hold creation timestamp |
| `settled_at` | TIMESTAMPTZ | NULL | Settlement / release timestamp |

---

### 3.5 Subsystem 05: Direct Messaging & Conversations

#### `conversations` (Chat Channels)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Conversation entity ID |
| `participant_a_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Participant A (Lexicographically smaller UUID) |
| `participant_b_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Participant B (Lexicographically larger UUID) |
| `last_message_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | For inbox ordering |
| `last_message_preview`| VARCHAR(100) | NULL | Preview snippet |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| *Constraint:* | `CHECK (participant_a_id < participant_b_id)` | | Enforces canonical order |
| *Constraint:* | `UNIQUE(participant_a_id, participant_b_id)` | | Exactly one conversation per pair |

#### `direct_messages` (Chat Messages)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Message ID |
| `conversation_id` | UUID | NOT NULL REFERENCES `conversations(id)` ON DELETE CASCADE | Channel container |
| `sender_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Message author |
| `recipient_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Intended recipient |
| `content` | TEXT | NOT NULL CHECK (length(content) <= 2000) | Message body |
| `is_read` | BOOLEAN | NOT NULL DEFAULT FALSE | Delivery/read receipt flag |
| `read_at` | TIMESTAMPTZ | NULL | Timestamp of read receipt |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Message timestamp |

---

### 3.6 Subsystem 06: Financial Ledger & Wallet Architecture

#### `user_coin_wallets` (User Virtual Coin Balance Cache)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Wallet ID |
| `user_id` | UUID | NOT NULL UNIQUE REFERENCES `profiles(id)` ON DELETE CASCADE | Wallet owner |
| `available_coins` | INTEGER | NOT NULL DEFAULT 0 CHECK (available_coins >= 0) | Unencumbered spendable coins |
| `held_coins` | INTEGER | NOT NULL DEFAULT 0 CHECK (held_coins >= 0) | Coins currently held for active calls |
| `lifetime_coins_purchased` | INTEGER | NOT NULL DEFAULT 0 | Cumulative purchased counter |
| `lifetime_coins_spent` | INTEGER | NOT NULL DEFAULT 0 | Cumulative spent counter |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `creator_earnings_wallets` (Creator Accrued INR Balance Cache)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Earnings wallet ID |
| `creator_id` | UUID | NOT NULL UNIQUE REFERENCES `creator_profiles(id)` ON DELETE CASCADE | Creator owner |
| `available_balance_inr`| NUMERIC(12,2) | NOT NULL DEFAULT 0.00 CHECK (available_balance_inr >= 0.00) | Withdrawable INR balance |
| `pending_payout_inr` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00 CHECK (pending_payout_inr >= 0.00) | INR locked in payout transit |
| `lifetime_earnings_inr`| NUMERIC(12,2) | NOT NULL DEFAULT 0.00 | Total earnings accrued since inception |
| `lifetime_paid_out_inr`| NUMERIC(12,2) | NOT NULL DEFAULT 0.00 | Total earnings settled to bank/UPI |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `financial_journal_entries` (Balanced Double-Entry General Ledger)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Journal entry ID |
| `transaction_group_id`| UUID | NOT NULL | Groups balanced debit & credit rows together |
| `account_type` | journal_account_type | NOT NULL | Target double-entry ledger account |
| `user_id` | UUID | NULL REFERENCES `profiles(id)` | Associated user (if applicable) |
| `creator_id` | UUID | NULL REFERENCES `creator_profiles(id)` | Associated creator (if applicable) |
| `debit_amount_cents` | BIGINT | NOT NULL DEFAULT 0 CHECK (debit_amount_cents >= 0) | Debit in smallest currency/token unit |
| `credit_amount_cents`| BIGINT | NOT NULL DEFAULT 0 CHECK (credit_amount_cents >= 0) | Credit in smallest currency/token unit |
| `currency` | VARCHAR(10) | NOT NULL | 'COIN' OR 'INR_SUBUNIT' (Paise) |
| `reason` | financial_entry_reason | NOT NULL | Business reason code |
| `idempotency_key` | VARCHAR(128) | NOT NULL | Enforces exactly-once posting |
| `reference_entity_type`| VARCHAR(50) | NOT NULL | 'call_sessions', 'purchase_orders', etc. |
| `reference_entity_id` | UUID | NOT NULL | Foreign reference ID |
| `description` | TEXT | NOT NULL | Human-readable audit narrative |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Immutable posting timestamp |
| *Constraint:* | `UNIQUE(idempotency_key, account_type)` | | Prevents duplicate journal postings |

#### `coin_packages` (Catalog of In-App Purchases)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | PK | Package key (`tier_starter_100`, etc.) |
| `coin_quantity` | INTEGER | NOT NULL CHECK (coin_quantity > 0) | Number of coins credited |
| `price_paise` | INTEGER | NOT NULL CHECK (price_paise > 0) | Retail price in INR Paise (₹1 = 100 paise) |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Availability flag |
| `badge_text` | VARCHAR(30) | NULL | Display promo tag (e.g. 'Most Popular') |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | Display ordering |

#### `payment_orders` (Razorpay Payment Lifecycle)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Internal payment order ID |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Buyer profile |
| `package_id` | VARCHAR(50) | NOT NULL REFERENCES `coin_packages(id)` | Purchased item |
| `coins_purchased` | INTEGER | NOT NULL | Coins promised |
| `amount_paise` | INTEGER | NOT NULL | Transaction value in Paise |
| `currency` | VARCHAR(5) | NOT NULL DEFAULT 'INR' | ISO currency code |
| `gateway_provider` | VARCHAR(20) | NOT NULL DEFAULT 'razorpay' | Payment gateway provider |
| `gateway_order_id` | VARCHAR(100) | NOT NULL UNIQUE | Razorpay Order ID (`order_xxx`) |
| `gateway_payment_id`| VARCHAR(100) | NULL UNIQUE | Razorpay Payment ID (`pay_xxx`) |
| `gateway_signature` | TEXT | NULL | Verification HMAC signature |
| `status` | payment_order_status | NOT NULL DEFAULT 'created' | Order lifecycle state |
| `error_code` | VARCHAR(50) | NULL | Gateway failure code |
| `error_description` | TEXT | NULL | Gateway error message |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Order creation timestamp |
| `completed_at` | TIMESTAMPTZ | NULL | Settlement / confirmation timestamp |

#### `virtual_gift_catalog` (Virtual Gifting Options)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | PK | Gift identifier (`rose`, `crown`, etc.) |
| `name` | VARCHAR(50) | NOT NULL | Display name |
| `coin_price` | INTEGER | NOT NULL CHECK (coin_price > 0) | Coin cost to sender |
| `animation_key` | VARCHAR(50) | NOT NULL | Lottie / Rive animation asset token |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Active catalogue state |

#### `virtual_gift_transfers` (Gift Dispatch Log)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Transfer ID |
| `sender_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Gifting user |
| `recipient_creator_id`| UUID | NOT NULL REFERENCES `creator_profiles(id)` | Receiving creator |
| `gift_id` | VARCHAR(50) | NOT NULL REFERENCES `virtual_gift_catalog(id)` | Catalog reference |
| `call_session_id` | UUID | NULL REFERENCES `call_sessions(id)` | Optional live call context |
| `coin_cost` | INTEGER | NOT NULL | Coins debited from sender |
| `creator_earnings_inr`| NUMERIC(10,2) | NOT NULL | Accrued creator INR earnings |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Dispatch timestamp |

#### `creator_payout_requests` (Payout Disbursements)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Payout request ID |
| `creator_id` | UUID | NOT NULL REFERENCES `creator_profiles(id)` | Withdrawing creator |
| `gross_amount_inr` | NUMERIC(10,2) | NOT NULL CHECK (gross_amount_inr >= 500.00) | Withdrawn amount before deductions |
| `tds_withheld_inr` | NUMERIC(10,2) | NOT NULL DEFAULT 0.00 | Tax withholding deduction |
| `net_payable_inr` | NUMERIC(10,2) | NOT NULL | Final disbursement amount |
| `payout_channel` | VARCHAR(20) | NOT NULL | 'upi' OR 'bank_transfer' |
| `payout_destination_masked` | VARCHAR(50) | NOT NULL | Masked destination snapshot |
| `status` | payout_request_status | NOT NULL DEFAULT 'requested' | Settlement state |
| `rejection_reason` | TEXT | NULL | If rejected by admin/compliance |
| `banking_reference_id`| VARCHAR(100) | NULL | Bank UTR / Razorpay Payout ID |
| `requested_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Submission timestamp |
| `processed_at` | TIMESTAMPTZ | NULL | Settlement / rejection timestamp |

---

### 3.7 Subsystem 07: Safety, Moderation & Audit Logging

#### `user_blocks` (Bidirectional Social Blocks)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Block record ID |
| `blocker_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | User initiating block |
| `blocked_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | User blocked |
| `reason` | VARCHAR(100) | NULL | Optional user reason code |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |
| *Constraint:* | `CHECK (blocker_id != blocked_id)` | | Cannot block oneself |
| *Constraint:* | `UNIQUE(blocker_id, blocked_id)` | | Only one active block entry per pair |

#### `moderation_reports` (Abuse & Safety Reports)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Report entity ID |
| `reporter_id` | UUID | NOT NULL REFERENCES `profiles(id)` | User filing complaint |
| `reported_user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Accused user |
| `target_type` | report_target_type | NOT NULL | Profile, Call, Message |
| `target_id` | UUID | NULL | Context ID (e.g. `call_session_id`) |
| `category` | VARCHAR(50) | NOT NULL | 'harassment', 'minor_safety', 'nudity', etc. |
| `explanation` | TEXT | NULL | User-provided narrative |
| `status` | moderation_status | NOT NULL DEFAULT 'pending' | Workflow state |
| `reviewed_by` | UUID | NULL REFERENCES `profiles(id)` | Moderator ID |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Submission timestamp |
| `resolved_at` | TIMESTAMPTZ | NULL | Resolution timestamp |

#### `moderation_actions` (Interventions Taken on Accounts)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Action record ID |
| `report_id` | UUID | NULL REFERENCES `moderation_reports(id)` | Originating report |
| `moderator_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Acting moderator |
| `target_user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Penalized user |
| `action_type` | moderation_action_type | NOT NULL | Action category |
| `duration_hours` | INTEGER | NULL | If temporary suspension |
| `action_reason` | TEXT | NOT NULL | Internal justification |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `moderation_appeals` (User Suspension Appeals)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Appeal ID |
| `action_id` | UUID | NOT NULL REFERENCES `moderation_actions(id)` | Contested action |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Appealing user |
| `appeal_text` | TEXT | NOT NULL | Justification for reversal |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'pending' | 'pending', 'approved', 'rejected' |
| `reviewed_by` | UUID | NULL REFERENCES `profiles(id)` | Moderator reviewer |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `audit_logs` (Immutable Platform Governance Records)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Log event ID |
| `actor_id` | UUID | NULL REFERENCES `profiles(id)` | User or admin triggering action |
| `action` | VARCHAR(100) | NOT NULL | Event name (`age_declaration`, `payout_approved`, etc.) |
| `resource_type` | VARCHAR(50) | NOT NULL | Entity type |
| `resource_id` | UUID | NULL | Entity UUID |
| `ip_address` | INET | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Client user-agent string |
| `metadata` | JSONB | NOT NULL DEFAULT '{}'::jsonb | Detailed structured event payload |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Immutable timestamp |

---

### 3.8 Subsystem 08: Platform Infrastructure & System Configuration

#### `system_configurations` (Configurable Commercial & Operational Parameters)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `config_key` | VARCHAR(100) | PK | Parameter key identifier |
| `config_value` | JSONB | NOT NULL | Structured value |
| `description` | TEXT | NOT NULL | Purpose and impact documentation |
| `updated_by` | UUID | NULL REFERENCES `profiles(id)` | Admin user modifying parameter |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

*Canonical Initial System Parameters:*
- `commercial.creator_share_percentage` $\rightarrow$ `60`
- `commercial.platform_share_percentage` $\rightarrow$ `40`
- `commercial.minimum_payout_amount_inr` $\rightarrow$ `500.00`
- `commercial.default_call_rate_coins_per_minute` $\rightarrow$ `60`
- `commercial.net_realization_rate_paise` $\rightarrow$ `8.390` (Net consideration per coin ex-18% GST on Starter package)
- `compliance.minimum_user_age` $\rightarrow$ `18`
- `compliance.gst_tax_rate_percentage` $\rightarrow$ `18`
- `compliance.tds_rate_percentage` $\rightarrow$ `1.0`

#### `inbound_webhook_events` (Webhook Deduplication & Audit Ledger)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Inbound record ID |
| `provider` | VARCHAR(20) | NOT NULL | 'razorpay' OR 'livekit' |
| `event_id` | VARCHAR(128) | NOT NULL | Vendor unique event identifier |
| `event_type` | VARCHAR(100) | NOT NULL | Event name (`payment.captured`, `room_finished`) |
| `payload` | JSONB | NOT NULL | Raw webhook payload |
| `signature` | TEXT | NOT NULL | Webhook cryptographic signature header |
| `is_processed` | BOOLEAN | NOT NULL DEFAULT FALSE | True once downstream handler succeeds |
| `processed_at` | TIMESTAMPTZ | NULL | Processing timestamp |
| `error_message` | TEXT | NULL | Error description if processing failed |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Receipt timestamp |
| *Constraint:* | `UNIQUE(provider, event_id)` | | Enforces strict idempotent deduplication |

#### `notifications` (User Alerts & System Notices)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Notification ID |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE | Recipient |
| `title` | VARCHAR(100) | NOT NULL | Notification headline |
| `body` | TEXT | NOT NULL | Notification text |
| `type` | VARCHAR(50) | NOT NULL | 'match', 'call_missed', 'gift_received', 'payout' |
| `data` | JSONB | NOT NULL DEFAULT '{}'::jsonb | Deep link payload |
| `is_read` | BOOLEAN | NOT NULL DEFAULT FALSE | Read state |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

#### `user_privacy_requests` (DPDP Act 2023 Compliance)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | Request ID |
| `user_id` | UUID | NOT NULL REFERENCES `profiles(id)` | Requesting subject |
| `request_type` | VARCHAR(30) | NOT NULL CHECK (request_type IN ('data_export', 'account_erasure', 'consent_withdrawal')) | DPDP request category |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'submitted' | 'submitted', 'processing', 'completed', 'rejected' |
| `resolution_notes`| TEXT | NULL | Processing outcome narrative |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Submission timestamp |
| `completed_at` | TIMESTAMPTZ | NULL | Fulfilment timestamp |

---

## 4. Canonical Indexes & Optimization Registry

```sql
-- Profiles & Discovery
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_primary_lang ON profiles(primary_language);
CREATE INDEX idx_creator_profiles_available ON creator_profiles(is_available_for_calls, verification_status);
CREATE INDEX idx_user_languages_lookup ON user_languages(language_code, proficiency);

-- Swipes & Matches
CREATE INDEX idx_discovery_swipes_swiper ON discovery_swipes(swiper_id, direction);
CREATE INDEX idx_matches_participants ON matches(user_a_id, user_b_id);

-- Call Sessions & Holds
CREATE INDEX idx_call_sessions_caller ON call_sessions(caller_id, status);
CREATE INDEX idx_call_sessions_callee ON call_sessions(callee_id, status);
CREATE INDEX idx_call_sessions_livekit_room ON call_sessions(livekit_room_name);
CREATE INDEX idx_call_coin_holds_active ON call_coin_holds(user_id, status) WHERE status = 'reserved';

-- Messaging
CREATE INDEX idx_conversations_user_a ON conversations(participant_a_id, last_message_at DESC);
CREATE INDEX idx_conversations_user_b ON conversations(participant_b_id, last_message_at DESC);
CREATE INDEX idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX idx_direct_messages_unread ON direct_messages(recipient_id) WHERE is_read = FALSE;

-- Financial Ledger & Webhooks
CREATE INDEX idx_financial_journal_group ON financial_journal_entries(transaction_group_id);
CREATE INDEX idx_financial_journal_account ON financial_journal_entries(account_type, created_at DESC);
CREATE INDEX idx_financial_journal_user ON financial_journal_entries(user_id, created_at DESC);
CREATE INDEX idx_financial_journal_creator ON financial_journal_entries(creator_id, created_at DESC);
CREATE INDEX idx_inbound_webhooks_lookup ON inbound_webhook_events(provider, event_id);
CREATE INDEX idx_payment_orders_user ON payment_orders(user_id, status);

-- Safety & Moderation
CREATE INDEX idx_user_blocks_lookup ON user_blocks(blocker_id, blocked_id);
CREATE INDEX idx_moderation_reports_status ON moderation_reports(status, created_at ASC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
```
