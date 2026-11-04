# NECTAR — Integration Dependency Map & Failure Modes (Canonical Alignment)
**Document Reference:** `docs/architecture/INTEGRATION_DEPENDENCY_MAP.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect & Systems Architect  

---

## 1. System Integration Topology & Network Boundaries

```
                          ┌──────────────────────────────────────────────┐
                          │         NECTAR NEXT.JS APP ROUTER            │
                          │   (Node.js / Edge Serverless / SSR Core)     │
                          └──────┬─────────────┬────────────┬────────────┘
                                 │             │            │
          ┌──────────────────────┼─────────────┼────────────┼──────────────────────┐
          │                      │             │            │                      │
          ▼                      ▼             ▼            ▼                      ▼
┌──────────────────┐   ┌────────────────┐  ┌────────┐  ┌─────────────┐   ┌───────────────────┐
│     SUPABASE     │   │    LIVEKIT     │  │RAZORPAY│  │  GEMINI API │   │   UPSTASH REDIS   │
│  (ap-south-1)    │   │  (India SFU)   │  │(Mumbai)│  │ (Google AI) │   │   (ap-south-1)    │
├──────────────────┤   ├────────────────┤  ├────────┤  ├─────────────┤   ├───────────────────┤
│ • PostgreSQL 16  │   │ • WebRTC Voice │  │• Orders│  │ • Text      │   │ • Sliding Window  │
│ • Supabase Auth  │   │ • Room Events  │  │• Signa-│  │   Moderation│   │   Rate Limiting   │
│ • Realtime (WSS) │   │ • SFU Audio    │  │  tures │  │ • Audio     │   │ • Match Queue     │
│ • Object Storage │   │ • Egress Logs  │  │• Hooks │  │   Filtering │   │   Transient State │
└──────────────────┘   └────────────────┘  └────────┘  └─────────────┘   └───────────────────┘
```

---

## 2. Server-Authoritative Multi-Party Data Flows

### 2.1 Flow A: Voice Call Session & Out-of-Process Metering
1. **Client** initiates call via `POST /api/calls/initiate`.
2. **Next.js Server**:
   - Asserts caller solvency in `user_coin_wallets` (`available_coins >= rate`).
   - Places 1-minute fund reservation in `call_coin_holds`.
   - Creates `call_sessions` (`status = 'initiated'`).
   - Creates LiveKit room `room_call_<id>`.
3. **Callee** accepts via `POST /api/calls/answer`.
4. **LiveKit WebRTC SFU**:
   - Both participants join media.
   - LiveKit dispatches `participant_joined` webhook to `/api/webhooks/livekit`.
   - Server marks `call_sessions.status = 'active'`, `connected_at = NOW()`.
   - Initial 1-minute hold captured into `financial_journal_entries`.
5. **Durable 60s Metering Worker:**
   - Runs out-of-process independently of client browser connection.
   - Executes `deduct_call_minute` stored procedure.
   - If caller balance depletes to 0, server invokes LiveKit SDK to remove caller and close room with `INSUFFICIENT_FUNDS_TERMINATION`.
6. **Call Hangup / Termination:**
   - LiveKit sends `room_finished`.
   - Stored procedure `finalize_call_billing` settles duration, posts remaining journal entries, and releases any unused holds back to caller available balance.

### 2.2 Flow B: Coin Purchase & Invariant Crediting
1. Client selects package $\rightarrow$ `POST /api/wallet/purchase/create-order`.
2. Next.js creates order in `payment_orders` and registers with Razorpay.
3. User completes payment in Razorpay modal.
4. Razorpay sends `payment.captured` webhook to `/api/webhooks/razorpay`.
5. Next.js verifies HMAC-SHA256 signature, deduplicates via `inbound_webhook_events`, credits `user_coin_wallets`, and posts balanced entries to `financial_journal_entries`.

### 2.3 Flow C: In-Call Virtual Gifting
1. Sender clicks gift $\rightarrow$ `POST /api/gifts/send`.
2. Stored procedure `process_virtual_gift_transfer`:
   - Locks sender `user_coin_wallets` (`SELECT FOR UPDATE`).
   - Debits gift coins, accrues creator INR earnings in `creator_earnings_wallets`.
   - Inserts records into `virtual_gift_transfers` and `financial_journal_entries`.
   - Dispatches Supabase Realtime gift animation payload to active call room.

---

## 3. Failure Modes, Timeouts & Circuit Breakers

| Integration | Timeout | Retry Policy | Fallback Behavior |
| :--- | :---: | :--- | :--- |
| **Supabase PostgreSQL** | 5,000 ms | 3 retries, exponential backoff (100ms, 200ms, 400ms) | Return `HTTP 503`. Do not permit unrecorded transactions. |
| **LiveKit SFU** | 8,000 ms | Client ICE restart; server token regeneration (max 2) | Display "Reconnecting voice..." overlay. If unresolved after 30s, terminate room and release unused held coins. |
| **Razorpay API** | 6,000 ms | 1 immediate retry | Return error "Payment gateway temporarily busy." Do not debit user. |
| **Razorpay Webhook** | N/A | Vendor retry up to 24 hours | Client manual verification endpoint `/api/wallet/purchase/verify`. |
| **Gemini AI Safety** | 4,000 ms | 2 retries | Queue for asynchronous batch moderation; flag content as pending review without blocking safe onboarding. |
