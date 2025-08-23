import { useState, useEffect, useCallback } from 'react';
import { SyncService, type SyncStatus } from '../services/syncService';

export interface NetworkSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  nextRetryAt?: number;
  errors: string[];
  canSync: boolean;
  syncProgress?: {
    total: number;
    completed: number;
    current?: string;
  };
}

export interface NetworkSyncActions {
  triggerSync: () => Promise<void>;
  clearSyncData: () => Promise<void>;
  clearErrors: () => void;
  retry: () => Promise<void>;
}

export interface UseNetworkSyncResult {
  state: NetworkSyncState;
  actions: NetworkSyncActions;
}

/**
 * Enhanced network status hook with sync integration
 * Extends existing useOfflineStatus functionality with sync capabilities
 */
export function useNetworkSync(): UseNetworkSyncResult {
  const [syncService] = useState(() => {
    try {
      return SyncService.getInstance();
    } catch (error) {
      console.warn('SyncService not available:', error);
      return null;
    }
  });
  
  // Core network and sync state
  const [state, setState] = useState<NetworkSyncState>(() => {
    const baseState = {
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingOperations: 0,
      lastSyncAttempt: undefined,
      lastSuccessfulSync: undefined,
      errors: [],
      canSync: false,
      nextRetryAt: undefined
    };

    if (!syncService) {
      return baseState;
    }

    try {
      const initialStatus = syncService.getSyncStatus();
      return {
        isOnline: initialStatus.isOnline,
        isSyncing: initialStatus.isSyncing,
        pendingOperations: initialStatus.pendingOperations,
        lastSyncAttempt: initialStatus.lastSyncAttempt,
        lastSuccessfulSync: initialStatus.lastSuccessfulSync,
        errors: initialStatus.errors,
        canSync: initialStatus.isOnline && !initialStatus.isSyncing && initialStatus.pendingOperations > 0,
        nextRetryAt: undefined
      };
    } catch (error) {
      console.warn('Failed to get initial sync status:', error);
      return baseState;
    }
  });

  /**
   * Update sync progress in state
   */
  const updateSyncProgress = useCallback((progress?: { total: number; completed: number; current?: string }) => {
    setState(prev => ({ ...prev, syncProgress: progress }));
  }, []);

  /**
   * Update state from sync status
   */
  const updateStateFromStatus = useCallback((status: SyncStatus, nextRetryAt?: number) => {
    setState(prev => ({
      ...prev,
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      pendingOperations: status.pendingOperations,
      lastSyncAttempt: status.lastSyncAttempt,
      lastSuccessfulSync: status.lastSuccessfulSync,
      errors: status.errors,
      canSync: status.isOnline && !status.isSyncing && status.pendingOperations > 0,
      nextRetryAt,
      syncProgress: prev.syncProgress // Preserve sync progress
    }));
  }, []);

  /**
   * Manual sync trigger with progress tracking
   */
  const triggerSync = useCallback(async (): Promise<void> => {
    if (!syncService) {
      console.warn('Cannot sync: SyncService not available');
      return;
    }

    // Check hook state to determine if we can sync
    if (!state.isOnline) {
      console.warn('Cannot sync: device is offline');
      return;
    }

    if (state.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      console.log('🔄 Manual sync triggered');
      
      // Start progress tracking
      const initialProgress = { total: state.pendingOperations, completed: 0, current: 'Preparing...' };
      updateSyncProgress(initialProgress);
      
      const result = await syncService.forcSync();
      
      // Update progress
      const finalProgress = { 
        total: result.processedOperations + result.failedOperations, 
        completed: result.processedOperations,
        current: result.success ? 'Completed' : 'Completed with errors'
      };
      updateSyncProgress(finalProgress);

      console.log(`✅ Manual sync completed: ${result.processedOperations} processed, ${result.failedOperations} failed`);
      
      // Clear progress after brief delay
      setTimeout(() => updateSyncProgress(undefined), 2000);
      
    } catch (error) {
      console.error('Manual sync failed:', error);
      updateSyncProgress(undefined);
    }
  }, [syncService, state.isOnline, state.isSyncing, state.pendingOperations, updateSyncProgress]);

  /**
   * Clear sync data
   */
  const clearSyncData = useCallback(async (): Promise<void> => {
    if (!syncService) {
      console.warn('Cannot clear sync data: SyncService not available');
      return;
    }

    try {
      await syncService.clearSyncData();
      console.log('🧹 Sync data cleared');
    } catch (error) {
      console.error('Failed to clear sync data:', error);
    }
  }, [syncService]);

  /**
   * Clear sync errors
   */
  const clearErrors = useCallback((): void => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  /**
   * Retry failed operations
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!syncService) {
      console.warn('Cannot retry: SyncService not available');
      return;
    }

    // Check hook state instead of sync service state
    if (!state.isOnline) {
      console.warn('Cannot retry: device is offline');
      return;
    }

    await triggerSync();
  }, [syncService, state.isOnline, triggerSync]);

  /**
   * Setup sync status listener
   */
  useEffect(() => {
    if (!syncService) {
      return;
    }

    try {
      const unsubscribe = syncService.addStatusListener((status: SyncStatus) => {
        try {
          // Update status immediately for synchronous state updates
          updateStateFromStatus(status);
          
          // Fetch retry time asynchronously but don't wait for it
          syncService.getNextRetryTime().then(nextRetryAt => {
            if (nextRetryAt) {
              updateStateFromStatus(status, nextRetryAt);
            }
          }).catch(() => {
            // Ignore retry time fetch errors
          });
        } catch (error) {
          console.warn('Error handling status update:', error);
          updateStateFromStatus(status);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.warn('Failed to setup sync status listener:', error);
    }
  }, [syncService, updateStateFromStatus]);

  /**
   * Network event listeners for online/offline detection
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      if (syncService) {
        try {
          // Update sync service about network status and get current status
          const currentStatus = syncService.getSyncStatus();
          updateStateFromStatus({ 
            ...currentStatus, 
            isOnline: true 
          });
        } catch (error) {
          console.warn('Error updating status on network restore:', error);
          setState(prev => ({ 
            ...prev, 
            isOnline: true, 
            canSync: !prev.isSyncing && prev.pendingOperations > 0 
          }));
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          isOnline: true, 
          canSync: !prev.isSyncing && prev.pendingOperations > 0 
        }));
      }
    };

    const handleOffline = () => {
      console.log('📴 Network connection lost');
      if (syncService) {
        try {
          const currentStatus = syncService.getSyncStatus();
          updateStateFromStatus({ 
            ...currentStatus, 
            isOnline: false 
          });
        } catch (error) {
          console.warn('Error updating status on network loss:', error);
          setState(prev => ({ ...prev, isOnline: false, canSync: false }));
        }
      } else {
        setState(prev => ({ ...prev, isOnline: false, canSync: false }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncService, updateStateFromStatus]);

  /**
   * Auto-retry mechanism for failed operations
   */
  useEffect(() => {
    if (!state.nextRetryAt || !state.isOnline || state.isSyncing) {
      return;
    }

    const now = Date.now();
    const delay = state.nextRetryAt - now;

    if (delay <= 0) {
      // Should retry now
      triggerSync().catch(error => {
        console.error('Auto-retry failed:', error);
      });
      return;
    }

    // Schedule retry
    const timeoutId = setTimeout(() => {
      triggerSync().catch(error => {
        console.error('Scheduled retry failed:', error);
      });
    }, delay);

    console.log(`⏰ Scheduled retry in ${Math.round(delay / 1000)}s`);

    return () => clearTimeout(timeoutId);
  }, [state.nextRetryAt, state.isOnline, state.isSyncing, triggerSync]);

  /**
   * Periodic sync check (every 30 seconds when online and idle)
   */
  useEffect(() => {
    if (!state.isOnline || state.isSyncing || state.pendingOperations === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      // Check if we have pending operations and trigger sync
      if (state.isOnline && !state.isSyncing && state.pendingOperations > 0) {
        console.log('🔄 Periodic sync check triggered');
        triggerSync().catch(error => {
          console.error('Periodic sync failed:', error);
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [state.isOnline, state.isSyncing, state.pendingOperations, triggerSync]);

  return {
    state,
    actions: {
      triggerSync,
      clearSyncData,
      clearErrors,
      retry
    }
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useNetworkSync instead
 */
export function useOfflineStatus() {
  const result = useNetworkSync();
  
  if (!result || !result.state) {
    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      pendingOperations: 0,
      canSync: false
    };
  }
  
  return {
    isOnline: result.state.isOnline,
    isOffline: !result.state.isOnline,
    pendingOperations: result.state.pendingOperations,
    canSync: result.state.canSync
  };
}
