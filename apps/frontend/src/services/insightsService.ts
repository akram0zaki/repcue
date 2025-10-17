/**
 * Insights Service - Frontend API client for AI-powered coaching insights
 *
 * Handles communication with the analyze-progress Edge Function to fetch
 * AI-generated coaching insights based on user analytics data.
 *
 * Features:
 * - JWT authentication with automatic token handling
 * - 24-hour client-side caching (aligned with server-side cache)
 * - Graceful error handling with detailed error types
 * - Rate limiting awareness (10 requests/hour per user)
 * - Offline detection
 * - Integration with AnalyticsService for data aggregation
 */

import { supabase } from '../config/supabase';
import type { CoachingInsight, AnalyticsSummary } from '../types/coaching';
import { authService } from './authService';
import { AnalyticsService } from './analyticsService';
import logger from '../utils/logger';

/**
 * Response from analyze-progress Edge Function
 */
interface AIInsightsResponse {
  insights: CoachingInsight[];
  metadata: {
    correlationId: string;
    generatedAt: string;
    processingTimeMs: number;
    cached: boolean;
    model: string;
  };
}

/**
 * Error response from Edge Function
 */
interface AIInsightsErrorResponse {
  error: string;
  message: string;
  correlationId?: string;
  retryAfter?: number;
}

/**
 * Client-side cache entry for AI insights
 */
interface InsightCache {
  insights: CoachingInsight[];
  analytics: AnalyticsSummary;
  generatedAt: string;
  expiresAt: string;
  correlationId: string;
}

/**
 * Service error with additional context
 */
export class InsightsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public correlationId?: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'InsightsServiceError';
  }
}

/**
 * Insights Service - singleton pattern
 */
