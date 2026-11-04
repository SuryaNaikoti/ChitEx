# Nectar — System Architecture Specification

> **Architectural Paradigm:** Modular Monolith (Server-Authoritative, Event-Assisted)  
> **Target Audience:** Engineering Team, Security Auditors, and System Architects  
> **Reference Model:** Baseline System Topology & Gate 03 Architecture

---

## 1. Architectural Philosophy: The Modular Monolith

Nectar adopts a **Modular Monolith** pattern rather than distributed microservices for V1. This guarantees:
- **Zero Distributed Transaction Complexity:** Critical financial and reservation transactions execute with atomic ACID guarantees inside PostgreSQL.
- **Fast Developer Velocity & Low Deployment Friction:** Shared TypeScript domain models across client, server actions, and background reconciliation workers.
- **Strict Domain Boundaries:** Every module (Auth, Discovery, Matching, Calls, Chat, Wallet, Gifts, Safety) is isolated into its own service class with private internal helpers and explicit public interfaces.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER (PWA)                        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│   │   User App   │  │  Voice Call  │  │ Creator Hub  │  │  Admin   │   │
│   │ (Discovery)  │  │  Experience  │  │  (Earnings)  │  │ Console  │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Server Actions / API Routes / WebSockets
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION SERVICE LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth Service │  │ User Service │  │ Match Service│  │Call Service│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │Wallet Service│  │ Gift Service │  │Payment Serv. │  │Safety Serv.│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└───────┬───────────────────┬───────────────────┬────────────────┬───────┘
        │                   │                   │                │
        ▼                   ▼                   ▼                ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│   SUPABASE   │    │   LIVEKIT    │    │   RAZORPAY   │  │    GEMINI    │
│  PostgreSQL  │    │  WebRTC SFU  │    │  UPI & Cards │  │ Moderation & │
│  Auth Engine │    │  Audio Media │    │  Webhooks &  │  │ Safety Audio │
│  Realtime WS │    │  Live Rooms  │    │  Settlement  │  │  Evaluation  │
│  Storage S3  │    │ Token Server │    │  Signatures  │  │   Pipeline   │
└───────┬──────┘    └──────────────┘    └──────────────┘  └──────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  BACKGROUND WORKERS & OBSERVABILITY                    │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐   │
│  │ Call Reconciliation   │  │ Out-of-Band Financial Audit Check    │   │
│  ├───────────────────────┤  ├──────────────────────────────────────┤   │
│  │ Moderation Queue Pump │  │ Presence Heartbeat Cleanup Worker    │   │
│  └───────────────────────┘  └──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Layer Breakdown

### 2.1 Next.js App Router (Mobile-First PWA Presentation Layer)
- Serves responsive, mobile-first pages designed for thumb-reach ergonomics on mobile web and installed PWA viewports.
- Integrates the Web App Manifest, Service Worker caching for offline shell navigation, and audio playback session management.
- Implements Route Handlers for webhooks (`/api/razorpay/webhook`, `/api/livekit/webhook`) and protected Server Actions for zero-bundle-cost database interactions.

### 2.2 Application Service Layer
- **`AuthService`**: Manages phone OTP verification with rate-limiting, Google SSO orchestration, and 18+ age declaration compliance check.
- **`MatchingService`**: Evaluates waiting participants in the random voice discovery queue using language affinity (Telugu/Hindi/English), interest intersection, and block-list exclusions.
- **`CallService`**: Orchestrates LiveKit room creation, generates cryptographically signed JWT tokens, handles call admission checks, and logs duration metrics.
- **`WalletService`**: Implements double-entry bookkeeping, balances coin reserves, processes package top-ups, and prevents overdrafts through atomic SQL locking.
- **`GiftService`**: Debits user coins atomically, burns platform commission, and credits creator withdrawable INR balances with idempotency protection.
- **`SafetyService`**: Coordinates user report tickets, handles instantaneous bidirectional blocks, and queues flagged bios/chat for Gemini automated toxic content analysis.

### 2.3 Integrated Managed Infrastructure
1. **Supabase (PostgreSQL 15+, Auth, Storage & Realtime):**
   - High-throughput relational database with Row Level Security (RLS).
   - Realtime WebSocket channels powering active participant presence, incoming call ringing events, and live chat notifications.
   - S3-compatible encrypted object storage for user avatars and verification identity documents.
2. **LiveKit Cloud / Self-Hosted SFU:**
   - Ultra-low latency voice mesh connecting call participants with WebRTC opus audio streams.
   - Server-to-server webhook callbacks (`participant_joined`, `participant_left`, `room_finished`) used for authoritative billing verification.
3. **Razorpay Payments Gateway:**
   - Native integration for India's payment rails: UPI (PhonePe, Google Pay, Paytm, BHIM), NetBanking, Debit/Credit Cards, and Wallets.
   - HMAC SHA-256 signature verification on server endpoints prevents counterfeit payment notifications.
