# NECTAR — GATE 05B.2 ARCHITECTURAL REMEDIATION REGISTER
**Document Reference:** `docs/architecture/GATE_05B_2_REMEDIATION_REGISTER.md`  
**Milestone:** Gate 05B.2 — Independent Architecture Verification & Remediation  
**Classification:** Confidential — Engineering & Audit Tracking  
**Auditor:** Independent Principal Software Architect, PostgreSQL Security Engineer & Financial Systems Architect  
**Status:** All Technical Defects Remediated; Unresolved Business/Legal Decisions Registered  

---

## 1. Remediation Register Overview

This register documents every defect identified during the Gate 05B.2 independent inspection across database architecture, double-entry financial accounting, server-authoritative call billing, Row Level Security, age assurance, and API consistency.

---

## 2. Master Remediation Log

| Issue ID | Severity | Source Document & Section | Defect Description | Technical & Security Consequence | Remediation Performed | Verification Evidence | Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **REM-01** | **CRITICAL** | `FINANCIAL_ACCOUNTING_SPECIFICATION.md` §4.1, §4.2, §4.5 | **Single-Ledger Currency Mixing:** The general ledger journal templates placed `COIN` and `INR_SUBUNIT` (Paise) in the same entries with unequal numeric sums ($60 \text{ COIN} \neq 600 \text{ Paise}$). | Broke fundamental double-entry general ledger invariance ($\sum \text{Debits} \equiv \sum \text{Credits}$). Ledgers would fail mathematical balancing and automated balance reconciliation audits. | Redesigned into a balanced **Dual-Ledger Architecture**: (1) Fiat Ledger (denominated in `INR_SUBUNIT` with new accounts `2015 unearned_coin_fiat_reserve`), (2) Token Ledger (denominated in `COIN` with account `9010 virtual_coin_issuance_clearing`). | Every transaction group balances independently with $\Delta = 0$. Demonstrated in §4 of Financial Spec. | **RESOLVED** |
| **REM-02** | **HIGH** | `CALL_BILLING_SPECIFICATION.md` §3.3; `CANONICAL_SCHEMA_REGISTRY.md` | **Missing Concurrency & Interval Tracker in Call Sessions:** `call_sessions` lacked columns to record atomic intervals debited or last billing timestamp during active calls. | Concurrent worker executions or retried scheduled ticks could double-charge minutes or cause race conditions between worker ticks and user hangups. | Added `minutes_billed INT NOT NULL DEFAULT 0` and `last_billed_at TIMESTAMPTZ` to `call_sessions`. Updated stored procedure `deduct_call_minute` to check `minutes_billed >= target_minute` under row locks. | Verified idempotent interval execution logic in `CALL_BILLING_SPECIFICATION.md` §3.3. | **RESOLVED** |
| **REM-03** | **HIGH** | `CALL_BILLING_SPECIFICATION.md` §3.1, §3.4 | **Missing Automated Sweeper for Abandoned Holds:** If a callee never answers or a network dropped before room establishment, pre-call holds remained in `status = 'reserved'`. | User coins remained locked in escrow indefinitely, leading to unresolvable artificial coin depletion. | Implemented `sweep_expired_call_holds()` stored procedure running on a 60-second scheduled worker to release expired holds where `status = 'reserved' AND expires_at < NOW()`. | Stored procedure documented with row-level locks and automatic caller balance refund. | **RESOLVED** |
| **REM-04** | **HIGH** | `RLS_POLICY_MATRIX.md` §2, §3.1 | **Unpinned search_path & Missing Revocations on Security Definer Functions:** Helper functions used `SET search_path = public;` and lacked explicit `REVOKE ALL ... FROM PUBLIC;`. Also contained subquery querying `profiles` inside `profiles` update check. | Search-path injection risk (CVE-2018-1058); unprivileged users could invoke internal security definer functions directly; subquery could read uncommitted update rows. | Updated all helper functions to pin `SET search_path = pg_catalog, public;`. Added explicit `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated, service_role;`. Replaced subquery with `auth_user_is_suspended()`. | Verified SQL blocks in `RLS_POLICY_MATRIX.md` §2. | **RESOLVED** |
| **REM-05** | **MEDIUM** | `AUTHENTICATION_ARCHITECTURE.md` §2; `UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md` §2.1 | **Conflation of Payment Instrument KYC with Statutory Age Assurance:** Prior documentation implied payment verification constituted verified proof of legal majority (18+). | In India, minors routinely transact via UPI or parents' cards. Claiming payment verification equals legal age verification creates non-compliance liability under DPDP Act 2023 Section 9. | Explicitly clarified that Tier 2 `verified_payment` is an operational risk-reduction threshold and anti-fraud indicator, NOT statutory proof of majority under Indian law. Registered DigiLocker/Aadhaar integration requirement for counsel review. | Documented in `AUTHENTICATION_ARCHITECTURE.md` §2 and `UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md` §2.1. | **RESOLVED** |
| **REM-06** | **MEDIUM** | `SECURITY_ARCHITECTURE.md` §4; `CANONICAL_SCHEMA_REGISTRY.md` §3.2 | **Missing Key Management (KMS) Specification for Creator KYC Data:** Schema specified `pan_number_encrypted` and `bank_account_number_encrypted` but lacked KMS key hierarchy and rotation rules. | Risk of developers storing cryptographic keys in environment variables or alongside PostgreSQL data, violating Indian banking and data security norms. | Specified AWS KMS / Cloud KMS (`ap-south-1`) master key hierarchy with 90-day Data Encryption Key (DEK) envelope encryption, access audit logging, and zero plaintext persistence. | Documented in `SECURITY_ARCHITECTURE.md` §4 and `UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md` §2.1. | **RESOLVED** |
| **REM-07** | **LOW** | `CALL_BILLING_SPECIFICATION.md` §3.5 | **Lack of Advance Low-Balance Warning:** The system abruptly terminated calls at balance = 0 without prior warning. | Degrades user experience; users have no opportunity to top up coins or politely conclude calls. | Specified 60-second advance warning push event (`low_balance_warning`) broadcast over Supabase Realtime channel `user:wallet:<userId>` when balance drops below 2 minutes of call rate. | Documented in `CALL_BILLING_SPECIFICATION.md` §3.5. | **RESOLVED** |

---

## 3. Summary of Remediation Results

- **Critical Severity Issues Remediated:** 1 (Double-entry journal balancing).
- **High Severity Issues Remediated:** 3 (Call concurrency tracker, hold sweeper, RLS security definer hardening).
- **Medium Severity Issues Remediated:** 2 (Payment KYC clarification, KMS key management).
- **Low Severity Issues Remediated:** 1 (Advance low-balance warning).
- **Total Technical Issues Resolved:** 7 of 7.
- **Unresolved Business & Legal Decisions Remaining:** Formally documented and categorized in `UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md` for stakeholder authorization.
