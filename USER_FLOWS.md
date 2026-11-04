# Nectar — User Flows & State Machines

> **Standard:** Complete Operational Workflows, Edge-Case Handling, and State Transition Diagrams  
> **Key Protocols:** Server-Authoritative State, Optimistic UI Updates, Atomic Database Commits

---

## Flow 1: Authentication, 18+ Age Assurance & Onboarding

```
[Guest Lands on Nectar]
           │
           ▼
[Step 1: Phone / Google Auth Selection]
  - User enters +91 Mobile Number OR selects Google SSO
  - System checks rate limit (max 3 attempts per 10 mins)
  - SMS OTP dispatched via Gateway
           │
           ▼
[Step 2: OTP Verification (/verify-otp)]
  - User enters 6-digit code
  - If valid: Supabase Auth session token issued
  - If invalid: Error feedback + retry counter decremented
           │
           ▼
[Step 3: Age Assurance Guard (/onboarding/age)]
  - Mandatory legal declaration: "I confirm I am 18 years of age or older"
  - User selects Date of Birth
  - If age < 18: System immediately denies registration and revokes session
  - If age >= 18: `is_age_verified = TRUE` committed to user profile
           │
           ▼
[Step 4: Profile Details (/onboarding/profile)]
  - Display name (2-30 chars, profanity filtered via Gemini)
  - Avatar photograph selection (uploaded to Supabase Storage)
  - Gender preference & short bio
           │
           ▼
[Step 5: Language Affinities (/onboarding/languages)]
  - User selects Primary Language (Telugu / Hindi / English)
  - User optionally selects secondary languages
           │
           ▼
[Step 6: Interest Tags Selection (/onboarding/interests)]
  - Select 3+ topics (e.g., Late Night Talks, Cinema, Telugu Comedy, Music)
           │
           ▼
[Completion: User Wallet Provisioned with Welcome Bonus (e.g. 30 Free Coins) -> Redirected to /discover]
```

---

## Flow 2: Random Voice Discovery & Matchmaking Handshake

```
[User Navigates to /match]
           │
           ▼
[Step 1: Queue Entry]
  - User selects language queue (e.g. "Telugu Voice Lounge")
  - System verifies:
      a) User is online and not already in a call
      b) User has minimum coin balance (>= 15 coins)
  - Client enters `match_queue` in Supabase
           │
           ▼
[Step 2: Radar Search Animation]
  - System polls / matches candidate with mutual language compatibility
  - Excludes any user in `user_blocks`
  - Prevents rematching same user within 12 hours
           │
           ▼
[Step 3: Match Found & 15-Second Handshake]
  - Radar stops, profile preview card revealed:
      - Display Name, Avatar, Mutual Languages & Interests
  - Both users see a 15-second countdown timer with "Connect" or "Skip"
  - If either user taps "Skip": queue resumes instantly
  - If timer expires without action: both returned to idle
           │
           ▼
[Step 4: Mutual Acceptance Handshake]
  - When BOTH users tap "Connect":
      a) Server creates `call_session` (status: 'initiating')
      b) Mints two scoped LiveKit room tokens
      c) Dispatches room credentials via Supabase Realtime
      d) Client automatically transitions to `/call/[call_id]`
```

---

## Flow 3: Premium 1:1 Voice Call Initiation & Real-Time Billing

```
[Caller Views Host Profile on /discover or /profile/[id]]
           │
           ▼
[Step 1: Pre-Call Rate Disclosure]
  - UI displays host call rate: "20 Coins / min"
  - Caller taps "Start Voice Call"
  - Server pre-flight validation:
      - Check Caller Wallet: Balance >= 20 coins
      - Check Host Status: Host is online and not in another call
      - Check Blocks: Neither party has blocked the other
  - IF INSUFFICIENT BALANCE:
      - Intercept call, open Coin Purchase Sheet (`₹49` package quick-pay)
           │
           ▼
[Step 2: Atomic Hold & Outgoing Dialing]
  - Server locks caller wallet and reserves hold: `call_holds` (amount: 20 coins)
  - Caller UI transitions to Outgoing Ringing Screen with dial tone
  - Server pushes Supabase Realtime incoming call alert to Host device
           │
           ▼
[Step 3: Call Acceptance or Rejection]
  - Host answers within 30 seconds:
      - Call status transitions to 'connected'
      - Exact timestamp `started_at = NOW()` recorded
      - Audio streams connect via LiveKit SFU
  - Host declines OR 30s timeout expires:
      - Call marked as 'ended_declined'
      - Reserved coins in `call_holds` are released back to caller
      - Dialing screen terminates
           │
           ▼
[Step 4: Continuous Server Billing Loop (During Active Call)]
  - Server-side scheduler monitors active session duration
  - At each minute mark (60s, 120s, 180s...):
      - Atomically deducts 20 coins from caller's wallet in `wallet_ledger`
      - Updates `total_coins_billed` in `call_sessions`
      - Computes creator earnings: `20 coins * 60% * conversion_rate` -> `creator_earnings_inr`
  - LOW BALANCE WARNING:
      - When caller's balance has < 1 minute remaining, an unobtrusive audio chime plays
      - UI flashes "Low Balance - 60s remaining" with a 1-tap quick top-up button
  - BALANCE EXHAUSTED:
      - If balance hits 0 and no top-up completed: server calls LiveKit `DeleteRoom` API
      - Session ends cleanly with reason 'ended_insufficient_balance'
           │
           ▼
[Step 5: Call Teardown & Summary]
  - Either user taps "End Call":
      - WebRTC connection closed
      - LiveKit sends `room_finished` webhook
      - Server finalizes billable duration and releases any remaining hold
      - Summary dialog displayed: Duration, Coins Billed, Rate User / Send Thank You Gift
```

