/**
 * useAIWorkoutFlow Hook
 *
 * Custom hook for managing AI workout onboarding flow state.
 * Handles form data, validation, navigation, and API submission.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OnboardingData,
  Screen1Data,
  Screen2Data,
  Screen3Data,
  Screen1ValidationErrors,
  Screen2ValidationErrors,
  Screen3ValidationErrors,
  AIWorkoutFlowState,
  GeneratedWorkout,
  AIWorkoutError,
  AIWorkoutRequest,
} from '../types/aiWorkout';
import {
  validateScreen1,
  validateScreen2,
  validateScreen3,
  hasErrors,
} from '../utils/aiWorkoutValidation';
import { aiWorkoutService, AIWorkoutServiceError } from '../services/aiWorkoutService';
import logger from '../utils/logger';

interface UseAIWorkoutFlowReturn {
  /** Current screen (1-3) */
  currentScreen: 1 | 2 | 3;
  /** Form data for all screens */
  data: Partial<OnboardingData>;
  /** Validation errors for current screen */
  errors: Screen1ValidationErrors | Screen2ValidationErrors | Screen3ValidationErrors;
  /** Whether currently submitting to API */
  isSubmitting: boolean;
  /** Whether API call succeeded */
  isSuccess: boolean;
  /** Generated workouts (if successful) */
  workouts: GeneratedWorkout[];
  /** Error from submission (if any) */
  submitError: AIWorkoutError | null;
  /** Update data for current screen */
  updateData: (screenData: Partial<Screen1Data | Screen2Data | Screen3Data>) => void;
  /** Navigate to next screen (validates first) */
  goNext: () => boolean;
  /** Navigate to previous screen */
  goBack: () => void;
  /** Submit final form data to API */
  submit: () => Promise<void>;
  /** Reset entire flow */
  reset: () => void;
}

/**
 * Hook for managing AI workout onboarding flow
 *
 * Provides state management, validation, and navigation for the 3-screen flow.
 */
