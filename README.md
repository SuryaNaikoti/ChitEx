# Nectar — Voice-First Social Discovery & Entertainment Platform

> **Version:** 1.0 (Baseline Architecture & Engineering Documentation)  
> **Initial Market:** India (Telugu, Hindi, English)  
> **Platform Target:** Mobile-First Progressive Web Application (PWA)  
> **Architecture Pattern:** Modular Monolith (Next.js App Router, Supabase PostgreSQL & Auth, LiveKit WebRTC, Razorpay, Gemini AI Moderation)

---

## 1. Executive Summary

**Nectar** is a voice-first social discovery and entertainment platform engineered specifically for adult users (18+) across India. The product prioritizes authentic spoken human interaction over superficial text feeds, establishing voice as the primary communication vector.

### Core Pillars
1. **Authentic Human Connection:** Friction-free voice discovery and match queues paired with transparent language compatibility (Telugu, Hindi, English).
2. **Predictable & Transparent Coin Economy:** Server-enforced, coin-metered calling with upfront rate disclosures, atomic wallet reservations, and zero client-trusted billing timers.
3. **Creator Empowerment:** Clean separation between user coin wallet spending and creator earnings, with verified virtual gifting and structured payout pipelines.
4. **Safety & Moderation by Design:** Multi-tier safety featuring age assurance, profile verification, real-time reporting/blocking, automated Gemini content & safety checks, and an internal human moderator review console.
5. **Robust Scalable Infrastructure:** A modular monolith architecture backed by Supabase PostgreSQL with strict Row Level Security (RLS), LiveKit cloud WebRTC infrastructure, and Razorpay payment webhooks with signature verification and idempotent settlement.

---

## 2. Technology Stack & Infrastructure

| Layer | Technology | Purpose / Configuration |
|---|---|---|
| **Frontend Framework** | Next.js (App Router) + React 19 + TypeScript | Server & Client Components, PWA manifests, responsive mobile-first UI |
| **Styling & UI Kit** | Tailwind CSS v4 + Radix/shadcn-style accessible primitives + Lucide Icons | Mobile-first viewport, dark-mode native palette, ergonomic touch targets (min 44px) |
| **Voice / Realtime Media** | LiveKit Cloud / LiveKit Server SDK | Low-latency SFU voice rooms, dynamic server-authorized access tokens, mute/deafen controls |
| **Primary Database & Auth** | Supabase (PostgreSQL 15+) + Supabase Auth + Supabase Realtime | Relational schema, Row Level Security (RLS), real-time presence and message streaming |
| **Object Storage** | Supabase Storage | S3-compatible encrypted buckets for avatars, verification media, and asset storage |
| **Payments & Payouts** | Razorpay Node SDK & Webhooks | UPI, NetBanking, cards, wallet top-ups, idempotent webhook processing with HMAC signatures |
| **Safety & Moderation AI** | Google Gemini API (`@google/genai`) | Automated text/bio moderation, toxic transcript flag detection, OCR verification aids |
| **State & Data Fetching** | Server Actions + TanStack Query / React Hooks | Optimistic UI updates, cache invalidation, network offline detection |

---

## 3. Engineering Documentation Map

This repository's foundational architecture and specification suite is structured into dedicated living documents:

1. [**`ARCHITECTURE.md`**](./ARCHITECTURE.md)  
   High-level system topology, modular monolith boundaries, data flow diagrams, network boundaries, and security rules.
2. [**`PROJECT_CONVENTIONS.md`**](./PROJECT_CONVENTIONS.md)  
   TypeScript types, folder hierarchies, code style, state management rules, API conventions, and database standards.
3. [**`SYSTEM_COMPONENTS.md`**](./SYSTEM_COMPONENTS.md)  
   Component-by-component functional specifications, service layer abstractions, database schemas, and background job handlers.
4. [**`SITEMAP.md`**](./SITEMAP.md)  
   Comprehensive URL routing hierarchy, layout boundaries, role-based route guards, and modal overlays.
5. [**`USER_FLOWS.md`**](./USER_FLOWS.md)  
   Step-by-step user journey state machines: Onboarding & Age Assurance, Random Match Queue, Premium 1:1 Voice Call, Virtual Gifting, and Dispute Resolution.
6. [**`MVP_SCOPE.md`**](./MVP_SCOPE.md)  
   Exhaustive matrix of V1 Included vs. Excluded features, validation acceptance criteria, and Gate 04–08 release roadmap.

---

## 4. Development Gates & Roadmap

- **Gate 01–03:** PRD Approval & Architectural Baseline *(Current Stage)*
- **Gate 04 — Foundation Development:** App routing scaffolding, Supabase configuration, RLS schema setup, session authentication, and PWA manifest.
- **Gate 05 — Core Product:** User profiles, language/interest filtering, matchmaking queue, messaging, and LiveKit audio room integration.
- **Gate 06 — Monetization & Economy:** Razorpay order creation, payment webhooks, atomic coin ledger, server-side call meter, virtual gifts, and creator payout ledgers.
- **Gate 07 — Safety & Administration:** Report queues, blocking mechanisms, Gemini safety pipeline, moderator dashboard, and admin business metrics.
- **Gate 08 — QA, Performance & Controlled Pilot:** Security audit, financial reconciliation stress testing, WebRTC network fallback testing, and pilot launch.

---

## 5. Security & Architectural Principles

- **No Client Trust for Finance:** All coin deductions, call duration billing, gift transfers, and wallet credits are executed strictly server-side using PostgreSQL transactions (`BEGIN...COMMIT`) with row-level locks (`SELECT ... FOR UPDATE`).
- **Tokenized Media Authorization:** LiveKit connection tokens are generated transiently on the server with TTLs (< 5 minutes) only after validating participant authorization, room status, and wallet solvency.
- **Strict Data Segregation:** Client applications never receive raw service-role keys or direct access to other users' phone numbers, precise geographic locations, or private ledger transactions.
- **Auditability:** Every financial deduction, call log, report submission, and administrative action writes an immutable record to the database audit tables.
