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
import { createMockExercise, createMockWorkout, createMockWorkoutSession } from '../../test/testUtils'

describe('Types and Models', () => {
  describe('ExerciseType', () => {
    it('should have correct exercise types', () => {
      expect(ExerciseType.TIME_BASED).toBe('time_based')
      expect(ExerciseType.REPETITION_BASED).toBe('repetition_based')
    })

    it('should be a valid const assertion', () => {
      const types = Object.values(ExerciseType)
      expect(types).toContain('time_based')
      expect(types).toContain('repetition_based')
      expect(types).toHaveLength(2)
    })
  })

  describe('Exercise Model', () => {
    it('should create a valid time-based exercise', () => {
      const exercise: Exercise = createMockExercise({
        id: 'plank',
        name: 'Plank',
        description: 'Hold plank position',
        category: ExerciseCategory.CORE,
        exercise_type: ExerciseType.TIME_BASED,
        default_duration: 60,
        is_favorite: false,
        tags: ['core', 'isometric']
      })

      expect(exercise.exercise_type).toBe('time_based')
      expect(exercise.default_duration).toBe(60)
      expect(exercise.default_sets).toBeUndefined()
      expect(exercise.default_reps).toBeUndefined()
    })

    it('should create a valid repetition-based exercise', () => {
      const exercise: Exercise = createMockExercise({
        id: 'push-ups',
        name: 'Push-ups',
        description: 'Standard push-ups',
        category: ExerciseCategory.STRENGTH,
        exercise_type: ExerciseType.REPETITION_BASED,
        default_sets: 3,
        default_reps: 12,
        default_duration: undefined,
        is_favorite: false,
        tags: ['chest', 'arms']
      })

      expect(exercise.exercise_type).toBe('repetition_based')
      expect(exercise.default_sets).toBe(3)
      expect(exercise.default_reps).toBe(12)
      expect(exercise.default_duration).toBeUndefined()
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
        exercise_id: 'plank',
        order: 1,
        custom_duration: 90,
        custom_rest_time: 30
      }

      expect(workoutExercise.custom_duration).toBe(90)
      expect(workoutExercise.custom_rest_time).toBe(30)
      expect(workoutExercise.custom_sets).toBeUndefined()
      expect(workoutExercise.custom_reps).toBeUndefined()
    })

    it('should create a valid workout exercise for repetition-based exercise', () => {
      const workoutExercise: WorkoutExercise = {
        id: 'we-2',
        exercise_id: 'push-ups',
        order: 2,
        custom_sets: 4,
        custom_reps: 15,
        custom_rest_time: 60
      }

      expect(workoutExercise.custom_sets).toBe(4)
      expect(workoutExercise.custom_reps).toBe(15)
      expect(workoutExercise.custom_rest_time).toBe(60)
      expect(workoutExercise.custom_duration).toBeUndefined()
    })
  })

  describe('Workout Model', () => {
    it('should create a valid workout', () => {
      const now = new Date()
      const workout: Workout = createMockWorkout({
        id: 'workout-1',
        name: 'Morning Routine',
        description: 'Quick morning workout',
        exercises: [
          {
            id: 'we-1',
            exercise_id: 'plank',
            order: 1,
            custom_duration: 60
          },
          {
            id: 'we-2',
            exercise_id: 'push-ups',
            order: 2,
            custom_sets: 3,
            custom_reps: 12
          }
        ],
        estimated_duration: 600,
        scheduled_days: ['monday', 'wednesday', 'friday'],
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })

      expect(workout.exercises).toHaveLength(2)
      expect(workout.exercises[0].order).toBe(1)
      expect(workout.exercises[1].order).toBe(2)
      expect(workout.estimated_duration).toBe(600)
      expect(workout.scheduled_days).toEqual(['monday', 'wednesday', 'friday'])
      expect(workout.is_active).toBe(true)
    })
  })

  describe('WorkoutSessionExercise Model', () => {
    it('should create a valid workout session exercise', () => {
      const now = new Date()
      const sessionExercise: WorkoutSessionExercise = {
        id: 'se-1',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        order: 1,
        actual_duration: 75,
        rest_time: 30,
        is_completed: true,
        start_time: now.toISOString(),
        end_time: new Date(now.getTime() + 75000).toISOString()
      }

      expect(sessionExercise.actual_duration).toBe(75)
      expect(sessionExercise.is_completed).toBe(true)
      expect(sessionExercise.rest_time).toBe(30)
    })
  })

  describe('WorkoutSession Model', () => {
    it('should create a valid workout session', () => {
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 1800000) // 30 minutes later
      
      const session: WorkoutSession = createMockWorkoutSession({
        id: 'session-1',
        workout_id: 'workout-1',
        workout_name: 'Morning Routine',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        exercises: [
          {
            id: 'se-1',
            exercise_id: 'plank',
            exercise_name: 'Plank',
            order: 1,
            actual_duration: 75,
            is_completed: true
          }
        ],
        is_completed: true,
        completion_percentage: 100,
        total_duration: 1800
      })

      expect(session.exercises).toHaveLength(1)
      expect(session.completion_percentage).toBe(100)
      expect(session.is_completed).toBe(true)
      expect(session.total_duration).toBe(1800)
    })

    it('should handle incomplete workout session', () => {
      const startTime = new Date()
      
      const session: WorkoutSession = createMockWorkoutSession({
        id: 'session-2',
        workout_id: 'workout-1',
        workout_name: 'Morning Routine',
        start_time: startTime.toISOString(),
        exercises: [
          {
            id: 'se-1',
            exercise_id: 'plank',
            exercise_name: 'Plank',
            order: 1,
            actual_duration: 30,
            is_completed: true
          },
          {
            id: 'se-2',
            exercise_id: 'push-ups',
            exercise_name: 'Push-ups',
            order: 2,
            is_completed: false
          }
        ],
        is_completed: false,
        completion_percentage: 50,
        total_duration: undefined
      })

      expect(session.end_time).toBeUndefined()
      expect(session.is_completed).toBe(false)
      expect(session.completion_percentage).toBe(50)
      expect(session.total_duration).toBeUndefined()
    })
  })

  describe('Type Safety', () => {
    it('should enforce exercise type constraints', () => {
      // This test ensures TypeScript compilation enforces correct types
      const timeBasedExercise: Exercise = createMockExercise({
        id: 'test',
        name: 'Test',
        description: 'Test exercise',
        category: ExerciseCategory.CORE,
        exercise_type: ExerciseType.TIME_BASED,
        default_duration: 60, // Valid for time-based
        is_favorite: false,
        tags: []
      })

      const repBasedExercise: Exercise = createMockExercise({
        id: 'test2',
        name: 'Test 2',
        description: 'Test exercise 2',
        category: ExerciseCategory.STRENGTH,
        exercise_type: ExerciseType.REPETITION_BASED,
        default_sets: 3, // Valid for rep-based
        default_reps: 12, // Valid for rep-based
        is_favorite: false,
        tags: []
      })

      expect(timeBasedExercise.exercise_type).toBe('time_based')
      expect(repBasedExercise.exercise_type).toBe('repetition_based')
    })

    it('should allow optional fields in workout exercises', () => {
      const minimalWorkoutExercise: WorkoutExercise = {
        id: 'we-minimal',
        exercise_id: 'some-exercise',
        order: 1
      }

      expect(minimalWorkoutExercise.custom_duration).toBeUndefined()
      expect(minimalWorkoutExercise.custom_sets).toBeUndefined()
      expect(minimalWorkoutExercise.custom_reps).toBeUndefined()
      expect(minimalWorkoutExercise.custom_rest_time).toBeUndefined()
    })
  })
})
