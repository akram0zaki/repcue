-- =========================================
-- Complete Production Schema Recreation from Development
-- Date: 2025-09-14
-- Purpose: Drop all production tables and recreate exactly from dev schema
-- Reason: Ensure 100% parity between dev and prod environments
-- =========================================

-- This migration completely recreates the production schema to match development exactly
-- Safe to run since no real users exist yet

-- =========================================
-- STEP 1: DROP ALL EXISTING TABLES
-- =========================================

-- Drop all tables in dependency order (foreign keys)
DROP TABLE IF EXISTS video_files CASCADE;
DROP TABLE IF EXISTS exercise_videos CASCADE;
DROP TABLE IF EXISTS content_moderation CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS workout_ratings CASCADE;
DROP TABLE IF EXISTS exercise_ratings CASCADE;
DROP TABLE IF EXISTS workout_shares CASCADE;
DROP TABLE IF EXISTS exercise_shares CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS sync_cursors CASCADE;
DROP TABLE IF EXISTS webauthn_challenges CASCADE;
DROP TABLE IF EXISTS user_authenticators CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- STEP 2: RECREATE TABLES FROM DEV SCHEMA
-- =========================================

-- TABLE: activity_logs
-- Purpose: Activity tracking for exercises and workouts
CREATE TABLE activity_logs (
  id text NOT NULL,
  exercise_id text,
  exercise_name text,
  workout_id text,
  workout_name text,
  duration integer NOT NULL,
  notes text,
  timestamp timestamp with time zone NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  is_workout boolean DEFAULT false,
  exercises jsonb DEFAULT '[]'::jsonb,
  sets_count integer,
  reps_count integer,
  
  -- Primary key
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

-- TABLE: app_settings
-- Purpose: Application settings for users
CREATE TABLE app_settings (
  id text NOT NULL,
  dark_mode boolean DEFAULT false,
  reduce_motion boolean DEFAULT false,
  vibration_enabled boolean DEFAULT true,
  auto_start_next boolean DEFAULT false,
  default_rest_time integer DEFAULT 60,
  beep_interval_seconds integer DEFAULT 30,
  beep_volume numeric DEFAULT 0.5,
  beep_sound_enabled boolean DEFAULT true,
  pre_timer_countdown integer DEFAULT 3,
  show_exercise_videos boolean DEFAULT true,
  data_auto_save boolean DEFAULT true,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  sound_enabled boolean DEFAULT true,
  default_interval_duration integer DEFAULT 30,
  
  -- Primary key
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);

-- TABLE: audit_logs
-- Purpose: Audit trail for security and compliance
CREATE TABLE audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Primary key
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- TABLE: content_moderation
-- Purpose: Content moderation system for user-generated content
CREATE TABLE content_moderation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_type varchar(50) NOT NULL,
  content_id text NOT NULL,
  status varchar(20) DEFAULT 'pending'::character varying,
  ai_confidence numeric(3,2),
  ai_reasoning text,
  human_reviewer_id uuid,
  human_decision varchar(20),
  human_notes text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  -- Primary key
  CONSTRAINT content_moderation_pkey PRIMARY KEY (id)
);

-- TABLE: exercise_ratings
-- Purpose: User ratings and reviews for exercises
CREATE TABLE exercise_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid,
  owner_id uuid,
  rating integer,
  review_text text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  -- Primary key
  CONSTRAINT exercise_ratings_pkey PRIMARY KEY (id)
);

-- TABLE: exercise_shares
-- Purpose: Exercise sharing functionality with tokens
CREATE TABLE exercise_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid,
  owner_id uuid,
  shared_with_user_id uuid,
  permission_level varchar(20) DEFAULT 'view'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  share_token text,
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
  
  -- Primary key
  CONSTRAINT exercise_shares_pkey PRIMARY KEY (id)
);

-- TABLE: exercise_videos
-- Purpose: Video content associated with exercises
CREATE TABLE exercise_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid,
  uploader_id uuid,
  video_url text NOT NULL,
  file_size bigint,
  duration_seconds integer,
  is_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  -- Primary key
  CONSTRAINT exercise_videos_pkey PRIMARY KEY (id)
);

