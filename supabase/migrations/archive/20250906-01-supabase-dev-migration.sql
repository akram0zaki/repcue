-- =====================================================
-- RepCue Development Database Migration Script
-- Brings repcue-dev project up to date with production
-- Run this script in Supabase SQL Editor for repcue-dev
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 0. CONVERT EXISTING TABLES FROM TEXT TO UUID IDs
-- =====================================================

-- Check if we need to convert exercises table id from TEXT to UUID
DO $$
BEGIN
    -- Check if exercises.id is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exercises' 
        AND column_name = 'id' 
        AND data_type = 'text'
        AND table_schema = 'public'
    ) THEN
        -- Drop all foreign key constraints that depend on exercises.id
        -- Only drop constraints if the tables and columns exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'app_settings' 
            AND column_name = 'last_selected_exercise_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS fk_app_settings_last_selected_exercise;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activity_logs' 
            AND column_name = 'exercise_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_exercise_id_fkey;
        END IF;
        
        -- Convert exercises.id from TEXT to UUID
        ALTER TABLE exercises ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        
        -- Recreate only the constraints that should reference UUIDs
        -- app_settings.last_selected_exercise_id should reference exercises.id (UUID) if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'app_settings' 
            AND column_name = 'last_selected_exercise_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE app_settings 
            ADD CONSTRAINT fk_app_settings_last_selected_exercise 
            FOREIGN KEY (last_selected_exercise_id) REFERENCES exercises(id);
        END IF;
        
        -- Note: activity_logs.exercise_id remains TEXT (no foreign key) to support both:
        -- - Built-in exercises (TEXT slugs like 'push-ups')  
        -- - User-created exercises (UUID references)
        
        RAISE NOTICE 'Converted exercises.id from TEXT to UUID';
    END IF;
END $$;

-- Check if we need to convert workouts table id from TEXT to UUID
DO $$
BEGIN
    -- Check if workouts.id is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' 
        AND column_name = 'id' 
        AND data_type = 'text'
        AND table_schema = 'public'
    ) THEN
        -- Drop foreign key constraints that depend on workouts.id
        -- Only drop constraints if the tables and columns exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workout_sessions' 
            AND column_name = 'workout_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_workout_id_fkey;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activity_logs' 
            AND column_name = 'workout_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_workout_id_fkey;
        END IF;
        
        -- Convert workouts.id from TEXT to UUID
        ALTER TABLE workouts ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        
        -- Recreate the foreign key constraints only if columns exist and are UUID type
        -- workout_sessions.workout_id should reference workouts.id (UUID) if it's also UUID
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workout_sessions' 
            AND column_name = 'workout_id'
            AND data_type = 'uuid'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE workout_sessions 
            ADD CONSTRAINT workout_sessions_workout_id_fkey 
            FOREIGN KEY (workout_id) REFERENCES workouts(id);
        END IF;
        
        -- Note: activity_logs.workout_id might remain TEXT to support mixed references
        -- Only recreate constraint if it's UUID type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activity_logs' 
            AND column_name = 'workout_id'
            AND data_type = 'uuid'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE activity_logs 
            ADD CONSTRAINT activity_logs_workout_id_fkey 
            FOREIGN KEY (workout_id) REFERENCES workouts(id);
        END IF;
        
        RAISE NOTICE 'Converted workouts.id from TEXT to UUID';
    END IF;
END $$;

-- =====================================================
-- 1. FEATURE FLAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    description TEXT,
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'authenticated', 'beta', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial feature flags
INSERT INTO feature_flags (flag_name, is_enabled, description, target_audience) VALUES
('user_created_exercises', true, 'Allow users to create custom exercises', 'authenticated'),
('user_created_workouts', false, 'Allow users to create and share workouts', 'authenticated'),
('exercise_sharing', true, 'Enable exercise sharing functionality', 'authenticated'),
('workout_sharing', false, 'Enable workout sharing functionality', 'authenticated'),
('exercise_rating', true, 'Enable exercise rating and review system', 'authenticated'),
('workout_rating', false, 'Enable workout rating and review system', 'authenticated'),
('custom_video_upload', true, 'Allow custom video uploads for exercises', 'authenticated')
ON CONFLICT (flag_name) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    description = EXCLUDED.description,
    target_audience = EXCLUDED.target_audience,
    updated_at = NOW();

-- =====================================================
-- 2. EXERCISE SHARING TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS exercise_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Exercise owner
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- NULL = public
    permission_level VARCHAR(20) DEFAULT 'view', -- view, copy, edit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    -- Prevent duplicate shares
    UNIQUE(exercise_id, shared_with_user_id)
);

CREATE TABLE IF NOT EXISTS workout_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- NULL = public
    permission_level VARCHAR(20) DEFAULT 'view', -- view, copy, edit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    UNIQUE(workout_id, shared_with_user_id)
);

