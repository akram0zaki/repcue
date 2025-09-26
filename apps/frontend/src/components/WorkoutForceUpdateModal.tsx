import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo } from '../types';
import { updateService } from '../services/updateService';
import { forceUpdateService } from '../services/forceUpdateService';
import logger from '../utils/logger';

interface WorkoutForceUpdateModalProps {
  isOpen: boolean;
  updateInfo: UpdateInfo;
  workoutInfo: {
    isActive: boolean;
    isRunning: boolean;
    isWorkoutMode: boolean;
    workoutName?: string;
    canInterrupt: boolean;
  };
  onClose?: () => void;
}

/**
 * WorkoutForceUpdateModal component
 *
 * Displays a blocking modal when a force update is required during an active workout.
 * Provides options to complete/abandon the workout before applying the security update.
 * Ensures user data is preserved during the transition.
 */
export const WorkoutForceUpdateModal: React.FC<WorkoutForceUpdateModalProps> = ({
  isOpen,
  updateInfo,
  workoutInfo
}) => {
  const { t } = useTranslation(['common']);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Listen for update progress
  useEffect(() => {
    const handleProgress = (progress: unknown) => {
      setUpdateProgress(typeof progress === 'number' ? progress : 0);
    };

    const handleCompleted = () => {
      logger.log('✅ Workout force update completed');
      setIsUpdating(false);
      // App will reload automatically
    };

    const handleFailed = (error: unknown) => {
      logger.error('❌ Workout force update failed:', error);
      setError(error instanceof Error ? error.message : 'Update failed');
      setIsUpdating(false);
    };

    if (isUpdating) {
      updateService.on('update-progress', handleProgress);
      updateService.on('update-completed', handleCompleted);
      updateService.on('update-failed', handleFailed);
      forceUpdateService.on('force-update-progress', handleProgress);
      forceUpdateService.on('force-update-completed', handleCompleted);
      forceUpdateService.on('force-update-failed', handleFailed);
    }

    return () => {
      updateService.off('update-progress', handleProgress);
      updateService.off('update-completed', handleCompleted);
      updateService.off('update-failed', handleFailed);
      forceUpdateService.off('force-update-progress', handleProgress);
      forceUpdateService.off('force-update-completed', handleCompleted);
      forceUpdateService.off('force-update-failed', handleFailed);
    };
  }, [isUpdating]);

  const handleCompleteWorkoutAndUpdate = async () => {
    try {
      setError(null);
      setIsUpdating(true);

      logger.log('🔄 User chose to complete workout and update');

      // Emit event to trigger workout completion flow
      // The app should handle saving workout data and stopping the timer
      window.dispatchEvent(new CustomEvent('force-update-complete-workout', {
        detail: { updateInfo, workoutInfo }
      }));

      // Small delay to allow workout completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Apply the force update
      await updateService.applyUpdate(true);

    } catch (error) {
      logger.error('Failed to complete workout and update:', error);
      setError(error instanceof Error ? error.message : 'Failed to apply update');
      setIsUpdating(false);
    }
  };

  const handleAbandonWorkoutAndUpdate = async () => {
    try {
      setError(null);
      setIsUpdating(true);

      logger.log('🔄 User chose to abandon workout and update');

      // Emit event to trigger workout abandonment
      window.dispatchEvent(new CustomEvent('force-update-abandon-workout', {
        detail: { updateInfo, workoutInfo }
      }));

      // Small delay to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Apply the force update
      await updateService.applyUpdate(true);

    } catch (error) {
      logger.error('Failed to abandon workout and update:', error);
      setError(error instanceof Error ? error.message : 'Failed to apply update');
      setIsUpdating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setUpdateProgress(0);
  };

  if (!isOpen) {
    return null;
  }

  const activityType = workoutInfo.isWorkoutMode ? t('workout') : t('timer');
  const activityName = workoutInfo.workoutName || activityType;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-force-update-title"
      aria-describedby="workout-force-update-description"
    >
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 id="workout-force-update-title" className="text-lg font-semibold text-gray-900">
              {t('securityUpdateRequired')}
            </h2>
            <p className="text-sm text-red-600 font-medium">
              {t('updateBlocked')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div id="workout-force-update-description" className="mb-6">
          <p className="text-gray-700 mb-4">
            {t('workoutForceUpdateMessage', {
              activity: activityName,
              version: updateInfo.version
            })}
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>{t('important')}:</strong> {t('securityUpdateCritical')}
                </p>
              </div>
            </div>
          </div>

          {workoutInfo.isWorkoutMode && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
              <p className="text-sm text-blue-700">
                {t('workoutProgressWillBeSaved')}
              </p>
            </div>
          )}
        </div>

        {/* Progress Display */}
        {isUpdating && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('updatingApp')}
              </span>
              <span className="text-sm text-gray-500">
                {updateProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              {t('tryAgain')}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!isUpdating && !error && (
            <>
              <button
                onClick={handleCompleteWorkoutAndUpdate}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={isUpdating}
              >
                {workoutInfo.isWorkoutMode
                  ? t('completeWorkoutAndUpdate')
                  : t('finishTimerAndUpdate')
                }
              </button>

              <button
                onClick={handleAbandonWorkoutAndUpdate}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                disabled={isUpdating}
              >
                {workoutInfo.isWorkoutMode
                  ? t('abandonWorkoutAndUpdate')
                  : t('stopTimerAndUpdate')
                }
              </button>
            </>
          )}

          {isUpdating && (
            <div className="text-center text-gray-600 py-3">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('pleaseWait')}
              </div>
            </div>
          )}
        </div>

        {/* Information Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {t('appWillRestartAfterUpdate')}
          </p>
        </div>
      </div>
    </div>
  );
};