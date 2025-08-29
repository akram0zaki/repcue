import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService } from '../storageService'
import type { Exercise, ActivityLog, UserPreferences, AppSettings } from '../../types'
import { ExerciseType } from '../../types'
import { createMockExercise, createMockActivityLog, createMockUserPreferences, createMockAppSettings } from '../../test/testUtils'

// Mock Dexie
vi.mock('dexie', () => {
  const MockTable = vi.fn(() => ({
    put: vi.fn(),
    add: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn(() => ({
      reverse: vi.fn(() => ({
        filter: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([])
        })),
        limit: vi.fn().mockResolvedValue([])
      }))
    })),
    filter: vi.fn(() => ({
      first: vi.fn().mockResolvedValue(null),
      toArray: vi.fn().mockResolvedValue([])
    })),
    clear: vi.fn()
  }))

  return {
    default: vi.fn(() => ({
      version: vi.fn(() => ({
        stores: vi.fn(() => ({
          upgrade: vi.fn()
        }))
      })),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      exercises: new MockTable(),
      activity_logs: new MockTable(),
      user_preferences: new MockTable(),
      app_settings: new MockTable(),
      workouts: new MockTable(),
      workout_sessions: new MockTable()
    }))
  }
})

// Mock consent service
vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn()
  }
}))

const { consentService } = await import('../consentService')

