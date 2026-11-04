-- NECTAR CANONICAL MIGRATION: 10_create_moderation_and_audit_logs
-- Subsystem: Subsystem 07 — Safety, Moderation & Audit Logging
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. user_blocks (Bidirectional Social Blocks)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_blocks_no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT uq_blocks_pair UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_lookup ON user_blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 2. moderation_reports (Abuse & Safety Reports)
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  reported_user_id UUID NOT NULL REFERENCES profiles(id),
  target_type report_target_type NOT NULL,
  target_id UUID NULL,
  category VARCHAR(50) NOT NULL,
  explanation TEXT NULL,
  status moderation_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reported ON moderation_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON moderation_reports(reporter_id);

-- 3. moderation_actions (Interventions Taken on Accounts)
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NULL REFERENCES moderation_reports(id),
  moderator_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  action_type moderation_action_type NOT NULL,
  duration_hours INTEGER NULL,
  action_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator ON moderation_actions(moderator_id);

-- 4. moderation_appeals (User Suspension Appeals)
CREATE TABLE IF NOT EXISTS moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES moderation_actions(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  appeal_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_user ON moderation_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_action ON moderation_appeals(action_id);

-- 5. audit_logs (Immutable Platform Governance Records)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE user_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_appeals DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