-- TABLE: exercises
-- Purpose: Core exercise definitions with metadata
CREATE TABLE exercises (
  id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  exercise_type text NOT NULL,
  instructions jsonb DEFAULT '[]'::jsonb,
  rep_duration_seconds numeric(10,2),
  is_favorite boolean DEFAULT false,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  is_public boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  copy_count integer DEFAULT 0,
  difficulty_level varchar(20) DEFAULT 'beginner'::character varying,
  equipment_needed text[] DEFAULT '{}'::text[],
  muscle_groups text[] DEFAULT '{}'::text[],
  tags text[] DEFAULT '{}'::text[],
  custom_video_url text,
  has_video boolean DEFAULT false,
  default_duration numeric(10,2),
  default_sets integer,
  default_reps integer,
  
  -- Primary key
  CONSTRAINT exercises_pkey PRIMARY KEY (id)
);

-- TABLE: feature_flags
-- Purpose: Application feature toggles
CREATE TABLE feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flag_name varchar(100) NOT NULL,
  is_enabled boolean DEFAULT false,
  description text,
  target_audience varchar(50) DEFAULT 'all'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Primary key
  CONSTRAINT feature_flags_pkey PRIMARY KEY (id)
);

-- TABLE: profiles
-- Purpose: User profile information
CREATE TABLE profiles (
  owner_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  last_login_ip text,
  login_count integer DEFAULT 0,
  account_locked boolean DEFAULT false,
  locked_until timestamp with time zone,
  failed_login_attempts integer DEFAULT 0,
  data_export_requested_at timestamp with time zone,
  deletion_requested_at timestamp with time zone,
  
  -- Primary key
  CONSTRAINT profiles_pkey PRIMARY KEY (owner_id)
);

-- TABLE: sync_cursors
-- Purpose: Synchronization state tracking
CREATE TABLE sync_cursors (
  owner_id uuid NOT NULL,
  last_ack_cursor text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Primary key
  CONSTRAINT sync_cursors_pkey PRIMARY KEY (owner_id)
);

-- TABLE: user_authenticators
-- Purpose: WebAuthn authenticator storage
CREATE TABLE user_authenticators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  credential_id text NOT NULL,
  credential_public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  device_name text,
  
  -- Primary key
  CONSTRAINT user_authenticators_pkey PRIMARY KEY (id)
);

-- TABLE: user_favorites
-- Purpose: User favorite items tracking
CREATE TABLE user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  item_id text NOT NULL,
  item_type varchar(20) DEFAULT 'exercise'::character varying,
  exercise_type varchar(20) DEFAULT 'builtin'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version integer DEFAULT 1,
  
  -- Primary key
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id)
);

-- TABLE: user_preferences
-- Purpose: User preferences and settings
CREATE TABLE user_preferences (
  id text NOT NULL,
  locale text DEFAULT 'en'::text,
  units text DEFAULT 'metric'::text,
  rep_speed_factor numeric DEFAULT 1.0,
  cues jsonb DEFAULT '{}'::jsonb,
  favorite_exercises text[] DEFAULT '{}'::text[],
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  
  -- Primary key
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);

-- TABLE: video_files
-- Purpose: Video file storage and metadata
CREATE TABLE video_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  exercise_id uuid NOT NULL,
  file_name text NOT NULL,
  file_data bytea,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  upload_pending boolean NOT NULL DEFAULT true,
  storage_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version integer DEFAULT 1,
  
  -- Primary key
  CONSTRAINT video_files_pkey PRIMARY KEY (id)
);

-- TABLE: webauthn_challenges
-- Purpose: WebAuthn challenge storage
CREATE TABLE webauthn_challenges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid,
  challenge text NOT NULL,
  type text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Primary key
  CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id)
);