-- =====================================================
-- 3. RATING & REVIEW TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS exercise_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false, -- Moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    UNIQUE(exercise_id, user_id)
);

CREATE TABLE IF NOT EXISTS workout_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    UNIQUE(workout_id, user_id)
);

-- =====================================================
-- 4. UNIFIED FAVORITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- Can be slug (builtin) or UUID (user-created)
    item_type VARCHAR(20) DEFAULT 'exercise', -- 'exercise', 'workout'
    exercise_type VARCHAR(20) DEFAULT 'builtin', -- 'builtin' | 'user_created' | 'shared'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    UNIQUE(user_id, item_id, item_type)
);

-- =====================================================
-- 5. VIDEO UPLOAD SUPPORT
-- =====================================================
CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    is_approved BOOLEAN DEFAULT false, -- Moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    -- Multiple videos per exercise allowed (different angles, etc.)
    UNIQUE(exercise_id, uploader_id, video_url)
);

-- =====================================================
-- 6. CONTENT MODERATION INFRASTRUCTURE
-- =====================================================
CREATE TABLE IF NOT EXISTS content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- 'exercise', 'workout', 'review', 'video'
    content_id TEXT NOT NULL, -- Reference to the content being moderated
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
    ai_confidence DECIMAL(3,2), -- AI moderation confidence score (0.00-1.00)
    ai_reasoning TEXT, -- AI explanation for decision
    human_reviewer_id UUID REFERENCES auth.users(id),
    human_decision VARCHAR(20), -- 'approved', 'rejected', 'needs_review'
    human_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    version BIGINT DEFAULT 1,
    
    UNIQUE(content_type, content_id)
);

-- =====================================================
-- 7. EXTEND EXERCISES TABLE FOR USER-CREATED CONTENT
-- =====================================================
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_public') THEN
        ALTER TABLE exercises ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_verified') THEN
        ALTER TABLE exercises ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='rating_average') THEN
        ALTER TABLE exercises ADD COLUMN rating_average DECIMAL(3,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='rating_count') THEN
        ALTER TABLE exercises ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='copy_count') THEN
        ALTER TABLE exercises ADD COLUMN copy_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='difficulty_level') THEN
        ALTER TABLE exercises ADD COLUMN difficulty_level VARCHAR(20) DEFAULT 'beginner';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='equipment_needed') THEN
        ALTER TABLE exercises ADD COLUMN equipment_needed TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='muscle_groups') THEN
        ALTER TABLE exercises ADD COLUMN muscle_groups TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='tags') THEN
        ALTER TABLE exercises ADD COLUMN tags TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='custom_video_url') THEN
        ALTER TABLE exercises ADD COLUMN custom_video_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='has_video') THEN
        ALTER TABLE exercises ADD COLUMN has_video BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- 8. EXTEND WORKOUTS TABLE FOR USER-CREATED CONTENT
-- =====================================================
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_public') THEN
        ALTER TABLE workouts ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_verified') THEN
        ALTER TABLE workouts ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='rating_average') THEN
        ALTER TABLE workouts ADD COLUMN rating_average DECIMAL(3,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='rating_count') THEN
        ALTER TABLE workouts ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='copy_count') THEN
        ALTER TABLE workouts ADD COLUMN copy_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='difficulty_level') THEN
        ALTER TABLE workouts ADD COLUMN difficulty_level VARCHAR(20) DEFAULT 'beginner';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='tags') THEN
        ALTER TABLE workouts ADD COLUMN tags TEXT[];
    END IF;
END $$;

-- =====================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;

-- Feature flags: readable by all, writable by service role only
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'feature_flags' 
        AND policyname = 'Feature flags are readable by authenticated users'
    ) THEN
        CREATE POLICY "Feature flags are readable by authenticated users" ON feature_flags
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Exercise shares: owners can manage shares, shared users can read
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_shares' 
        AND policyname = 'Users can manage their exercise shares'
    ) THEN
        CREATE POLICY "Users can manage their exercise shares" ON exercise_shares
            FOR ALL USING (owner_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_shares' 
        AND policyname = 'Users can view shares made to them'
    ) THEN
        CREATE POLICY "Users can view shares made to them" ON exercise_shares
            FOR SELECT USING (shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL);
    END IF;
END $$;

-- Workout shares: similar to exercise shares
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workout_shares' 
        AND policyname = 'Users can manage their workout shares'
    ) THEN
        CREATE POLICY "Users can manage their workout shares" ON workout_shares
            FOR ALL USING (owner_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workout_shares' 
        AND policyname = 'Users can view workout shares made to them'
    ) THEN
        CREATE POLICY "Users can view workout shares made to them" ON workout_shares
            FOR SELECT USING (shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL);
    END IF;