4. **Google Gemini API (`@google/genai`):**
   - Automated screening of display names and biographies for hate speech, phone number leakage, and solicitation.
   - Async moderation evaluation on reported transcripts to assist human moderators with priority triaging.

---

## 3. High-Integrity Call Billing Architecture

A critical vulnerability in voice apps is client-side duration spoofing. In Nectar, **the client is never trusted for billing duration or rate calculation**.

### 3.1 Call Billing Lifecycle State Machine

```
[User Clicks Call]
       │
       ▼
[1. Pre-Flight Server Authorization]
  - Query host call_rate (e.g. 20 coins/min)
  - Verify caller wallet balance >= (rate * minimum_hold_minutes)
  - Verify caller and host are not blocked
  - If insufficient: prompt Coin Purchase Bottom Sheet
       │
       ▼
[2. Atomic Wallet Reservation]
  - Create row in `call_sessions` (status: 'initiating')
  - Lock wallet row: `SELECT coin_balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`
  - Reserve hold amount (e.g. 1 minute worth of coins) in `call_holds`
       │
       ▼
[3. LiveKit Room & Token Minting]
  - Generate temporary room name `call_{session_id}`
  - Issue LiveKit Token with 5-minute join validity
  - Dispatch incoming call signal via Supabase Realtime to Host
       │
       ▼
[4. Connection & Heartbeat Pulse]
  - Host accepts call: status becomes 'connected'
  - Server records exact `connected_at = NOW()`
  - LiveKit webhook triggers server billing pulses every 60 seconds
  - Each minute tick debits the next minute's rate atomically
  - If balance drops below 1 minute: trigger low-balance audio chime and disconnect warning
       │
       ▼
[5. Teardown & Financial Settlement]
  - Participant hangs up OR balance exhausted -> Room closed
  - LiveKit server sends `room_finished` with precise duration (seconds)
  - Server calculates final billable minutes = `CEIL(duration_seconds / 60.0)`
  - Reconciles reserved holds vs actual debited coins
  - Any unused reservation is unheld and restored to user balance
  - Creator's eligible earnings share is credited to `creator_earnings_ledger`
```

---

## 4. Virtual Economy & Double-Entry Ledger Schema

Coins and Creator Earnings are strictly decoupled:
- **Coins:** Virtual non-withdrawable platform currency purchased by users through INR payment packages.
- **Creator Earnings (INR):** Accrued fiat revenue earned by approved creators when receiving virtual gifts from users. A configurable platform revenue share (e.g., 60% creator, 40% platform) is applied upon gift settlement.

```
       [User Fiat INR] ────(Razorpay)────► [Platform Bank Account]
                                                     │
                                                     ▼
                                          [User Coins Credited]
                                                     │
                                            (Send Virtual Gift)
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
               [User Coins Burned / Debited]                   [Creator Earnings Credited (INR)]
                     (Platform Margin)                                (Withdrawable Balance)
                                                                             │
                                                                   (KYC Verified Payout)
                                                                             │
                                                                             ▼
                                                                 [Bank Transfer to Creator]
```

---

## 5. Security & Isolation Matrix

| Threat Vector | Mitigation Strategy | Enforced Layer |
|---|---|---|
| **Under-age Access** | Mandatory 18+ age confirmation checkbox & DOB validation during onboarding; unverified accounts quarantined | Auth Service & Client Guard |
| **Phone/Location Doxxing** | Zero phone numbers or GPS coordinates exposed in client APIs; only broad region (e.g. "Telangana, India") | Database View & Serialization |
| **Call Bill Evasion** | Pre-authorization holds + server-side LiveKit webhook duration reconciliation; auto-termination on 0 balance | Call Service & LiveKit Webhooks |
| **Replay / Fraud Top-Ups** | Cryptographic Razorpay HMAC signature validation + database unique constraint on `payment_id` | Payment Service / PostgreSQL |
| **Harassment & Stalking** | Bidirectional block rule enforced at database query level across search, matching, messaging, and calls | Supabase RLS & SQL Filters |
| **Secret Leakage** | API keys (`LIVEKIT_API_SECRET`, `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) restricted to server | Next.js Server Boundaries |

---

## 6. Background Workers & Observability

1. **Call Reconciliation Worker:**  
   Every 5 minutes, queries open `call_sessions` that haven't received a heartbeat in >120 seconds, confirms room status with LiveKit REST API, closes zombie calls, and releases pending wallet holds.
2. **Financial Audit Check:**  
   Nightly cron script checks mathematical parity between `SUM(ledger_entries.amount)` and cached `user_wallets.coin_balance`, alerting on any discrepancy.
3. **Presence Cleanup Worker:**  
   Prunes stale presence records in Redis/Supabase Realtime where client disconnect was ungraceful.
4. **Moderation Queue Triager:**  
   Prioritizes reported user profiles with Gemini toxicity scores > 0.85 to the top of the human moderator dashboard.
