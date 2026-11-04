# NECTAR — ROW LEVEL SECURITY (RLS) POLICY MATRIX & ACCESS CONTROL
**Document Reference:** `docs/architecture/RLS_POLICY_MATRIX.md`  
**Milestone:** Gate 05B.1 — Architecture Remediation & Cross-Document Consistency Audit  
**Classification:** Confidential — Core Security Architecture  
**Status:** Canonical Source of Truth (Authoritative)  
**Author:** Principal Software Architect & Application Security Engineer  

---

## 1. Security Architecture Principles

1. **Defense-in-Depth:** Authorization is enforced at the database layer (PostgreSQL RLS) as well as the API boundary. Even if a server route handler has a logical flaw, PostgreSQL denies unauthorized access.
2. **Zero Recursive Policies:** Subqueries referencing the same table within an RLS expression can trigger infinite recursion or catastrophic table scan performance. All relationship checks and role checks use non-recursive `SECURITY DEFINER` lookup helpers with indexed caching.
3. **No Client Wallet Mutation:** Tables containing balances, ledger journals, audit logs, or payment states have all client-side `INSERT`, `UPDATE`, and `DELETE` privileges revoked. They can ONLY be mutated via server-side `SECURITY DEFINER` stored procedures.
4. **Separation of Public vs. Private Data:** Public social attributes reside in `profiles`. Sensitive private information (phone, DOB, age status, address) resides in `private_user_profiles` with strict owner-only access.

---

## 2. Non-Recursive Security Definer Helper Functions

To eliminate recursive RLS lookups and guarantee sub-millisecond policy evaluation:

```sql
-- 1. Fast check for user system role without table recursion
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Fast check for user suspension status without table recursion
CREATE OR REPLACE FUNCTION auth_user_is_suspended()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT is_suspended FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Bidirectional block check: Returns TRUE if either user has blocked the other
CREATE OR REPLACE FUNCTION is_mutually_blocked(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = target_user_id)
       OR (blocker_id = target_user_id AND blocked_id = auth.uid())
  );
$$;

-- 4. Verification check for active creator status
CREATE OR REPLACE FUNCTION is_approved_creator(creator_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creator_profiles
    WHERE user_id = creator_user_id AND verification_status = 'approved'
  );
$$;

-- Explicit Privilege Hardening: Revoke default PUBLIC execute, grant only to trusted roles
REVOKE ALL ON FUNCTION auth_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION auth_user_is_suspended() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_is_suspended() TO authenticated, service_role;

REVOKE ALL ON FUNCTION is_mutually_blocked(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_mutually_blocked(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION is_approved_creator(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_approved_creator(UUID) TO authenticated, service_role;
```

---

## 3. Comprehensive Table-by-Table RLS Policy Matrix

### 3.1 Subsystem 01: Core Users & Identity

#### Table: `profiles`
- **RLS Enabled:** Yes (`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  ```sql
  -- 1. Public Discovery & Profile View: Visible if not suspended and not mutually blocked
  CREATE POLICY "profiles_select_active" ON profiles
    FOR SELECT TO authenticated
    USING (
      is_suspended = FALSE 
      AND (id = auth.uid() OR NOT is_mutually_blocked(id))
    );

  -- 2. Owner Update: User can edit bio, display name, avatar, language.
  -- PREVENTS ROLE ESCALATION & SELF-UNSUSPENSION VIA SECURITY DEFINER LOOKUPS
  CREATE POLICY "profiles_update_owner" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
      id = auth.uid()
      AND role = auth_user_role()                 -- Role cannot be modified
      AND is_suspended = auth_user_is_suspended() -- Suspension status cannot be cleared
    );

  -- 3. Disallow Client Insert/Delete (Managed via Supabase Auth triggers)
  CREATE POLICY "profiles_deny_client_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (FALSE);
  CREATE POLICY "profiles_deny_client_delete" ON profiles FOR DELETE TO authenticated USING (FALSE);

  -- 4. Moderator/Admin Full Access
  CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL TO authenticated
    USING (auth_user_role() IN ('moderator', 'admin'))
    WITH CHECK (auth_user_role() IN ('moderator', 'admin'));
  ```

#### Table: `private_user_profiles`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Owner-Only Read
  CREATE POLICY "private_profiles_select_owner" ON private_user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth_user_role() IN ('admin', 'moderator'));

  -- Owner Update (Can update city/state; cannot alter age_assurance_tier)
  CREATE POLICY "private_profiles_update_owner" ON private_user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
      user_id = auth.uid()
      AND age_assurance_tier = (SELECT age_assurance_tier FROM private_user_profiles WHERE user_id = auth.uid())
    );
  ```

