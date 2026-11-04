# NECTAR — GATE 05B.3.1 FINANCIAL ACCOUNTING VERIFICATION
## Independent Audit of Financial Invariants, Unit Economics & General Ledger

**Document Reference:** `docs/audits/gate-05b-3-1/FINANCIAL_ACCOUNTING_VERIFICATION.md`  
**Milestone:** Gate 05B.3.1 — Independent Financial & Security Verification  
**Classification:** Confidential — Core Financial & Engineering Architecture  
**Status:** Complete / Authoritative Audit Deliverable  
**Auditor Roles:** Senior Financial Systems Architect & Fintech Accounting Systems Reviewer  
**Audit Target Files:**
- `docs/architecture/FINANCIAL_ACCOUNTING_SPECIFICATION.md`
- `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md`
- `docs/architecture/CALL_BILLING_SPECIFICATION.md`
- `docs/architecture/UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md`
- `docs/architecture/GATE_05B_3_SECURITY_AND_FINANCIAL_TEST_PLAN.md`

---

## 1. Executive Summary & Audit Context

During the Gate 05B.2 architecture review, a critical defect in Nectar's financial modeling was identified: prior documentation conflated a colloquial consumer heuristic ("10 coins = ₹1") with statutory Indian commercial reality. This resulted in:
1. Phantom deferred liabilities on retail purchases (e.g., treating ₹99 for 1,000 coins as ₹100 of consumption value).
2. Catastrophic margin compression on discounted volume packages (VIP package: 15,000 coins for ₹999). If 15,000 coins were valued at 10 coins = ₹1 (₹1,500.00), a 60% creator share would require paying creators ₹900.00, whereas net cash collected after 18% GST and gateway fees was only ₹823.03, generating an immediate operational loss of ₹76.97 per VIP purchase.
3. Unaddressed Indian indirect tax timing rules (CGST Act Sections 12 & 13) regarding when GST liability crystallizes.

The Gate 05B.3 remediation established a **6-Tier Economic Decoupling Framework** and an **Ind AS 115 Weighted Average Cost (WAC)** valuation engine.

This document presents the independent financial audit of that specification. Every metric, formula, journal entry, and statutory tax flow has been mathematically verified.

---

## 2. Mathematical Audit of Retail Coin Packages & Unit Economics

### 2.1 Statutory Tax & Gateway Assumptions
Under Indian statutory tax and payment gateway standards:
1. **Goods & Services Tax (GST):**
   - Statutory Classification: SAC 998439 (Other online digital entertainment / telecommunication services).
   - Rate: **18% Forward Charge** (CGST 9% + SGST 9%, or IGST 18%).
   - Legal Rule: Maximum Retail Price (MRP) displayed to Indian consumers is legally required to be inclusive of all taxes.
   - Timing of Supply: Under Section 12(2) and Section 13(2) of the CGST Act, 2017, tax liability arises at the earlier of invoice issuance or payment receipt. Therefore, GST liability crystallizes immediately upon coin package purchase and cannot be treated as deferred revenue.
   - Net Taxable Consideration Formula:
     $$P_{\text{net\_taxable}} = \text{Round}\left(\frac{P_{\text{gross}}}{1 + \frac{R_{\text{gst}}}{100}}\right) = \text{Round}\left(\frac{P_{\text{gross}}}{1.18}\right)$$
   - Output GST Payable Formula:
     $$T_{\text{gst}} = P_{\text{gross}} - P_{\text{net\_taxable}}$$
2. **Payment Gateway Merchant Discount Rate (MDR):**
   - Baseline Razorpay Fee: 2.00% on gross transaction value.
   - Statutory GST on Gateway Services: 18% on the gateway fee ($2.00\% \times 1.18 = 2.36\% \text{ effective MDR}$).
   - Fee Formula:
     $$E_{\text{pg}} = \text{Round}(P_{\text{gross}} \times 0.0236)$$
   - Cash Settled to Bank Account:
     $$\text{Cash Settled} = P_{\text{gross}} - E_{\text{pg}}$$

### 2.2 Independent Reconciliation Matrix (4 Catalog Tiers)

