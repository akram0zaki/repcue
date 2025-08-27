import type { Exercise, ActivityLog, AppSettings, UserPreferences, Workout, WorkoutSession, SyncMetadata } from '../types';

/**
 * Creates base sync metadata for test mocks
 */
export function createMockSyncMetadata(overrides: Partial<SyncMetadata> = {}): SyncMetadata {
  return {
    id: `mock-id-${Math.random().toString(36).substr(2, 9)}`,
    updatedAt: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    ...overrides
  };
}

/**
 * Creates a mock Exercise with proper sync metadata
 */
export function createMockExercise(overrides: Partial<Exercise> = {}): Exercise {
  const { id, updatedAt, deleted, version, dirty, ...exerciseProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    name: 'Mock Exercise',
    description: 'A mock exercise for testing',
    category: 'core',
    exerciseType: 'time-based',
    defaultDuration: 60,
    isFavorite: false,
    tags: ['mock'],
    ...exerciseProps
  };
}

/**
 * Creates a mock ActivityLog with proper sync metadata
 */
export function createMockActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  const { id, updatedAt, deleted, version, dirty, ...activityProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    exerciseId: 'mock-exercise-id',
    exerciseName: 'Mock Exercise',
    duration: 60,
    timestamp: new Date(),
    notes: 'Mock activity log',
    ...activityProps
  };
}

/**
 * Creates a mock AppSettings with proper sync metadata
 */
export function createMockAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  const { id, updatedAt, deleted, version, dirty, ...settingsProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    intervalDuration: 1,
    soundEnabled: true,
    vibrationEnabled: true,
    beepVolume: 0.5,
    darkMode: false,
    autoSave: true,
    lastSelectedExerciseId: null,
    preTimerCountdown: 3,
    defaultRestTime: 30,
    repSpeedFactor: 1.0,
    showExerciseVideos: false,
    ...settingsProps
  };
}

/**
 * Creates a mock UserPreferences with proper sync metadata
 */
export function createMockUserPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  const { id, updatedAt, deleted, version, dirty, ...preferencesProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    soundEnabled: true,
    vibrationEnabled: true,
    defaultIntervalDuration: 1,
    darkMode: false,
    favoriteExercises: [],
    ...preferencesProps
  };
}

/**
 * Creates a mock Workout with proper sync metadata
 */
export function createMockWorkout(overrides: Partial<Workout> = {}): Workout {
  const { id, updatedAt, deleted, version, dirty, createdAt, ...workoutProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    name: 'Mock Workout',
    description: 'A mock workout for testing',
    exercises: [],
    scheduledDays: [],
    isActive: true,
    estimatedDuration: 600,
    createdAt: createdAt || new Date(),
    ...workoutProps
  };
}

/**
 * Creates a mock WorkoutSession with proper sync metadata
 */
export function createMockWorkoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  const { id, updatedAt, deleted, version, dirty, ...sessionProps } = overrides;
  const syncMetadata = createMockSyncMetadata({ id, updatedAt, deleted, version, dirty });

  return {
    ...syncMetadata,
    workoutId: 'mock-workout-id',
    workoutName: 'Mock Workout',
    startTime: new Date(),
    exercises: [],
    isCompleted: false,
    completionPercentage: 0,
    totalDuration: 0,
    ...sessionProps
  };
}