# Nectar — Environment & Secret Configuration Specification

> **Milestone:** Gate 05A Configuration Blueprint  
> **Target Framework:** Next.js App Router  
> **Auditor:** Principal Software Architect

---

## 1. Environment Variable Architecture (Vite to Next.js)

In Vite, client-accessible environment variables use the `VITE_` prefix and are accessed via `import.meta.env.VITE_*`.  
In Next.js, client-accessible environment variables use the `NEXT_PUBLIC_` prefix and are accessed via `process.env.NEXT_PUBLIC_*`.

All private keys and secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, `RAZORPAY_KEY_SECRET`) remain strictly un-prefixed, ensuring Next.js will **never** include them in client JavaScript bundles.

---

## 2. Updated `.env.example` Template

```env
# ==============================================================================
# NECTAR ENVIRONMENT SPECIFICATION (GATE 05A)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. CORE PLATFORM & AI RUNTIME
# ------------------------------------------------------------------------------
# Required for Gemini AI API calls (moderation & toxicity screening)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Base application URL (injected automatically in Cloud Run)
APP_URL="http://localhost:3000"

# ------------------------------------------------------------------------------
# 2. SUPABASE POSTGRESQL & AUTHENTICATION (GATE 06)
# ------------------------------------------------------------------------------
# Public Supabase project URL & Anon Key (Client-accessible)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Private Service-Role Key (Server-Only: NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# ------------------------------------------------------------------------------
# 3. LIVEKIT WEBRTC VOICE INFRASTRUCTURE (GATE 06)
# ------------------------------------------------------------------------------
# Public LiveKit WebSocket URL (Client connects to this SFU endpoint)
NEXT_PUBLIC_LIVEKIT_WS_URL="wss://your-project.livekit.cloud"

# Private LiveKit API Credentials (Used by server to mint signed JWT tokens)
LIVEKIT_API_KEY="APIxxxxxxxx"
LIVEKIT_API_SECRET="secretxxxxxxxx"

# ------------------------------------------------------------------------------
# 4. RAZORPAY INDIA PAYMENT RAILS (GATE 06)
# ------------------------------------------------------------------------------
# Public Key ID for Razorpay Standard Checkout SDK
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxx"

# Private Key Secret (Server-Only: Used for order creation)
RAZORPAY_KEY_SECRET="xxxxxxxx"

# Private Webhook Secret (Used by server to verify HMAC SHA-256 signatures)
RAZORPAY_WEBHOOK_SECRET="whsec_xxxxxxxx"
```

---

## 3. Server Configuration & Port Binding

- **Port Requirement:** Next.js development and production servers must bind to port `3000` on host `0.0.0.0` to function within the AI Studio preview environment:
  ```json
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0",
    "build": "next build",
    "start": "next start -p 3000 -H 0.0.0.0",
    "lint": "next lint"
  }
  ```
- **HMR Behavior:** `DISABLE_HMR=true` is respected by Next.js to prevent hot-reload thrashing during automated agent tool invocations.