-- TABLE: workout_ratings
-- Purpose: User ratings and reviews for workouts
CREATE TABLE workout_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_id uuid,
  owner_id uuid,
  rating integer,
  review_text text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  -- Primary key
  CONSTRAINT workout_ratings_pkey PRIMARY KEY (id)
);

-- TABLE: workout_sessions
-- Purpose: Workout session tracking and analytics
CREATE TABLE workout_sessions (
  id text NOT NULL,
  workout_id text,
  workout_name text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  total_duration integer,
  total_exercises integer,
  exercises_completed integer,
  is_completed boolean DEFAULT false,
  notes text,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  exercises jsonb DEFAULT '[]'::jsonb,
  completion_percentage integer DEFAULT 0,
  
  -- Primary key
  CONSTRAINT workout_sessions_pkey PRIMARY KEY (id)
);

-- TABLE: workout_shares
-- Purpose: Workout sharing functionality
CREATE TABLE workout_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_id uuid,
  owner_id uuid,
  shared_with_user_id uuid,
  permission_level varchar(20) DEFAULT 'view'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  version bigint DEFAULT 1,
  
  -- Primary key
  CONSTRAINT workout_shares_pkey PRIMARY KEY (id)
);

-- TABLE: workouts
-- Purpose: Workout definitions and metadata
CREATE TABLE workouts (
  id uuid NOT NULL,
  name text NOT NULL,
  description text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  deleted boolean DEFAULT false,
  is_public boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  copy_count integer DEFAULT 0,
  difficulty_level varchar(20) DEFAULT 'beginner'::character varying,
  tags text[],
  scheduled_days text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  estimated_duration integer,
  
  -- Primary key
  CONSTRAINT workouts_pkey PRIMARY KEY (id)
);

-- =========================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- =========================================

-- Foreign keys referencing auth.users (Supabase built-in)
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_human_reviewer_id_fkey FOREIGN KEY (human_reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE exercise_ratings ADD CONSTRAINT exercise_ratings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exercise_shares ADD CONSTRAINT exercise_shares_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exercise_shares ADD CONSTRAINT exercise_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exercise_videos ADD CONSTRAINT exercise_videos_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exercises ADD CONSTRAINT exercises_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sync_cursors ADD CONSTRAINT sync_cursors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_authenticators ADD CONSTRAINT user_authenticators_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE video_files ADD CONSTRAINT video_files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE webauthn_challenges ADD CONSTRAINT webauthn_challenges_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_ratings ADD CONSTRAINT workout_ratings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_shares ADD CONSTRAINT workout_shares_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workout_shares ADD CONSTRAINT workout_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE workouts ADD CONSTRAINT workouts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Cross-table foreign keys
ALTER TABLE exercise_ratings ADD CONSTRAINT exercise_ratings_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE exercise_shares ADD CONSTRAINT exercise_shares_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE exercise_videos ADD CONSTRAINT exercise_videos_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE video_files ADD CONSTRAINT video_files_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE workout_ratings ADD CONSTRAINT workout_ratings_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
ALTER TABLE workout_shares ADD CONSTRAINT workout_shares_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

-- =========================================
-- STEP 4: ADD UNIQUE CONSTRAINTS
-- =========================================

ALTER TABLE user_authenticators ADD CONSTRAINT user_authenticators_credential_id_key UNIQUE (credential_id);
ALTER TABLE exercise_shares ADD CONSTRAINT exercise_shares_share_token_key UNIQUE (share_token);
ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_flag_name_key UNIQUE (flag_name);

-- =========================================
-- STEP 5: ADD CHECK CONSTRAINTS
-- =========================================

-- Exercise type constraints
ALTER TABLE exercises ADD CONSTRAINT exercises_exercise_type_check CHECK (exercise_type = ANY (ARRAY['time_based'::text, 'repetition_based'::text]));
ALTER TABLE exercises ADD CONSTRAINT exercises_difficulty_level_check CHECK (difficulty_level::text = ANY (ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying]::text[]));

-- Workout constraints
ALTER TABLE workouts ADD CONSTRAINT workouts_difficulty_level_check CHECK (difficulty_level::text = ANY (ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying]::text[]));

