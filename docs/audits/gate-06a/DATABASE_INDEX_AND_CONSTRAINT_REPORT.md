# NECTAR — DATABASE INDEX & CONSTRAINT REPORT
**Milestone:** Gate 06A — Supabase Database Foundation  
**Classification:** Database Optimization & Integrity Audit  
**Document Ref:** `docs/audits/gate-06a/DATABASE_INDEX_AND_CONSTRAINT_REPORT.md`  

---

## 1. Operational Index Manifest

The database schema deploys **50 purpose-built indexes** tailored to optimize query patterns defined in the API architecture.

### 1.1 Core Identity & Profiles
- `idx_profiles_role`: `profiles(role)` — Rapid filtering for administrative and moderation lookups.
- `idx_profiles_primary_lang`: `profiles(primary_language)` — Discovery queries filtering by primary tongue.
- `idx_user_languages_lookup`: `user_languages(language_code, proficiency)` — Matching query language evaluation.
- `idx_user_languages_user_id`: `user_languages(user_id)` — Quick retrieval of user spoken languages.

### 1.2 Creator Management
- `idx_creator_profiles_available`: `creator_profiles(is_available_for_calls, verification_status)` — Core index powering online creator discovery feed.
- `idx_creator_profiles_user_id`: `creator_profiles(user_id)` — User-to-creator profile resolution.
- `idx_creator_applications_user`: `creator_applications(user_id)` — Creator application status checks.
- `idx_creator_applications_reviewer`: `creator_applications(reviewed_by)` — Admin audit views.
- `idx_creator_kyc_creator`: `creator_kyc_details(creator_id)` — Financial verification lookups.

### 1.3 Discovery & Matching
- `idx_discovery_swipes_swiper`: `discovery_swipes(swiper_id, direction)` — Exclude already-swiped candidates.
- `idx_discovery_swipes_swiped`: `discovery_swipes(swiped_id)` — Swipes received calculations.
- `idx_matches_participants`: `matches(user_a_id, user_b_id)` — Mutual match confirmation.
- `idx_matches_user_b`: `matches(user_b_id)` — Reverse match lookups for user B.

### 1.4 Voice Calling & Holds
- `idx_call_sessions_caller`: `call_sessions(caller_id, status)` — Caller active call check and call history.
- `idx_call_sessions_callee`: `call_sessions(callee_id, status)` — Inbound call signaling and busy checks.
- `idx_call_sessions_livekit_room`: `call_sessions(livekit_room_name)` — LiveKit webhook room resolution.
- `idx_call_coin_holds_active`: `call_coin_holds(user_id, status) WHERE status = 'reserved'` — Partial index for fast active escrow checks.
- `idx_call_coin_holds_session`: `call_coin_holds(call_session_id)` — Hold settlement upon call termination.

### 1.5 Direct Messaging & Conversations
- `idx_conversations_user_a`: `conversations(participant_a_id, last_message_at DESC)` — Inbox ordering for User A.
- `idx_conversations_user_b`: `conversations(participant_b_id, last_message_at DESC)` — Inbox ordering for User B.
- `idx_direct_messages_conversation`: `direct_messages(conversation_id, created_at DESC)` — Chat message pagination.
- `idx_direct_messages_unread`: `direct_messages(recipient_id) WHERE is_read = FALSE` — Unread message counter badge.

### 1.6 Financial Ledger & Payments
- `idx_payment_orders_user`: `payment_orders(user_id, status)` — User order history and receipt generation.
- `idx_payment_orders_gateway_order`: `payment_orders(gateway_order_id)` — Razorpay webhook event reconciliation.
- `idx_payment_orders_gateway_payment`: `payment_orders(gateway_payment_id)` — Duplicate payment check.
- `idx_gift_transfers_sender`: `virtual_gift_transfers(sender_id, created_at DESC)` — User gifting history.
- `idx_gift_transfers_recipient`: `virtual_gift_transfers(recipient_creator_id, created_at DESC)` — Creator gift inbox.
- `idx_gift_transfers_call`: `virtual_gift_transfers(call_session_id)` — In-call gifts timeline.
- `idx_payout_requests_creator`: `creator_payout_requests(creator_id, status)` — Creator payout history.
- `idx_payout_requests_status`: `creator_payout_requests(status, requested_at ASC)` — Admin payout queue.
- `idx_financial_journal_group`: `financial_journal_entries(transaction_group_id)` — Balanced entry grouping.
- `idx_financial_journal_account`: `financial_journal_entries(account_type, created_at DESC)` — Chart of accounts auditing.
- `idx_financial_journal_user`: `financial_journal_entries(user_id, created_at DESC)` — User transaction statement.
- `idx_financial_journal_creator`: `financial_journal_entries(creator_id, created_at DESC)` — Creator earnings statement.
- `idx_inbound_webhooks_lookup`: `inbound_webhook_events(provider, event_id)` — Deduplication lookups.
- `idx_inbound_webhooks_unprocessed`: `inbound_webhook_events(is_processed, created_at ASC) WHERE is_processed = FALSE` — Retry worker queue.

