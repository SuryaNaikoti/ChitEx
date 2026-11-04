# NECTAR — GATE 05B ARCHITECTURE & INTEGRATION READINESS REPORT

**Project:** Nectar (Voice-First Social Discovery & Entertainment Platform)  
**Milestone:** Gate 05B — Backend Architecture & Integration Preparation  
**Date:** November 2026  
**Status:** Architecture Complete — Ready for Review & Gate 06 Authorization  
**Author:** Principal Software Architect, Backend Architect & Security Engineer  

---

## 1. Executive Summary

Following the completion of **Gate 05A** (framework migration from Vite to Next.js 16.4.5 App Router) and **Gate 05A.1** (post-migration QA and regression validation under commit `6c5e3a7`), **Gate 05B** was convened to architect the production backend integration.

Per directives:
1. **Zero UI Disruption:** The existing 16 frontend prototype modules, Hinge/Raya-inspired minimal aesthetic, Web Audio synthesizer, and mock interactions remain 100% intact and functional.
2. **Zero Unauthorized Execution:** No live database tables were created, no migrations were executed in production, and no third-party credentials were live-provisioned.
3. **Comprehensive Specification:** Ten exhaustive architectural blueprints have been authored, validated, and placed under version control in `docs/architecture/`.

The platform is fully architected to transition from a simulated prototype into a production-grade, highly scalable voice discovery and monetization ecosystem tailored for the Indian market (Telugu, Hindi, English).

---

## 2. Repository & Technical Baseline Verification

