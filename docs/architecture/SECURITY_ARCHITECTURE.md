# NECTAR — Security Architecture Specification (Canonical Alignment)
**Document Reference:** `docs/architecture/SECURITY_ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Security Architecture  
**Canonical Reference:** Aligned strictly with `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md` & `docs/architecture/RLS_POLICY_MATRIX.md`  
**Author:** Principal Software Architect & Application Security Engineer  

---

## 1. Executive Security Architecture

Nectar enforces a multi-tier Defense-in-Depth model protecting data across:
1. **Network & Transport Layer:** Mandatory TLS 1.3 for all HTTP/WebSocket traffic; DTLS-SRTP for WebRTC media streams.
2. **API & Edge Layer:** Next.js Route Handlers with session validation via `@supabase/ssr`, Upstash Redis sliding-window rate limiting, and cryptographic webhook verification.
3. **Database Layer:** PostgreSQL 16 Row Level Security (RLS) with non-recursive `SECURITY DEFINER` helper functions (`auth_user_role()`, `is_mutually_blocked()`).
4. **Financial Ledger Layer:** Immutable double-entry general ledger (`financial_journal_entries`), pessimistic concurrency control (`SELECT FOR UPDATE`), and atomic stored procedures.
5. **Data Privacy Layer:** Segregation of public (`profiles`) and private identity (`private_user_profiles`), AES-256 encryption for creator KYC data (`creator_kyc_details`), and strict DPDP Act 2023 compliance.

---

## 2. Threat Modeling & Mitigation Matrix (STRIDE)

| Threat Category | Target Asset | Attack Vector | Security Countermeasure |
| :--- | :--- | :--- | :--- |
| **Spoofing** | User Identity, Razorpay Webhooks | Forged JWTs, fake webhook HTTP requests | Supabase Auth server-side verification, Razorpay HMAC-SHA256 signature validation with webhook secret |
| **Tampering** | Coin Balances, Call Rates | Client-side state manipulation, parameter tampering | Server-authoritative PostgreSQL ledger (`SELECT FOR UPDATE`), zero trust of client balances or pricing |
| **Repudiation** | Gift Transfers, Creator Payouts | Disputing sent gifts or processed payouts | Immutable double-entry ledger (`financial_journal_entries`), cryptographic hash linkage, audit logs |
| **Information Disclosure** | User Phone, KYC, Live Audio | RLS bypass, unsecured LiveKit rooms, PII leakage | Strict PostgreSQL RLS, short-lived LiveKit JWTs (10 min), PII masking (last 4 digits only), encrypted KYC storage |
| **Denial of Service** | Matching Queues, Call Signalling | Connection flooding, socket exhaustion | Upstash Redis sliding-window rate limiting, maximum 1 active queue per user, LiveKit connection limits |
| **Elevation of Privilege** | Admin/Moderator Controls | Tampering with user metadata or role claims | Database-level RBAC (`profiles.role`), server-only service-role bypass, no client-writable role columns |

---

## 3. RLS Policy Enforcement & Role Safeguards

1. **Role Escalation Prevention:**
   The `profiles_update_owner` policy enforces that authenticated users cannot alter their own `role` or `is_suspended` flags using non-recursive helper functions:
   ```sql
   CREATE POLICY "profiles_update_owner" ON profiles
     FOR UPDATE TO authenticated
     USING (id = auth.uid())
     WITH CHECK (
       id = auth.uid()
       AND role = auth_user_role()
       AND is_suspended = auth_user_is_suspended()
     );
   ```
2. **Creator Status Self-Approval Prevention:**
   The `creator_profiles_update_owner` policy is strictly non-recursive. Field immutability is guaranteed via Column-Level Security Grants and a `BEFORE UPDATE` trigger:
   ```sql
   -- Non-recursive policy
   CREATE POLICY "creator_profiles_update_owner" ON creator_profiles
     FOR UPDATE TO authenticated
     USING (user_id = auth.uid())
     WITH CHECK (user_id = auth.uid());

   -- Column-level grant: Only operational fields are writable by creator
   REVOKE UPDATE ON creator_profiles FROM authenticated;
   GRANT UPDATE (is_available_for_calls, call_rate_coins_per_minute, voice_intro_url) 
     ON creator_profiles TO authenticated;

   -- Administrative state transition function
   -- Verification status changes require calling admin_set_creator_verification()
   ```
3. **Wallet Balance Manipulation Prevention:**
   All client-side mutations (`INSERT`, `UPDATE`, `DELETE`) are revoked on `user_coin_wallets`, `creator_earnings_wallets`, `call_coin_holds`, and `financial_journal_entries`. Mutations occur exclusively via trusted server stored procedures.
4. **Bidirectional Block Isolation:**
   When User A blocks User B in `user_blocks`, function `is_mutually_blocked()` immediately isolates them across Discovery, Messaging, and Calling.

---

## 4. Privacy, Key Management & Regulatory Compliance (India DPDP Act 2023)

1. **Progressive Age Assurance Tiering:**
   - Tier 1 (`declared_only`): Basic browsing and profile creation.
   - Tier 2 (`verified_id` / `verified_payment`): Operational indicator required before voice calls or purchasing coins. Not legal statutory proof of majority.
2. **KMS Key Management for Sensitive Financial KYC:**
   - Keys protecting PAN, bank details, and UPI VPAs in `creator_kyc_details` are managed via AWS KMS / Cloud KMS (`ap-south-1`).
   - Keys are NEVER stored in PostgreSQL or file system.
   - Enveloped Data Encryption Keys (DEKs) rotated every 90 days.
   - Plaintext access is restricted to banking disbursement worker with decryption audit logging in `audit_logs`.
3. **Data Minimization & Masking:**
   - Public profiles never expose raw phone numbers, exact GPS coordinates, or KYC identifiers.
   - Bank details and PAN are displayed only in masked preview format (`ABCDE****F`, `••••••••1234`).
4. **Hardened SECURITY DEFINER Function Execution:**
   - All database helper functions pin `SET search_path = pg_catalog, public`.
   - Default `PUBLIC` execution privileges are revoked; explicit `GRANT EXECUTE` is restricted to `authenticated` and `service_role`.
5. **Audit Trail & Statutory Retention:**
   - Compliance events (age declaration, consent withdrawal, payout approvals) are permanently recorded in `audit_logs`.
