# Nectar — Real-Time Comms & Media Transport Architecture
**Document Reference:** `docs/architecture/REALTIME_ARCHITECTURE.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Canonical Reference:** Aligned strictly with `CANONICAL_SCHEMA_REGISTRY.md`  
**Protocols:** WebRTC (LiveKit SFU), WebSockets (Supabase Realtime WSS)  
**Author:** Principal Software Architect & Media Systems Engineer

---

## 1. Dual Real-Time Architecture Model

Nectar cleanly divides its real-time traffic into two specialized layers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MEDIA & VOICE TRANSPORT LAYER (LiveKit WebRTC SFU)       │
│ • Live Voice Audio Streams (Opus 48kHz, Adaptive Bitrate)   │
│ • In-Call Speaking Indicators & Audio Ripples               │
│ • Low-Latency In-Call Gift Animation Trigger Broadcasts    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. APPLICATION SIGNALING & PRESENCE (Supabase Realtime WSS) │
│ • Global Online/Offline Presence Heartbeats (30s interval)  │
│ • Incoming Call Ringing Push Notifications & Dialogs        │
│ • 1:1 Chat Message Delivery & Read Receipts                 │
│ • Live Coin Wallet Balance Sync (Instant Top-Up Refresh)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Supabase Realtime Channel Topology

| Channel Pattern | Event Types | Publisher | Subscribers | Security Rules |
|---|---|---|---|---|
| `presence:voice_lounge` | `sync`, `join`, `leave` | Client | All active clients | Public presence state; suppressed if user is in `user_blocks`. |
| `user:signals:<userId>` | `incoming_call`, `call_cancelled`, `call_accepted` | Server | User device only | Protected by Supabase Auth JWT claim (`user_id = auth.uid()`). |
| `chat:<conversationId>` | `new_message`, `message_read` | Client / Server | Conversation participants | Accessible only if user is an approved participant and not blocked. |
| `user:wallet:<userId>` | `balance_updated`, `low_balance_warning` | Server | User device only | Strict owner-only channel; broadcast upon webhook settlement. |

---

## 3. LiveKit WebRTC Voice Audio Specifications

### 3.1 Codec & Audio Optimization
- **Audio Codec:** Opus
- **Sampling Rate:** 48,000 Hz (Fullband)
- **Channels:** Mono (Voice-optimized for Indian mobile networks)
- **Bitrate Range:** 16 kbps – 32 kbps (Configured with Discontinuous Transmission `DTX=true` to reduce bandwidth consumption during silence by up to 60%).
- **Echo Cancellation & Noise Suppression:** Hardware acoustic echo cancellation (`AEC=true`) and noise suppression (`NS=true`) enabled in WebRTC constraints.

### 3.2 Indian Mobile Network Resiliency (2G / 3G / 4G Adaptation)
- **Target Round-Trip Latency:** < 180ms across Tier-1/2 Indian telecom circles (Jio, Airtel, Vi).
- **Packet Loss Concealment (PLC):** LiveKit SFU configured with forward error correction (FEC) and NACK buffers to maintain audio intelligibility at up to 20% packet loss.
- **Adaptive Reconnection Window:** If mobile network drops, client displays "Reconnecting..." and attempts WebRTC ice restart for 15 seconds before server teardown.

---

## 4. In-Call Virtual Gift Synchronization

To deliver the synchronized celebratory visual animation across both caller and host screens without server delay:

```
[Caller taps "Send Royal Peacock 🦚"]
             │
             ├──(1. HTTPS Server Action)──► Deduct Coins & Credit Creator (DB Commit)
             │
             └──(2. LiveKit Data Channel)──► Broadcast { type: 'GIFT_ANIMATION', giftId: 'peacock' }
                                                             │
                                                             ▼
                                                [Host Device Receives Packet]
                                                             │
                                                             ▼
                                     [Both screens render full-screen Peacock particles]
                                     [Both devices play gentle Web Audio fanfare]
```
