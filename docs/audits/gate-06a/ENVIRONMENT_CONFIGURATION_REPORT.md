# NECTAR — ENVIRONMENT CONFIGURATION REPORT
**Milestone:** Gate 06A — Supabase Database Foundation  
**Classification:** Infrastructure & Environment Blueprint  
**Document Ref:** `docs/audits/gate-06a/ENVIRONMENT_CONFIGURATION_REPORT.md`  

---

## 1. Environment Topology

Nectar utilizes a three-tier environment architecture across local development, staging/preview, and production:

```
┌─────────────────────────────────┐
│     Next.js 16 App Router       │
│  (Client & Server API Routes)   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Supabase PostgreSQL Engine   │
│  (Auth, DB, Realtime, Storage)  │
└─────────────────────────────────┘
```

---

## 2. Configuration Parameters & Secrets Registry

All secrets and connection parameters are governed by `.env.example` and platform configuration templates.

### 2.1 Client-Safe Variables (`NEXT_PUBLIC_`)
These parameters are bundled into the browser client and must only contain public identifiers:
- `NEXT_PUBLIC_SUPABASE_URL`: Public HTTPS API URL for Supabase project (e.g. `https://xxxx.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous API key with RLS enforcement (once RLS is activated in future gates).
- `NEXT_PUBLIC_APP_URL`: Canonical web application URL (e.g. `http://localhost:3000` or `https://nectar.app`).
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Razorpay public Key ID (`rzp_test_...` or `rzp_live_...`).

### 2.2 Server-Only Environment Variables (Strictly Private)
These variables MUST NEVER be prefixed with `NEXT_PUBLIC_` and are strictly accessible inside server-side Node.js / App Router API routes:
- `SUPABASE_SERVICE_ROLE_KEY`: Superuser administrative key bypassing RLS for privileged workers (calling, ledger, webhooks).
- `DATABASE_URL`: Direct PostgreSQL connection string (Transaction pooler port 6543 or direct port 5432) for migrations and administrative tooling.
- `RAZORPAY_KEY_SECRET`: Razorpay API private secret used for HMAC-SHA256 webhook signature verification and server-side order generation.
- `RAZORPAY_WEBHOOK_SECRET`: Dedicated webhook signature verification secret.
- `LIVEKIT_API_KEY`: LiveKit server API key.
- `LIVEKIT_API_SECRET`: LiveKit server API secret used for issuing short-lived participant access tokens.
- `LIVEKIT_URL`: WebRTC SFU endpoint (e.g. `wss://nectar.livekit.cloud`).
- `GEMINI_API_KEY`: Server-side API key for AI-assisted automated moderation and profile validation.
- `INTERNAL_API_SECRET`: Cryptographic shared secret for securing internal cron jobs and administrative endpoints.

---

## 3. Local Supabase CLI Integration (`supabase/config.toml`)

To facilitate local non-production validation and reproducible development, `supabase/config.toml` is provisioned:
- Project ID: `nectar`
- API Port: `54321`
- Database Port: `54322`
- Shadow Database Port: `54320`
- Studio Management UI: `http://localhost:54323`
- Database Major Version: `PostgreSQL 15 / 16`
- Auth Callback URLs: Configured for `http://localhost:3000` and PWA deep links.

---

## 4. Non-Production Database Provisioning Protocol

When provisioning a non-production Supabase instance:
1. Initialize local Supabase stack or connect to non-production hosted project:
   ```bash
   npx supabase db push
   ```
2. Verify all 11 operational migrations execute in exact timestamp sequence.
3. Verify seed data is populated in `coin_packages`, `virtual_gift_catalog`, and `system_configurations`.
4. Validate that RLS remains disabled across all tables during Gate 06A.
