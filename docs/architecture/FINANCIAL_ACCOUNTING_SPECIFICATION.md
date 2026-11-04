# NECTAR — FINANCIAL ACCOUNTING & GENERAL LEDGER SPECIFICATION
**Document Reference:** `docs/architecture/FINANCIAL_ACCOUNTING_SPECIFICATION.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Financial & Engineering Architecture  
**Status:** Canonical Source of Truth (Authoritative)  
**Author:** Principal Software Architect, Financial Systems Architect & Security Engineer  

---

## 1. Core Financial Principles & Tokenomics

1. **Virtual Token Separation:** In-app Coins are strictly **non-refundable virtual utility licenses** permitting the holder to initiate live voice calls and send animated virtual gifts within the platform.
2. **Value Conversion Invariance:** 
   $$\text{Virtual Coins} \neq \text{Indian Rupees (INR)}$$
   Coins carry **zero direct redemption, cashout, or transfer value** to the user who purchased them. They do not constitute a deposit, debt, or store of fiat value.
3. **Six Distinct Economic & Accounting Concepts:**
   To eliminate mathematical ambiguity, the financial engine strictly decouples six distinct metrics:
   - **Coin Quantity ($Q_{\text{coin}}$):** Dimensionless integer tokens used as in-app utility credits (e.g. 1,000 coins).
   - **Customer Purchase Consideration ($P_{\text{gross}}$):** Total fiat funds collected from the customer via payment gateway in INR Subunits (Paise), legally mandated in India to be inclusive of Goods & Services Tax (e.g. ₹99.00 = 9,900 paise).
   - **Indirect Tax Liability ($T_{\text{gst}}$):** Statutory GST liability under Section 9 / Section 12 of the CGST Act (SAC 998439, 18% Forward Charge on digital interactive services). Under Indian tax law, GST liability arises immediately at the time of invoice/payment and cannot be deferred:
     $$\text{Net Taxable Value} = \text{Round}\left(\frac{P_{\text{gross}}}{1 + \frac{\text{GST Rate}}{100}}\right) = \text{Round}\left(\frac{9,900}{1.18}\right) = 8,390\text{ paise (₹83.90)}$$
     $$\text{Output GST Payable} = P_{\text{gross}} - \text{Net Taxable Value} = 9,900 - 8,390 = 1,510\text{ paise (₹15.10)}$$
   - **Deferred Revenue Liability ($L_{\text{deferred}}$):** Under Ind AS 115 / IFRS 15 (Revenue from Contracts with Customers), performance obligations are unfulfilled until coins are consumed. The fiat liability held in `2015 unearned_coin_fiat_reserve` equals exactly the Net Taxable Consideration collected ($8,390\text{ paise}$ for the ₹99 package).
   - **Payment Gateway Fee Expense ($E_{\text{pg}}$):** Razorpay Merchant Discount Rate (2.0% + 18% GST on fee = 2.36% effective = 234 paise on ₹99). An immediate operational expense (`4010 gateway_processing_fee_expense`), which does not reduce customer performance obligations.
   - **Revenue & Accruals upon Consumption:** When coins are consumed for creator calls or gifts, the deferred liability is extinguished, simultaneously recognizing:
     1. **Creator Payable Liability ($2020$):** Contractual debt accrued to approved monetization creators.
     2. **Platform Earned Revenue ($3010$):** Realized platform operating revenue.
4. **Double-Entry General Ledger:** Every financial event creates an immutable, mathematically balanced transaction group enforcing:
   $$\sum \text{Debits} \equiv \sum \text{Credits}$$
   within each independent ledger pool (`INR_SUBUNIT` and `COIN`).
5. **Configurable Parameters:** Conversion ratios, revenue splits, payout floors, and tax rates are loaded dynamically from `system_configurations`.

---

## 2. Chart of Accounts (Dual-Ledger Architecture)

Nectar implements a strict **Dual-Ledger Double-Entry Architecture**. Every transaction group enforces mathematical balancing:
$$\sum \text{Debits} \equiv \sum \text{Credits}$$
within each currency/token pool (`INR_SUBUNIT` or `COIN`).

### 2.1 Fiat General Ledger (Denominated in INR Subunits / Paise)
| Account Code | Account Name | Account Type | Normal Balance | Purpose |
| :---: | :--- | :---: | :---: | :--- |
| **`1010`** | `cash_gateway_clearing` | Asset | Debit | Gross INR funds collected and held at Razorpay prior to bank settlement. |
| **`2015`** | `unearned_coin_fiat_reserve` | Liability | Credit | Deferred revenue: fiat liability held corresponding to unconsumed virtual coins (Net of GST). |
| **`2020`** | `creator_payable_liability` | Liability | Credit | Total accrued net INR earnings owed to creators for calls and gifts received. |
| **`2030`** | `creator_payout_escrow` | Liability | Credit | Creator earnings locked and in-transit during active payout disbursement. |
| **`2040`** | `creator_tds_tax_payable` | Liability | Credit | Tax Deducted at Source (TDS under IT Act) withheld for remittance to tax authorities. |
| **`2050`** | `user_refund_liability` | Liability | Credit | Funds owed to users for authorized purchase reversals or chargebacks. |
| **`2060`** | `gst_output_tax_payable` | Liability | Credit | Statutory Goods & Services Tax (18% SAC 998439) collected on coin package purchases. |
| **`3010`** | `platform_earned_revenue` | Revenue | Credit | Realized platform revenue recognized upon coin consumption (after creator share). |
| **`4010`** | `gateway_processing_fee_expense` | Expense | Debit | Merchant Discount Rate (MDR 2% + GST) charged by Razorpay on payments. |
| **`4020`** | `promotional_coin_reserve` | Expense | Debit | Marketing/subsidy expenses for platform-issued complimentary coins or discounts. |

### 2.2 Virtual Token Ledger (Denominated in COIN)
| Account Code | Account Name | Account Type | Normal Balance | Purpose |
| :---: | :--- | :---: | :---: | :--- |
| **`9010`** | `virtual_coin_issuance_clearing` | Contra-Liability | Debit | Token minting/issuance pool tracking total virtual tokens placed into circulation. |
| **`2010`** | `user_coin_liability` | Liability | Credit | Total unconsumed virtual coins outstanding across all active user wallets. |

---

## 3. Commercial Economics & Mathematical Valuation Model

### 3.1 Reconciliation of Conflicting Valuation Assumptions
In earlier prototype documentation, several conflicting assumptions were referenced simultaneously:
- Retail purchase: ₹99.00 for 1,000 coins (9.90 paise gross / 8.39 paise net per coin).
- Nominal rule-of-thumb: "10 coins $\approx$ ₹1.00" (10.00 paise per coin).
- Call billing example: "60 coins = ₹6.00" (10.00 paise per coin).
- Gift transfer example: "500 coins = ₹50.00" (10.00 paise per coin).
- Volume package discounts: ₹249 for 3,000 coins (8.30 paise gross / 7.03 paise net per coin); ₹999 for 15,000 coins (6.66 paise gross / 5.64 paise net per coin).

**The Inconsistency:** If a customer pays ₹99 for 1,000 coins, the platform collects ₹99 gross. Valuing 1,000 coins at 10 coins = ₹1 would treat the consumption base as ₹100.00, introducing an immediate ₹1.00 phantom valuation. On the VIP package (15,000 coins for ₹999), valuing consumption at 10 coins = ₹1 treats 15,000 coins as ₹1,500.00! If a creator was credited 60% of ₹1,500 (₹900.00), after 18% GST (₹152.39) and PG fees (₹23.58), the platform would net only ₹823.03 while paying ₹900.00 to creators, suffering an immediate loss of ₹76.97 per VIP purchase!

### 3.2 The Two Authoritative Accounting Approaches

To ensure mathematical precision and eliminate platform insolvency, Nectar defines two formal commercial models:

#### Model A: Canonical Ind AS 115 Weighted Average Cost (WAC) Realization (Recommended)
- **Principle:** Deferred revenue liability is extinguished pro-rata based on the user's effective net acquisition cost per coin ($R_{\text{net\_rate}}$).
- **Formula:**
  $$R_{\text{net\_rate}} = \frac{\text{Unearned Reserve in Wallet (Paise)}}{\text{Available Coins in Wallet}}$$
  When $C_{\text{spent}}$ coins are consumed:
  $$\text{Reserve Extinguished (Paise)} = \text{Round}(C_{\text{spent}} \times R_{\text{net\_rate}})$$
  $$\text{Creator Earnings (Paise)} = \text{Round}(\text{Reserve Extinguished} \times S_{\text{creator}})$$
  $$\text{Platform Revenue (Paise)} = \text{Reserve Extinguished} - \text{Creator Earnings}$$
- **Mathematical Invariant:** $\text{Creator Earnings} + \text{Platform Revenue} \equiv \text{Reserve Extinguished}$.
- **Guaranteed Solvency:** Zero possibility of unbacked liabilities or negative platform margins on discounted packages.

#### Model B: Fixed Nominal Creator Credit Rate with Platform Margin Absorbance
- **Principle:** Approved creators receive a fixed INR payout per coin consumed ($R_{\text{creator\_unit}}$), regardless of package discounts.
- **Formula:** For a 60 coin/min call at a fixed creator credit of 4.0 paise/coin:
  $$\text{Creator Accrual} = 60 \times 4.0\text{ paise} = 240\text{ paise (₹2.40)}$$
- **Economic Constraint:** To prevent platform losses, $R_{\text{creator\_unit}}$ must never exceed the net realization of the most discounted package:
  $$R_{\text{creator\_unit}} \le \min(R_{\text{net\_rate}}) = 5.64\text{ paise/coin (VIP Package Net)}$$
  At $R_{\text{creator\_unit}} = 4.00\text{ paise/coin}$, the platform retains positive margins across all catalog tiers.

### 3.3 Retail Package Economics Matrix (18% GST & 2.36% PG Fee)
| Package Tier | Retail Price ($P_{\text{gross}}$) | Output GST (18%) | Net Consideration ($L_{\text{deferred}}$) | Coin Qty | Net Rate / Coin | PG Fee (2.36%) | Platform Net Cash |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Starter** | ₹99.00 (9,900p) | ₹15.10 (1,510p) | ₹83.90 (8,390p) | 1,000 | **8.390 paise** | ₹2.34 (234p) | ₹81.56 (8,156p) |
| **Popular** | ₹249.00 (24,900p) | ₹37.98 (3,798p) | ₹211.02 (21,102p) | 3,000 | **7.034 paise** | ₹5.88 (588p) | ₹205.14 (20,514p) |
| **Value** | ₹499.00 (49,900p) | ₹76.12 (7,612p) | ₹422.88 (42,288p) | 7,000 | **6.041 paise** | ₹11.78 (1,178p) | ₹411.10 (41,110p) |
| **VIP** | ₹999.00 (99,900p) | ₹152.39 (15,239p) | ₹846.61 (84,661p) | 15,000 | **5.644 paise** | ₹23.58 (2,358p) | ₹823.03 (82,303p) |

---

## 4. Balanced Journal Entry Templates

Every financial transaction is recorded in `financial_journal_entries` within a single ACID transaction. Each currency ledger balances independently ($\sum \text{Debits} \equiv \sum \text{Credits}$).

### 4.1 Event A: Coin Package Purchase (Starter: ₹99.00 for 1,000 Coins)
- Gross cash collected = ₹99.00 (9,900 paise).
- Output GST payable (18% forward charge, SAC 998439) = ₹15.10 (1,510 paise).
- Net unearned deferred revenue liability = ₹83.90 (8,390 paise).
- Razorpay MDR fee (2% + 18% GST on MDR = 2.36%) = ₹2.34 (234 paise).

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `1010` `cash_gateway_clearing` | 9,900 | 0 | +9,900 | Gross funds collected at Razorpay |
| `2060` `gst_output_tax_payable` | 0 | 1,510 | -1,510 | Statutory GST liability to Govt of India |
| `2015` `unearned_coin_fiat_reserve` | 0 | 8,390 | -8,390 | Deferred revenue liability (Ind AS 115) |
| `4010` `gateway_processing_fee_expense` | 234 | 0 | +234 | Razorpay processing fee expense |
| `1010` `cash_gateway_clearing` | 0 | 234 | -234 | Net settlement reduction by gateway |
| **Fiat Ledger Subtotal** | **10,134** | **10,134** | **0 (BALANCED)** | **Net cash added: 9,666p** |

#### Virtual Token Ledger (COIN):
| Account Code & Name | Debit (Coins) | Credit (Coins) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `9010` `virtual_coin_issuance_clearing` | 1,000 | 0 | +1,000 | Token minting issuance pool |
| `2010` `user_coin_liability` | 0 | 1,000 | -1,000 | In-app coins credited to user wallet |
| **Token Ledger Subtotal** | **1,000** | **1,000** | **0 (BALANCED)** | **Exact Token Invariant** |

---

### 4.2 Event B: Voice Call Minute Consumption (60 Coins from Starter Lot)
- 60 Coins consumed at effective net rate of 8.39 paise/coin.
- Gross deferred reserve extinguished: $60 \times 8.39 = 503.4 \approx 503\text{ paise (₹5.03)}$.
- Creator share (60%): $\text{Round}(503 \times 0.60) = 302\text{ paise (₹3.02)}$.
- Platform revenue (40%): $503 - 302 = 201\text{ paise (₹2.01)}$.

#### Virtual Token Ledger (COIN):
| Account Code & Name | Debit (Coins) | Credit (Coins) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2010` `user_coin_liability` | 60 | 0 | +60 | Deduction of 60 coins from caller wallet |
| `9010` `virtual_coin_issuance_clearing` | 0 | 60 | -60 | Retirement of utility tokens |
| **Token Ledger Subtotal** | **60** | **60** | **0 (BALANCED)** | **Token pool balanced** |

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2015` `unearned_coin_fiat_reserve` | 503 | 0 | +503 | Extinguish deferred revenue liability |
| `2020` `creator_payable_liability` | 0 | 302 | -302 | Accrue net earnings owed to creator |
| `3010` `platform_earned_revenue` | 0 | 201 | -201 | Recognize realized platform commission |
| **Fiat Ledger Subtotal** | **503** | **503** | **0 (BALANCED)** | **Exact single-paisa balance** |

---

### 4.3 Event C: Virtual Gift Dispatch (500 Coins from Starter Lot)
- 500 Coins consumed at 8.39 paise/coin = 4,195 paise (₹41.95).
- Creator share (60%): $\text{Round}(4,195 \times 0.60) = 2,517\text{ paise (₹25.17)}$.
- Platform share (40%): $4,195 - 2,517 = 1,678\text{ paise (₹16.78)}$.

#### Virtual Token Ledger (COIN):
| Account Code & Name | Debit (Coins) | Credit (Coins) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2010` `user_coin_liability` | 500 | 0 | +500 | Gift coin debit from sender |
| `9010` `virtual_coin_issuance_clearing` | 0 | 500 | -500 | Token retirement |
| **Token Ledger Subtotal** | **500** | **500** | **0 (BALANCED)** | **Exact balance** |

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2015` `unearned_coin_fiat_reserve` | 4,195 | 0 | +4,195 | Deferred reserve extinguished |
| `2020` `creator_payable_liability` | 0 | 2,517 | -2517 | Accrue creator gift earnings |
| `3010` `platform_earned_revenue` | 0 | 1,678 | -1,678 | Platform gift commission |
| **Fiat Ledger Subtotal** | **4,195** | **4,195** | **0 (BALANCED)** | **Exact balance** |

---

### 4.4 Event D: Multi-Package Partial Consumption (WAC Lot Allocation)
- User holds 500 remaining coins from Starter package (Net cost: 8.39p/coin, reserve = 4,195p) and purchases Popular package (3,000 coins, Net cost: 7.034p/coin, reserve = 21,102p).
- Total available coins: 3,500. Total unearned reserve: $4,195 + 21,102 = 25,297\text{ paise}$.
- Blended WAC Rate: $\frac{25,297}{3,500} = 7.2277\text{ paise/coin}$.
- When user spends 100 coins:
  - Extinguished reserve: $\text{Round}(100 \times 7.2277) = 723\text{ paise (₹7.23)}$.
  - Creator share (60%): $\text{Round}(723 \times 0.60) = 434\text{ paise (₹4.34)}$.
  - Platform revenue (40%): $723 - 434 = 289\text{ paise (₹2.89)}$.
  - Both ledgers balance with zero mathematical leakage.

---

### 4.5 Event E: Creator Payout Request Submission (₹1,000.00)
- Creator requests withdrawal of ₹1,000.00 (100,000 paise).
- Funds are transferred from general payable liability to escrow holding pending verification.

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2020` `creator_payable_liability` | 100,000 | 0 | +100,000 | Lock accrued earnings |
| `2030` `creator_payout_escrow` | 0 | 100,000 | -100,000 | Move to escrow holding |
| **Fiat Ledger Subtotal** | **100,000** | **100,000** | **0 (BALANCED)** | **Escrow lock balanced** |

