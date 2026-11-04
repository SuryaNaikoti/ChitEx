# Nectar — Next.js Migration Test & Parity Verification Plan

> **Milestone:** Gate 05A Verification Protocol  
> **Auditor:** Principal Software Architect  
> **Target:** Zero Functional and Visual Regression

---

## 1. Test Execution Protocol

The Next.js migration will be verified across 5 formal testing dimensions:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TypeScript Strict Typecheck                              │
│ Command: tsc --noEmit                                       │
│ Criteria: 0 errors; strict typing enforced across all files │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Next.js Production Build                                 │
│ Command: npm run build (next build)                         │
│ Criteria: Generates production bundle with 0 errors         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Runtime SSR & Hydration Verification                     │
│ Target: Web Audio API, Window references, Dynamic Modals    │
│ Criteria: Zero React hydration mismatch warnings in console │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Visual Parity & Mobile Ergonomics                        │
│ Target: Viewport frame, typography, dark palette #0c0c0e    │
│ Criteria: Identical visual rendering to Vite baseline       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 5. Feature & State Machine Regression Suite                 │
│ Criteria: All 16 features pass manual verification matrix   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 16-Feature Functional Parity Verification Matrix

| Test ID | Feature Under Test | Expected Behavior | Verification Step |
|---|---|---|---|
| **TP-01** | **18+ Age Gating Modal** | DOB selector validates >= 18; checkbox permits entry; bonus credited. | Open onboarding, submit age 24 + affirm, confirm access. |
| **TP-02** | **Discovery Portrait Feed** | 4:5 portrait cards render with avatar, name, age, city, call rate badge. | Scroll feed, verify Ananya, Rohan, Sravani cards. |
| **TP-03** | **Voice Note Preview** | Audio bars animate and Web Audio synthesizer plays audio chime on tap. | Tap voice note prompt on Ananya's card, verify audio. |
| **TP-04** | **Language Filter Pills** | Tapping Telugu, Hindi, or English instantly filters profile feed. | Tap 'Telugu', confirm only Telugu-speaking cards appear. |
| **TP-05** | **Voice Match Radar** | Concentric breathing rings pulse; scanning state triggers candidate after delay. | Tap radar circle, verify 2.2s scan, verify match card. |
| **TP-06** | **15s Handshake Timer** | Match card counts down from 15s; Skip resumes scan; Connect starts call. | Verify countdown, test Pass button, test Connect button. |
| **TP-07** | **Voice Calling Screen** | Full-screen intimate UI with avatar, speaking pulse, and duration timer. | Initiate call, confirm dialing chime, confirm connected timer. |
| **TP-08** | **Minute Call Billing** | Rate (e.g. 20🪙/min) debited from wallet balance on each minute mark. | Advance call past 60s, verify balance decreases by rate. |
| **TP-09** | **Low Balance Warning** | Warning chime and banner appear when balance < 1 minute rate. | Let balance drop below rate, verify warning chime. |
| **TP-10** | **In-Call Virtual Gifting** | Sending gift plays fanfare, triggers celebratory overlay, credits creator. | Tap gift drawer, send Gulabi Rose, confirm animation. |
| **TP-11** | **Safety Block in Call** | Tapping 'Block & Disconnect' immediately kills call and excludes user. | Open safety shield, tap Block, verify call ends. |
| **TP-12** | **Post-Call Receipt** | Summary modal shows total duration, coins debited, creator split. | End call, verify summary sheet, close back to feed. |
| **TP-13** | **Apple Wallet Balance** | Coin balance card displays current balance; packages render with pricing. | Switch to Wallet tab, verify balance and 3 packages. |
| **TP-14** | **Simulated Razorpay Top-Up**| Tapping package opens UPI modal; 1s payment adds coins and writes to ledger. | Select ₹49 pack, tap pay, confirm +50 coins credited. |
| **TP-15** | **1:1 Chat Messaging** | iMessage-style thread displays messages; sending text appends bubble. | Switch to Messages tab, send message, verify echo reply. |
| **TP-16** | **Role Switcher Drawer** | Tapping `⋯` allows previewing Creator Hub, Safety Console, Admin. | Switch to Creator Hub, verify withdrawable INR statement. |
