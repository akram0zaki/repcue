/**
 * AI Workout Service
 *
 * Frontend API client for the generate-ai-workout Edge Function.
 * Handles AI workout generation requests with proper error handling and retries.
 */

import { supabase } from '../config/supabase';
import type { AIWorkoutRequest, AIWorkoutResponse, GeneratedWorkout } from '../types/aiWorkout';
import { authService } from './authService';
import logger from '../utils/logger';

/**
 * Internal response structure from the Edge Function
 * (includes metadata that gets transformed to public AIWorkoutResponse)
 */
interface EdgeFunctionResponse {
  workouts: GeneratedWorkout[];
  feedback?: string;
  metadata: {
    correlationId: string;
    generatedAt: string;
    processingTimeMs: number;
  };
}

/**
 * Error response from Edge Function
 */
interface AIWorkoutErrorResponse {
  error: string;
  message: string;
  correlationId?: string;
  errors?: string[];
  retryAfter?: number;
}

/**
 * Service error with additional context
 */
export class AIWorkoutServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public correlationId?: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AIWorkoutServiceError';
  }
}

/**
 * AI Workout Service - singleton pattern
 */
class AIWorkoutService {
  private static instance: AIWorkoutService;
  private readonly TIMEOUT_MS = 90000; // 90 seconds (AI can take time)

  private constructor() {}

  public static getInstance(): AIWorkoutService {
    if (!AIWorkoutService.instance) {
      AIWorkoutService.instance = new AIWorkoutService();
    }
    return AIWorkoutService.instance;
  }

  /**
   * Generates AI workouts based on user profile
   *
   * @param request - User profile and preferences
   * @returns Generated workouts with metadata
   * @throws AIWorkoutServiceError for all error cases
   */
  async generateWorkouts(request: AIWorkoutRequest): Promise<AIWorkoutResponse> {
    const startTime = Date.now();

    try {
      // Validate authentication
      const authState = authService.getAuthState();
      if (!authState.isAuthenticated || !authState.accessToken) {
        throw new AIWorkoutServiceError(
          'You must be signed in to generate AI workouts',
          'UNAUTHORIZED',
          401
        );
      }

      // Validate online status
      if (!navigator.onLine) {
        throw new AIWorkoutServiceError(
          'You must be online to generate AI workouts',
          'OFFLINE',
          0
        );
      }

      logger.log('[AIWorkoutService] Generating workouts', {
        goals: request.responses.goals,
        fitnessLevel: request.responses.fitnessLevel,
        locale: request.locale
      });
      // Debug: Log full request for troubleshooting
      logger.log('[AIWorkoutService] Full request payload', {
        request: JSON.stringify(request, null, 2)
      });

      // Call Edge Function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
          'generate-ai-workout',
          {
            body: request,
          }
        );

        clearTimeout(timeoutId);

        // Handle Edge Function errors
        if (error) {
          logger.error('[AIWorkoutService] Edge Function error', {
            error: error.message,
            context: error.context
          });

          // Parse error response from Response object
          let errorResponse: AIWorkoutErrorResponse | undefined;

          try {
            if (error.context && typeof error.context === 'object' && 'json' in error.context) {
              // error.context is a Response object - parse it
              const response = error.context as Response;
              errorResponse = await response.json();
            } else if (error.context && typeof error.context === 'object') {
              // error.context is already parsed
              errorResponse = error.context as AIWorkoutErrorResponse;
            }
          } catch (parseError) {
            logger.warn('[AIWorkoutService] Failed to parse error response', { parseError });
          }

          // Log detailed error for debugging
          if (errorResponse) {
            logger.error('[AIWorkoutService] Error response details', {
              message: errorResponse.message,
              errors: errorResponse.errors,
              correlationId: errorResponse.correlationId,
              retryAfter: errorResponse.retryAfter
            });
          }

          if (errorResponse) {
            // Rate limit error
            if (error.message.includes('Rate limit') || errorResponse.retryAfter) {
              throw new AIWorkoutServiceError(
                errorResponse.message || 'Rate limit exceeded. Please try again later.',
                'RATE_LIMIT',
                429,
                errorResponse.correlationId,
                errorResponse.retryAfter
              );
            }

            // Validation error
            if (error.message.includes('Invalid request') || errorResponse.errors) {
              const validationMessage = errorResponse.errors 
                ? `Validation failed: ${errorResponse.errors.join(', ')}`
                : errorResponse.message || 'Request validation failed';
              
              throw new AIWorkoutServiceError(
                validationMessage,
                'VALIDATION_ERROR',
                400,
                errorResponse.correlationId
              );
            }

            // AI provider error
            if (error.message.includes('AI') || error.message.includes('generation failed')) {
              throw new AIWorkoutServiceError(
                'AI workout generation failed. Please try again.',
                'AI_ERROR',
                500,
                errorResponse.correlationId
              );
            }
          }

          // Generic error - include response message if available
          const errorMsg = errorResponse?.message || error.message || 'Failed to generate workouts';
          throw new AIWorkoutServiceError(
            errorMsg,
            'UNKNOWN_ERROR',
            500,
            errorResponse?.correlationId
          );
        }

        // Handle missing data
        if (!data || !data.workouts || !Array.isArray(data.workouts)) {
          logger.error('[AIWorkoutService] Invalid response format', { data });
          throw new AIWorkoutServiceError(
            'Received invalid response from server',
            'INVALID_RESPONSE',
            500
          );
        }

        // Validate workouts
        if (data.workouts.length === 0) {
          logger.warn('[AIWorkoutService] No workouts generated', { data });
          throw new AIWorkoutServiceError(
            'AI did not generate any workouts. Please try again with different preferences.',
            'NO_WORKOUTS',
            500
          );
        }

        const duration = Date.now() - startTime;
        logger.log('[AIWorkoutService] Workouts generated successfully', {
          count: data.workouts.length,
          durationMs: duration,
          correlationId: data.metadata?.correlationId
        });

        // Transform EdgeFunctionResponse to public AIWorkoutResponse interface
        return {
          workouts: data.workouts,
          feedback: data.feedback,
          generationId: data.metadata.correlationId
        };

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error('[AIWorkoutService] Request timeout', { timeoutMs: this.TIMEOUT_MS });
          throw new AIWorkoutServiceError(
            'Request timed out. The AI is taking longer than expected. Please try again.',
            'TIMEOUT',
            408
          );
        }

