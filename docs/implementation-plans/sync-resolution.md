# Sync Resolution Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to rebuild the sync system from scratch, eliminating current architectural issues and establishing a robust, maintainable foundation for data synchronization between IndexedDB and Supabase.

**Recommendation: Complete Database Reset and Redesign** ✅

## Current System Analysis

### Entities and Relationships

#### Core Entities
1. **Exercise** - Exercise definitions and metadata
   - Fields: id, name, description, category, exerciseType, defaultDuration, defaultSets, defaultReps, repDurationSeconds, hasVideo, isFavorite, tags
   - Primary Key: string ID
   - Relationships: Referenced by ActivityLog, WorkoutExercise, UserPreferences.favoriteExercises

2. **Workout** - Exercise sequences and schedules  
   - Fields: id, name, description, exercises[], scheduledDays[], isActive, estimatedDuration, createdAt
   - Primary Key: string ID
   - Relationships: Contains WorkoutExercise[] (embedded), Referenced by WorkoutSession, ActivityLog

3. **WorkoutSession** - Executed workout instances
   - Fields: id, workoutId, workoutName, startTime, endTime, exercises[], isCompleted, completionPercentage, totalDuration
   - Primary Key: string ID  
   - Relationships: References Workout, Contains WorkoutSessionExercise[] (embedded)

4. **ActivityLog** - Individual exercise logging
   - Fields: id, exerciseId, exerciseName, duration, timestamp, notes, workoutId?, isWorkout?, exercises[]?
   - Primary Key: auto-increment (++id) ❌ **INCONSISTENCY**
   - Relationships: References Exercise, optionally references Workout

5. **UserPreferences** - User-specific settings
   - Fields: id, soundEnabled, vibrationEnabled, defaultIntervalDuration, darkMode, favoriteExercises[]
   - Primary Key: auto-increment (++id) ❌ **INCONSISTENCY**
   - Relationships: References Exercise[] via favoriteExercises

6. **AppSettings** - Application-wide configuration
   - Fields: id, intervalDuration, soundEnabled, vibrationEnabled, beepVolume, darkMode, autoSave, lastSelectedExerciseId, preTimerCountdown, defaultRestTime, repSpeedFactor, showExerciseVideos
   - Primary Key: auto-increment (++id) ❌ **INCONSISTENCY**
   - Relationships: References Exercise via lastSelectedExerciseId

#### Sync Metadata (Applied to all entities)
- id, ownerId, updatedAt, deleted, version (server-synced)  
- dirty, op, syncedAt (local-only)

### Current Problems

#### 1. Primary Key Inconsistencies
- **Exercise/Workout/WorkoutSession**: Use string IDs
- **ActivityLog/UserPreferences/AppSettings**: Use auto-increment (++id) 
- **Impact**: Complex ID handling, sync confusion, mapping errors

#### 2. Field Naming Inconsistencies  
- **Client**: camelCase (exerciseId, workoutName, isCompleted)
- **Server**: snake_case (exercise_id, workout_name, is_completed)
- **Impact**: Complex field mapping, error-prone transformations

#### 3. Schema Mismatches
- Missing columns in Supabase vs IndexedDB
- Data type mismatches (Date vs timestamp, arrays, JSONB)
- **Impact**: Silent sync failures, data loss

#### 4. Timestamp Handling Issues
- Mixed Date objects and ISO strings
- Timezone confusion
- **Impact**: Sync comparison failures, data corruption

#### 5. Complex Field Mapping Logic
- Growing list of ad-hoc transformations
- Hard to maintain and debug
- **Impact**: Technical debt, brittle sync

## New Architecture Design

### Design Principles

1. **Consistency First**: Unified conventions across client/server
2. **Explicit Over Implicit**: Clear data flow and transformations  
3. **Fail Fast**: Immediate error detection and reporting
4. **Schema-Driven**: Database schema as source of truth
5. **Observable**: Comprehensive logging and debugging

### Unified Naming Convention

