# NECTAR — GATE 05B.3 SECURITY & FINANCIAL TEST PLAN
**Document Reference:** `docs/architecture/GATE_05B_3_SECURITY_AND_FINANCIAL_TEST_PLAN.md`  
**Milestone:** Gate 05B.3 — Financial Invariants & RLS Security Correction  
**Classification:** Confidential — Quality Assurance & Security Engineering  
**Status:** SPECIFIED / READY FOR EXECUTION (Awaiting Gate 06 Database Implementation)  
**Author:** Senior Financial Systems Architect & PostgreSQL Security Engineer  

---

## 1. Scope & Execution Rules

1. **Purpose:** This document specifies explicit, mathematically deterministic test cases to validate the financial ledger invariants and creator approval security controls prior to Gate 06 database provisioning.
2. **Execution Boundary:** Because Gate 05B.3 is strictly an architectural remediation milestone, **no database migrations or live tables have been provisioned in this milestone**.
3. **Execution Status:** Every test case is formally marked **`SPECIFIED / READY FOR EXECUTION`**. In accordance with engineering integrity principles, no test is falsely claimed as "PASSED" until executed against live PostgreSQL instances in Gate 06.

---

## 2. Test Suite 1: Financial Accounting & Invariant Verification

### TC-FIN-01: Starter Package Purchase (₹99.00 for 1,000 Coins)
- **Subsystem:** Subsystem 06 (Financial Ledger & Payment Orders)
- **Requirement:** Section 4.1 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - User wallet `user_coin_wallets`: `available_coins = 0`, `unearned_reserve_paise = 0`.
  - Payment Order: `amount_paise = 9900`, `coins_purchased = 1000`.
- **Execution Action:**
  - Razorpay webhook `payment.captured` triggers `process_coin_package_purchase`.
- **Expected Ledger Entries:**
  - **Fiat Ledger (`INR_SUBUNIT`):**
    - Debit `1010 cash_gateway_clearing`: 9,900 paise.
    - Credit `2060 gst_output_tax_payable`: 1,510 paise (18% SAC 998439).
    - Credit `2015 unearned_coin_fiat_reserve`: 8,390 paise (Ind AS 115 deferred liability).
    - Debit `4010 gateway_processing_fee_expense`: 234 paise (2.36% MDR).
    - Credit `1010 cash_gateway_clearing`: 234 paise.
    - *Subtotal:* Debit = 10,134 paise, Credit = 10,134 paise ($\Delta = 0$).
  - **Token Ledger (`COIN`):**
    - Debit `9010 virtual_coin_issuance_clearing`: 1,000 coins.
    - Credit `2010 user_coin_liability`: 1,000 coins ($\Delta = 0$).
- **Expected Wallet Mutation:**
  - `user_coin_wallets.available_coins = 1000`.
  - Effective net rate per coin = 8.390 paise.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-02: Volume Discounted Package Purchase (Popular: ₹249.00 for 3,000 Coins)
- **Subsystem:** Subsystem 06 (Financial Ledger & Payment Orders)
- **Requirement:** Section 3.3 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - User wallet: `available_coins = 0`.
- **Execution Action:**
  - Purchase processed for `tier_popular_3000` (₹249.00 = 24,900 paise).
- **Expected Ledger Entries:**
  - **Fiat Ledger (`INR_SUBUNIT`):**
    - Debit `1010 cash_gateway_clearing`: 24,900 paise.
    - Credit `2060 gst_output_tax_payable`: 3,798 paise (18% GST).
    - Credit `2015 unearned_coin_fiat_reserve`: 21,102 paise.
    - Debit `4010 gateway_processing_fee_expense`: 588 paise (2.36% MDR).
    - Credit `1010 cash_gateway_clearing`: 588 paise.
    - *Subtotal:* Debit = 25,488 paise, Credit = 25,488 paise ($\Delta = 0$).
  - **Token Ledger (`COIN`):**
    - Debit `9010`: 3,000 coins, Credit `2010`: 3,000 coins ($\Delta = 0$).
