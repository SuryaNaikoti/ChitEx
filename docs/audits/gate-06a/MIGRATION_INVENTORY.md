# NECTAR — MIGRATION INVENTORY
**Milestone:** Gate 06A — Supabase Database Foundation  
**Classification:** Migration Manifest & Execution Sequence  
**Document Ref:** `docs/audits/gate-06a/MIGRATION_INVENTORY.md`  

---

## 1. Inventory Summary

All migrations are maintained in `supabase/migrations/` using timestamp-prefixed naming to guarantee deterministic, ordered execution in Supabase CLI, GitHub Actions CI/CD, and non-production staging environments.

| Ordinal | Migration Filename | Primary Scope | Tables / Types Introduced | Execution Order |
| :---: | :--- | :--- | :--- | :---: |
| **01** | `20261104000001_create_extensions_and_enums.sql` | PostgreSQL extensions, auth stubs, timestamp trigger, 13 enums | `uuid-ossp`, `pgcrypto`, `update_updated_at_column()`, 13 ENUM types | 1 |
| **02** | `20261104000002_create_core_identity_and_profiles.sql` | Subsystem 01: Core users, private PII, languages, preferences | `profiles`, `private_user_profiles`, `user_languages`, `user_preferences` | 2 |
| **03** | `20261104000003_create_creator_management.sql` | Subsystem 02: Creator profiles, audition applications, KYC records | `creator_profiles`, `creator_applications`, `creator_kyc_details` | 3 |
| **04** | `20261104000004_create_matching_and_discovery.sql` | Subsystem 03: Discovery settings, swipes, mutual matches | `discovery_preferences`, `discovery_swipes`, `matches`, `user_matches` view | 4 |
| **05** | `20261104000005_create_messaging_and_calls.sql` | Subsystem 04 & 05: LiveKit calls, holds, chat conversations, messages | `call_sessions`, `call_coin_holds`, `conversations`, `direct_messages` | 5 |
| **06** | `20261104000006_create_wallet_and_payment_orders.sql` | Subsystem 06: User wallets, coin packages catalog, Razorpay orders | `user_coin_wallets`, `coin_packages`, `payment_orders` | 6 |
| **07** | `20261104000007_create_virtual_gifts.sql` | Subsystem 06: Gifting catalog and transfer dispatch ledger | `virtual_gift_catalog`, `virtual_gift_transfers` | 7 |
| **08** | `20261104000008_create_creator_earnings_and_payouts.sql` | Subsystem 06: Creator earnings wallets, payout disbursement requests | `creator_earnings_wallets`, `creator_payout_requests` | 8 |
| **09** | `20261104000009_create_financial_journal_and_webhooks.sql` | Subsystem 06 & 08: Balanced double-entry general ledger, webhooks | `financial_journal_entries`, `inbound_webhook_events` | 9 |
| **10** | `20261104000010_create_moderation_and_audit_logs.sql` | Subsystem 07: User blocks, abuse reports, moderation actions, audit | `user_blocks`, `moderation_reports`, `moderation_actions`, `moderation_appeals`, `audit_logs` | 10 |
| **11** | `20261104000011_create_system_config_and_compliance.sql` | Subsystem 08: System configuration parameters, alerts, privacy | `system_configurations`, `notifications`, `user_privacy_requests` | 11 |
| **12** | `20261104000012_deferred_rls_policies_preview.sql` | Security review staging (strictly inactive in Gate 06A) | Commented preview of all 18 canonical RLS policies | N/A (Deferred) |

---

## 2. Dependency Graph & Foreign Key Ordering

Execution sequence strictly respects database relational dependencies:
1. `auth.users` and enumerations must precede `profiles`.
2. `profiles` must precede all user-referencing entities (`private_user_profiles`, `user_languages`, `user_preferences`, `creator_profiles`, `creator_applications`, `discovery_preferences`, `discovery_swipes`, `matches`, `call_sessions`, `conversations`, `direct_messages`, `user_coin_wallets`, `payment_orders`, `user_blocks`, `moderation_reports`, `audit_logs`, `notifications`, `user_privacy_requests`).
3. `creator_profiles` must precede `creator_kyc_details`, `virtual_gift_transfers`, `creator_earnings_wallets`, and `creator_payout_requests`.
4. `coin_packages` must precede `payment_orders`.
5. `virtual_gift_catalog` must precede `virtual_gift_transfers`.
6. `call_sessions` must precede `call_coin_holds` and optional references in `virtual_gift_transfers`.
7. `conversations` must precede `direct_messages`.
8. `moderation_reports` must precede `moderation_actions`, which in turn precedes `moderation_appeals`.

---

## 3. Idempotency & Rollback Guarantees

Every migration file adheres to idempotency standards:
- All table creations utilize `CREATE TABLE IF NOT EXISTS`.
- All index creations utilize `CREATE INDEX IF NOT EXISTS`.
- Custom enumerations are guarded with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.
- Seed data scripts utilize `ON CONFLICT (id) DO UPDATE ...` or `ON CONFLICT (config_key) DO UPDATE ...`.
- Triggers use `DROP TRIGGER IF EXISTS ...` followed by `CREATE TRIGGER ...`.