---

### 4.6 Event F: Creator Payout Settlement via Bank/UPI (₹1,000.00 with 1% TDS)
- Gross withdrawal: ₹1,000.00 (100,000 paise).
- TDS withheld under Section 194-O (1%): ₹10.00 (1,000 paise).
- Net cash disbursed via banking partner: ₹990.00 (99,000 paise).

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2030` `creator_payout_escrow` | 100,000 | 0 | +100,000 | Extinguish escrow liability |
| `2040` `creator_tds_tax_payable` | 0 | 1,000 | -1,000 | Tax withholding liability |
| `1010` `cash_gateway_clearing` | 0 | 99,000 | -99,000 | Cash disbursed via bank/UPI |
| **Fiat Ledger Subtotal** | **100,000** | **100,000** | **0 (BALANCED)** | **Disbursement balanced** |

---

### 4.7 Event G: User Purchase Refund (Unspent 1,000 Coins Reversal)
- Customer requests refund before spending any coins.
- Reversal of gross consideration: ₹99.00 (9,900 paise).
- Reversal of deferred reserve (8,390p) and GST credit note (1,510p).

#### Virtual Token Ledger (COIN):
| Account Code & Name | Debit (Coins) | Credit (Coins) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2010` `user_coin_liability` | 1,000 | 0 | +1,000 | Deduct unspent coins |
| `9010` `virtual_coin_issuance_clearing` | 0 | 1,000 | -1,000 | Token retirement |
| **Token Ledger Subtotal** | **1,000** | **1,000** | **0 (BALANCED)** | **Token pool reversed** |

