# NECTAR — SERVER-AUTHORITATIVE CALL BILLING SPECIFICATION
**Document Reference:** `docs/architecture/CALL_BILLING_SPECIFICATION.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Voice & Financial Architecture  
**Status:** Canonical Source of Truth (Authoritative)  
**Author:** Principal Software Architect, Realtime Architect & Application Security Engineer  

---

## 1. Core Principles of Server-Authoritative Metering

1. **Zero Client Trust:** Browser timers, JavaScript `setInterval`, Web Audio playback clocks, and client-side lifecycle hooks have **zero authority** over call duration or financial debits.
2. **Server-Side Timing Authority:** The source of truth for media state is the **LiveKit Selective Forwarding Unit (SFU)** via server-to-server authenticated webhooks. The source of truth for financial balances is the **PostgreSQL transaction engine**.
3. **Pre-Authorization Holds:** A voice call cannot be connected without a verified pre-authorization hold on caller funds (`call_coin_holds`) preventing double-spend across parallel sessions.
4. **Durable Worker Independence:** The metering loop does not rely on long-lived Next.js HTTP serverless execution. Call billing is driven by discrete server events, durable queue ticks, and post-call LiveKit session reconciliation.

---

## 2. Complete Call Session Lifecycle State Machine

```
                      ┌──────────────────────┐
                      │      INITIATED       │  Funds reserved (1 min hold)
                      └──────────┬───────────┘  LiveKit room created
                                 │
                   Callee answers & connects
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │        ACTIVE        │  Billing clock starts
                      └────┬───────────┬─────┘  Periodic 60s meter tick
                           │           │
          Normal Hangup    │           │  Caller Balance Reaches 0
          (User / Callee)  │           │
                           │           ▼
                           │  ┌───────────────────────────────┐
                           │  │ COMPLETED_INSUFFICIENT_FUNDS  │ (Forced cutoff via SFU)
                           │  └────────┬──────────────────────┘
                           │           │
                           ▼           ▼
                      ┌──────────────────────┐
                      │    FINAL_SETTLED     │  Unused holds released
                      └──────────────────────┘  Earnings & journal posted
