# Nectar — Frontend Functionality & Integration Matrix

> **Audit Identifier:** GATE04-AUDIT-03  
> **Scope:** Granular Verification of All 16 Core Product Capabilities  
> **Classification Key:**  
> - **A:** Fully implemented frontend interaction (UI/UX complete, accessible, responsive)  
> - **B:** Local mock-data interaction (Renders data from static arrays; mutations in memory)  
> - **C:** Simulated backend operation (`setTimeout`, client calculation, mock callbacks)  
> - **D:** Actual external integration (Real API/SDK network requests to third parties)  
> - **E:** Not implemented (Missing UI or functionality)

---

## 1. Feature Classification Matrix

| Feature Module | Functional Scope | Classification | Verification Notes |
|---|---|:---:|---|
| **1. Authentication** | Phone + OTP, Google OAuth | **C** | UI exists in `OnboardingModal.tsx` & docs; no real SMS OTP or Google OAuth exchange occurs. Sessions are not persisted in Supabase Auth. |
| **2. Age Assurance** | 18+ Birth year check & legal affirmation | **A / B** | Interactive modal validates DOB (`>= 18`) and requires legal checkbox before permitting entry; stored only in local component state. |
| **3. User Discovery** | Feed of profiles, avatars, locations, rates | **A / B** | High-fidelity portrait cards rendered from `INITIAL_USERS` in `mockData.ts`. Interactive voice note waveform preview plays synthesizer tone. |
| **4. Language Filtering** | Telugu (`te`), Hindi (`hi`), English (`en`), All | **A / B** | Fully functional client-side filtering updating profile grid immediately based on `primaryLanguage` and `supportedLanguages`. |
| **5. Matchmaking Queue** | Random Voice Match Radar | **A / C** | Interactive radar scan animation; after 2.2s delay, randomly picks an eligible candidate from mock pool and triggers 15s handshake card. |
| **6. Voice Calling** | 1:1 Voice Connection Screen | **A / C** | Fullscreen calling interface with avatar, animated audio ripples, and Web Audio API dial-tone/chime synthesis. No real LiveKit WebRTC peer connection. |
| **7. Call Duration & Billing** | Pre-rate disclosure, per-min coin deduction | **A / C** | Client `setInterval` advances seconds, triggers minute billing, debits local coin balance, and shows summary receipt. Vulnerable to client manipulation. |
| **8. 1:1 Direct Messaging** | Text chat conversations, timestamps | **A / B** | Renders thread from `mockData.ts`, appends user message to local state, and triggers simulated reply after 1.2s delay. No Supabase Realtime channel. |
| **9. Coin Wallet** | Balance display & transaction history | **A / B** | Apple Wallet-style UI showing balance and ledger entries. Filtering by Credits/Debits works via React state. Resets on page reload. |
| **10. Coin Purchases** | Razorpay package checkout (₹49, ₹199, ₹499) | **A / C** | Modal simulates Razorpay UPI payment via 1.0s `setTimeout`, appends positive transaction to ledger, and credits coin balance. No real Razorpay order/webhook. |
| **11. Virtual Gifts** | 4 Indian gifts, full-screen animation, sound | **A / C** | Rose, Chai, Crown, Peacock deduct coins locally, trigger Web Audio fanfare, display 2.8s overlay animation, and credit creator balance. |
| **12. Creator Earnings** | Withdrawable INR (₹), 60% revenue share | **A / C** | Accrues INR balance in local state when gifts are sent or calls end (`coins * 0.60`). Accurate mathematical logic, but purely in-memory. |
| **13. Payout Requests** | UPI withdrawal form (Min ₹500 rule) | **A / C** | Validates UPI format (`@`) and min ₹500 rule; deducts from withdrawable balance and appends to local payout history. No banking API integration. |
| **14. Blocking & Reporting** | Instant severance, bidirectional block | **A / B** | Tapping block immediately severs active call, adds user ID to `blockedUserIds` state, and filters them out of feed and radar. Local session only. |
| **15. Moderation Console** | Tickets queue, Gemini toxicity flags, actions | **A / B** | Renders reported incident tickets from `INITIAL_REPORTS`; displays simulated Gemini toxicity scores (e.g. 0.94); Warn/Ban updates ticket status. |
| **16. Admin Analytics** | Registered users, live calls, sales, liability | **A / B** | Visual dashboard displaying static KPI figures (1,248 users, 38 live calls, ₹24,850 sales). No real-time telemetry or database aggregation queries. |

---

## 2. Granular Findings & Vulnerability Analysis

