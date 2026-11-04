# Nectar — Gate 04: Engineering Approval & Readiness Checklist

> **Milestone:** Gate 04 Engineering Verification & Backend Readiness Audit  
> **Target Release:** Nectar V1 Core MVP  
> **Auditor:** Principal Software Architect  
> **Audit Date:** 2026-11-04  
> **Current Recommendation:** CONDITIONAL APPROVAL WITHHELD PENDING RESOLUTION OF BLOCKERS

---

## 1. Gate 04 Verification Audit Checklist

### Section 1: Technology Stack & Build Hygiene
- [x] **Repository File Tree Verified:** All files and components catalogued.
- [x] **TypeScript Strict Compilation:** `tsc --noEmit` completes with 0 errors.
- [x] **Tailwind CSS v4 Configuration:** Compiles cleanly with zero style conflicts.
- [!] **Framework Architecture Alignment:** Discrepancy identified (Vite SPA vs. Next.js App Router). *Requires Executive Sign-Off.*
- [ ] **Backend Server Entry Point:** `server.ts` unmounted; backend API routes unmounted.

### Section 2: Documentation & Specifications
- [x] **PRD Baseline Approved:** Product Requirements Document Version 1.0 verified.
- [x] **Architecture Blueprint Authored:** `ARCHITECTURE.md` modular monolith model approved.
- [x] **Conventions Specification Authored:** `PROJECT_CONVENTIONS.md` coding rules established.
- [x] **PostgreSQL Schema DDL Authored:** `SYSTEM_COMPONENTS.md` relational schema designed.
- [!] **Schema vs. TypeScript Reconciliation:** Data model mapper required for snake_case DB columns vs. camelCase frontend types.
- [!] **Commercial Terms Documented as Unapproved:** 60% revenue share & ₹500 payout threshold flagged as configurable hypotheses.

### Section 3: Frontend Prototype Verification
- [x] **18+ Age Assurance UI:** Verification modal with DOB gating and legal affirmation functional.
- [x] **User Discovery Feed:** Portrait cards, online presence dots, and audio waveform preview functional.
- [x] **Language Partitioning:** Telugu (`te`), Hindi (`hi`), English (`en`) filters functional.
- [x] **Random Voice Match Radar:** Concentric breathing rings, 15-second handshake card functional.
- [x] **Voice Calling Screen:** Minimal intimate audio UI, live duration timer, mic toggle functional.
- [x] **Virtual Gifting Interface:** In-call & standalone gift dispatch with Web Audio fanfare functional.
- [x] **Wallet & Package Selection:** ₹49, ₹199, ₹499 Razorpay package cards functional.
- [x] **1:1 Messaging Interface:** Direct text chat thread functional.
- [x] **Host Earnings Portal:** Withdrawable INR statement & UPI payout modal functional.
- [x] **Moderation Console:** Gemini toxicity badges & action triggers functional.
- [x] **Admin Analytics Dashboard:** High-level platform KPIs functional.
- [!] **Integration Reality Check:** Verified that all 16 features operate exclusively via in-memory mock data. Zero live cloud integrations exist.

### Section 4: Financial Integrity & Security Controls
- [!] **Call Billing Server Authority:** Client-side `setInterval` billing flagged as CRITICAL risk; must be moved to server webhook.
- [!] **Payment Webhook Verification:** Simulated checkout flagged as CRITICAL risk; Razorpay HMAC SHA-256 validation required.
- [!] **Concurrency Protection:** Row-level locks (`SELECT FOR UPDATE`) required before live multi-user transactions.
- [!] **Role Escalation Prevention:** Client-side role switcher flagged as CRITICAL risk; server-side RBAC and RLS required.
- [!] **LiveKit Token Security:** Enforced that LiveKit tokens must never be minted in client bundles.

---

## 2. Executive Decisions Required Before Gate 05 Implementation

Before backend migrations and integration coding begin, the Engineering Leadership and Product Owner must formally decide on the following 4 items:

### Decision 1: Framework Forward Path
- [ ] **Option A:** Rewrite application to Next.js App Router (100% PRD Rule 1 compliance; estimated 8–12 hours migration overhead).
- [ ] **Option B (Recommended):** Approve Full-Stack Express + Vite SPA baseline (Activate `server.ts` for LiveKit/Razorpay/Supabase; zero frontend disruption).

### Decision 2: Commercial Parameters Ratification
- [ ] **Creator Revenue Share:** Formally approve 60% Creator / 40% Platform split (or specify alternate tiered percentages).
- [ ] **Minimum Payout Threshold:** Formally approve ₹500.00 withdrawal threshold.
- [ ] **Welcome Bonus Allowance:** Formally approve 30 Free Coins upon 18+ registration.

### Decision 3: Cloud Credentials Provisioning
- [ ] **Supabase:** Cloud project provisioned with URL, Anon Key, and Service Role Key.
- [ ] **LiveKit Cloud:** WebRTC project provisioned with WebSocket URL, API Key, and API Secret.
- [ ] **Razorpay:** Merchant Test Account provisioned with Key ID, Key Secret, and Webhook Secret.
- [ ] **Google Gemini:** Cloud project API key active for toxicity evaluation.

### Decision 4: Age Verification Legal Baseline
- [ ] Formally approve the self-attestation DOB + legal checkbox model for V1 MVP, with server-side immutable audit logging in `user_profiles.age_verified_at`.

---

## 3. Formal Sign-Off Record

| Role | Name | Status | Signature / Date |
|---|---|:---:|---|
| **Principal Software Architect** | AI Studio Senior Auditor | **AUDITED** | 2026-11-04 (Signed) |
| **Product Owner** | — | *Pending Decision* | — |
| **Security & Compliance Lead** | — | *Pending Decision* | — |
