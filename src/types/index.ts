// Exercise types
export const ExerciseType = {
  TIME_BASED: 'time-based',
  REPETITION_BASED: 'repetition-based'
} as const;

export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

// Core exercise types
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  exerciseType: ExerciseType;
  defaultDuration?: number; // in seconds - for time-based exercises
  defaultSets?: number; // for repetition-based exercises
  defaultReps?: number; // for repetition-based exercises
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

export interface Workout {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  scheduledDays: Weekday[]; // Added: Direct scheduling without separate Schedule entity
  isActive: boolean; // Added: Allow pause/resume without deletion
  estimatedDuration?: number; // calculated total time in seconds
  createdAt: Date;
  updatedAt: Date;
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

export interface WorkoutSession {
  id: string;
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
export interface ActivityLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  duration: number; // in seconds
  timestamp: Date;
  notes?: string;
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
export interface UserProfile {
  id: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastActive: Date;
}

export interface UserPreferences {
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
export interface AppSettings {
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
  EDIT_WORKOUT: '/workout/edit'
} as const;

export type Routes = typeof Routes[keyof typeof Routes];

// API types for future backend integration
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface SyncStatus {
  lastSyncDate?: Date;
  pendingChanges: number;
  isOnline: boolean;
}
