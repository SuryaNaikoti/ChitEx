# Nectar — System Components & Database Specification

> **Scope:** Modular Services, Data Models, SQL Schemas, and Third-Party Integrations  
> **Database:** PostgreSQL 15+ (Supabase) with Row Level Security (RLS)  
> **API Protocols:** HTTPS REST, Server Actions, Supabase Realtime (WSS), LiveKit SFU (WebRTC)

---

## 1. Component Architecture Overview

The Nectar system is organized into modular functional layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION COMPONENTS                         │
│  ├── PwaAppShell & MobileViewport     ├── CallRingingModal & DialPad   │
│  ├── BottomNavigation & HeaderBar     ├── AudioWaveform & MicControls  │
│  ├── DiscoverUserCard & FilterPill    ├── WalletSheet & RazorpayModal  │
│  ├── MatchRadarAnimation & SkipTimer  ├── GiftShowerCanvas & Selector  │
│  └── ChatBubbleList & MessageInput    ├── ModerationReportDialog       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       SERVER APPLICATION SERVICES                      │
│  ├── AuthService        ├── UserService        ├── MatchingEngine      │
│  ├── CallManager        ├── ChatService        ├── WalletLedger        │
│  ├── GiftEngine         ├── PaymentGateway     ├── ModerationService   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 DATA PERSISTENCE & STORAGE (POSTGRESQL)                │
│  ├── Identity & Profiles (users, profiles, languages, interests)       │
│  ├── Social Discovery (match_queue, user_blocks, user_reports)         │
│  ├── Realtime Comms (call_sessions, call_holds, chat_messages)         │
│  ├── Virtual Economy (coin_packages, user_wallets, wallet_ledger)      │
│  ├── Creator Hub (creator_profiles, earnings_ledger, payout_requests)  │
│  └── Governance & Audit (moderation_tickets, admin_audit_logs)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Server Services & Business Logic Specifications

### 2.1 AuthService
- **Responsibilities:**
  - Phone number parsing and normalization (E.164 standard, India `+91`).
  - SMS OTP dispatch and rate-limiting (max 3 requests per 10 minutes per phone/IP).
  - Google OAuth identity token verification and account linking.
  - Mandatory 18+ age declaration validation upon registration.
  - JWT session generation and cookie issuance.

### 2.2 UserService & Profile Manager
- **Responsibilities:**
  - Profile creation, bio updates, and primary/secondary language selections (Telugu, Hindi, English).
  - Avatar image uploads to Supabase Storage bucket (`avatars`) with size limits (< 5MB) and mime-type enforcement.
  - Real-time online/offline presence synchronization with a 30-second heartbeat.
  - Privacy serialization: stripping out sensitive fields (phone number, internal auth ID, IP) before transmitting to other clients.

### 2.3 MatchingEngine (Voice Discovery Queue)
- **Responsibilities:**
  - Manages active matchmaking queues partitioned by language compatibility:
    - Queue 1: Telugu-friendly (`te`)
    - Queue 2: Hindi-friendly (`hi`)
    - Queue 3: English-friendly (`en`)
    - Queue 4: Multilingual / Open
  - Filters out users with active bidirectional blocks (`user_blocks`).
  - Implements a 30-second random pair matcher with mutual acceptance handshake.
  - Prevents rapid re-pairing between users who interacted within the last 12 hours.

### 2.4 CallManager (LiveKit & Billing Engine)
- **Responsibilities:**
  - Validates user wallet balance against the recipient's call rate (e.g. 20 coins/min).
  - Pre-authorizes and locks initial minute hold.
  - Communicates with LiveKit API to mint scoped access tokens (`roomJoin`, `canPublish: audio`, `canSubscribe: audio`).
  - Listens to LiveKit webhook notifications (`participant_joined`, `participant_left`, `room_finished`).
  - Emits real-time audio disconnection warnings when the caller's coin balance reaches < 1 minute threshold.
  - Settles final session duration and dispatches creator earnings share.