- **Expected Invariant:** Effective net realization per coin = $\frac{21,102}{3,000} = 7.034\text{ paise/coin}$.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-03: Voice Call Minute Consumption (60 Coins / Minute)
- **Subsystem:** Subsystem 04 (Voice Calling) & Subsystem 06 (Ledger)
- **Requirement:** Section 4.2 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md` & `CALL_BILLING_SPECIFICATION.md`
- **Initial State:**
  - Caller wallet holds 1,000 coins from Starter package (Net rate: 8.390 paise/coin).
  - Creator earnings wallet: `available_balance_inr = 0.00`.
  - Call session active at `rate_coins_per_minute = 60`.
- **Execution Action:**
  - Out-of-process runner invokes `deduct_call_minute(call_session_id, 1)`.
- **Expected Calculations:**
  - Reserve extinguished: $\text{Round}(60 \times 8.390) = 503\text{ paise (₹5.03)}$.
  - Creator accrual (60%): $\text{Round}(503 \times 0.60) = 302\text{ paise (₹3.02)}$.
  - Platform revenue (40%): $503 - 302 = 201\text{ paise (₹2.01)}$.
- **Expected Ledger Entries:**
  - **Token Ledger:** Debit `2010 user_coin_liability` 60, Credit `9010 issuance_clearing` 60.
  - **Fiat Ledger:** Debit `2015 unearned_reserve` 503, Credit `2020 creator_payable` 302, Credit `3010 platform_revenue` 201.
  - *Subtotal:* Debit = 503 paise, Credit = 503 paise ($\Delta = 0$).
- **Expected State Mutex:**
  - Caller `user_coin_wallets.available_coins` decrements from 1,000 to 940.
  - Creator `creator_earnings_wallets.available_balance_inr` increments to 3.02.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-04: Virtual Gift Dispatch (500 Coins)
- **Subsystem:** Subsystem 06 (Financial Ledger & Gifting)
- **Requirement:** Section 4.3 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - Sender wallet: `available_coins = 940`.
  - Gift `crown`: `coin_price = 500`.
- **Execution Action:**
  - Sender dispatches gift via `process_virtual_gift_transfer`.
- **Expected Ledger Entries:**
  - Reserve extinguished: $500 \times 8.390 = 4,195\text{ paise (₹41.95)}$.
  - Creator accrual (60%): $\text{Round}(4,195 \times 0.60) = 2,517\text{ paise (₹25.17)}$.
  - Platform revenue (40%): $4,195 - 2,517 = 1,678\text{ paise (₹16.78)}$.
  - **Token Ledger:** Dr `user_coin_liability` 500, Cr `issuance_clearing` 500.
  - **Fiat Ledger:** Dr `unearned_reserve` 4,195, Cr `creator_payable` 2,517, Cr `platform_revenue` 1,678 ($\Delta = 0$).
- **Expected State Mutex:**
  - Sender `available_coins = 440`.
  - Row created in `virtual_gift_transfers`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-05: Multi-Package Partial Consumption (WAC Lot Allocation)
- **Subsystem:** Subsystem 06 (Financial Ledger)
- **Requirement:** Section 4.4 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - User holds 500 remaining Starter coins (reserve = 4,195 paise).
  - User purchases Popular package (3,000 coins, reserve = 21,102 paise).
  - Combined available coins: 3,500. Combined unearned reserve: 25,297 paise.
  - Blended Weighted Average Cost (WAC): 7.2277 paise/coin.
- **Execution Action:**
  - User spends 100 coins on voice call.
- **Expected Calculations:**
  - Extinguished reserve: $\text{Round}(100 \times 7.2277) = 723\text{ paise (₹7.23)}$.
  - Creator accrual (60%): $\text{Round}(723 \times 0.60) = 434\text{ paise (₹4.34)}$.
  - Platform share (40%): $723 - 434 = 289\text{ paise (₹2.89)}$.
- **Expected Ledger Invariance:** $\text{Debit (723)} = \text{Credit (434 + 289) = 723}$. Zero residual drift.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-06: Creator Payout Lifecycle with TDS Withholding
- **Subsystem:** Subsystem 06 (Creator Payouts)
- **Requirement:** Section 4.5 & 4.6 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - Creator wallet: `available_balance_inr = 1,200.00`.
- **Execution Phase 1 (Request Submission):**
  - Creator submits payout request for ₹1,000.00 (100,000 paise).
  - Ledger: Dr `2020 creator_payable_liability` 100,000, Cr `2030 creator_payout_escrow` 100,000 ($\Delta = 0$).
  - Wallet state: `available_balance_inr = 200.00`, `pending_payout_inr = 1,000.00`.
- **Execution Phase 2 (Bank Settlement with 1% Section 194-O TDS):**
  - Banking gateway confirms transfer.
  - Ledger:
    - Dr `2030 creator_payout_escrow`: 100,000 paise.
    - Cr `2040 creator_tds_tax_payable`: 1,000 paise (₹10.00).
    - Cr `1010 cash_gateway_clearing`: 99,000 paise (₹990.00 net disbursed).
    - *Subtotal:* Debit = 100,000, Credit = 100,000 ($\Delta = 0$).
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-07: Full Refund on Unspent Coins
- **Subsystem:** Subsystem 06 (Refunds & Reversals)
- **Requirement:** Section 4.7 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - User purchased Starter package (1,000 coins for ₹99.00) and spent 0 coins.
- **Execution Action:**
  - Administrative authorization of order refund.
- **Expected Ledger Entries:**
  - **Token Ledger:** Dr `2010 user_coin_liability` 1,000, Cr `9010 issuance_clearing` 1,000.
  - **Fiat Ledger:**
    - Dr `2015 unearned_coin_fiat_reserve`: 8,390 paise.
    - Dr `2060 gst_output_tax_payable`: 1,510 paise.
    - Cr `1010 cash_gateway_clearing`: 9,900 paise.
    - *Subtotal:* Debit = 9,900, Credit = 9,900 ($\Delta = 0$).
- **Expected State Mutex:** User `available_coins = 0`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-FIN-08: Chargeback with Partially Consumed Coins
- **Subsystem:** Subsystem 06 & Subsystem 07 (Safety & Chargebacks)
- **Requirement:** Section 4.8 of `FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- **Initial State:**
  - User purchased Starter package (1,000 coins for ₹99), consumed 600 coins on creator calls, 400 coins remain.
  - Razorpay sends `dispute.created` for ₹99.00 + ₹50.00 dispute penalty fee.
