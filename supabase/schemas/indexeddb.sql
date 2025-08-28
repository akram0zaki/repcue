-- IndexedDB Schema (represented as SQL for comparison)
-- Based on storageService.ts and TypeScript interfaces

-- EXERCISES Table (id as primary key)
-- Dexie schema: 'id, name, category, exerciseType, isFavorite, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- ExerciseCategory enum
  exerciseType TEXT NOT NULL, -- 'time-based' | 'repetition-based'
  defaultDuration INTEGER, -- seconds for time-based
  defaultSets INTEGER, -- for repetition-based
  defaultReps INTEGER, -- for repetition-based
  repDurationSeconds INTEGER, -- per-rep base time for rep-based
  hasVideo BOOLEAN DEFAULT false,
  isFavorite BOOLEAN NOT NULL,
  tags TEXT[], -- array of strings
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);

-- ACTIVITY_LOGS Table (++id as auto-increment primary key)
-- Dexie schema: '++id, exerciseId, timestamp, duration, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE activityLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- ++id in Dexie (auto-generated)
  exerciseId TEXT NOT NULL,
  exerciseName TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  timestamp TEXT NOT NULL, -- ISO timestamp string
  notes TEXT,
  -- Workout-specific fields
  workoutId TEXT,
  isWorkout BOOLEAN,
  exercises JSONB, -- array of exercise objects
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);

-- USER_PREFERENCES Table (++id as auto-increment primary key)
-- Dexie schema: '++id, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE userPreferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- ++id in Dexie
  soundEnabled BOOLEAN NOT NULL,
  vibrationEnabled BOOLEAN NOT NULL,
  defaultIntervalDuration INTEGER NOT NULL, -- seconds
  darkMode BOOLEAN NOT NULL,
  favoriteExercises TEXT[], -- array of exercise IDs
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);

-- APP_SETTINGS Table (++id as auto-increment primary key)
-- Dexie schema: '++id, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE appSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- ++id in Dexie
  intervalDuration INTEGER NOT NULL,
  soundEnabled BOOLEAN NOT NULL,
  vibrationEnabled BOOLEAN NOT NULL,
  beepVolume REAL NOT NULL, -- 0.0 to 1.0
  darkMode BOOLEAN NOT NULL,
  autoSave BOOLEAN NOT NULL,
  lastSelectedExerciseId TEXT, -- nullable
  preTimerCountdown INTEGER NOT NULL, -- 0-10 seconds
  defaultRestTime INTEGER NOT NULL, -- seconds
  repSpeedFactor REAL NOT NULL, -- speed multiplier
  showExerciseVideos BOOLEAN, -- optional feature flag
  reduceMotion BOOLEAN,
  autoStartNext BOOLEAN,
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);

-- WORKOUTS Table (id as primary key)
-- Dexie schema: 'id, name, createdAt, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE workouts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL, -- array of WorkoutExercise objects
  scheduledDays TEXT[], -- array of weekday strings
  isActive BOOLEAN NOT NULL,
  estimatedDuration INTEGER, -- seconds
  createdAt TEXT NOT NULL, -- ISO timestamp string (stored as string in IndexedDB)
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);

-- WORKOUT_SESSIONS Table (id as primary key)
-- Dexie schema: 'id, workoutId, startTime, endTime, isCompleted, updatedAt, ownerId, deleted, version, dirty'
CREATE TABLE workoutSessions (
  id TEXT PRIMARY KEY NOT NULL,
  workoutId TEXT NOT NULL,
  workoutName TEXT NOT NULL,
  startTime TEXT NOT NULL, -- ISO timestamp string (stored as string in IndexedDB)
  endTime TEXT, -- ISO timestamp string, nullable
  exercises JSONB NOT NULL, -- array of WorkoutSessionExercise objects
  isCompleted BOOLEAN NOT NULL,
  completionPercentage INTEGER NOT NULL, -- 0-100
  totalDuration INTEGER, -- actual time spent in seconds
  -- SyncMetadata fields
  ownerId TEXT, -- UUID string or null
  updatedAt TEXT NOT NULL, -- ISO timestamp string
  deleted BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  -- Local-only sync fields
  dirty INTEGER, -- 0 or 1
  op TEXT, -- 'upsert' | 'delete'
  syncedAt TEXT -- ISO timestamp string
);