-- Rating constraints
ALTER TABLE exercise_ratings ADD CONSTRAINT exercise_ratings_rating_check CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE workout_ratings ADD CONSTRAINT workout_ratings_rating_check CHECK (rating >= 1 AND rating <= 5);

-- Settings constraints
ALTER TABLE app_settings ADD CONSTRAINT app_settings_beep_volume_check CHECK (beep_volume >= 0.0 AND beep_volume <= 1.0);
ALTER TABLE app_settings ADD CONSTRAINT app_settings_pre_timer_countdown_check CHECK (pre_timer_countdown >= 0 AND pre_timer_countdown <= 10);

-- Content moderation constraints
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_content_type_check CHECK (content_type::text = ANY (ARRAY['exercise'::character varying, 'workout'::character varying, 'review'::character varying, 'video'::character varying]::text[]));
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'flagged'::character varying]::text[]));
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_ai_confidence_check CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00);
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_human_decision_check CHECK (human_decision::text = ANY (ARRAY['approved'::character varying, 'rejected'::character varying, 'needs_review'::character varying]::text[]));

-- Share permission constraints
ALTER TABLE exercise_shares ADD CONSTRAINT exercise_shares_permission_level_check CHECK (permission_level::text = ANY (ARRAY['view'::character varying, 'copy'::character varying]::text[]));
ALTER TABLE workout_shares ADD CONSTRAINT workout_shares_permission_level_check CHECK (permission_level::text = ANY (ARRAY['view'::character varying, 'copy'::character varying]::text[]));

-- User favorites constraints
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_item_type_check CHECK (item_type::text = ANY (ARRAY['exercise'::character varying, 'workout'::character varying]::text[]));
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_exercise_type_check CHECK (exercise_type::text = ANY (ARRAY['builtin'::character varying, 'user_created'::character varying, 'shared'::character varying]::text[]));

-- Feature flags constraints
ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_target_audience_check CHECK (target_audience::text = ANY (ARRAY['all'::character varying, 'authenticated'::character varying, 'beta'::character varying, 'admin'::character varying]::text[]));

-- WebAuthn constraints
ALTER TABLE webauthn_challenges ADD CONSTRAINT webauthn_challenges_type_check CHECK (type = ANY (ARRAY['registration'::text, 'authentication'::text]));

-- Workout session constraints
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_completion_percentage_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- =========================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =========================================

-- User-based indexes
CREATE INDEX idx_activity_logs_owner_id ON activity_logs(owner_id);
CREATE INDEX idx_app_settings_owner_id ON app_settings(owner_id);
CREATE INDEX idx_audit_logs_owner_id ON audit_logs(owner_id);
CREATE INDEX idx_exercise_ratings_owner_id ON exercise_ratings(owner_id);
CREATE INDEX idx_exercise_shares_owner_id ON exercise_shares(owner_id);
CREATE INDEX idx_exercise_videos_uploader_id ON exercise_videos(uploader_id);
CREATE INDEX idx_exercises_owner_id ON exercises(owner_id);
CREATE INDEX idx_user_authenticators_owner_id ON user_authenticators(owner_id);
CREATE INDEX idx_user_favorites_owner_id ON user_favorites(owner_id);
CREATE INDEX idx_user_preferences_owner_id ON user_preferences(owner_id);
CREATE INDEX idx_video_files_owner_id ON video_files(owner_id);
CREATE INDEX idx_webauthn_challenges_owner_id ON webauthn_challenges(owner_id);
CREATE INDEX idx_workout_ratings_owner_id ON workout_ratings(owner_id);
CREATE INDEX idx_workout_sessions_owner_id ON workout_sessions(owner_id);
CREATE INDEX idx_workout_shares_owner_id ON workout_shares(owner_id);
CREATE INDEX idx_workouts_owner_id ON workouts(owner_id);