- **Execution Action:**
  - Chargeback webhook processor executes.
- **Expected Ledger Treatment:**
  - Unspent coins (400) clawed back: Dr `user_coin_liability` 400, Cr `issuance_clearing` 400.
  - Extinguish remaining unearned reserve: $400 \times 8.390 = 3,356\text{ paise}$.
  - Creator earnings (from 600 coins spent) are **NOT clawed back**.
  - Platform absorbs loss:
    - Dr `2015 unearned_reserve`: 3,356 paise.
    - Dr `3010 platform_earned_revenue`: 2,014 paise (Reversal of platform commission).
    - Dr `4020 promotional_coin_reserve`: 3,020 paise (Absorption of creator earnings).
    - Dr `2060 gst_output_tax_payable`: 1,510 paise (GST dispute reversal).
    - Dr `4010 gateway_processing_fee_expense`: 5,000 paise (₹50 dispute penalty).
    - Cr `1010 cash_gateway_clearing`: 14,900 paise (₹149 total deduction by gateway).
    - *Subtotal:* Debit = 14,900, Credit = 14,900 ($\Delta = 0$).
- **Expected Security State:** User `profiles.is_suspended = TRUE`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

## 3. Test Suite 2: Creator Approval RLS & Privilege Security

### TC-SEC-01: Creator Client Self-Approval Attempt
- **Subsystem:** Subsystem 02 (Creator Platform & Access Control)
- **Security Requirement:** `RLS_POLICY_MATRIX.md` §3.2 & Section 3 of `SECURITY_ARCHITECTURE.md`
- **Initial State:**
  - User `C1` authenticated with JWT `role: 'authenticated'`.
  - `creator_profiles` record for `C1` has `verification_status = 'pending_review'`.
