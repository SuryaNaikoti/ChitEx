# Nectar — Documentation Gap & Reconciliation Analysis

> **Audit Identifier:** GATE04-AUDIT-02  
> **Scope:** Verification of All 7 Architecture Specifications vs. Codebase Reality  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Status:** DISCREPANCIES CATALOGUED

---

## 1. Documentation Alignment Overview

A comprehensive audit was performed across the 7 baseline engineering documents created in Gate 03. While the specifications are internally coherent and reflect senior-level architectural planning, **there are noticeable divergences between what is documented and what currently exists in code**, as well as unapproved commercial terms that must be formally ratified.

---

## 2. Identified Discrepancies & Gap Analysis Log

### Finding F-DOC-01: Framework & Directory Conflict (Next.js vs. Vite)
- **Finding ID:** `F-DOC-01`
- **Document Reference:** `README.md` (Sec 2), `PROJECT_CONVENTIONS.md` (Sec 1), `ARCHITECTURE.md` (Sec 2.1)
- **Documented Specification:**  
  All documents state that the system is built on **Next.js App Router** with a folder structure:
  ```
  src/app/(auth)/login
  src/app/(main)/discover
  src/app/(creator)/dashboard
  src/app/api/livekit/route.ts
  ```
- **Codebase Reality:**  
  The application is a client-rendered Vite SPA with standard React components:
  ```
  src/components/DiscoveryView.tsx
  src/components/MatchRadarView.tsx
  src/components/ActiveCallModal.tsx
  ```
  No `src/app/` directory exists.
- **Severity:** **HIGH**
- **Recommended Action:**  
  Reconcile the documentation once the executive decision regarding framework migration (Option A vs. Option B in `TECHNOLOGY_STACK_AUDIT.md`) is approved.

---

### Finding F-DOC-02: Database Schema vs. TypeScript Types Divergence
- **Finding ID:** `F-DOC-02`
- **Document Reference:** `SYSTEM_COMPONENTS.md` (Sec 3) vs. `/src/types/index.ts`
- **Documented Specification:**  
  The PostgreSQL schema in `SYSTEM_COMPONENTS.md` defines relational normalization across multiple tables:
  - `user_profiles` uses `UUID` primary keys referencing `auth.users(id)`.
  - Languages are normalized into `user_languages (user_id, language_code, is_primary)`.
  - Interests are normalized into `user_interests (user_id, interest_tag)`.
  - Call records maintain separate `call_sessions` and `call_holds` tables.
  - Transactions use snake_case database columns (`coin_balance`, `call_rate_coins_per_min`, `created_at`).
- **Codebase Reality:**  
  The TypeScript definitions in `/src/types/index.ts` represent a flattened, denormalized client-only schema using camelCase:
  ```typescript
  export interface UserProfile {
    id: string; // 'user_1' (not UUID)
    displayName: string;
    primaryLanguage: LanguageCode;
    supportedLanguages: LanguageCode[]; // Array, not relational join
    interests: string[]; // Array, not relational join
    callRatePerMin: number;
  }
  ```
- **Severity:** **MEDIUM**
- **Impact Analysis:**  
  Directly mapping Supabase query responses to the current frontend will fail without an explicit data transformer or generated Supabase type layer (`database.types.ts`).
- **Recommended Action:**  
  Create Supabase database generation types (`npx supabase gen types typescript`) and implement an explicit repository/mapper layer that translates PostgreSQL snake_case rows into client view models.

---

### Finding F-DOC-03: Commercial Business Rules Unratified by Product Owner
- **Finding ID:** `F-DOC-03`
- **Document Reference:** `MVP_SCOPE.md` (Sec 1.1), `ARCHITECTURE.md` (Sec 4)
- **Documented Specification:**  
  The documentation hardcodes the following financial rules:
  1. Creator Revenue Share: Fixed at **60% Creator / 40% Platform**.
  2. Payout Threshold: Minimum **₹500.00** before withdrawal requests are permitted.
  3. Welcome Bonus: Fixed at **30 Free Coins** upon 18+ onboarding.
  4. Starter Package Pricing: **₹49 for 50 coins** (~₹0.98 per coin).
- **Audit Reality:**  
  PRD Section 3.4 and Section 3.7 explicitly state:  
  *“Exact pricing, billing intervals, minimum charges and free allowances will be configurable.”*  
  *“These targets are hypotheses to validate, not guaranteed outcomes.”*  
  These commercial parameters have been coded as fixed constants rather than database-driven platform configurations.
- **Severity:** **MEDIUM**
- **Impact Analysis:**  
  Adjusting revenue splits or payout thresholds would require code modifications and redeployments rather than dynamic admin dashboard configuration.
- **Recommended Action:**  
  Move commercial terms into a database-backed `platform_settings` table so administrators can dynamically configure revenue shares, minimum payout thresholds, and welcome allowances without code changes.

---

### Finding F-DOC-04: SITEMAP.md Route Hierarchy vs. SPA View State
- **Finding ID:** `F-DOC-04`
- **Document Reference:** `SITEMAP.md` (Sec 1)
- **Documented Specification:**  
  Declares deep routes:
  - `/` (Landing)
  - `/login` & `/verify-otp`
  - `/onboarding/age`, `/onboarding/profile`, `/onboarding/languages`
  - `/call/[id]`
  - `/creator/dashboard`, `/creator/payouts`
  - `/admin/moderation`
- **Codebase Reality:**  
  All screens are rendered conditionally within a single URL (`/`) through `App.tsx` state variables. Direct deep-linking or browser refresh will fail to restore intermediate modal states.
- **Severity:** **MEDIUM**
- **Recommended Action:**  
  Implement client-side hash routing or push-state routing if staying on Vite, or map real file-system routes if migrating to Next.js.

---

### Finding F-DOC-05: Missing Acceptance Criteria for Edge-Case Call Terminations
- **Finding ID:** `F-DOC-05`
- **Document Reference:** `MVP_SCOPE.md` (Sec 2.1)
- **Documented Specification:**  
  Specifies AC-01 (insufficient coins blocking call), AC-02 (low-balance disconnect), and AC-03 (disconnect < 10s releases hold).
- **Missing Acceptance Criteria:**  
  1. Network partition / silent drop: No acceptance criteria defining maximum reconnection timeout before server auto-terminates session.
  2. Host abrupt disconnection: No acceptance criteria defining whether caller is billed for partial minutes if the recipient drops prematurely.
  3. LiveKit SFU outage: No fallback procedure defined if LiveKit webhook fails to fire.
- **Severity:** **LOW**
- **Recommended Action:**  
  Append AC-08 (Graceful Reconnection Timeout) and AC-09 (Webhook Delivery Failure Reconciliation) to `MVP_SCOPE.md`.