| Metric | Tier 1: Starter | Tier 2: Popular | Tier 3: Value | Tier 4: VIP | Verification Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Coins Granted ($Q_{\text{coin}}$)** | 1,000 | 3,000 | 7,000 | 15,000 | Verified |
| **Retail MRP ($P_{\text{gross}}$)** | ₹99.00 (9,900p) | ₹249.00 (24,900p) | ₹499.00 (49,900p) | ₹999.00 (99,900p) | Verified |
| **Gross Price / Coin** | 9.900 paise | 8.300 paise | 7.129 paise | 6.660 paise | Verified |
| **Statutory Output GST (18%)** | 1,510 paise (₹15.10) | 3,798 paise (₹37.98) | 7,612 paise (₹76.12) | 15,239 paise (₹152.39)| Verified ($\pm 0$ paise) |
| **Net Taxable Consideration ($L_{\text{deferred}}$)**| 8,390 paise (₹83.90) | 21,102 paise (₹211.02)| 42,288 paise (₹422.88)| 84,661 paise (₹846.61)| Verified ($\pm 0$ paise) |
| **Effective Net Rate / Coin ($R_{\text{net\_rate}}$)**| **8.3900 paise** | **7.0340 paise** | **6.0411 paise** | **5.6441 paise** | Verified |
| **Gateway MDR (2.36% effective)**| 234 paise (₹2.34) | 588 paise (₹5.88) | 1,178 paise (₹11.78) | 2,358 paise (₹23.58) | Verified |
| **Net Platform Cash Settled** | 9,666 paise (₹96.66) | 24,312 paise (₹243.12)| 48,722 paise (₹487.22)| 97,542 paise (₹975.42)| Verified |
| **Platform Net Cash After GST** | 8,156 paise (₹81.56) | 20,514 paise (₹205.14)| 41,110 paise (₹411.10)| 82,303 paise (₹823.03)| Verified |

### 2.3 Mathematical Proof of Mathematical Equality Across Tiers
For every retail package:
$$P_{\text{gross}} \equiv P_{\text{net\_taxable}} + T_{\text{gst}}$$
- **Starter:** $8,390 + 1,510 = 9,900\text{ paise}$ (Exact $\Delta = 0$).
- **Popular:** $21,102 + 3,798 = 24,900\text{ paise}$ (Exact $\Delta = 0$).
- **Value:** $42,288 + 7,612 = 49,900\text{ paise}$ (Exact $\Delta = 0$).
- **VIP:** $84,661 + 15,239 = 99,900\text{ paise}$ (Exact $\Delta = 0$).

---

## 3. Revenue Recognition & Margin Protection Models

### 3.1 Model A (Canonical Ind AS 115 WAC Realization)
Under Model A (the recommended architectural standard):
- Deferred revenue is released pro-rata based on the customer's actual weighted average cost per coin ($R_{\text{net\_rate}}$).
- The creator's 60% share is computed on the **net unearned reserve extinguished**, not on an arbitrary nominal coin value.

#### Solvency Proof on Most Discounted Package (VIP: 15,000 Coins for ₹999.00)
When a user spends all 15,000 coins from a VIP purchase:
1. **Total Deferred Reserve Extinguished:** 84,661 paise (₹846.61).
2. **Creator Payable (60%):**
   $$\text{Creator Accrual} = \text{Round}(84,661 \times 0.60) = 50,797\text{ paise (₹507.97)}$$
3. **Platform Earned Revenue (40%):**
   $$\text{Platform Revenue} = 84,661 - 50,797 = 33,864\text{ paise (₹338.64)}$$
4. **Platform Operating Margin After PG Fee:**
   $$\text{Net Platform Margin} = \text{Platform Cash After GST (82,303p)} - \text{Creator Payable (50,797p)} = 31,506\text{ paise (₹315.06)}$$
   $$\text{Net Operating Margin Percentage} = \frac{31,506}{99,900} = \mathbf{+31.54\%}$$

**Audit Conclusion on Model A:** Under Model A, platform gross margin remains strictly positive ($> 31\%$) across all package tiers. Insolvency or negative margin is mathematically impossible.

### 3.2 Model B (Uniform Creator Credit Rate Risk Analysis)
If the executive board adopts Model B (fixed INR payout per coin regardless of package discount):
- Let $R_{\text{creator\_fixed}}$ be the fixed payout to creators in paise per coin.
- On the VIP package, net taxable realization is $5.644\text{ paise/coin}$.
- If $R_{\text{creator\_fixed}} > 5.644\text{ paise}$, the platform immediately loses money on every VIP coin burned.
- If $R_{\text{creator\_fixed}} = 4.000\text{ paise/coin}$:
  - Creator receives $15,000 \times 4.00\text{p} = 60,000\text{ paise (₹600.00)}$.
  - Platform retains $84,661 - 60,000 = 24,661\text{ paise (₹246.61)}$.
  - After 2,358p PG fee, platform net margin is $22,303\text{ paise (₹223.03) } (+22.32\%)$.

**Audit Recommendation:** Model A is strictly superior for corporate governance and automated compliance with Ind AS 115 / IFRS 15. If Model B is selected, $R_{\text{creator\_fixed}}$ must be hard-capped at $\le 4.00\text{ paise/coin}$.

---

## 4. Weighted Average Cost (WAC) Scoping & Multi-User Isolation

A vital architectural inquiry is whether WAC is calculated globally, per purchase lot (FIFO/LIFO), or per individual user wallet.

