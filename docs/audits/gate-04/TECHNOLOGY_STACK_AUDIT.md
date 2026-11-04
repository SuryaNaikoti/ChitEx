# Nectar — Technology Stack & Architecture Audit

> **Audit Identifier:** GATE04-AUDIT-01  
> **Target Scope:** Framework, Build Tooling, Directory Layout, Dependencies & Env Vars  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Audit Status:** DISCREPANCY IDENTIFIED

---

## 1. Approved Architecture vs. Actual Implementation

The **Approved Technology Stack** specified in the Nectar Engineering Directive mandates:
- **Framework:** Next.js (App Router)
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS + Radix/shadcn-style primitives
- **Database & Auth:** Supabase (PostgreSQL 15+, Supabase Auth, Realtime, Storage)
- **Voice Infrastructure:** LiveKit WebRTC Cloud / SFU
- **Payment Gateway:** Razorpay (India Rails: UPI, NetBanking, Cards)
- **AI Moderation:** Google Gemini API (`@google/genai`)

### Audit Comparison Matrix

| Technology Component | Approved Spec | Current Implementation | Variance / Discrepancy |
|---|---|---|:---:|
| **Application Framework** | Next.js 14/15 (App Router) | **Vite 8.3.0 + React 19.0.1 (SPA)** | **CRITICAL MISMATCH** |
| **Language** | TypeScript 5+ (Strict) | TypeScript 7.0.2 (`tsc --noEmit`) | Compliant |
| **Build Tooling** | Next.js Compiler (`turbopack` / `webpack`) | Vite + `@vitejs/plugin-react` | Framework dependent |
| **CSS & Design System** | Tailwind CSS v4 | `@tailwindcss/vite` v4.3.3 | Compliant |
| **Directory Structure** | Next.js App Router (`src/app/(auth)/...`) | Vite Client Tree (`src/components/...`) | **MISMATCH** |
| **Backend Runtime** | Next.js Route Handlers / Server Actions | Express 4.21.2 (in dependencies; unmounted) | **UNMOUNTED** |
| **Database Engine** | Supabase PostgreSQL + RLS | None (In-memory React `useState`) | **MISSING** |
| **Voice Engine** | LiveKit WebRTC SFU | Web Audio API Synthesizer (Local Audio) | **MOCKED** |
| **Payments Rail** | Razorpay SDK + Webhook Endpoints | Mock JavaScript `setTimeout` | **MOCKED** |
| **AI Safety Pipeline** | Google Gemini 2.5 Flash API | Hardcoded Mock Toxicity Scores | **MOCKED** |

---

## 2. Detailed Technical Findings

### Finding F-TECH-01: Framework Mismatch (Vite SPA vs. Next.js App Router)
- **Finding ID:** `F-TECH-01`
- **File / Component Reference:** `/package.json`, `/vite.config.ts`, `/src/main.tsx`
- **Current Implementation:**  
  The application is configured as a purely client-side Single Page Application (SPA) driven by Vite (`"vite": "^8.3.0"`) and React 19 (`"react": "^19.0.1"`). The entry point is an HTML file (`/index.html`) loading `/src/main.tsx` into a root DOM element (`<div id="root"></div>`). Navigation is controlled by conditional component rendering inside `/src/App.tsx` (`activeTab === 'discover'`).
- **Expected Implementation:**  
  The Approved Technology Stack non-negotiable rule 1 explicitly states:  
  *“Use Next.js only. Do not generate a Vite application.”*  
  The system was designed to leverage Next.js App Router file-system routing (`src/app/`), Server Components, Server Actions for transactional ledger mutations, and API Route Handlers for Webhooks.
- **Severity:** **CRITICAL**
- **Impact Analysis:**  
  1. A client-side SPA cannot securely hide private API secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, `RAZORPAY_KEY_SECRET`) without a dedicated server layer.
  2. Webhook endpoints (`/api/razorpay/webhook`, `/api/livekit/webhook`) required for authoritative billing cannot be received by a pure Vite client bundle.
  3. Server-side rendering (SSR) for OpenGraph social share cards and rich previews is unavailable.
- **Recommended Action:**  
  Refer to Section 4 for the formal Migration Strategy decision.

---

### Finding F-TECH-02: Missing Server Entry Point for Express
- **Finding ID:** `F-TECH-02`
- **File / Component Reference:** `/package.json` (line 21), `/src/`
- **Current Implementation:**  
  `express: "^4.21.2"` and `@types/express: "^4.17.21"` are declared in `package.json`, and `"tsx": "^4.21.0"` is installed. However, there is no `server.ts` entry point in the repository, and the `dev` script in `package.json` runs `"vite --port=3000 --host=0.0.0.0"`.
- **Expected Implementation:**  
  In a full-stack Node.js Vite architecture, Express serves as the backend API server (`server.ts`) mounting Vite middlewares during development and serving static production builds in production. In a Next.js architecture, Next.js handles server runtime natively.
- **Severity:** **HIGH**
- **Impact Analysis:**  
  Express is occupying dependency space without providing any HTTP server routes, backend controllers, or API capabilities.