-- Exercise-related indexes
CREATE INDEX idx_exercise_ratings_exercise_id ON exercise_ratings(exercise_id);
CREATE INDEX idx_exercise_shares_exercise_id ON exercise_shares(exercise_id);
CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id);
CREATE INDEX idx_video_files_exercise_id ON video_files(exercise_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_exercise_type ON exercises(exercise_type);
CREATE INDEX idx_exercises_is_public ON exercises(is_public);

-- Workout-related indexes
CREATE INDEX idx_workout_ratings_workout_id ON workout_ratings(workout_id);
CREATE INDEX idx_workout_shares_workout_id ON workout_shares(workout_id);
CREATE INDEX idx_workout_sessions_workout_id ON workout_sessions(workout_id);
CREATE INDEX idx_workouts_is_public ON workouts(is_public);

-- Sharing and tokens
CREATE INDEX idx_exercise_shares_share_token ON exercise_shares(share_token);
CREATE INDEX idx_exercise_shares_expires_at ON exercise_shares(expires_at);

-- Timestamps for cleanup
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- User favorites lookup
CREATE INDEX idx_user_favorites_item_id ON user_favorites(item_id);
CREATE INDEX idx_user_favorites_item_type ON user_favorites(item_type);

-- =========================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- =========================================

-- Enable RLS on all tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 8: CREATE RLS POLICIES
-- =========================================

-- Activity logs policies
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own activity logs" ON activity_logs FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own activity logs" ON activity_logs FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own activity logs" ON activity_logs FOR DELETE USING (owner_id = auth.uid());

-- App settings policies
CREATE POLICY "Users can view own app settings" ON app_settings FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own app settings" ON app_settings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own app settings" ON app_settings FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own app settings" ON app_settings FOR DELETE USING (owner_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Content moderation policies
CREATE POLICY "Moderators can view content moderation" ON content_moderation FOR ALL USING (auth.jwt() ->> 'role' = 'moderator');

-- Exercise policies
CREATE POLICY "Users can view own exercises" ON exercises FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can view public exercises" ON exercises FOR SELECT USING (is_public = true AND deleted = false);
CREATE POLICY "Users can insert own exercises" ON exercises FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own exercises" ON exercises FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own exercises" ON exercises FOR DELETE USING (owner_id = auth.uid());

-- Exercise ratings policies
CREATE POLICY "Users can view exercise ratings" ON exercise_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own exercise ratings" ON exercise_ratings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own exercise ratings" ON exercise_ratings FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own exercise ratings" ON exercise_ratings FOR DELETE USING (owner_id = auth.uid());

-- Exercise shares policies
CREATE POLICY "Users can view own exercise shares" ON exercise_shares FOR SELECT USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());
CREATE POLICY "Users can insert own exercise shares" ON exercise_shares FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own exercise shares" ON exercise_shares FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own exercise shares" ON exercise_shares FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Public access to exercise shares by token" ON exercise_shares FOR SELECT USING (share_token IS NOT NULL AND expires_at > now());

-- Exercise videos policies
CREATE POLICY "Users can view approved exercise videos" ON exercise_videos FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can view own exercise videos" ON exercise_videos FOR SELECT USING (uploader_id = auth.uid());
CREATE POLICY "Users can insert own exercise videos" ON exercise_videos FOR INSERT WITH CHECK (uploader_id = auth.uid());
CREATE POLICY "Users can update own exercise videos" ON exercise_videos FOR UPDATE USING (uploader_id = auth.uid());
CREATE POLICY "Users can delete own exercise videos" ON exercise_videos FOR DELETE USING (uploader_id = auth.uid());

-- Feature flags policies
CREATE POLICY "Everyone can view feature flags" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Admins can manage feature flags" ON feature_flags FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can view public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (owner_id = auth.uid());

-- Sync cursors policies
CREATE POLICY "Users can view own sync cursors" ON sync_cursors FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own sync cursors" ON sync_cursors FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own sync cursors" ON sync_cursors FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own sync cursors" ON sync_cursors FOR DELETE USING (owner_id = auth.uid());

-- User authenticators policies
CREATE POLICY "Users can view own authenticators" ON user_authenticators FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own authenticators" ON user_authenticators FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own authenticators" ON user_authenticators FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own authenticators" ON user_authenticators FOR DELETE USING (owner_id = auth.uid());

