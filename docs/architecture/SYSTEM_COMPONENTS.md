# NECTAR — System Components & Interface Architecture (Canonical Alignment)
**Document Reference:** `docs/architecture/SYSTEM_COMPONENTS.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md` & `CANONICAL_API_REGISTRY.md`  
**Author:** Principal Software Architect & Application Architect  

---

## 1. System Component Tier Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (UI)                          │
│  Next.js 16.4.5 App Router (React 19, Tailwind CSS v4, Motion)         │
│  16 Functional Prototype Modules in `src/components/`                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON) / WSS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION & API TIER                           │
│  Next.js Serverless Route Handlers in `src/app/api/`                   │
│  - Session Validation (@supabase/ssr)                                  │
│  - Upstash Sliding-Window Rate Limiting                                │
│  - Cryptographic Webhook Receivers (LiveKit, Razorpay)                 │
│  - Gemini Content Safety Filters                                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │ SQL Wire                │ WebRTC (DTLS-SRTP)      │ HTTPS REST
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ PERSISTENCE TIER │      │ VOICE MEDIA TIER │      │  PAYMENTS TIER   │
│ PostgreSQL 16    │      │ LiveKit SFU      │      │ Razorpay Gateway │
│ Supabase Cloud   │      │ Mumbai Cluster   │      │ India UPI/Cards  │
│ 24 Tables, RLS   │      │ WebRTC Audio     │      │ Webhooks & Orders│
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 2. UI Component to Backend Service & Table Mapping

| # | Existing UI Component | Primary Route Handler | Canonical Database Tables | External Dependencies |
| :-: | :--- | :--- | :--- | :--- |
| **01** | `AgeDeclarationModal.tsx` | `POST /api/auth/age-declaration` | `private_user_profiles`, `audit_logs` | None |
| **02** | `OnboardingModal.tsx` | `POST /api/auth/otp/send`, `/api/auth/otp/verify` | `profiles`, `private_user_profiles`, `user_languages` | Supabase Auth (SMS) |
| **03** | `LanguageSwitcher.tsx` | `PATCH /api/profiles/me` | `profiles`, `user_languages` | None |
| **04** | `DiscoveryCard.tsx` | `GET /api/discovery/feed`, `POST /api/discovery/swipe` | `profiles`, `creator_profiles`, `discovery_swipes`, `matches`, `user_blocks` | None |
| **05** | `VoiceNotePlayer.tsx` | Supabase Storage signed URLs | `creator_profiles.voice_intro_url` | Supabase Object Storage |
| **06** | `MatchRadarModal.tsx` | `POST /api/discovery/swipe` | `discovery_swipes`, `matches`, `conversations` | Supabase Realtime |
| **07** | `ActiveCallInterface.tsx` | `POST /api/calls/initiate`, `/api/calls/answer`, `/api/calls/terminate` | `call_sessions`, `call_coin_holds`, `user_coin_wallets`, `creator_earnings_wallets` | LiveKit WebRTC SFU |
| **08** | `CallBillingOverlay.tsx` | LiveKit Server Metering & Webhooks | `call_sessions`, `financial_journal_entries` | LiveKit Server SDK |
| **09** | `WalletModal.tsx` | `GET /api/wallet/packages`, `POST /api/wallet/purchase/create-order` | `user_coin_wallets`, `coin_packages`, `payment_orders` | Razorpay Checkout SDK |
| **10** | `VirtualGiftModal.tsx` | `GET /api/gifts/catalog`, `POST /api/gifts/send` | `virtual_gift_catalog`, `virtual_gift_transfers`, `financial_journal_entries` | Supabase Realtime |
| **11** | `MessagingModal.tsx` | Direct messages API & Realtime channels | `conversations`, `direct_messages`, `user_blocks` | Supabase Realtime |
| **12** | `CreatorDashboard.tsx` | `POST /api/creator/apply`, `POST /api/creator/kyc`, `POST /api/creator/payout/request` | `creator_profiles`, `creator_applications`, `creator_kyc_details`, `creator_payout_requests` | Bank / UPI Gateway |
| **13** | `BlockReportModal.tsx` | `POST /api/safety/block`, `POST /api/safety/report` | `user_blocks`, `moderation_reports` | Gemini Safety API |
| **14** | `ModeratorInterface.tsx`| Internal Review Handlers | `moderation_reports`, `moderation_actions`, `audit_logs` | Gemini Classification |
| **15** | `AdminAnalytics.tsx` | Aggregated Reporting Views | `financial_journal_entries`, `payment_orders`, `call_sessions`, `system_configurations` | None |
| **16** | `AudioSynthesizer.tsx` | Web Audio API / Fallback SFU | Browser AudioContext | Local Web Audio |

---

## 3. Strict Interface Contracts & Cross-Document Consistency

All table and endpoint names referenced in this document are strictly identical to `CANONICAL_SCHEMA_REGISTRY.md` and `CANONICAL_API_REGISTRY.md`.
