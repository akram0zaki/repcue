import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo } from '../types';
import { updateService } from '../services/updateService';
import logger from '../utils/logger';

interface WorkoutData {
  id: string;
  name: string;
  currentExercise?: string;
  progress: number; // 0-100
  totalExercises: number;
  currentExerciseIndex: number;
  elapsedTime: number; // in seconds
}

interface ForceUpdateModalProps {
  isOpen: boolean;
  updateInfo?: UpdateInfo;
  onApplyUpdate: () => void;

  // Workout integration
  isWorkoutActive?: boolean;
  workoutData?: WorkoutData;
  onSaveWorkout?: () => Promise<void>;
  onAbandonWorkout?: () => Promise<void>;

  // Update progress tracking
  updateProgress?: number;
  isUpdating?: boolean;
  error?: string;
  autoForceDelay?: number;

  // Retry and recovery options
  onRetry?: () => Promise<void>;
  onForceReload?: () => void;

  // App blocking controls
  blockAppUsage?: boolean;
  allowMinimize?: boolean;

  className?: string;
}

/**
 * ForceUpdateModal component for required security updates
 * Prevents app usage until update is applied
 * Handles workout interruption gracefully
 */
export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  isOpen,
  updateInfo,
  onApplyUpdate,
  isWorkoutActive = false,
  workoutData,
  onSaveWorkout,
  onAbandonWorkout,
  updateProgress = 0,
  isUpdating = false,
  error,

  onRetry,
  onForceReload,
  blockAppUsage = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const [connectionInfo, setConnectionInfo] = useState<string>('');
  const [showWorkoutOptions, setShowWorkoutOptions] = useState(isWorkoutActive && !!workoutData);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeUntilForce, setTimeUntilForce] = useState<number | null>(null);

  // Enhanced app blocking effects
  useEffect(() => {
    // Only block if the modal is open AND blocking is enabled AND there's actually an update
    if (!blockAppUsage || !isOpen || !updateInfo) return;

    // Prevent page navigation/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t('update.force.modal.preventLeave', 'A security update is required. Please complete the update before closing.');
      return e.returnValue;
    };

    // Prevent browser back/forward navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      logger.warn('Navigation blocked due to force update');
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push a state to prevent back navigation
    window.history.pushState(null, '', window.location.href);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [blockAppUsage, isOpen, updateInfo, t]);

  // Focus management for accessibility and security
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Prevent focus from leaving the modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }

      // Prevent escape key if blocking is enabled AND modal is open with update info
      if (e.key === 'Escape' && blockAppUsage && isOpen && updateInfo) {
        e.preventDefault();
        logger.warn('Escape key blocked due to force update');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [blockAppUsage, isOpen, updateInfo]);

  // Auto-force countdown for critical security updates
  useEffect(() => {
    // If this is a critical security update, start a countdown to automatic update
    if (updateInfo?.forceUpdate && !isUpdating && !timeUntilForce) {
      const countdownTime = 300; // 5 minutes
      setTimeUntilForce(countdownTime);

      const interval = setInterval(() => {
        setTimeUntilForce(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            logger.warn('Force update countdown expired, applying update automatically');
            handleApplyUpdate();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [updateInfo?.forceUpdate, isUpdating, timeUntilForce]);

  // Check metered connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (updateInfo && updateService.isOnMeteredConnection()) {
        const warning = updateService.getMeteredConnectionWarning(updateInfo);
        setConnectionInfo(warning);
      }
    };
    checkConnection();
  }, [updateInfo]);

  // Reset workout options when workout state changes
  useEffect(() => {
    setShowWorkoutOptions(isWorkoutActive && !!workoutData);
  }, [isWorkoutActive, workoutData]);

  // Reset processing state when modal closes or error occurs
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setRetryAttempts(0);
    }
  }, [isOpen]);

  // Reset processing state when there's an error
  useEffect(() => {
    if (error && isProcessing) {
      setIsProcessing(false);
    }
  }, [error, isProcessing]);

  const handleApplyUpdate = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      logger.log('Force update initiated by user');
      await onApplyUpdate();
      // If we reach here and no error was thrown, the update was successful
      // The processing state should remain true until the modal closes via force-update-completed event
    } catch (error) {
      logger.error('Failed to apply force update from modal:', error);
      setRetryAttempts(prev => prev + 1);
      setIsProcessing(false);
      // Error handling will be done by the parent component
    }
  };

  const handleSaveAndUpdate = async () => {
    if (!onSaveWorkout || isProcessing) return;

    try {
      setIsProcessing(true);
      logger.log('Saving workout before force update...');
      await onSaveWorkout();
      logger.log('Workout saved successfully, proceeding with update');
      await onApplyUpdate();
    } catch (error) {
      logger.error('Failed to save workout before force update:', error);
      setRetryAttempts(prev => prev + 1);
      setIsProcessing(false);
      throw error; // Re-throw to show error to user
    }
  };

  const handleAbandonAndUpdate = async () => {
    if (!onAbandonWorkout || isProcessing) return;

    try {
      setIsProcessing(true);
      logger.log('Abandoning workout for force update...');
      await onAbandonWorkout();
      logger.log('Workout abandoned successfully, proceeding with update');
      await onApplyUpdate();
    } catch (error) {
      logger.error('Failed to abandon workout for force update:', error);
      setRetryAttempts(prev => prev + 1);
      setIsProcessing(false);
      throw error; // Re-throw to show error to user
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isProcessing) return;

    try {
      setIsProcessing(true);
      logger.log(`Retrying force update (attempt ${retryAttempts + 1})`);
      await onRetry();
      setRetryAttempts(0); // Reset on success
    } catch (error) {
      logger.error('Retry failed:', error);
      setRetryAttempts(prev => prev + 1);
      setIsProcessing(false);
    }
  };

  const handleForceReload = () => {
    if (onForceReload) {
      logger.warn('Force reload initiated due to update failure');
      onForceReload();
    } else {
      logger.warn('Force reload via window.location.reload()');
      window.location.reload();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if modal is closed
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[9999] ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      aria-describedby="force-update-description"
      data-testid="force-update-modal"
      tabIndex={-1}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto border-4 border-red-500"
           onClick={(e) => e.stopPropagation()}>

        {/* Critical security header */}
        <div className="bg-red-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
              </svg>
            </div>
            <div>
              <h2 id="force-update-title" className="text-lg font-bold">
                {t('update.force.modal.title', 'Security Update Required')}
              </h2>
              <p className="text-sm opacity-90">
                {t('update.force.modal.subtitle', 'Critical security patch required immediately')}
              </p>
            </div>
          </div>

          {/* Auto-update countdown */}
          {timeUntilForce && timeUntilForce > 0 && (
            <div className="mt-3 bg-white bg-opacity-20 rounded p-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('update.force.modal.autoUpdate', 'Automatic update in:')}</span>
                <span className="font-mono font-bold">{formatTime(timeUntilForce)}</span>
              </div>
              <div className="progress mt-1">
                <div className="progress__track">
                  <div className="progress__bar" style={{ ['--progress' as unknown as string]: ((300 - timeUntilForce) / 300) * 100 } as React.CSSProperties} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6">
          {/* Version and retry info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {updateInfo?.version && updateInfo.version !== 'unknown' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('update.version', 'Version: {{version}}', { version: updateInfo.version })}
                </p>
              )}
            </div>
            {retryAttempts > 0 && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                {t('update.retryAttempt', 'Attempt {{count}}', { count: retryAttempts + 1 })}
              </div>
            )}
          </div>

          {/* Update progress indicator */}
          {isUpdating && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('update.progress.title', 'Updating...')}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {updateProgress}%
                </span>
              </div>
              <div className="progress">
                <div className="progress__track">
                  <div
                    className="progress__bar"
                    style={{ ['--progress' as unknown as string]: updateProgress } as React.CSSProperties}
                    role="progressbar"
                    aria-valuenow={updateProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('update.progress.label', 'Update progress')}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {updateProgress < 25
                  ? t('update.progress.preparing', 'Preparing update...')
                  : updateProgress < 75
                  ? t('update.progress.downloading', 'Downloading update...')
                  : updateProgress < 100
                  ? t('update.progress.installing', 'Installing update...')
                  : t('update.progress.completing', 'Completing update...')
                }
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    {t('update.error.title', 'Update Failed')}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main message */}
          <div id="force-update-description" className="text-gray-700 dark:text-gray-300 mb-6">
            <p className="mb-4">
              {updateInfo?.message || (updateInfo ? updateService.getUpdatePolicyMessage(updateInfo) : 'A security update is required.')}
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    {t('update.force.modal.warning.title', 'Important Security Update')}
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {t('update.force.modal.warning.message', 'This update contains critical security fixes and cannot be postponed. The app will be unavailable until the update is complete.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Metered connection warning */}
            {connectionInfo && (
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <span className="text-primary-600 dark:text-primary-400 mr-3" aria-hidden="true">
                    📱
                  </span>
                  <div className="text-sm">
                    <p className="font-medium text-primary-800 dark:text-primary-200 mb-1">
                      {t('update.meteredConnection.title', 'Metered Connection Detected')}
                    </p>
                    <p className="text-primary-700 dark:text-primary-300">
                      {connectionInfo}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced workout handling options */}
          {showWorkoutOptions && workoutData && !isUpdating && (
            <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <svg
                  className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                  {t('update.workout.active.title', 'Active Workout: {{name}}', { name: workoutData.name })}
                </h3>
              </div>

              {/* Workout details */}
              <div className="space-y-2 mb-4 text-sm text-orange-700 dark:text-orange-300">
                <div className="flex justify-between">
                  <span>{t('update.workout.progress', 'Progress:')}</span>
                  <span className="font-medium">
                    {workoutData.currentExerciseIndex + 1}/{workoutData.totalExercises} exercises
                  </span>
                </div>
                {workoutData.currentExercise && (
                  <div className="flex justify-between">
                    <span>{t('update.workout.currentExercise', 'Current:')}</span>
                    <span className="font-medium">{workoutData.currentExercise}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('update.workout.elapsed', 'Elapsed:')}</span>
                  <span className="font-medium">{formatElapsedTime(workoutData.elapsedTime)}</span>
                </div>
                <div className="progress mt-2">
                  <div className="progress__track">
                    <div className="progress__bar" style={{ ['--progress' as unknown as string]: workoutData.progress } as React.CSSProperties} />
                  </div>
                </div>
              </div>

              <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                {t('update.workout.securityMessage', 'This security update cannot be postponed. Please choose how to handle your active workout:')}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleSaveAndUpdate}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-3 rounded-lg font-medium touch-target transition-colors flex items-center justify-center"
                  data-testid="save-workout-update-button"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('update.workout.saving', 'Saving Workout...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {t('update.workout.save', 'Save Workout & Update')}
                    </>
                  )}
                </button>

                <button
                  onClick={handleAbandonAndUpdate}
                  disabled={isProcessing}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-3 rounded-lg font-medium touch-target transition-colors flex items-center justify-center"
                  data-testid="abandon-workout-update-button"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('update.workout.abandoning', 'Abandoning Workout...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t('update.workout.abandon', 'Abandon Workout & Update')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Enhanced action buttons */}
          {!showWorkoutOptions && !isUpdating && (
            <div className="space-y-3">
              <button
                onClick={handleApplyUpdate}
                disabled={isProcessing}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-4 rounded-lg text-lg font-semibold touch-target transition-colors flex items-center justify-center"
                autoFocus
                data-testid="force-update-button"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('update.force.applying', 'Applying Update...')}
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('update.force.action', 'Update Now')}
                  </>
                )}
              </button>

              {/* Error recovery options */}
              {error && (
                <div className="space-y-3">
                  {onRetry && retryAttempts < 3 && (
                    <button
                      onClick={handleRetry}
                      disabled={isProcessing}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white p-3 rounded-lg font-medium touch-target transition-colors flex items-center justify-center"
                      data-testid="retry-update-button"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t('update.retry', 'Retry Update')} ({3 - retryAttempts} {t('update.attemptsLeft', 'attempts left')})
                    </button>
                  )}

                  {retryAttempts >= 3 && (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {t('update.maxRetries', 'Maximum retry attempts exceeded')}
                      </p>
                      <button
                        onClick={handleForceReload}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg font-medium touch-target transition-colors flex items-center justify-center"
                        data-testid="force-reload-button"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('update.forceReload', 'Force App Reload')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Updating status */}
          {isUpdating && (
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <svg className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('update.force.inProgress', 'Updating Application...')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('update.force.pleaseWait', 'Please do not close or refresh the browser. The app will restart automatically.')}
              </p>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('update.force.modal.footer', 'This security update is required to protect your data and ensure app functionality.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForceUpdateModal;