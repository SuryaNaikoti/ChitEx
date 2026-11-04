# Nectar — Gate 05A: Next.js App Router Migration Plan

> **Document Version:** 1.0  
> **Milestone:** Gate 05A Execution Blueprint  
> **Author:** Principal Software Architect  
> **Approved Decision:** Strategy A — Next.js App Router  
> **Target Release:** Nectar V1 Baseline

---

## 1. Migration Objectives & Guardrails

The goal of this migration is to transition Nectar from a Vite Single Page Application (SPA) to a **Next.js App Router** architecture while strictly adhering to the user's non-negotiable directives:

1. **Zero UI Churn:** Preserve the minimal, human-crafted dating-app design (Hinge/Raya aesthetic), dark palette (`#0c0c0e`), and warm amber accents.
2. **Zero Functional Regression:** Preserve all 16 core product features, including interactive portrait cards, voice snippet players, radar matchmaking, intimate in-call screen, coin wallet, creator hub, moderation console, and admin analytics.
3. **TypeScript Strict Mode:** Maintain 100% type safety with zero `any` types and clean `tsc --noEmit` validation.
4. **Mobile-First Responsiveness:** Preserve touch ergonomics, 44px+ hit targets, and viewport constraints (`max-w-md mx-auto`).
5. **Incremental Phased Migration:** Execute sequentially with verified Git checkpoints at each step.

---

## 2. Migration Phases & Sequencing

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Pre-Migration Safeguards & Git Checkpoint (DONE)   │
│ - Verified clean Git commit (Checkpoint: 15e510d)           │
│ - Documented baseline files and dependency tree             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 2: Architecture Documentation Suite (Gate 05A)        │
│ - MIGRATION_PLAN.md                                         │
│ - COMPONENT_MIGRATION_MAP.md                                │
│ - NEXTJS_ROUTING_PLAN.md                                    │
│ - ENVIRONMENT_CONFIGURATION.md                              │
│ - MIGRATION_TEST_PLAN.md                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 3: Dependencies & Configuration Adaptation            │
│ - Install next & @tailwindcss/postcss                       │
│ - Create next.config.ts / next.config.mjs                   │
│ - Update tsconfig.json for Next.js bundler module resolution│
│ - Configure PostCSS & Tailwind v4 for Next.js               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 4: App Router Directory Structure Scaffolding         │
│ - Create src/app/layout.tsx (Root Layout, PWA Metadata)     │
│ - Create src/app/page.tsx (Landing & Core App Dispatcher)   │
│ - Adapt global CSS in src/app/globals.css                   │
│ - Add 'use client' directives to interactive UI components  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 5: Verification & Parity Testing                      │
│ - Run typecheck (tsc --noEmit)                              │
│ - Execute production build (next build / npm run build)     │
│ - Verify Web Audio API synthesizers in browser environment   │
│ - Confirm mobile viewport and visual rendering parity       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Rollback & Contingency Protocol

- A Git checkpoint was committed at hash `15e510d` (`Checkpoint: Pre-migration Gate 04 baseline`).
- If any irrecoverable dependency conflict occurs during Next.js compilation, the repository can be cleanly restored to `15e510d` via:
  ```bash
  git checkout 15e510d -- .
  ```
- All existing components in `src/components/`, types in `src/types/`, mock data in `src/data/`, and audio utilities in `src/utils/` are maintained as self-contained modules to avoid destructive rewrites.