**Decision: Use snake_case everywhere** 🎯
- Supabase/PostgreSQL native convention
- Eliminates field mapping complexity  
- Reduces transformation errors
- Industry standard for APIs

### Unified Primary Key Strategy

**Decision: Use UUIDs for all entities** 🎯
- Consistent across all tables
- No auto-increment complexity
- Better for distributed systems
- Easier conflict resolution

### Unified Timestamp Strategy

**Decision: Use ISO strings everywhere** 🎯
- Consistent serialization
- No timezone ambiguity
- IndexedDB and Supabase compatible
- Easier debugging

## Implementation Plan

### Phase 1: Database Schema Redesign (1-2 days)

#### Task 1.1: Design New Schema
- [ ] Create clean database schema with snake_case naming
- [ ] Define all tables with consistent UUID primary keys
- [ ] Establish foreign key relationships
- [ ] Add proper indexes for performance

#### Task 1.2: Drop Current Database
- [ ] Backup existing schema for reference
- [ ] Drop all current tables
- [ ] Reset Supabase project if needed

#### Task 1.3: Create New Tables
```sql
-- exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  exercise_type TEXT NOT NULL, -- 'time_based' | 'repetition_based'
  default_duration INTEGER, -- seconds
  default_sets INTEGER,
  default_reps INTEGER,
  rep_duration_seconds INTEGER,
  has_video BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- workouts table  
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_days TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- workout_sessions table
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  workout_id UUID REFERENCES workouts(id),
  workout_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  total_duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  exercise_id TEXT NOT NULL, -- Can reference exercises.id or be 'workout'
  exercise_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  notes TEXT,
  workout_id UUID REFERENCES workouts(id),
  is_workout BOOLEAN DEFAULT false,
  exercises JSONB, -- Array of exercise details for workouts
  sets_count INTEGER,
  reps_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) UNIQUE,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  default_interval_duration INTEGER DEFAULT 30,
  dark_mode BOOLEAN DEFAULT false,
  favorite_exercises UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);

-- app_settings table
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) UNIQUE,
  interval_duration INTEGER DEFAULT 30,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  beep_volume NUMERIC DEFAULT 0.5,
  dark_mode BOOLEAN DEFAULT false,
  auto_save BOOLEAN DEFAULT true,
  last_selected_exercise_id UUID,
  pre_timer_countdown INTEGER DEFAULT 3,
  default_rest_time INTEGER DEFAULT 60,
  rep_speed_factor NUMERIC DEFAULT 1.0,
  show_exercise_videos BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  auto_start_next BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1
);
```

#### Task 1.4: Add Indexes and Constraints
- [ ] Add performance indexes
- [ ] Add data validation constraints  
- [ ] Add RLS policies

### Phase 2: Client Schema Refactor (2-3 days)

#### Task 2.1: Update TypeScript Interfaces
- [ ] Rename all fields to snake_case
- [ ] Change all Date fields to string (ISO format)
- [ ] Update all IDs to UUID strings
- [ ] Add proper typing for JSONB fields

#### Task 2.2: Update IndexedDB Schema  
- [ ] Change Dexie schema to match server exactly
- [ ] Use UUID primary keys for all tables
- [ ] Remove auto-increment keys
- [ ] Update indexes

#### Task 2.3: Update Data Access Layer
- [ ] Update all queries to use new field names
- [ ] Add UUID generation for new records
- [ ] Update timestamp handling
- [ ] Fix all type errors

#### Task 2.4: Update UI Components
- [ ] Update all component props and state
- [ ] Fix form field bindings  
- [ ] Update display logic for new field names
- [ ] Test all user flows

### Phase 3: Simplified Sync Service (1-2 days)

#### Task 3.1: Remove Complex Field Mapping
- [ ] Delete all camelCase → snake_case transformations
- [ ] Remove field renaming logic
- [ ] Simplify sync request building

#### Task 3.2: Improve Error Handling
- [ ] Add detailed logging to edge functions
- [ ] Implement proper error responses
- [ ] Add client-side error handling
- [ ] Create debugging tools