-- User favorites policies
CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own favorites" ON user_favorites FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (owner_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own preferences" ON user_preferences FOR DELETE USING (owner_id = auth.uid());

-- Video files policies
CREATE POLICY "Users can view own video files" ON video_files FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own video files" ON video_files FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own video files" ON video_files FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own video files" ON video_files FOR DELETE USING (owner_id = auth.uid());

-- WebAuthn challenges policies
CREATE POLICY "Users can view own webauthn challenges" ON webauthn_challenges FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own webauthn challenges" ON webauthn_challenges FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own webauthn challenges" ON webauthn_challenges FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own webauthn challenges" ON webauthn_challenges FOR DELETE USING (owner_id = auth.uid());

-- Workout policies
CREATE POLICY "Users can view own workouts" ON workouts FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can view public workouts" ON workouts FOR SELECT USING (is_public = true AND deleted = false);
CREATE POLICY "Users can insert own workouts" ON workouts FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workouts" ON workouts FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workouts" ON workouts FOR DELETE USING (owner_id = auth.uid());

-- Workout ratings policies
CREATE POLICY "Users can view workout ratings" ON workout_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own workout ratings" ON workout_ratings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workout ratings" ON workout_ratings FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workout ratings" ON workout_ratings FOR DELETE USING (owner_id = auth.uid());

-- Workout sessions policies
CREATE POLICY "Users can view own workout sessions" ON workout_sessions FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own workout sessions" ON workout_sessions FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workout sessions" ON workout_sessions FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workout sessions" ON workout_sessions FOR DELETE USING (owner_id = auth.uid());

-- Workout shares policies
CREATE POLICY "Users can view own workout shares" ON workout_shares FOR SELECT USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());
CREATE POLICY "Users can insert own workout shares" ON workout_shares FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workout shares" ON workout_shares FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workout shares" ON workout_shares FOR DELETE USING (owner_id = auth.uid());

-- =========================================
-- STEP 9: CREATE ESSENTIAL FUNCTIONS
-- =========================================

-- Function to generate share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token text;
BEGIN
  -- Generate a URL-safe random token
  token := encode(gen_random_bytes(32), 'base64');
  -- Replace URL-unsafe characters
  token := translate(token, '+/', '-_');
  -- Remove padding
  token := rtrim(token, '=');
  RETURN token;
END;
$$;

-- Trigger to automatically set share tokens
CREATE OR REPLACE FUNCTION set_share_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set token if it's not already provided and we're inserting
  IF TG_OP = 'INSERT' AND NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers for share token generation
CREATE TRIGGER exercise_shares_set_token_trigger
  BEFORE INSERT ON exercise_shares
  FOR EACH ROW
  EXECUTE FUNCTION set_share_token();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER activity_logs_update_updated_at BEFORE UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER app_settings_update_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER content_moderation_update_updated_at BEFORE UPDATE ON content_moderation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER exercise_ratings_update_updated_at BEFORE UPDATE ON exercise_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER exercise_shares_update_updated_at BEFORE UPDATE ON exercise_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER exercise_videos_update_updated_at BEFORE UPDATE ON exercise_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER exercises_update_updated_at BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER feature_flags_update_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profiles_update_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER sync_cursors_update_updated_at BEFORE UPDATE ON sync_cursors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER user_favorites_update_updated_at BEFORE UPDATE ON user_favorites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER user_preferences_update_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER video_files_update_updated_at BEFORE UPDATE ON video_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER workout_ratings_update_updated_at BEFORE UPDATE ON workout_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER workout_sessions_update_updated_at BEFORE UPDATE ON workout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER workout_shares_update_updated_at BEFORE UPDATE ON workout_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER workouts_update_updated_at BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

-- Production schema has been completely recreated to match development
-- All tables, constraints, indexes, RLS policies, and functions are now aligned
-- Ready for development feature deployment