# NECTAR — System Architecture & Topology Specification (Canonical Alignment)
**Document Reference:** `docs/architecture/ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Global Architecture Specification  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect & Systems Architect  

---

## 1. System Topology & Architectural Invariants

Nectar is architected as a modular monolith running on **Next.js 16.4.5 App Router**, backed by **Supabase PostgreSQL 16**, **LiveKit WebRTC SFU**, and **Razorpay India Payment Gateway**.

```
                        ┌──────────────────────────────────────────────┐
                        │              CLIENT LAYER (PWA)              │
                        │  Next.js 16.4.5 App Router (React 19)        │
                        │  Tailwind CSS v4 • Hinge/Raya Aesthetic     │
                        └───────┬──────────────────────────────┬───────┘
                                │                              │
                     HTTPS / WSS│ (State & Signalling)         │WebRTC (Media)
                                ▼                              ▼
┌────────────────────────────────────────────────────────┐ ┌────────────────────────┐
│                   APPLICATION CORE                     │ │     LIVE MEDIA SFU     │
│ Next.js Route Handlers (`src/app/api/...`)             │ │ LiveKit Cloud (Mumbai) │
│ • Session Auth (@supabase/ssr)                         │ │ • WebRTC Opus Audio    │
│ • Server-Authoritative Call Holds & Metering           │ │ • Participant Tracks   │
│ • Cryptographic Webhook Receivers                      │ │ • Egress Duration Logs │
│ • Upstash Sliding-Window Rate Limiter                  │ └───────────┬────────────┘
└───────────────────────────┬────────────────────────────┘             │
                            │                                          │
            ┌───────────────┼───────────────┐                          │
            │               │               │                          │Webhooks
            ▼               ▼               ▼                          ▼
┌───────────────────┐ ┌───────────┐ ┌───────────────┐ ┌────────────────────────────────┐
│     SUPABASE      │ │ RAZORPAY  │ │  GEMINI API   │ │   INBOUND WEBHOOK PROCESSING   │
│  (ap-south-1)     │ │  GATEWAY  │ │ (Google AI)   │ │  Idempotent deduplication via  │
│ • PostgreSQL 16   │ │• Orders   │ │• Content      │ │  `inbound_webhook_events`     │
│ • 24 Canonical RLS│ │• Webhooks │ │  Safety Moder-│ └────────────────────────────────┘
│ • Double-Entry GL │ │• UPI/Cards│ │  ation        │
│ • Realtime & Auth │ └───────────┘ └───────────────┘
└───────────────────┘
```

---

## 2. Core Subsystem Architectural Topology

1. **Identity & Age Assurance Subsystem:**
   - Strict segregation between public presentation (`profiles`) and private identity (`private_user_profiles`).
   - Progressive age assurance tiering (`declared_only` $\rightarrow$ `verified_payment` / `verified_id`).
2. **Server-Authoritative Call Billing Subsystem:**
   - Zero frontend clock authority. LiveKit webhooks signal actual media connection.
   - Pre-call fund reservation via `call_coin_holds` prevents overdraft.
   - Durable 60-second metering loops debit coins and credit creator earnings atomically.
3. **Double-Entry General Ledger Subsystem:**
   - Virtual coins are utility tokens, distinct from INR.
   - All financial mutations are journaled across balanced chart accounts in `financial_journal_entries`.
4. **Creator Platform & KYC Subsystem:**
   - Multi-stage onboarding: Application $\rightarrow$ Voice Audition $\rightarrow$ Admin Review $\rightarrow$ Encrypted KYC Submission $\rightarrow$ Active Monetization.
   - Bank details and PAN are encrypted via AES-256 in `creator_kyc_details`.
5. **Real-time Dual Network Architecture:**
   - App state and chat: Supabase Realtime WSS.
   - Voice calls: LiveKit WebRTC DTLS-SRTP audio streams.

---

## 3. Cross-Document Alignment Confirmation

All references to entities, tables, endpoints, and parameters across this document strictly mirror `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md`, `docs/architecture/CANONICAL_API_REGISTRY.md`, and `docs/architecture/FINANCIAL_ACCOUNTING_SPECIFICATION.md`.
