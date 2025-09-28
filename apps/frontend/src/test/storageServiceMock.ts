import { vi } from 'vitest';

/**
 * Comprehensive mock for StorageService
 * This includes all public methods to prevent "is not a function" errors in tests
 */
export const createStorageServiceMock = () => {
  return {
    // Instance management
    getInstance: vi.fn(),

    // Database lifecycle
    ready: vi.fn().mockResolvedValue(undefined),
    getDatabase: vi.fn(() => ({})),
    close: vi.fn().mockResolvedValue(undefined),
    resetDatabase: vi.fn().mockResolvedValue(undefined),
    checkAndRepairDatabase: vi.fn().mockResolvedValue({ healthy: true, repaired: false }),

    // App lifecycle methods
    getCurrentAppVersion: vi.fn().mockResolvedValue('1.0.0'),
    updateAppVersion: vi.fn().mockResolvedValue(undefined),

    // Seeding methods
    ensureExercisesSeeded: vi.fn().mockResolvedValue(0),
    ensureCatalogsSeeded: vi.fn().mockResolvedValue(0),
    cleanupBuiltInExercises: vi.fn().mockResolvedValue(undefined),

    // Exercise methods
    getExercises: vi.fn().mockResolvedValue([]),
    saveExercise: vi.fn().mockResolvedValue(undefined),
    deleteExercise: vi.fn().mockResolvedValue(undefined),
    toggleExerciseFavorite: vi.fn().mockResolvedValue(undefined),
    getBuiltInExercisesFastUnsafe: vi.fn().mockResolvedValue([]),
    getExercisesFast: vi.fn().mockResolvedValue([]),
    getAllExercises: vi.fn().mockResolvedValue([]),
    getExercisesByCatalog: vi.fn().mockResolvedValue([]),

    // Custom exercise methods
    createCustomExercise: vi.fn().mockResolvedValue({}),
    updateCustomExercise: vi.fn().mockResolvedValue({}),
    getUserCreatedExercises: vi.fn().mockResolvedValue([]),
    copyExercise: vi.fn().mockResolvedValue({}),
    deleteCustomExercise: vi.fn().mockResolvedValue(undefined),

    // Shared exercise methods
    getSharedExercises: vi.fn().mockResolvedValue([]),
    getSharedExerciseReferences: vi.fn().mockResolvedValue([]),
    getSharedExerciseData: vi.fn().mockResolvedValue([]),
    deleteSharedExerciseReference: vi.fn().mockResolvedValue(true),
    toggleUserCreatedExerciseFavorite: vi.fn().mockResolvedValue(true),
    isUserCreatedExerciseFavorited: vi.fn().mockResolvedValue(false),

    // Catalog methods
    getCatalogs: vi.fn().mockResolvedValue([]),
    getAvailableCatalogs: vi.fn().mockResolvedValue([]),
    getDefaultCatalog: vi.fn().mockResolvedValue({}),

    // Activity log methods
    saveActivityLog: vi.fn().mockResolvedValue(undefined),
    getActivityLogs: vi.fn().mockResolvedValue([]),
    deleteActivityLog: vi.fn().mockResolvedValue(undefined),

    // Workout methods
    saveWorkout: vi.fn().mockResolvedValue(undefined),
    getWorkouts: vi.fn().mockResolvedValue([]),
    getWorkout: vi.fn().mockResolvedValue(null),
    deleteWorkout: vi.fn().mockResolvedValue(undefined),

    // Workout session methods
    saveWorkoutSession: vi.fn().mockResolvedValue(undefined),
    getWorkoutSessions: vi.fn().mockResolvedValue([]),
    deleteWorkoutSession: vi.fn().mockResolvedValue(undefined),

    // User preferences methods
    saveUserPreferences: vi.fn().mockResolvedValue(undefined),
    getUserPreferences: vi.fn().mockResolvedValue(null),
    ensureUserPreferences: vi.fn().mockResolvedValue({}),
    updateUserPreferences: vi.fn().mockResolvedValue(undefined),

    // App settings methods
    saveAppSettings: vi.fn().mockResolvedValue(undefined),
    getAppSettings: vi.fn().mockResolvedValue(null),

    // Video file methods
    saveVideoFile: vi.fn().mockResolvedValue('file-id'),
    getVideoFile: vi.fn().mockResolvedValue(null),
    deleteVideoFile: vi.fn().mockResolvedValue(undefined),
    getVideoFilesByExerciseId: vi.fn().mockResolvedValue([]),
    getVideoFilesPendingSync: vi.fn().mockResolvedValue([]),
    markVideoFileUploaded: vi.fn().mockResolvedValue(undefined),
    cleanupDeletedVideoFiles: vi.fn().mockResolvedValue({ deletedCount: 0, freedSpaceMB: 0 }),
    getVideoFileStats: vi.fn().mockResolvedValue({ totalFiles: 0, totalSizeMB: 0, pendingSync: 0 }),

    // Sync methods
    getSyncState: vi.fn().mockResolvedValue(null),
    upsertSyncState: vi.fn().mockResolvedValue(undefined),
    resetSyncState: vi.fn().mockResolvedValue(undefined),
    normalizeIdsForSync: vi.fn().mockResolvedValue({ normalized_activity_logs: 0, normalized_user_favorites: 0 }),
    getDirtyRecords: vi.fn().mockResolvedValue({ exercises: [], activityLogs: [], userPreferences: [], appSettings: [], workouts: [], workoutSessions: [], userFavorites: [] }),
    markAsSynced: vi.fn().mockResolvedValue(undefined),
    claimOwnership: vi.fn().mockResolvedValue({ success: true, claimedCount: 0 }),

    // Utility methods
    clearAllData: vi.fn().mockResolvedValue(undefined),
    exportAllData: vi.fn().mockResolvedValue('{"exercises": []}'),
    getStorageStats: vi.fn().mockResolvedValue({ exerciseCount: 0, activityLogCount: 0, workoutCount: 0, workoutSessionCount: 0 }),
    peekExerciseCount: vi.fn().mockResolvedValue(0),
    debugSnapshot: vi.fn().mockResolvedValue({ verno: 1, tablesSizes: {} }),
    debugDatabaseState: vi.fn().mockResolvedValue(undefined),

    // Conversion methods for sync
    convertAppSettingsForSync: vi.fn().mockReturnValue({}),
    convertUserFavoritesForSync: vi.fn().mockReturnValue({}),
    convertAppSettingsFromSync: vi.fn().mockReturnValue({})
  };
};

/**
 * Creates a mock for the StorageService module
 * Use this in vi.mock() calls to get a comprehensive mock
 */
export const createStorageServiceModuleMock = () => {
  const mockInstance = createStorageServiceMock();

  return {
    StorageService: {
      getInstance: vi.fn(() => mockInstance)
    },
    storageService: mockInstance
  };
};