### 4.1 Independent Audit Finding: Wallet-Level WAC is Mandated
1. **Mathematical Isolation:** WAC **MUST be calculated strictly per individual user wallet**.
   $$R_{\text{user\_wac}} = \frac{\text{user\_coin\_wallets.unearned\_reserve\_paise}}{\text{user\_coin_wallets.available\_coins}}$$
2. **Failure of Global Blending:**
   If WAC were calculated across the entire platform pool, a whale purchasing ₹999 VIP packages would artificially deflate the realization rate for users who purchased ₹99 Starter packages. This would cause cross-user financial subsidization, distort creator earnings, and violate customer-contract matching principles under Ind AS 115.
3. **Lot-Based (FIFO) vs. Wallet WAC:**
   While FIFO lot tracking is theoretically pure, in high-frequency micropayments (60 coins every 60 seconds) it introduces significant database table fragmentation and row locking contention across lot tables. A single running weighted-average reserve balance stored directly on `user_coin_wallets` provides $O(1)$ constant-time calculation while preserving strict per-user financial isolation.

### 4.2 Multi-User Isolation Invariant
- **Theorem:** A discount granted to User $U_1$ (e.g. VIP package at 5.644p/coin) shall never reduce or alter the effective realization rate, creator payable, or platform revenue derived from User $U_2$ (e.g. Starter package at 8.390p/coin).
- **Proof:** In `deduct_call_minute` and `process_virtual_gift_transfer`, all calculations of `v_reserve_extinguished_paise` derive exclusively from the caller's locked wallet record (`WHERE user_id = v_session.caller_id`). No global aggregation or cross-user parameters exist.

---

## 5. Promotional Coin Accounting & Balance Segregation

### 5.1 Token Types & Segregation
In-app tokens consist of two distinct categories:
1. **Paid Coins (`paid_balance`):** Purchased with fiat money via payment gateway. Carries deferred revenue liability (`2015 unearned_coin_fiat_reserve`).
2. **Promotional Coins (`promotional_balance`):** Granted gratis by the platform for marketing, onboarding, or retention.

### 5.2 Critical Accounting Rules for Promotional Coins
1. **Zero Deferred Revenue Liability:** Promotional coins carry **0 paise of customer purchase consideration**. Therefore:
   $$\Delta \text{unearned\_coin\_fiat\_reserve} \equiv 0$$
   Promotional coins must never inflate account `2015`.
2. **Consumption & Creator Compensation:**
   When a user spends a promotional coin on a creator call or virtual gift, the creator must still be compensated contractual earnings. The platform funds this compensation as an immediate marketing expense:
   - Debit `4020 promotional_coin_reserve` (Operational marketing expense).
   - Credit `2020 creator_payable_liability` (Creator accrued earnings).
   - Virtual Token Ledger: Debit `2010 user_coin_liability`, Credit `9010 virtual_coin_issuance_clearing`.
3. **Burn Order (FIFO Priority):**
   - **Rule:** Promotional coins are consumed **FIRST** before paid coins.
   - **Commercial Rationale:** Reduces the platform's unearned fiat liability faster when users churn, and prevents users from requesting refunds on cash packages while retaining free promo coins.

---

## 6. General Ledger Balance Audit (Events A–H)

The general ledger schema enforces double-entry balancing across two independent currency pools: `COIN` and `INR_SUBUNIT`. Every transaction group must satisfy:
$$\sum \text{Debits} \equiv \sum \text{Credits}$$

### Event A: Starter Purchase (₹99 for 1,000 Coins)
- **Token Pool (`COIN`):**
  - Dr `9010 virtual_coin_issuance_clearing`: 1,000
  - Cr `2010 user_coin_liability`: 1,000
  - $\sum \text{Dr} = 1,000, \sum \text{Cr} = 1,000$ ($\Delta = 0$). **BALANCED.**
- **Fiat Pool (`INR_SUBUNIT`):**
  - Dr `1010 cash_gateway_clearing`: 9,900 paise
  - Cr `2060 gst_output_tax_payable`: 1,510 paise (18% SAC 998439)
  - Cr `2015 unearned_coin_fiat_reserve`: 8,390 paise (Deferred Liability)
  - Dr `4010 gateway_fee_expense`: 234 paise (2.36% MDR)
  - Cr `1010 cash_gateway_clearing`: 234 paise
  - $\sum \text{Dr} = 10,134\text{ paise}, \sum \text{Cr} = 10,134\text{ paise}$ ($\Delta = 0$). **BALANCED.**