#### Fiat Ledger (INR_SUBUNIT):
| Account Code & Name | Debit (Paise) | Credit (Paise) | Delta | Narrative |
| :--- | :---: | :---: | :---: | :--- |
| `2015` `unearned_coin_fiat_reserve` | 8,390 | 0 | +8,390 | Extinguish deferred reserve |
| `2060` `gst_output_tax_payable` | 1,510 | 0 | +1,510 | GST credit note adjustment |
| `1010` `cash_gateway_clearing` | 0 | 9,900 | -9,900 | Fiat refunded to buyer via Razorpay |
| **Fiat Ledger Subtotal** | **9,900** | **9,900** | **0 (BALANCED)** | **Refund balanced** |

---

### 4.8 Event H: Chargeback & Payment Dispute Handling
1. **Unspent Coins Scenario:**
   - If user has unspent coins, process identical to Event G: claw back coins, extinguish deferred reserve, issue credit note.
2. **Partially or Fully Consumed Scenario:**
   - If user already spent coins for calls or gifts, **creator earnings are protected and NOT clawed back** (unless collusion/fraud is proven).
   - The platform absorbs the lost revenue and chargeback fee into operational expense:
     - Debit `4010 gateway_processing_fee_expense` (Chargeback penalty fee, e.g. ₹50).
     - Debit `3010 platform_earned_revenue` (Reverse platform revenue).
     - Debit `4020 promotional_coin_reserve` (Platform loss provision absorbing creator payable).
     - Credit `1010 cash_gateway_clearing` (Total dispute amount deducted by gateway).
   - User account is immediately quarantined (`profiles.is_suspended = TRUE`).

