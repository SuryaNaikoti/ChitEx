# Nectar — Project Engineering Conventions

> **Standard:** Production-Grade Modular Monolith  
> **Language:** TypeScript 5+ (Strict Mode)  
> **Target Framework:** Next.js App Router (React 19)

---

## 1. Directory Structure

The repository follows a domain-oriented modular structure inside `src/`:

```
nectar/
├── public/                     # Static assets, icons, sound effects, audio tones
│   ├── audio/                  # Dial tones, ringback, gift animations SFX
│   ├── gifts/                  # Lottie / SVG / WebP gift assets
│   └── icons/                  # PWA app icons (192x192, 512x512)
├── src/
│   ├── app/                    # Next.js App Router (Routes & Layouts)
│   │   ├── (auth)/             # Auth group: /login, /verify-otp, /onboarding
│   │   ├── (main)/             # App group: /discover, /match, /messages, /profile, /wallet
│   │   ├── (creator)/          # Creator portal: /creator/dashboard, /creator/earnings, /creator/payouts
│   │   ├── (admin)/            # Admin portal: /admin/users, /admin/moderation, /admin/finance
│   │   ├── api/                # API Route Handlers
│   │   │   ├── auth/           # OAuth callbacks & session handlers
│   │   │   ├── livekit/        # Token issuance & room lifecycle webhooks
│   │   │   ├── razorpay/       # Order generation & payment webhooks
│   │   │   └── moderation/     # AI automated text & audio checks
│   │   ├── layout.tsx          # Root layout with providers & theme definitions
│   │   └── page.tsx            # Landing & redirection dispatcher
│   ├── components/             # Reusable UI & presentation layer
│   │   ├── ui/                 # Primitive components (Button, Modal, Input, Badge, Sheet)
│   │   ├── layout/             # Header, BottomNavigation, MobileFrame, Sidebar
│   │   ├── audio/              # LiveKit AudioPlayer, MicToggle, CallTimer, Waveform
│   │   ├── discover/           # ProfileCard, LanguageFilter, AvailabilityBadge
│   │   ├── matching/           # MatchRadar, IncomingCallDialog, CallPricingCard
│   │   ├── wallet/             # CoinBalanceWidget, PackageCard, TransactionRow
│   │   ├── gifts/              # GiftPickerSheet, GiftOverlayAnimation, GiftBadge
│   │   └── moderation/         # ReportModal, BlockButton, ModeratorReviewCard
│   ├── hooks/                  # Custom React client hooks
│   │   ├── use-livekit-room.ts # WebRTC room state, audio tracks, speaking indicator
│   │   ├── use-wallet.ts       # Coin balance, top-up hooks, pending reservations
│   │   ├── use-presence.ts     # Supabase Realtime availability heartbeat
│   │   └── use-matchmaking.ts  # Queue participation, match events, acceptance timer
│   ├── lib/                    # Shared utilities & client initializers
│   │   ├── supabase/           # Supabase client (client.ts, server.ts, admin.ts)
│   │   ├── livekit/            # LiveKit server client & token generation utilities
│   │   ├── razorpay/           # Razorpay instance & webhook HMAC validation
│   │   ├── gemini/             # Gemini 2.5 Flash client for safety screening
│   │   ├── utils.ts            # Class merging (cn), currency formatters (INR)
│   │   └── constants.ts        # Coin rates, language enums, platform limits
│   ├── services/               # Core business logic service layer (Server-only)
│   │   ├── auth.service.ts     # User authentication, OTP rate limiting, age assurance
│   │   ├── user.service.ts     # Profile management, language/interest mappings
│   │   ├── matching.service.ts # Pool queuing, eligibility checks, mutual exclusion (blocks)
│   │   ├── call.service.ts     # Session tracking, server call billing, reservation reconciliation
│   │   ├── wallet.service.ts   # Ledger mutations, atomic debit/credit, balance validation
│   │   ├── gift.service.ts     # Gift sending, coin burning, creator earnings credit
│   │   └── moderation.service.ts# Reports queue, ban enforcement, Gemini toxicity scanning
│   ├── types/                  # Ambient and domain TypeScript types
│   │   ├── database.types.ts   # Generated / declared Supabase schema types
│   │   ├── user.ts             # Profile, languages, interests, roles
│   │   ├── call.ts             # Room state, call sessions, billing ticks
│   │   ├── economy.ts          # Packages, ledger transactions, gift catalogue
│   │   └── moderation.ts       # Report tickets, moderation decisions
│   └── validators/             # Zod validation schemas
│       ├── auth.schema.ts      # Phone, OTP, profile setup validation
│       ├── profile.schema.ts   # Bio length, language selection, interests
│       ├── payment.schema.ts   # Razorpay webhook payloads, top-up orders
│       └── call.schema.ts      # Call initiation params, token requests
```

