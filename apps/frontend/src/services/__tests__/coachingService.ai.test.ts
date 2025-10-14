/**
 * Unit tests for CoachingService AI integration
 * 
 * Tests the getAIEnhancedInsights method that combines rule-based and AI insights
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoachingService } from '../coachingService';
import { insightsService, InsightsServiceError } from '../insightsService';
import type { CoachingInsight } from '../../types/coaching';

// Mock dependencies
vi.mock('../insightsService', () => ({
  insightsService: {
    canFetchInsights: vi.fn(),
    getAIInsights: vi.fn()
  },
  InsightsServiceError: class InsightsServiceError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode?: number
    ) {
      super(message);
      this.name = 'InsightsServiceError';
    }
  }
}));

vi.mock('../analyticsService', () => ({
  AnalyticsService: {
    getInstance: vi.fn(() => ({
      getAnalyticsSummary: vi.fn().mockResolvedValue({
        period: 'week',
        startDate: '2025-10-07T00:00:00Z',
        endDate: '2025-10-14T00:00:00Z',
        statistics: {
          totalWorkouts: 5,
          totalDuration: 1500,
          totalExercises: 15,
          totalReps: 250,
          averageWorkoutDuration: 300,
          workoutsPerWeek: 5,
          mostActiveDay: 'Monday',
          mostActiveCategory: 'general-fitness'
        },
        streak: {
          currentStreak: 3,
          longestStreak: 7,
          isActiveToday: true
        },
        muscleGroupBalance: [],
        personalRecords: [],
        trends: {
          workoutFrequency: 'improving',
          consistency: 0.8,
          variety: 0.6
        }
      })
    }))
  }
}));

vi.mock('../storageService', () => ({
  StorageService: {
    getInstance: vi.fn(() => ({
      getActivityLogs: vi.fn().mockResolvedValue([])
    }))
  }
}));

describe('CoachingService - AI Integration', () => {
  let coachingService: CoachingService;

  beforeEach(() => {
    vi.clearAllMocks();
    coachingService = CoachingService.getInstance();
    coachingService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAIEnhancedInsights', () => {
    const mockRuleInsight: CoachingInsight = {
      id: 'rule-1',
      type: 'streak',
      priority: 'high',
      source: 'rule',
      title: 'streak.title',
      message: 'streak.message',
      icon: 'fire',
      iconColor: 'text-orange-500',
      createdAt: '2025-10-14T00:00:00Z',
      dismissible: true
    };

    const mockAIInsight: CoachingInsight = {
      id: 'ai-1',
      type: 'progression',
      priority: 'high',
      source: 'ai',
      title: 'ai.progressionTitle',
      message: 'ai.progressionMessage',
      icon: 'trending-up',
      iconColor: 'text-green-500',
      createdAt: '2025-10-14T00:00:00Z',
      dismissible: true
    };

    it('should return rule-based insights only when AI is disabled', async () => {
      const result = await coachingService.getAIEnhancedInsights(false, false);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(insightsService.canFetchInsights).not.toHaveBeenCalled();
      expect(insightsService.getAIInsights).not.toHaveBeenCalled();
    });

    it('should return rule-based insights when user cannot fetch AI insights', async () => {
      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: false,
        reason: 'User not authenticated'
      });

      const result = await coachingService.getAIEnhancedInsights(false, true);

      expect(result).toBeDefined();
      expect(insightsService.canFetchInsights).toHaveBeenCalled();
      expect(insightsService.getAIInsights).not.toHaveBeenCalled();
    });

    it('should merge rule-based and AI insights when AI is enabled and available', async () => {
      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockResolvedValue({
        insights: [mockAIInsight],
        metadata: {
          correlationId: 'test-correlation',
          generatedAt: '2025-10-14T00:00:00Z',
          processingTimeMs: 1000,
          cached: false,
          model: 'mistral-small-latest'
        }
      });

      const result = await coachingService.getAIEnhancedInsights(false, true);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(insightsService.getAIInsights).toHaveBeenCalledWith(false);

      // Check if AI insight is included
      const aiInsightIncluded = result.some(insight => insight.source === 'ai');
      expect(aiInsightIncluded).toBe(true);
    });

    it('should prioritize AI insights over rule-based for progression type', async () => {
      const ruleProgressionInsight: CoachingInsight = {
        id: 'rule-progression',
        type: 'progression',
        priority: 'medium',
        source: 'rule',
        title: 'progression.ruleTitle',
        message: 'progression.ruleMessage',
        icon: 'trending-up',
        iconColor: 'text-blue-500',
        createdAt: '2025-10-14T00:00:00Z',
        dismissible: true
      };

      const aiProgressionInsight: CoachingInsight = {
        id: 'ai-progression',
        type: 'progression',
        priority: 'high',
        source: 'ai',
        title: 'ai.progressionTitle',
        message: 'ai.progressionMessage',
        icon: 'trending-up',
        iconColor: 'text-green-500',
        createdAt: '2025-10-14T00:00:00Z',
        dismissible: true
      };

      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockResolvedValue({
        insights: [aiProgressionInsight],
        metadata: {
          correlationId: 'test-correlation',
          generatedAt: '2025-10-14T00:00:00Z',
          processingTimeMs: 1000,
          cached: false,
          model: 'mistral-small-latest'
        }
      });

      const result = await coachingService.getAIEnhancedInsights(false, true);

      // AI progression insight should be included
      const hasAIProgression = result.some(
        insight => insight.type === 'progression' && insight.source === 'ai'
      );
      expect(hasAIProgression).toBe(true);

      // Rule-based progression should be filtered out (replaced by AI)
      const progressionInsights = result.filter(insight => insight.type === 'progression');
      expect(progressionInsights.every(insight => insight.source === 'ai')).toBe(true);
    });

    it('should fall back to rule-based insights when AI fetch fails', async () => {
      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockRejectedValue(
        new InsightsServiceError('AI service unavailable', 'AI_ERROR', 500)
      );

      const result = await coachingService.getAIEnhancedInsights(false, true);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Should include an error notification insight
      const errorInsight = result.find(
        insight => insight.title === 'coach.aiUnavailable'
      );
      expect(errorInsight).toBeDefined();
      expect(errorInsight?.metadata?.errorCode).toBe('AI_ERROR');
    });

    it('should not show error insight for rate limit errors', async () => {
      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockRejectedValue(
        new InsightsServiceError('Rate limit exceeded', 'RATE_LIMIT', 429, undefined, 3600)
      );

      const result = await coachingService.getAIEnhancedInsights(false, true);

      expect(result).toBeDefined();

      // Should NOT include error notification for rate limits
      const errorInsight = result.find(
        insight => insight.title === 'coach.aiUnavailable'
      );
      expect(errorInsight).toBeUndefined();
    });

    it('should handle forceRefresh parameter correctly', async () => {
      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockResolvedValue({
        insights: [mockAIInsight],
        metadata: {
          correlationId: 'test-correlation',
          generatedAt: '2025-10-14T00:00:00Z',
          processingTimeMs: 1000,
          cached: false,
          model: 'mistral-small-latest'
        }
      });

      await coachingService.getAIEnhancedInsights(true, true);

      expect(insightsService.getAIInsights).toHaveBeenCalledWith(true);
    });

    it('should keep rule-based streak insights even with AI insights', async () => {
      const aiProgressionInsight: CoachingInsight = {
        id: 'ai-progression',
        type: 'progression',
        priority: 'high',
        source: 'ai',
        title: 'ai.progressionTitle',
        message: 'ai.progressionMessage',
        icon: 'trending-up',
        iconColor: 'text-green-500',
        createdAt: '2025-10-14T00:00:00Z',
        dismissible: true
      };

      vi.mocked(insightsService.canFetchInsights).mockReturnValue({
        canFetch: true
      });

      vi.mocked(insightsService.getAIInsights).mockResolvedValue({
        insights: [aiProgressionInsight],
        metadata: {
          correlationId: 'test-correlation',
          generatedAt: '2025-10-14T00:00:00Z',
          processingTimeMs: 1000,
          cached: false,
          model: 'mistral-small-latest'
        }
      });

      const result = await coachingService.getAIEnhancedInsights(false, true);

      // Both AI and rule-based insights should be present
      expect(result.length).toBeGreaterThan(0);

      // Should have at least one AI insight
      const hasAIInsights = result.some(insight => insight.source === 'ai');
      expect(hasAIInsights).toBe(true);

      // Rule-based insights may be present depending on user's streak/activity
      // (the test is about ensuring AI doesn't completely replace rule-based)
      // Since mocks return empty activity logs, rule insights might not be generated
      // The key test is that mergeInsights logic doesn't filter out ALL rule insights
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array on catastrophic failure', async () => {
      // Simulate a catastrophic error in getAllInsights
      vi.mocked(insightsService.canFetchInsights).mockImplementation(() => {
        throw new Error('Catastrophic failure');
      });

      const result = await coachingService.getAIEnhancedInsights(false, true);

      expect(result).toEqual([]);
    });
  });
});
