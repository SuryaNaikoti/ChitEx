# NECTAR — Database Architecture & Entity Specification (Canonical Alignment)
**Document Reference:** `docs/architecture/DATABASE_ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Canonical Reference:** Aligned strictly with `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect & Database Architect  

---

## 1. Database Architecture Overview & Design Invariants

Nectar’s persistence layer is built on PostgreSQL 16 hosted via Supabase in the **AWS ap-south-1 (Mumbai)** region.

### Core Architectural Invariants
1. **Canonical Schema Alignment:** All entity definitions, table names, column names, enumerations, and relationships in this specification are identical to `CANONICAL_SCHEMA_REGISTRY.md`.
2. **UUID Primary Keys:** Every table uses `UUIDv4` generated via `gen_random_uuid()`.
3. **Double-Entry General Ledger:** Financial states are not merely mutable counters; all mutations are driven by immutable double-entry records in `financial_journal_entries`.
4. **Data Isolation (Public vs. Private):** Public discovery attributes are segregated in `profiles`, while sensitive identity and contact data are strictly secured in `private_user_profiles`.
5. **Non-Recursive RLS:** Row Level Security policies use dedicated `SECURITY DEFINER` lookup functions to eliminate recursive subquery overhead and prevent role escalation.

---

## 2. Master Entity Relationship & Dependency Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE IDENTITY & PROFILES                        │
│                                                                        │
│   ┌───────────────┐     1:1     ┌────────────────────────┐             │
│   │   profiles    ├─────────────┤  private_user_profiles │             │
│   └───┬───────┬───┘             └────────────────────────┘             │
│       │       │                                                        │
│       │1:N    │1:1                                                     │
│       │       ▼                                                        │
│       │   ┌────────────────────┐   1:1   ┌───────────────────────┐     │
│       │   │  creator_profiles  ├─────────┤  creator_kyc_details  │     │
│       │   └─────────┬──────────┘         └───────────────────────┘     │
│       ▼             │                                                  │
│   ┌───────────────┐ │                                                  │
│   │user_languages │ │                                                  │
│   └───────────────┘ │                                                  │
└───────┬─────────────┼──────────────────────────────────────────────────┘
        │             │
        ▼             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SOCIAL GRAPH, DISCOVERY & CALLS                      │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────┐                        │
│   │ discovery_swipes    │   │  user_blocks    │ (Bidirectional)        │
│   └─────────┬───────────┘   └─────────────────┘                        │
│             │                                                          │
│             ▼                                                          │
│   ┌─────────────────────┐   ┌─────────────────┐                        │
│   │      matches        │   │  conversations  │                        │
│   └─────────────────────┘   └────────┬────────┘                        │
│                                      │                                 │
│                                      ▼                                 │
│                             ┌─────────────────┐                        │
│                             │ direct_messages │                        │
│                             └─────────────────┘                        │
│                                                                        │
│   ┌─────────────────────┐   1:1   ┌────────────────────┐               │
│   │    call_sessions    ├─────────┤  call_coin_holds   │               │
│   └─────────┬───────────┘         └────────────────────┘               │
└─────────────┼──────────────────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FINANCIAL GENERAL LEDGER & WALLETS                   │
│                                                                        │
│   ┌──────────────────────┐         ┌───────────────────────────────┐   │
│   │  user_coin_wallets   │         │   creator_earnings_wallets    │   │
│   └──────────┬───────────┘         └───────────────┬───────────────┘   │
│              │                                     │                   │
│              └─────────────────┬───────────────────┘                   │
│                                │                                       │
│                                ▼                                       │
│              ┌───────────────────────────────────┐                     │
│              │    financial_journal_entries      │ (Double-Entry)      │
│              └─────────────────▲─────────────────┘                     │
│                                │                                       │
│      ┌─────────────────────────┼─────────────────────────┐             │
│      │                         │                         │             │
│  ┌───┴────────────┐  ┌─────────┴──────────────┐  ┌───────┴──────────┐  │
│  │ payment_orders │  │ virtual_gift_transfers │  │ creator_payouts  │  │
│  └────────────────┘  └────────────────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Entity Definitions

### 3.1 Identity Subsystem
- `profiles`: Public identity (Display name, avatar, bio, gender, role, primary language).
- `private_user_profiles`: Confidential identity (E.164 phone number, DOB, age assurance tier, coarse location).
- `user_languages`: Multi-language proficiency matrix.

### 3.2 Creator Monetization Subsystem
- `creator_profiles`: Public creator status, verified availability, call rates, voice intro URL, aggregate rating.
- `creator_applications`: Audition voice submissions, portfolio notes, admin review workflow.
- `creator_kyc_details`: Encrypted PAN, bank account numbers, IFSC codes, masked previews.

### 3.3 Voice & Social Discovery Subsystem
- `discovery_preferences`: User filter preferences for discovery feed.
- `discovery_swipes`: Recorded directional swipes with unique pair constraint.
- `matches`: Mutual connections with canonical smaller-UUID indexing.
- `conversations`: Canonical 1-to-1 chat channel containers.
- `direct_messages`: End-to-end user chat messages.
- `call_sessions`: Server-authoritative call metadata, rates, durations, and state machine.
- `call_coin_holds`: Pre-call fund reservations ensuring solvency.

### 3.4 Financial & Ledger Subsystem
- `user_coin_wallets`: User virtual coin balance cache with pessimistic concurrency control.
- `creator_earnings_wallets`: Creator accrued INR balances with pending payout segregation.
- `financial_journal_entries`: Double-entry general ledger recording balanced debits and credits across 9 chart accounts.
- `coin_packages`: In-app coin purchase catalog with INR pricing.
- `payment_orders`: Razorpay order lifecycle with cryptographic signatures.
- `virtual_gift_catalog`: Available gifts with coin pricing and animation tokens.
- `virtual_gift_transfers`: Permanent dispatch records linking sender, creator, and call context.
- `creator_payout_requests`: Withdrawal disbursement workflow with TDS withholding tracking.

### 3.5 Governance & Safety Subsystem
- `user_blocks`: Bidirectional blocking entries.
- `moderation_reports`: Abuse and content reporting workflow.
- `moderation_actions`: Enforcement history (warnings, suspensions, bans).
- `moderation_appeals`: User dispute and appeal workflow.
- `audit_logs`: Immutable security and legal compliance event stream.
- `system_configurations`: Configurable commercial and compliance parameters.
- `inbound_webhook_events`: Idempotent deduplication ledger for Razorpay and LiveKit webhooks.
- `notifications`: User notification delivery tracking.
- `user_privacy_requests`: India DPDP Act 2023 compliance records.

---

## 4. Verification and Schema Consistency

All table and column names in this document match `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md` with zero divergence.
