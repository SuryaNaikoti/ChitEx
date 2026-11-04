# NECTAR — UNRESOLVED BUSINESS, COMMERCIAL & LEGAL DECISIONS
**Document Reference:** `docs/architecture/UNRESOLVED_BUSINESS_AND_LEGAL_DECISIONS.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Governance, Legal & Product Architecture  
**Status:** Canonical Source of Truth (Pending Executive & Legal Clearance)  
**Author:** Principal Software Architect, Financial Systems Architect & Security Engineer  

---

## 1. Overview & Purpose

To ensure total transparency prior to Gate 06 backend implementation, this document explicitly registers all commercial configurations, regulatory assumptions, and legal prerequisites that cannot be decided purely by software engineering.

Until formal executive sign-off and Indian legal counsel opinions are obtained, the architecture treats these parameters as **configurable variables** rather than fixed business logic.

---

## 2. Regulatory & Legal Assumptions Requiring Legal Review

### 2.1 Digital Personal Data Protection (DPDP) Act, 2023 (India)
1. **Age Assurance Beyond Self-Attestation (Section 9):**
   - *Technical State:* Onboarding requires users to declare they are 18+ (`age_declared_18_plus = true`), capturing timestamp, IP, and user-agent into immutable `audit_logs`.
   - *Legal & Operational Risk:* Self-declaration (checking a box) is strictly an **attestation**, not verifiable assurance. Furthermore, **payment instrument verification (Tier 2: `verified_payment`) cannot be treated as conclusive legal age verification**, because minors in India frequently make digital payments via UPI, debit cards, or family devices authorized by parents.
   - *Architecture Clarification:* `verified_payment` is an operational risk-reduction threshold and anti-fraud indicator, NOT statutory proof of majority under Indian law. True legal compliance under forthcoming DPDP rules will likely mandate third-party document tokenization (DigiLocker / Aadhaar XML or facial age estimation API) without storing raw identity proofs.
   - *Action Item:* Retain specialized Indian data protection counsel to determine if DigiLocker / Aadhaar tokenized age verification is legally required for public launch.

2. **KMS Key Management & Creator KYC Encryption Architecture:**
   - *Principle:* Cryptographic keys protecting PAN, bank account numbers, and UPI VPAs in `creator_kyc_details` MUST NEVER be stored in the PostgreSQL database or adjacent file system.
   - *Key Hierarchy:*
     - Master Key (KEK): Stored in AWS KMS / Cloud KMS (`arn:aws:kms:ap-south-1:...`).
     - Data Encryption Key (DEK): Generated per record using AES-256-GCM, enveloped with the KEK.
   - *Rotation & Audit Protocol:*
     - Automated DEK rotation every 90 days.
     - Any decryption operation by an administrator or payout service triggers an immutable entry in `audit_logs` (`action = 'kyc_decrypted'`, `resource_id = creator_id`, capturing administrator UID and timestamp).
     - Plaintext PAN and account numbers are never persisted to application logs or client memory.

3. **Data Retention Conflict (DPDP Act vs. Tax & PMLA Regulations):**
   - *Conflict:* Section 8 of the DPDP Act mandates erasure of personal data once the purpose is served. However, the Indian Income Tax Act (Section 44AA) and Prevention of Money Laundering Act (PMLA) mandate retention of financial and transactional records for a minimum of **7 to 8 years**.
   - *Architectural Resolution:* Account deletion purges social profiles, voice notes, and messages, but maintains anonymized, pseudonymized foreign keys in `financial_journal_entries` and `payment_orders` with an `account_erased_at` audit record.

### 2.2 Reserve Bank of India (RBI) Regulations
1. **Regulatory Classification of "Nectar Coins":**
   - *Assumption:* Coins are strictly in-app virtual utility licenses (non-refundable digital entertainment credits), and **not** a Closed-Loop Prepaid Payment Instrument (PPI).
   - *Legal Risk:* If the RBI classifies Nectar Coins as a PPI, Nectar would be subject to Master Directions on Prepaid Payment Instruments, requiring net-worth capitalization, escrow accounts, and strict customer KYC.
   - *Engineering Safeguard:* Coins cannot be redeemed, transferred between users, or cashed out by callers. Only approved creators earn INR upon receiving calls or gifts.
2. **Escrow & Nodal Account Requirements for Creator Payouts:**
   - *Assumption:* Creator earnings disbursements can be processed via standard Razorpay Payouts (Current Account to UPI/IMPS).
   - *Legal Risk:* If Nectar operates as an Intermediary/Marketplace aggregating payments between users and creators, RBI Payment Aggregator (PA) guidelines may require automated nodal/escrow accounts.

### 2.3 Indian Income Tax Act — TDS Withholding (Sections 194-O, 194J, 194M)
1. **Tax Deduction at Source (TDS) on Creator Disbursements:**
   - *Commercial Dilemma:* Are creators classified as e-commerce participants (Section 194-O: 1% TDS), professionals/entertainers (Section 194J: 10% TDS), or contractual service providers (Section 194M: 5%)?
   - *Architectural Resolution:* TDS is modeled dynamically in `creator_payout_requests.tds_withheld_inr` and read from `system_configurations` (key: `compliance.tds_rate_percentage`).
   - *Action Item:* Platform tax counsel must specify the exact section classification before real creator disbursements commence in Gate 06.

### 2.4 Information Technology (Intermediary Guidelines) Rules, 2021
1. **Statutory Grievance Officer:**
   - Indian law requires publishing the name, address, and email of an India-resident Grievance Officer on the website and app.
   - Mandates acknowledgment of complaints within **24 hours** and resolution within **15 days**.
   - *Architectural Status:* The `moderation_reports` and `moderation_appeals` database models track exact timestamps to guarantee adherence to the statutory 24-hour / 15-day SLA.

---

## 3. Commercial & Product Configuration Reconciliation

### 3.1 Call Rate Discrepancy Resolution
- **Identified Inconsistency in Prior Documents:**
  - Prototype UI displayed 15 coins/min and 20 coins/min in various card views.
  - Architecture documents referenced 60 coins/min.
- **Canonical Decision:**
  - There is **no hardcoded call rate**.
  - System default baseline is set to **60 coins per minute** in `system_configurations` (`commercial.default_call_rate_coins_per_minute`).
  - Creator-tier customization: Approved creators can select from approved platform pricing tiers (e.g. 20, 40, 60, 100 coins/min) within `creator_profiles.call_rate_coins_per_minute`.
- **In-Flight Call Protection (Rate Snapshotting):**
  - When a call connects, the rate is **permanently snapshotted** into `call_sessions.rate_coins_per_minute`.
  - If a creator or administrator changes their rate while a call is active, the active call continues billing at the original snapshotted rate until termination.

### 3.2 Creator Revenue Share Split (Provisional 60/40)
- **Status:** **Provisional Business Parameter.**
- Creator Share: **60%** (`commercial.creator_share_percentage`).
- Platform Share: **40%** (`commercial.platform_share_percentage`).
- **Safeguard:** Stored procedures validate that $\text{Creator Share} + \text{Platform Share} = 100\%$. The calculation engine refuses to post journal entries if the sum deviates from 100%.

### 3.3 Minimum Creator Payout Threshold
- **Status:** **Provisional Business Parameter.**
- Minimum Threshold: **₹500.00** (`commercial.minimum_payout_amount_inr`).
- Justification: Mitigates micro-transaction banking fees and payout processing overhead. Creators must accumulate at least ₹500 in `creator_earnings_wallets.available_balance_inr` before submitting a withdrawal request.

### 3.4 Coin Purchasing Value, GST & Unit Economics
- **Reconciliation of Purchase vs. Consumption Ratios:**
  - Retail Coin Packages (Prices mandated to be MRP inclusive of 18% GST):
    - Starter: 1,000 Coins $\rightarrow$ ₹99.00 (Net ex-GST: ₹83.90 $\rightarrow$ 8.390 paise/coin).
    - Popular: 3,000 Coins $\rightarrow$ ₹249.00 (Net ex-GST: ₹211.02 $\rightarrow$ 7.034 paise/coin).
    - Value: 7,000 Coins $\rightarrow$ ₹499.00 (Net ex-GST: ₹422.88 $\rightarrow$ 6.041 paise/coin).
    - VIP: 15,000 Coins $\rightarrow$ ₹999.00 (Net ex-GST: ₹846.61 $\rightarrow$ 5.644 paise/coin).
- **Core Commercial Dilemma Requiring Executive Sign-Off:**
  - **Option 1 (Ind AS 115 WAC Realization):** Creator receives 60% of the actual net realization of the specific coins burned (e.g. 60% of 8.39p = 5.03p/coin on Starter, or 60% of 5.64p = 3.39p/coin on VIP). Guaranteed positive platform margin.
  - **Option 2 (Uniform Creator Monetization Credit Rate):** Creator receives a fixed rate per coin regardless of package discounts (e.g. 4.0 paise/coin).
  - *Hazard:* A uniform payout rate $> 5.64\text{ paise/coin}$ causes net platform losses on VIP package consumption.
- **GST Rate Classification (18% vs 28%):**
  - Current baseline treats Nectar coins as digital entertainment / interactive voice communication services subject to **18% GST (SAC 998439)**.
  - If tax authorities attempt to characterize in-app tokens under Online Money Gaming provisions (which attract 28% GST on full deposit value under Rule 31B of CGST Rules), unit economics would be severely impacted.
  - *Action Item:* Retain specialized Indian Indirect Tax Counsel to issue a formal opinion confirming SAC 998439 (18%) classification.

---

## 4. Summary Matrix of Unresolved Decisions

| Decision / Parameter | Current Technical Setting | Authority Required | Impact of Revision |
| :--- | :---: | :---: | :--- |
| **Age Verification Method** | Tier 1 Self-Attestation + Tier 2 Payment KYC | Indian Data Protection Counsel | May require integration of Aadhaar/DigiLocker API partner |
| **Creator TDS Rate** | 1% Section 194-O (Configurable) | Tax Advisory / Chartered Accountant | Affects net payout disbursement calculations (1% vs 10%) |
| **GST Tax Classification** | 18% SAC 998439 Digital Content | Indirect Tax Counsel | Reclassification to 28% would compress platform margins |
| **Creator Monetization Model** | Model A (Ind AS 115 Net Realization) | Executive Board / CFO | Decides whether creator pay varies by package discount |
| **RBI PPI Status** | Closed-loop virtual token license | Banking / Regulatory Legal Counsel | Ensures exemption from PPI license requirements |
| **Default Call Rate** | 60 Coins / Min | Product & Growth Management | Modifies baseline creator earnings & user burn rate |
| **Revenue Share Split** | 60% Creator / 40% Platform | Executive Board / Business Operations | Alters platform gross margin and creator adoption |
| **Minimum Payout** | ₹500.00 | Operations & Finance | Adjusts working capital requirements & banking fees |
