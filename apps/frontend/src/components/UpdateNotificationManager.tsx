import React from 'react';
import { UpdateNotificationBanner } from './UpdateNotificationBanner';
import { ForceUpdateModal } from './ForceUpdateModal';
import { ChangelogModal } from './ChangelogModal';
import { UpdateErrorRecoveryModal } from './UpdateErrorRecoveryModal';
import { useUpdateNotifications } from '../hooks/useUpdateNotifications';
import logger from '../utils/logger';

interface UpdateNotificationManagerProps {
  // Workout state integration
  isWorkoutActive?: boolean;
  onSaveWorkout?: () => Promise<void>;
  onAbandonWorkout?: () => Promise<void>;

  // Custom positioning
  className?: string;
  bannerClassName?: string;

  // Testing/development
  debugMode?: boolean;
}

/**
 * UpdateNotificationManager orchestrates all update-related UI components
 * Handles the complete update notification flow with accessibility compliance
 */
export const UpdateNotificationManager: React.FC<UpdateNotificationManagerProps> = ({
  isWorkoutActive = false,
  onSaveWorkout,
  onAbandonWorkout,
  className = '',
  bannerClassName = '',
  debugMode = false
}) => {
  const [state, actions] = useUpdateNotifications();

  // Update workout state when prop changes
  React.useEffect(() => {
    actions.setWorkoutActive(isWorkoutActive);
  }, [isWorkoutActive, actions]);

  // Debug logging
  React.useEffect(() => {
    if (debugMode) {
      logger.log('UpdateNotificationManager state:', state);
    }
  }, [state, debugMode]);

  // Handle workout-specific update actions
  const handleSaveWorkoutAndUpdate = async () => {
    try {
      if (onSaveWorkout) {
        await onSaveWorkout();
        logger.log('Workout saved, proceeding with update');
      }
      await actions.applyUpdate();
    } catch (error) {
      logger.error('Failed to save workout and update:', error);
      throw error;
    }
  };

  const handleAbandonWorkoutAndUpdate = async () => {
    try {
      if (onAbandonWorkout) {
        await onAbandonWorkout();
        logger.log('Workout abandoned, proceeding with update');
      }
      await actions.applyUpdate();
    } catch (error) {
      logger.error('Failed to abandon workout and update:', error);
      throw error;
    }
  };

  // Don't render anything if no update info
  if (!state.updateInfo) {
    return null;
  }

  return (
    <div className={`update-notification-manager ${className}`} data-testid="update-notification-manager">
      {/* Update Banner - shown for non-force updates */}
      {state.showBanner && (
        <UpdateNotificationBanner
          updateInfo={state.updateInfo}
          onApplyUpdate={actions.applyUpdateWithConfirmation}
          onDismiss={actions.dismissUpdate}
          onShowChangelog={actions.showChangelogModal}
          className={bannerClassName}
        />
      )}

      {/* Force Update Modal - blocks app usage */}
      {state.showForceModal && (
        <ForceUpdateModal
          isOpen={state.showForceModal}
          updateInfo={state.updateInfo}
          onApplyUpdate={actions.applyUpdate}
          isWorkoutActive={state.isWorkoutActive}
          onSaveWorkout={handleSaveWorkoutAndUpdate}
          onAbandonWorkout={handleAbandonWorkoutAndUpdate}
          updateProgress={state.updateProgress}
          isUpdating={state.isUpdating}
          error={state.error || undefined}
        />
      )}

      {/* Changelog Modal - shows detailed update information */}
      {state.showChangelog && state.updateInfo && (
        <ChangelogModal
          updateInfo={state.updateInfo}
          isOpen={state.showChangelog}
          onClose={actions.hideChangelogModal}
          onApplyUpdate={actions.applyUpdateWithConfirmation}
        />
      )}

      {/* Error Recovery Modal - handles update failures */}
      {state.showErrorRecovery && state.currentError && (
        <UpdateErrorRecoveryModal
          isOpen={state.showErrorRecovery}
          error={state.currentError}
          recoveryState={state.recoveryState || undefined}
          onClose={actions.hideErrorRecoveryModal}
          onRecoveryComplete={actions.onRecoveryComplete}
        />
      )}

      {/* Development/Debug tools */}
      {debugMode && (
        <div
          className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs z-50"
          data-testid="update-debug-panel"
        >
          <h4 className="font-bold mb-2">Update Debug Panel</h4>
          <div className="space-y-1">
            <div>Policy: {state.updateInfo.policy}</div>
            <div>Version: {state.updateInfo.version}</div>
            <div>Show Banner: {state.showBanner ? 'Yes' : 'No'}</div>
            <div>Show Force Modal: {state.showForceModal ? 'Yes' : 'No'}</div>
            <div>Is Updating: {state.isUpdating ? 'Yes' : 'No'}</div>
            <div>Progress: {state.updateProgress}%</div>
            <div>Workout Active: {state.isWorkoutActive ? 'Yes' : 'No'}</div>
            {state.error && <div className="text-red-300">Error: {state.error}</div>}
          </div>
          <div className="mt-2 space-x-2">
            <button
              onClick={actions.checkForUpdates}
              className="bg-blue-600 px-2 py-1 rounded text-xs"
              disabled={state.isUpdating}
            >
              Check
            </button>
            <button
              onClick={actions.refreshState}
              className="bg-green-600 px-2 py-1 rounded text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateNotificationManager;