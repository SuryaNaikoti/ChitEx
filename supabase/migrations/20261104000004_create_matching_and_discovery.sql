-- NECTAR CANONICAL MIGRATION: 04_create_matching_and_discovery
-- Subsystem: Subsystem 03 — Discovery, Matching & Social Graph
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. discovery_preferences (Matching Filter Settings)
CREATE TABLE IF NOT EXISTS discovery_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_languages TEXT[] NOT NULL DEFAULT '{"te","hi","en"}',
  preferred_genders gender_identity[] NOT NULL DEFAULT '{"woman","man","non_binary"}',
  preferred_age_min INTEGER NOT NULL DEFAULT 18 CHECK (preferred_age_min >= 18),
  preferred_age_max INTEGER NOT NULL DEFAULT 99 CHECK (preferred_age_max <= 99),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_discovery_age_range CHECK (preferred_age_min <= preferred_age_max)
);

DROP TRIGGER IF EXISTS trg_discovery_preferences_updated_at ON discovery_preferences;
CREATE TRIGGER trg_discovery_preferences_updated_at
  BEFORE UPDATE ON discovery_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. discovery_swipes (User Swipes & Impressions)
CREATE TABLE IF NOT EXISTS discovery_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_discovery_swipes_pair UNIQUE(swiper_id, swiped_id),
  CONSTRAINT chk_discovery_swipes_no_self CHECK (swiper_id != swiped_id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_swipes_swiper ON discovery_swipes(swiper_id, direction);
CREATE INDEX IF NOT EXISTS idx_discovery_swipes_swiped ON discovery_swipes(swiped_id);

-- 3. matches (Mutual Social Connections)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_matches_canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT uq_matches_pair UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_participants ON matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);

-- Backward compatibility view for user_matches query patterns
CREATE OR REPLACE VIEW user_matches AS
SELECT id, user_a_id, user_b_id, is_active, created_at FROM matches;

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE discovery_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_swipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
