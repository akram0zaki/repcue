import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService } from '../storageService'
import { consentService } from '../consentService'
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
      exercises: new MockTable(),
      activityLogs: new MockTable(),
      userPreferences: new MockTable(),
      appSettings: new MockTable(),
      workouts: new MockTable(),
      workoutSessions: new MockTable()
    }))
  }
})

// Mock consent service
vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn()
  }
}))

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
    exerciseType: ExerciseType.REPETITION_BASED,
    description: 'Basic push-up exercise',
    defaultDuration: 30,
    isFavorite: false,
    tags: ['bodyweight', 'upper-body']
  })

  const mockActivityLog: ActivityLog = createMockActivityLog({
    id: 'log-1',
    exerciseId: 'test-exercise-1',
    exerciseName: 'Push-ups',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    duration: 30,
    notes: 'Good workout'
  })

  const mockUserPreferences: UserPreferences = createMockUserPreferences({
    soundEnabled: true,
    vibrationEnabled: true,
    defaultIntervalDuration: 30,
    darkMode: false,
    favoriteExercises: ['test-exercise-1']
  })

  const mockAppSettings: AppSettings = createMockAppSettings({
    intervalDuration: 30,
    soundEnabled: true,
    vibrationEnabled: true,
    beepVolume: 0.5,
    darkMode: false,
    autoSave: true,
    preTimerCountdown: 3,
    defaultRestTime: 60,
    repSpeedFactor: 1.0
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
      activityLogs: {
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
      userPreferences: {
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
      appSettings: {
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
      workoutSessions: {
        toArray: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0)
      } as any,
      close: vi.fn().mockResolvedValue(undefined)
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
        updatedAt: expect.any(String),
        deleted: false,
        dirty: true,
        op: 'upsert',
        ownerId: null,
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
        isFavorite: false
      })
      
      await storageService.toggleExerciseFavorite(mockExercise.id)
      
      expect(mockDb.exercises.put).toHaveBeenCalledWith({
        ...mockExercise,
        isFavorite: true,
        updatedAt: expect.any(String),
        deleted: false,
        dirty: true,
        op: 'upsert',
        ownerId: null,
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
      
      expect(mockDb.activityLogs.put).toHaveBeenCalledWith({
        ...mockActivityLog,
        id: expect.any(String),
        timestamp: mockActivityLog.timestamp.toISOString(),
        deleted: false,
        dirty: true,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: expect.any(String)
      })
    })

    it('should use fallback storage when IndexedDB fails', async () => {
      mockDb.activityLogs.put.mockRejectedValue(new Error('IndexedDB error'))
      
      await storageService.saveActivityLog(mockActivityLog)
      
      // Should not throw, fallback should handle it
      expect(mockDb.activityLogs.put).toHaveBeenCalled()
    })
  })

  describe('getActivityLogs', () => {
    it('should retrieve activity logs from IndexedDB', async () => {
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp.toISOString(),
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      // Add the log to the mock storage
      activityLogStorage.push(mockStoredLog)
      
      const logs = await storageService.getActivityLogs(10)
      
      expect(logs).toHaveLength(1)
      expect(logs[0].timestamp).toBeInstanceOf(Date)
    })

    it('should handle IndexedDB errors gracefully', async () => {
      // Force the mock to throw an error
      mockDb.activityLogs.orderBy.mockImplementation(() => {
        throw new Error('IndexedDB error')
      })
      
      const logs = await storageService.getActivityLogs()
      
      expect(logs).toEqual([])
    })
  })

  describe('saveUserPreferences', () => {
    it('should save user preferences to IndexedDB', async () => {
      await storageService.saveUserPreferences(mockUserPreferences)
      
      expect(mockDb.userPreferences.clear).toHaveBeenCalled()
      expect(mockDb.userPreferences.add).toHaveBeenCalledWith({
        ...mockUserPreferences,
        updatedAt: expect.any(String)
      })
    })
  })

  describe('getUserPreferences', () => {
    it('should retrieve user preferences from IndexedDB', async () => {
      // First save preferences to our mock storage
      await storageService.saveUserPreferences(mockUserPreferences)
      
      const preferences = await storageService.getUserPreferences()
      
      expect(preferences).toMatchObject({
        ...mockUserPreferences,
        updatedAt: expect.any(String)
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
      
      expect(mockDb.appSettings.clear).toHaveBeenCalled()
      expect(mockDb.appSettings.add).toHaveBeenCalledWith({
        ...mockAppSettings,
        updatedAt: expect.any(String)
      })
    })
  })

  describe('getAppSettings', () => {
    it('should retrieve app settings from IndexedDB', async () => {
      // First save settings to our mock storage
      await storageService.saveAppSettings(mockAppSettings)
      
      const settings = await storageService.getAppSettings()
      
      expect(settings).toMatchObject({
        ...mockAppSettings,
        updatedAt: expect.any(String)
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
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp.toISOString(),
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredPreferences = {
        ...mockUserPreferences,
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredSettings = {
        ...mockAppSettings,
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      // Add data to the mock storage arrays
      exerciseStorage.set(mockStoredExercise.id, mockStoredExercise)
      activityLogStorage.push(mockStoredLog)
      userPreferencesStorage.push(mockStoredPreferences)
      appSettingsStorage.push(mockStoredSettings)
      
      const exportData = await storageService.exportAllData()
      
      expect(exportData).toMatchObject({
        exercises: [expect.objectContaining({ id: mockExercise.id })],
        activityLogs: [expect.objectContaining({ id: mockActivityLog.id })],
        userPreferences: expect.objectContaining({
          ...mockUserPreferences,
          deleted: false,
          dirty: false,
          version: 1,
          updatedAt: expect.any(String)
        }),
        appSettings: expect.objectContaining({
          ...mockAppSettings,
          deleted: false,
          dirty: false,
          version: 1,
          updatedAt: expect.any(String)
        }),
        exportDate: expect.any(String),
        version: expect.any(String)
      })
    })
  })

  describe('clearAllData', () => {
    it('should clear all tables', async () => {
      await storageService.clearAllData()
      
      expect(mockDb.exercises.clear).toHaveBeenCalled()
      expect(mockDb.activityLogs.clear).toHaveBeenCalled()
      expect(mockDb.userPreferences.clear).toHaveBeenCalled()
      expect(mockDb.appSettings.clear).toHaveBeenCalled()
    })
  })

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockStoredExercise = {
        ...mockExercise,
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredLog = {
        ...mockActivityLog,
        id: 'log-1',
        timestamp: mockActivityLog.timestamp.toISOString(),
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredPreferences = {
        ...mockUserPreferences,
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
      }
      
      const mockStoredSettings = {
        ...mockAppSettings,
        deleted: false,
        dirty: false,
        op: 'upsert',
        ownerId: null,
        version: 1,
        updatedAt: new Date().toISOString()
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