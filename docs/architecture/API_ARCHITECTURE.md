# NECTAR — API Architecture & Route Handler Specification (Canonical Alignment)
**Document Reference:** `docs/architecture/API_ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Engineering Specification  
**Canonical Reference:** Aligned strictly with `docs/architecture/CANONICAL_API_REGISTRY.md`  
**Author:** Principal Software Architect & Backend Architect  

---

## 1. Architectural Principles & Route Conventions

1. **Next.js App Router API Handlers:** All endpoints are implemented as serverless Route Handlers in `src/app/api/.../route.ts`.
2. **Canonical Paths:** Every endpoint path, method, and payload contract conforms to `CANONICAL_API_REGISTRY.md`.
3. **Session Authentication:** Handled via `@supabase/ssr` cookies (`createClient()`).
4. **Idempotency Requirement:** Mutating financial, call, and gifting endpoints require the `Idempotency-Key` header.
5. **RFC 7807 Error Standard:** All non-2xx responses return standard JSON Problem Details.

---

## 2. Canonical Route Handler Map

```
src/app/api/
├── auth/
│   ├── otp/
│   │   ├── send/route.ts               (POST - Phone OTP Send)
│   │   └── verify/route.ts             (POST - Phone OTP Verify)
│   └── age-declaration/route.ts        (POST - Mandatory 18+ Age Declaration)
├── profiles/
│   ├── me/route.ts                     (GET, PATCH - Current User Profile)
│   └── [id]/route.ts                   (GET - Public Profile View)
├── discovery/
│   ├── feed/route.ts                   (GET - Filtered Discovery Feed)
│   ├── swipe/route.ts                  (POST - Swipe Right/Left & Match)
│   └── preferences/route.ts            (GET, PUT - Matching Preferences)
├── calls/
│   ├── initiate/route.ts               (POST - Start Call, Reserve Hold, Create LiveKit Room)
│   ├── answer/route.ts                 (POST - Callee Answer & Join Room)
│   └── terminate/route.ts              (POST - Hangup, Settle Metering & Holds)
├── wallet/
│   ├── packages/route.ts               (GET - Active Coin Purchase Packages)
│   └── purchase/
│       ├── create-order/route.ts       (POST - Create Razorpay Order)
│       └── verify/route.ts             (POST - Verify Client Signature & Credit Coins)
├── gifts/
│   ├── catalog/route.ts                (GET - Available Virtual Gifts)
│   └── send/route.ts                   (POST - Send Gift, Atomic Debit & Accrual)
├── creator/
│   ├── apply/route.ts                  (POST - Submit Creator Verification Audition)
│   ├── kyc/route.ts                    (POST - Submit Encrypted PAN & Bank/UPI)
│   └── payout/
│       ├── request/route.ts            (POST - Request Withdrawal Disbursement)
│       └── history/route.ts            (GET - View Payout Ledger)
├── safety/
│   ├── block/route.ts                  (POST - Bidirectional Block)
│   └── report/route.ts                 (POST - Submit Content Violation Report)
└── webhooks/
    ├── razorpay/route.ts               (POST - Razorpay Inbound Payment Events)
    └── livekit/route.ts                (POST - LiveKit Inbound WebRTC Room Events)
```

---

## 3. Server-Side Execution & Security Rules

1. **Zero Client Trust for Pricing & Billing:** Client cannot specify coin deduction amounts or call rates. The server queries the locked snapshotted rate from the database.
2. **Double-Entry Journal Integration:** All coin and INR mutations are performed inside atomic PostgreSQL stored procedures with pessimistic row locking (`SELECT FOR UPDATE`).
3. **Webhook Verification:** Inbound Razorpay and LiveKit webhooks authenticate via HMAC-SHA256 signatures and deduplicate via `inbound_webhook_events`.

---

## 4. Cross-Document Alignment

All endpoints and data structures in this document are strictly identical to `docs/architecture/CANONICAL_API_REGISTRY.md` and `docs/architecture/CANONICAL_SCHEMA_REGISTRY.md`.
