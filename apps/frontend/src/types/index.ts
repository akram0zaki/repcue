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
  op?: 'upsert' | 'delete' | 'seed'; // pending operation type
  synced_at?: string; // ISO timestamp of last successful sync
}

// Exercise types
export const ExerciseType = {
  TIME_BASED: 'time_based',
  REPETITION_BASED: 'repetition_based'
} as const;

export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

// Exercise instruction structure for detailed user-created exercises
export interface ExerciseInstruction {
  step: number;
  text: string;
  image_url?: string; // Future: step-by-step images
  duration_seconds?: number; // For timed steps
}

// Global exercise repository types (Phase 1: Global Exercise Repository)

/**
 * GlobalExercise represents a catalog-agnostic exercise definition.
 * Exercises are defined once and can be referenced by multiple catalogs
 * via CatalogMembership records.
 * 
 * This replaces the one-to-many Exercise → Catalog relationship with
 * a many-to-many relationship through catalog_memberships.
 */
export interface GlobalExercise extends SyncMetadata {
  name: string;
  description?: string;
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
  /** Whether this exercise is active and should be shown in listings. Defaults to true. */
  is_active?: boolean;
  
  /**
   * Base tags: Universal, catalog-agnostic tags (e.g., 'stability', 'warmup', 'isometric')
   * These are NOT catalog-specific badge tags.
   * Catalog-specific tags (e.g., 'category:core', 'kyu:6') are stored in CatalogMembership.catalog_tags
   */
  base_tags: string[];
  
  // Enhanced fields for user-created exercises
  instructions?: ExerciseInstruction[]; // Rich instructions for user-created exercises
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed?: string[]; // Required equipment
  muscle_groups?: string[]; // Target muscle groups
  is_public?: boolean; // can be shared publicly
  is_verified?: boolean; // admin-verified quality
  custom_video_url?: string; // User-uploaded video URL
  
  // Community stats (read-only from server)
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;

  // Extended exercise metadata (for built-in exercises)
  benefits?: string; // Health and fitness benefits of the exercise
  limitations?: string; // Contraindications or limitations
  best_timing?: string; // Optimal times to perform the exercise
  suggested_combinations?: string[]; // IDs of exercises that pair well with this one
  notes?: string; // Additional notes or tips
  exercise_references?: string[]; // Sources, studies, or references

  // Shared exercise reference fields (for reference-based sharing)
  is_shared_reference?: boolean; // Flag indicating this exercise is accessed via reference
  shared_at?: string; // ISO timestamp when the exercise was shared with the user
}

/**
 * CatalogMembership represents the many-to-many relationship between
 * GlobalExercise and ExerciseCatalog.
 * 
 * Each membership can override exercise properties for a specific catalog context,
 * such as catalog-specific tags, display order, featured status, etc.
 */
export interface CatalogMembership extends SyncMetadata {
  exercise_id: string;           // References GlobalExercise.id
  catalog_id: string;            // References ExerciseCatalog.id
  
  // Catalog-specific overrides
  /**
   * Catalog-specific tags for badge filtering (e.g., 'category:core', 'kyu:6', 'equipment:bodyweight')
   * These tags are specific to this catalog's badge system
   */
  catalog_tags?: string[];
  
  /** Display order within the catalog (lower = appears first) */
  display_order?: number;
  
  /** Whether this exercise is featured/highlighted in the catalog */
  featured?: boolean;
  
  /** Override the exercise name translation key for this catalog */
  custom_name_key?: string;
  
  /** Override the exercise description translation key for this catalog */
  custom_description_key?: string;
  
  /** Catalog-specific notes about this exercise */
  catalog_notes?: string;
}

/**
 * Helper type: Exercise with all its catalog memberships
 * Used in forms and components that manage exercise-catalog relationships
 */
export interface ExerciseWithMemberships extends GlobalExercise {
  memberships: CatalogMembership[];
}

/**
 * Helper type: Exercise in a specific catalog context
 * Used when displaying exercises within a catalog (e.g., ExercisePage)
 * Includes the membership info and merged tags for filtering
 */
export interface ExerciseInCatalog extends GlobalExercise {
  membership: CatalogMembership;
  /**
   * Effective tags for filtering: base_tags + catalog_tags merged
   * This is what the badge filtering system uses
   */
  effectiveTags: string[];
}

