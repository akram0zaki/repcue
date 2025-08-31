// Sync and accounts types (defined first to be used by other types)
export interface SyncMetadata {
  id: string; // UUID v4
  owner_id?: string | null; // null for anonymous users, UUID for authenticated users
  updated_at: string; // ISO timestamp
  deleted: boolean; // tombstone flag for soft deletes
  version: number; // version counter for conflict resolution
  created_at: string; // ISO timestamp
  // Local-only fields (not synced to server)
  dirty?: number; // 1 if local changes need to be synced, 0 if not
  op?: 'upsert' | 'delete'; // pending operation type
  synced_at?: string; // ISO timestamp of last successful sync
}

// Exercise types
export const ExerciseType = {
  TIME_BASED: 'time_based',
  REPETITION_BASED: 'repetition_based'
} as const;

export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

// Core exercise types
export interface Exercise extends SyncMetadata {
  name: string;
  description?: string;
  category: ExerciseCategory;
  exercise_type: ExerciseType;
  default_duration?: number; // in seconds - for time-based exercises
  default_sets?: number; // for repetition-based exercises
  default_reps?: number; // for repetition-based exercises
  /**
   * Optional per-exercise default duration for a single repetition (in seconds).
   * If provided, this overrides BASE_REP_TIME for this exercise. The effective
   * duration used in timers becomes (rep_duration_seconds * repSpeedFactor).
   */
  rep_duration_seconds?: number; // per-rep base time for repetition-based exercises
  /** Indicates whether a guided video is available for this exercise */
  has_video?: boolean; // default false in catalog initialization
  is_favorite: boolean;
  tags: string[];
}

export const ExerciseCategory = {
  CORE: 'core',
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  HAND_WARMUP: 'hand-warmup'
} as const;

export type ExerciseCategory = typeof ExerciseCategory[keyof typeof ExerciseCategory];

// Workout structure
export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order: number; // Position in workout sequence
  // Custom values that override exercise defaults
  custom_duration?: number; // for time-based exercises
  custom_sets?: number; // for repetition-based exercises
  custom_reps?: number; // for repetition-based exercises
  custom_rest_time?: number; // rest time after this exercise (in seconds)
}

export interface Workout extends SyncMetadata {
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  scheduled_days: Weekday[]; // Added: Direct scheduling without separate Schedule entity
  is_active: boolean; // Added: Allow pause/resume without deletion
  estimated_duration?: number; // calculated total time in seconds
}

// Weekday structure
export const Weekday = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday'
} as const;

export type Weekday = typeof Weekday[keyof typeof Weekday];

// Workout session logging
export interface WorkoutSessionExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  order: number;
  // Actual values performed
  actual_duration?: number; // for time-based exercises
  actual_sets?: number; // for repetition-based exercises
  actual_reps?: number; // for repetition-based exercises
  rest_time?: number; // actual rest time taken
  is_completed: boolean;
  start_time?: string; // ISO timestamp
  end_time?: string; // ISO timestamp
}

export interface WorkoutSession extends SyncMetadata {
  workout_id?: string; // UUID - can be null if workout was deleted
  workout_name: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  exercises: WorkoutSessionExercise[];
  is_completed: boolean;
  completion_percentage: number; // 0-100
  total_duration?: number; // actual time spent in seconds
  notes?: string;
}

// Activity logging
export interface ActivityLog extends SyncMetadata {
  exercise_id: string;
  exercise_name: string;
  duration: number; // in seconds
  timestamp: string; // ISO timestamp
  notes?: string;
  // Workout-specific fields
  workout_id?: string; // UUID
  is_workout?: boolean;
  exercises?: {
    exercise_id: string;
    exercise_name: string;
    duration: number;
    sets?: number;
    reps?: number;
  }[];
  sets_count?: number;
  reps_count?: number;
}