### Finding F-FUNC-01: Zero External Integration Reality
- **Finding ID:** `F-FUNC-01`
- **Component Reference:** Entire `/src/` codebase
- **Current Implementation:**  
  There is **zero network communication** with external third-party backends or cloud services:
  - No network fetch/XHR calls to Supabase (`supabase-js` is not imported).
  - No WebSocket connection to LiveKit SFU (WebRTC audio tracks are not established).
  - No network checkout payload dispatched to Razorpay (`checkout.js` is not loaded).
  - No remote API calls to Google Gemini API (`@google/genai` is installed in `package.json` but uninvoked in runtime components).
- **Expected Implementation:**  
  Production architecture requires server-side token generation, real-time media rooms, cryptographically verified payment webhooks, and active database persistence.
- **Severity:** **HIGH**
- **Recommended Action:**  
  Clearly demarcate the current codebase as an interactive UI/UX prototype. Do not market or test this build as functional cloud infrastructure until Gate 06 integration.

---

### Finding F-FUNC-02: Volatile In-Memory Application State
- **Finding ID:** `F-FUNC-02`
- **Component Reference:** `/src/App.tsx` (lines 28–70)
- **Current Implementation:**  
  All application state is instantiated via React `useState`:
  ```typescript
  const [coinBalance, setCoinBalance] = useState<number>(210);
  const [ledger, setLedger] = useState<WalletTransaction[]>(INITIAL_LEDGER);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportTicket[]>(INITIAL_REPORTS);
  const [creatorEarnings, setCreatorEarnings] = useState<CreatorEarnings>(...);
  ```
- **Expected Implementation:**  
  All state mutations must persist to Supabase PostgreSQL via ACID transactions. Client state should be a cache managed via React Query or server-rendered props.
- **Severity:** **CRITICAL**
- **Impact Analysis:**  
  Hard-refreshing the browser tab (`F5`) or navigating away instantly annihilates all user modifications: coin purchases disappear, blocked users reappear in the discovery feed, chat messages vanish, and moderator actions are undone.
- **Recommended Action:**  
  Implement the PostgreSQL database schema and wire Supabase client repositories before conducting end-to-end user testing.

---

### Finding F-FUNC-03: Client-Side Call Duration & Timer Spoofing
- **Finding ID:** `F-FUNC-03`
- **Component Reference:** `/src/components/ActiveCallModal.tsx` (lines 75–115)
- **Current Implementation:**  
  Billing intervals are driven by a browser `setInterval`:
  ```typescript
  timerRef.current = setInterval(() => {
    setSecondsElapsed((prev) => {
      const next = prev + 1;
      const currentMinute = Math.floor(next / 60) + 1;
      if (currentMinute > lastBilledMinuteRef.current) {
        lastBilledMinuteRef.current = currentMinute;
        onDeductCoins(partner.callRatePerMin, ...);
      }
      return next;
    });
  }, 1000);
  ```
- **Expected Implementation:**  
  As mandated in PRD Section 3.4 and `ARCHITECTURE.md` Section 3:  
  *“Call billing must be implemented on the server, not trusted to frontend timers.”*  
  The server must record `connected_at`, receive LiveKit webhook session duration pulses, and execute server-side ledger debits.
- **Severity:** **CRITICAL**
- **Impact Analysis:**  
  A malicious client can pause the JavaScript execution loop in browser DevTools, tamper with `secondsElapsed`, or stub out `onDeductCoins` to enjoy unlimited free voice calls while the host remains connected.
- **Recommended Action:**  
  Relocate call timing and billing deduction authority to the server layer via LiveKit room event webhooks.

---

## 3. Inventory of Mock Data Artifacts

The following mock structures located in `/src/data/mockData.ts` are currently loaded into memory:

1. **`INITIAL_USERS` (6 Profiles):**
   - Ananya Rao (Hyderabad, Telugu, Creator, 20 🪙/m)
   - Rohan Sharma (Bengaluru, Hindi, 15 🪙/m)
   - Sravani Reddy (Visakhapatnam, Telugu/Hindi, Creator, 25 🪙/m)
   - Kabir Verma (Delhi NCR, Hindi, 15 🪙/m)
   - Pooja Iyer (Chennai/Hyderabad, English/Telugu, Creator, 20 🪙/m)
   - Tarun Varma (Hyderabad, Telugu, 15 🪙/m)
2. **`INITIAL_PACKAGES` (3 Packages):** Starter (50🪙 for ₹49), Conversation (275🪙 for ₹199), VIP (800🪙 for ₹499).
3. **`VIRTUAL_GIFTS` (4 Gifts):** Rose (10🪙), Chai (25🪙), Crown (100🪙), Peacock (500🪙).
4. **`INITIAL_LEDGER` (3 Historical Transactions):** Top-up credit, call debit, gift debit.
5. **`INITIAL_REPORTS` (2 Incident Tickets):** Flagged profiles with pre-written simulated Gemini toxicity scores (`0.94` and `0.88`).
