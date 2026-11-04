# Nectar — Financial Integrity & Virtual Economy Audit

> **Audit Identifier:** GATE04-AUDIT-04  
> **Scope:** Wallet Mutations, Ledger Immutability, Call Metering, Gifting & Payout Integrity  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Status:** CRITICAL VULNERABILITIES IDENTIFIED (PROTOTYPE LIMITATIONS)

---

## 1. Financial Architecture Verification Checklist

| Financial Integrity Principle | Target Architecture Requirement | Current Prototype Status | Audit Verdict |
|---|---|---|:---:|
| **1. Transaction Persistence** | PostgreSQL ACID transactions with write-ahead log | React `useState` in browser memory | **FAIL (Non-Persistent)** |
| **2. Ledger Immutability** | Append-only `wallet_ledger` with `ON DELETE RESTRICT` | JavaScript in-memory array | **FAIL (Volatile)** |
| **3. Balanced Debit & Credit** | Math parity: `SUM(ledger) == user_wallet.balance` | Matched in local state helper | **PASS (Logic only)** |
| **4. Duplicate Prevention** | Unique constraint on `idempotency_key` / `payment_id` | Unenforced in client state | **FAIL (Vulnerable)** |
| **5. Concurrency Safety** | Row lock: `SELECT ... FOR UPDATE` | Single-threaded JavaScript event loop | **FAIL (No DB Lock)** |
| **6. Server Call Billing** | Webhook-driven billing based on LiveKit SFU timestamps | Client browser `setInterval` | **FAIL (Client Spoofable)** |
| **7. Refund Audit Trail** | Reversal records referencing original transaction ID | No refund mechanism implemented | **FAIL (Missing)** |
| **8. Separate Accounting** | Strict segregation of User Coins and Creator INR | Separate state variables maintained | **PASS (Conceptual)** |

---

## 2. Granular Findings on Financial Calculations

### Finding F-FIN-01: Client-Side Call Duration & Billing Manipulation
- **Finding ID:** `F-FIN-01`
- **File Reference:** `/src/components/ActiveCallModal.tsx` (lines 75–115), `/src/App.tsx` (lines 55–70)
- **Current Implementation:**  
  The ongoing call duration is calculated using a local React `setInterval` ticking once per second. When `currentMinute > lastBilledMinuteRef.current`, the modal calls `onDeductCoins(partner.callRatePerMin, ...)` to subtract coins from the caller's wallet in local state.
- **Expected Implementation:**  
  In accordance with `ARCHITECTURE.md` Section 3:
  1. The server must create a `call_session` with status `initiating` and lock the caller's wallet using `SELECT ... FOR UPDATE`.
  2. An initial reservation hold is placed in `call_holds`.
  3. LiveKit server sends authoritative WebRTC events (`participant_joined`, `participant_left`, `room_finished`).
  4. Billing pulses are triggered by the server every 60 seconds.
  5. The client UI is purely a display terminal receiving remaining balance notifications via WebSocket.
- **Severity:** **CRITICAL**
- **Exploitation Scenario:**  
  A tech-savvy caller can open Chrome DevTools, inspect the React fiber tree, freeze the local timer variable, or override `onDeductCoins = () => {}`. The caller could remain on an active WebRTC voice call with an expensive creator for hours without spending a single coin.
- **Recommended Action:**  
  Under no circumstances may the client trigger financial billing. All duration calculation and wallet debits must occur on the backend service layer via LiveKit webhook signatures.

---

### Finding F-FIN-02: Simulated Razorpay Payment & Coin Minting
- **Finding ID:** `F-FIN-02`
- **File Reference:** `/src/components/WalletView.tsx` (lines 20–35), `/src/App.tsx` (lines 40–54)
- **Current Implementation:**  
  Coin top-up is triggered via `handleSimulatePayment` in `WalletView.tsx`:
  ```typescript
  setTimeout(() => {
    const totalCoinsToAdd = selectedPackage.coinAmount + selectedPackage.bonusCoins;
    onAddCoins(totalCoinsToAdd, selectedPackage.priceInr, selectedPackage.name);
    setIsProcessing(false);
  }, 1000);
  ```
  `onAddCoins` in `App.tsx` generates a mock reference ID (`pay_rzp_${Date.now()}`) and immediately increments `coinBalance`.