---

## 2. Naming Conventions

| Category | Convention | Examples |
|---|---|---|
| **Directories** | `kebab-case` | `components/call-controls`, `services/wallet-service` |
| **Component Files** | `PascalCase.tsx` | `CallControls.tsx`, `GiftOverlay.tsx` |
| **Hook Files** | `use-camelCase.ts` | `use-livekit-room.ts`, `use-wallet.ts` |
| **Service Files** | `camelCase.service.ts` | `call.service.ts`, `wallet.service.ts` |
| **Schema Files** | `camelCase.schema.ts` | `auth.schema.ts`, `payment.schema.ts` |
| **TypeScript Types/Interfaces**| `PascalCase` | `UserProfile`, `CallSession`, `WalletLedgerEntry` |
| **Database Tables** | `snake_case` (plural) | `user_profiles`, `call_sessions`, `wallet_ledgers` |
| **Database Columns** | `snake_case` | `user_id`, `created_at`, `coin_balance` |
| **Environment Variables**| `UPPER_SNAKE_CASE` | `NEXT_PUBLIC_SUPABASE_URL`, `LIVEKIT_API_SECRET` |

---

## 3. TypeScript Standards

1. **Strict Type Safety:**
   - `"strict": true` is enforced in `tsconfig.json`.
   - Never use `any`. Use `unknown` with type guards or schema validation when incoming data is untrusted.
2. **Exhaustive Discriminated Unions:**
   - Call states, transaction types, and user roles must use discriminated string unions:
     ```typescript
     export type CallStatus =
       | 'initiating'
       | 'ringing'
       | 'connected'
       | 'reconnecting'
       | 'ended_normal'
       | 'ended_insufficient_funds'
       | 'ended_declined'
       | 'failed_network';
     ```
3. **Zod Parsing at Boundaries:**
   - All server actions, API route inputs, and webhook requests must validate input through Zod schemas before execution.
4. **Server vs. Client Separation:**
   - Files containing database connections, LiveKit API secrets, or Razorpay secret keys must declare `import 'server-only'` at the top.
   - Interactive components (audio player, dial pad, gift sheet) must declare `'use client'`.

---

## 4. Financial & Transactional Integrity Conventions

1. **Atomic Mutations:**
   - Every operation altering user coins or creator balances must execute within an explicit database transaction with row-level locks:
     ```sql
     SELECT coin_balance FROM user_wallets WHERE user_id = $1 FOR UPDATE;
     ```
2. **Immutable Double-Entry Ledger Pattern:**
   - User coin balances in `user_wallets` are materialized caches backed by the immutable append-only `wallet_ledger` table.
   - No row in `wallet_ledger` may ever be updated or deleted (`ON DELETE RESTRICT`, `ON UPDATE RESTRICT`).
3. **Idempotency Keys:**
   - All payment webhook events and gift transactions require a unique `idempotency_key` (e.g., `razorpay_payment_id` or client transaction UUID) to prevent replay or double spending.
4. **Server-Side Call Billing Ticks:**
   - Frontend timers are display-only. The server tracks `call_started_at` and computes billable minutes upon session closure or active minute pulses via LiveKit server webhooks.

---

## 5. Security & Privacy Rules

1. **Data Leakage Prevention:**
   - Public API endpoints and queries must never select `phone_number`, `auth_uid`, or precise `ip_address` or geolocation.
   - User profile endpoints only expose broad regional location (e.g., state or tier-1 metro) and public badges.
2. **Block-First Enforcement:**
   - All matching queries, user discovery feeds, message lookups, and call connection requests must join against the `user_blocks` table to filter out mutually blocked pairs in both directions:
     ```sql
     WHERE NOT EXISTS (
       SELECT 1 FROM user_blocks 
       WHERE (blocker_id = current_user_id AND blocked_id = candidate_id)
          OR (blocker_id = candidate_id AND blocked_id = current_user_id)
     )
     ```
3. **Age Verification Guard:**
   - Users cannot access discovery, matching, audio rooms, or gifting without `is_age_verified = true` (attested 18+).

---

## 6. Indian Localization Conventions

1. **Languages Supported in MVP:**
   - `te` — Telugu (తెలుగు)
   - `hi` — Hindi (हिन्दी)
   - `en` — Indian English (English)
2. **Currency Presentation:**
   - All fiat prices must display in Indian Rupees using the official currency symbol `₹` (e.g., `₹49`, `₹199`) and formatted using Indian Numbering system (`en-IN`: lakhs/crores formatting).
   - Coin amounts are represented with the 🍯 or 🪙 token symbol and whole integers (e.g., `120 Coins`).
3. **Phone Number Format:**
   - E.164 standard with India country code: `+91 XXXXX XXXXX`.