- **Recommended Action:**  
  Either implement `server.ts` to host server-authoritative routes (Option B) or migrate to Next.js (Option A).

---

### Finding F-TECH-03: Environment Variable & Secret Configuration Gaps
- **Finding ID:** `F-TECH-03`
- **File / Component Reference:** `/.env.example`
- **Current Implementation:**  
  The environment template only specifies:
  ```env
  GEMINI_API_KEY="MY_GEMINI_API_KEY"
  APP_URL="MY_APP_URL"
  ```
- **Expected Implementation:**  
  To support the approved stack, the environment file must define all required configuration handles without exposing private secrets:
  ```env
  # Supabase Public & Private
  VITE_SUPABASE_URL="https://[project-id].supabase.co"
  VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

  # LiveKit WebRTC Infrastructure
  LIVEKIT_API_KEY="APIxxxxxx"
  LIVEKIT_API_SECRET="secretxxxxxx"
  VITE_LIVEKIT_WS_URL="wss://nectar-xxxx.livekit.cloud"

  # Razorpay India Payment Rails
  VITE_RAZORPAY_KEY_ID="rzp_test_xxxxxx"
  RAZORPAY_KEY_SECRET="xxxxxx"
  RAZORPAY_WEBHOOK_SECRET="whsec_xxxxxx"

  # Gemini AI
  GEMINI_API_KEY="xxxxxx"
  ```
- **Severity:** **HIGH**
- **Impact Analysis:**  
  No developer or CI/CD runner can connect the application to external services without documented environment handles.
- **Recommended Action:**  
  Update `.env.example` to declare the full set of required environment variables segmented by client vs. server scopes.

---

### Finding F-TECH-04: Routing Architecture Discrepancy
- **Finding ID:** `F-TECH-04`
- **File / Component Reference:** `/src/App.tsx`, `/SITEMAP.md`
- **Current Implementation:**  
  The UI routing is managed entirely through local React state (`activeTab: 'discover' | 'match' | 'messages' | 'wallet' | 'profile'` and `currentRole: 'user' | 'creator' | 'moderator' | 'admin'`). URL changes do not occur upon navigating between screens (`/discover`, `/match`, `/call/123` do not exist as browser history states).
- **Expected Implementation:**  
  Deep linking, browser back/forward buttons, and direct URL routing must be supported so users can join calls directly via link or return to specific screens upon PWA launch.
- **Severity:** **HIGH**
- **Impact Analysis:**  
  Refreshing the page on any screen resets the user back to the Discovery feed. Deep-linked incoming call notifications cannot be handled without route parameters.
- **Recommended Action:**  
  Adopt structured routing (Next.js App Router routes or React Router DOM v6/7).

---

## 3. Dependency Inventory & License Review

```
Production Dependencies:
├── @google/genai (^2.4.0)       -> Apache-2.0 (Official Google GenAI SDK)
├── @tailwindcss/vite (^4.3.3)   -> MIT (Tailwind v4 compiler integration)
├── @vitejs/plugin-react (^6.1.1)-> MIT (React Fast Refresh plugin)
├── dotenv (^17.2.3)             -> BSD-2-Clause (Environment loader)
├── express (^4.21.2)            -> MIT (HTTP server framework)
├── lucide-react (^0.546.0)      -> ISC (Iconography)
├── motion (^12.23.24)           -> MIT (Framer Motion animations)
├── react (^19.0.1)              -> MIT (Core UI framework)
├── react-dom (^19.0.1)          -> MIT (DOM renderer)
└── vite (^8.3.0)                -> MIT (Development server & bundler)

Missing Critical Dependencies:
├── @supabase/supabase-js        -> Required for Supabase DB & Auth
├── livekit-server-sdk           -> Required for server LiveKit token generation
├── livekit-client               -> Required for client WebRTC audio session
├── razorpay                     -> Required for server order generation
└── zod                          -> Required for boundary payload validation
```

---

## 4. Architectural Recommendation & Path Forward

### Option A: Complete Migration to Next.js App Router (Directive Compliance)
- **Description:** Restructure the project to Next.js 15 (`app/` directory), rewrite `package.json` scripts, port components to Server/Client components, and use Next.js Route Handlers for API endpoints.
- **Pros:** 100% adherence to original PRD Rule 1; built-in SSR and Server Actions.
- **Cons:** High migration overhead; potential disruption to already-working prototype UI in this runtime container.

### Option B: Full-Stack Express + Vite SPA (Platform-Native Pragmatism)
- **Description:** Retain the current high-performance React 19 + Vite frontend; activate the already installed Express backend (`server.ts`) to provide all secure server-side operations (LiveKit token generation, Razorpay order creation, webhooks, and Supabase service-role mutations).
- **Pros:** Zero disruption to existing working UI components; immediate full-stack capability; 100% compatible with Google Cloud Run container runtime.
- **Cons:** Deviates from the PRD's Next.js preference, requiring an explicit architecture baseline amendment.

**Recommendation:** Await executive architecture approval before executing Option A or Option B.