class InsightsService {
  private static instance: InsightsService;
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours (aligned with server)
  private cache: InsightCache | null = null;
  private analyticsService: AnalyticsService;

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
  }

  public static getInstance(): InsightsService {
    if (!InsightsService.instance) {
      InsightsService.instance = new InsightsService();
    }
    return InsightsService.instance;
  }

  /**
   * Fetches AI-powered coaching insights for the current user
   *
   * @param forceRefresh - Bypass cache and fetch fresh insights
   * @param locale - User's preferred language for AI responses (defaults to 'en')
   * @returns AI-generated coaching insights with metadata
   * @throws InsightsServiceError for all error cases
   */
  async getAIInsights(forceRefresh: boolean = false, locale: string = 'en'): Promise<AIInsightsResponse> {
    const startTime = Date.now();

    try {
      // Validate authentication
      const authState = authService.getAuthState();
      if (!authState.isAuthenticated || !authState.accessToken) {
        throw new InsightsServiceError(
          'You must be signed in to access AI insights',
          'UNAUTHORIZED',
          401
        );
      }

      // Validate online status
      if (!navigator.onLine) {
        throw new InsightsServiceError(
          'You must be online to fetch AI insights',
          'OFFLINE',
          0
        );
      }

      // Check cache unless force refresh
      if (!forceRefresh) {
        const cachedInsights = this.getCachedInsights(locale);
        if (cachedInsights) {
          logger.log('[InsightsService] Returning cached AI insights', {
            count: cachedInsights.insights.length,
            correlationId: cachedInsights.metadata.correlationId,
            age: this.getCacheAge()
          });
          return cachedInsights;
        }
      }

      logger.log('[InsightsService] Fetching fresh AI insights');

      // Fetch user analytics data for the request
      const analytics = await this.analyticsService.getAnalyticsSummary('month', undefined, locale);

      logger.log('[InsightsService] Analytics data prepared', {
        workouts: analytics.statistics.totalWorkouts,
        streak: analytics.streak.currentStreak,
        muscleGroups: analytics.muscleGroupBalance.length,
        locale: analytics.locale
      });

      // Call Edge Function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const { data, error } = await supabase.functions.invoke<AIInsightsResponse>(
          'analyze-progress',
          {
            body: { analytics },
          }
        );

        clearTimeout(timeoutId);

        // Handle Edge Function errors
        if (error) {
          logger.error('[InsightsService] Edge Function error', {
            error: error.message,
            context: error.context
          });

          // Parse error response
          let errorResponse: AIInsightsErrorResponse | undefined;

          try {
            if (error.context && typeof error.context === 'object' && 'json' in error.context) {
              // error.context is a Response object - parse it
              const response = error.context as Response;
              errorResponse = await response.json();
            } else if (error.context && typeof error.context === 'object') {
              // error.context is already parsed
              errorResponse = error.context as AIInsightsErrorResponse;
            }
          } catch (parseError) {
            logger.warn('[InsightsService] Failed to parse error response', { parseError });
          }

          // Log detailed error for debugging
          if (errorResponse) {
            logger.error('[InsightsService] Error response details', {
              message: errorResponse.message,
              correlationId: errorResponse.correlationId,
              retryAfter: errorResponse.retryAfter
            });
          }

          if (errorResponse) {
            // Rate limit error (10 requests/hour)
            if (error.message.includes('Rate limit') || errorResponse.retryAfter) {
              throw new InsightsServiceError(
                errorResponse.message || 'Rate limit exceeded. You can request AI insights once per hour.',
                'RATE_LIMIT',
                429,
                errorResponse.correlationId,
                errorResponse.retryAfter
              );
            }

            // AI provider error
            if (error.message.includes('AI') || error.message.includes('analysis failed')) {
              throw new InsightsServiceError(
                'AI analysis failed. Please try again.',
                'AI_ERROR',
                500,
                errorResponse.correlationId
              );
            }
          }

          // Generic error - include response message if available
          const errorMsg = errorResponse?.message || error.message || 'Failed to fetch AI insights';
          throw new InsightsServiceError(
            errorMsg,
            'UNKNOWN_ERROR',
            500,
            errorResponse?.correlationId
          );
        }

        // Handle missing data
        if (!data || !data.insights || !Array.isArray(data.insights)) {
          logger.error('[InsightsService] Invalid response format', { data });
          throw new InsightsServiceError(
            'Received invalid response from server',
            'INVALID_RESPONSE',
            500
          );
        }

        // Validate insights array (can be empty if no actionable insights)
        if (data.insights.length === 0) {
          logger.log('[InsightsService] No AI insights generated', { data });
        }

        const duration = Date.now() - startTime;
        logger.log('[InsightsService] AI insights fetched successfully', {
          count: data.insights.length,
          durationMs: duration,
          correlationId: data.metadata?.correlationId,
          cached: data.metadata?.cached
        });

        // Ensure all AI insights have unique IDs (backend may not provide them)
        // Generate stable IDs based on insight content + correlation ID
        data.insights = data.insights.map((insight, index) => {
          if (!insight.id) {
            // Generate stable ID: ai-{correlationId}-{index}
            const generatedId = `ai-${data.metadata.correlationId}-${index}`;
            logger.warn('[InsightsService] AI insight missing ID, generated:', {
              originalTitle: insight.title,
              generatedId
            });
            return { ...insight, id: generatedId };
          }
          return insight;
        });

        // Cache the response (24h TTL aligned with server cache)
        this.setCachedInsights(data, analytics);

        return data;

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error('[InsightsService] Request timeout', { timeoutMs: this.TIMEOUT_MS });
          throw new InsightsServiceError(
            'Request timed out. Please try again.',
            'TIMEOUT',
            408
          );
        }

        // Re-throw InsightsServiceError
        if (fetchError instanceof InsightsServiceError) {
          throw fetchError;
        }

        // Network error
        if (fetchError instanceof Error && (fetchError.message?.includes('network') || fetchError.message?.includes('fetch'))) {
          logger.error('[InsightsService] Network error', { error: fetchError.message });
          throw new InsightsServiceError(
            'Network error. Please check your connection and try again.',
            'NETWORK_ERROR',
            0
          );
        }

        // Unknown error
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const errorStack = fetchError instanceof Error ? fetchError.stack : undefined;
        logger.error('[InsightsService] Unknown error', {
          error: errorMessage,
          stack: errorStack
        });
        throw new InsightsServiceError(
          'An unexpected error occurred. Please try again.',
          'UNKNOWN_ERROR',
          500
        );
      }

    } catch (error: unknown) {
      // Re-throw InsightsServiceError
      if (error instanceof InsightsServiceError) {
        throw error;
      }

      // Wrap unknown errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('[InsightsService] Unexpected error in getAIInsights', {
        error: errorMessage,
        stack: errorStack
      });
      throw new InsightsServiceError(
        errorMessage || 'An unexpected error occurred',
        'UNKNOWN_ERROR',
        500
      );
    }
  }

  /**
   * Checks if the user can fetch AI insights (online + authenticated + not rate limited)
   */
  canFetchInsights(): { canFetch: boolean; reason?: string } {
    const authState = authService.getAuthState();

    if (!authState.isAuthenticated) {
      return {
        canFetch: false,
        reason: 'You must be signed in to access AI insights'
      };
    }

    if (!navigator.onLine) {
      return {
        canFetch: false,
        reason: 'You must be online to fetch AI insights'
      };
    }

    return { canFetch: true };
  }

  /**
   * Gets user-friendly error message from error code
   */
  getErrorMessage(error: InsightsServiceError, _locale: string = 'en'): string {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'You must be signed in to access AI insights.';
      case 'OFFLINE':
        return 'You must be online to fetch AI insights. Please check your connection.';
      case 'RATE_LIMIT':
        return error.retryAfter
          ? `You've reached the hourly limit for AI insights. Please try again in ${Math.ceil(error.retryAfter / 60)} minutes.`
          : 'You\'ve reached the hourly limit for AI insights. Please try again later.';
      case 'AI_ERROR':
        return 'AI analysis failed. Please try again.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      case 'INVALID_RESPONSE':
        return 'Received invalid response from server. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Clears the client-side cache
   */
  clearCache(): void {
    this.cache = null;
    logger.log('[InsightsService] Cache cleared');
  }

  /**
   * Gets the age of the cache in milliseconds
   */
  getCacheAge(): number | null {
    if (!this.cache) return null;
    return Date.now() - new Date(this.cache.generatedAt).getTime();
  }

  /**
   * Checks if cache exists and is valid
   */
  hasCachedInsights(): boolean {
    return this.getCachedInsights() !== null;
  }

  // ============= Private Cache Management Methods =============

  /**
   * Gets cached insights if available and not expired
   * Cache is invalidated if locale has changed
   */
  private getCachedInsights(currentLocale?: string): AIInsightsResponse | null {
    if (!this.cache) return null;

    const now = new Date();
    const expiresAt = new Date(this.cache.expiresAt);

    if (now > expiresAt) {
      // Cache expired, clear it
      logger.log('[InsightsService] Cache expired', {
        generatedAt: this.cache.generatedAt,
        expiresAt: this.cache.expiresAt
      });
      this.cache = null;
      return null;
    }

    // Invalidate cache if locale has changed
    if (currentLocale && this.cache.analytics.locale !== currentLocale) {
      logger.log('[InsightsService] Cache invalidated due to locale change', {
        cachedLocale: this.cache.analytics.locale,
        currentLocale: currentLocale
      });
      this.cache = null;
      return null;
    }

    // Ensure cached insights have IDs (defensive check for legacy cache)
    const insights = this.cache.insights.map((insight, index) => {
      if (!insight.id) {
        const generatedId = `ai-${this.cache!.correlationId}-${index}`;
        logger.warn('[InsightsService] Cached insight missing ID, generated:', {
          originalTitle: insight.title,
          generatedId
        });
        return { ...insight, id: generatedId };
      }
      return insight;
    });

    // Return cached data in the expected response format
    return {
      insights,
      metadata: {
        correlationId: this.cache.correlationId,
        generatedAt: this.cache.generatedAt,
        processingTimeMs: 0, // Not tracked for cached responses
        cached: true,
        model: 'mistral-small-latest' // Known from edge function
      }
    };
  }

  /**
   * Stores insights in cache with 24h expiration
   */
  private setCachedInsights(response: AIInsightsResponse, analytics: AnalyticsSummary): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_MS);

    this.cache = {
      insights: response.insights,
      analytics,
      generatedAt: response.metadata.generatedAt,
      expiresAt: expiresAt.toISOString(),
      correlationId: response.metadata.correlationId
    };

    logger.log('[InsightsService] Insights cached', {
      count: response.insights.length,
      expiresAt: expiresAt.toISOString(),
      correlationId: response.metadata.correlationId
    });
  }
}

// Export singleton instance
export const insightsService = InsightsService.getInstance();
