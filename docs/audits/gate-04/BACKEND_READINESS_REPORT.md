# Nectar — Backend Integration Readiness & Dependency Report

> **Audit Identifier:** GATE04-AUDIT-06  
> **Scope:** Evaluation of All 10 Target Backend Integration Subsystems  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Status:** AUDITED — ARCHITECTURAL PREREQUISITES REQUIRED

---

## 1. Backend Subsystems Readiness Scorecard

| Integration Subsystem | Architecture Readiness | Schema / Spec Readiness | Codebase Integration Readiness | Primary Blocker |
|---|:---:|:---:|:---:|---|
| **1. Supabase PostgreSQL** | **High (90%)** | **High (95%)** | **Low (10%)** | SQL schema exists in `SYSTEM_COMPONENTS.md`, but no migrations executed; `@supabase/supabase-js` missing. |
| **2. Supabase Auth** | **High (85%)** | **High (90%)** | **Low (15%)** | Phone OTP + Google OAuth flows specified; requires Supabase client config & SMS gateway setup. |
| **3. Supabase RLS** | **High (90%)** | **High (90%)** | **Low (0%)** | Comprehensive RLS policies designed in docs; unapplied to a live database instance. |
| **4. Supabase Realtime** | **Medium (75%)** | **Medium (80%)** | **Low (10%)** | Channel topology designed for presence, incoming calls, and chat; unmounted in React hooks. |
| **5. LiveKit Voice Engine** | **High (85%)** | **High (85%)** | **Low (10%)** | Token minting flow and room lifecycle documented; `livekit-client` and `livekit-server-sdk` uninstalled. |
| **6. Razorpay Payments** | **High (90%)** | **High (90%)** | **Low (10%)** | Order creation & webhook signature verification documented; `razorpay` Node SDK uninstalled. |
| **7. Server Call Billing** | **High (85%)** | **High (90%)** | **Low (0%)** | Currently driven by client timer; requires server webhook listener and PostgreSQL transaction script. |
| **8. Creator Earnings** | **Medium (70%)** | **Medium (80%)** | **Low (15%)** | 60% revenue share logic verified; commercial rates unapproved; payout requires banking KYC checks. |
| **9. Push Notifications** | **Low (40%)** | **Medium (60%)** | **Low (5%)** | Service worker push notification handlers and Web Push VAPID keys not yet configured. |
| **10. Production Deployment**| **High (80%)** | **High (80%)** | **Medium (50%)** | Vite builds cleanly; Cloud Run URL functional; requires environment secrets injection. |

---

## 2. Granular Subsystem Evaluation

### 2.1 Supabase PostgreSQL & RLS (Readiness: High Spec / Low Code)
- **Status:** The DDL written in `SYSTEM_COMPONENTS.md` Section 3 is production-grade. It contains full relational table definitions (`user_profiles`, `user_languages`, `user_interests`, `user_blocks`, `user_reports`, `call_sessions`, `call_holds`, `user_wallets`, `wallet_ledger`, `virtual_gifts`, `creator_profiles`, `chat_messages`).
- **Prerequisites for Implementation:**
  1. Provision Supabase Cloud project or local Docker instance.
  2. Execute SQL migrations script in proper dependency order (Extensions -> Enums -> Tables -> Indexes -> RLS).
  3. Install `@supabase/supabase-js`.
  4. Generate TypeScript database types (`types/database.types.ts`).

### 2.2 LiveKit WebRTC Voice Integration (Readiness: Medium)
- **Status:** The voice room lifecycle is documented in `ARCHITECTURE.md` Section 3.
- **Prerequisites for Implementation:**
  1. Provision LiveKit Cloud project (get WebSocket URL, API Key, API Secret).
  2. Implement backend endpoint `POST /api/livekit/token` to mint cryptographically signed JWT tokens with 5-minute TTL.
  3. Replace Web Audio API synthesizer with `livekit-client` (`Room`, `RemoteAudioTrack`, `LocalAudioTrack`).
  4. Configure LiveKit webhook URL (`POST /api/livekit/webhook`) in LiveKit Cloud console for authoritative billing duration events.

### 2.3 Razorpay Payment Integration (Readiness: High Spec / Low Code)
- **Status:** The 3 coin packages (₹49, ₹199, ₹499) and double-entry ledger logic are fully specified.
- **Prerequisites for Implementation:**
  1. Provision Razorpay Merchant Account (Test Mode Key ID & Key Secret).
  2. Implement backend route `POST /api/payments/create-order` using `razorpay` SDK.
  3. Embed Razorpay Standard Checkout in frontend (`https://checkout.razorpay.com/v1/checkout.js`).
  4. Implement webhook receiver `POST /api/razorpay/webhook` with HMAC SHA-256 signature verification.
  5. Seed `coin_packages` table with verified pricing data.

### 2.4 Server-Authoritative Call Billing (Readiness: High Spec / Low Code)
- **Status:** The state machine (`initiating` -> `ringing` -> `connected` -> `ended`) is detailed in `ARCHITECTURE.md`.
- **Prerequisites for Implementation:**
  1. Create PostgreSQL stored procedure or transaction script for atomic wallet holds (`call_holds`).
  2. Bind minute-tick webhooks or background worker to debit coins every 60 seconds.
  3. Auto-terminate LiveKit room via LiveKit Server REST API (`DeleteRoom`) when user coin balance reaches 0.

---

## 3. Recommended Implementation Order (Phased Dependency Graph)

```
[Phase 1: Backend Scaffolding]
  1.1 Install Backend SDKs (@supabase/supabase-js, livekit-server-sdk, livekit-client, razorpay, zod)
  1.2 Configure .env with Supabase, LiveKit & Razorpay credentials
  1.3 Execute PostgreSQL Migrations & Enable RLS
         │
         ▼
[Phase 2: Authentication & Profiles]
  2.1 Wire Supabase Auth (Phone OTP + Google SSO)
  2.2 Bind 18+ Age Verification to user_profiles table
  2.3 Connect User Profiles & Discovery Feed to Supabase queries (with block filtering)
         │
         ▼
[Phase 3: Payments & Coin Ledger]
  3.1 Implement Razorpay Order Creation API
  3.2 Implement Razorpay Webhook with HMAC signature verification & idempotent ledger credit
  3.3 Wire Wallet UI to live PostgreSQL balances
         │
         ▼
[Phase 4: LiveKit Voice Rooms & Authoritative Billing]
  4.1 Implement Server Token Minting (POST /api/livekit/token) with pre-flight wallet check
  4.2 Wire client LiveKit Room Audio in ActiveCallModal
  4.3 Implement Server Webhook / Worker for minute-by-minute coin deduction
         │
         ▼
[Phase 5: Gifting, Creator Payouts & Moderation]
  5.1 Implement atomic gift dispatch (wallet debit -> creator INR credit)
  5.2 Wire Gemini API for automated toxicity evaluation on reported tickets
  5.3 Connect Moderator & Admin consoles to live PostgreSQL tables
```
