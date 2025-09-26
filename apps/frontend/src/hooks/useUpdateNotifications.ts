import { useState, useEffect, useCallback } from 'react';
import type { UpdateInfo, UpdateState, UpdateError, UpdateRecoveryState } from '../types';
import { updateService } from '../services/updateService';
import logger from '../utils/logger';

interface UpdateNotificationState {
  // Current update info
  updateInfo: UpdateInfo | null;
  updateState: UpdateState | null;

  // UI state
  showBanner: boolean;
  showForceModal: boolean;
  showChangelog: boolean;
  showErrorRecovery: boolean;

  // Progress tracking
  updateProgress: number;
  isUpdating: boolean;
  error: string | null;

  // Error handling
  currentError: UpdateError | null;
  recoveryState: UpdateRecoveryState | null;

  // Workout handling
  isWorkoutActive: boolean;
}

interface UpdateNotificationActions {
  // Update actions
  applyUpdate: () => Promise<void>;
  applyUpdateWithConfirmation: () => Promise<void>;
  dismissUpdate: () => void;

  // UI actions
  showChangelogModal: () => void;
  hideChangelogModal: () => void;
  showErrorRecoveryModal: () => void;
  hideErrorRecoveryModal: () => void;

  // Error recovery actions
  onRecoveryComplete: () => void;

  // Workout actions
  setWorkoutActive: (active: boolean) => void;
  saveWorkoutAndUpdate: () => Promise<void>;
  abandonWorkoutAndUpdate: () => Promise<void>;

  // Manual actions
  checkForUpdates: () => Promise<void>;
  refreshState: () => void;
}

/**
 * Custom hook for managing update notifications and UI state
 * Integrates with updateService events and handles all update-related UI logic
 */
