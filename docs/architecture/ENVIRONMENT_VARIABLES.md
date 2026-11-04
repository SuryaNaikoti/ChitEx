# NECTAR — Environment Variables & Configuration Specification
**Document Reference:** `docs/architecture/ENVIRONMENT_VARIABLES.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Engineering & DevOps Architecture  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Author:** Principal Software Architect, Backend Architect & Security Engineer  

---

## 1. Overview & Security Principles

All configuration in Nectar follows strict 12-factor application methodology:
1. **Server vs. Client Separation:** Environment variables prefixed with `NEXT_PUBLIC_` are bundled into the client-side JavaScript artifact and are considered **public**. Variables without this prefix are **strictly confidential** and only accessible within the Node.js / Serverless runtime.
2. **Zero Hardcoded Secrets:** No API keys, credentials, private secrets, or internal service URLs may be committed to version control.
3. **Runtime Schema Validation:** All environment variables are validated at build/boot time using a type-safe Zod schema. If any mandatory variable is missing or malformed, the process halts immediately.
4. **Configurable Business Parameters:** Commercial metrics (creator revenue share, platform commission, minimum payout thresholds) must be driven by server-side environment variables or database system configuration, never hardcoded in component logic.

---

## 2. Environment Variables Catalog

### 2.1 Public Variables (Client Accessible)
These variables are prefixed with `NEXT_PUBLIC_` and are safe to be exposed in browser network requests and bundles.

| Variable Name | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_APP_NAME` | Yes | `Nectar` | Display name of the application. |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://nectar.app` | Base canonical URL for OAuth redirects, OpenGraph tags, and PWA manifest. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://<ref>.supabase.co` | The Supabase project HTTPS REST and Realtime gateway URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `eyJ...` | Public anonymous key for client Supabase SDK initialization (governed by RLS). |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | Yes | `wss://nectar-voice.<domain>.livekit.cloud` | Public WebSocket endpoint for WebRTC media room signalling. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | `rzp_test_<id>` or `rzp_live_<id>` | Public Razorpay checkout identifier for client modal initialization. |
| `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK` | No | `false` | When `true`, allows UI to fall back to simulated mock data if services are offline (dev only). |

---

### 2.2 Private Variables (Server-Side Only)
These variables MUST NEVER have the `NEXT_PUBLIC_` prefix and MUST NEVER be imported into Client Components.

| Variable Name | Required | Example / Format | Purpose | Security Sensitivity |
| :--- | :---: | :--- | :--- | :---: |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJ...` | Admin key to bypass RLS for server-side ledger and webhook reconciliation. | **CRITICAL** |
| `SUPABASE_JWT_SECRET` | Yes | `32+ char hex/string` | Used to verify and decode user session JWTs in middleware and route handlers. | **CRITICAL** |
| `LIVEKIT_API_KEY` | Yes | `API<random>` | Used by Next.js server to generate participant room access tokens. | **HIGH** |
| `LIVEKIT_API_SECRET` | Yes | `Secret<random>` | HMAC secret used to sign LiveKit participant JWT tokens. | **CRITICAL** |
| `RAZORPAY_KEY_SECRET` | Yes | `secret_<random>` | Server secret used to create Razorpay orders and verify signatures. | **CRITICAL** |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | `whsec_<random>` | Secret used to verify HMAC-SHA256 signatures on inbound Razorpay webhooks. | **CRITICAL** |
| `GEMINI_API_KEY` | Yes | `AIzaSy...` | API key for server-side Gemini safety and automated content moderation. | **HIGH** |
| `DATABASE_URL` | Yes | `postgresql://postgres:<pass>@db.<ref>.supabase.co:5432/postgres` | Direct PostgreSQL connection string for Prisma/Drizzle/migration tooling. | **CRITICAL** |
| `UPSTASH_REDIS_REST_URL` | No | `https://<db>.upstash.io` | Redis endpoint for high-frequency rate limiting and active queue states. | **MEDIUM** |
| `UPSTASH_REDIS_REST_TOKEN` | No | `Axxx...` | Auth token for Upstash Redis REST API. | **MEDIUM** |

---

### 2.3 Provisional Business & Financial Parameters (Server-Side)
These parameters govern platform economics. They are read on the server during transaction processing and can be overridden by rows in `system_configurations`.