#### Task 3.3: Add Sync Validation
- [ ] Validate data before sending
- [ ] Check schema compatibility
- [ ] Add data integrity checks
- [ ] Implement rollback on errors

### Phase 4: Data Migration Strategy (1 day)

#### Task 4.1: Export Current Data
- [ ] Create data export tool
- [ ] Export all user data to JSON
- [ ] Validate exported data

#### Task 4.2: Data Transformation
- [ ] Transform field names to snake_case
- [ ] Generate UUIDs for all records  
- [ ] Convert timestamps to ISO strings
- [ ] Update relationships

#### Task 4.3: Import to New Schema  
- [ ] Import exercises first (no dependencies)
- [ ] Import workouts (depends on exercises)
- [ ] Import preferences and settings
- [ ] Import sessions and logs
- [ ] Validate imported data

### Phase 5: Testing and Validation (1-2 days)

#### Task 5.1: Unit Tests
- [ ] Test data access layer
- [ ] Test sync service
- [ ] Test edge functions
- [ ] Test data transformations

#### Task 5.2: Integration Tests
- [ ] Test complete sync flow
- [ ] Test conflict resolution
- [ ] Test error scenarios
- [ ] Test offline/online scenarios

#### Task 5.3: Manual Testing
- [ ] Test all user workflows
- [ ] Test data consistency
- [ ] Test performance
- [ ] Test edge cases

### Phase 6: Monitoring and Cleanup (0.5 days)

#### Task 6.1: Add Monitoring
- [ ] Add sync metrics
- [ ] Add error tracking  
- [ ] Add performance monitoring
- [ ] Create sync dashboard

#### Task 6.2: Documentation
- [ ] Update sync documentation
- [ ] Document new schema
- [ ] Create troubleshooting guide
- [ ] Update developer docs

#### Task 6.3: Cleanup
- [ ] Remove old migration code
- [ ] Remove unused field mappings
- [ ] Clean up imports
- [ ] Archive old implementation

## Benefits of This Approach

### Immediate Benefits
1. **Elimination of Field Mapping** - No more camelCase ↔ snake_case transformations
2. **Consistent Primary Keys** - UUID everywhere, no auto-increment confusion  
3. **Unified Timestamps** - ISO strings everywhere, no Date object issues
4. **Schema Consistency** - Client and server schemas match exactly
5. **Better Error Handling** - Clear error messages and debugging

### Long-term Benefits
1. **Maintainability** - Simple, consistent codebase
2. **Reliability** - Fewer transformation points = fewer bugs
3. **Performance** - No complex field mapping overhead
4. **Debuggability** - Clear data flow, better logging
5. **Extensibility** - Easy to add new features

### Risk Mitigation
1. **Data Loss Prevention** - Complete export/import process
2. **Rollback Plan** - Keep old implementation as backup
3. **Testing Coverage** - Comprehensive test suite
4. **Incremental Deployment** - Phase-by-phase rollout

## Timeline

**Total Estimated Time: 6-8 days**

- Phase 1 (Database): 1-2 days
- Phase 2 (Client): 2-3 days  
- Phase 3 (Sync): 1-2 days
- Phase 4 (Migration): 1 day
- Phase 5 (Testing): 1-2 days
- Phase 6 (Cleanup): 0.5 days

## Success Criteria

1. **Zero field mapping code** - Direct property assignment
2. **100% sync success rate** - No silent failures
3. **Consistent schema** - Client/server match exactly
4. **Clear error messages** - Easy debugging
5. **All functionality preserved** - No feature regression
6. **Performance improvement** - Faster sync operations

## Conclusion

The current sync system has accumulated significant technical debt through incremental fixes. A clean redesign will eliminate these issues and provide a solid foundation for future development. With no real users yet, this is the optimal time to make this architectural improvement.

The benefits significantly outweigh the implementation cost, and the systematic approach minimizes risks while ensuring data integrity throughout the process.

**Recommendation: Proceed with complete redesign** ✅