export const useUpdateNotifications = (): [UpdateNotificationState, UpdateNotificationActions] => {
  const [state, setState] = useState<UpdateNotificationState>({
    updateInfo: null,
    updateState: null,
    showBanner: false,
    showForceModal: false,
    showChangelog: false,
    showErrorRecovery: false,
    updateProgress: 0,
    isUpdating: false,
    error: null,
    currentError: null,
    recoveryState: null,
    isWorkoutActive: false
  });

  // Refresh state from updateService
  const refreshState = useCallback(() => {
    const currentState = updateService.getUpdateState();
    const currentUpdateInfo = currentState.pendingUpdate;
    const currentRecoveryState = updateService.getRecoveryState();

    setState(prev => ({
      ...prev,
      updateState: currentState,
      updateInfo: currentUpdateInfo || null,
      updateProgress: currentState.updateProgress || 0,
      isUpdating: currentState.isUpdating,
      error: currentState.error || null,
      recoveryState: currentRecoveryState,
      currentError: currentRecoveryState?.currentError || null
    }));

    // Determine UI visibility
    if (currentUpdateInfo) {
      const shouldShowBanner = updateService.shouldShowUpdateNotification(currentUpdateInfo);
      const isForceUpdate = currentUpdateInfo.policy === 'force';

      setState(prev => ({
        ...prev,
        showBanner: shouldShowBanner && !isForceUpdate && !prev.isUpdating,
        showForceModal: isForceUpdate && !prev.isUpdating
      }));
    } else {
      setState(prev => ({
        ...prev,
        showBanner: false,
        showForceModal: false
      }));
    }
  }, []);

  // Initialize and set up event listeners
  useEffect(() => {
    // Initial state
    refreshState();

    // Set up event listeners
    const handleUpdateAvailable = (updateInfo: unknown) => {
      logger.log('Update available event received:', updateInfo);
      refreshState();
    };

    const handleUpdateStarted = (updateInfo: unknown) => {
      logger.log('Update started event received:', updateInfo);
      setState(prev => ({
        ...prev,
        isUpdating: true,
        updateProgress: 0,
        error: null,
        showBanner: false // Hide banner during update
      }));
    };

    const handleUpdateProgress = (progress: unknown) => {
      setState(prev => ({
        ...prev,
        updateProgress: typeof progress === 'number' ? progress : 0
      }));
    };

    const handleUpdateCompleted = (updateInfo: unknown) => {
      logger.log('Update completed event received:', updateInfo);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateProgress: 100,
        error: null,
        showForceModal: false,
        showBanner: false
      }));
    };

    const handleUpdateFailed = (error: unknown) => {
      logger.error('Update failed event received:', error);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Update failed',
        updateProgress: 0
      }));
    };

    const handleUpdateErrorDetailed = (data: unknown) => {
      const errorData = data as { error: UpdateError; recoveryState: UpdateRecoveryState; canRetry: boolean };
      logger.error('Detailed update error received:', errorData.error);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        currentError: errorData.error,
        recoveryState: errorData.recoveryState,
        error: errorData.error.message,
        showErrorRecovery: true,
        updateProgress: 0
      }));
    };

    const handleRecoveryActionCompleted = (data: unknown) => {
      const actionData = data as { actionId: string };
      logger.log('Recovery action completed:', actionData.actionId);
      refreshState();
    };

    const handleRecoveryActionFailed = (data: unknown) => {
      const failureData = data as { actionId: string; error: UpdateError };
      logger.error('Recovery action failed:', failureData);
      setState(prev => ({
        ...prev,
        currentError: failureData.error,
        error: failureData.error.message
      }));
    };

    const handleUpdateBlockedMetered = (data: unknown) => {
      const blockedData = data as { updateInfo: UpdateInfo; message: string };
      logger.warn('Update blocked due to metered connection:', blockedData);
      setState(prev => ({
        ...prev,
        error: blockedData.message
      }));
    };

    const handleUpdateRequiresConfirmation = (updateInfo: unknown) => {
      logger.log('Update requires confirmation:', updateInfo);
      // Keep banner visible for user to confirm
      setState(prev => ({
        ...prev,
        showBanner: true
      }));
    };

    const handleOtherTabUpdating = () => {
      logger.log('Another tab is updating');
      setState(prev => ({
        ...prev,
        showBanner: false,
        showForceModal: false,
        isUpdating: true
      }));
    };

    const handleOtherTabUpdated = () => {
      logger.log('Another tab completed update');
      // Page will reload, but just in case
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    // Subscribe to events
    updateService.on('update-available', handleUpdateAvailable);
    updateService.on('update-started', handleUpdateStarted);
    updateService.on('update-progress', handleUpdateProgress);
    updateService.on('update-completed', handleUpdateCompleted);
    updateService.on('update-failed', handleUpdateFailed);
    updateService.on('update-error-detailed', handleUpdateErrorDetailed);
    updateService.on('recovery-action-completed', handleRecoveryActionCompleted);
    updateService.on('recovery-action-failed', handleRecoveryActionFailed);
    updateService.on('update-blocked-metered', handleUpdateBlockedMetered);
    updateService.on('update-requires-confirmation', handleUpdateRequiresConfirmation);
    updateService.on('other-tab-updating', handleOtherTabUpdating);
    updateService.on('other-tab-updated', handleOtherTabUpdated);

    // Cleanup
    return () => {
      updateService.off('update-available', handleUpdateAvailable);
      updateService.off('update-started', handleUpdateStarted);
      updateService.off('update-progress', handleUpdateProgress);
      updateService.off('update-completed', handleUpdateCompleted);
      updateService.off('update-failed', handleUpdateFailed);
      updateService.off('update-error-detailed', handleUpdateErrorDetailed);
      updateService.off('recovery-action-completed', handleRecoveryActionCompleted);
      updateService.off('recovery-action-failed', handleRecoveryActionFailed);
      updateService.off('update-blocked-metered', handleUpdateBlockedMetered);
      updateService.off('update-requires-confirmation', handleUpdateRequiresConfirmation);
      updateService.off('other-tab-updating', handleOtherTabUpdating);
      updateService.off('other-tab-updated', handleOtherTabUpdated);
    };
  }, [refreshState]);

  // Actions
  const applyUpdate = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await updateService.applyUpdate();
    } catch (error) {
      logger.error('Failed to apply update:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  }, []);

  const applyUpdateWithConfirmation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await updateService.applyUpdateWithConfirmation();
    } catch (error) {
      logger.error('Failed to apply update with confirmation:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    try {
      updateService.dismissUpdate();
      setState(prev => ({
        ...prev,
        showBanner: false,
        error: null
      }));
    } catch (error) {
      logger.error('Failed to dismiss update:', error);
    }
  }, []);

  const showChangelogModal = useCallback(() => {
    setState(prev => ({ ...prev, showChangelog: true }));
  }, []);

  const hideChangelogModal = useCallback(() => {
    setState(prev => ({ ...prev, showChangelog: false }));
  }, []);

  const showErrorRecoveryModal = useCallback(() => {
    setState(prev => ({ ...prev, showErrorRecovery: true }));
  }, []);

  const hideErrorRecoveryModal = useCallback(() => {
    setState(prev => ({ ...prev, showErrorRecovery: false }));
  }, []);

  const onRecoveryComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      showErrorRecovery: false,
      currentError: null,
      error: null
    }));
    refreshState();
  }, [refreshState]);

  const setWorkoutActive = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, isWorkoutActive: active }));
  }, []);

  const saveWorkoutAndUpdate = useCallback(async () => {
    try {
      // This would be implemented by the parent component
      // For now, just apply the update
      await applyUpdate();
    } catch (error) {
      logger.error('Failed to save workout and update:', error);
    }
  }, [applyUpdate]);

  const abandonWorkoutAndUpdate = useCallback(async () => {
    try {
      // This would be implemented by the parent component
      // For now, just apply the update
      await applyUpdate();
    } catch (error) {
      logger.error('Failed to abandon workout and update:', error);
    }
  }, [applyUpdate]);

  const checkForUpdates = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await updateService.checkForUpdates();
      refreshState();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to check for updates'
      }));
    }
  }, [refreshState]);

  return [
    state,
    {
      applyUpdate,
      applyUpdateWithConfirmation,
      dismissUpdate,
      showChangelogModal,
      hideChangelogModal,
      showErrorRecoveryModal,
      hideErrorRecoveryModal,
      onRecoveryComplete,
      setWorkoutActive,
      saveWorkoutAndUpdate,
      abandonWorkoutAndUpdate,
      checkForUpdates,
      refreshState
    }
  ];
};

export default useUpdateNotifications;