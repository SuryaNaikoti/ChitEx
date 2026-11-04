# NECTAR — Authentication & Age Assurance Architecture (Canonical Alignment)
**Document Reference:** `docs/architecture/AUTHENTICATION_ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Identity Architecture  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect & Application Security Engineer  

---

## 1. Authentication Topology & Provider Strategy

Nectar authenticates users through Supabase Auth integrated with Next.js App Router using `@supabase/ssr`:

1. **Primary Provider (India Focus):** Phone Number SMS OTP via E.164 formatted numbers (`+91XXXXXXXXXX`).
2. **Secondary Provider:** Google OAuth (OAuth 2.0 / OpenID Connect) as a backup for users with SMS delivery delays.
3. **Session Transport:** Managed via secure, HTTP-only, `SameSite=Lax`, `Secure` cookies. Access tokens have an expiration of 1 hour; refresh tokens have an expiration of 30 days.

---

## 2. Progressive Age Assurance Framework (India DPDP Act 2023)

### 2.1 The Principle of Age Verification Distinction
Checking an "I am 18+" checkbox is a **self-declaration (attestation)**, not verified proof of age. Under Section 9 of the Digital Personal Data Protection Act (DPDP) 2023, processing personal data of children requires verifiable parental consent. Nectar is strictly an **Adults-Only (18+)** platform.

To reconcile user onboarding friction with regulatory compliance, Nectar adopts a **progressive age assurance model**:

```
[Onboarding]
     │
     ▼
Tier 1: Declared Only (Self-Attestation)
- User asserts 18+ and submits DOB
- Audit log records timestamp, IP, user-agent
- Grants access to: Public Discovery browsing, Profile setup
     │
     ▼ (Attempt to purchase coins or initiate voice calls)
Tier 2: Verified Age Assurance
- Verification via Payment Instrument KYC (Credit Card / UPI VPA) or Document Assurance Partner
- Updates `private_user_profiles.age_assurance_tier = 'verified_payment'` or `'verified_id'`
- Unlocks: Live voice calling, Coin purchases, Virtual gifting
     │
     ▼ (If verification fails or indicates minor)
Quarantine & Account Restriction
- `age_assurance_tier = 'rejected_minor'`
- Immediate suspension (`profiles.is_suspended = TRUE`)
```

---

## 3. Separation of Identity Data

To guarantee privacy and data minimization:
1. **Public Social Data (`profiles`):**
   - User UUID, display name, avatar URL, bio, gender, primary language, role.
   - Publicly readable by authenticated users (subject to block rules).
2. **Protected Private Data (`private_user_profiles`):**
   - Phone number, email, birth date, age assurance tier, coarse location (city/state).
   - Never exposed to other users or public API responses.
   - Strictly accessible only to the account owner and authorized compliance officers.
3. **Creator Financial KYC (`creator_kyc_details`):**
   - PAN, bank account number, IFSC code.
   - Encrypted with AES-256-GCM.
   - Accessible only by payment disbursement services and platform financial administrators.

---

## 4. Role-Based Access Control (RBAC) Invariants

System roles are stored in `profiles.role` using enum `user_role`:
- `'user'`: Standard authenticated user (Calling, discovery, gifting).
- `'creator'`: Approved monetization creator (Receiving calls, earning INR, requesting payouts).
- `'moderator'`: Content & abuse review officer (Processing reports, issuing temporary suspensions).
- `'admin'`: Platform administrator (Financial reconciliation, payout approvals, system configuration).

**Critical Security Invariant:** RLS policy `profiles_update_owner` enforces that users cannot alter their own `role` column. Role elevation can only be executed by administrators via secure internal procedures.
