/**
 * Unit tests for Analytics Service
 * 
 * Tests analytics data aggregation, streak calculations, muscle group balance,
 * and comprehensive analytics summaries.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsService } from '../analyticsService';
import { StorageService } from '../storageService';
import type { ActivityLog, Exercise } from '../../types';

// Mock the storage service
vi.mock('../storageService', () => ({
  StorageService: {
    getInstance: vi.fn()
  }
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockStorageService: {
    getActivityLogs: ReturnType<typeof vi.fn>;
    getExercises: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset the singleton instance before each test
    // @ts-expect-error - Accessing private static field for testing
    AnalyticsService.instance = null;

    // Create mock storage service
    mockStorageService = {
      getActivityLogs: vi.fn(),
      getExercises: vi.fn()
    };

    // Setup mock implementation
    (StorageService.getInstance as ReturnType<typeof vi.fn>).mockReturnValue(mockStorageService);

    // Get fresh instance for each test
    analyticsService = AnalyticsService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset singleton again
    // @ts-expect-error - Accessing private static field for testing
    AnalyticsService.instance = null;
  });

  // ============= Helper Functions =============

  const createMockActivityLog = (overrides: Partial<ActivityLog> = {}): ActivityLog => ({
    id: `log-${Date.now()}-${Math.random()}`,
    exercise_id: 'exercise-1',
    exercise_name: 'Push-ups',
    duration: 60,
    timestamp: new Date().toISOString(),
    sets_count: 3,
    reps_count: 10,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    owner_id: 'user-1',
    deleted: false,
    version: 1,
    ...overrides
  });

  const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
    id: 'exercise-1',
    name: 'Push-ups',
    exercise_type: 'repetition_based',
    catalogId: 'general-fitness',
    is_favorite: false,
    tags: [],
    muscle_groups: ['chest', 'triceps'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    owner_id: 'user-1',
    deleted: false,
    version: 1,
    ...overrides
  });

  // ============= Workout Statistics Tests =============

  describe('getWorkoutStatistics', () => {
    it('should calculate correct statistics for a date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ 
          timestamp: '2025-01-05T10:00:00Z', 
          duration: 120, 
          sets_count: 3, 
          reps_count: 15 
        }),
        createMockActivityLog({ 
          timestamp: '2025-01-10T10:00:00Z', 
          duration: 90, 
          sets_count: 2, 
          reps_count: 12 
        }),
        createMockActivityLog({ 
          timestamp: '2025-01-15T10:00:00Z', 
          duration: 150, 
          sets_count: 4, 
          reps_count: 20,
          exercise_id: 'exercise-2'
        })
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ id: 'exercise-1', catalogId: 'general-fitness' }),
        createMockExercise({ id: 'exercise-2', catalogId: 'tai-chi' })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const stats = await analyticsService.getWorkoutStatistics(startDate, endDate);

      expect(stats.totalWorkouts).toBe(3);
      expect(stats.totalDuration).toBe(360); // 120 + 90 + 150
      expect(stats.totalExercises).toBe(2); // 2 unique exercises
      expect(stats.totalReps).toBe(47); // 15 + 12 + 20
      expect(stats.averageWorkoutDuration).toBe(120); // 360 / 3
      expect(stats.workoutsPerWeek).toBeGreaterThan(0);
      expect(stats.mostActiveDay).toBeTruthy();
      expect(stats.mostActiveCategory).toBeTruthy();
    });

    it('should handle empty logs gracefully', async () => {
      mockStorageService.getActivityLogs.mockResolvedValue([]);
      mockStorageService.getExercises.mockResolvedValue([]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const stats = await analyticsService.getWorkoutStatistics(startDate, endDate);

      expect(stats.totalWorkouts).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.totalExercises).toBe(0);
      expect(stats.totalReps).toBe(0);
      expect(stats.averageWorkoutDuration).toBe(0);
      expect(stats.workoutsPerWeek).toBe(0);
      expect(stats.mostActiveDay).toBe('Monday');
      expect(stats.mostActiveCategory).toBeNull();
    });

    it('should filter logs outside date range', async () => {
      const startDate = new Date('2025-01-10');
      const endDate = new Date('2025-01-20');
      
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: '2025-01-05T10:00:00Z' }), // Before range
        createMockActivityLog({ timestamp: '2025-01-15T10:00:00Z' }), // Within range
        createMockActivityLog({ timestamp: '2025-01-25T10:00:00Z' })  // After range
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue([createMockExercise()]);

      const stats = await analyticsService.getWorkoutStatistics(startDate, endDate);

      expect(stats.totalWorkouts).toBe(1); // Only the one within range
    });

    it('should identify most active day of the week', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      // Create logs with most on Monday (2025-01-06, 2025-01-13, 2025-01-20)
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: '2025-01-06T10:00:00Z' }), // Monday
        createMockActivityLog({ timestamp: '2025-01-13T10:00:00Z' }), // Monday
        createMockActivityLog({ timestamp: '2025-01-20T10:00:00Z' }), // Monday
        createMockActivityLog({ timestamp: '2025-01-08T10:00:00Z' })  // Wednesday
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue([createMockExercise()]);

      const stats = await analyticsService.getWorkoutStatistics(startDate, endDate);

      expect(stats.mostActiveDay).toBe('Monday');
    });
  });

  // ============= Streak Data Tests =============

  describe('getStreakData', () => {
    it('should calculate current streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: today.toISOString() }),
        createMockActivityLog({ timestamp: yesterday.toISOString() }),
        createMockActivityLog({ timestamp: twoDaysAgo.toISOString() })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

      const streakData = await analyticsService.getStreakData();

      expect(streakData.currentStreak).toBe(3);
      expect(streakData.isActiveToday).toBe(true);
      expect(streakData.streakStartDate).toBeTruthy();
    });

    it('should calculate longest streak from history', async () => {
      // Create a pattern with a 5-day streak, then gap, then 3-day streak
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: '2025-01-01T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-02T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-03T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-04T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-05T10:00:00Z' }),
        // Gap
        createMockActivityLog({ timestamp: '2025-01-08T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-09T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-10T10:00:00Z' })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

      const streakData = await analyticsService.getStreakData();

      expect(streakData.longestStreak).toBe(5);
    });

    it('should handle no workouts gracefully', async () => {
      mockStorageService.getActivityLogs.mockResolvedValue([]);

      const streakData = await analyticsService.getStreakData();

      expect(streakData.currentStreak).toBe(0);
      expect(streakData.longestStreak).toBe(0);
      expect(streakData.isActiveToday).toBe(false);
      expect(streakData.streakStartDate).toBeUndefined();
    });

    it('should correctly identify if user worked out today', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: yesterday.toISOString() })
        // No workout today
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

      const streakData = await analyticsService.getStreakData();

      expect(streakData.isActiveToday).toBe(false);
      expect(streakData.currentStreak).toBe(1); // Streak preserved from yesterday
    });
  });

  // ============= Muscle Group Balance Tests =============

  describe('getMuscleGroupBalance', () => {
    it('should calculate muscle group distribution correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ 
          exercise_id: 'exercise-1', 
          timestamp: '2025-01-05T10:00:00Z',
          sets_count: 3,
          reps_count: 10,
          duration: 120
        }),
        createMockActivityLog({ 
          exercise_id: 'exercise-1', 
          timestamp: '2025-01-10T10:00:00Z',
          sets_count: 3,
          reps_count: 10,
          duration: 120
        }),
        createMockActivityLog({ 
          exercise_id: 'exercise-2', 
          timestamp: '2025-01-15T10:00:00Z',
          sets_count: 4,
          reps_count: 15,
          duration: 180
        })
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ 
          id: 'exercise-1', 
          muscle_groups: ['chest', 'triceps'] 
        }),
        createMockExercise({ 
          id: 'exercise-2', 
          muscle_groups: ['legs', 'glutes'] 
        })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      // Check that muscle groups are present
      const muscleGroups = balance.map(b => b.muscleGroup);
      expect(muscleGroups).toContain('chest');
      expect(muscleGroups).toContain('triceps');
      expect(muscleGroups).toContain('legs');
      expect(muscleGroups).toContain('glutes');

      // Chest and triceps should have 2 workouts each
      const chestBalance = balance.find(b => b.muscleGroup === 'chest');
      expect(chestBalance?.workoutCount).toBe(2);
      expect(chestBalance?.totalSets).toBe(6); // 3 + 3
      expect(chestBalance?.totalReps).toBe(20); // 10 + 10
    });

    it('should identify over-trained muscle groups', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Create 10 workouts, 4 for chest (40% - over-trained)
      const mockLogs: ActivityLog[] = Array.from({ length: 10 }, (_, i) => 
        createMockActivityLog({ 
          exercise_id: i < 4 ? 'exercise-chest' : 'exercise-legs',
          timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`
        })
      );

      const mockExercises: Exercise[] = [
        createMockExercise({ id: 'exercise-chest', muscle_groups: ['chest'] }),
        createMockExercise({ id: 'exercise-legs', muscle_groups: ['legs'] })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      const chestBalance = balance.find(b => b.muscleGroup === 'chest');
      expect(chestBalance?.isOverTrained).toBe(true); // 40% > 30%
      expect(chestBalance?.percentage).toBe(40);
    });

    it('should identify under-trained muscle groups', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Create 20 workouts, only 1 for core (5% - under-trained)
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ exercise_id: 'exercise-core', timestamp: '2025-01-05T10:00:00Z' }),
        ...Array.from({ length: 19 }, (_, i) => 
          createMockActivityLog({ 
            exercise_id: 'exercise-legs',
            timestamp: `2025-01-${String(i + 10).padStart(2, '0')}T10:00:00Z`
          })
        )
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ id: 'exercise-core', muscle_groups: ['core'] }),
        createMockExercise({ id: 'exercise-legs', muscle_groups: ['legs'] })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      const coreBalance = balance.find(b => b.muscleGroup === 'core');
      expect(coreBalance?.isUnderTrained).toBe(true); // 5% < 10%
      expect(coreBalance?.percentage).toBe(5);
    });

    it('should handle exercises without muscle group data', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ exercise_id: 'exercise-1' })
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ 
          id: 'exercise-1', 
          muscle_groups: undefined // No muscle group data
        })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      expect(balance).toEqual([]); // No muscle groups to report
    });

    it('should track last trained date for each muscle group', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ 
          exercise_id: 'exercise-1', 
          timestamp: '2025-01-05T10:00:00Z' 
        }),
        createMockActivityLog({ 
          exercise_id: 'exercise-1', 
          timestamp: '2025-01-15T10:00:00Z' // More recent
        })
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ 
          id: 'exercise-1', 
          muscle_groups: ['chest'] 
        })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      const chestBalance = balance.find(b => b.muscleGroup === 'chest');
      expect(chestBalance?.lastTrainedAt).toBe('2025-01-15T10:00:00Z'); // Most recent
    });
  });

  // ============= Analytics Summary Tests =============

  describe('getAnalyticsSummary', () => {
    it('should generate complete analytics summary for week period', async () => {
      const today = new Date('2025-01-15');
      
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: '2025-01-13T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-14T10:00:00Z' }),
        createMockActivityLog({ timestamp: '2025-01-15T10:00:00Z' })
      ];

      const mockExercises: Exercise[] = [
        createMockExercise({ muscle_groups: ['chest'] })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue(mockExercises);

      // Mock Date to ensure consistent "today"
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const summary = await analyticsService.getAnalyticsSummary('week');

      expect(summary.period).toBe('week');
      expect(summary.startDate).toBeTruthy();
      expect(summary.endDate).toBeTruthy();
      expect(summary.statistics).toBeDefined();
      expect(summary.streak).toBeDefined();
      expect(summary.muscleGroupBalance).toBeDefined();
      expect(summary.trends).toBeDefined();

      vi.useRealTimers();
    });

    it('should generate analytics summary for month period', async () => {
      mockStorageService.getActivityLogs.mockResolvedValue([]);
      mockStorageService.getExercises.mockResolvedValue([]);

      const summary = await analyticsService.getAnalyticsSummary('month');

      expect(summary.period).toBe('month');
      expect(summary.statistics.totalWorkouts).toBe(0);
    });

    it('should use custom start date for all-time period', async () => {
      const customStartDate = new Date('2024-01-01');
      
      mockStorageService.getActivityLogs.mockResolvedValue([]);
      mockStorageService.getExercises.mockResolvedValue([]);

      const summary = await analyticsService.getAnalyticsSummary('all-time', customStartDate);

      expect(summary.period).toBe('all-time');
      expect(new Date(summary.startDate).getFullYear()).toBe(2024);
    });

    it('should calculate all-time from earliest log if no custom start date', async () => {
      const mockLogs: ActivityLog[] = [
        createMockActivityLog({ timestamp: '2024-06-15T10:00:00Z' }), // Earliest
        createMockActivityLog({ timestamp: '2025-01-10T10:00:00Z' })
      ];

      mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);
      mockStorageService.getExercises.mockResolvedValue([createMockExercise()]);

      const summary = await analyticsService.getAnalyticsSummary('all-time');

      expect(summary.period).toBe('all-time');
      const startYear = new Date(summary.startDate).getFullYear();
      expect(startYear).toBe(2024); // Should start from earliest log's week
    });
  });

  // ============= Error Handling Tests =============

  describe('Error Handling', () => {
    it('should handle storage service errors gracefully in getWorkoutStatistics', async () => {
      mockStorageService.getActivityLogs.mockRejectedValue(new Error('Database error'));
      mockStorageService.getExercises.mockRejectedValue(new Error('Database error'));

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const stats = await analyticsService.getWorkoutStatistics(startDate, endDate);

      // Should return empty statistics instead of throwing
      expect(stats.totalWorkouts).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });

    it('should handle storage service errors gracefully in getStreakData', async () => {
      mockStorageService.getActivityLogs.mockRejectedValue(new Error('Database error'));

      const streakData = await analyticsService.getStreakData();

      // Should return zero streak instead of throwing
      expect(streakData.currentStreak).toBe(0);
      expect(streakData.longestStreak).toBe(0);
    });

    it('should handle storage service errors gracefully in getMuscleGroupBalance', async () => {
      mockStorageService.getActivityLogs.mockRejectedValue(new Error('Database error'));
      mockStorageService.getExercises.mockRejectedValue(new Error('Database error'));

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const balance = await analyticsService.getMuscleGroupBalance(startDate, endDate);

      // Should return empty array instead of throwing
      expect(balance).toEqual([]);
    });
  });
});
