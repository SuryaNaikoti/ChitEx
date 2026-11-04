# NECTAR — Backend Integration Plan & Implementation Roadmap (Canonical Alignment)
**Document Reference:** `docs/architecture/BACKEND_INTEGRATION_PLAN.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Project Management & Engineering Roadmap  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect & Engineering Lead  

---

## 1. Five-Phase Implementation Roadmap for Gate 06

The backend implementation will proceed in five discrete, sequential, independently testable phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: FOUNDATION, IDENTITY & AGE ASSURANCE                          │
│ • Database schema bootstrap: `profiles`, `private_user_profiles`       │
│ • Supabase Auth (SMS OTP + Google OAuth)                               │
│ • Mandatory 18+ age declaration & progressive tiering                  │
│ • Session cookies via `@supabase/ssr` & base RLS policies              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ECONOMY, GENERAL LEDGER & RAZORPAY PAYMENTS                   │
│ • Tables: `user_coin_wallets`, `financial_journal_entries`, orders     │
│ • Balanced double-entry general ledger procedures                      │
│ • Razorpay order creation, checkout modal, & HMAC webhook verification │
│ • Idempotent coin crediting & balance reconciliation                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: SERVER-AUTHORITATIVE VOICE CALLING & METERING                 │
│ • Tables: `call_sessions`, `call_coin_holds`                           │
│ • LiveKit Cloud WebRTC SFU room creation & scoped token generation     │
│ • Pre-call fund reservation hold placement & solvency assertion       │
│ • Out-of-process 60s metering worker & low-balance cutoff              │
│ • LiveKit participant webhooks & call settlement procedures            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: SOCIAL DISCOVERY, MATCHING & VIRTUAL GIFTING                  │
│ • Tables: `discovery_swipes`, `matches`, `conversations`, `messages`   │
│ • Filtered discovery feed with bidirectional block isolation           │
│ • Mutual match real-time events & chat channels                        │
│ • In-call virtual gift dispatch with atomic creator accrual            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: CREATOR MONETIZATION, PAYOUTS & MODERATION GOVERNANCE         │
│ • Tables: `creator_profiles`, `creator_kyc_details`, `payout_requests` │
│ • Creator audition application & admin approval workflow               │
│ • Encrypted PAN & bank/UPI storage (AES-256)                           │
│ • Payout withdrawal escrow, TDS tax withholding calculation            │
│ • Moderation reports, appeals, Gemini AI safety classification         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Gate 06 Phase Verification Gates & Rollback Criteria

| Phase | Core Deliverable | Acceptance Criteria | Rollback Condition |
| :---: | :--- | :--- | :--- |
| **01** | Identity & Auth | Clean OTP login, session cookie set, 18+ declaration recorded in `audit_logs` | Auth cookie fails to persist or RLS allows unauthorized profile access |
| **02** | Economy & Ledger | Order paid, webhook verifies HMAC, coins credited, general ledger balanced | Double-spending or balance mismatch detected in reconciliation |
| **03** | LiveKit Calling | Two users connect via WebRTC, hold placed, 60s debits execute, disconnect on 0 balance | Audio packet drops > 20% or billing executes from client timer |
| **04** | Discovery & Chat | Matching creates chat, bidirectional block hides profiles, gift transfers execute | Mutual like fails to create match or blocked user appears in feed |
| **05** | Creator & Safety | Payout reservations balance, encrypted KYC verified, reports actionable | Payout executes without KYC confirmation or unverified creator receives calls |
