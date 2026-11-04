# Nectar — Component Migration Map

> **Milestone:** Gate 05A Implementation Blueprint  
> **Target:** Transition from Vite Components to Next.js App Router Modules  
> **Auditor:** Principal Software Architect

---

## 1. Component Transition Inventory

Every component in `src/components/` has been analyzed for browser API dependencies, state hooks, and Next.js SSR compatibility:

| Source File | Component Name | Next.js Role | `'use client'` Required? | Key State / Browser APIs | Migration Action |
|---|---|:---:|:---:|---|---|
| `src/App.tsx` | `App` | Root Container | **Yes** | `useState`, `useEffect`, Modal State | Wrap into `src/app/page.tsx` as the main client shell, or decompose into route page views. |
| `src/components/Header.tsx` | `Header` | Layout Header | **Yes** | `useState` (drawer toggle) | Add `'use client'`; keep minimal typography and discreet space switcher (`⋯`). |
| `src/components/BottomNav.tsx` | `BottomNav` | Navigation Bar | **Yes** | Tab click handlers | Add `'use client'`; preserve 5 minimal tabs with amber dot indicator. |
| `src/components/DiscoveryView.tsx` | `DiscoveryView` | Feed Presentation | **Yes** | `useState`, Web Audio trigger | Add `'use client'`; preserve 4:5 portrait cards and animated waveform bars. |
| `src/components/MatchRadarView.tsx` | `MatchRadarView` | Voice Matcher | **Yes** | `useState`, `useEffect` (timers) | Add `'use client'`; preserve pulsing radar rings and 15s candidate handshake. |
| `src/components/ActiveCallModal.tsx` | `ActiveCallModal` | Calling Overlay | **Yes** | `useState`, `useEffect`, `setInterval` | Add `'use client'`; ensure Web Audio API synthesizers only run in browser window context. |
| `src/components/CallModals.tsx` | `PreCallPricingModal`, `CallSummaryModal` | Modal Sheets | **Yes** | Click callbacks, dismiss | Add `'use client'`; preserve minimal iOS-style sheet design. |
| `src/components/WalletView.tsx` | `WalletView` | Coin Wallet | **Yes** | `useState` (package, filter) | Add `'use client'`; preserve Apple Wallet-style balance card & simulated UPI sheet. |
| `src/components/MessagesView.tsx` | `MessagesView` | 1:1 Direct Chat | **Yes** | `useState` (messages, input) | Add `'use client'`; preserve iMessage-style bubbles and avatar carousel. |
| `src/components/ProfileView.tsx` | `ProfileView` | Self Account | **Yes** | `useState` (slider, availability) | Add `'use client'`; preserve clean profile layout and 18+ verified badge. |
| `src/components/CreatorView.tsx` | `CreatorView` | Host Earnings | **Yes** | `useState` (withdrawal form) | Add `'use client'`; preserve INR withdrawable balance and UPI modal. |
| `src/components/ModeratorView.tsx` | `ModeratorView` | Safety Console | **Yes** | `useState` (action filter) | Add `'use client'`; preserve Gemini toxicity badges and 1-click ban actions. |
| `src/components/AdminView.tsx` | `AdminView` | Platform Metrics | **No** (Can be Server/Client) | Static metrics | Add `'use client'` for prototype parity; will transition to Server Component in Gate 07. |
| `src/components/OnboardingModal.tsx`| `OnboardingModal`| 18+ Verification | **Yes** | `useState` (DOB, step, check) | Add `'use client'`; preserve age gating and language selection flow. |
| `src/utils/audioSynth.ts` | `SoundEngine` | Audio Helper | **Client Only** | `window.AudioContext` | Guard constructor with `typeof window !== 'undefined'` check to prevent SSR hydration errors. |

---

## 2. SSR Hydration Guard Strategy

Because Next.js pre-renders components on the server by default, any component referencing `window`, `document`, or `window.AudioContext` must be protected against hydration mismatch:

1. **`audioSynth.ts` Guard:**
   ```typescript
   private initCtx() {
     if (typeof window === 'undefined') return null;
     const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
     if (!AudioCtx) return null;
     if (!this.ctx) this.ctx = new AudioCtx();
     return this.ctx;
   }
   ```
2. **Mount Guard in Client Shell:**
   ```typescript
   const [mounted, setMounted] = useState(false);
   useEffect(() => {
     setMounted(true);
   }, []);
   if (!mounted) return null; // Or lightweight skeleton
   ```
   This prevents hydration mismatches for local state like timestamps and synthesized sound engines.