// Timer state
export interface TimerState {
  isRunning: boolean;
  currentTime: number; // in seconds
  targetTime?: number; // for countdown timers
  startTime?: Date;
  intervalDuration: number; // beep interval in seconds
  currentExercise?: Exercise;
  isCountdown: boolean; // true when in pre-timer countdown mode
  countdownTime: number; // countdown remaining time in seconds
  // Rest period state (for rep-based exercises between sets)
  isResting: boolean; // true when in rest period between sets
  restTimeRemaining?: number; // rest time countdown in seconds
  // Standalone rep/set tracking (for standalone rep-based exercises)
  currentSet?: number; // for repetition-based exercises (0-based internally)
  totalSets?: number; // for repetition-based exercises
  currentRep?: number; // for repetition-based exercises (0-based internally)
  totalReps?: number; // for repetition-based exercises
  // Workout-guided mode properties
  workoutMode?: {
    workoutId: string;
    workoutName: string;
    exercises: WorkoutExercise[];
    currentExerciseIndex: number;
    currentSet?: number; // for repetition-based exercises
    totalSets?: number; // for repetition-based exercises
    currentRep?: number; // for repetition-based exercises
    totalReps?: number; // for repetition-based exercises
    isResting: boolean; // true when in rest period between exercises/sets
    restTimeRemaining?: number; // rest time countdown in seconds
    sessionId?: string; // WorkoutSession ID for logging
  };
}

// User preferences and profile
export interface UserPreferences extends SyncMetadata {
  sound_enabled: boolean;
  vibration_enabled: boolean;
  default_interval_duration: number; // in seconds
  dark_mode: boolean;
  favorite_exercises: string[]; // Phase 1: built-in exercise IDs/slugs (server column is TEXT[])
  locale: string;
  units: string; // 'metric' | 'imperial'
  cues: Record<string, unknown>; // JSONB object
  rep_speed_factor: number;
}

// Consent and privacy
export interface ConsentData {
  has_consented: boolean;
  consent_date?: string; // ISO timestamp
  cookies_accepted: boolean;
  analytics_accepted: boolean;
}

// Export all consent types from the dedicated consent types file
export * from './consent';

// Settings
export interface AppSettings extends SyncMetadata {
  interval_duration: number;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  beep_volume: number; // 0.0 to 1.0 (0% to 100%)
  dark_mode: boolean;
  auto_save: boolean;
  last_selected_exercise_id?: string | null; // UUID
  pre_timer_countdown: number; // 0-10 seconds countdown before timer starts
  default_rest_time: number; // default rest time between exercises in seconds
  rep_speed_factor: number; // speed multiplier for repetition-based exercises (0.5 = faster, 2.0 = slower)
  show_exercise_videos?: boolean; // feature flag preference for video demos
  reduce_motion?: boolean;
  auto_start_next?: boolean;
}

// Navigation routes
export const Routes = {
  HOME: '/',
  EXERCISES: '/exercises',
  TIMER: '/timer',
  ACTIVITY_LOG: '/activity',
  SETTINGS: '/settings',
  PRIVACY: '/privacy',
  WORKOUTS: '/workouts', // Changed from SCHEDULE
  CREATE_WORKOUT: '/workout/create',
  EDIT_WORKOUT: '/workout/edit',
  AUTH_CALLBACK: '/auth/callback'
} as const;

export type Routes = typeof Routes[keyof typeof Routes];

// API types for future backend integration
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Additional sync types

export interface SyncStatus {
  lastSyncDate?: Date;
  pendingChanges: number;
  isOnline: boolean;
  isAuthenticated: boolean;
  lastSyncCursor?: string; // server cursor for incremental sync
}

// Sync operation types for batching
export interface SyncOperation {
  table: string;
  operation: 'upsert' | 'delete';
  data: Record<string, unknown>;
  id: string;
}

export interface SyncBatch {
  operations: SyncOperation[];
  cursor?: string;
}

// Auth types
export interface AuthUserProfile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: AuthUserProfile;
  accessToken?: string;
  refreshToken?: string;
}