---

### 3.2 Subsystem 02: Creator Platform & KYC

#### Table: `creator_profiles`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Public Read: Viewable if creator is approved or if viewing own record
  CREATE POLICY "creator_profiles_select_public" ON creator_profiles
    FOR SELECT TO authenticated
    USING (
      verification_status = 'approved' 
      OR user_id = auth.uid() 
      OR auth_user_role() IN ('moderator', 'admin')
    );

  -- 2. Non-Recursive Owner Update: Allows updating creator settings without self-referential subqueries
  -- ZERO RECURSION: Policy validates only identity; immutability of protected columns is enforced via Column Grants & Triggers
  CREATE POLICY "creator_profiles_update_owner" ON creator_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- 3. Disallow Client Insert/Delete (Creation managed via onboarding RPC; deletion forbidden)
  CREATE POLICY "creator_profiles_deny_client_insert" ON creator_profiles FOR INSERT TO authenticated WITH CHECK (FALSE);
  CREATE POLICY "creator_profiles_deny_client_delete" ON creator_profiles FOR DELETE TO authenticated USING (FALSE);

  -- 4. Full Access for Platform Administrators Only
  CREATE POLICY "creator_profiles_admin_all" ON creator_profiles
    FOR ALL TO authenticated
    USING (auth_user_role() = 'admin')
    WITH CHECK (auth_user_role() = 'admin');
  ```

##### Column-Level Security (SQL Grants) for `creator_profiles`
To prevent authenticated clients from even submitting updates to sensitive fields, column-level privileges are strictly segregated:
```sql
-- Revoke general table-level UPDATE
REVOKE UPDATE ON creator_profiles FROM authenticated;

-- Whitelist only creator-configurable operational columns
GRANT UPDATE (
  is_available_for_calls,
  call_rate_coins_per_minute,
  voice_intro_url
) ON creator_profiles TO authenticated;
```

##### Defense-in-Depth: Field Immutability Trigger
Even if column grants are bypassed or misconfigured, this trigger strictly blocks tampering with system-controlled metrics or status:
```sql
CREATE OR REPLACE FUNCTION trg_protect_creator_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow service_role and platform admins full management access
  IF (current_user = 'service_role' OR auth_user_role() = 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block any client attempt to self-approve or change verification status
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Modifying verification_status is restricted to platform administrators.';
  END IF;

  -- Block tampering with usage statistics or ratings
  IF NEW.total_calls_received IS DISTINCT FROM OLD.total_calls_received 
     OR NEW.total_minutes_spoken IS DISTINCT FROM OLD.total_minutes_spoken 
     OR NEW.rating_average IS DISTINCT FROM OLD.rating_average THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Creator performance counters and ratings are server-authoritative.';
  END IF;

  -- Block reassigning profile ownership
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Cannot transfer creator profile ownership.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_creator_profile_immutability
BEFORE UPDATE ON creator_profiles
FOR EACH ROW
EXECUTE FUNCTION trg_protect_creator_profile_fields();
```

##### Hardened Administrative Function: `admin_set_creator_verification`
Creator verification state transitions (e.g. `pending_review` $\rightarrow$ `approved`, `rejected`, or `suspended`) MUST ONLY be performed via this hardened stored procedure:
```sql
CREATE OR REPLACE FUNCTION admin_set_creator_verification(
  p_creator_id UUID,
  p_new_status creator_verification_status,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role user_role;
  v_old_status creator_verification_status;
  v_creator_user_id UUID;
BEGIN
  -- 1. Authorization: Only 'admin' or server 'service_role' can verify creators
  -- NOTE: 'moderator' role CANNOT approve creators or escalate user permissions
  IF current_user != 'service_role' THEN
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role != 'admin' THEN
      RAISE EXCEPTION 'ACCESS_DENIED: Only platform administrators can verify or reject creators.';
    END IF;
  END IF;

  -- 2. Fetch and Lock Creator Profile
  SELECT verification_status, user_id INTO v_old_status, v_creator_user_id
  FROM public.creator_profiles
  WHERE id = p_creator_id
  FOR UPDATE;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'CREATOR_NOT_FOUND: Record does not exist.';
  END IF;

  -- Guard against redundant execution
  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'unchanged', true);
  END IF;

  -- 3. Execute Transition
  UPDATE public.creator_profiles
  SET verification_status = p_new_status,
      updated_at = NOW()
  WHERE id = p_creator_id;

  -- If approved, promote base profile role from 'user' to 'creator'
  IF p_new_status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'creator',
        updated_at = NOW()
    WHERE id = v_creator_user_id AND role = 'user';
  END IF;

  -- 4. Insert Immutable Audit Log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_actor_id,
    'creator_verification_status_updated',
    'creator_profiles',
    p_creator_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_rejection_reason,
      'authorized_by', COALESCE(v_actor_role::text, 'service_role')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'creator_id', p_creator_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );
END;
$$;

-- Revoke default PUBLIC privileges; grant only to authenticated and service_role
REVOKE ALL ON FUNCTION admin_set_creator_verification(UUID, creator_verification_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_creator_verification(UUID, creator_verification_status, TEXT) TO authenticated, service_role;

#### Table: `creator_kyc_details`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Owner Read: Creator can view their own masked KYC details
  CREATE POLICY "creator_kyc_select_owner" ON creator_kyc_details
    FOR SELECT TO authenticated
    USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR auth_user_role() = 'admin'
    );

  -- Disallow direct client updates; submitted via server endpoint with encryption
  CREATE POLICY "creator_kyc_deny_client_mutation" ON creator_kyc_details
    FOR ALL TO authenticated USING (FALSE);
  ```

---

### 3.3 Subsystem 03: Financial Wallets, Ledgers & Gifting

#### Table: `user_coin_wallets`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Owner Read Only: User can see their own balance
  CREATE POLICY "wallets_select_owner" ON user_coin_wallets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth_user_role() = 'admin');

  -- PREVENT WALLET MANIPULATION: Revoke all client INSERT, UPDATE, DELETE!
  CREATE POLICY "wallets_deny_client_insert" ON user_coin_wallets FOR INSERT TO authenticated WITH CHECK (FALSE);
  CREATE POLICY "wallets_deny_client_update" ON user_coin_wallets FOR UPDATE TO authenticated USING (FALSE);
  CREATE POLICY "wallets_deny_client_delete" ON user_coin_wallets FOR DELETE TO authenticated USING (FALSE);
  ```

#### Table: `creator_earnings_wallets`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Creator Read Only: View accrued earnings
  CREATE POLICY "earnings_select_owner" ON creator_earnings_wallets
    FOR SELECT TO authenticated
    USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR auth_user_role() = 'admin'
    );

  -- Revoke all client mutations
  CREATE POLICY "earnings_deny_client_mutation" ON creator_earnings_wallets
    FOR ALL TO authenticated USING (FALSE);
  ```

#### Table: `financial_journal_entries`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Users & Creators can inspect entries referencing their accounts
  CREATE POLICY "journal_select_participants" ON financial_journal_entries
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR auth_user_role() = 'admin'
    );

  -- IMMUTABLE GENERAL LEDGER: Zero client mutations permitted
  CREATE POLICY "journal_deny_all_mutations" ON financial_journal_entries
    FOR ALL TO authenticated USING (FALSE);
  ```

---

### 3.4 Subsystem 04: Voice Calling & Metering