---

## 5. Concurrency Control & Atomic Posting Procedures

### 5.1 Pessimistic Row Locking (`SELECT FOR UPDATE`)
All operations debiting user coins or withdrawing creator earnings use row-level locks on the respective wallet record:

```sql
-- Atomic Gift Transfer Stored Procedure
CREATE OR REPLACE FUNCTION process_virtual_gift_transfer(
  p_sender_id UUID,
  p_creator_user_id UUID,
  p_gift_id VARCHAR(50),
  p_call_session_id UUID,
  p_idempotency_key VARCHAR(128)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_gift_cost INTEGER;
  v_creator_id UUID;
  v_sender_wallet_id UUID;
  v_creator_wallet_id UUID;
  v_available_coins INTEGER;
  v_creator_share_pct NUMERIC;
  v_net_rate_paise NUMERIC;
  v_reserve_extinguished_paise BIGINT;
  v_creator_earnings_inr NUMERIC(10,2);
  v_creator_paise BIGINT;
  v_platform_paise BIGINT;
  v_group_id UUID := gen_random_uuid();
BEGIN
  -- 1. Idempotency Check
  IF EXISTS (SELECT 1 FROM financial_journal_entries WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  -- 2. Lookup Gift Price & Configuration
  SELECT coin_price INTO v_gift_cost FROM virtual_gift_catalog WHERE id = p_gift_id AND is_active = TRUE;
  IF v_gift_cost IS NULL THEN
    RAISE EXCEPTION 'INVALID_GIFT';
  END IF;

  -- Read Dynamic Commercial Rates (Net Realization: 8.390 paise/coin baseline)
  SELECT (config_value->>'rate')::NUMERIC INTO v_creator_share_pct FROM system_configurations WHERE config_key = 'commercial.creator_share_percentage';
  SELECT (config_value->>'rate_paise')::NUMERIC INTO v_net_rate_paise FROM system_configurations WHERE config_key = 'commercial.net_realization_rate_paise';

  -- Fallback if configuration record missing
  v_creator_share_pct := COALESCE(v_creator_share_pct, 60.0);
  v_net_rate_paise := COALESCE(v_net_rate_paise, 8.390);

  -- 3. Lock Sender Wallet
  SELECT id, available_coins INTO v_sender_wallet_id, v_available_coins
  FROM user_coin_wallets WHERE user_id = p_sender_id FOR UPDATE;

  IF v_available_coins < v_gift_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS';
  END IF;

  -- 4. Lock Creator Earnings Wallet
  SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = p_creator_user_id;
  SELECT id INTO v_creator_wallet_id FROM creator_earnings_wallets WHERE creator_id = v_creator_id FOR UPDATE;

  -- 5. Calculate Financial Accruals (Ind AS 115 Net Realization)
  v_reserve_extinguished_paise := ROUND(v_gift_cost * v_net_rate_paise)::BIGINT;
  v_creator_paise := ROUND(v_reserve_extinguished_paise * (v_creator_share_pct / 100.0))::BIGINT;
  v_platform_paise := v_reserve_extinguished_paise - v_creator_paise; -- Invariant: creator + platform == reserve
  v_creator_earnings_inr := (v_creator_paise / 100.0)::NUMERIC(10,2);

  -- 6. Mutate Sender & Creator Balances
  UPDATE user_coin_wallets
  SET available_coins = available_coins - v_gift_cost,
      lifetime_coins_spent = lifetime_coins_spent + v_gift_cost,
      updated_at = NOW()
  WHERE id = v_sender_wallet_id;

  UPDATE creator_earnings_wallets
  SET available_balance_inr = available_balance_inr + v_creator_earnings_inr,
      lifetime_earnings_inr = lifetime_earnings_inr + v_creator_earnings_inr,
      updated_at = NOW()
  WHERE id = v_creator_wallet_id;

  -- 7. Post Balanced Double-Entry Journal (Token Pool + Fiat Pool)
  INSERT INTO financial_journal_entries (
    transaction_group_id, account_type, user_id, creator_id,
    debit_amount_cents, credit_amount_cents, currency, reason,
    idempotency_key, reference_entity_type, reference_entity_id, description
  ) VALUES
  -- Token Pool Balancing (COIN): Dr User Liability, Cr Issuance Clearing
  (v_group_id, 'user_coin_liability', p_sender_id, NULL, v_gift_cost, 0, 'COIN', 'virtual_gift_dispatch', p_idempotency_key || ':token:dr', 'virtual_gift_transfers', v_group_id, 'Gift coin debit'),
  (v_group_id, 'virtual_coin_issuance_clearing', NULL, NULL, 0, v_gift_cost, 'COIN', 'virtual_gift_dispatch', p_idempotency_key || ':token:cr', 'virtual_gift_transfers', v_group_id, 'Token retirement clearing'),
  -- Fiat Pool Balancing (INR_SUBUNIT): Dr Deferred Reserve, Cr Creator Payable, Cr Platform Revenue
  (v_group_id, 'unearned_coin_fiat_reserve', p_sender_id, NULL, (v_creator_paise + v_platform_paise), 0, 'INR_SUBUNIT', 'virtual_gift_dispatch', p_idempotency_key || ':fiat:dr', 'virtual_gift_transfers', v_group_id, 'Deferred fiat reserve recognition'),
  (v_group_id, 'creator_payable_liability', NULL, v_creator_id, 0, v_creator_paise, 'INR_SUBUNIT', 'virtual_gift_dispatch', p_idempotency_key || ':fiat:cr:creator', 'virtual_gift_transfers', v_group_id, 'Creator earnings credit'),
  (v_group_id, 'platform_earned_revenue', NULL, NULL, 0, v_platform_paise, 'INR_SUBUNIT', 'virtual_gift_dispatch', p_idempotency_key || ':fiat:cr:platform', 'virtual_gift_transfers', v_group_id, 'Platform revenue credit');

  -- 8. Record Gift Transfer
  INSERT INTO virtual_gift_transfers (
    id, sender_id, recipient_creator_id, gift_id, call_session_id, coin_cost, creator_earnings_inr
  ) VALUES (
    v_group_id, p_sender_id, v_creator_id, p_gift_id, p_call_session_id, v_gift_cost, v_creator_earnings_inr
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_group_id,
    'coins_debited', v_gift_cost,
    'creator_earnings_inr', v_creator_earnings_inr
  );
END;
$$;
```