export function useAIWorkoutFlow(): UseAIWorkoutFlowReturn {
  const { i18n } = useTranslation();
  const [state, setState] = useState<AIWorkoutFlowState>({
    currentScreen: 1,
    data: {},
    errors: {},
    isSubmitting: false,
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [workouts, setWorkouts] = useState<GeneratedWorkout[]>([]);
  const [submitError, setSubmitError] = useState<AIWorkoutError | null>(null);

  /**
   * Update data for current screen
   */
  const updateData = useCallback(
    (screenData: Partial<Screen1Data | Screen2Data | Screen3Data>) => {
      setState((prev) => {
        const screenKey = `screen${prev.currentScreen}` as keyof OnboardingData;
        return {
          ...prev,
          data: {
            ...prev.data,
            [screenKey]: {
              ...prev.data[screenKey],
              ...screenData,
            },
          },
          // Clear errors when data changes
          errors: {},
        };
      });
    },
    []
  );

  /**
   * Validate current screen data
   */
  const validateCurrentScreen = useCallback((): boolean => {
    const { currentScreen, data } = state;

    let errors: Screen1ValidationErrors | Screen2ValidationErrors | Screen3ValidationErrors = {};

    if (currentScreen === 1) {
      errors = validateScreen1(data.screen1 || {});
    } else if (currentScreen === 2) {
      errors = validateScreen2(data.screen2 || {});
    } else if (currentScreen === 3) {
      errors = validateScreen3(data.screen3 || {});
    }

    const isValid = !hasErrors(errors);

    if (!isValid) {
      logger.warn('[useAIWorkoutFlow] Validation failed for screen', currentScreen, errors);
      setState((prev) => ({ ...prev, errors }));
    }

    return isValid;
  }, [state]);

  /**
   * Navigate to next screen
   */
  const goNext = useCallback((): boolean => {
    if (!validateCurrentScreen()) {
      return false;
    }

    if (state.currentScreen < 3) {
      logger.log('[useAIWorkoutFlow] Navigating to screen', state.currentScreen + 1);
      setState((prev) => ({
        ...prev,
        currentScreen: (prev.currentScreen + 1) as 1 | 2 | 3,
        errors: {},
      }));
      return true;
    }

    return false;
  }, [state.currentScreen, validateCurrentScreen]);

  /**
   * Navigate to previous screen
   */
  const goBack = useCallback(() => {
    if (state.currentScreen > 1) {
      logger.log('[useAIWorkoutFlow] Navigating to screen', state.currentScreen - 1);
      setState((prev) => ({
        ...prev,
        currentScreen: (prev.currentScreen - 1) as 1 | 2 | 3,
        errors: {},
      }));
    }
  }, [state.currentScreen]);

  /**
   * Submit form data to API
   */
  const submit = useCallback(async () => {
    logger.log('[useAIWorkoutFlow] Submitting AI workout request');

    // Validate all screens
    if (!validateCurrentScreen()) {
      logger.error('[useAIWorkoutFlow] Validation failed on submit');
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true }));
    setSubmitError(null);

    try {
      // Build API request from form data
      const screen1 = state.data.screen1;
      const screen2 = state.data.screen2;
      const screen3 = state.data.screen3;

      if (!screen1 || !screen2 || !screen3) {
        throw new Error('Incomplete form data');
      }

      const request: AIWorkoutRequest = {
        responses: {
          gender: screen1.gender,
          age: screen1.age,
          height: screen1.height,
          weight: screen1.weight,
          goal: screen2.goal,
          fitnessLevel: screen2.fitnessLevel,
          trainingTime: screen2.trainingTime,
          injuries: screen3.injuries || '',
          trainingStyle: screen3.trainingStyle,
          timeAvailability: screen3.timeAvailability,
        },
        locale: i18n.language,
      };

      logger.log('[useAIWorkoutFlow] Calling AI workout service', {
        goal: request.responses.goal,
        fitnessLevel: request.responses.fitnessLevel,
        locale: request.locale,
      });

      // Call AI workout service
      const response = await aiWorkoutService.generateWorkouts(request);

      logger.log('[useAIWorkoutFlow] Workouts generated successfully', {
        count: response.workouts.length,
        correlationId: response.metadata.correlationId,
      });

      setWorkouts(response.workouts);
      setIsSuccess(true);
      setState((prev) => ({ ...prev, isSubmitting: false }));
    } catch (error: unknown) {
      logger.error('[useAIWorkoutFlow] Failed to generate workouts', error);

      // Handle AIWorkoutServiceError
      let aiError: AIWorkoutError;

      if (error instanceof AIWorkoutServiceError) {
        const errorMessage = aiWorkoutService.getErrorMessage(error, i18n.language);

        // Map error codes to AIWorkoutError types
        const errorTypeMap: Record<string, AIWorkoutError['type']> = {
          'UNAUTHORIZED': 'auth_required',
          'OFFLINE': 'network_error',
          'RATE_LIMIT': 'rate_limit',
          'VALIDATION_ERROR': 'validation_error',
          'AI_ERROR': 'ai_error',
          'TIMEOUT': 'timeout',
          'NETWORK_ERROR': 'network_error',
          'INVALID_RESPONSE': 'unknown_error',
          'NO_WORKOUTS': 'ai_error',
          'UNKNOWN_ERROR': 'unknown_error',
        };

        aiError = {
          type: errorTypeMap[error.code] || 'unknown_error',
          message: errorMessage,
          code: error.code,
          retryAfter: error.retryAfter,
        };
      } else {
        aiError = {
          type: 'unknown_error',
          message: 'Failed to generate workouts. Please try again.',
        };
      }

      setSubmitError(aiError);
      setState((prev) => ({ ...prev, isSubmitting: false, submitError: aiError.message }));
    }
  }, [state.data, validateCurrentScreen, i18n.language]);

  /**
   * Reset entire flow
   */
  const reset = useCallback(() => {
    logger.log('[useAIWorkoutFlow] Resetting flow');
    setState({
      currentScreen: 1,
      data: {},
      errors: {},
      isSubmitting: false,
    });
    setIsSuccess(false);
    setWorkouts([]);
    setSubmitError(null);
  }, []);

  return {
    currentScreen: state.currentScreen,
    data: state.data,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isSuccess,
    workouts,
    submitError,
    updateData,
    goNext,
    goBack,
    submit,
    reset,
  };
}