- **Execution Action:**
  - Client sends direct SQL/PostgREST update:
    ```sql
    UPDATE creator_profiles 
    SET verification_status = 'approved' 
    WHERE user_id = auth.uid();
    ```
- **Expected Result:**
  - **SQL Error Thrown:** PostgreSQL rejects update at permission checking stage:
    `ERROR: permission denied for column "verification_status" of relation "creator_profiles"`
  - Status remains `'pending_review'`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-02: Creator Usage Counters Tampering Attempt
- **Subsystem:** Subsystem 02 (Creator Metrics)
- **Security Requirement:** Column-level grant restrictions & `trg_protect_creator_profile_fields`
- **Initial State:**
  - User `C1` authenticated. `total_minutes_spoken = 15`.
- **Execution Action:**
  - Client submits update:
    ```sql
    UPDATE creator_profiles 
    SET total_minutes_spoken = 9999, rating_average = 5.00 
    WHERE user_id = auth.uid();
    ```
- **Expected Result:**
  - **SQL Error Thrown:** `ERROR: permission denied for column "total_minutes_spoken" of relation "creator_profiles"`.
  - Metrics remain unchanged.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-03: Creator Legitimate Settings Update
- **Subsystem:** Subsystem 02 (Creator Settings)
- **Security Requirement:** Whitelisted column grants on `creator_profiles`
- **Initial State:**
  - User `C1` authenticated. `is_available_for_calls = FALSE`, `call_rate_coins_per_minute = 60`.
- **Execution Action:**
  - Client submits update:
    ```sql
    UPDATE creator_profiles 
    SET is_available_for_calls = TRUE, 
        call_rate_coins_per_minute = 100,
        voice_intro_url = 'https://storage.nectar.app/voice/intro_123.mp3'
    WHERE user_id = auth.uid();
    ```
- **Expected Result:**
  - **Success:** Row updated successfully.
  - Return code: `UPDATE 1`.
  - Non-recursive RLS policy evaluates identity in sub-millisecond time.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-04: Unauthorized Non-Admin (Moderator / Regular User) Approval Attempt
- **Subsystem:** Subsystem 02 & Subsystem 07 (RBAC Hardening)
- **Security Requirement:** Hardened role check in `admin_set_creator_verification`
- **Initial State:**
  - User `M1` authenticated with `profiles.role = 'moderator'`.
  - Creator `C1` has `verification_status = 'pending_review'`.
- **Execution Action:**
  - Moderator attempts to call verification stored procedure:
    ```sql
    SELECT admin_set_creator_verification('C1_UUID', 'approved', 'Moderator approval attempt');
    ```
- **Expected Result:**
  - **Exception Raised:** `ERROR: ACCESS_DENIED: Only platform administrators can verify or reject creators.`
  - State of `C1` remains `'pending_review'`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-05: Authorized Administrator Approval via Hardened Procedure
- **Subsystem:** Subsystem 02 & Subsystem 07 (Admin Operations)
- **Security Requirement:** Hardened `SECURITY DEFINER` stored procedure
- **Initial State:**
  - User `A1` authenticated with `profiles.role = 'admin'`.
  - Creator `C1` has `verification_status = 'pending_review'`. User profile `C1` has `role = 'user'`.
- **Execution Action:**
  - Admin calls:
    ```sql
    SELECT admin_set_creator_verification('C1_UUID', 'approved', 'KYC verified and approved');
    ```
