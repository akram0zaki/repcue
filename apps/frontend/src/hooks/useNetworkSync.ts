import { useState, useEffect, useCallback } from 'react';
import { syncService as syncServiceFactory, type SyncStatus } from '../services/syncService';
import logger from '../utils/logger';

export interface NetworkSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  hasChangesToSync: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  errors: string[];
  canSync: boolean;
}

export interface NetworkSyncActions {
  triggerSync: () => Promise<void>;
  clearErrors: () => void;
  retry: () => Promise<void>;
}

export interface UseNetworkSyncResult {
  state: NetworkSyncState;
  actions: NetworkSyncActions;
}

/**
 * Enhanced network status hook with sync integration
 */
export function useNetworkSync(): UseNetworkSyncResult {
  const [syncService] = useState(() => {
    try {
      return syncServiceFactory;
    } catch (error) {
      logger.warn('Sync service not available:', error as unknown as Record<string, unknown>);
      return null;
    }
  });
  
  // Core network and sync state
  const [state, setState] = useState<NetworkSyncState>(() => {
    const baseState = {
      isOnline: navigator.onLine,
      isSyncing: false,
      hasChangesToSync: false,
      lastSyncAttempt: undefined,
      lastSuccessfulSync: undefined,
      errors: [],
      canSync: false
    };

    if (!syncService) {
      return baseState;
    }

    try {
      const initialStatus = syncService.getSyncStatus();
      return {
        isOnline: initialStatus.isOnline,
        isSyncing: initialStatus.isSyncing,
        hasChangesToSync: initialStatus.hasChangesToSync,
        lastSyncAttempt: initialStatus.lastSyncAttempt,
        lastSuccessfulSync: initialStatus.lastSuccessfulSync,
        errors: initialStatus.errors.map(err => typeof err === 'string' ? err : err.message),
        canSync: initialStatus.isOnline && !initialStatus.isSyncing
      };
    } catch (error) {
      logger.warn('Failed to get initial sync status:', error as unknown as Record<string, unknown>);
      return baseState;
    }
  });

  /**
   * Update state from sync status
   */
  const updateStateFromStatus = useCallback((status: SyncStatus) => {
    setState(prev => ({
      ...prev,
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      hasChangesToSync: status.hasChangesToSync,
      lastSyncAttempt: status.lastSyncAttempt,
      lastSuccessfulSync: status.lastSuccessfulSync,
      errors: status.errors.map(err => typeof err === 'string' ? err : err.message),
      canSync: status.isOnline && !status.isSyncing
    }));
  }, []);

  // Subscribe to sync status changes
  useEffect(() => {
    if (!syncService) return;

    const unsubscribe = syncService.onSyncStatusChange(updateStateFromStatus);
    return unsubscribe;
  }, [syncService, updateStateFromStatus]);

  // Actions
  const triggerSync = useCallback(async () => {
    if (!syncService) {
      logger.warn('SyncService not available');
      return;
    }

    try {
      await syncService.sync();
    } catch (error) {
      logger.error('Manual sync failed:', error as unknown as Record<string, unknown>);
    }
  }, [syncService]);

  const clearErrors = useCallback(() => {
    if (syncService) {
      // Also clear errors from the sync service itself
      syncService.clearErrors();
    }
    setState(prev => ({ ...prev, errors: [] }));
  }, [syncService]);

  const retry = useCallback(async () => {
    if (!syncService) {
      logger.warn('SyncService not available');
      return;
    }

    try {
      await syncService.sync(true); // Force sync
    } catch (error) {
      logger.error('Retry sync failed:', error as unknown as Record<string, unknown>);
    }
  }, [syncService]);

  return {
    state,
    actions: {
      triggerSync,
      clearErrors,
      retry
    }
  };
}