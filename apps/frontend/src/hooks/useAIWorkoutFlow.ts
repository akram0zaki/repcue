/**
 * useAIWorkoutFlow Hook
 *
 * Custom hook for managing AI workout onboarding flow state.
 * Handles form data, validation, navigation, and API submission.
 */

import { useState, useCallback, useEffect } from 'react';
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
import type { Workout, Weekday } from '../types';
import {
  validateScreen1,
  validateScreen2,
  validateScreen3,
  hasErrors,
} from '../utils/aiWorkoutValidation';
import { aiWorkoutService, AIWorkoutServiceError } from '../services/aiWorkoutService';
import { StorageService } from '../services/storageService';
import {
  profileToScreen1,
  profileToScreen2,
  profileToScreen3,
  formDataToProfile,
} from '../utils/profileConversion';
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
  /** AI-generated feedback for the user */
  feedback: string | null;
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<AIWorkoutError | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  /**
   * Load user profile on mount and pre-populate form if it exists
   */
  useEffect(() => {
    const loadProfile = async () => {
      if (profileLoaded) return;

      try {
        const storageService = StorageService.getInstance();
        const profile = await storageService.getUserProfile();

        if (profile) {
          logger.log('[useAIWorkoutFlow] Loaded user profile, pre-populating form');

          const screen1 = profileToScreen1(profile);
          const screen2 = profileToScreen2(profile);
          const screen3 = profileToScreen3(profile);

          setState((prev) => ({
            ...prev,
            data: {
              screen1: { ...prev.data.screen1, ...screen1 } as Screen1Data,
              screen2: { ...prev.data.screen2, ...screen2 } as Screen2Data,
              screen3: { ...prev.data.screen3, ...screen3, saveToProfile: true } as Screen3Data,
            },
          }));

          logger.log('[useAIWorkoutFlow] Form pre-populated from profile');
        } else {
          logger.log('[useAIWorkoutFlow] No profile found, starting with empty form');
          // Set default saveToProfile to true for new users
          setState((prev) => ({
            ...prev,
            data: {
              ...prev.data,
              screen3: { ...prev.data.screen3, saveToProfile: true } as Screen3Data,
            },
          }));
        }

        setProfileLoaded(true);
      } catch (error) {
        logger.error('[useAIWorkoutFlow] Failed to load profile:', error);
        setProfileLoaded(true); // Mark as loaded even on error to prevent retry loops
      }
    };

    loadProfile();
  }, [profileLoaded]);

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
          goals: screen2.goals,
          goalDuration: screen2.goalDuration,
          fitnessLevel: screen2.fitnessLevel,
          trainingTime: screen2.trainingTime,
          injuries: screen3.injuries || '',
          trainingStyle: screen3.trainingStyle,
          timeAvailability: screen3.timeAvailability,
        },
        locale: i18n.language,
      };

      logger.log('[useAIWorkoutFlow] Calling AI workout service', {
        goals: request.responses.goals,
        goalDuration: request.responses.goalDuration,
        fitnessLevel: request.responses.fitnessLevel,
        locale: request.locale,
      });

      // Call AI workout service
      const response = await aiWorkoutService.generateWorkouts(request);

      logger.log('[useAIWorkoutFlow] Workouts generated successfully', {
        count: response.workouts.length,
        generationId: response.generationId,
      });

      // Save workouts to IndexedDB
      // Convert GeneratedWorkout format to Workout format
      const storageService = StorageService.getInstance();
      for (const generatedWorkout of response.workouts) {
        logger.debug('[useAIWorkoutFlow] Converting workout', {
          id: generatedWorkout.id,
          name: generatedWorkout.name,
          exerciseCount: generatedWorkout.exercises.length,
          firstExercise: generatedWorkout.exercises[0],
        });

        const workout: Workout = {
          id: generatedWorkout.id,
          name: generatedWorkout.name,
          description: generatedWorkout.description,
          exercises: generatedWorkout.exercises.map((ex, index) => {
            logger.debug('[useAIWorkoutFlow] Converting exercise', {
              index,
              exerciseId: ex.exerciseId,
              order: ex.order,
            });
            return {
              id: `${generatedWorkout.id}-ex-${index}`,
              exercise_id: ex.exerciseId,
              order: ex.order,
              custom_sets: ex.customSets,
              custom_reps: ex.customReps,
              custom_duration: ex.customDuration,
              custom_rest_time: ex.customRestTime,
            };
          }),
          scheduled_days: (generatedWorkout.scheduledDays || []) as Weekday[],
          is_active: true,
          estimated_duration: generatedWorkout.estimatedDuration,
          // Sync metadata
          owner_id: null, // Will be set by StorageService based on auth
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          deleted: false,
          version: 1,
          dirty: 1, // Mark as dirty for sync
          op: 'upsert' as const,
        };

        logger.debug('[useAIWorkoutFlow] Saving workout to IndexedDB', {
          id: workout.id,
          exerciseIds: workout.exercises.map(e => e.exercise_id),
        });

        await storageService.saveWorkout(workout);
      }

      logger.log('[useAIWorkoutFlow] Workouts saved to IndexedDB', {
        count: response.workouts.length,
      });

      // Save to user profile if checkbox is selected
      if (screen3.saveToProfile) {
        logger.log('[useAIWorkoutFlow] Saving form data to user profile');
        const profileData = formDataToProfile(screen1, screen2, screen3);
        logger.log('[useAIWorkoutFlow] Profile data to save:', {
          birth_year: profileData.birth_year,
          hasFitness: !!profileData.fitness,
          fitness: profileData.fitness
        });
        const profileSaved = await storageService.saveUserProfile(profileData);
        
        if (profileSaved) {
          logger.log('[useAIWorkoutFlow] Profile updated successfully');
          // Verify what was saved
          const savedProfile = await storageService.getUserProfile();
          logger.log('[useAIWorkoutFlow] Verified saved profile has fitness data:', {
            hasFitness: !!savedProfile?.fitness,
            fitnessKeys: savedProfile?.fitness ? Object.keys(savedProfile.fitness) : []
          });
        } else {
          logger.warn('[useAIWorkoutFlow] Failed to save profile');
        }
      } else {
        logger.log('[useAIWorkoutFlow] Skipping profile save (checkbox unchecked)');
      }

      setWorkouts(response.workouts);
      // Feedback property removed from AIWorkoutResponse interface per design decision
      // Setting to null to maintain hook state consistency
      setFeedback(response.feedback || null);
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
    setFeedback(null);
    setSubmitError(null);
  }, []);

  return {
    currentScreen: state.currentScreen,
    data: state.data,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isSuccess,
    workouts,
    feedback,
    submitError,
    updateData,
    goNext,
    goBack,
    submit,
    reset,
  };
}
