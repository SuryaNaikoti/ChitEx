# NECTAR — DEFERRED SECURITY & INTEGRATION ITEMS
**Milestone:** Gate 06A — Supabase Database Foundation  
**Classification:** Scope Bounding & Security Quarantine Register  
**Document Ref:** `docs/audits/gate-06a/DEFERRED_SECURITY_AND_INTEGRATION_ITEMS.md`  

---

## 1. Explicitly Deferred Capabilities

In strict accordance with the Gate 06A milestone mandate, the following architectural and security components are quarantined and deferred to subsequent gates:

| Item Reference | Component / Feature | Gate 06A Status | Target Milestone | Rationale & Security Dependency |
| :---: | :--- | :---: | :---: | :--- |
| **DEF-01** | Row Level Security (RLS) Activation | **DEFERRED** | Gate 06B / Gate 07 | Activating RLS before backend auth context and client SDK plumbing are tested creates lockouts and debugging complexity. Previewed in inactive migration `12`. |
| **DEF-02** | Stored Procedures & Atomic Mutations | **DEFERRED** | Gate 06B | Concurrency-controlled wallet mutations (`reserve_call_coins`, `process_coin_package_purchase`) require transaction and RPC test suites. |
| **DEF-03** | Razorpay Order API & Webhooks | **DEFERRED** | Gate 06C | Webhook verification requires live signature testing, idempotency replay harness, and gateway sandboxes. |
| **DEF-04** | LiveKit Room Token & Webhook Worker | **DEFERRED** | Gate 06D | Media negotiation, participant signaling, and live billing heartbeat cron worker require deployed WebRTC SFU endpoints. |
| **DEF-05** | Creator Payout Banking Disbursement | **DEFERRED** | Gate 06C / Gate 08 | Penny-drop verification, automated banking payouts, and TDS remittance reporting require external bank partner APIs. |
| **DEF-06** | Realtime WebSockets Subscriptions | **DEFERRED** | Gate 06B | Supabase Realtime channel authorization requires active Supabase Auth session tokens. |
| **DEF-07** | Client-Facing API Routes Implementation| **DEFERRED** | Gate 06B+ | Next.js server actions and API route handlers will be implemented alongside frontend state integration. |

---

## 2. Inactive RLS Policy Staging Protocol

All 18 canonical RLS policies from `RLS_POLICY_MATRIX.md` have been documented in:
`supabase/migrations/20261104000012_deferred_rls_policies_preview.sql`

This file is wrapped in multi-line commentary and carries explicit instructions that it must NOT be executed or applied until authorized by the Security and Architecture team in a subsequent gate.

The operational migrations (`01` through `11`) explicitly execute:
`ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;`
ensuring that tables exist in a clean, baseline state ready for step-by-step security hardening.

---

## 3. Financial Engine Safeguards

Until backend ledger stored procedures are activated:
1. No client-side code possesses permission to mutate `user_coin_wallets`, `creator_earnings_wallets`, or `financial_journal_entries`.
2. All financial balances are protected by database `CHECK (amount >= 0)` constraints.
3. The general ledger enforces zero-balance transaction invariants and exactly-once idempotency deduplication.