// Core exercise types (LEGACY - for backward compatibility during migration)
/**
 * @deprecated Use GlobalExercise instead. This type will be removed in a future version.
 * Exercise with direct catalog ownership (one-to-many relationship).
 * Being replaced by GlobalExercise + CatalogMembership (many-to-many relationship).
 */
export interface Exercise extends SyncMetadata {
  name: string;
  description?: string;
  exercise_type: ExerciseType;
  /**
   * @deprecated Use catalog_memberships table for catalog relationships.
   * This field is optional for backward compatibility during migration to GlobalExercise.
   */
  catalogId?: string;            // References ExerciseCatalog.id
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
  /**
   * @deprecated Use base_tags in GlobalExercise or catalog_tags in CatalogMembership.
   * This field is optional for backward compatibility during migration to GlobalExercise.
   */
  tags?: string[];
  /**
   * Base tags (catalog-agnostic) - present in GlobalExercise format.
   * Optional for backward compatibility during migration.
   */
  base_tags?: string[];
  
  // Enhanced fields for user-created exercises
  instructions?: ExerciseInstruction[]; // Rich instructions for user-created exercises
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed?: string[]; // Required equipment
  muscle_groups?: string[]; // Target muscle groups
  is_public?: boolean; // can be shared publicly
  is_verified?: boolean; // admin-verified quality
  custom_video_url?: string; // User-uploaded video URL
  
  // Community stats (read-only from server)
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;

  // Extended exercise metadata (for built-in exercises)
  benefits?: string; // Health and fitness benefits of the exercise
  limitations?: string; // Contraindications or limitations
  best_timing?: string; // Optimal times to perform the exercise
  suggested_combinations?: string[]; // IDs of exercises that pair well with this one
  notes?: string; // Additional notes or tips
  exercise_references?: string[]; // Sources, studies, or references

  // Shared exercise reference fields (for reference-based sharing)
  is_shared_reference?: boolean; // Flag indicating this exercise is accessed via reference
  shared_at?: string; // ISO timestamp when the exercise was shared with the user
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

// Exercise catalog types
export interface ExerciseCatalog {
  id: string;                    // 'general-fitness', 'tai-chi', 'zumba', 'women-health'
  nameKey: string;              // i18n key: 'catalogs.general-fitness.name'
  descriptionKey: string;       // i18n key: 'catalogs.general-fitness.description'
  isDefault: boolean;           // Only general-fitness = true
  isPremium: boolean;           // For future monetization
  displayOrder: number;         // UI sort order
  icon?: string;                // Optional catalog icon identifier
  colorTheme?: string;          // CSS theme identifier
  pictureUrl?: string;          // Catalog header/preview image URL
  /** Catalog-specific badges for filtering exercises (zero or more per catalog) */
  badges?: import('./catalog').CatalogBadge[];
  /** 
   * Optional badge ID to use for grouping exercises on the listing page.
   * If specified, exercises will be grouped by this badge's values.
   * If omitted, exercises are displayed in a flat list.
   * @example 'category' - groups by category badge
   */
  groupByBadge?: string;
  /** 
   * Whether this catalog should be visible/rendered in the UI
   * @default true
   */
  isVisible?: boolean;
  /** 
   * Whether this catalog should be included in AI export scripts (CSV generation)
   * @default true
   */
  isIncludedInAI?: boolean;
}

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
  
  // Enhanced fields for user-created workouts
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_public?: boolean; // can be shared publicly
  is_verified?: boolean; // admin-verified quality
  tags?: string[]; // Workout tags (cardio, strength, etc.)
  
  // Community stats
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;
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
  catalog_id?: string; // References ExerciseCatalog.id
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
  // Personalization metadata (Enhancement E3.1)
  metadata?: {
    perceived_difficulty?: 1 | 2 | 3 | 4 | 5; // 1=Very Easy, 5=Very Hard
    perceived_energy?: 1 | 2 | 3 | 4 | 5; // 1=Exhausted, 5=Energized
    mood?: 'great' | 'good' | 'okay' | 'tired'; // Post-workout mood
    quality?: 'excellent' | 'good' | 'average' | 'struggled'; // Workout quality
    notes_from_survey?: string; // Optional user notes from post-workout survey
  };
}

// Timer state
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean; // true when timer is paused (preserves all state, freezes everything)
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

// User-created content and community feature types

