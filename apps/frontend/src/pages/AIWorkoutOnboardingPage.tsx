/**
 * AIWorkoutOnboardingPage
 *
 * Main page orchestrating the 3-screen AI workout onboarding flow.
 * Handles state management, navigation, validation, and API submission.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AIWorkoutProgressIndicator from '../components/AIWorkoutProgressIndicator';
import AIWorkoutScreen1 from '../components/AIWorkoutScreen1';
import AIWorkoutScreen2 from '../components/AIWorkoutScreen2';
import AIWorkoutScreen3 from '../components/AIWorkoutScreen3';
import AIWorkoutLoadingState from '../components/AIWorkoutLoadingState';
import AIWorkoutResultsModal from '../components/AIWorkoutResultsModal';
import AIWorkoutOfflineGate from '../components/AIWorkoutOfflineGate';
import { useAIWorkoutFlow } from '../hooks/useAIWorkoutFlow';
import type { Screen1ValidationErrors, Screen2ValidationErrors, Screen3ValidationErrors } from '../types/aiWorkout';
import logger from '../utils/logger';

/**
 * AI Workout Onboarding Page
 *
 * 3-screen flow for collecting user information and generating personalized workouts.
 * Includes progress indicator, form validation, and success/error handling.
 */
export default function AIWorkoutOnboardingPage() {
  const { t } = useTranslation('aiWorkout');
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    currentScreen,
    data,
    errors,
    isSubmitting,
    isSuccess,
    workouts,
    submitError,
    updateData,
    goNext,
    goBack,
    submit,
    reset,
  } = useAIWorkoutFlow();

  // Scroll to top when screen changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentScreen]);

  // Confirm navigation away if user has entered data
  useEffect(() => {
    const hasData = Object.keys(data).length > 0;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasData && !isSuccess) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, isSuccess]);

  const handleNext = () => {
    if (currentScreen === 3) {
      // Last screen, submit to API
      submit();
    } else {
      goNext();
    }
  };

  const handleBack = () => {
    if (currentScreen === 1) {
      // First screen, show exit confirmation
      setShowExitConfirm(true);
    } else {
      goBack();
    }
  };

  const confirmExit = () => {
    logger.log('[AIWorkoutOnboardingPage] User exited onboarding');
    navigate(-1);
  };

  const handleTimeout = () => {
    logger.error('[AIWorkoutOnboardingPage] Request timed out');
    // The hook will handle the error state
  };

  const handleGenerateAgain = () => {
    logger.log('[AIWorkoutOnboardingPage] User requested to generate again');
    reset();
  };

  const handleCloseResults = () => {
    logger.log('[AIWorkoutOnboardingPage] User closed results, navigating home');
    navigate('/');
  };

  // Show loading state during submission
  if (isSubmitting) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <AIWorkoutLoadingState onTimeout={handleTimeout} />
        </div>
      </div>
    );
  }

  // Show results modal on success
  if (isSuccess) {
    return (
      <AIWorkoutResultsModal
        isOpen={true}
        workouts={workouts}
        onClose={handleCloseResults}
        onGenerateAgain={handleGenerateAgain}
      />
    );
  }

  const getNextButtonLabel = () => {
    if (currentScreen === 3) {
      return t('onboarding.generateButton', 'Generate My Workouts');
    }
    return t('onboarding.nextButton', 'Next');
  };

  const getBackButtonLabel = () => {
    if (currentScreen === 1) {
      return t('onboarding.exitButton', 'Exit');
    }
    return t('onboarding.backButton', 'Back');
  };

  return (
    <div className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Offline gate */}
        <AIWorkoutOfflineGate variant="banner" />

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-2">
            {t('onboarding.title', 'AI Workout Builder')}
          </h1>
          <p className="text-sm secondary-label-text">
            {t(
              'onboarding.subtitle',
              'Answer a few questions and we\'ll create personalized workout plans just for you.'
            )}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <AIWorkoutProgressIndicator currentStep={currentScreen} totalSteps={3} />
        </div>

        {/* Current screen */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 p-5 mb-4">
          {currentScreen === 1 && (
            <>
              <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-1">
                {t('screen1.title', 'Basic Information')}
              </h2>
              <p className="text-sm secondary-label-text mb-5">
                {t('screen1.description', 'Tell us a bit about yourself')}
              </p>
              <AIWorkoutScreen1
                data={data.screen1 || {}}
                errors={errors as Screen1ValidationErrors}
                onChange={(screenData) => updateData(screenData)}
              />
            </>
          )}

          {currentScreen === 2 && (
            <>
              <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-1">
                {t('screen2.title', 'Goals & Preferences')}
              </h2>
              <p className="text-sm secondary-label-text mb-5">
                {t('screen2.description', 'What are your fitness goals?')}
              </p>
              <AIWorkoutScreen2
                data={data.screen2 || {}}
                errors={errors as Screen2ValidationErrors}
                onChange={(screenData) => updateData(screenData)}
              />
            </>
          )}

          {currentScreen === 3 && (
            <>
              <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-1">
                {t('screen3.title', 'Health & Training Style')}
              </h2>
              <p className="text-sm secondary-label-text mb-5">
                {t('screen3.description', 'Help us customize your workouts for your needs')}
              </p>
              <AIWorkoutScreen3
                data={data.screen3 || {}}
                errors={errors as Screen3ValidationErrors}
                onChange={(screenData) => updateData(screenData)}
              />
            </>
          )}
        </div>

        {/* Error message */}
        {submitError && (
          <div
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">{submitError.message}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="btn-secondary w-full"
            data-testid="onboarding-back-button"
          >
            {getBackButtonLabel()}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary w-full"
            data-testid="onboarding-next-button"
          >
            {getNextButtonLabel()}
          </button>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowExitConfirm(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative bg-white dark:bg-surface-900 rounded-lg max-w-sm w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text-900 dark:text-text-50 mb-3">
              {t('onboarding.exitTitle', 'Exit Workout Builder?')}
            </h2>
            <p className="text-sm text-text-600 dark:text-text-400 mb-6">
              {t('onboarding.exitConfirm', 'Are you sure you want to exit? Your progress will be lost.')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="btn-secondary w-full"
              >
                {t('onboarding.stayButton', 'Stay')}
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="btn-danger w-full"
              >
                {t('onboarding.exitButton', 'Exit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
