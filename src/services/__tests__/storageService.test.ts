import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService } from '../storageService'
import { consentService } from '../consentService'
import type { Exercise, ActivityLog, UserPreferences, AppSettings } from '../../types'

// Mock Dexie
vi.mock('dexie', () => {
  const MockTable = vi.fn(() => ({
    put: vi.fn(),
    add: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    toArray: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn(() => ({
      reverse: vi.fn(() => ({
        filter: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([])
        })),
        limit: vi.fn().mockResolvedValue([])
      }))
    })),
    clear: vi.fn()
  }))

  return {
    default: vi.fn(() => ({
      version: vi.fn(() => ({
        stores: vi.fn()
      })),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      exercises: new MockTable(),
      activityLogs: new MockTable(),
      userPreferences: new MockTable(),
      appSettings: new MockTable()
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

  const mockExercise: Exercise = {
    id: 'test-exercise-1',
    name: 'Push-ups',
    category: 'strength',
    description: 'Basic push-up exercise',
    defaultDuration: 30,
    isFavorite: false,
    tags: ['bodyweight', 'upper-body']
  }

  const mockActivityLog: ActivityLog = {
    id: 'log-1',
    exerciseId: 'test-exercise-1',
    exerciseName: 'Push-ups',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    duration: 30,
    notes: 'Good workout'
  }

  const mockUserPreferences: UserPreferences = {
    soundEnabled: true,
    vibrationEnabled: true,
    defaultIntervalDuration: 30,
    darkMode: false,
    favoriteExercises: ['test-exercise-1']
  }

  const mockAppSettings: AppSettings = {
    intervalDuration: 30,
    soundEnabled: true,
    vibrationEnabled: true,
    beepVolume: 0.5,
    darkMode: false,
    autoSave: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock consent as granted by default
    vi.mocked(consentService.hasConsent).mockReturnValue(true)
    
    // Create a fresh StorageService instance by clearing singleton
    // @ts-ignore - accessing private static property for testing
    StorageService.instance = undefined
    
    storageService = StorageService.getInstance()
    
    // Get reference to the mocked database and override it
    // @ts-ignore - accessing private property for testing
    mockDb = storageService.db = {
      exercises: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0)
      } as any,
      activityLogs: {
        add: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(() => ({
          reverse: vi.fn(() => ({
            filter: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
              toArray: vi.fn().mockResolvedValue([])
            })),
            limit: vi.fn().mockResolvedValue([]),
            toArray: vi.fn().mockResolvedValue([])
          })),
          toArray: vi.fn().mockResolvedValue([])
        })),
        clear: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0)
      } as any,
      userPreferences: {
        put: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(undefined)
          }))
        })),
        clear: vi.fn().mockResolvedValue(undefined)
      } as any,
      appSettings: {
        put: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(undefined)
          }))
        })),
        clear: vi.fn().mockResolvedValue(undefined)
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
        updatedAt: expect.any(String)
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
      expect(exercises[0]).toMatchObject(mockExercise)
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
      
      expect(mockDb.exercises.update).toHaveBeenCalledWith(mockExercise.id, {
        isFavorite: true,
        updatedAt: expect.any(String)
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
      
      expect(mockDb.activityLogs.add).toHaveBeenCalledWith({
        ...mockActivityLog,
        timestamp: mockActivityLog.timestamp.toISOString()
      })
    })

    it('should use fallback storage when IndexedDB fails', async () => {
      mockDb.activityLogs.add.mockRejectedValue(new Error('IndexedDB error'))
      
      await storageService.saveActivityLog(mockActivityLog)
      
      // Should not throw, fallback should handle it
      expect(mockDb.activityLogs.add).toHaveBeenCalled()
    })
  })

  describe('getActivityLogs', () => {
    it('should retrieve activity logs from IndexedDB', async () => {
      const storedLogs = [{
        ...mockActivityLog,
        timestamp: mockActivityLog.timestamp.toISOString()
      }]
      
      mockDb.activityLogs.orderBy().reverse().limit.mockResolvedValue(storedLogs)
      
      const logs = await storageService.getActivityLogs(10)
      
      expect(logs).toHaveLength(1)
      expect(logs[0].timestamp).toBeInstanceOf(Date)
    })

    it('should handle IndexedDB errors gracefully', async () => {
      mockDb.activityLogs.orderBy().reverse().limit.mockRejectedValue(new Error('IndexedDB error'))
      
      const logs = await storageService.getActivityLogs()
      
      expect(logs).toEqual([])
    })
  })

  describe('saveUserPreferences', () => {
    it('should save user preferences to IndexedDB', async () => {
      await storageService.saveUserPreferences(mockUserPreferences)
      
      expect(mockDb.userPreferences.put).toHaveBeenCalledWith({
        ...mockUserPreferences,
        id: 1,
        updatedAt: expect.any(String)
      })
    })
  })

  describe('getUserPreferences', () => {
    it('should retrieve user preferences from IndexedDB', async () => {
      const storedPreferences = {
        ...mockUserPreferences,
        id: 1,
        updatedAt: '2024-01-01T12:00:00Z'
      }
      mockDb.userPreferences.toArray.mockResolvedValue([storedPreferences])
      
      const preferences = await storageService.getUserPreferences()
      
      expect(preferences).toMatchObject(mockUserPreferences)
    })

    it('should return null when no preferences exist', async () => {
      mockDb.userPreferences.toArray.mockResolvedValue([])
      
      const preferences = await storageService.getUserPreferences()
      
      expect(preferences).toBeNull()
    })
  })

  describe('saveAppSettings', () => {
    it('should save app settings to IndexedDB', async () => {
      await storageService.saveAppSettings(mockAppSettings)
      
      expect(mockDb.appSettings.put).toHaveBeenCalledWith({
        ...mockAppSettings,
        id: 1,
        updatedAt: expect.any(String)
      })
    })
  })

  describe('getAppSettings', () => {
    it('should retrieve app settings from IndexedDB', async () => {
      const storedSettings = {
        ...mockAppSettings,
        id: 1,
        updatedAt: '2024-01-01T12:00:00Z'
      }
      mockDb.appSettings.toArray.mockResolvedValue([storedSettings])
      
      const settings = await storageService.getAppSettings()
      
      expect(settings).toMatchObject(mockAppSettings)
    })

    it('should return null when no settings exist', async () => {
      mockDb.appSettings.toArray.mockResolvedValue([])
      
      const settings = await storageService.getAppSettings()
      
      expect(settings).toBeNull()
    })
  })

  describe('exportAllData', () => {
    it('should export all user data', async () => {
      // Mock data in all tables
      mockDb.exercises.toArray.mockResolvedValue([{
        ...mockExercise,
        updatedAt: '2024-01-01T12:00:00Z'
      }])
      mockDb.activityLogs.toArray.mockResolvedValue([{
        ...mockActivityLog,
        timestamp: mockActivityLog.timestamp.toISOString()
      }])
      mockDb.userPreferences.toArray.mockResolvedValue([{
        ...mockUserPreferences,
        id: 1,
        updatedAt: '2024-01-01T12:00:00Z'
      }])
      mockDb.appSettings.toArray.mockResolvedValue([{
        ...mockAppSettings,
        id: 1,
        updatedAt: '2024-01-01T12:00:00Z'
      }])
      
      const exportData = await storageService.exportAllData()
      
      expect(exportData).toMatchObject({
        exercises: [mockExercise],
        activityLogs: [expect.objectContaining({ id: mockActivityLog.id })],
        userPreferences: mockUserPreferences,
        appSettings: mockAppSettings,
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
      mockDb.exercises.toArray.mockResolvedValue([mockExercise])
      mockDb.activityLogs.toArray.mockResolvedValue([mockActivityLog])
      mockDb.userPreferences.toArray.mockResolvedValue([mockUserPreferences])
      mockDb.appSettings.toArray.mockResolvedValue([mockAppSettings])
      
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