export interface ExerciseShare extends SyncMetadata {
  exercise_id: string;
  shared_with_user_id?: string; // undefined = public share
  permission_level: 'view' | 'copy';
}

export interface WorkoutShare extends SyncMetadata {
  workout_id: string;
  shared_with_user_id?: string;
  permission_level: 'view' | 'copy';
}

export interface ExerciseRating extends SyncMetadata {
  exercise_id: string;
  user_id: string;
  rating: number; // 1-5
  review_text?: string;
  is_verified: boolean;
}

export interface WorkoutRating extends SyncMetadata {
  workout_id: string;
  user_id: string;
  rating: number; // 1-5
  review_text?: string;
  is_verified: boolean;
}

export interface UserFavorite extends SyncMetadata {
  owner_id: string;
  item_id: string; // Can be slug (builtin) or UUID (user-created)
  item_type: 'exercise' | 'workout';
  exercise_type: 'builtin' | 'user_created' | 'shared';
}

export interface FeatureFlag {
  id: string;
  flag_name: string;
  is_enabled: boolean;
  description?: string;
  target_audience: 'all' | 'authenticated' | 'beta' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface ContentModeration {
  id: string;
  content_type: 'exercise' | 'workout' | 'review' | 'video';
  content_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  ai_confidence?: number;
  ai_reasoning?: string;
  human_reviewer_id?: string;
  human_decision?: 'approved' | 'rejected' | 'needs_review';
  human_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface ExerciseVideo extends SyncMetadata {
  exercise_id: string;
  uploader_id: string;
  video_url: string;
  file_size?: number;
  duration_seconds?: number;
  is_approved: boolean;
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
  horizontal_exercise_layout?: boolean; // enable horizontal category listing with Netflix-style scrolling
  ring_timer?: boolean; // true for circular timer with rings, false for rectangular timer with border progress
  // Update preferences
  update_mode?: 'automatic' | 'notify' | 'manual'; // how to handle updates
  allow_auto_updates?: boolean; // enable automatic updates
  update_on_metered?: boolean; // allow updates on metered connections
  // Version tracking
  app_version?: string | null; // currently installed app version, null for new installations
  // AI Coach settings
  coach_enabled?: boolean; // Master toggle for AI Coach
  coach_show_on_home?: boolean; // Display top insight on home page
  coach_auto_refresh?: boolean; // Auto-refresh insights
  coach_refresh_interval?: number; // Auto-refresh interval in milliseconds (default: 5 minutes)
  coach_show_streak?: boolean; // Show streak insights
  coach_show_muscle_balance?: boolean; // Show muscle balance insights
  coach_show_progression?: boolean; // Show progression insights
  coach_show_recovery?: boolean; // Show recovery insights
  coach_show_suggestions?: boolean; // Show workout suggestions
  coach_intro_seen?: boolean; // User has seen the coach introduction dialog
  coach_ai_insights_enabled?: boolean; // Enable AI-powered insights (requires authentication)
  coach_persona?: 'zen' | 'energy' | 'logic'; // Coach personality style (Enhancement E1.2)
  coach_post_workout_survey_enabled?: boolean; // Show post-workout survey after workouts (Phase 1 Gamification)
  celebration_sounds_enabled?: boolean; // Enable celebration sounds for PRs and milestones (Enhancement E1.1)
  // Video rendering preference
  video_fit_mode?: 'fit' | 'fill'; // Fit = contain (no crop), Fill = cover (may crop)
  // Theme System (Theme Customization Feature)
  theme_id?: string; // Selected theme ID from preset library (default: 'default')
}

// Navigation routes
export const Routes = {
  HOME: '/',
  EXERCISES: '/exercises',
  CREATE_EXERCISE: '/exercises/create',
  EDIT_EXERCISE: '/exercises/edit/:id',
  EXERCISE_DETAIL: '/exercises/:id',
  SHARED_EXERCISE: '/share/:shareToken',
  TIMER: '/timer',
  ACTIVITY_LOG: '/activity',
  SETTINGS: '/settings',
  PRIVACY: '/privacy',
  LEGAL: '/legal',
  PROFILE: '/profile',
  PROFILE_VIEW: '/profile/:userId',
  CONNECTIONS: '/connections',
  WORKOUTS: '/workouts', // Changed from SCHEDULE
  CREATE_WORKOUT: '/workout/create',
  EDIT_WORKOUT: '/workout/edit',
  COMMUNITY: '/community',
  COACH: '/coach',
  PR_HISTORY: '/personal-records',
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

// Profile and connection types
// User profile types now in userProfile.ts
export type { UserProfile, FitnessProfileData, SocialProfileData } from './userProfile';

export interface Connection extends SyncMetadata {
  user_id: string; // The user who owns this connection
  connected_user_id: string; // The user they're connected to
  status: ConnectionStatus;
  requested_at: string; // ISO timestamp
  accepted_at?: string; // ISO timestamp
  nickname?: string; // Custom name for this connection
}

export const ConnectionStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked'
} as const;

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];

export interface ConnectionRequest extends SyncMetadata {
  from_user_id: string;
  to_user_id: string;
  message?: string;
  requested_at: string; // ISO timestamp
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: AuthUserProfile;
  accessToken?: string;
  refreshToken?: string;
}

// PWA Update System Types
export interface UpdateInfo {
  version: string;
  policy: UpdatePolicy;
  changelog?: VersionChangelog;
  releaseDate: string;
  downloadSize?: number;
  forceUpdate?: boolean;
  message?: string;
}

export interface VersionChangelog {
  new_features?: string[];
  improvements?: string[];
  bug_fixes?: string[];
  security_updates?: string[];
}

export const UpdatePolicy = {
  FORCE: 'force',
  CRITICAL: 'critical',
  OPTIONAL: 'optional'
} as const;

export type UpdatePolicy = typeof UpdatePolicy[keyof typeof UpdatePolicy];

export interface UpdatePreferences {
  updateMode: UpdateMode;
  allowMeteredUpdates: boolean;
  showChangelog: boolean;
  lastDismissedVersion?: string;
  lastDismissedAt?: string;
}

export const UpdateMode = {
  AUTOMATIC: 'automatic',
  NOTIFY_ONLY: 'notify',
  MANUAL: 'manual'
} as const;

export type UpdateMode = typeof UpdateMode[keyof typeof UpdateMode];

export interface UpdateState {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  updatePolicy?: UpdatePolicy;
  isUpdating: boolean;
  updateProgress?: number;
  lastCheckTime?: Date;
  userPreferences: UpdatePreferences;
  pendingUpdate?: UpdateInfo;
  error?: string;
}

export interface VersionCheckRequest {
  current_version: string;
  client_id?: string;
  user_consent?: boolean;
  platform?: string;
}

export interface VersionCheckResponse {
  update_available: boolean;
  latest_version?: string;
  update_policy?: UpdatePolicy;
  changelog?: VersionChangelog;
  download_url?: string;
  force_update?: boolean;
  message?: string;
}

// Error Handling and Recovery Types
export const UpdateErrorType = {
  NETWORK_ERROR: 'network_error',
  DOWNLOAD_ERROR: 'download_error',
  INSTALLATION_ERROR: 'installation_error',
  VERIFICATION_ERROR: 'verification_error',
  STORAGE_ERROR: 'storage_error',
  SERVICE_WORKER_ERROR: 'service_worker_error',
  TIMEOUT_ERROR: 'timeout_error',
  PERMISSION_ERROR: 'permission_error',
  COMPATIBILITY_ERROR: 'compatibility_error',
  ROLLBACK_ERROR: 'rollback_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

export type UpdateErrorType = typeof UpdateErrorType[keyof typeof UpdateErrorType];

export const UpdateErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type UpdateErrorSeverity = typeof UpdateErrorSeverity[keyof typeof UpdateErrorSeverity];

export interface UpdateError {
  type: UpdateErrorType;
  severity: UpdateErrorSeverity;
  message: string;
  originalError?: Error;
  timestamp: string;
  retryable: boolean;
  userActionRequired: boolean;
  metadata?: {
    statusCode?: number;
    networkInfo?: {
      online?: boolean;
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    };
    updateVersion?: string;
    previousVersion?: string;
    rollbackAvailable?: boolean;
    suggestedActions?: string[];
  };
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: UpdateErrorType[];
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  dangerous?: boolean;
  confirmationRequired?: boolean;
}

export interface UpdateRecoveryState {
  currentError?: UpdateError;
  retryAttempts: number;
  lastRetryTime?: string;
  recoveryActions: RecoveryAction[];
  rollbackInProgress: boolean;
  previousVersion?: string;
  canRollback: boolean;
}

// Export catalog badge types
export type { BadgeValue, CatalogBadge } from './catalog';
