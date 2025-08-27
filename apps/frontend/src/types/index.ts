// Sync and accounts types (defined first to be used by other types)
export interface SyncMetadata {
  id: string; // UUID v4
  ownerId?: string | null; // null for anonymous users, UUID for authenticated users
  updatedAt: string; // ISO timestamp
  deleted: boolean; // tombstone flag for soft deletes
  version: number; // version counter for conflict resolution
  // Local-only fields (not synced to server)
  dirty?: number; // 1 if local changes need to be synced, 0 if not
  op?: 'upsert' | 'delete'; // pending operation type
  syncedAt?: string; // ISO timestamp of last successful sync
}

// Exercise types
export const ExerciseType = {
  TIME_BASED: 'time-based',
  REPETITION_BASED: 'repetition-based'
} as const;

export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

// Core exercise types
export interface Exercise extends SyncMetadata {
  name: string;
  description: string;
  category: ExerciseCategory;
  exerciseType: ExerciseType;
  defaultDuration?: number; // in seconds - for time-based exercises
  defaultSets?: number; // for repetition-based exercises
  defaultReps?: number; // for repetition-based exercises
  /**
   * Optional per-exercise default duration for a single repetition (in seconds).
   * If provided, this overrides BASE_REP_TIME for this exercise. The effective
   * duration used in timers becomes (repDurationSeconds * repSpeedFactor).
   */
  repDurationSeconds?: number; // per-rep base time for repetition-based exercises
  /** Indicates whether a guided video is available for this exercise */
  hasVideo?: boolean; // default false in catalog initialization
  isFavorite: boolean;
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
  exerciseId: string;
  order: number; // Position in workout sequence
  // Custom values that override exercise defaults
  customDuration?: number; // for time-based exercises
  customSets?: number; // for repetition-based exercises
  customReps?: number; // for repetition-based exercises
  customRestTime?: number; // rest time after this exercise (in seconds)
}

export interface Workout extends SyncMetadata {
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  scheduledDays: Weekday[]; // Added: Direct scheduling without separate Schedule entity
  isActive: boolean; // Added: Allow pause/resume without deletion
  estimatedDuration?: number; // calculated total time in seconds
  createdAt: Date;
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
  exerciseId: string;
  exerciseName: string;
  order: number;
  // Actual values performed
  actualDuration?: number; // for time-based exercises
  actualSets?: number; // for repetition-based exercises
  actualReps?: number; // for repetition-based exercises
  restTime?: number; // actual rest time taken
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface WorkoutSession extends SyncMetadata {
  workoutId: string;
  workoutName: string;
  startTime: Date;
  endTime?: Date;
  exercises: WorkoutSessionExercise[];
  isCompleted: boolean;
  completionPercentage: number; // 0-100
  totalDuration?: number; // actual time spent in seconds
}

// Activity logging
export interface ActivityLog extends SyncMetadata {
  exerciseId: string;
  exerciseName: string;
  duration: number; // in seconds
  timestamp: Date;
  notes?: string;
  // Workout-specific fields
  workoutId?: string;
  isWorkout?: boolean;
  exercises?: {
    exerciseId: string;
    exerciseName: string;
    duration: number;
    sets?: number;
    reps?: number;
  }[];
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
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultIntervalDuration: number; // in seconds
  darkMode: boolean;
  favoriteExercises: string[]; // exercise IDs
}

// Consent and privacy
export interface ConsentData {
  hasConsented: boolean;
  consentDate?: Date;
  cookiesAccepted: boolean;
  analyticsAccepted: boolean;
}

// Export all consent types from the dedicated consent types file
export * from './consent';

// Settings
export interface AppSettings extends SyncMetadata {
  intervalDuration: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  beepVolume: number; // 0.0 to 1.0 (0% to 100%)
  darkMode: boolean;
  autoSave: boolean;
  lastSelectedExerciseId?: string | null;
  preTimerCountdown: number; // 0-10 seconds countdown before timer starts
  defaultRestTime: number; // default rest time between exercises in seconds
  repSpeedFactor: number; // speed multiplier for repetition-based exercises (0.5 = faster, 2.0 = slower)
  showExerciseVideos?: boolean; // feature flag preference for video demos
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