### 1.7 Safety, Moderation & Compliance
- `idx_user_blocks_lookup`: `user_blocks(blocker_id, blocked_id)` — Pre-call and pre-message block checks.
- `idx_user_blocks_blocked`: `user_blocks(blocked_id)` — Reverse block lookup.
- `idx_moderation_reports_status`: `moderation_reports(status, created_at ASC)` — Moderator queue triage.
- `idx_moderation_reports_reported`: `moderation_reports(reported_user_id)` — Bad actor risk aggregation.
- `idx_moderation_reports_reporter`: `moderation_reports(reporter_id)` — False reporter tracking.
- `idx_moderation_actions_target`: `moderation_actions(target_user_id)` — Account penalty enforcement.
- `idx_moderation_actions_moderator`: `moderation_actions(moderator_id)` — Staff accountability audit.
- `idx_moderation_appeals_user`: `moderation_appeals(user_id)` — User appeals list.
- `idx_moderation_appeals_action`: `moderation_appeals(action_id)` — Action appeal reference.
- `idx_audit_logs_actor`: `audit_logs(actor_id, created_at DESC)` — Security investigation trail.
- `idx_audit_logs_action`: `audit_logs(action, created_at DESC)` — Compliance event auditing.
- `idx_audit_logs_resource`: `audit_logs(resource_type, resource_id)` — Entity change history.
- `idx_notifications_user`: `notifications(user_id, is_read, created_at DESC)` — User notification center.
- `idx_privacy_requests_user`: `user_privacy_requests(user_id, status)` — DPDP compliance management.

---

## 2. Integrity & Check Constraints

The schema enforces strict domain rules at the database engine level:

| Table | Constraint Name / Expression | Purpose |
| :--- | :--- | :--- |
| `discovery_preferences` | `chk_discovery_age_range CHECK (preferred_age_min <= preferred_age_max)` | Prevents inverted discovery ranges |
| `discovery_swipes` | `chk_discovery_swipes_no_self CHECK (swiper_id != swiped_id)` | Prevents self-swiping |
| `matches` | `chk_matches_canonical_order CHECK (user_a_id < user_b_id)` | Enforces single representation per pair |
| `call_sessions` | `chk_call_sessions_no_self_call CHECK (caller_id != callee_id)` | Prevents self-calling |
| `conversations` | `chk_conversations_canonical_order CHECK (participant_a_id < participant_b_id)` | Enforces single thread per pair |
| `direct_messages` | `chk_direct_messages_no_self_message CHECK (sender_id != recipient_id)` | Prevents self-messaging |
| `user_blocks` | `chk_blocks_no_self_block CHECK (blocker_id != blocked_id)` | Prevents self-blocking |
| `user_coin_wallets` | `CHECK (available_coins >= 0 AND held_coins >= 0)` | Prevents negative coin balances |
| `creator_earnings_wallets`| `CHECK (available_balance_inr >= 0.00 AND pending_payout_inr >= 0.00)` | Prevents negative creator balances |
| `creator_payout_requests` | `chk_payout_math CHECK (net_payable_inr = (gross_amount_inr - tds_withheld_inr))` | Guarantees tax withholding math |
| `creator_payout_requests` | `CHECK (gross_amount_inr >= 500.00)` | Enforces ₹500 minimum withdrawal floor |
| `financial_journal_entries`| `CHECK (debit_amount_cents > 0 OR credit_amount_cents > 0)` | Rejects zero-value journal rows |
| `financial_journal_entries`| `CHECK (NOT (debit_amount_cents > 0 AND credit_amount_cents > 0))` | Enforces single-direction entry |
| `financial_journal_entries`| `UNIQUE (idempotency_key, account_type)` | Guarantees exactly-once accounting posting |
| `inbound_webhook_events` | `UNIQUE (provider, event_id)` | Guarantees exactly-once webhook processing |