---

## 6. Daily General Ledger Reconciliation Protocol

To ensure mathematical precision and detect balance drifting:
1. **Automated Scheduled Reconciliation (Daily at 03:00 IST):**
   ```sql
   -- Asserts that cached wallet balance matches journal sum
   SELECT 
     w.user_id,
     w.available_coins + w.held_coins AS cached_total,
     COALESCE(SUM(j.credit_amount_cents - j.debit_amount_cents), 0) AS journal_total
   FROM user_coin_wallets w
   LEFT JOIN financial_journal_entries j 
     ON j.user_id = w.user_id AND j.currency = 'COIN'
   GROUP BY w.user_id, w.available_coins, w.held_coins
   HAVING (w.available_coins + w.held_coins) != COALESCE(SUM(j.credit_amount_cents - j.debit_amount_cents), 0);
   ```
2. **Alerting Threshold:** If any record returns a discrepancy > 0, the automated monitor triggers a high-priority alert (`severity: critical`) and freezes the user's wallet from outgoing calls or gifts until manual audit by the financial administrator.

---

## 7. Chargebacks & Payment Dispute Handling

1. **Chargeback Notification:** Received via Razorpay webhook `dispute.created`.
2. **Account Investigation:**
   - If user has unspent coins: Claw back equivalent coins from `user_coin_wallets.available_coins`.
   - If coins were already consumed for creator calls/gifts: Platform absorbs the loss into `gateway_processing_fee_expense` or loss reserves. **Creator earnings are not clawed back retroactively** unless the creator is demonstrated to have colluded in payment fraud.
   - User account is placed on temporary financial review (`profiles.is_suspended = TRUE`).