### 2.5 WalletLedger & Virtual Economy Service
- **Responsibilities:**
  - Double-entry bookkeeping: every transaction has a corresponding debit/credit entry in `wallet_ledger`.
  - Atomically deducts coins during calls and gift dispatch using `SELECT FOR UPDATE`.
  - Integrates with Razorpay for coin top-up orders (`₹49` for 50 coins, `₹199` for 250 coins, `₹499` for 700 coins).
  - Handles idempotent webhook callbacks via `razorpay_payment_id` checks.

### 2.6 GiftEngine
- **Responsibilities:**
  - Maintains the gift catalogue (Rose: 10 coins, Coffee: 25 coins, Nectar Crown: 100 coins, Royal Peacock: 500 coins).
  - Executes atomic transfer: debits user wallet, records gift transaction, and computes creator earnings in INR based on approved revenue share (e.g., 60%).
  - Broadcasts gift animations to the LiveKit room or chat session via Supabase Realtime.

### 2.7 ModerationService & Gemini AI Pipeline
- **Responsibilities:**
  - Immediate user blocking: instantly severs active audio calls, halts chat messaging, and hides discovery profiles.
  - Report ticketing: collects violation reason, optional audio recording context snippet, and reporter notes.
  - Automated toxicity evaluation: sends bio text and message snippets to Gemini 2.5 Flash for offensive speech scoring.
  - Moderator Console: powers admin actions (Warning, Temporary 24h Ban, Permanent Account Termination).

---

## 3. Database Schema (PostgreSQL 15+ / Supabase DDL)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER PROFILES & IDENTITY
-- ============================================================================

CREATE TYPE user_role AS ENUM ('guest', 'user', 'creator', 'moderator', 'admin');
CREATE TYPE user_gender AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned');

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    bio VARCHAR(250) DEFAULT '',
    gender user_gender DEFAULT 'prefer_not_to_say',
    is_age_verified BOOLEAN NOT NULL DEFAULT FALSE,
    date_of_birth DATE,
    role user_role NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    call_rate_coins_per_min INT NOT NULL DEFAULT 15,
    allow_calls_from_strangers BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supported language affinities (Telugu, Hindi, English, etc.)
CREATE TABLE user_languages (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- 'te', 'hi', 'en'
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, language_code)
);

-- User interest tags
CREATE TABLE user_interests (
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    interest_tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, interest_tag)
);

-- ============================================================================
-- 2. SAFETY, BLOCKING & REPORTING
-- ============================================================================

CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_block_pair UNIQUE (blocker_id, blocked_id)
);

CREATE TYPE report_reason AS ENUM (
    'harassment',
    'inappropriate_audio',
    'underage',
    'spam',
    'impersonation',
    'fraud'
);

CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');

CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES user_profiles(id),
    reported_user_id UUID NOT NULL REFERENCES user_profiles(id),
    reason report_reason NOT NULL,
    description TEXT,
    call_session_id UUID,
    status report_status NOT NULL DEFAULT 'pending',
    gemini_toxicity_score NUMERIC(4,3),
    gemini_summary TEXT,
    moderator_notes TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. MATCHMAKING QUEUE & LIVE CALLS
-- ============================================================================

CREATE TYPE match_status AS ENUM ('searching', 'paired', 'accepted', 'declined', 'timeout');

CREATE TABLE match_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    preferred_language VARCHAR(10) NOT NULL,
    status match_status NOT NULL DEFAULT 'searching',
    matched_with UUID REFERENCES user_profiles(id),
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 seconds')
);

CREATE TYPE call_status AS ENUM (
    'initiating',
    'ringing',
    'connected',
    'ended_normal',
    'ended_insufficient_balance',
    'ended_declined',
    'failed_network'
);