### Event B: 1 Minute Call Consumption (60 Coins @ 8.390p/coin)
- Reserve extinguished: $\text{Round}(60 \times 8.390) = 503\text{ paise}$.
- Creator payable (60%): $\text{Round}(503 \times 0.60) = 302\text{ paise}$.
- Platform revenue (40%): $503 - 302 = 201\text{ paise}$.
- **Token Pool:** Dr `2010` 60, Cr `9010` 60 ($\Delta = 0$). **BALANCED.**
- **Fiat Pool:** Dr `2015` 503, Cr `2020` 302, Cr `3010` 201 ($\Delta = 0$). **BALANCED.**

### Event C: Virtual Gift Dispatch (500 Coins @ 8.390p/coin)
- Reserve extinguished: $500 \times 8.390 = 4,195\text{ paise}$.
- Creator payable (60%): $\text{Round}(4,195 \times 0.60) = 2,517\text{ paise}$.
- Platform revenue (40%): $4,195 - 2,517 = 1,678\text{ paise}$.
- **Token Pool:** Dr `2010` 500, Cr `9010` 500 ($\Delta = 0$). **BALANCED.**
- **Fiat Pool:** Dr `2015` 4,195, Cr `2020` 2,517, Cr `3010` 1,678 ($\Delta = 0$). **BALANCED.**

### Event D: Multi-Package Blended Lot Consumption (100 Coins)
- 500 remaining Starter coins (4,195p) + 3,000 Popular coins (21,102p) = 3,500 coins, 25,297 paise reserve.
- Blended Rate: $7.2277\text{ paise/coin}$.
- Spend 100 coins: Reserve extinguished = $\text{Round}(100 \times 7.2277) = 723\text{ paise}$.
- Creator share (60%): $\text{Round}(723 \times 0.60) = 434\text{ paise}$.
- Platform revenue (40%): $723 - 434 = 289\text{ paise}$.
- **Fiat Pool:** Dr `2015` 723, Cr `2020` 434, Cr `3010` 289 ($\Delta = 0$). **BALANCED.**

### Event E: Creator Payout Escrow Lock (₹1,000.00 / 100,000p)
- **Fiat Pool:** Dr `2020 creator_payable_liability` 100,000, Cr `2030 creator_payout_escrow` 100,000 ($\Delta = 0$). **BALANCED.**

### Event F: Creator Payout Settlement (₹1,000.00 with 1% Section 194-O TDS)
- Gross: 100,000 paise.
- TDS Withheld (1%): 1,000 paise (₹10.00).
- Net Disbursed: 99,000 paise (₹990.00).
- **Fiat Pool:** Dr `2030 creator_payout_escrow` 100,000, Cr `2040 creator_tds_tax_payable` 1,000, Cr `1010 cash_gateway_clearing` 99,000 ($\Delta = 0$). **BALANCED.**

### Event G: Unspent Coin Refund Reversal (1,000 Coins / ₹99.00)
- **Token Pool:** Dr `2010 user_coin_liability` 1,000, Cr `9010 virtual_coin_issuance_clearing` 1,000 ($\Delta = 0$). **BALANCED.**
- **Fiat Pool:** Dr `2015 unearned_coin_fiat_reserve` 8,390, Dr `2060 gst_output_tax_payable` 1,510, Cr `1010 cash_gateway_clearing` 9,900 ($\Delta = 0$). **BALANCED.**

### Event H: Chargeback with Partially Consumed Coins (600 Spent, 400 Unspent)
- Razorpay dispute: ₹99.00 gross + ₹50.00 dispute penalty fee = 14,900 paise cash deducted.
- 400 unspent coins retired: Dr `user_coin_liability` 400, Cr `issuance_clearing` 400.
- Extinguish remaining reserve: $400 \times 8.390 = 3,356\text{ paise}$.
- Creator earnings from 600 consumed coins (₹30.20 = 3,020p) are **NOT clawed back**.
- Platform absorbs loss:
  - Dr `2015 unearned_reserve`: 3,356 paise.
  - Dr `3010 platform_earned_revenue`: 2,014 paise (Reverse commission).
  - Dr `4020 promotional_coin_reserve`: 3,020 paise (Absorb creator payable).
  - Dr `2060 gst_output_tax_payable`: 1,510 paise (GST dispute reversal).
  - Dr `4010 gateway_fee_expense`: 5,000 paise (₹50 penalty).
  - Cr `1010 cash_gateway_clearing`: 14,900 paise.
  - $\sum \text{Dr} = 14,900\text{ paise}, \sum \text{Cr} = 14,900\text{ paise}$ ($\Delta = 0$). **BALANCED.**

---

## 7. Audit Verification Verdict

### **VERDICT: PASS — MATHEMATICAL INVARIANTS RIGOROUSLY VERIFIED**

The financial architecture specification in `FINANCIAL_ACCOUNTING_SPECIFICATION.md` is mathematically sound, tax-compliant under Indian CGST statutes, and resilient against margin erosion. No mathematical leaks, rounding anomalies, or unbacked liabilities were detected.