| Variable Name | Default Value | Description |
| :--- | :---: | :--- |
| `DEFAULT_CREATOR_SHARE_PERCENT` | `60` | Provisional creator revenue share percentage (60%). Never hardcoded. |
| `DEFAULT_PLATFORM_SHARE_PERCENT` | `40` | Provisional platform commission percentage (40%). Never hardcoded. |
| `DEFAULT_MIN_PAYOUT_AMOUNT_INR` | `500` | Provisional minimum creator payout threshold in INR (₹500). |
| `NET_REALIZATION_RATE_PAISE` | `8.390` | Baseline net consideration per coin (8.390 paise, ex-18% GST on Starter package). |
| `CALL_BASE_RATE_COINS_PER_MIN` | `60` | Standard baseline call rate: 60 Coins per minute for creator calls. |

---

## 3. Zod Environment Validation Schema

In `src/lib/env.ts`, all environment variables are parsed and validated on server boot:

```typescript
import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20),
  LIVEKIT_API_KEY: z.string().min(10),
  LIVEKIT_API_SECRET: z.string().min(20),
  RAZORPAY_KEY_SECRET: z.string().min(10),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(10),
  GEMINI_API_KEY: z.string().min(10),
  DEFAULT_CREATOR_SHARE_PERCENT: z.coerce.number().min(0).max(100).default(60),
  DEFAULT_PLATFORM_SHARE_PERCENT: z.coerce.number().min(0).max(100).default(40),
  DEFAULT_MIN_PAYOUT_AMOUNT_INR: z.coerce.number().positive().default(500),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('Nectar'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_LIVEKIT_WS_URL: z.string().url(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(10),
  NEXT_PUBLIC_ENABLE_MOCK_FALLBACK: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .default('false'),
});

export const serverEnv = typeof window === 'undefined' ? serverEnvSchema.parse(process.env) : ({} as any);
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_LIVEKIT_WS_URL: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_ENABLE_MOCK_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK,
});
```

---

## 4. `.env.example` Template

This template will be checked into the repository root as the developer guideline for required keys:

```bash
# ==============================================================================
# NECTAR APPLICATION ENVIRONMENT CONFIGURATION
# Copy to .env.local for local development. Never commit .env.local to Git.
# ==============================================================================

# Node Environment
NODE_ENV=development

# Application Base
NEXT_PUBLIC_APP_NAME=Nectar
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ------------------------------------------------------------------------------
# SUPABASE (PostgreSQL, Auth, Storage, Realtime)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-min-32-chars
DATABASE_URL=postgresql://postgres.your-project-id:your-db-password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# ------------------------------------------------------------------------------
# LIVEKIT (WebRTC Real-time Voice Audio & Signalling)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=your-livekit-api-secret

# ------------------------------------------------------------------------------
# RAZORPAY (Payments & Coin Purchasing - India INR)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# ------------------------------------------------------------------------------
# GOOGLE GEMINI API (Content Moderation & Safety Classification)
# ------------------------------------------------------------------------------
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxx

# ------------------------------------------------------------------------------
# BUSINESS & FINANCIAL PARAMETERS (Provisional defaults)
# ------------------------------------------------------------------------------
DEFAULT_CREATOR_SHARE_PERCENT=60
DEFAULT_PLATFORM_SHARE_PERCENT=40
DEFAULT_MIN_PAYOUT_AMOUNT_INR=500
COIN_TO_INR_BASE_RATIO=0.10
CALL_BASE_RATE_COINS_PER_MIN=60

# ------------------------------------------------------------------------------
# DEVELOPMENT & DEBUG FLAGS
# ------------------------------------------------------------------------------
NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=true
```

---

## 5. Secret Rotation & Key Lifecycle Policy

1. **Scheduled Rotation:**
   - Database service passwords and API secrets must be rotated every **90 days** in staging and production.
   - Razorpay Webhook secrets are dual-registered in the dashboard during rotation windows to guarantee zero-downtime payments.
2. **Emergency Revocation Protocol:**
   - In case of credential leakage:
     1. Revoke the affected key in the vendor console (Supabase / LiveKit / Razorpay).
     2. Update the environment configuration in the production secret store.
     3. Trigger an immediate rolling deployment of the Next.js service.
     4. Inspect `audit_logs` and `wallet_transactions` for unauthorized anomalies during the exposure window.