CREATE TABLE call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name VARCHAR(100) UNIQUE NOT NULL,
    caller_id UUID NOT NULL REFERENCES user_profiles(id),
    receiver_id UUID NOT NULL REFERENCES user_profiles(id),
    coin_rate_per_min INT NOT NULL,
    status call_status NOT NULL DEFAULT 'initiating',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT NOT NULL DEFAULT 0,
    total_coins_billed INT NOT NULL DEFAULT 0,
    creator_earnings_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Temporary hold reservations to prevent double-spending during calls
CREATE TABLE call_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    held_coins INT NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. VIRTUAL COIN ECONOMY & LEDGER
-- ============================================================================

CREATE TABLE coin_packages (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'pack_basic_50'
    name VARCHAR(100) NOT NULL,
    coin_amount INT NOT NULL,
    bonus_coins INT NOT NULL DEFAULT 0,
    price_inr NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    badge_label VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE user_wallets (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    coin_balance INT NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
    lifetime_coins_purchased INT NOT NULL DEFAULT 0,
    lifetime_coins_spent INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE transaction_type AS ENUM (
    'purchase_credit',
    'call_debit',
    'gift_sent_debit',
    'admin_grant',
    'refund_credit'
);

CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    transaction_type transaction_type NOT NULL,
    amount INT NOT NULL, -- Positive for credit, negative for debit
    balance_after INT NOT NULL,
    reference_id VARCHAR(100), -- payment_id, call_session_id, or gift_id
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. VIRTUAL GIFTS & CREATOR EARNINGS
-- ============================================================================

CREATE TABLE virtual_gifts (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'gift_rose', 'gift_crown'
    name VARCHAR(100) NOT NULL,
    coin_price INT NOT NULL,
    animation_type VARCHAR(50) NOT NULL, -- 'particle', 'lottie_fullscreen'
    icon_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE gift_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id),
    recipient_id UUID NOT NULL REFERENCES user_profiles(id),
    gift_id VARCHAR(50) NOT NULL REFERENCES virtual_gifts(id),
    coin_amount INT NOT NULL,
    creator_earnings_inr NUMERIC(10,2) NOT NULL,
    call_session_id UUID REFERENCES call_sessions(id),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE creator_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    payout_upi_id VARCHAR(100),
    payout_bank_account_number VARCHAR(50),
    payout_ifsc_code VARCHAR(20),
    revenue_share_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00, -- 60% creator, 40% platform
    withdrawable_inr_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (withdrawable_inr_balance >= 0),
    lifetime_inr_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE creator_payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creator_profiles(user_id),
    amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr >= 500.00), -- Min ₹500 payout
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'rejected'
    payout_method VARCHAR(20) NOT NULL, -- 'upi', 'bank_transfer'
    destination_details TEXT NOT NULL,
    admin_reference VARCHAR(100),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ONE-TO-ONE TEXT MESSAGING
-- ============================================================================

CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_one UUID NOT NULL REFERENCES user_profiles(id),
    participant_two UUID NOT NULL REFERENCES user_profiles(id),
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_participants UNIQUE (participant_one, participant_two)
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Row Level Security (RLS) Policies

1. **User Profiles:**
   - `SELECT`: Anyone authenticated can read active public profiles (`status = 'active'`).
   - `UPDATE`: Users can only edit their own profile (`id = auth.uid()`).
2. **User Wallets:**
   - `SELECT`: Only the wallet owner can view balance (`user_id = auth.uid()`).
   - `INSERT / UPDATE`: Denied to public and authenticated roles; restricted exclusively to database triggers or service-role backend executions.
3. **Wallet Ledger:**
   - `SELECT`: Users can view their own ledger history (`user_id = auth.uid()`).
   - `INSERT / UPDATE / DELETE`: Immutable; client direct writes disabled.
4. **Call Sessions:**
   - `SELECT`: Users can only view calls where they are either `caller_id` or `receiver_id`.
5. **Chat Messages:**
   - `SELECT / INSERT`: Allowed only if `auth.uid()` is a verified participant of the `conversation_id` AND no active block exists between the participants.