| Attribute | Gate 04 Baseline | Gate 05A.1 Validated State | Gate 05B Target Architecture | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Framework** | React 18 + Vite SPA | Next.js 16.4.5 (App Router, Turbopack) | Next.js 16.4.5 App Router + Server Actions | **PASSED** |
| **UI Components** | Monolithic prototype | 16 modular components in `src/components/` | Preserved components with typed service hooks | **PASSED** |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/postcss`) | Tailwind CSS v4 in `src/app/globals.css` | Unchanged minimal dating-app aesthetic | **PASSED** |
| **TypeScript** | Strict mode enabled | Strict mode (`tsc --noEmit` clean: 0 errors) | Strict contracts across all models and APIs | **PASSED** |
| **Build State** | Vite build | Next.js production build (`next build` clean) | Server & Edge route compilation verified | **PASSED** |
| **Dev Server** | Port 3000 (Vite) | Port 3000 (Next.js 16) | Responding `HTTP 200 OK` on `0.0.0.0:3000` | **PASSED** |

---

## 3. Suite of Architectural Deliverables (Gate 05B)

The following 10 formal specifications have been authored and cross-referenced in `docs/architecture/`:

1. **`ARCHITECTURE.md`:** Global topology, modular monolith architecture, network boundaries, and deployment topology (AWS Mumbai `ap-south-1`).
2. **`SYSTEM_COMPONENTS.md`:** Tier decomposition, 16 UI-to-Service mappings, internal service interfaces, and data transformation boundaries.
3. **`BACKEND_INTEGRATION_PLAN.md`:** 5-phase progressive transition roadmap, dependency graph, testing milestones, and rollback protocols.
4. **`AUTHENTICATION_ARCHITECTURE.md`:** Supabase Phone OTP (+91 India SMS), Google OAuth, 18+ age verification compliance, session cookies via `@supabase/ssr`, and database RBAC.
5. **`DATABASE_ARCHITECTURE.md`:** Exhaustive relational schema for 17 subsystems, UUID primary keys, foreign keys, cascading constraints, indices, and RLS policies.
6. **`API_ARCHITECTURE.md`:** Next.js Route Handlers (`/api/*`), LiveKit token/webhook endpoints, Razorpay order/webhook endpoints, and RFC 7807 error formatting.
7. **`REALTIME_ARCHITECTURE.md`:** Dual real-time architecture: Supabase Realtime WSS channels for UI state synchronization + LiveKit WebRTC SFU for sub-50ms Opus voice streams.
8. **`SECURITY_ARCHITECTURE.md`:** STRIDE threat modeling, PostgreSQL RLS definitions, `SELECT FOR UPDATE` pessimistic locks, Razorpay HMAC-SHA256 verification, and India DPDP Act 2023 compliance.
9. **`ENVIRONMENT_VARIABLES.md`:** Strict separation of client (`NEXT_PUBLIC_*`) vs server-only secrets, runtime Zod validation schema, secret rotation, and `.env.example`.
10. **`INTEGRATION_DEPENDENCY_MAP.md`:** End-to-end multi-party data flows, timeout matrices, circuit breakers, fallback degradation, and regional network latency strategies.

---

## 4. Key Architectural Highlights & Engineering Decisions

### 4.1 Financial Ledger Invariance & Payout Model
- **Coin Value Separation:** In-app Coins are virtual tokens used for consumption. They do NOT hold direct monetary value until earned by creators through gifts or calls.
- **Provisional Commercial Parameters:**
  - Creator Revenue Share: **60%** (Configurable via `system_configurations`).
  - Platform Commission: **40%** (Configurable via `system_configurations`).
  - Minimum Creator Payout: **₹500** (Configurable via `system_configurations`).
- **Double-Entry Ledger:** Balance mutations are forbidden from client-side requests. Every credit/debit modifies `coin_wallets.balance_coins` atomically with an accompanying entry in `wallet_transactions` under pessimistic row locking (`SELECT FOR UPDATE`).

### 4.2 Legal & Age Protection Compliance (India DPDP Act 2023)
- Under Section 9 of the DPDP Act 2023, personal data processing of children requires verifiable parental consent. Nectar is classified as strictly **Adults-Only (18+)**.
- The onboarding flow mandates an immutable age declaration (`age_declared_18_plus = true`), capturing declaration timestamp and client IP in an immutable audit trail (`audit_logs`).
- Public profiles never expose raw phone numbers, exact GPS coordinates, or financial KYC information.

### 4.3 Dual Real-Time Model
- **Signalling & App State:** Managed over Supabase Realtime (WebSocket / PostgreSQL CDC) for presence, discovery match notifications, unread message badges, and gift animations.
- **Voice Media:** Routed directly through LiveKit Selective Forwarding Units (SFUs) located in Mumbai using encrypted WebRTC (DTLS-SRTP) with adaptive Opus audio (16–48 kbps), ensuring stability across fluctuating 4G/5G Indian mobile networks.

---

## 5. Five-Phase Implementation Roadmap (Gate 06 Preview)

```
Phase 1: Foundation & Identity (Supabase Auth, Profiles, 18+ Guard)
    │
    ▼
Phase 2: Economy & Wallet (Ledger, Razorpay Orders, Webhooks, Coin Packs)
    │
    ▼
Phase 3: Realtime Voice (LiveKit SFU, Room Tokens, Call Metering Loop)
    │
    ▼
Phase 4: Social Discovery & Gifting (Match Radar, Realtime Gifts, Chat)
    │
    ▼
Phase 5: Creator Hub, Payouts & Moderation (Earnings, KYC, Gemini Safety)
```

Each phase will be executed with:
1. Dedicated database migrations.
2. Server route handlers and service modules.
3. Seamless integration into existing UI components with automatic fallback to mock data when in development mode.
4. Production build and TypeScript validation at every milestone.

---

## 6. Risks, Trade-offs & Unresolved Items

1. **SMS Gateway Deliverability in India:**
   - *Risk:* DLT (Distributed Ledger Technology) registration requirements in India can delay transactional SMS delivery for phone OTPs.
   - *Mitigation:* Support Google OAuth alongside Phone OTP, with WhatsApp OTP as a secondary fallback provider.
2. **WebRTC Battery Consumption on Mobile Browsers:**
   - *Risk:* Prolonged audio streaming in mobile browsers can drain battery.
   - *Mitigation:* Audio-only track publishing with silence suppression and low bitrate Opus profiles.
3. **Creator Tax Withholding (TDS under Indian IT Act Section 194J/194M):**
   - *Decision Required:* Platform team must consult Indian legal counsel to determine whether 1% TDS (or applicable rate) must be deducted before issuing payouts above ₹50,000 annually. Current architecture supports pre-tax and post-tax accounting fields in `payout_requests`.

---

## 7. Gate 06 Readiness Assessment & Recommendation

| Gate 05B Readiness Criterion | Assessment | Evidence |
| :--- | :---: | :--- |
| **All Architecture Documents Authored** | **COMPLETE** | 10 comprehensive docs in `/docs/architecture/` |
| **Database Entities Fully Normalized** | **COMPLETE** | 17 relational schemas with UUIDs, RLS, & indices |
| **API Contracts Defined** | **COMPLETE** | RFC 7807 typed route handlers and webhook specs |
| **Security & Privacy Hardened** | **COMPLETE** | RLS policies, pessimistic locks, DPDP 2023 compliance |
| **No Premature Code Disruption** | **COMPLETE** | UI untouched, dev server clean, 0 TypeScript errors |

### Architect's Recommendation
**APPROVE Gate 05B.** Authorize progression to **Gate 06: Phase 1 — Database & Authentication Integration**.
*(Execution will remain paused until explicit user authorization is received).*