- **Expected Implementation:**  
  1. Client calls `POST /api/payments/create-order` with `package_id`.
  2. Server queries PostgreSQL `coin_packages` table for verified price and calls Razorpay Orders API.
  3. Razorpay returns signed `order_id`.
  4. Client completes payment via Razorpay Standard Checkout SDK.
  5. Coins are **NEVER** credited upon client callback.
  6. Coins are credited **ONLY** when Razorpay's server sends `payment.captured` webhook to `/api/razorpay/webhook`, verified with HMAC SHA-256 signature against `RAZORPAY_WEBHOOK_SECRET`.
- **Severity:** **CRITICAL**
- **Exploitation Scenario:**  
  Any user can invoke `handleAddCoins(1000000, 0, 'Exploit')` in the browser console to credit unlimited coins to their wallet.
- **Recommended Action:**  
  Enforce that coin balances can only be mutated by verified Razorpay webhook events processed by the server with database idempotency checks.

---

### Finding F-FIN-03: Lack of Concurrency Protection (Double-Spending)
- **Finding ID:** `F-FIN-03`
- **File Reference:** `/src/App.tsx` (`handleDeductCoins`), `/src/components/ActiveCallModal.tsx`
- **Current Implementation:**  
  When a user sends a virtual gift (e.g. Royal Peacock for 500 coins) while simultaneously on an active call (e.g. 25 coins/min), both handlers read `coinBalance` asynchronously from React state.
- **Expected Implementation:**  
  PostgreSQL transaction isolation:
  ```sql
  BEGIN;
  SELECT coin_balance FROM user_wallets WHERE user_id = $1 FOR UPDATE;
  -- verify coin_balance >= debit_amount
  UPDATE user_wallets SET coin_balance = coin_balance - debit_amount WHERE user_id = $1;
  INSERT INTO wallet_ledger (user_id, amount, balance_after, idempotency_key, ...) VALUES (...);
  COMMIT;
  ```
- **Severity:** **HIGH**
- **Exploitation Scenario:**  
  Rapid concurrent requests (e.g. firing 5 gift clicks simultaneously when balance is only sufficient for 1) would lead to negative balances or double-spending if not locked at the database row level.
- **Recommended Action:**  
  Implement the PostgreSQL double-entry schema with row-level locks and database constraints (`CHECK (coin_balance >= 0)`).

---

### Finding F-FIN-04: Unapproved Commercial Parameters Hardcoded in Code
- **Finding ID:** `F-FIN-04`
- **File Reference:** `/src/App.tsx` (lines 78–88), `/src/components/CreatorView.tsx` (lines 20–35)
- **Current Implementation:**  
  The following rates are hardcoded into application components:
  - Creator Revenue Share: `0.60` (60%) hardcoded in `handleSendStandaloneGift` and `handleEndCall`.
  - Payout Threshold: `500` hardcoded in `CreatorView.tsx`:
    ```typescript
    if (isNaN(amountNum) || amountNum < 500) {
      setErrorMsg('Minimum withdrawal threshold is ₹500.00');
      return;
    }
    ```
- **Expected Implementation:**  
  PRD Section 3.7 clearly notes that creator revenue share and payout thresholds are commercial hypotheses subject to executive approval and regulatory tax compliance (TDS withholding in India). These parameters must be stored as configurable database variables in `platform_settings` or `creator_profiles.revenue_share_percentage`.
- **Severity:** **MEDIUM**
- **Recommended Action:**  
  Keep commercial terms configurable in database tables rather than hardcoded in application logic. Do not finalize financial contracts with creators until commercial terms are formally signed off by the business owner.
