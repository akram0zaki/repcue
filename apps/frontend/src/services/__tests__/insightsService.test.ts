/**
 * Unit tests for InsightsService
 * 
 * Tests AI insights fetching, caching, error handling, and authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { insightsService, InsightsServiceError } from '../insightsService';
import { supabase } from '../../config/supabase';
import { authService } from '../authService';
import { AnalyticsService } from '../analyticsService';
import type { CoachingInsight, AnalyticsSummary } from '../../types/coaching';

// Mock dependencies
vi.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('../authService', () => ({
  authService: {
    getAuthState: vi.fn()
  }
}));

// Create a shared mock function using vi.hoisted to make it available during hoisting  
const { mockGetAnalyticsSummary } = vi.hoisted(() => ({
  mockGetAnalyticsSummary: vi.fn()
}));

vi.mock('../analyticsService', () => ({
  AnalyticsService: {
    getInstance: vi.fn(() => ({
      getAnalyticsSummary: mockGetAnalyticsSummary
    }))
  }
}));

describe('InsightsService', () => {
  beforeEach(() => {
    // Only clear call history, don't reset implementations
    vi.mocked(authService.getAuthState).mockClear();
    vi.mocked(supabase.functions.invoke).mockClear();
    
    // Reset navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Clear cache before each test
    insightsService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAIInsights', () => {
    const mockAnalytics: AnalyticsSummary = {
      period: 'month',
      startDate: '2025-09-01T00:00:00Z',
      endDate: '2025-10-14T00:00:00Z',
      statistics: {
        totalWorkouts: 12,
        totalDuration: 3600,
        totalExercises: 30,
        totalReps: 500,
        averageWorkoutDuration: 300,
        workoutsPerWeek: 3,
        mostActiveDay: 'Monday',
        mostActiveCategory: 'general-fitness'
      },
      streak: {
        currentStreak: 5,
        longestStreak: 10,
        isActiveToday: true
      },
      muscleGroupBalance: [],
      personalRecords: [],
      trends: {
        workoutFrequency: 'improving',
        consistency: 0.8,
        variety: 0.6
      }
    };

    const mockInsights: CoachingInsight[] = [
      {
        id: 'insight-1',
        type: 'progression',
        priority: 'high',
        source: 'ai',
        title: 'ai.progressionOpportunity',
        message: 'ai.progressionMessage',
        icon: 'trending-up',
        iconColor: 'text-green-500',
        createdAt: '2025-10-14T00:00:00Z',
        dismissible: true
      }
    ];

    const mockResponse = {
      insights: mockInsights,
      metadata: {
        correlationId: 'test-correlation-id',
        generatedAt: '2025-10-14T00:00:00Z',
        processingTimeMs: 1500,
        cached: false,
        model: 'mistral-small-latest'
      }
    };

    it('should fetch AI insights successfully when authenticated and online', async () => {
      // Mock auth state
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      // Mock analytics data
      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      // Mock edge function response
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await insightsService.getAIInsights();

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].id).toBe('insight-1');
      expect(result.metadata.correlationId).toBe('test-correlation-id');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('analyze-progress', {
        body: { analytics: mockAnalytics }
      });
    });

    it('should throw UNAUTHORIZED error when user is not authenticated', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: false,
        accessToken: undefined,
        user: undefined,
        session: undefined
      });

      await expect(insightsService.getAIInsights()).rejects.toThrow(InsightsServiceError);
      await expect(insightsService.getAIInsights()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    });

    it('should throw OFFLINE error when user is offline', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      });

      await expect(insightsService.getAIInsights()).rejects.toThrow(InsightsServiceError);
      await expect(insightsService.getAIInsights()).rejects.toMatchObject({
        code: 'OFFLINE',
        statusCode: 0
      });
    });

    it('should return cached insights when cache is valid', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // First call - should fetch from API
      const result1 = await insightsService.getAIInsights();
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);

      // Second call - should return cached result
      const result2 = await insightsService.getAIInsights();
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1); // Still 1 call
      expect(result2.insights).toEqual(result1.insights);
      expect(result2.metadata.cached).toBe(true);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // First call
      await insightsService.getAIInsights();
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);

      // Second call with forceRefresh
      await insightsService.getAIInsights(true);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    it('should throw RATE_LIMIT error when rate limited', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      const errorResponse = {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in 45 minutes.',
        correlationId: 'rate-limit-correlation',
        retryAfter: 2700
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          context: errorResponse
        }
      });

      await expect(insightsService.getAIInsights()).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        statusCode: 429,
        retryAfter: 2700
      });
    });

    it('should throw AI_ERROR when AI analysis fails', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      const errorResponse = {
        error: 'AI_ANALYSIS_FAILED',
        message: 'AI analysis failed. Please try again.',
        correlationId: 'ai-error-correlation'
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: {
          message: 'AI analysis failed',
          context: errorResponse
        }
      });

      await expect(insightsService.getAIInsights()).rejects.toMatchObject({
        code: 'AI_ERROR',
        statusCode: 500
      });
    });

    it('should throw INVALID_RESPONSE when response format is invalid', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { invalid: 'format' }, // Missing insights array
        error: null
      });

      await expect(insightsService.getAIInsights()).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
        statusCode: 500
      });
    });

    it('should handle empty insights array gracefully', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      const emptyResponse = {
        insights: [],
        metadata: {
          correlationId: 'empty-correlation',
          generatedAt: '2025-10-14T00:00:00Z',
          processingTimeMs: 1000,
          cached: false,
          model: 'mistral-small-latest'
        }
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: emptyResponse,
        error: null
      });

      const result = await insightsService.getAIInsights();
      expect(result.insights).toHaveLength(0);
    });
  });

  describe('canFetchInsights', () => {
    it('should return canFetch=true when authenticated and online', () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      const result = insightsService.canFetchInsights();
      expect(result.canFetch).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return canFetch=false when not authenticated', () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: false,
        accessToken: undefined,
        user: undefined,
        session: undefined
      });

      const result = insightsService.canFetchInsights();
      expect(result.canFetch).toBe(false);
      expect(result.reason).toContain('signed in');
    });

    it('should return canFetch=false when offline', () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      });

      const result = insightsService.canFetchInsights();
      expect(result.canFetch).toBe(false);
      expect(result.reason).toContain('online');
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct message for UNAUTHORIZED error', () => {
      const error = new InsightsServiceError('Auth error', 'UNAUTHORIZED', 401);
      const message = insightsService.getErrorMessage(error);
      expect(message).toContain('signed in');
    });

    it('should return correct message for RATE_LIMIT error', () => {
      const error = new InsightsServiceError('Rate limit', 'RATE_LIMIT', 429, undefined, 3600);
      const message = insightsService.getErrorMessage(error);
      expect(message).toContain('60 minutes');
    });

    it('should return correct message for OFFLINE error', () => {
      const error = new InsightsServiceError('Offline', 'OFFLINE', 0);
      const message = insightsService.getErrorMessage(error);
      expect(message).toContain('online');
    });

    it('should return generic message for UNKNOWN_ERROR', () => {
      const error = new InsightsServiceError('Unknown', 'UNKNOWN_ERROR', 500);
      const message = insightsService.getErrorMessage(error);
      expect(message).toContain('unexpected error');
    });
  });

  describe('cache management', () => {
    it('should clear cache when clearCache is called', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      const mockAnalytics: AnalyticsSummary = {
        period: 'month',
        startDate: '2025-09-01T00:00:00Z',
        endDate: '2025-10-14T00:00:00Z',
        statistics: {
          totalWorkouts: 12,
          totalDuration: 3600,
          totalExercises: 30,
          totalReps: 500,
          averageWorkoutDuration: 300,
          workoutsPerWeek: 3,
          mostActiveDay: 'Monday',
          mostActiveCategory: 'general-fitness'
        },
        streak: {
          currentStreak: 5,
          longestStreak: 10,
          isActiveToday: true
        },
        muscleGroupBalance: [],
        personalRecords: [],
        trends: {
          workoutFrequency: 'improving',
          consistency: 0.8,
          variety: 0.6
        }
      };

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          insights: [],
          metadata: {
            correlationId: 'test',
            generatedAt: '2025-10-14T00:00:00Z',
            processingTimeMs: 100,
            cached: false,
            model: 'mistral-small-latest'
          }
        },
        error: null
      });

      // First call to populate cache
      await insightsService.getAIInsights();
      expect(insightsService.hasCachedInsights()).toBe(true);

      // Clear cache
      insightsService.clearCache();
      expect(insightsService.hasCachedInsights()).toBe(false);
    });

    it('should return cache age correctly', async () => {
      vi.mocked(authService.getAuthState).mockReturnValue({
        isAuthenticated: true,
        accessToken: 'test-token',
        user: undefined,
        session: undefined
      });

      const mockAnalytics: AnalyticsSummary = {
        period: 'month',
        startDate: '2025-09-01T00:00:00Z',
        endDate: '2025-10-14T00:00:00Z',
        statistics: {
          totalWorkouts: 12,
          totalDuration: 3600,
          totalExercises: 30,
          totalReps: 500,
          averageWorkoutDuration: 300,
          workoutsPerWeek: 3,
          mostActiveDay: 'Monday',
          mostActiveCategory: 'general-fitness'
        },
        streak: {
          currentStreak: 5,
          longestStreak: 10,
          isActiveToday: true
        },
        muscleGroupBalance: [],
        personalRecords: [],
        trends: {
          workoutFrequency: 'improving',
          consistency: 0.8,
          variety: 0.6
        }
      };

      mockGetAnalyticsSummary.mockResolvedValue(mockAnalytics);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          insights: [],
          metadata: {
            correlationId: 'test',
            generatedAt: new Date().toISOString(),
            processingTimeMs: 100,
            cached: false,
            model: 'mistral-small-latest'
          }
        },
        error: null
      });

      expect(insightsService.getCacheAge()).toBeNull();

      await insightsService.getAIInsights();
      
      const age = insightsService.getCacheAge();
      expect(age).not.toBeNull();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should not have cached insights initially', () => {
      expect(insightsService.hasCachedInsights()).toBe(false);
    });
  });
});
