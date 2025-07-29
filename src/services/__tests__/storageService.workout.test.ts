import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService } from '../storageService'
import { consentService } from '../consentService'
import type { Workout, Schedule, WorkoutSession, WorkoutExercise, ScheduleEntry } from '../../types'
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
        stores: vi.fn()
      })),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      exercises: new MockTable(),
      activityLogs: new MockTable(),
      userPreferences: new MockTable(),
      appSettings: new MockTable(),
      workouts: new MockTable(),
      schedules: new MockTable(),
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
    mockDb.schedules = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      filter: vi.fn(() => ({
        first: vi.fn().mockResolvedValue(null)
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
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    }

    it('should save workout successfully', async () => {
      mockDb.workouts.put.mockResolvedValue(undefined)

      await storageService.saveWorkout(mockWorkout)

      expect(mockDb.workouts.put).toHaveBeenCalledWith({
        ...mockWorkout,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
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
      expect(workouts[0]).toEqual(mockWorkout)
    })

    it('should get workout by ID', async () => {
      const storedWorkout = {
        ...mockWorkout,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      }
      mockDb.workouts.get.mockResolvedValue(storedWorkout)

      const workout = await storageService.getWorkout('workout-1')

      expect(workout).toEqual(mockWorkout)
      expect(mockDb.workouts.get).toHaveBeenCalledWith('workout-1')
    })

    it('should return null for non-existent workout', async () => {
      mockDb.workouts.get.mockResolvedValue(undefined)

      const workout = await storageService.getWorkout('non-existent')

      expect(workout).toBeNull()
    })

    it('should delete workout successfully', async () => {
      mockDb.workouts.delete.mockResolvedValue(undefined)

      await storageService.deleteWorkout('workout-1')

      expect(mockDb.workouts.delete).toHaveBeenCalledWith('workout-1')
    })

    it('should handle database errors for workout operations', async () => {
      mockDb.workouts.put.mockRejectedValue(new Error('Database error'))

      await storageService.saveWorkout(mockWorkout)

      // Should not throw error but handle gracefully
      expect(mockDb.workouts.put).toHaveBeenCalled()
    })
  })

  describe('Schedule Operations', () => {
    const mockSchedule: Schedule = {
      id: 'schedule-1',
      name: 'Weekly Routine',
      entries: [
        {
          id: 'entry-1',
          weekday: Weekday.MONDAY,
          workoutId: 'workout-1',
          isActive: true
        } as ScheduleEntry
      ],
      isActive: true,
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    }

    it('should save schedule successfully', async () => {
      mockDb.schedules.put.mockResolvedValue(undefined)

      await storageService.saveSchedule(mockSchedule)

      expect(mockDb.schedules.put).toHaveBeenCalledWith({
        ...mockSchedule,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      })
    })

    it('should get all schedules', async () => {
      const storedSchedule = {
        ...mockSchedule,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      }
      mockDb.schedules.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([storedSchedule])
        })
      })

      const schedules = await storageService.getSchedules()

      expect(schedules).toHaveLength(1)
      expect(schedules[0]).toEqual(mockSchedule)
    })

    it('should get active schedule', async () => {
      const storedSchedule = {
        ...mockSchedule,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z'
      }
      mockDb.schedules.filter.mockReturnValue({
        first: vi.fn().mockResolvedValue(storedSchedule)
      })

      const activeSchedule = await storageService.getActiveSchedule()

      expect(activeSchedule).toEqual(mockSchedule)
    })

    it('should return null when no active schedule exists', async () => {
      mockDb.schedules.filter.mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      })

      const activeSchedule = await storageService.getActiveSchedule()

      expect(activeSchedule).toBeNull()
    })

    it('should delete schedule successfully', async () => {
      mockDb.schedules.delete.mockResolvedValue(undefined)

      await storageService.deleteSchedule('schedule-1')

      expect(mockDb.schedules.delete).toHaveBeenCalledWith('schedule-1')
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
      totalDuration: 1800
    }

    it('should save workout session successfully', async () => {
      mockDb.workoutSessions.put.mockResolvedValue(undefined)

      await storageService.saveWorkoutSession(mockWorkoutSession)

      expect(mockDb.workoutSessions.put).toHaveBeenCalledWith({
        ...mockWorkoutSession,
        startTime: '2023-01-01T10:00:00.000Z',
        endTime: '2023-01-01T10:30:00.000Z'
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

      await storageService.deleteWorkoutSession('session-1')

      expect(mockDb.workoutSessions.delete).toHaveBeenCalledWith('session-1')
    })
  })

  describe('Consent Handling', () => {
    it('should throw error when saving without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)

      const mockWorkout: Workout = {
        id: 'workout-1',
        name: 'Test Workout',
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await expect(storageService.saveWorkout(mockWorkout)).rejects.toThrow(
        'Cannot store data without user consent'
      )
    })

    it('should return empty array when getting data without consent', async () => {
      vi.mocked(consentService.hasConsent).mockReturnValue(false)

      const workouts = await storageService.getWorkouts()
      const schedules = await storageService.getSchedules()
      const sessions = await storageService.getWorkoutSessions()

      expect(workouts).toEqual([])
      expect(schedules).toEqual([])
      expect(sessions).toEqual([])
    })
  })
})
