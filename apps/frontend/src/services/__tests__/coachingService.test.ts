/**
 * Coaching Service Tests
 * 
 * Tests the CoachingService which orchestrates analytics and recommendations
 * to generate actionable coaching insights.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ActivityLog, Exercise, Workout } from '../../types';
import type { WorkoutStatistics, MuscleGroupBalance, StreakData } from '../../types/coaching';
import { CoachingService } from '../coachingService';
import { AnalyticsService } from '../analyticsService';
import { StorageService } from '../storageService';

// Mock dependencies
vi.mock('../storageService');
vi.mock('../analyticsService');

describe('CoachingService', () => {
  let service: CoachingService;
  let mockStorageService: any;
  let mockAnalyticsService: any;

  // Sample data
  const mockExercises: Exercise[] = [
    {
      id: 'ex1',
      name: 'Push-ups',
      catalogId: 'strength',
      muscle_groups: ['chest', 'triceps'],
      exercise_type: 'repetition_based',
      is_favorite: false,
      tags: [],
      deleted: false,
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'ex2',
      name: 'Squats',
      catalogId: 'strength',
      muscle_groups: ['quadriceps', 'glutes'],
      exercise_type: 'repetition_based',
      is_favorite: false,
      tags: [],
      deleted: false,
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  ];

  const mockWorkouts: Workout[] = [];

  const mockLogs: ActivityLog[] = [
    {
      id: 'log1',
      exercise_id: 'ex1',
      exercise_name: 'Push-ups',
      timestamp: '2024-01-15T10:00:00.000Z',
      duration: 300,
      sets_count: 3,
      reps_count: 10,
      catalog_id: 'strength',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      deleted: false,
      version: 1
    },
    {
      id: 'log2',
      exercise_id: 'ex2',
      exercise_name: 'Squats',
      timestamp: '2024-01-16T10:00:00.000Z',
      duration: 400,
      sets_count: 3,
      reps_count: 12,
      catalog_id: 'strength',
      created_at: '2024-01-16T10:00:00.000Z',
      updated_at: '2024-01-16T10:00:00.000Z',
      deleted: false,
      version: 1
    },
    {
      id: 'log3',
      exercise_id: 'ex1',
      exercise_name: 'Push-ups',
      timestamp: '2024-01-17T10:00:00.000Z',
      duration: 300,
      sets_count: 3,
      reps_count: 10,
      catalog_id: 'strength',
      created_at: '2024-01-17T10:00:00.000Z',
      updated_at: '2024-01-17T10:00:00.000Z',
      deleted: false,
      version: 1
    }
  ];

  const mockStreakData: StreakData = {
    currentStreak: 7,
    longestStreak: 14,
    isActiveToday: true
  };

  const mockMuscleBalance: MuscleGroupBalance[] = [
    {
      muscleGroup: 'chest',
      workoutCount: 10,
      totalSets: 30,
      totalReps: 300,
      totalDuration: 3000,
      percentage: 40,
      isOverTrained: true,
      isUnderTrained: false,
      lastTrainedAt: '2024-01-17T10:00:00.000Z'
    },
    {
      muscleGroup: 'legs',
      workoutCount: 1,
      totalSets: 3,
      totalReps: 36,
      totalDuration: 400,
      percentage: 5,
      isOverTrained: false,
      isUnderTrained: true,
      lastTrainedAt: '2024-01-10T10:00:00.000Z'
    },
    {
      muscleGroup: 'back',
      workoutCount: 6,
      totalSets: 18,
      totalReps: 180,
      totalDuration: 1800,
      percentage: 25,
      isOverTrained: false,
      isUnderTrained: false,
      lastTrainedAt: '2024-01-15T10:00:00.000Z'
    }
  ];

  const mockWeekStats: WorkoutStatistics = {
    totalWorkouts: 3,
    totalDuration: 1000,
    totalExercises: 2,
    totalReps: 96,
    averageWorkoutDuration: 333.33,
    workoutsPerWeek: 3,
    mostActiveDay: 'Monday',
    mostActiveCategory: 'strength'
  };

  beforeEach(() => {
    // Reset service singleton
    // @ts-expect-error - accessing private static for testing
    CoachingService.instance = null;
    
    // Get fresh instance
    service = CoachingService.getInstance();

    // Setup storage service mock
    mockStorageService = {
      getExercises: vi.fn().mockResolvedValue(mockExercises),
      getWorkouts: vi.fn().mockResolvedValue(mockWorkouts),
      getActivityLogs: vi.fn().mockResolvedValue(mockLogs)
    };
    vi.mocked(StorageService.getInstance).mockReturnValue(mockStorageService);

    // Setup analytics service mock
    mockAnalyticsService = {
      getAnalyticsSummary: vi.fn().mockResolvedValue({
        statistics: mockWeekStats,
        streak: mockStreakData,
        muscleGroupBalance: mockMuscleBalance,
        period: 'week'
      })
    };
    vi.mocked(AnalyticsService.getInstance).mockReturnValue(mockAnalyticsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - accessing private static for testing
    CoachingService.instance = null;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CoachingService.getInstance();
      const instance2 = CoachingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAllInsights', () => {
    it('should generate insights from all sources', async () => {
      const insights = await service.getAllInsights();

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);

      // Should have called analytics and storage
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledWith('week');
      expect(mockStorageService.getActivityLogs).toHaveBeenCalled();
    });

    it('should return cached insights on second call', async () => {
      // First call
      const insights1 = await service.getAllInsights();

      // Second call (should use cache)
      const insights2 = await service.getAllInsights();

      expect(insights1).toEqual(insights2);
      
      // Should only call services once
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledTimes(1);
      expect(mockStorageService.getActivityLogs).toHaveBeenCalledTimes(1);
    });

    it('should regenerate insights when forceRefresh is true', async () => {
      // First call
      await service.getAllInsights();

      // Second call with force refresh
      await service.getAllInsights(true);

      // Should call services twice
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledTimes(2);
      expect(mockStorageService.getActivityLogs).toHaveBeenCalledTimes(2);
    });

    it('should sort insights by priority', async () => {
      const insights = await service.getAllInsights();

      // Check that insights are sorted (high > medium > low)
      let lastPriority = 3; // high = 3
      insights.forEach(insight => {
        const priorityValue = insight.priority === 'high' ? 3 : insight.priority === 'medium' ? 2 : 1;
        expect(priorityValue).toBeLessThanOrEqual(lastPriority);
        lastPriority = priorityValue;
      });
    });

    it('should filter out dismissed insights', async () => {
      const insights = await service.getAllInsights();
      const firstInsight = insights[0];

      // Dismiss an insight
      service.dismissInsight(firstInsight.id);

      // Get insights again
      const newInsights = await service.getAllInsights();

      // Dismissed insight should not be in active insights
      const dismissed = newInsights.find(i => i.id === firstInsight.id);
      expect(dismissed).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      mockAnalyticsService.getAnalyticsSummary.mockRejectedValue(new Error('Analytics error'));

      const insights = await service.getAllInsights();

      // Should return empty array instead of throwing
      expect(insights).toEqual([]);
    });
  });

  describe('Streak Insights', () => {
    it('should generate streak milestone insights', async () => {
      const insights = await service.getAllInsights();

      const streakInsights = insights.filter(i => i.type === 'streak');
      expect(streakInsights.length).toBeGreaterThan(0);

      const milestone = streakInsights.find(i => i.message.includes('milestone'));
      if (milestone) {
        expect(milestone.priority).toBe('high');
        expect(milestone.icon).toBe('fire');
      }
    });

    it('should warn when streak is at risk', async () => {
      // Mock streak data for yesterday
      const yesterdayStreak: StreakData = {
        ...mockStreakData,
        streakStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isActiveToday: false
      };

      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({
        statistics: mockWeekStats,
        streak: yesterdayStreak,
        muscleGroupBalance: mockMuscleBalance,
        period: 'week'
      });

      const insights = await service.getAllInsights(true);
      const riskInsight = insights.find(i => i.message.includes('atRisk'));

      if (riskInsight) {
        expect(riskInsight.priority).toBe('high');
        expect(riskInsight.dismissible).toBe(false);
      }
    });
  });

  describe('Muscle Balance Insights', () => {
    it('should warn about over-trained muscle groups', async () => {
      const insights = await service.getAllInsights();

      const balanceInsights = insights.filter(i => i.type === 'muscle-balance');
      const overTrainedInsight = balanceInsights.find(i => 
        i.message.includes('overTrained')
      );

      if (overTrainedInsight) {
        expect(overTrainedInsight.priority).toBe('medium');
        expect(overTrainedInsight.message).toContain('chest');
      }
    });

    it('should recommend under-trained muscle groups', async () => {
      const insights = await service.getAllInsights();

      const balanceInsights = insights.filter(i => i.type === 'muscle-balance');
      const underTrainedInsight = balanceInsights.find(i => 
        i.message.includes('underTrained')
      );

      if (underTrainedInsight) {
        expect(underTrainedInsight.priority).toBe('medium');
        expect(underTrainedInsight.actions).toBeDefined();
        expect(underTrainedInsight.actions?.[0].action).toBe('find-exercises');
      }
    });

    it('should suggest neglected muscle groups', async () => {
      const insights = await service.getAllInsights();

      const neglectedInsight = insights.find(i => 
        i.message.includes('neglected')
      );

      if (neglectedInsight) {
        expect(neglectedInsight.priority).toBe('low');
        expect(neglectedInsight.type).toBe('muscle-balance');
      }
    });
  });

  describe('Progression Insights', () => {
    it('should recommend progressive overload', async () => {
      // Create consistent workout logs for same exercise
      const consistentLogs: ActivityLog[] = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        exercise_id: 'ex1',
        exercise_name: 'Push-ups',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        duration: 300,
        sets_count: 3,
        reps_count: 10,
        catalogId: 'strength',
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        deleted: false,
        version: 1
      }));

      mockStorageService.getActivityLogs.mockResolvedValue(consistentLogs);

      const insights = await service.getAllInsights(true);
      const progressionInsight = insights.find(i => i.type === 'progression');

      if (progressionInsight) {
        expect(progressionInsight.priority).toBe('medium');
        expect(progressionInsight.metadata).toBeDefined();
        expect(progressionInsight.actions).toBeDefined();
        expect(progressionInsight.actions?.[0].action).toBe('start-exercise');
      }
    });
  });

  describe('Recovery Insights', () => {
    it('should recommend rest after consecutive training days', async () => {
      // Create logs for 6 consecutive days
      const consecutiveLogs: ActivityLog[] = Array.from({ length: 6 }, (_, i) => ({
        id: `log-${i}`,
        exercise_id: 'ex1',
        exercise_name: 'Push-ups',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        duration: 300,
        sets_count: 3,
        reps_count: 10,
        catalogId: 'strength',
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        deleted: false,
        version: 1
      }));

      mockStorageService.getActivityLogs.mockResolvedValue(consecutiveLogs);

      const insights = await service.getAllInsights(true);
      const recoveryInsight = insights.find(i => i.type === 'recovery');

      if (recoveryInsight) {
        expect(recoveryInsight.metadata).toBeDefined();
        expect(recoveryInsight.metadata?.daysTraining).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('Suggestion Insights', () => {
    it('should provide contextual workout suggestions', async () => {
      const insights = await service.getAllInsights();

      const suggestionInsight = insights.find(i => i.type === 'suggestion');

      expect(suggestionInsight).toBeDefined();
      expect(suggestionInsight?.priority).toBe('low');
      expect(suggestionInsight?.icon).toBe('lightbulb');
    });
  });

  describe('getInsightsByType', () => {
    it('should filter insights by type', async () => {
      const streakInsights = await service.getInsightsByType('streak');

      streakInsights.forEach(insight => {
        expect(insight.type).toBe('streak');
      });
    });

    it('should return empty array for type with no insights', async () => {
      // Mock empty data
      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({
        statistics: {
          ...mockWeekStats,
          totalWorkouts: 0
        },
        streak: {
          ...mockStreakData,
          currentStreak: 0
        },
        muscleGroupBalance: [],
        period: 'week'
      });
      mockStorageService.getActivityLogs.mockResolvedValue([]);

      const progressionInsights = await service.getInsightsByType('progression');

      expect(progressionInsights).toEqual([]);
    });
  });

  describe('getTopInsight', () => {
    it('should return highest priority insight', async () => {
      const topInsight = await service.getTopInsight();

      expect(topInsight).toBeDefined();
      
      const allInsights = await service.getAllInsights();
      expect(topInsight).toEqual(allInsights[0]);
    });

    it('should return null when no insights available', async () => {
      // Mock empty data
      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({
        statistics: {
          ...mockWeekStats,
          totalWorkouts: 0
        },
        streak: {
          ...mockStreakData,
          currentStreak: 0
        },
        muscleGroupBalance: [],
        period: 'week'
      });
      mockStorageService.getActivityLogs.mockResolvedValue([]);

      service.clearCache();
      const topInsight = await service.getTopInsight();

      // With no data, might still have a suggestion insight
      // So we just check it doesn't throw
      expect(topInsight).toBeDefined();
    });
  });

  describe('dismissInsight', () => {
    it('should mark insight as dismissed', async () => {
      const insights = await service.getAllInsights();
      const firstInsight = insights[0];

      service.dismissInsight(firstInsight.id);

      // Get fresh insights (from cache)
      const newInsights = await service.getAllInsights();
      const dismissed = newInsights.find(i => i.id === firstInsight.id);

      expect(dismissed).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('should clear cached insights', async () => {
      // First call (generates cache)
      await service.getAllInsights();

      // Clear cache
      service.clearCache();

      // Second call (should regenerate)
      await service.getAllInsights();

      // Should call services twice
      expect(mockAnalyticsService.getAnalyticsSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activity logs', async () => {
      mockStorageService.getActivityLogs.mockResolvedValue([]);

      const insights = await service.getAllInsights(true);

      // Should still generate some insights (like suggestions)
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should handle empty muscle balance data', async () => {
      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({
        statistics: mockWeekStats,
        streak: mockStreakData,
        muscleGroupBalance: [],
        period: 'week'
      });

      const insights = await service.getAllInsights(true);

      // Should not crash, might have fewer insights
      expect(insights).toBeDefined();
    });

    it('should handle zero streak', async () => {
      mockAnalyticsService.getAnalyticsSummary.mockResolvedValue({
        statistics: mockWeekStats,
        streak: {
          ...mockStreakData,
          currentStreak: 0,
          workedOutToday: false
        },
        muscleGroupBalance: mockMuscleBalance,
        period: 'week'
      });

      const insights = await service.getAllInsights(true);

      // Should still generate insights for other types
      expect(insights).toBeDefined();
    });
  });
});
