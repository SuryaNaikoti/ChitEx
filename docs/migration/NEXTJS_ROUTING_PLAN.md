# Nectar — Next.js Routing Architecture Plan

> **Milestone:** Gate 05A Routing Blueprint  
> **Framework Target:** Next.js 14/15 App Router  
> **Auditor:** Principal Software Architect

---

## 1. App Router Directory Structure

The Next.js App Router file-system structure aligns with the approved `SITEMAP.md` specification:

```
src/app/
├── globals.css                 # Global CSS with Tailwind v4 & custom scrollbar suppression
├── layout.tsx                  # Root HTML shell, PWA metadata, viewport, font definitions
├── page.tsx                    # Core interactive app entry point & tab coordinator
│
├── (main)/                     # Protected Core Experience (Phase 2 decomposition)
│   ├── discover/page.tsx       # /discover route
│   ├── match/page.tsx          # /match route
│   ├── messages/page.tsx       # /messages route
│   ├── wallet/page.tsx         # /wallet route
│   └── profile/page.tsx        # /profile route
│
├── call/
│   └── [id]/page.tsx           # /call/:id dedicated deep-linkable WebRTC audio session
│
└── api/                        # Next.js Route Handlers (Server-Only Boundaries)
    ├── auth/session/route.ts   # Session validation
    ├── livekit/token/route.ts  # Mint server-authorized LiveKit tokens
    ├── livekit/webhook/route.ts# Receive room lifecycle & duration events
    ├── razorpay/order/route.ts # Create Razorpay payment orders
    ├── razorpay/webhook/route.ts# Verify HMAC SHA-256 signatures & credit ledger
    └── moderation/check/route.ts# Gemini toxicity screening
```

---

## 2. Phased Routing Execution Strategy

To eliminate risk of breaking the existing user experience while migrating, routing is executed in two focused phases:

### Phase 1: Consolidated Single-Page Shell (`src/app/page.tsx`)
- Mount the entire interactive Nectar prototype inside `src/app/page.tsx` as a Client Component (`'use client'`).
- The root layout (`src/app/layout.tsx`) handles `<head>` metadata, theme color (`#0c0c0e`), viewport (`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`), and font smoothing.
- **Benefits:** Instant zero-loss migration; tab switching between Discover, Radar Match, Messages, and Wallet remains instantaneous with zero page reload flicker; call modals and gift animations remain uninterrupted in memory.

### Phase 2: Route Handler Endpoints & Deep-Linking (Gates 06 & 07)
- Mount the server API routes under `src/app/api/` for LiveKit token minting and Razorpay webhooks.
- Provide hash-based or sub-route deep-linking for `/call/[id]` so incoming call links open the exact room context directly.

---

## 3. Metadata & PWA Configuration (`src/app/layout.tsx`)

Replacing the static `index.html`, `src/app/layout.tsx` exports the official Next.js `metadata` and `viewport` objects:

```typescript
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0c0c0e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Nectar — Voice-First Social Discovery',
  description: 'Voice-first social discovery and entertainment platform for India featuring real-time audio connections, premium calling, coin wallet economy, and creator gifting.',
  openGraph: {
    title: 'Nectar — Voice-First Social Discovery',
    description: 'Voice-first social discovery and entertainment platform for India.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```