- **Expected Result:**
  - `creator_profiles.verification_status` updates to `'approved'`.
  - `profiles.role` promotes from `'user'` to `'creator'`.
  - Output: `{"success": true, "old_status": "pending_review", "new_status": "approved"}`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-06: Immutable Audit Log Generation upon Approval
- **Subsystem:** Subsystem 07 (Platform Governance)
- **Security Requirement:** Audit logging requirement in `admin_set_creator_verification`
- **Initial State:** State immediately following TC-SEC-05 execution.
- **Verification Query:**
  ```sql
  SELECT action, resource_type, resource_id, actor_id, metadata
  FROM audit_logs
  WHERE resource_id = 'C1_UUID' AND action = 'creator_verification_status_updated';
  ```
- **Expected Record:**
  - `action`: `'creator_verification_status_updated'`.
  - `resource_type`: `'creator_profiles'`.
  - `resource_id`: `'C1_UUID'`.
  - `actor_id`: `'A1_UUID'`.
  - `metadata`: `{"old_status": "pending_review", "new_status": "approved", "reason": "KYC verified and approved", "authorized_by": "admin"}`.
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

### TC-SEC-07: Non-Recursive RLS Query Verification
- **Subsystem:** Subsystem 02 (PostgreSQL Performance & Security)
- **Security Requirement:** Elimination of self-referential subqueries in RLS policies
- **Verification Query:**
  ```sql
  EXPLAIN (ANALYZE, BUFFERS) 
  UPDATE creator_profiles 
  SET is_available_for_calls = TRUE 
  WHERE user_id = auth.uid();
  ```
- **Expected Query Plan:**
  - Single index scan on `creator_profiles_user_id_key`.
  - Zero secondary scans or subquery loops referencing `creator_profiles`.
  - Plan cost: $< 10.0$ cost units. Zero recursion error (`ERROR: 42P17` impossible).
- **Status:** `SPECIFIED / READY FOR EXECUTION`

---

## 4. Test Summary Matrix

| Test Case ID | Test Category | Target Component | Expected Behavior | Execution Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-FIN-01** | Financial Accounting | Starter Purchase (₹99) | GST (1,510p), Reserve (8,390p), PG Fee (234p) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-02** | Financial Accounting | Volume Purchase (₹249) | GST (3,798p), Reserve (21,102p), WAC (7.034p) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-03** | Financial Accounting | Call Minute Consumption | Reserve Extinguished (503p), Creator (302p), Platform (201p) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-04** | Financial Accounting | Virtual Gift Dispatch | Reserve Extinguished (4,195p), Creator (2,517p), Platform (1,678p) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-05** | Financial Accounting | Multi-Package Consumption | Blended WAC Allocation (7.2277p/coin), Exact Invariant | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-06** | Financial Accounting | Payout Settlement | Escrow Transfer, 1% TDS (1,000p), Bank Net (99,000p) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-07** | Financial Accounting | Unspent Coin Refund | Token Retirement, Reserve & GST Credit Note Reversal | `SPECIFIED / READY FOR EXECUTION` |
| **TC-FIN-08** | Financial Accounting | Dispute / Chargeback | Protected Creator Earnings, Platform Loss Absorption | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-01** | Access Control / RLS | Self-Approval Attempt | Permission Denied (Column Grant) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-02** | Access Control / RLS | Counter Tampering | Permission Denied (Column Grant & Trigger) | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-03** | Access Control / RLS | Whitelisted Settings Update | Success via Non-Recursive RLS | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-04** | Access Control / RLS | Moderator Approval Attempt | Exception `ACCESS_DENIED` | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-05** | Access Control / RLS | Admin Approval Procedure | Success, State Transition, Role Promotion | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-06** | Access Control / Audit | Audit Log Persistence | Immutable Record Created in `audit_logs` | `SPECIFIED / READY FOR EXECUTION` |
| **TC-SEC-07** | Database Performance | RLS Plan Recursion Analysis | Index Scan Only, Zero Recursion Loop | `SPECIFIED / READY FOR EXECUTION` |
