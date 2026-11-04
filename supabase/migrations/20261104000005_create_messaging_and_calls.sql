-- NECTAR CANONICAL MIGRATION: 05_create_messaging_and_calls
-- Subsystem: Subsystems 04 & 05 — Voice Calling, Holds & Direct Messaging
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. call_sessions (Call Metadata & Lifecycle Ledger)
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES profiles(id),
  callee_id UUID NOT NULL REFERENCES profiles(id),
  livekit_room_name VARCHAR(100) NOT NULL UNIQUE,
  status call_session_status NOT NULL DEFAULT 'initiated',
  rate_coins_per_minute INTEGER NOT NULL CHECK (rate_coins_per_minute > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ringing_started_at TIMESTAMPTZ NULL,
  connected_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  minutes_billed INTEGER NOT NULL DEFAULT 0 CHECK (minutes_billed >= 0),
  last_billed_at TIMESTAMPTZ NULL,
  total_coins_debited INTEGER NOT NULL DEFAULT 0 CHECK (total_coins_debited >= 0),
  creator_earnings_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (creator_earnings_inr >= 0.00),
  end_reason VARCHAR(50) NULL,
  CONSTRAINT chk_call_sessions_no_self_call CHECK (caller_id != callee_id)
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee ON call_sessions(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_livekit_room ON call_sessions(livekit_room_name);

-- 2. call_coin_holds (Pre-Call Fund Reservations)
CREATE TABLE IF NOT EXISTS call_coin_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL UNIQUE REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  held_coins INTEGER NOT NULL CHECK (held_coins > 0),
  status call_hold_status NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  settled_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_call_coin_holds_active ON call_coin_holds(user_id, status) WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_call_coin_holds_session ON call_coin_holds(call_session_id);

-- 3. conversations (Chat Channels)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_message_preview VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_conversations_canonical_order CHECK (participant_a_id < participant_b_id),
  CONSTRAINT uq_conversations_pair UNIQUE(participant_a_id, participant_b_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(participant_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(participant_b_id, last_message_at DESC);

-- 4. direct_messages (Chat Messages)
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL CHECK (length(content) <= 2000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_direct_messages_no_self_message CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(recipient_id) WHERE is_read = FALSE;

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE call_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_coin_holds DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;