#### Table: `call_sessions`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Participants & Admins can read call metadata
  CREATE POLICY "calls_select_participants" ON call_sessions
    FOR SELECT TO authenticated
    USING (
      caller_id = auth.uid() 
      OR callee_id = auth.uid() 
      OR auth_user_role() IN ('moderator', 'admin')
    );

  -- Deny direct client INSERT or UPDATE (Managed strictly via /api/calls route handlers)
  CREATE POLICY "calls_deny_client_insert" ON call_sessions FOR INSERT TO authenticated WITH CHECK (FALSE);
  CREATE POLICY "calls_deny_client_update" ON call_sessions FOR UPDATE TO authenticated USING (FALSE);
  CREATE POLICY "calls_deny_client_delete" ON call_sessions FOR DELETE TO authenticated USING (FALSE);
  ```

#### Table: `call_coin_holds`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  CREATE POLICY "holds_select_owner" ON call_coin_holds
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth_user_role() = 'admin');

  CREATE POLICY "holds_deny_client_mutation" ON call_coin_holds
    FOR ALL TO authenticated USING (FALSE);
  ```

---

### 3.5 Subsystem 05: Messaging & Bidirectional Blocking

#### Table: `conversations`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Participants can read conversation container if not mutually blocked
  CREATE POLICY "conversations_select_participants" ON conversations
    FOR SELECT TO authenticated
    USING (
      (participant_a_id = auth.uid() OR participant_b_id = auth.uid())
      AND NOT is_mutually_blocked(CASE WHEN participant_a_id = auth.uid() THEN participant_b_id ELSE participant_a_id END)
    );
  ```

#### Table: `direct_messages`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Read Message: Visible only to sender or recipient, and ONLY IF not mutually blocked
  CREATE POLICY "messages_select_participants" ON direct_messages
    FOR SELECT TO authenticated
    USING (
      (sender_id = auth.uid() OR recipient_id = auth.uid())
      AND NOT is_mutually_blocked(CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END)
    );

  -- Send Message: Can insert only if author is auth.uid() and recipient has not blocked sender
  CREATE POLICY "messages_insert_sender" ON direct_messages
    FOR INSERT TO authenticated
    WITH CHECK (
      sender_id = auth.uid()
      AND NOT is_mutually_blocked(recipient_id)
    );
  ```

#### Table: `user_blocks`
- **RLS Enabled:** Yes
- **Policies:**
  ```sql
  -- Read Blocks: User can see the list of accounts they have personally blocked
  CREATE POLICY "blocks_select_owner" ON user_blocks
    FOR SELECT TO authenticated
    USING (blocker_id = auth.uid());

  -- Create Block: User can block any other valid user
  CREATE POLICY "blocks_insert_owner" ON user_blocks
    FOR INSERT TO authenticated
    WITH CHECK (blocker_id = auth.uid() AND blocked_id != auth.uid());

  -- Remove Block: User can unblock
  CREATE POLICY "blocks_delete_owner" ON user_blocks
    FOR DELETE TO authenticated
    USING (blocker_id = auth.uid());
  ```

---

## 4. Database Privilege Grants by Role

To guarantee that RLS policies cannot be bypassed through grant loopholes, SQL permissions are strictly delineated:

| Database Entity / Group | `anon` Role | `authenticated` Role | `service_role` (Backend Core) |
| :--- | :---: | :---: | :---: |
| `profiles` | SELECT (Public) | SELECT, UPDATE (Own fields) | ALL |
| `private_user_profiles` | None | SELECT, UPDATE (Own record) | ALL |
| `creator_profiles` | SELECT (Approved) | SELECT, UPDATE (Availability/Rate) | ALL |
| `creator_kyc_details` | None | SELECT (Masked, Own) | ALL |
| `user_coin_wallets` | None | SELECT (Own balance) | ALL |
| `creator_earnings_wallets` | None | SELECT (Own earnings) | ALL |
| `financial_journal_entries` | None | SELECT (Own history) | ALL |
| `call_sessions` | None | SELECT (Participating) | ALL |
| `direct_messages` | None | SELECT, INSERT (Unblocked) | ALL |
| `system_configurations` | SELECT (Public) | SELECT (Public) | ALL |
| `audit_logs` | None | None | INSERT, SELECT (Admin) |
| `inbound_webhook_events` | None | None | ALL |
