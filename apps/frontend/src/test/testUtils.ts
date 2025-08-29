import type { Exercise, ActivityLog, AppSettings, UserPreferences, Workout, WorkoutSession, SyncMetadata } from '../types';

/**
 * Creates base sync metadata for test mocks
 */
export function createMockSyncMetadata(overrides: Partial<SyncMetadata> = {}): SyncMetadata {
  return {
    id: `mock-id-${Math.random().toString(36).substr(2, 9)}`,
    updated_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Creates a mock Exercise with proper sync metadata
 */
export function createMockExercise(overrides: Partial<Exercise> = {}): Exercise {
  const { id, updated_at, deleted, version, dirty, ...exerciseProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    name: 'Mock Exercise',
    description: 'A mock exercise for testing',
    category: 'core',
    exercise_type: 'time_based',
    default_duration: 60,
    is_favorite: false,
    tags: ['mock'],
    ...exerciseProps
  };
}

/**
 * Creates a mock ActivityLog with proper sync metadata
 */
export function createMockActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  const { id, updated_at, deleted, version, dirty, ...activityProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    exercise_id: 'mock-exercise-id',
    exercise_name: 'Mock Exercise',
    duration: 60,
    timestamp: new Date().toISOString(),
    notes: 'Mock activity log',
    ...activityProps
  };
}

/**
 * Creates a mock AppSettings with proper sync metadata
 */
export function createMockAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  const { id, updated_at, deleted, version, dirty, ...settingsProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    interval_duration: 1,
    sound_enabled: true,
    vibration_enabled: true,
    beep_volume: 0.5,
    dark_mode: false,
    auto_save: true,
    last_selected_exercise_id: null,
    pre_timer_countdown: 3,
    default_rest_time: 30,
    rep_speed_factor: 1.0,
    show_exercise_videos: false,
    ...settingsProps
  };
}

/**
 * Creates a mock UserPreferences with proper sync metadata
 */
export function createMockUserPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  const { id, updated_at, deleted, version, dirty, ...preferencesProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    sound_enabled: true,
    vibration_enabled: true,
    default_interval_duration: 1,
    dark_mode: false,
    favorite_exercises: [],
    locale: 'en',
    units: 'metric',
    cues: {},
    rep_speed_factor: 1.0,
    ...preferencesProps
  };
}

/**
 * Creates a mock Workout with proper sync metadata
 */
export function createMockWorkout(overrides: Partial<Workout> = {}): Workout {
  const { id, updated_at, deleted, version, dirty, created_at, ...workoutProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    name: 'Mock Workout',
    description: 'A mock workout for testing',
    exercises: [],
    scheduled_days: [],
    is_active: true,
    estimated_duration: 600,
    created_at: created_at || new Date().toISOString(),
    ...workoutProps
  };
}

/**
 * Creates a mock WorkoutSession with proper sync metadata
 */
export function createMockWorkoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  const { id, updated_at, deleted, version, dirty, ...sessionProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updated_at, deleted, version, dirty });

  return {
    ...syncMetadata,
    workout_id: 'mock-workout-id',
    workout_name: 'Mock Workout',
    start_time: new Date().toISOString(),
    exercises: [],
    is_completed: false,
    completion_percentage: 0,
    total_duration: 0,
    ...sessionProps
  };
}