describe('StorageService', () => {
  let storageService: StorageService
  let mockDb: any
  let exerciseStorage: Map<string, any>
  let activityLogStorage: any[]
  let userPreferencesStorage: any[]
  let appSettingsStorage: any[]

  const mockExercise: Exercise = createMockExercise({
    id: 'test-exercise-1',
    name: 'Push-ups',
    category: 'strength',
    exercise_type: ExerciseType.REPETITION_BASED,
    description: 'Basic push-up exercise',
    default_duration: 30,
    is_favorite: false,
    tags: ['bodyweight', 'upper-body']
  })

  const mockActivityLog: ActivityLog = createMockActivityLog({
    id: 'log-1',
    exercise_id: 'test-exercise-1',
    exercise_name: 'Push-ups',
    timestamp: new Date('2024-01-01T12:00:00Z').toISOString(),
    duration: 30,
    notes: 'Good workout'
  })

  const mockUserPreferences: UserPreferences = createMockUserPreferences({
    sound_enabled: true,
    vibration_enabled: true,
    default_interval_duration: 30,
    dark_mode: false,
    favorite_exercises: ['test-exercise-1']
  })

  const mockAppSettings: AppSettings = createMockAppSettings({
    interval_duration: 30,
    sound_enabled: true,
    vibration_enabled: true,
    beep_volume: 0.5,
    dark_mode: false,
    auto_save: true,
    pre_timer_countdown: 3,
    default_rest_time: 60,
    rep_speed_factor: 1.0
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock consent as granted by default
    vi.mocked(consentService.hasConsent).mockReturnValue(true)
    
    // Create a fresh StorageService instance by clearing singleton
    // @ts-expect-error - accessing private static property for testing
    StorageService.instance = undefined
    
    storageService = StorageService.getInstance()
    
    // Create fresh storage for our mocks
    exerciseStorage = new Map()
    activityLogStorage = []
    userPreferencesStorage = []
    appSettingsStorage = []
    
    // Get reference to the mocked database and override it with fresh mocks
    // @ts-expect-error - accessing private property for testing
    mockDb = storageService.db = {
      exercises: {
        put: vi.fn().mockImplementation((exercise) => {
          exerciseStorage.set(exercise.id, exercise)
          return Promise.resolve(undefined)
        }),
        get: vi.fn().mockImplementation((id) => {
          return Promise.resolve(exerciseStorage.get(id))
        }),
        update: vi.fn().mockImplementation((id, updates) => {
          const existing = exerciseStorage.get(id)
          if (existing) {
            exerciseStorage.set(id, { ...existing, ...updates })
          }
          return Promise.resolve(undefined)
        }),
        toArray: vi.fn().mockImplementation(() => {
          return Promise.resolve(Array.from(exerciseStorage.values()))
        }),
        clear: vi.fn().mockImplementation(() => {
          exerciseStorage.clear()
          return Promise.resolve(undefined)
        }),
        count: vi.fn().mockImplementation(() => {
          return Promise.resolve(exerciseStorage.size)
        })
      } as any,
      activity_logs: {
        put: vi.fn().mockImplementation((log) => {
          activityLogStorage.push(log)
          return Promise.resolve(undefined)
        }),
        add: vi.fn().mockImplementation((log) => {
          activityLogStorage.push(log)
          return Promise.resolve(undefined)
        }),
        toArray: vi.fn().mockImplementation(() => {
          return Promise.resolve([...activityLogStorage])
        }),
        orderBy: vi.fn().mockImplementation(() => {
          const createQueryObject = () => ({
            filter: vi.fn().mockImplementation(() => createQueryObject()),
            limit: vi.fn().mockImplementation((limit) => createQueryObject()),
            reverse: vi.fn().mockImplementation(() => createQueryObject()),
            toArray: vi.fn().mockImplementation(() => {
              return Promise.resolve([...activityLogStorage])
            })
          })
          
          return createQueryObject()
        }),
        clear: vi.fn().mockImplementation(() => {
          activityLogStorage.length = 0
          return Promise.resolve(undefined)
        }),
        count: vi.fn().mockImplementation(() => {
          return Promise.resolve(activityLogStorage.length)
        })
      } as any,
      user_preferences: {
        put: vi.fn().mockImplementation((preferences) => {
          userPreferencesStorage.push(preferences)
          return Promise.resolve(undefined)
        }),
        add: vi.fn().mockImplementation((preferences) => {
          userPreferencesStorage.push(preferences)
          return Promise.resolve(undefined)
        }),
        toArray: vi.fn().mockImplementation(() => {
          return Promise.resolve([...userPreferencesStorage])
        }),
        orderBy: vi.fn().mockImplementation(() => ({
          last: vi.fn(() => {
            return Promise.resolve(userPreferencesStorage.length > 0 ? userPreferencesStorage[userPreferencesStorage.length - 1] : null)
          }),
          limit: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(userPreferencesStorage[0])
          }))
        })),
        clear: vi.fn().mockImplementation(() => {
          userPreferencesStorage.length = 0
          return Promise.resolve(undefined)
        }),
        count: vi.fn().mockImplementation(() => {
          return Promise.resolve(userPreferencesStorage.length)
        })
      } as any,
      app_settings: {
        put: vi.fn().mockImplementation((settings) => {
          appSettingsStorage.push(settings)
          return Promise.resolve(undefined)
        }),
        add: vi.fn().mockImplementation((settings) => {
          appSettingsStorage.push(settings)
          return Promise.resolve(undefined)
        }),
        toArray: vi.fn().mockImplementation(() => {
          return Promise.resolve([...appSettingsStorage])
        }),
        orderBy: vi.fn().mockImplementation(() => ({
          last: vi.fn(() => {
            return Promise.resolve(appSettingsStorage.length > 0 ? appSettingsStorage[appSettingsStorage.length - 1] : null)
          }),
          limit: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(appSettingsStorage[0])
          }))
        })),
        clear: vi.fn().mockImplementation(() => {
          appSettingsStorage.length = 0
          return Promise.resolve(undefined)
        }),
        count: vi.fn().mockImplementation(() => {
          return Promise.resolve(appSettingsStorage.length)
        })
      } as any,
      workouts: {
        toArray: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0)
      } as any,
      workout_sessions: {
        toArray: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0)
      } as any,
      close: vi.fn().mockResolvedValue(undefined),
      table: vi.fn().mockImplementation((tableName: string) => {
        switch (tableName) {
          case 'exercises':
            return { toArray: vi.fn().mockImplementation(() => Promise.resolve(Array.from(exerciseStorage.values()))) };
          case 'activity_logs':
            return { toArray: vi.fn().mockImplementation(() => Promise.resolve([...activityLogStorage])) };
          case 'user_preferences':
            return { toArray: vi.fn().mockImplementation(() => Promise.resolve([...userPreferencesStorage])) };
          case 'app_settings':
            return { toArray: vi.fn().mockImplementation(() => Promise.resolve([...appSettingsStorage])) };
          case 'workouts':
          case 'workout_sessions':
            return { toArray: vi.fn().mockResolvedValue([]) };
          default:
            return { toArray: vi.fn().mockResolvedValue([]) };
        }
      })
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = StorageService.getInstance()
      const instance2 = StorageService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('consent checking', () => {
    it('should throw error when trying to save without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)
      
      await expect(storageService.saveExercise(mockExercise))
        .rejects.toThrow('Cannot store data without user consent')
    })

    it('should return empty array when getting data without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)
      
      const exercises = await storageService.getExercises()
      expect(exercises).toEqual([])
    })
  })

  describe('saveExercise', () => {
    it('should save exercise to IndexedDB with consent', async () => {
      await storageService.saveExercise(mockExercise)
      
      expect(mockDb.exercises.put).toHaveBeenCalledWith({
        ...mockExercise,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 1
      })
    })

    it('should use fallback storage when IndexedDB fails', async () => {
      mockDb.exercises.put.mockRejectedValue(new Error('IndexedDB error'))
      
      await storageService.saveExercise(mockExercise)
      
      // Should not throw, fallback should handle it
      expect(mockDb.exercises.put).toHaveBeenCalled()
    })
  })

  describe('getExercises', () => {
    it('should retrieve exercises from IndexedDB', async () => {
      const storedExercises = [{
        ...mockExercise,
        updatedAt: '2024-01-01T12:00:00Z'
      }]
      mockDb.exercises.toArray.mockResolvedValue(storedExercises)
      
      const exercises = await storageService.getExercises()
      
      expect(exercises).toHaveLength(1)
      expect(exercises[0]).toMatchObject({
        ...mockExercise,
        updatedAt: '2024-01-01T12:00:00Z'
      })
    })

    it('should handle IndexedDB errors gracefully', async () => {
      mockDb.exercises.toArray.mockRejectedValue(new Error('IndexedDB error'))
      
      const exercises = await storageService.getExercises()
      
      expect(exercises).toEqual([])
    })
  })

  describe('toggleExerciseFavorite', () => {
    it('should toggle exercise favorite status', async () => {
      mockDb.exercises.get.mockResolvedValue({
        ...mockExercise,
        is_favorite: false
      })
      
      await storageService.toggleExerciseFavorite(mockExercise.id)
      
      expect(mockDb.exercises.put).toHaveBeenCalledWith({
        ...mockExercise,
        is_favorite: true,
        updated_at: expect.any(String),
        created_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 1
      })
    })

    it('should handle missing exercise gracefully', async () => {
      mockDb.exercises.get.mockResolvedValue(undefined)
      
      await expect(storageService.toggleExerciseFavorite('nonexistent'))
        .resolves.not.toThrow()
    })
  })

  describe('saveActivityLog', () => {
    it('should save activity log to IndexedDB', async () => {
      await storageService.saveActivityLog(mockActivityLog)
      
      expect(mockDb.activity_logs.put).toHaveBeenCalledWith({
        ...mockActivityLog,
        id: expect.any(String),
        timestamp: mockActivityLog.timestamp,
        created_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: expect.any(String)
      })
    })

    it('should use fallback storage when IndexedDB fails', async () => {
      mockDb.activity_logs.put.mockRejectedValue(new Error('IndexedDB error'))
      
      await storageService.saveActivityLog(mockActivityLog)
      
      // Should not throw, fallback should handle it
      expect(mockDb.activity_logs.put).toHaveBeenCalled()
    })
  })

  describe('getActivityLogs', () => {
    it('should retrieve activity logs from IndexedDB', async () => {
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      // Add the log to the mock storage
      activityLogStorage.push(mockStoredLog)
      
      const logs = await storageService.getActivityLogs(10)
      
      expect(logs).toHaveLength(1)
      // Timestamp should be an ISO string, not a Date object
      expect(typeof logs[0].timestamp).toBe('string')
    })

    it('should handle IndexedDB errors gracefully', async () => {
      // Force the mock to throw an error
      mockDb.activity_logs.orderBy.mockImplementation(() => {
        throw new Error('IndexedDB error')
      })
      
      const logs = await storageService.getActivityLogs()
      
      expect(logs).toEqual([])
    })
  })

  describe('saveUserPreferences', () => {
    it('should save user preferences to IndexedDB', async () => {
      await storageService.saveUserPreferences(mockUserPreferences)
      
      expect(mockDb.user_preferences.put).toHaveBeenCalledWith({
        ...mockUserPreferences,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 1
      })
    })
  })

  describe('getUserPreferences', () => {
    it('should retrieve user preferences from IndexedDB', async () => {
      // First save preferences to our mock storage
      await storageService.saveUserPreferences(mockUserPreferences)
      
      const preferences = await storageService.getUserPreferences()
      
      expect(preferences).toMatchObject({
        sound_enabled: mockUserPreferences.sound_enabled,
        vibration_enabled: mockUserPreferences.vibration_enabled,
        default_interval_duration: mockUserPreferences.default_interval_duration,
        dark_mode: mockUserPreferences.dark_mode,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      })
    })

    it('should return null when no preferences exist', async () => {
      const preferences = await storageService.getUserPreferences()
      
      expect(preferences).toBeNull()
    })
  })

  describe('saveAppSettings', () => {
    it('should save app settings to IndexedDB', async () => {
      await storageService.saveAppSettings(mockAppSettings)
      
      expect(mockDb.app_settings.put).toHaveBeenCalledWith({
        ...mockAppSettings,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 1
      })
    })
  })

  describe('getAppSettings', () => {
    it('should retrieve app settings from IndexedDB', async () => {
      // First save settings to our mock storage
      await storageService.saveAppSettings(mockAppSettings)
      
      const settings = await storageService.getAppSettings()
      
      expect(settings).toMatchObject({
        interval_duration: mockAppSettings.interval_duration,
        sound_enabled: mockAppSettings.sound_enabled,
        vibration_enabled: mockAppSettings.vibration_enabled,
        beep_volume: mockAppSettings.beep_volume,
        dark_mode: mockAppSettings.dark_mode,
        auto_save: mockAppSettings.auto_save,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String)
      })
    })

    it('should return null when no settings exist', async () => {
      const settings = await storageService.getAppSettings()
      
      expect(settings).toBeNull()
    })
  })

  describe('exportAllData', () => {
    it('should export all user data', async () => {
      const mockStoredExercise = {
        ...mockExercise,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredPreferences = {
        ...mockUserPreferences,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredSettings = {
        ...mockAppSettings,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      // Add data to the mock storage arrays
      exerciseStorage.set(mockStoredExercise.id, mockStoredExercise)
      activityLogStorage.push(mockStoredLog)
      userPreferencesStorage.push(mockStoredPreferences)
      appSettingsStorage.push(mockStoredSettings)
      
      // Mock getMigrationStatus
      mockDb.getMigrationStatus = vi.fn().mockReturnValue({ 
        currentVersion: 6, 
        isV6Schema: true, 
        tableStats: { exercises: 1, activity_logs: 1, user_preferences: 1, app_settings: 1 } 
      })
      
      const exportData = await storageService.exportAllData()
      
      expect(exportData).toMatchObject({
        metadata: {
          exportTimestamp: expect.any(String),
          databaseVersion: expect.any(Number),
          isV6Schema: expect.any(Boolean),
          tableStats: expect.any(Object)
        },
        exercises: [expect.objectContaining({ id: mockExercise.id })],
        activity_logs: [expect.objectContaining({ id: mockActivityLog.id })],
        user_preferences: [expect.objectContaining({
          sound_enabled: mockUserPreferences.sound_enabled,
          vibration_enabled: mockUserPreferences.vibration_enabled,
          default_interval_duration: mockUserPreferences.default_interval_duration,
          dark_mode: mockUserPreferences.dark_mode,
          version: 1
        })],
        app_settings: [expect.objectContaining({
          interval_duration: mockAppSettings.interval_duration,
          sound_enabled: mockAppSettings.sound_enabled,
          vibration_enabled: mockAppSettings.vibration_enabled,
          beep_volume: mockAppSettings.beep_volume,
          dark_mode: mockAppSettings.dark_mode,
          auto_save: mockAppSettings.auto_save,
          version: 1
        })],
        workouts: expect.any(Array),
        workout_sessions: expect.any(Array)
      })
    })
  })

  describe('clearAllData', () => {
    it('should clear all tables', async () => {
      await storageService.clearAllData()
      
      expect(mockDb.exercises.clear).toHaveBeenCalled()
      expect(mockDb.activity_logs.clear).toHaveBeenCalled()
      expect(mockDb.user_preferences.clear).toHaveBeenCalled()
      expect(mockDb.app_settings.clear).toHaveBeenCalled()
      expect(mockDb.workouts.clear).toHaveBeenCalled()
      expect(mockDb.workout_sessions.clear).toHaveBeenCalled()
    })
  })

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockStoredExercise = {
        ...mockExercise,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredPreferences = {
        ...mockUserPreferences,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      const mockStoredSettings = {
        ...mockAppSettings,
        deleted: false,
        dirty: false,
        op: 'upsert',
        owner_id: null,
        version: 1,
        updated_at: new Date().toISOString()
      }
      
      // Add data to the mock storage arrays
      exerciseStorage.set(mockStoredExercise.id, mockStoredExercise)
      activityLogStorage.push(mockStoredLog)
      userPreferencesStorage.push(mockStoredPreferences)
      appSettingsStorage.push(mockStoredSettings)
      
      const stats = await storageService.getStorageStats()
      
      expect(stats).toEqual({
        exerciseCount: 1,
        logCount: 1,
        hasPreferences: true,
        hasSettings: true
      })
    })
  })

  describe('close', () => {
    it('should close database connection', async () => {
      await storageService.close()
      
      expect(mockDb.close).toHaveBeenCalled()
    })
  })
}) 