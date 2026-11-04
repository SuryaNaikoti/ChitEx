# Nectar — MVP Scope & Release Criteria

> **Document Version:** 1.0 (Approved Product Baseline)  
> **Release Target:** V1 MVP Core Social Discovery  
> **Target Audience:** Product Managers, Engineering Leads, and Security Compliance

---

## 1. V1 Scope Matrix (Included vs. Excluded)

### 1.1 In-Scope Features (V1 Core Baseline)

| Module ID | Feature / Capability | Scope Description & Boundaries |
|---|---|---|
| **M01** | Phone & Google Authentication | E.164 +91 mobile numbers, SMS OTP with rate limits (3 per 10m), Google OAuth sign-in. |
| **M02** | 18+ Age Assurance | Strict birthdate confirmation and legal declaration; under-age users blocked immediately. |
| **M03** | User Profiles & Avatars | Public display name, avatar upload to Supabase Storage, bio (max 250 chars), broad regional location. |
| **M04** | Language & Interest Taxonomy | First-class support for Telugu (`te`), Hindi (`hi`), English (`en`); 12 curated interest tags. |
| **M05** | User Discovery Feed | Available online users grid, language filtering tabs, availability indicators, transparent call pricing pill. |
| **M06** | Random Voice Match Queue | Language-partitioned matchmaking queue, 15-second handshake card, skip & reconnect controls. |
| **M07** | Premium 1:1 Voice Calling | LiveKit WebRTC audio connection, mic mute/speaker toggle, live call duration timer, network quality badge. |
| **M08** | Server-Authoritative Call Billing | Transparent per-minute rate disclosure, pre-call wallet hold, minute-by-minute atomic debit, balance warnings. |
| **M09** | Basic 1:1 Direct Messaging | Text conversations, delivery timestamps, read status indicators, spam throttle (max 5 unreplied msgs). |
| **M10** | Coin Wallet Ledger | User coin balance, immutable append-only ledger, transaction history view (top-ups, call debits, gifts). |
| **M11** | Razorpay Coin Packages | 3 packages (`₹49` for 50 coins, `₹199` for 275 coins, `₹499` for 800 coins), UPI/cards checkout, webhook signatures. |
| **M12** | Virtual Gifts & Animations | 4 distinct gifts (Rose 10🪙, Coffee 25🪙, Crown 100🪙, Peacock 500🪙), in-call full-screen particle animation. |
| **M13** | Creator Earnings Ledger | 60% revenue share allocation on received gifts, separate INR earnings ledger, pending vs withdrawable balance. |
| **M14** | Creator Payout Requests | Minimum ₹500 payout threshold, payout destination entry (UPI ID or Bank IFSC), status tracking. |
| **M15** | Instant Bidirectional Blocking | 1-tap block from calls, chats, or profiles; immediately severs active connections and removes from discovery. |
| **M16** | User Safety Reporting | Categorized report submission (Harassment, Inappropriate Audio, Underage, Spam), optional audio metadata. |
| **M17** | Gemini AI Moderation Pipeline | Automated text/bio profanity scanning, automated toxicity scoring (0.0–1.0) on reported transcripts. |
| **M18** | Admin & Moderator Dashboard | User management, report queue with priority sorting, 1-click ban/suspend, creator payout review, revenue KPIs. |
| **M19** | Mobile PWA Shell | PWA manifest, service worker caching, standalone mobile browser viewport, touch-friendly 44px+ hit targets. |

---

### 1.2 Out-of-Scope for V1 (Deferred to Future Gates)

