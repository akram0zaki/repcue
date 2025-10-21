/**
 * Muscle Balance Feature Test
 *
 * Tests the complete muscle balance analytics flow after adding muscle_groups to all exercises:
 * 1. Verifies exercises have muscle_groups populated
 * 2. Creates test workout data with muscle imbalances
 * 3. Verifies analytics service correctly calculates muscle group percentages
 * 4. Tests coaching insights generation for muscle balance recommendations
 *
 * Run with: pnpm test muscleBalanceTest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../services/analyticsService';
import { StorageService } from '../services/storageService';
import { CoachingService } from '../services/coachingService';
import type { ActivityLog, Exercise } from '../types';
import { ExerciseType } from '../types';
import { GENERAL_FITNESS_EXERCISES } from '../data/exercises/generalFitness';

describe('Muscle Balance Feature - Complete Flow', () => {
  let analyticsService: AnalyticsService;
  let storageService: StorageService;
  let coachingService: CoachingService;

  beforeEach(() => {
    // Reset services
    analyticsService = AnalyticsService.getInstance();
    storageService = StorageService.getInstance();
    coachingService = CoachingService.getInstance();
  });

  describe('Phase 1: Exercise Schema Validation', () => {
    it('should have muscle_groups field on all general-fitness exercises', () => {
      const exercisesWithoutMuscleGroups = GENERAL_FITNESS_EXERCISES.filter(
        ex => !ex.muscle_groups || ex.muscle_groups.length === 0
      );

      expect(exercisesWithoutMuscleGroups).toHaveLength(0);
      expect(GENERAL_FITNESS_EXERCISES.length).toBe(26);

      // Log sample for verification
      const plank = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'plank');
      console.log('Sample exercise (plank) muscle_groups:', plank?.muscle_groups);
    });

    it('should have correct muscle groups for core exercises', () => {
      const plank = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'plank');
      const sidePlank = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'side-plank');
      const bicycleCrunches = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'bicycle-crunches');

      expect(plank?.muscle_groups).toContain('core');
      expect(plank?.muscle_groups).toContain('abs');
      expect(sidePlank?.muscle_groups).toContain('obliques');
      expect(bicycleCrunches?.muscle_groups).toContain('core');
    });

    it('should have correct muscle groups for strength exercises', () => {
      const pushups = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'push-ups');
      const squats = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'squats');
      const lunges = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'lunges');

      expect(pushups?.muscle_groups).toContain('chest');
      expect(pushups?.muscle_groups).toContain('shoulders');
      expect(pushups?.muscle_groups).toContain('triceps');

      expect(squats?.muscle_groups).toContain('quads');
      expect(squats?.muscle_groups).toContain('glutes');

      expect(lunges?.muscle_groups).toContain('quads');
      expect(lunges?.muscle_groups).toContain('glutes');
    });

    it('should have correct muscle groups for cardio exercises', () => {
      const jumpingJacks = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'jumping-jacks');
      const highKnees = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'high-knees');
      const burpees = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'burpees');

      expect(jumpingJacks?.muscle_groups).toContain('cardio');
      expect(highKnees?.muscle_groups).toContain('cardio');
      expect(burpees?.muscle_groups).toContain('full-body');
      expect(burpees?.muscle_groups).toContain('cardio');
    });
  });

  describe('Phase 2: Analytics Service - Muscle Group Balance Calculation', () => {
    it('should correctly calculate muscle group balance from workout logs', async () => {
      // Mock workout data: Heavy core training (imbalanced)
      const mockLogs: Partial<ActivityLog>[] = [
        // 5 plank sessions (core, abs, shoulders)
        ...Array(5).fill(null).map((_, i) => ({
          id: `log-plank-${i}`,
          exercise_id: 'plank',
          exercise_name: 'Plank',
          duration: 60,
          timestamp: new Date(2025, 0, i + 1).toISOString(),
          sets_count: 3,
          reps_count: 0
        })),
        // 1 push-up session (chest, shoulders, triceps, core)
        {
          id: 'log-pushups',
          exercise_id: 'push-ups',
          exercise_name: 'Push-ups',
          duration: 300,
          timestamp: new Date(2025, 0, 6).toISOString(),
          sets_count: 3,
          reps_count: 10
        },
        // 1 squats session (quads, glutes, hamstrings, core)
        {
          id: 'log-squats',
          exercise_id: 'squats',
          exercise_name: 'Squats',
          duration: 240,
          timestamp: new Date(2025, 0, 7).toISOString(),
          sets_count: 3,
          reps_count: 12
        }
      ];

      // Mock storage service methods
      vi.spyOn(storageService, 'getActivityLogs').mockResolvedValue(mockLogs as ActivityLog[]);
      vi.spyOn(storageService, 'getExercises').mockResolvedValue(GENERAL_FITNESS_EXERCISES);

      const startDate = new Date(2025, 0, 1);
      const endDate = new Date(2025, 0, 31);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      // Verify balance data is generated
      expect(balance.length).toBeGreaterThan(0);

      // Core should be dominant (5 plank + 1 pushup + 1 squat = 7 workouts)
      const coreData = balance.find(b => b.muscleGroup === 'core');
      expect(coreData).toBeDefined();
      expect(coreData?.workoutCount).toBe(7);
      expect(coreData?.percentage).toBeGreaterThan(90); // 7/7 = 100%
      expect(coreData?.isOverTrained).toBe(true);

      // Chest should be under-trained (only 1 pushup = 1 workout)
      const chestData = balance.find(b => b.muscleGroup === 'chest');
      expect(chestData).toBeDefined();
      expect(chestData?.workoutCount).toBe(1);
      expect(chestData?.percentage).toBeLessThan(20); // 1/7 ≈ 14%
      expect(chestData?.isUnderTrained).toBe(true);

      console.log('Muscle Balance Analysis:', balance);
    });

    it('should handle multiple exercises targeting the same muscle group', async () => {
      const mockLogs: Partial<ActivityLog>[] = [
        {
          id: 'log-1',
          exercise_id: 'plank',
          exercise_name: 'Plank',
          duration: 60,
          timestamp: new Date(2025, 0, 1).toISOString(),
          sets_count: 1,
          reps_count: 0
        },
        {
          id: 'log-2',
          exercise_id: 'dead-bug',
          exercise_name: 'Dead Bug',
          duration: 120,
          timestamp: new Date(2025, 0, 2).toISOString(),
          sets_count: 3,
          reps_count: 10
        },
        {
          id: 'log-3',
          exercise_id: 'bicycle-crunches',
          exercise_name: 'Bicycle Crunches',
          duration: 180,
          timestamp: new Date(2025, 0, 3).toISOString(),
          sets_count: 3,
          reps_count: 20
        }
      ];

      vi.spyOn(storageService, 'getActivityLogs').mockResolvedValue(mockLogs as ActivityLog[]);
      vi.spyOn(storageService, 'getExercises').mockResolvedValue(GENERAL_FITNESS_EXERCISES);

      const startDate = new Date(2025, 0, 1);
      const endDate = new Date(2025, 0, 31);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      // All 3 exercises target 'core' and 'abs'
      const coreData = balance.find(b => b.muscleGroup === 'core');
      const absData = balance.find(b => b.muscleGroup === 'abs');

      expect(coreData?.workoutCount).toBe(3);
      expect(absData?.workoutCount).toBe(3);
      expect(coreData?.totalSets).toBeGreaterThan(0);
    });
  });

  describe('Phase 3: Coaching Service - Muscle Balance Insights', () => {
    it('should generate muscle balance insight when imbalance detected', async () => {
      // Mock imbalanced workout data (heavy core, no legs)
      const mockLogs: Partial<ActivityLog>[] = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `log-${i}`,
          exercise_id: 'plank',
          exercise_name: 'Plank',
          duration: 60,
          timestamp: new Date(2025, 0, i + 1).toISOString(),
          sets_count: 3,
          reps_count: 0
        }))
      ];

      vi.spyOn(storageService, 'getActivityLogs').mockResolvedValue(mockLogs as ActivityLog[]);
      vi.spyOn(storageService, 'getExercises').mockResolvedValue(GENERAL_FITNESS_EXERCISES);

      // Mock settings
      vi.spyOn(storageService, 'getSettings').mockResolvedValue({
        coach_enabled: true,
        coach_show_muscle_balance: true
      } as any);

      const insights = await coachingService.generateInsights();

      // Should contain muscle balance insight
      const muscleBalanceInsight = insights.find(
        insight => insight.type === 'muscle-balance'
      );

      expect(muscleBalanceInsight).toBeDefined();
      expect(muscleBalanceInsight?.priority).toBe('medium');

      console.log('Generated Muscle Balance Insight:', muscleBalanceInsight);
    });
  });

  describe('Phase 4: Exercise Suggestion Accuracy', () => {
    it('should suggest exercises for under-trained muscle groups', async () => {
      // Scenario: User only does core exercises, never trains legs
      const mockLogs: Partial<ActivityLog>[] = [
        ...Array(10).fill(null).map((_, i) => ({
          id: `log-core-${i}`,
          exercise_id: 'plank',
          exercise_name: 'Plank',
          duration: 60,
          timestamp: new Date(2025, 0, i + 1).toISOString(),
          sets_count: 3,
          reps_count: 0
        }))
      ];

      vi.spyOn(storageService, 'getActivityLogs').mockResolvedValue(mockLogs as ActivityLog[]);
      vi.spyOn(storageService, 'getExercises').mockResolvedValue(GENERAL_FITNESS_EXERCISES);
      vi.spyOn(storageService, 'getSettings').mockResolvedValue({
        coach_enabled: true,
        coach_show_muscle_balance: true
      } as any);

      const insights = await coachingService.generateInsights();
      const muscleBalanceInsight = insights.find(i => i.type === 'muscle-balance');

      // Insight should recommend leg exercises
      expect(muscleBalanceInsight?.actionable).toBe(true);
      expect(muscleBalanceInsight?.suggestedExerciseId).toBeDefined();

      if (muscleBalanceInsight?.suggestedExerciseId) {
        const suggestedExercise = GENERAL_FITNESS_EXERCISES.find(
          ex => ex.id === muscleBalanceInsight.suggestedExerciseId
        );

        // Suggested exercise should target under-trained muscle groups
        // (NOT plank, which user already does frequently)
        expect(suggestedExercise?.id).not.toBe('plank');

        // Should target legs/quads/glutes (under-trained)
        const suggestedMuscles = suggestedExercise?.muscle_groups || [];
        const targetsUndertrainedMuscles = suggestedMuscles.some(muscle =>
          ['quads', 'glutes', 'hamstrings', 'legs'].includes(muscle)
        );

        expect(targetsUndertrainedMuscles).toBe(true);

        console.log('Suggested Exercise:', {
          id: suggestedExercise?.id,
          name: suggestedExercise?.name,
          muscle_groups: suggestedExercise?.muscle_groups
        });
      }
    });
  });
});
