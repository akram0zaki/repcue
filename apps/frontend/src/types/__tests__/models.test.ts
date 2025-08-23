import { describe, it, expect } from 'vitest'
import { 
  ExerciseType, 
  ExerciseCategory, 
  Weekday,
  type Exercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSessionExercise
} from '../../types'

describe('Types and Models', () => {
  describe('ExerciseType', () => {
    it('should have correct exercise types', () => {
      expect(ExerciseType.TIME_BASED).toBe('time-based')
      expect(ExerciseType.REPETITION_BASED).toBe('repetition-based')
    })

    it('should be a valid const assertion', () => {
      const types = Object.values(ExerciseType)
      expect(types).toContain('time-based')
      expect(types).toContain('repetition-based')
      expect(types).toHaveLength(2)
    })
  })

  describe('Exercise Model', () => {
    it('should create a valid time-based exercise', () => {
      const exercise: Exercise = {
        id: 'plank',
        name: 'Plank',
        description: 'Hold plank position',
        category: ExerciseCategory.CORE,
        exerciseType: ExerciseType.TIME_BASED,
        defaultDuration: 60,
        isFavorite: false,
        tags: ['core', 'isometric']
      }

      expect(exercise.exerciseType).toBe('time-based')
      expect(exercise.defaultDuration).toBe(60)
      expect(exercise.defaultSets).toBeUndefined()
      expect(exercise.defaultReps).toBeUndefined()
    })

    it('should create a valid repetition-based exercise', () => {
      const exercise: Exercise = {
        id: 'push-ups',
        name: 'Push-ups',
        description: 'Standard push-ups',
        category: ExerciseCategory.STRENGTH,
        exerciseType: ExerciseType.REPETITION_BASED,
        defaultSets: 3,
        defaultReps: 12,
        isFavorite: false,
        tags: ['chest', 'arms']
      }

      expect(exercise.exerciseType).toBe('repetition-based')
      expect(exercise.defaultSets).toBe(3)
      expect(exercise.defaultReps).toBe(12)
      expect(exercise.defaultDuration).toBeUndefined()
    })
  })

  describe('Weekday', () => {
    it('should have all weekdays', () => {
      expect(Weekday.MONDAY).toBe('monday')
      expect(Weekday.TUESDAY).toBe('tuesday')
      expect(Weekday.WEDNESDAY).toBe('wednesday')
      expect(Weekday.THURSDAY).toBe('thursday')
      expect(Weekday.FRIDAY).toBe('friday')
      expect(Weekday.SATURDAY).toBe('saturday')
      expect(Weekday.SUNDAY).toBe('sunday')
    })

    it('should have correct number of weekdays', () => {
      const weekdays = Object.values(Weekday)
      expect(weekdays).toHaveLength(7)
    })
  })

  describe('WorkoutExercise Model', () => {
    it('should create a valid workout exercise for time-based exercise', () => {
      const workoutExercise: WorkoutExercise = {
        id: 'we-1',
        exerciseId: 'plank',
        order: 1,
        customDuration: 90,
        customRestTime: 30
      }

      expect(workoutExercise.customDuration).toBe(90)
      expect(workoutExercise.customRestTime).toBe(30)
      expect(workoutExercise.customSets).toBeUndefined()
      expect(workoutExercise.customReps).toBeUndefined()
    })

    it('should create a valid workout exercise for repetition-based exercise', () => {
      const workoutExercise: WorkoutExercise = {
        id: 'we-2',
        exerciseId: 'push-ups',
        order: 2,
        customSets: 4,
        customReps: 15,
        customRestTime: 60
      }

      expect(workoutExercise.customSets).toBe(4)
      expect(workoutExercise.customReps).toBe(15)
      expect(workoutExercise.customRestTime).toBe(60)
      expect(workoutExercise.customDuration).toBeUndefined()
    })
  })

  describe('Workout Model', () => {
    it('should create a valid workout', () => {
      const now = new Date()
      const workout: Workout = {
        id: 'workout-1',
        name: 'Morning Routine',
        description: 'Quick morning workout',
        exercises: [
          {
            id: 'we-1',
            exerciseId: 'plank',
            order: 1,
            customDuration: 60
          },
          {
            id: 'we-2',
            exerciseId: 'push-ups',
            order: 2,
            customSets: 3,
            customReps: 12
          }
        ],
        estimatedDuration: 600,
        scheduledDays: ['monday', 'wednesday', 'friday'],
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      expect(workout.exercises).toHaveLength(2)
      expect(workout.exercises[0].order).toBe(1)
      expect(workout.exercises[1].order).toBe(2)
      expect(workout.estimatedDuration).toBe(600)
      expect(workout.scheduledDays).toEqual(['monday', 'wednesday', 'friday'])
      expect(workout.isActive).toBe(true)
    })
  })

  describe('WorkoutSessionExercise Model', () => {
    it('should create a valid workout session exercise', () => {
      const now = new Date()
      const sessionExercise: WorkoutSessionExercise = {
        id: 'se-1',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        order: 1,
        actualDuration: 75,
        restTime: 30,
        isCompleted: true,
        startTime: now,
        endTime: new Date(now.getTime() + 75000)
      }

      expect(sessionExercise.actualDuration).toBe(75)
      expect(sessionExercise.isCompleted).toBe(true)
      expect(sessionExercise.restTime).toBe(30)
    })
  })

  describe('WorkoutSession Model', () => {
    it('should create a valid workout session', () => {
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 1800000) // 30 minutes later
      
      const session: WorkoutSession = {
        id: 'session-1',
        workoutId: 'workout-1',
        workoutName: 'Morning Routine',
        startTime,
        endTime,
        exercises: [
          {
            id: 'se-1',
            exerciseId: 'plank',
            exerciseName: 'Plank',
            order: 1,
            actualDuration: 75,
            isCompleted: true
          }
        ],
        isCompleted: true,
        completionPercentage: 100,
        totalDuration: 1800
      }

      expect(session.exercises).toHaveLength(1)
      expect(session.completionPercentage).toBe(100)
      expect(session.isCompleted).toBe(true)
      expect(session.totalDuration).toBe(1800)
    })

    it('should handle incomplete workout session', () => {
      const startTime = new Date()
      
      const session: WorkoutSession = {
        id: 'session-2',
        workoutId: 'workout-1',
        workoutName: 'Morning Routine',
        startTime,
        exercises: [
          {
            id: 'se-1',
            exerciseId: 'plank',
            exerciseName: 'Plank',
            order: 1,
            actualDuration: 30,
            isCompleted: true
          },
          {
            id: 'se-2',
            exerciseId: 'push-ups',
            exerciseName: 'Push-ups',
            order: 2,
            isCompleted: false
          }
        ],
        isCompleted: false,
        completionPercentage: 50
      }

      expect(session.endTime).toBeUndefined()
      expect(session.isCompleted).toBe(false)
      expect(session.completionPercentage).toBe(50)
      expect(session.totalDuration).toBeUndefined()
    })
  })

  describe('Type Safety', () => {
    it('should enforce exercise type constraints', () => {
      // This test ensures TypeScript compilation enforces correct types
      const timeBasedExercise: Exercise = {
        id: 'test',
        name: 'Test',
        description: 'Test exercise',
        category: ExerciseCategory.CORE,
        exerciseType: ExerciseType.TIME_BASED,
        defaultDuration: 60, // Valid for time-based
        isFavorite: false,
        tags: []
      }

      const repBasedExercise: Exercise = {
        id: 'test2',
        name: 'Test 2',
        description: 'Test exercise 2',
        category: ExerciseCategory.STRENGTH,
        exerciseType: ExerciseType.REPETITION_BASED,
        defaultSets: 3, // Valid for rep-based
        defaultReps: 12, // Valid for rep-based
        isFavorite: false,
        tags: []
      }

      expect(timeBasedExercise.exerciseType).toBe('time-based')
      expect(repBasedExercise.exerciseType).toBe('repetition-based')
    })

    it('should allow optional fields in workout exercises', () => {
      const minimalWorkoutExercise: WorkoutExercise = {
        id: 'we-minimal',
        exerciseId: 'some-exercise',
        order: 1
      }

      expect(minimalWorkoutExercise.customDuration).toBeUndefined()
      expect(minimalWorkoutExercise.customSets).toBeUndefined()
      expect(minimalWorkoutExercise.customReps).toBeUndefined()
      expect(minimalWorkoutExercise.customRestTime).toBeUndefined()
    })
  })
})
