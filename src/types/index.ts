// Core exercise types
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  defaultDuration?: number; // in seconds
  isFavorite: boolean;
  tags: string[];
}

export const ExerciseCategory = {
  CORE: 'core',
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance'
} as const;

export type ExerciseCategory = typeof ExerciseCategory[keyof typeof ExerciseCategory];

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

// Settings
export interface AppSettings {
  intervalDuration: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  beepVolume: number; // 0.0 to 1.0 (0% to 100%)
  darkMode: boolean;
  autoSave: boolean;
  lastSelectedExerciseId?: string | null;
}

// Navigation routes
export const Routes = {
  HOME: '/',
  EXERCISES: '/exercises',
  TIMER: '/timer',
  ACTIVITY_LOG: '/activity',
  SETTINGS: '/settings',
  PRIVACY: '/privacy'
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