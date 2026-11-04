# Nectar — Framework Migration & Architectural Realignment Strategy

> **Audit Identifier:** GATE04-AUDIT-08  
> **Scope:** Resolving the Vite SPA vs. Next.js App Router Architecture Conflict  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Status:** FOR EXECUTIVE ARCHITECTURE REVIEW

---

## 1. Context & The Core Dilemma

The Nectar Master Engineering Directive specified:  
*“Use Next.js only. Do not generate a Vite application.”*

The actual repository initialization resulted in a **Vite 8.3 + React 19 SPA** with `@tailwindcss/vite` and an unmounted `express` dependency in `package.json`.

Before building backend integrations, database schemas, and external API webhooks, the engineering leadership must choose between two distinct forward paths:

---

## 2. Strategy A: Complete Migration to Next.js App Router

### Overview
Reconstruct the project root into a Next.js 15 application using the App Router directory structure (`src/app/`), converting client components, mounting Route Handlers for API endpoints, and utilizing Server Actions for database mutations.

### Migration Roadmap (Step-by-Step)
1. **Dependency Overhaul:**
   - Remove `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`.
   - Install `next@latest`, `react@19`, `react-dom@19`.
   - Update `package.json` scripts:
     ```json
     "scripts": {
       "dev": "next dev -p 3000",
       "build": "next build",
       "start": "next start -p 3000"
     }
     ```
2. **Directory & File Reorganization:**
   - Create `src/app/` hierarchy:
     - `src/app/layout.tsx` (Root layout)
     - `src/app/(main)/discover/page.tsx`
     - `src/app/(main)/match/page.tsx`
     - `src/app/(main)/wallet/page.tsx`
     - `src/app/(main)/call/[id]/page.tsx`
     - `src/app/api/livekit/token/route.ts`
     - `src/app/api/razorpay/webhook/route.ts`
3. **Component Porting:**
   - Mark interactive UI components (`ActiveCallModal.tsx`, `MatchRadarView.tsx`, `DiscoveryView.tsx`) with `'use client'`.
   - Port static data and metadata to Server Components.
4. **Tailwind v4 Reconfiguration:**
   - Transition Tailwind CSS v4 from `@tailwindcss/vite` plugin to Next.js PostCSS integration (`@tailwindcss/postcss`).

### Evaluation Matrix (Strategy A)
- **Pros:**
  - 100% compliance with original Master Engineering Instruction Rule 1.
  - Native file-system routing, built-in OpenGraph metadata generation for social sharing cards, and idiomatic Server Actions.
- **Cons:**
  - High risk of regression during container reconfiguration.
  - Significant engineering downtime (estimated 8–12 developer hours) rewriting build pipeline rather than delivering core voice and payment features.
  - Potential package compatibility conflicts with React 19 in early Next.js Canary builds.

---

## 3. Strategy B: Full-Stack Express + Vite SPA (Platform-Native Pragmatism)

### Overview
Retain the existing, fully working Vite 8 + React 19 frontend intact. Activate the already installed `express: "^4.21.2"` and `tsx: "^4.21.0"` dependencies by creating a robust `server.ts` entry point that mounts Vite middlewares in development and serves the built SPA in production.

### Migration Roadmap (Step-by-Step)
1. **Implement `server.ts`:**
   ```typescript
   import express from 'express';
   import dotenv from 'dotenv';
   dotenv.config();

   const app = express();
   app.use(express.json());

   // Backend Route Modules
   app.use('/api/auth', authRouter);
   app.use('/api/livekit', livekitRouter);
   app.use('/api/razorpay', razorpayRouter);
   app.use('/api/moderation', moderationRouter);

   // In development: mount vite dev middleware
   // In production: serve dist/ and index.html
   ```
2. **Update `package.json`:**
   ```json
   "scripts": {
     "dev": "tsx server.ts",
     "build": "vite build",
     "start": "NODE_ENV=production node server.js"
   }
   ```
3. **Route Integration:**
   - Install `react-router-dom` (or client hash router) to provide real URL navigation (`/discover`, `/match`, `/call/:id`) without full-page reloads.
4. **Backend Controllers:**
   - Place all sensitive credentials (`SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, `RAZORPAY_KEY_SECRET`) strictly inside Express route handlers.

### Evaluation Matrix (Strategy B)
- **Pros:**
  - **Zero component churn:** Preserves 100% of the polished UI components, Web Audio synthesizers, and animations already implemented.
  - Rapid implementation: Can be completed and verified in 1–2 hours.
  - Complete security parity: All secret keys and financial webhook validations execute strictly server-side in Node.js.
  - Natural alignment with Cloud Run container deployment.
- **Cons:**
  - Requires formal sign-off amending the PRD Rule 1 ("Use Next.js only").

---

## 4. Architectural Recommendation

As Principal Software Architect, **I strongly recommend Strategy B (Full-Stack Express + Vite SPA)** for this development stage.

### Justification:
The existing prototype already possesses remarkable visual polish, tactile ergonomics, and instant local responsiveness. Strategy B allows the team to immediate activate secure backend endpoints for LiveKit, Razorpay, and Supabase within the existing runtime container, avoiding unnecessary framework churn and preserving momentum toward the 1,000-user India pilot.

If strict Next.js compliance is mandated by executive leadership, Strategy A can be executed methodically, but all backend integration must be paused until the Next.js scaffold compiles cleanly.