```

---

## 3. Step-by-Step Call Billing Mechanics

### 3.1 Step 1: Pre-Call Solvency & Fund Reservation (`/api/calls/initiate`)
1. **Request Received:** Caller initiates call to creator.
2. **Rate Snapshot:** Read creator's active rate ($C_{\text{rate}}$) from `creator_profiles.call_rate_coins_per_minute`. If null, default to system parameter (60 coins/min).
3. **Pessimistic Wallet Lock:**
   ```sql
   SELECT available_coins FROM user_coin_wallets WHERE user_id = p_caller_id FOR UPDATE;
   ```
4. **Solvency Verification:** Assert `available_coins >= C_rate`. (Caller must have at least 1 minute of call balance).
5. **Atomic Hold Placement:**
   - Move $C_{\text{rate}}$ from `available_coins` to `held_coins`.
   - Insert row in `call_coin_holds`:
     ```sql
     INSERT INTO call_coin_holds (call_session_id, user_id, held_coins, status, expires_at)
     VALUES (v_call_id, p_caller_id, v_rate, 'reserved', NOW() + INTERVAL '45 seconds');
     ```
   - Insert row in `call_sessions` (`status = 'initiated'`, `rate_coins_per_minute = v_rate`).
6. **Room Creation:** Next.js server calls LiveKit Server SDK to create room `room_call_<call_session_id>` with max participants = 2 and empty timeout = 60s.

### 3.2 Step 2: Media Handshake & Billing Start Event
1. Callee receives incoming call push/websocket event and calls `/api/calls/answer`.
2. Both participants join the LiveKit room via WebRTC.
3. **Billing Commencement Event:**
   - LiveKit SFU detects both participants publishing/subscribing to audio tracks.
   - LiveKit dispatches authenticated server webhook `participant_joined` to `/api/webhooks/livekit`.
   - The webhook handler verifies that **both** caller and callee are present in the room.
   - Atomically updates:
     ```sql
     UPDATE call_sessions
     SET status = 'active',
         connected_at = NOW(),
         ringing_started_at = COALESCE(ringing_started_at, NOW())
     WHERE id = v_call_session_id AND status IN ('initiated', 'ringing', 'connecting');
     ```
   - **Financial Debit 01:** The initial reserved 1-minute hold is immediately captured and posted into `financial_journal_entries`.

### 3.3 Step 3: Out-of-Process Metering Execution (Every 60 Seconds)
To ensure reliable billing without holding open serverless HTTP connections:
1. **Durable Schedule Worker:** An out-of-process background runner (Supabase `pg_cron` worker or Upstash QStash scheduled worker) triggers every 60 seconds:
   ```sql
   SELECT id, caller_id, callee_id, rate_coins_per_minute, connected_at, minutes_billed
   FROM call_sessions
   WHERE status = 'active';
   ```
2. **Idempotent Interval Calculation:**
   For each active call session:
   - Calculate elapsed seconds: `EXTRACT(EPOCH FROM (NOW() - connected_at))`.
   - Compute required intervals: $\lfloor \text{elapsed\_seconds} / 60 \rfloor + 1$.
   - If required intervals > `minutes_billed`, execute `deduct_call_minute(call_id, required_interval)`.

3. **Stored Procedure: `deduct_call_minute`:**
```sql
CREATE OR REPLACE FUNCTION deduct_call_minute(
  p_call_session_id UUID,
  p_target_minute INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session RECORD;
  v_available_coins INTEGER;
  v_creator_id UUID;
  v_creator_share_pct NUMERIC;
  v_net_rate_paise NUMERIC;
  v_reserve_extinguished_paise BIGINT;
  v_creator_paise BIGINT;
  v_platform_paise BIGINT;
  v_group_id UUID := gen_random_uuid();
  v_idem_key VARCHAR(128);
BEGIN
  -- 1. Pessimistically Lock Call Session
  SELECT * INTO v_session
  FROM call_sessions
  WHERE id = p_call_session_id AND status = 'active'
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_ACTIVE');
  END IF;

  -- Concurrency Guard: If this interval was already billed, exit idempotently
  IF v_session.minutes_billed >= p_target_minute THEN
    RETURN jsonb_build_object('success', true, 'already_billed', true);
  END IF;

  v_idem_key := 'call_billing:' || p_call_session_id || ':min:' || p_target_minute;

  -- 2. Lock Caller Wallet
  SELECT available_coins INTO v_available_coins
  FROM user_coin_wallets
  WHERE user_id = v_session.caller_id
  FOR UPDATE;

  -- 3. Check Solvency
  IF v_available_coins < v_session.rate_coins_per_minute THEN
    -- Insufficient Balance Cutoff
    PERFORM finalize_call_billing(p_call_session_id, 'INSUFFICIENT_FUNDS');
    RETURN jsonb_build_object('success', false, 'reason', 'TERMINATED_INSUFFICIENT_FUNDS');
  END IF;

  -- Read Commercial Rates (Net Realization: 8.390 paise/coin baseline)
  SELECT (config_value->>'rate')::NUMERIC INTO v_creator_share_pct FROM system_configurations WHERE config_key = 'commercial.creator_share_percentage';
  SELECT (config_value->>'rate_paise')::NUMERIC INTO v_net_rate_paise FROM system_configurations WHERE config_key = 'commercial.net_realization_rate_paise';

  v_creator_share_pct := COALESCE(v_creator_share_pct, 60.0);
  v_net_rate_paise := COALESCE(v_net_rate_paise, 8.390);
  SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = v_session.callee_id;

  -- Ind AS 115 Net Realization Calculation
  v_reserve_extinguished_paise := ROUND(v_session.rate_coins_per_minute * v_net_rate_paise)::BIGINT;
  v_creator_paise := ROUND(v_reserve_extinguished_paise * (v_creator_share_pct / 100.0))::BIGINT;
  v_platform_paise := v_reserve_extinguished_paise - v_creator_paise; -- Invariant: creator + platform == reserve

  -- 4. Mutate Balances
  UPDATE user_coin_wallets
  SET available_coins = available_coins - v_session.rate_coins_per_minute,
      lifetime_coins_spent = lifetime_coins_spent + v_session.rate_coins_per_minute,
      updated_at = NOW()
  WHERE user_id = v_session.caller_id;

  UPDATE creator_earnings_wallets
  SET available_balance_inr = available_balance_inr + (v_creator_paise / 100.0),
      lifetime_earnings_inr = lifetime_earnings_inr + (v_creator_paise / 100.0),
      updated_at = NOW()
  WHERE creator_id = v_creator_id;

  -- 5. Post Balanced Dual-Ledger Journal
  INSERT INTO financial_journal_entries (
    transaction_group_id, account_type, user_id, creator_id,
    debit_amount_cents, credit_amount_cents, currency, reason,
    idempotency_key, reference_entity_type, reference_entity_id, description
  ) VALUES
  -- Token Pool
  (v_group_id, 'user_coin_liability', v_session.caller_id, NULL, v_session.rate_coins_per_minute, 0, 'COIN', 'voice_call_minute_consumption', v_idem_key || ':token:dr', 'call_sessions', p_call_session_id, 'Call minute debit'),
  (v_group_id, 'virtual_coin_issuance_clearing', NULL, NULL, 0, v_session.rate_coins_per_minute, 'COIN', 'voice_call_minute_consumption', v_idem_key || ':token:cr', 'call_sessions', p_call_session_id, 'Token retirement clearing'),
  -- Fiat Pool
  (v_group_id, 'unearned_coin_fiat_reserve', v_session.caller_id, NULL, (v_creator_paise + v_platform_paise), 0, 'INR_SUBUNIT', 'voice_call_minute_consumption', v_idem_key || ':fiat:dr', 'call_sessions', p_call_session_id, 'Deferred fiat reserve recognition'),
  (v_group_id, 'creator_payable_liability', NULL, v_creator_id, 0, v_creator_paise, 'INR_SUBUNIT', 'voice_call_minute_consumption', v_idem_key || ':fiat:cr:creator', 'call_sessions', p_call_session_id, 'Creator call earnings'),
  (v_group_id, 'platform_earned_revenue', NULL, NULL, 0, v_platform_paise, 'INR_SUBUNIT', 'voice_call_minute_consumption', v_idem_key || ':fiat:cr:platform', 'call_sessions', p_call_session_id, 'Platform call commission');

  -- 6. Update Session Stats
  UPDATE call_sessions
  SET minutes_billed = minutes_billed + 1,
      last_billed_at = NOW(),
      total_coins_debited = total_coins_debited + v_session.rate_coins_per_minute,
      creator_earnings_inr = creator_earnings_inr + (v_creator_paise / 100.0)
  WHERE id = p_call_session_id;

  RETURN jsonb_build_object('success', true, 'minute_billed', p_target_minute);
END;
$$;
```

---

### 3.4 Automated Sweeper for Abandoned Holds & Edge Case Recovery

```sql
-- Scheduled Sweeper (Every 60s via pg_cron): Releases holds for calls that never connected
CREATE OR REPLACE FUNCTION sweep_expired_call_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_hold RECORD;
BEGIN
  FOR v_hold IN 
    SELECT id, call_session_id, user_id, held_coins
    FROM call_coin_holds
    WHERE status = 'reserved' AND expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Refund held coins to available wallet balance
    UPDATE user_coin_wallets
    SET available_coins = available_coins + v_hold.held_coins,
        held_coins = held_coins - v_hold.held_coins,
        updated_at = NOW()
    WHERE user_id = v_hold.user_id;

    UPDATE call_coin_holds
    SET status = 'released', settled_at = NOW()
    WHERE id = v_hold.id;

    UPDATE call_sessions
    SET status = 'missed', end_reason = 'CALLEE_TIMEOUT'
    WHERE id = v_hold.call_session_id AND status IN ('initiated', 'ringing');

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$$;
```

---

### 3.5 Disconnection, Grace Periods & Out-of-Order Webhooks
1. **Network Dropout Grace Period (30 Seconds):**
   - When a participant network drops, LiveKit sends `participant_left`.
   - The session enters `reconnecting` grace state. If rejoined within 30s, call resumes.
   - If unjoined after 30s, LiveKit server closes room and triggers `finalize_call_billing`.
2. **Out-of-Order Webhook Protection:**
   - If `room_finished` arrives before `participant_joined` due to network delays, `finalize_call_billing` checks if `connected_at` is null. If never connected, 0 minutes are debited, and 100% of held coins are returned.
   - Any late-arriving `participant_joined` webhook is rejected because `call_sessions.status` is already `'completed_normal'` or `'missed'`.
3. **60-Second Advance Low-Balance Warning:**
   - When `user_coin_wallets.available_coins < (2 * rate_coins_per_minute)`, a push event `low_balance_warning` is dispatched over Supabase Realtime channel `user:wallet:<userId>`, alerting the caller that only 1 minute remains.

---

## 4. Stored Procedure: `finalize_call_billing`

```sql
CREATE OR REPLACE FUNCTION finalize_call_billing(
  p_call_session_id UUID,
  p_end_reason VARCHAR(50)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_unused_hold INTEGER := 0;
BEGIN
  -- 1. Lock Call Session
  SELECT * INTO v_session
  FROM call_sessions
  WHERE id = p_call_session_id
  FOR UPDATE;

  IF v_session IS NULL OR v_session.status IN ('completed_normal', 'completed_insufficient_funds') THEN
    RETURN jsonb_build_object('already_finalized', true);
  END IF;

  -- 2. Release Any Uncaptured Holds
  SELECT COALESCE(SUM(held_coins), 0) INTO v_unused_hold
  FROM call_coin_holds
  WHERE call_session_id = p_call_session_id AND status = 'reserved';

  IF v_unused_hold > 0 THEN
    -- Return held coins to available wallet balance
    UPDATE user_coin_wallets
    SET available_coins = available_coins + v_unused_hold,
        held_coins = held_coins - v_unused_hold,
        updated_at = NOW()
    WHERE user_id = v_session.caller_id;

    UPDATE call_coin_holds
    SET status = 'released', settled_at = NOW()
    WHERE call_session_id = p_call_session_id AND status = 'reserved';
  END IF;

  -- 3. Mark Call Session Complete
  UPDATE call_sessions
  SET status = CASE 
        WHEN p_end_reason = 'INSUFFICIENT_FUNDS' THEN 'completed_insufficient_funds'::call_session_status
        ELSE 'completed_normal'::call_session_status
      END,
      ended_at = NOW(),
      duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(connected_at, NOW())))::INTEGER),
      end_reason = p_end_reason
  WHERE id = p_call_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'call_session_id', p_call_session_id,
    'unused_hold_released', v_unused_hold,
    'total_coins_debited', v_session.total_coins_debited,
    'creator_earnings_inr', v_session.creator_earnings_inr
  );
END;
$$;
```

---

## 5. Webhook Deduplication & Anti-Tampering Shield

1. **HMAC / Token Validation:** LiveKit webhooks authenticate against `LIVEKIT_API_SECRET`. Any forged or unsigned requests are dropped at the HTTP boundary (`401 Unauthorized`).
2. **Duplicate Suppression:** The unique event hash is checked against `inbound_webhook_events`. If LiveKit retries a webhook for an already-finalized session, the handler acknowledges with `200 OK` without altering balances.
3. **Post-Call Billing Audit:**
   - Every night, an audit script compares the total audio seconds reported by LiveKit room metadata with the `duration_seconds` and `total_coins_debited` recorded in `call_sessions`.
   - Any variance exceeding 60 seconds (1 billing cycle) is logged for engineering audit.