END $$;

-- Exercise ratings: users can rate accessible content
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_ratings' 
        AND policyname = 'Users can manage their ratings'
    ) THEN
        CREATE POLICY "Users can manage their ratings" ON exercise_ratings
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_ratings' 
        AND policyname = 'Users can view all ratings'
    ) THEN
        CREATE POLICY "Users can view all ratings" ON exercise_ratings
            FOR SELECT USING (true);
    END IF;
END $$;

-- Workout ratings: similar to exercise ratings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workout_ratings' 
        AND policyname = 'Users can manage their workout ratings'
    ) THEN
        CREATE POLICY "Users can manage their workout ratings" ON workout_ratings
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workout_ratings' 
        AND policyname = 'Users can view all workout ratings'
    ) THEN
        CREATE POLICY "Users can view all workout ratings" ON workout_ratings
            FOR SELECT USING (true);
    END IF;
END $$;

-- User favorites: users manage their own favorites
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_favorites' 
        AND policyname = 'Users can manage their favorites'
    ) THEN
        CREATE POLICY "Users can manage their favorites" ON user_favorites
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- Exercise videos: uploaders can manage, all can view approved videos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_videos' 
        AND policyname = 'Users can manage their uploaded videos'
    ) THEN
        CREATE POLICY "Users can manage their uploaded videos" ON exercise_videos
            FOR ALL USING (uploader_id = auth.uid());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_videos' 
        AND policyname = 'Users can view approved videos'
    ) THEN
        CREATE POLICY "Users can view approved videos" ON exercise_videos
            FOR SELECT USING (is_approved = true);
    END IF;
END $$;

-- Content moderation: service role only (admin functionality)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'content_moderation' 
        AND policyname = 'Service role can manage content moderation'
    ) THEN
        CREATE POLICY "Service role can manage content moderation" ON content_moderation
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Enhanced exercise access policies
DROP POLICY IF EXISTS "Users can access exercises" ON exercises;
CREATE POLICY "Users can access exercises" ON exercises FOR SELECT USING (
    owner_id = auth.uid() OR  -- Own exercises
    owner_id IS NULL OR       -- System/builtin exercises (owner_id = NULL)
    is_public = true OR       -- Public exercises
    id IN (                   -- Shared exercises
        SELECT exercise_id FROM exercise_shares 
        WHERE shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL
    )
);

-- Users can only modify their own exercises (not builtin ones)
DROP POLICY IF EXISTS "Users can modify own exercises" ON exercises;
CREATE POLICY "Users can modify own exercises" ON exercises 
    FOR ALL USING (owner_id = auth.uid() AND owner_id IS NOT NULL);

-- Enhanced workout access policies (similar pattern)
DROP POLICY IF EXISTS "Users can access workouts" ON workouts;
CREATE POLICY "Users can access workouts" ON workouts FOR SELECT USING (
    owner_id = auth.uid() OR  -- Own workouts
    is_public = true OR       -- Public workouts
    id IN (                   -- Shared workouts
        SELECT workout_id FROM workout_shares 
        WHERE shared_with_user_id = auth.uid() OR shared_with_user_id IS NULL
    )
);

DROP POLICY IF EXISTS "Users can modify own workouts" ON workouts;
CREATE POLICY "Users can modify own workouts" ON workouts 
    FOR ALL USING (owner_id = auth.uid());

-- =====================================================
-- 10. PERFORMANCE INDEXES
-- =====================================================

-- Feature flags indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feature_flags_name') THEN
        CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feature_flags_enabled') THEN
        CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);
    END IF;
END $$;