| Feature | Deferred Gate | Technical Rationale |
|---|---|---|
| **Multi-Host Live Audio Broadcast Rooms** | V1.1 (Community) | Requires complex multi-track audio mixing, stage management, and broad listener scaling. |
| **Video Calling** | V2.0 (Expansion) | Massive increase in bandwidth costs and device performance overhead in early India pilot. |
| **International Currencies / Multi-Currency** | V3.0 (Global) | MVP strictly focuses on India rails (Razorpay, INR, UPI). Cross-border tax & FX out of scope. |
| **Unrestricted Media / Image Sharing in Chat** | V1.1 | High safety risk (unsolicited explicit imagery); text-only messaging enforced for V1. |
| **Social Feed / Public Status Posts** | V2.0 | Nectar is voice-first, avoiding endless scrolling social wall dynamics. |
| **Multiplayer In-Call Casual Games** | V2.0 | Adds real-time state synchronization overhead before voice discovery loop is validated. |
| **Automated Bank Transfer Disbursal (RazorpayX)** | V1.1 | Payout requests in V1 are recorded and approved via admin console with manual/batch UPI settlement. |

---

## 2. Acceptance Criteria by Module

### 2.1 Call Billing Integrity
- **AC-01:** If a user with 15 coins attempts to call a host with a rate of 20 coins/min, the call MUST NOT dial and MUST present the Coin Top-Up bottom sheet.
- **AC-02:** If caller balance drops below 1 minute during an active call, a warning chime and visual countdown MUST trigger. If balance reaches 0, the server MUST terminate the LiveKit room within 5 seconds.
- **AC-03:** Disconnecting a call before 10 seconds (unsuccessful connection) MUST release the pre-authorized hold with 0 coins deducted.

### 2.2 Safety & Blocking
- **AC-04:** Blocking a user MUST immediately terminate any ongoing LiveKit voice call between them.
- **AC-05:** Mutually blocked users MUST NEVER appear in search results, user discovery grids, or random match queues.

### 2.3 Financial Ledger Idempotency
- **AC-06:** Duplicate webhook dispatches from Razorpay with the same `payment_id` MUST be handled idempotently and MUST NOT credit coins more than once.
- **AC-07:** Coin purchases MUST NEVER directly increment creator withdrawable balances. Only approved virtual gift allocations can credit creator balances.

---

## 3. Pilot Targets & Key Performance Indicators (KPIs)

| Metric | Target | Tracking Mechanism |
|---|---|---|
| **Registered Users** | 1,000 | `user_profiles` count |
| **Monthly Active Users (MAU)** | 500 | Active session / heartbeat logs |
| **Approved Active Creators** | 20 | `creator_profiles` where status = 'approved' |
| **Successful Voice Connections** | 2,000 | `call_sessions` where status = 'ended_normal' |
| **First-Session Connection Rate** | > 70% | Funnel: Onboarding Complete -> 1st Call Started |
| **Day-7 User Retention** | > 20% | Cohort return events within 7 days |
| **Paying User Conversion** | 3% – 5% | Distinct users with `wallet_ledger` top-ups / Total Users |
| **Report Resolution Time** | < 4 hours | Time from `user_reports.created_at` to `resolved_at` |

---

## 4. Release Gating Roadmap

- **Gate 01–03:** PRD Approval & Architectural Baseline *(Completed)*
- **Gate 04 — Foundation Development:**
  - Setup Next.js application shell, mobile viewport, Supabase Auth integration, RLS policies, and PWA manifest.
- **Gate 05 — Core Product:**
  - Build User Profiles, Language/Interest discovery, Random Match Radar, and LiveKit WebRTC 1:1 voice calling.
- **Gate 06 — Monetization & Economy:**
  - Build Coin Wallet, Razorpay payment flows, Webhook signature verification, Atomic Ledger, Virtual Gifts, and Creator Earnings.
- **Gate 07 — Safety & Administration:**
  - Build Instant Blocking, Report submission, Gemini safety evaluation, Moderator review console, and Admin metrics.
- **Gate 08 — QA, Performance & Controlled Pilot:**
  - Run end-to-end load tests, simulated low-bandwidth WebRTC calls (2G/3G conditions), financial balance reconciliation, and launch pilot.