        // Re-throw AIWorkoutServiceError
        if (fetchError instanceof AIWorkoutServiceError) {
          throw fetchError;
        }

        // Network error
        if (fetchError instanceof Error && (fetchError.message?.includes('network') || fetchError.message?.includes('fetch'))) {
          logger.error('[AIWorkoutService] Network error', { error: fetchError.message });
          throw new AIWorkoutServiceError(
            'Network error. Please check your connection and try again.',
            'NETWORK_ERROR',
            0
          );
        }

        // Unknown error
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const errorStack = fetchError instanceof Error ? fetchError.stack : undefined;
        logger.error('[AIWorkoutService] Unknown error', {
          error: errorMessage,
          stack: errorStack
        });
        throw new AIWorkoutServiceError(
          'An unexpected error occurred. Please try again.',
          'UNKNOWN_ERROR',
          500
        );
      }

    } catch (error: unknown) {
      // Re-throw AIWorkoutServiceError
      if (error instanceof AIWorkoutServiceError) {
        throw error;
      }

      // Wrap unknown errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('[AIWorkoutService] Unexpected error in generateWorkouts', {
        error: errorMessage,
        stack: errorStack
      });
      throw new AIWorkoutServiceError(
        errorMessage || 'An unexpected error occurred',
        'UNKNOWN_ERROR',
        500
      );
    }
  }

  /**
   * Checks if the user can generate workouts (online + authenticated)
   */
  canGenerateWorkouts(): { canGenerate: boolean; reason?: string } {
    const authState = authService.getAuthState();

    if (!authState.isAuthenticated) {
      return {
        canGenerate: false,
        reason: 'You must be signed in to generate AI workouts'
      };
    }

    if (!navigator.onLine) {
      return {
        canGenerate: false,
        reason: 'You must be online to generate AI workouts'
      };
    }

    return { canGenerate: true };
  }

  /**
   * Gets user-friendly error message from error code
   */
  getErrorMessage(error: AIWorkoutServiceError, _locale: string = 'en'): string {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'You must be signed in to generate AI workouts.';
      case 'OFFLINE':
        return 'You must be online to generate AI workouts. Please check your connection.';
      case 'RATE_LIMIT':
        return error.retryAfter
          ? `You've reached the limit for AI workout generation. Please try again in ${Math.ceil(error.retryAfter / 60)} minutes.`
          : 'You\'ve reached the limit for AI workout generation. Please try again later.';
      case 'VALIDATION_ERROR':
        return 'The information you provided is invalid. Please check your answers and try again.';
      case 'AI_ERROR':
        return 'AI workout generation failed. Please try again.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      case 'INVALID_RESPONSE':
        return 'Received invalid response from server. Please try again.';
      case 'NO_WORKOUTS':
        return 'AI did not generate any workouts. Please try again with different preferences.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Export singleton instance
export const aiWorkoutService = AIWorkoutService.getInstance();
