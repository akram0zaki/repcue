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
    count: vi.fn().mockResolvedValue(0),
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
      delete: vi.fn().mockResolvedValue(undefined),
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
      count: vi.fn().mockResolvedValue(0),
      clear: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      bulkUpdate: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      }))
    }
    mockDb.workout_sessions = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      clear: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      bulkUpdate: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          filter: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          })),
          toArray: vi.fn().mockResolvedValue([])
        }))
      }))
    }
    
    // Add other required tables for health check
    mockDb.exercises = {
      count: vi.fn().mockResolvedValue(0)
    }
    mockDb.user_preferences = {
      count: vi.fn().mockResolvedValue(0)
    }
    mockDb.app_settings = {
      count: vi.fn().mockResolvedValue(0)
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
          exercise_id: 'push-ups',
          order: 1,
          custom_sets: 3,
          custom_reps: 15,
          custom_rest_time: 60
        } as WorkoutExercise
      ],
      estimated_duration: 1800,
      scheduled_days: ['monday', 'wednesday', 'friday'],
      is_active: true,
      created_at: new Date('2023-01-01T10:00:00Z').toISOString(),
      // Sync metadata
      owner_id: null,
      updated_at: '2023-01-01T10:00:00.000Z',
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
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: expect.any(String),
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 2 // Version increments from 1 to 2
      })
    })

    it('should get all workouts', async () => {
      const storedWorkout = {
        ...mockWorkout,
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: '2023-01-01T10:00:00.000Z'
      }
      mockDb.workouts.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([storedWorkout])
        })
      })

      const workouts = await storageService.getWorkouts()

      expect(workouts).toHaveLength(1)
      // The service returns snake_case fields with ISO strings
      expect(workouts[0]).toEqual({
        ...mockWorkout,
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: '2023-01-01T10:00:00.000Z'
      })
    })

    it('should get workout by ID', async () => {
      const storedWorkout = {
        ...mockWorkout,
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: '2023-01-01T10:00:00.000Z'
      }
      mockDb.workouts.get.mockResolvedValue(storedWorkout)

      const workout = await storageService.getWorkout('workout-1')

      // The service returns snake_case fields with ISO strings
      expect(workout).toEqual({
        ...mockWorkout,
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: '2023-01-01T10:00:00.000Z'
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
        updated_at: expect.any(String)
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
      workout_id: 'workout-1',
      workout_name: 'Upper Body Workout',
      start_time: new Date('2023-01-01T10:00:00Z').toISOString(),
      end_time: new Date('2023-01-01T10:30:00Z').toISOString(),
      exercises: [],
      is_completed: true,
      completion_percentage: 100,
      total_duration: 1800,
      // Sync metadata
      created_at: new Date('2023-01-01T10:00:00Z').toISOString(),
      owner_id: null,
      updated_at: '2023-01-01T10:00:00.000Z',
      deleted: false,
      version: 1,
      dirty: 0,
      op: 'upsert'
    }

    it('should save workout session successfully', async () => {
      mockDb.workout_sessions.put.mockResolvedValue(undefined)

      await storageService.saveWorkoutSession(mockWorkoutSession)

      expect(mockDb.workout_sessions.put).toHaveBeenCalledWith({
        ...mockWorkoutSession,
        start_time: '2023-01-01T10:00:00.000Z',
        end_time: '2023-01-01T10:30:00.000Z',
        deleted: false,
        dirty: 1,
        op: 'upsert',
        owner_id: null,
        version: 2, // Version increments from 1 to 2
        updated_at: expect.any(String)
      })
    })

    it('should get workout sessions with filtering', async () => {
      const storedSession = {
        ...mockWorkoutSession,
        start_time: '2023-01-01T10:00:00.000Z',
        end_time: '2023-01-01T10:30:00.000Z'
      }
      
      // Create a simple mock that returns the expected result
      const mockQuery = {
        filter: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([storedSession])
      }
      
      // Provide chainable orderBy/reverse/filter/limit/toArray on snake_case table
      mockDb.workout_sessions.orderBy = vi.fn(() => ({
        reverse: vi.fn(() => ({
          filter: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([storedSession])
            })),
            toArray: vi.fn().mockResolvedValue([storedSession])
          })),
          toArray: vi.fn().mockResolvedValue([storedSession])
        }))
      }))

      const sessions = await storageService.getWorkoutSessions(10, 'workout-1')

      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(mockWorkoutSession)
      // Ensure orderBy was called and chain worked
      expect(mockDb.workout_sessions.orderBy).toHaveBeenCalledWith('start_time')
    })

    it('should delete workout session successfully', async () => {
  mockDb.workout_sessions.delete.mockResolvedValue(undefined)

      // Mock getting the session first (for soft delete)
  mockDb.workout_sessions.get.mockResolvedValue({
        id: 'session-1',
        workout_id: 'workout-1',
        deleted: false,
        version: 1
      })

      await storageService.deleteWorkoutSession('session-1')

  expect(mockDb.workout_sessions.put).toHaveBeenCalledWith({
        id: 'session-1',
        workout_id: 'workout-1',
        deleted: true,
        dirty: 1,
        op: 'delete',
        version: 2,
        updated_at: expect.any(String)
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
        scheduled_days: [],
        is_active: true,
        created_at: new Date().toISOString(),
        // Sync metadata
        owner_id: null,
        updated_at: new Date().toISOString(),
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
