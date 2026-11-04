# NECTAR — CANONICAL API ENDPOINT REGISTRY
**Document Reference:** `docs/architecture/CANONICAL_API_REGISTRY.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Status:** Canonical Source of Truth (Authoritative)  
**Author:** Principal Software Architect, Backend Architect & Application Security Engineer  

---

## 1. Global API Standards & Protocols

1. **Protocol & Wire Format:** All requests and responses are strictly `application/json` over HTTPS.
2. **Authentication:** 
   - User requests authenticate via HTTP-only, secure cookies (`sb-access-token`, `sb-refresh-token`) managed by `@supabase/ssr`.
   - Webhook requests authenticate via vendor-specific cryptographic signatures (`X-Razorpay-Signature`, `Authorization` for LiveKit).
3. **Error Reporting Standard (RFC 7807):**
   All error payloads adhere to the Problem Details format:
   ```json
   {
     "type": "https://nectar.app/errors/insufficient-balance",
     "title": "Insufficient Coin Balance",
     "status": 402,
     "detail": "Wallet requires at least 60 coins to initiate a call with this creator.",
     "instance": "/api/calls/initiate",
     "code": "INSUFFICIENT_FUNDS",
     "timestamp": "2026-11-04T11:00:00Z"
   }
   ```
4. **Idempotency Standard:**
   All mutating financial, call, and gifting endpoints REQUIRE an `Idempotency-Key: <UUIDv4>` HTTP header. Duplicate requests within a 24-hour window return the cached identical response without re-executing transactions.
5. **Rate Limiting Standard:**
   Enforced at the edge / Next.js middleware using Upstash Redis sliding-window algorithm. Rate limit headers are returned on all responses:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

---

## 2. Canonical Endpoint Registry

### 2.1 Module 01: Authentication, Age Assurance & Identity

#### `POST /api/auth/otp/send`
- **Purpose:** Request an SMS One-Time Password for Indian mobile numbers (+91).
- **Auth:** Anonymous.
- **Rate Limit:** 3 requests per 10 minutes per IP/Phone.
- **Request Schema:**
  ```typescript
  {
    phone_number: string; // E.164 format (+91XXXXXXXXXX)
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    success: true;
    message: "OTP dispatched via SMS";
    retry_after_seconds: 60;
  }
  ```
- **Error Codes:** `400 Bad Request`, `429 Too Many Requests`.
- **DB Operations:** Logs attempt into rate-limiter; delegates SMS delivery to Supabase Auth.

#### `POST /api/auth/otp/verify`
- **Purpose:** Verify received OTP and establish session cookies.
- **Auth:** Anonymous.
- **Rate Limit:** 5 verification attempts per 10 minutes.
- **Request Schema:**
  ```typescript
  {
    phone_number: string;
    token: string; // 6-digit OTP
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    session: {
      user_id: string; // UUID
      is_new_user: boolean;
      role: "user" | "creator" | "moderator" | "admin";
      age_assurance_tier: "declared_only" | "verified_id" | "verified_payment";
    }
  }
  ```
- **DB Operations:** Verifies OTP via Supabase Auth; reads/creates `profiles` and `private_user_profiles`.

#### `POST /api/auth/age-declaration`
- **Purpose:** Submit mandatory 18+ age declaration during onboarding.
- **Auth:** Authenticated (`user`, `creator`).
- **Idempotency:** Required (`Idempotency-Key`).
- **Request Schema:**
  ```typescript
  {
    declared_18_plus: boolean; // Must be strictly true
    birth_date?: string;       // YYYY-MM-DD
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    success: true;
    age_assurance_tier: "declared_only";
    declared_at: string; // ISO 8601
  }
  ```
- **Error Codes:** `400 Bad Request` (if `declared_18_plus !== true`), `401 Unauthorized`.
- **DB Operations:** 
  - Updates `private_user_profiles.age_assurance_tier = 'declared_only'`.
  - Records immutable event in `audit_logs` with client IP and user-agent.

---

### 2.2 Module 02: Profiles & Discovery

#### `GET /api/profiles/me`
- **Purpose:** Fetch current user's complete profile, private details, and wallet balances.
- **Auth:** Authenticated (`user`, `creator`, `moderator`, `admin`).
- **Response Schema (200 OK):**
  ```typescript
  {
    profile: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      gender: string;
      primary_language: string;
      role: string;
    };
    private_details: {
      phone_number: string; // Masked (+91 98*** **321)
      age_assurance_tier: string;
      city: string | null;
      state: string | null;
    };
    wallet: {
      available_coins: number;
      held_coins: number;
    };
    creator_details?: {
      id: string;
      verification_status: string;
      is_available_for_calls: boolean;
      call_rate_coins_per_minute: number;
      earnings_available_inr: number;
    };
  }
  ```
- **DB Operations:** Reads `profiles`, `private_user_profiles`, `user_coin_wallets`, and optionally `creator_profiles` & `creator_earnings_wallets`.

#### `PATCH /api/profiles/me`
- **Purpose:** Update editable public profile attributes.
- **Auth:** Authenticated.
- **Request Schema:**
  ```typescript
  {
    display_name?: string;     // 2 - 50 characters
    bio?: string;              // Max 300 characters
    primary_language?: string; // 'te', 'hi', 'en'
    avatar_url?: string;
  }
  ```
- **Response Schema (200 OK):** Updated profile object.
- **Error Codes:** `400 Bad Request`, `403 Forbidden` (if client attempts to pass `role`, `is_suspended`, or `id`).
- **DB Operations:** Updates `profiles`. (Protected by RLS `profiles_update_own` which forbids role mutation).

#### `GET /api/discovery/feed`
- **Purpose:** Fetch paginated discovery profile cards matching user preferences.
- **Auth:** Authenticated.
- **Query Parameters:** `cursor?: string`, `limit?: number (default 10)`.
- **Response Schema (200 OK):**
  ```typescript
  {
    items: Array<{
      id: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      primary_language: string;
      spoken_languages: string[];
      is_creator: boolean;
      call_rate_coins_per_minute?: number;
      voice_intro_url?: string;
      is_online: boolean;
    }>;
    next_cursor: string | null;
  }
  ```
- **DB Operations:** Queries `profiles` joined with `creator_profiles` and `user_languages`. Filters out profiles in `user_blocks` (bidirectional) and already swiped in `discovery_swipes`.

#### `POST /api/discovery/swipe`
- **Purpose:** Record a like or pass on a discovery profile.
- **Auth:** Authenticated.
- **Idempotency:** Enforced via composite constraint (`swiper_id, swiped_id`).
- **Request Schema:**
  ```typescript
  {
    target_user_id: string; // UUID
    direction: "like" | "pass";
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    swiped: true;
    is_match: boolean;
    match_details?: {
      match_id: string;
      matched_at: string;
      conversation_id: string;
    };
  }
  ```
- **DB Operations:** Inserts into `discovery_swipes`. If mutual like exists, atomically inserts into `matches` and `conversations`, and triggers real-time presence broadcast.

---

### 2.3 Module 03: Server-Authoritative Voice Calling & Metering

#### `POST /api/calls/initiate`
- **Purpose:** Start a server-authoritative voice call session with a creator.
- **Auth:** Authenticated.
- **Idempotency:** Required (`Idempotency-Key`).
- **Request Schema:**
  ```typescript
  {
    callee_id: string; // Creator's User UUID
  }
  ```
- **Response Schema (201 Created):**
  ```typescript
  {
    call_session_id: string;
    livekit_room_name: string;
    caller_token: string; // Short-lived WebRTC JWT (TTL 10 min)
    callee_id: string;
    rate_coins_per_minute: number;
    held_coins: number;
    status: "initiated";
  }
  ```
- **Error Codes:** 
  - `400 Bad Request` (Self-call)
  - `402 Payment Required` (`INSUFFICIENT_FUNDS`: Available balance < 1 minute rate)
  - `403 Forbidden` (`USER_BLOCKED`)
  - `409 Conflict` (`CALLEE_BUSY` or `CALLER_ALREADY_IN_CALL`)
  - `422 Unprocessable` (`CREATOR_UNAVAILABLE`)
- **DB Operations:** 
  - Validates `creator_profiles.is_available_for_calls = TRUE`.
  - Validates bidirectional block check on `user_blocks`.
  - Locks `user_coin_wallets` (`SELECT FOR UPDATE`). Asserts `available_coins >= rate`.
  - Atomically moves 1 minute of coins from `available_coins` to `held_coins`.
  - Inserts into `call_sessions` (`status = 'initiated'`) and `call_coin_holds` (`status = 'reserved'`).
  - Calls LiveKit Server SDK to create room `room_call_<id>`. Generates scoped participant token.

#### `POST /api/calls/answer`
- **Purpose:** Callee accepts incoming call signal.
- **Auth:** Authenticated (Callee only).
- **Request Schema:**
  ```typescript
  {
    call_session_id: string;
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    call_session_id: string;
    livekit_room_name: string;
    callee_token: string; // LiveKit WebRTC JWT
    status: "connecting";
  }
  ```
- **DB Operations:** Updates `call_sessions.status = 'connecting'`, generates LiveKit callee JWT.

#### `POST /api/calls/terminate`
- **Purpose:** Explicit hangup by either participant.
- **Auth:** Authenticated (Participant only).
- **Request Schema:**
  ```typescript
  {
    call_session_id: string;
    reason?: "user_hangup" | "callee_declined";
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    call_session_id: string;
    status: "completed_normal";
    duration_seconds: number;
    total_coins_debited: number;
    creator_earnings_inr: number;
    unheld_coins_refunded: number;
  }
  ```
- **DB Operations:**
  - Instructs LiveKit server to close room.
  - Finalizes billing via stored procedure `finalize_call_billing(call_id)`.
  - Releases unused hold in `call_coin_holds`.

---

### 2.4 Module 04: Wallet, Coins & Virtual Gifting

#### `GET /api/wallet/packages`
- **Purpose:** Retrieve active coin purchase packages and pricing in INR.
- **Auth:** Authenticated / Anonymous.
- **Response Schema (200 OK):**
  ```typescript
  {
    packages: Array<{
      id: string;
      coin_quantity: number;
      price_paise: number; // e.g. 9900 = ₹99.00
      badge_text: string | null;
    }>;
  }
  ```
- **DB Operations:** Reads `coin_packages` where `is_active = TRUE`.

#### `POST /api/wallet/purchase/create-order`
- **Purpose:** Initialize a Razorpay payment order for coins.
- **Auth:** Authenticated.
- **Idempotency:** Required (`Idempotency-Key`).
- **Request Schema:**
  ```typescript
  {
    package_id: string;
  }
  ```
- **Response Schema (201 Created):**
  ```typescript
  {
    order_id: string;          // Internal UUID
    gateway_order_id: string;  // Razorpay order_xxx
    amount_paise: number;
    currency: "INR";
    key_id: string;            // Public Razorpay Key ID
    coins_promised: number;
  }
  ```
- **DB Operations:** Inserts into `payment_orders` with status `created`.

#### `POST /api/wallet/purchase/verify`
- **Purpose:** Client submits payment signature after Razorpay modal completes.
- **Auth:** Authenticated.
- **Request Schema:**
  ```typescript
  {
    order_id: string;
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    success: true;
    coins_credited: number;
    new_balance: number;
  }
  ```
- **DB Operations:** Validates signature using `RAZORPAY_KEY_SECRET`. Executes atomic ledger credit.

#### `POST /api/gifts/send`
- **Purpose:** Send a virtual gift to a creator during or outside a call.
- **Auth:** Authenticated.
- **Idempotency:** Required (`Idempotency-Key`).
- **Request Schema:**
  ```typescript
  {
    recipient_creator_id: string;
    gift_id: string;
    call_session_id?: string;
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    transfer_id: string;
    coins_debited: number;
    creator_earnings_inr: number;
    new_coin_balance: number;
    animation_key: string;
  }
  ```
- **DB Operations:** 
  - Calls `transfer_virtual_gift(...)` atomic stored procedure.
  - Locks sender `user_coin_wallets` (`SELECT FOR UPDATE`).
  - Appends to `virtual_gift_transfers`, `financial_journal_entries`.
  - Updates `creator_earnings_wallets.available_balance_inr`.
  - Broadcasts realtime gift animation event.

---

### 2.5 Module 05: Creator Hub, Earnings & Payouts

#### `POST /api/creator/apply`
- **Purpose:** Submit application to become an approved monetization creator.
- **Auth:** Authenticated.
- **Request Schema:**
  ```typescript
  {
    sample_voice_url: string;
    application_notes?: string;
  }
  ```
- **Response Schema (201 Created):**
  ```typescript
  {
    application_id: string;
    status: "pending_review";
  }
  ```
- **DB Operations:** Inserts into `creator_applications`. Updates `creator_profiles.verification_status = 'pending_review'`.

#### `POST /api/creator/kyc`
- **Purpose:** Submit encrypted payout details (PAN, Bank, UPI).
- **Auth:** Authenticated (`creator`).
- **Request Schema:**
  ```typescript
  {
    legal_full_name: string;
    pan_number: string;
    payout_channel: "upi" | "bank_transfer";
    upi_id?: string;
    bank_account_number?: string;
    bank_ifsc_code?: string;
  }
  ```
- **Response Schema (200 OK):**
  ```typescript
  {
    success: true;
    pan_masked: string;
    payout_destination_masked: string;
    is_verified: boolean;
  }
  ```
- **DB Operations:** Encrypts sensitive fields via AES-256-GCM. Upserts `creator_kyc_details`.

#### `POST /api/creator/payout/request`
- **Purpose:** Request withdrawal of accrued creator earnings.
- **Auth:** Authenticated (`creator`).
- **Idempotency:** Required (`Idempotency-Key`).
- **Request Schema:**
  ```typescript
  {
    amount_inr: number; // Minimum ₹500.00
  }
  ```
- **Response Schema (201 Created):**
  ```typescript
  {
    payout_request_id: string;
    gross_amount_inr: number;
    tds_withheld_inr: number;
    net_payable_inr: number;
    status: "requested";
  }
  ```
- **Error Codes:** `400 Bad Request` (< ₹500), `402 Payment Required` (Insufficient available earnings), `403 Forbidden` (KYC unverified).
- **DB Operations:**
  - Locks `creator_earnings_wallets` (`SELECT FOR UPDATE`).
  - Moves funds from `available_balance_inr` to `pending_payout_inr`.
  - Posts double-entry escrow liability entries in `financial_journal_entries`.
  - Inserts record into `creator_payout_requests`.

---

### 2.6 Module 06: Safety, Blocking & Moderation

#### `POST /api/safety/block`
- **Purpose:** Block a user bidirectionally.
- **Auth:** Authenticated.
- **Request Schema:**
  ```typescript
  {
    blocked_user_id: string;
    reason?: string;
  }
  ```
- **Response Schema (200 OK):** `{ blocked: true }`
- **DB Operations:** Inserts into `user_blocks`. Immediately terminates any active call or match between the pair.

#### `POST /api/safety/report`
- **Purpose:** Report user or content for violations.
- **Auth:** Authenticated.
- **Request Schema:**
  ```typescript
  {
    reported_user_id: string;
    target_type: "user_profile" | "voice_call" | "direct_message" | "creator_bio";
    target_id?: string;
    category: string;
    explanation?: string;
  }
  ```
- **Response Schema (201 Created):** `{ report_id: string, status: "pending" }`
- **DB Operations:** Inserts into `moderation_reports`.

---

### 2.7 Module 07: Webhooks (Server-to-Server Only)

#### `POST /api/webhooks/razorpay`
- **Purpose:** Receive payment status notifications from Razorpay.
- **Auth:** Cryptographic HMAC-SHA256 signature via header `X-Razorpay-Signature`.
- **Idempotency:** Enforced via `inbound_webhook_events(provider, event_id)`.
- **Handling Procedure:**
  1. Read raw request body as binary Buffer.
  2. Compute expected HMAC: `crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')`.
  3. Constant-time compare with header signature. Return 401 if invalid.
  4. Query `inbound_webhook_events` for `(provider = 'razorpay', event_id = payload.event_id)`. If exists, immediately return `200 OK`.
  5. Insert record into `inbound_webhook_events` (`is_processed = FALSE`).
  6. Process event:
     - `payment.captured`: Locate `payment_orders`, execute atomic stored procedure to credit `user_coin_wallets` and post balanced journal entry. Mark order `paid`.
     - `payment.failed`: Update `payment_orders.status = 'failed'`.
  7. Mark `inbound_webhook_events.is_processed = TRUE`. Return `200 OK`.

#### `POST /api/webhooks/livekit`
- **Purpose:** Receive WebRTC media room and participant lifecycle events from LiveKit SFU.
- **Auth:** LiveKit Webhook Token validation via `livekit-server-sdk` `WebhookReceiver`.
- **Idempotency:** Enforced via `inbound_webhook_events(provider, event_id)`.
- **Handling Procedure:**
  1. Validate Authorization header using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
  2. Parse event payload (`WebhookEvent`).
  3. Deduplicate via `inbound_webhook_events`.
  4. Process event:
     - `participant_joined`: If both caller and callee have joined media, update `call_sessions.status = 'active'`, `connected_at = NOW()`.
     - `participant_left`: If a participant disconnects unexpectedly, trigger 30-second reconnection grace period before ending call.
     - `room_finished`: Trigger server billing finalization, release remaining held coins, settle creator earnings.
  5. Return `200 OK`.
