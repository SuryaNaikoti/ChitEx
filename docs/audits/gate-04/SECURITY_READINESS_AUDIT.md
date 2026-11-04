# Nectar — Security Readiness & Threat Vulnerability Audit

> **Audit Identifier:** GATE04-AUDIT-05  
> **Scope:** Authentication, Authorization, RBAC, Secret Management, Privacy & Data Protection  
> **Auditor:** Principal Software Architect  
> **Date:** 2026-11-04  
> **Status:** SECURITY VULNERABILITIES IDENTIFIED (ACTION REQUIRED PRIOR TO PRODUCTION)

---

## 1. Security & Compliance Risk Matrix

| Security Domain | Evaluated Surface | Current Risk Level | Primary Vulnerability |
|---|---|:---:|---|
| **Authentication** | User identity, session tokens | **HIGH** | Purely cosmetic client gate; no signed JWT or Supabase Auth session. |
| **Authorization & RBAC** | User vs. Creator vs. Mod vs. Admin | **CRITICAL** | Role switching controlled via client UI dropdown (`Header.tsx`); zero server enforcement. |
| **Data Protection** | Phone numbers, coordinates, IDs | **LOW (Compliant in mock)** | Public models only expose broad city (`Hyderabad, India`); raw phone suppressed. |
| **Secret Management** | API keys, LiveKit secrets, Razorpay | **MEDIUM (Good hygiene)** | No secrets are hardcoded in git; `.env.example` safe, but lacks backend env vars. |
| **API & Webhook Security** | Payment & room webhooks | **CRITICAL** | No HMAC signature verification implemented; endpoints unmounted. |
| **Safety & Blocking** | Bidirectional block enforcement | **MEDIUM** | Filtered in client React array; not enforced at database RLS level. |
| **Age Assurance** | 18+ Adult gating compliance | **HIGH** | Self-attestation without server validation; can be bypassed via local storage/state. |
| **Financial Security** | Wallet debiting, coin balances | **CRITICAL** | Client-authoritative balance; susceptible to DevTools tampering. |

---

## 2. Detailed Security Findings

### Finding F-SEC-01: Client-Side Role Escalation Vulnerability (RBAC Bypass)
- **Finding ID:** `F-SEC-01`
- **Component Reference:** `/src/components/Header.tsx` (lines 35–85), `/src/App.tsx` (lines 25–35)
- **Current Implementation:**  
  The user role is stored as a simple React state variable:
  ```typescript
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  ```
  Any user can open the top right menu (`⋯`) and select `Safety Console` or `Platform Metrics` to instantly elevate their role to `moderator` or `admin`. From this view, they can ban users or inspect financial liability figures.
- **Expected Implementation:**  
  1. User role must be stored in the database (`user_profiles.role`).
  2. Every administrative API route and Server Action must verify the caller's JWT claims:
     ```typescript
     const { data: user } = await supabase.auth.getUser();
     if (user.role !== 'admin' && user.role !== 'moderator') {
       throw new ForbiddenError('Unauthorized administrative access');
     }
     ```
  3. Supabase Row Level Security (RLS) must reject queries to `user_reports` and `creator_payout_requests` for non-privileged roles.
- **Severity:** **CRITICAL**
- **Impact Analysis:**  
  In production, any regular user could escalate privileges and maliciously ban creators or view private reports.
- **Recommended Action:**  
  Remove the client-side role switcher prior to production. Enforce role-based access control exclusively through verified session claims and Supabase RLS.

---

### Finding F-SEC-02: Age Assurance Bypass Risk (Indian Digital Safety Compliance)
- **Finding ID:** `F-SEC-02`
- **Component Reference:** `/src/components/OnboardingModal.tsx`
- **Current Implementation:**  
  Age assurance is handled via a client-side birth year selector and a checkbox:
  ```typescript
  const handleAgeSubmit = () => {
    const age = 2026 - parseInt(birthYear);
    if (age < 18 || !isAgeConfirmed) { ... }
    setStep(2);
  };
  ```
  If a user modifies the React state or bypasses the modal, the application allows access to all voice discovery and calling features without a cryptographic record of the age verification event.
- **Expected Implementation:**  
  1. The user's age declaration must be recorded in `user_profiles.is_age_verified = true` along with `date_of_birth` and `age_verified_at = NOW()` in an immutable audit log.
  2. Database RLS policies must strictly forbid reading discovery feeds, joining LiveKit rooms, or initiating calls if `is_age_verified IS NOT TRUE`.
- **Severity:** **HIGH**
- **Impact Analysis:**  
  Operating an adult 18+ social discovery platform without verifiable, server-enforced age assurance creates severe regulatory compliance and legal liability risks under Indian digital safety laws.
- **Recommended Action:**  
  Tie 18+ verification directly to the authenticated Supabase user profile and enforce via database triggers and RLS policies.

---

### Finding F-SEC-03: WebRTC LiveKit Token Minting Exposure
- **Finding ID:** `F-SEC-03`
- **Component Reference:** `/src/components/ActiveCallModal.tsx`, `/src/utils/audioSynth.ts`
- **Current Implementation:**  
  Calls are currently simulated using client Web Audio oscillators. No real LiveKit connection is established.
- **Expected Production Risk:**  
  When integrating the real LiveKit SDK, if developers attempt to mint LiveKit access tokens on the client using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, the private API secret will be bundled into client JavaScript, giving malicious actors full administrative control over the entire LiveKit media infrastructure.
- **Expected Implementation:**  
  LiveKit access tokens must **ONLY** be minted on the server layer:
  ```typescript
  // Server-only endpoint: POST /api/livekit/token
  import { AccessToken } from 'livekit-server-sdk';
  // verify auth session + verify wallet balance >= call_rate
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: userId });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  return res.json({ token: await at.toJwt() });
  ```
- **Severity:** **HIGH**
- **Recommended Action:**  
  Enforce a strict architectural boundary: `livekit-server-sdk` must only exist in server-side files with zero client imports.

---

### Finding F-SEC-04: Client-Only Bidirectional Block Enforcement
- **Finding ID:** `F-SEC-04`
- **Component Reference:** `/src/components/DiscoveryView.tsx` (line 22), `/src/App.tsx` (line 112)
- **Current Implementation:**  
  Blocking a user appends their ID to a client array (`blockedUserIds`). The discovery view filters out blocked users using a local JavaScript filter:
  ```typescript
  const visibleUsers = users.filter((u) => !blockedUserIds.includes(u.id));
  ```
- **Expected Implementation:**  
  In a production multi-user environment, if User A blocks User B, **neither user must ever be able to query the other from the database**. This must be enforced inside PostgreSQL queries and RLS:
  ```sql
  WHERE NOT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = auth.uid() AND blocked_id = candidate_id)
       OR (blocker_id = candidate_id AND blocked_id = auth.uid())
  )
  ```
- **Severity:** **HIGH**
- **Impact Analysis:**  
  If User B uses direct API queries, they could still view User A's online presence, send message payloads, or trigger call webhooks if filtering only happens on User A's browser bundle.
- **Recommended Action:**  
  Enforce bidirectional block filtering at the database layer (Supabase RLS & view filters).
