-- NECTAR CANONICAL MIGRATION: 02_create_core_identity_and_profiles
-- Subsystem: Subsystem 01 — Core Identity & Profiles
-- Milestone: Gate 06A — Supabase Database Foundation

-- 1. profiles (Public Social Identity)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT NULL,
  bio VARCHAR(300) NULL,
  gender gender_identity NOT NULL DEFAULT 'prefer_not_to_say',
  primary_language VARCHAR(10) NOT NULL DEFAULT 'te',
  role user_role NOT NULL DEFAULT 'user',
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_lang ON profiles(primary_language);

-- 2. private_user_profiles (Protected Private Identity)
CREATE TABLE IF NOT EXISTS private_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NULL,
  birth_date DATE NULL,
  age_assurance_tier age_assurance_tier NOT NULL DEFAULT 'declared_only',
  age_declared_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  age_verified_at TIMESTAMPTZ NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for private_user_profiles updated_at
DROP TRIGGER IF EXISTS trg_private_user_profiles_updated_at ON private_user_profiles;
CREATE TRIGGER trg_private_user_profiles_updated_at
  BEFORE UPDATE ON private_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. user_languages (Spoken Languages)
CREATE TABLE IF NOT EXISTS user_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  proficiency VARCHAR(20) NOT NULL DEFAULT 'fluent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_languages_user_lang UNIQUE (user_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_user_languages_lookup ON user_languages(language_code, proficiency);
CREATE INDEX IF NOT EXISTS idx_user_languages_user_id ON user_languages(user_id);

-- 4. user_preferences (Application & Interaction Preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme VARCHAR(20) NOT NULL DEFAULT 'system',
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notification_match_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  notification_message_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  notification_promotional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Row Level Security is NOT activated in Gate 06A per milestone specification
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_languages DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
