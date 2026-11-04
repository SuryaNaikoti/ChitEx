# Nectar — Sitemap & Routing Specification

> **Framework:** Next.js App Router (PWA)  
> **Route Protection:** Server-side Middleware + Role-Based Access Control (RBAC)  
> **Viewport Strategy:** Mobile-First Viewport (`max-w-md mx-auto`) with Bottom Navigation Bar

---

## 1. Route Hierarchy & Access Control Matrix

| Route Path | View / Page Title | Required Role | Description & Modals |
|---|---|---|---|
| `/` | Landing / Welcome | Guest / Any | Value proposition, language switcher, audio preview snippet, "Join Now" CTA |
| `/login` | Phone & Google Sign-In | Guest | Phone number input (+91), Google OAuth button, 18+ verification prerequisite |
| `/verify-otp` | OTP Verification | Guest | 6-digit OTP keypad, 60s cooldown timer, automatic resend lock |
| `/terms` | Terms of Service | Public | Age compliance, prohibited conduct, call billing disclosures |
| `/privacy` | Privacy Policy | Public | Data retention, zero location/phone sharing commitments |
| `/onboarding/age` | Age Assurance | Authenticated (Unverified) | Mandatory 18+ date of birth validation and legal declaration |
| `/onboarding/profile` | Profile Creation | Authenticated | Display name, avatar image upload, short bio, gender identity |
| `/onboarding/languages` | Language Selection | Authenticated | Selection of primary & secondary languages (Telugu, Hindi, English) |
| `/onboarding/interests` | Interests Selection | Authenticated | Topic tags (Cinema, Music, Tech, Relationships, Late-Night, Comedy) |
| `/discover` | Discover People | Registered User | Active user grid, language filters, availability status, direct call card |
| `/match` | Random Voice Matcher | Registered User | Radar radar animation, language queue picker, 30s match handshake |
| `/call/[id]` | Live Voice Connection | Call Participant | Fullscreen audio call UI, LiveKit room, coin meter, gift drawer, mute/hangup |
| `/messages` | Direct Messages | Registered User | List of active 1:1 conversation threads, unread counters, presence status |
| `/messages/[id]` | Chat Room | Conversation Participant | 1:1 text chat stream, block/report actions, message timestamps |
| `/profile` | My Account | Registered User | Self profile view, availability toggle, custom call rate, privacy controls |
| `/profile/[id]` | User Public Profile | Registered User | User profile modal/page, mutual interests, call rate disclosure, block button |
| `/wallet` | Coin Wallet | Registered User | Current coin balance, transaction history ledger, top-up package cards |
| `/wallet/checkout` | Razorpay Checkout | Registered User | UPI / Card payment modal, real-time balance update on success |
| `/creator/dashboard`| Creator Overview | Creator | Live call minutes hosted, gift summary, monthly analytics |
| `/creator/earnings` | Earnings Ledger | Creator | Real-time INR revenue ledger, gift breakdown, platform split summary |
| `/creator/payouts` | Payout Requests | Creator | UPI/Bank configuration, withdrawal request form (min ₹500), status |
| `/admin` | Admin Analytics | Super Administrator | Active concurrent calls, coin sales volume, financial liability metrics |
| `/admin/moderation`| Moderation Console | Moderator / Admin | Report ticket queue, Gemini toxicity flags, 1-click ban/suspend controls |
| `/admin/creators` | Creator Verifications | Super Administrator | Creator applications, KYC review, revenue share configuration |
| `/admin/packages` | Virtual Economy Admin| Super Administrator | Manage coin packages, gift pricing, seasonal promotional multipliers |

---

## 2. Layout Structure & UI Shells

```
App Root Layout (`src/app/layout.tsx`)
 ├── ServiceWorker Registration (PWA)
 ├── AudioContextProvider (Global Ringtone & Call Audio Element)
 ├── NotificationToastProvider
 │
 ├── Guest Layout (`src/app/(auth)/layout.tsx`)
 │    └── Minimal branding header, language selector, centered mobile container
 │
 ├── Core Mobile App Shell (`src/app/(main)/layout.tsx`)
 │    ├── Sticky HeaderBar (Logo, Coin Balance Pill, Notifications)
 │    ├── Main Content Scroll Area (`pb-20` for bottom navigation clearance)
 │    ├── Persistent Call Bar (Visible during active calls when minimized)
 │    └── Fixed Bottom Navigation Bar (5 Primary Tabs: Discover, Match, Messages, Wallet, Profile)
 │
 ├── Creator Portal Layout (`src/app/(creator)/layout.tsx`)
 │    ├── Creator Header (Total Earnings, Online Toggle)
 │    └── Tabbed Navigation (Overview, Gifts Ledger, Payouts)
 │
 └── Admin Console Layout (`src/app/(admin)/layout.tsx`)
      ├── Desktop & Tablet Responsive Shell
      ├── Sidebar Navigation (Overview, Moderation Queue, Creator Approvals, Economy Settings)
      └── Topbar with Moderator Session & Audit Indicators
```

---

## 3. Modal Dialogs & Sheets Hierarchy

1. **Incoming Call Sheet:**
   - Appears over any screen when an incoming call webhook/realtime event is received.
   - Shows caller's display name, avatar, language badge, and incoming audio chime.
   - Controls: Green Accept button, Red Decline button, Block caller.
2. **Pre-Call Pricing Confirmation Dialog:**
   - Triggered before dialing a user from their profile.
   - Discloses exact coin rate per minute (e.g. `20 Coins / min`).
   - Checks caller wallet: if balance < rate, automatically opens Coin Top-Up Sheet.
3. **In-Call Virtual Gift Bottom Sheet:**
   - Slides up without interrupting ongoing voice conversation.
   - Shows user's available coins, grid of animated gifts, and 1-tap "Send" with optimistic animation.
4. **Safety Report & Block Dialog:**
   - Accessible from call screen, chat screen, or profile view.
   - Radio buttons for violation category (Harassment, Inappropriate Audio, Underage, Spam).
   - "Block user immediately" checkbox enabled by default.