-- Exercise shares indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_shares_exercise_id') THEN
        CREATE INDEX idx_exercise_shares_exercise_id ON exercise_shares(exercise_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_shares_owner') THEN
        CREATE INDEX idx_exercise_shares_owner ON exercise_shares(owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_shares_shared_with') THEN
        CREATE INDEX idx_exercise_shares_shared_with ON exercise_shares(shared_with_user_id);
    END IF;
END $$;

-- Workout shares indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_shares_workout_id') THEN
        CREATE INDEX idx_workout_shares_workout_id ON workout_shares(workout_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_shares_owner') THEN
        CREATE INDEX idx_workout_shares_owner ON workout_shares(owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_shares_shared_with') THEN
        CREATE INDEX idx_workout_shares_shared_with ON workout_shares(shared_with_user_id);
    END IF;
END $$;

-- Rating indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_ratings_exercise_id') THEN
        CREATE INDEX idx_exercise_ratings_exercise_id ON exercise_ratings(exercise_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_ratings_user_id') THEN
        CREATE INDEX idx_exercise_ratings_user_id ON exercise_ratings(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_ratings_workout_id') THEN
        CREATE INDEX idx_workout_ratings_workout_id ON workout_ratings(workout_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_ratings_user_id') THEN
        CREATE INDEX idx_workout_ratings_user_id ON workout_ratings(user_id);
    END IF;
END $$;

-- Favorites indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_favorites_user_id') THEN
        CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_favorites_item_id') THEN
        CREATE INDEX idx_user_favorites_item_id ON user_favorites(item_id);
    END IF;
END $$;

-- Exercise video indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_videos_exercise_id') THEN
        CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercise_videos_uploader') THEN
        CREATE INDEX idx_exercise_videos_uploader ON exercise_videos(uploader_id);
    END IF;
END $$;

-- Enhanced exercise indexes for community features
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercises_public') THEN
        CREATE INDEX idx_exercises_public ON exercises(is_public) WHERE is_public = true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercises_rating') THEN
        CREATE INDEX idx_exercises_rating ON exercises(rating_average DESC) WHERE rating_average > 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exercises_owner') THEN
        CREATE INDEX idx_exercises_owner ON exercises(owner_id) WHERE owner_id IS NOT NULL;
    END IF;
END $$;

-- Enhanced workout indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workouts_public') THEN
        CREATE INDEX idx_workouts_public ON workouts(is_public) WHERE is_public = true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workouts_rating') THEN
        CREATE INDEX idx_workouts_rating ON workouts(rating_average DESC) WHERE rating_average > 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workouts_owner') THEN
        CREATE INDEX idx_workouts_owner ON workouts(owner_id) WHERE owner_id IS NOT NULL;
    END IF;
END $$;

-- =====================================================
-- 11. MIGRATION FROM OLD FAVORITES FORMAT
-- =====================================================

-- Migrate existing favorites from user_preferences.favorite_exercises to user_favorites table
DO $$
DECLARE
    user_record RECORD;
    exercise_id TEXT;
BEGIN
    -- Check if user_preferences table exists and has favorite_exercises column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_preferences' AND column_name='favorite_exercises') THEN
        
        -- Migrate existing favorites from user_preferences.favorite_exercises
        FOR user_record IN 
            SELECT owner_id, favorite_exercises 
            FROM user_preferences 
            WHERE favorite_exercises IS NOT NULL AND array_length(favorite_exercises, 1) > 0
        LOOP
            -- Insert each favorite exercise into new table
            FOREACH exercise_id IN ARRAY user_record.favorite_exercises
            LOOP
                INSERT INTO user_favorites (user_id, item_id, item_type, exercise_type)
                VALUES (user_record.owner_id, exercise_id, 'exercise', 'builtin')
                ON CONFLICT (user_id, item_id, item_type) DO NOTHING;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Favorites migration completed successfully';
    ELSE
        RAISE NOTICE 'No existing favorites to migrate';
    END IF;
END $$;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Verify all tables exist
DO $$
DECLARE
    missing_tables TEXT[] := '{}';
    tbl_name TEXT;
    tables_to_check TEXT[] := ARRAY['feature_flags', 'exercise_shares', 'workout_shares', 
                                   'exercise_ratings', 'workout_ratings', 'user_favorites', 
                                   'exercise_videos', 'content_moderation'];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_check
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = tbl_name AND t.table_schema = 'public') THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist';
    END IF;
END $$;

-- Display feature flags
SELECT 'Feature Flags Status:' AS info;
SELECT flag_name, is_enabled, target_audience, description 
FROM feature_flags 
ORDER BY flag_name;

-- Display table row counts
SELECT 
    'feature_flags' as table_name, 
    COUNT(*) as row_count 
FROM feature_flags
UNION ALL
SELECT 'exercise_shares', COUNT(*) FROM exercise_shares
UNION ALL
SELECT 'workout_shares', COUNT(*) FROM workout_shares
UNION ALL  
SELECT 'exercise_ratings', COUNT(*) FROM exercise_ratings
UNION ALL
SELECT 'workout_ratings', COUNT(*) FROM workout_ratings  
UNION ALL
SELECT 'user_favorites', COUNT(*) FROM user_favorites
UNION ALL
SELECT 'exercise_videos', COUNT(*) FROM exercise_videos
UNION ALL
SELECT 'content_moderation', COUNT(*) FROM content_moderation
ORDER BY table_name;

-- Success message
SELECT 'SUCCESS: RepCue Development Database Migration Completed!' AS result;
SELECT 'All user-created exercises infrastructure is now available.' AS note;



     -- =====================================================
     -- Refresh Supabase Schema Cache for repcue-dev
     -- Fixes PGRST204 "column not found in schema cache" errors
     -- =====================================================
     -- Method 1: Force schema cache reload by notifying PostgREST
     NOTIFY pgrst, 'reload schema';
     -- Method 2: Alternative approach - restart PostgREST via config change
     -- This forces PostgREST to reload its schema cache