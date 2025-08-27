import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService } from '../storageService'
import { consentService } from '../consentService'
import type { Workout, WorkoutSession, WorkoutExercise } from '../../types'
import { ExerciseType, Weekday } from '../../types'

// Mock Dexie
vi.mock('dexie', () => {
  const MockTable = vi.fn(() => ({
    put: vi.fn(),
    add: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    toArray: vi.fn().mockResolvedValue([]),
    filter: vi.fn(() => ({
      first: vi.fn().mockResolvedValue(null),
      toArray: vi.fn().mockResolvedValue([])
    })),
    orderBy: vi.fn(() => ({
      reverse: vi.fn(() => ({
        filter: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([])
        })),
        toArray: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([])
      })),
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

describe('StorageService - Workout Management', () => {
  let storageService: StorageService
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Ensure consent is granted by default for most tests
    vi.mocked(consentService.hasConsent).mockReturnValue(true)
    
    // Create a fresh instance by clearing the singleton
    ;(StorageService as any).instance = undefined
    storageService = StorageService.getInstance()
    
    // Get reference to the mocked database and ensure all tables exist
    mockDb = (storageService as any).db
    mockDb.workouts = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      }))
    }
    mockDb.workoutSessions = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          filter: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }))
    }
    
    // Mock consent service to return true by default
    vi.mocked(consentService.hasConsent).mockReturnValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Workout Operations', () => {
    const mockWorkout: Workout = {
      id: 'workout-1',
      name: 'Upper Body Workout',
      description: 'Focus on chest, shoulders, and arms',
      exercises: [
        {
          id: 'exercise-1',
          exerciseId: 'push-ups',
          order: 1,
          customSets: 3,
          customReps: 15,
          customRestTime: 60
        } as WorkoutExercise
      ],
      estimatedDuration: 1800,
      scheduledDays: ['monday', 'wednesday', 'friday'],
      isActive: true,
      createdAt: new Date('2023-01-01T10:00:00Z'),
      // Sync metadata
      ownerId: null,
      updatedAt: '2023-01-01T10:00:00.000Z',
      deleted: false,
      version: 1,
      dirty: 0,
      op: 'upsert'
    }

    it('should save workout successfully', async () => {
      mockDb.workouts.put.mockResolvedValue(undefined)

      await storageService.saveWorkout(mockWorkout)

      expect(mockDb.workouts.put).toHaveBeenCalledWith({
        ...mockWorkout,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        ownerId: null,
        version: 2 // Version increments from 1 to 2
      })
    })

    it('should get all workouts', async () => {
      const storedWorkout = {
        ...mockWorkout,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      }
      mockDb.workouts.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([storedWorkout])
        })
      })

      const workouts = await storageService.getWorkouts()

      expect(workouts).toHaveLength(1)
      // The service converts ISO strings back to Date objects
      expect(workouts[0]).toEqual({
        ...mockWorkout,
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        updatedAt: '2023-01-01T10:00:00.000Z'
      })
    })

    it('should get workout by ID', async () => {
      const storedWorkout = {
        ...mockWorkout,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      }
      mockDb.workouts.get.mockResolvedValue(storedWorkout)

      const workout = await storageService.getWorkout('workout-1')

      // The service converts ISO strings back to Date objects
      expect(workout).toEqual({
        ...mockWorkout,
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        updatedAt: '2023-01-01T10:00:00.000Z'
      })
      expect(mockDb.workouts.get).toHaveBeenCalledWith('workout-1')
    })

    it('should return null for non-existent workout', async () => {
      mockDb.workouts.get.mockResolvedValue(undefined)

      const workout = await storageService.getWorkout('non-existent')

      expect(workout).toBeNull()
    })

    it('should delete workout successfully', async () => {
      mockDb.workouts.delete.mockResolvedValue(undefined)

      // Mock getting the workout first (for soft delete)
      mockDb.workouts.get.mockResolvedValue({
        id: 'workout-1',
        name: 'Test Workout',
        deleted: false,
        version: 1
      })

      await storageService.deleteWorkout('workout-1')

      expect(mockDb.workouts.put).toHaveBeenCalledWith({
        id: 'workout-1',
        name: 'Test Workout',
        deleted: true,
        dirty: 1,
        op: 'delete',
        version: 2,
        updatedAt: expect.any(String)
      })
    })

    it('should handle database errors for workout operations', async () => {
      mockDb.workouts.put.mockRejectedValue(new Error('Database error'))

      await storageService.saveWorkout(mockWorkout)

      // Should not throw error but handle gracefully
      expect(mockDb.workouts.put).toHaveBeenCalled()
    })
  })

  describe('Workout Session Operations', () => {
    const mockWorkoutSession: WorkoutSession = {
      id: 'session-1',
      workoutId: 'workout-1',
      workoutName: 'Upper Body Workout',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:30:00Z'),
      exercises: [],
      isCompleted: true,
      completionPercentage: 100,
      totalDuration: 1800,
      // Sync metadata
      ownerId: null,
      updatedAt: '2023-01-01T10:00:00.000Z',
      deleted: false,
      version: 1,
      dirty: 0,
      op: 'upsert'
    }

    it('should save workout session successfully', async () => {
      mockDb.workoutSessions.put.mockResolvedValue(undefined)

      await storageService.saveWorkoutSession(mockWorkoutSession)

      expect(mockDb.workoutSessions.put).toHaveBeenCalledWith({
        ...mockWorkoutSession,
        startTime: '2023-01-01T10:00:00.000Z',
        endTime: '2023-01-01T10:30:00.000Z',
        deleted: false,
        dirty: 1,
        op: 'upsert',
        ownerId: null,
        version: 2, // Version increments from 1 to 2
        updatedAt: expect.any(String)
      })
    })

    it('should get workout sessions with filtering', async () => {
      const storedSession = {
        ...mockWorkoutSession,
        startTime: '2023-01-01T10:00:00.000Z',
        endTime: '2023-01-01T10:30:00.000Z'
      }
      
      // Create a simple mock that returns the expected result
      const mockQuery = {
        filter: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([storedSession])
      }
      
      mockDb.workoutSessions.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue(mockQuery)
      })

      const sessions = await storageService.getWorkoutSessions(10, 'workout-1')

      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(mockWorkoutSession)
      expect(mockQuery.filter).toHaveBeenCalledTimes(1) // workoutId filter
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
    })

    it('should delete workout session successfully', async () => {
      mockDb.workoutSessions.delete.mockResolvedValue(undefined)

      // Mock getting the session first (for soft delete)
      mockDb.workoutSessions.get.mockResolvedValue({
        id: 'session-1',
        workoutId: 'workout-1',
        deleted: false,
        version: 1
      })

      await storageService.deleteWorkoutSession('session-1')

      expect(mockDb.workoutSessions.put).toHaveBeenCalledWith({
        id: 'session-1',
        workoutId: 'workout-1',
        deleted: true,
        dirty: 1,
        op: 'delete',
        version: 2,
        updatedAt: expect.any(String)
      })
    })
  })

  describe('Consent Handling', () => {
    it('should throw error when saving without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)

      const mockWorkout: Workout = {
        id: 'workout-1',
        name: 'Test Workout',
        exercises: [],
        scheduledDays: [],
        isActive: true,
        createdAt: new Date(),
        // Sync metadata
        ownerId: null,
        updatedAt: new Date().toISOString(),
        deleted: false,
        version: 1,
        dirty: 0,
        op: 'upsert'
      }

      await expect(storageService.saveWorkout(mockWorkout)).rejects.toThrow(
        'Cannot store data without user consent'
      )
    })

    it('should return empty array when getting data without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)

      const workouts = await storageService.getWorkouts()
      const sessions = await storageService.getWorkoutSessions()

      expect(workouts).toEqual([])
      expect(sessions).toEqual([])
    })
  })
})