---

## Flow 4: Coin Wallet Top-Up via Razorpay

```
[User Clicks "Add Coins" on /wallet or in-call sheet]
           │
           ▼
[Step 1: Select Package]
  - Tier 1: ₹49 -> 50 Coins (Starter)
  - Tier 2: ₹199 -> 250 Coins + 25 Bonus Coins (Popular)
  - Tier 3: ₹499 -> 700 Coins + 100 Bonus Coins (VIP Value)
           │
           ▼
[Step 2: Server Order Creation]
  - Client calls Server Action `createRazorpayOrder(packageId)`
  - Server validates package pricing and creates Razorpay Order via API
  - Server returns `order_id` and public `key_id`
           │
           ▼
[Step 3: Razorpay India Checkout SDK]
  - Modal opens natively: UPI (GPay, PhonePe, Paytm, CRED), NetBanking, Cards
  - User authorizes payment on their UPI app
           │
           ▼
[Step 4: Secure Webhook Processing & Credit]
  - Razorpay server fires `payment.captured` webhook to `/api/razorpay/webhook`
  - Server validates HMAC SHA-256 signature against `RAZORPAY_WEBHOOK_SECRET`
  - System executes atomic database transaction:
      a) Check `wallet_ledger` for duplicate `idempotency_key = payment_id`
      b) Insert credit entry into `wallet_ledger`
      c) Increment `user_wallets.coin_balance`
  - Client receives realtime wallet refresh event via Supabase Realtime
  - Success celebration animation displays: "Coins Added Successfully!"
```

---

## Flow 5: In-Call Virtual Gift Dispatch

```
[During Active Call, Caller Taps "Gift" Icon]
           │
           ▼
[Step 1: Gift Sheet Slides Up]
  - Caller views catalogue:
      - Rose (10 🪙) | Coffee (25 🪙) | Nectar Crown (100 🪙) | Royal Peacock (500 🪙)
  - Shows current available coin balance
           │
           ▼
[Step 2: Gift Selection & Atomic Execution]
  - Caller taps "Send Crown (100 🪙)"
  - Server Action `sendVirtualGift(recipientId, giftId, callSessionId)`:
      a) Locks caller wallet: verifies balance >= 100 coins
      b) Deducts 100 coins in `wallet_ledger` (`gift_sent_debit`)
      c) Calculates creator revenue share: e.g., 60% of ₹100 value = ₹60 credited to `creator_profiles`
      d) Records row in `gift_transactions` with unique `idempotency_key`
           │
           ▼
[Step 3: Realtime Visual Animation]
  - Server broadcasts gift event to LiveKit room data channel
  - Both caller and host screens trigger synchronized full-screen animated overlay
  - Audio sound effect (fanfare chime) plays gently over the call audio
  - Host's in-call display shows "+₹60 Earned!" badge
```

---

## Flow 6: Safety, Reporting & Instant Bidirectional Blocking

```
[User Encounters Abusive or Unsafe Behavior During Call / Chat]
           │
           ▼
[Step 1: Taps Shield / Report Button]
  - Action options presented:
      a) "Mute User" (Immediate audio silence)
      b) "Block User" (Immediate disconnection & permanent exclusion)
      c) "Report & Block" (Comprehensive safety filing)
           │
           ▼
[Step 2: Instant Severance & Bidirectional Block]
  - When "Block" is selected:
      a) LiveKit room is terminated immediately on the client
      b) Server Action writes row to `user_blocks` (blocker_id, blocked_id)
      c) Supabase RLS immediately revokes all read/write permissions between users
      d) Neither user will ever appear in the other's discovery feed, search, or match queue
           │
           ▼
[Step 3: Report Ticket Generation]
  - User submits reason (Harassment, Inappropriate Audio, Underage, Scam)
  - Server attaches the last 60 seconds of automated call telemetry and recent chat logs
  - Background task triggers Gemini 2.5 Flash safety analysis:
      - Flags severe terms or threat patterns
      - Assigns automated toxicity rating (0.0 to 1.0)
  - Ticket inserted into `user_reports` with status 'pending'
           │
           ▼
[Step 4: Moderator Console Action (/admin/moderation)]
  - High-priority tickets (Gemini toxicity > 0.85) displayed first
  - Human moderator reviews profile, reporter statements, and flags
  - Actions: Dismiss, Issue Warning, 24-Hour Suspension, Permanent Account Termination
  - Every action recorded in `admin_audit_logs`
```
