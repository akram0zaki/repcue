import React, { useEffect, useRef } from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from './SnackbarProvider';
import { DEBUG } from '../config/features';

/**
 * SyncStatusBanner component shows connectivity and sync status
 * Uses toasts for error notifications instead of persistent banners
 */
const SyncStatusBanner: React.FC = () => {
  const { isOffline, isOnline, hasBeenOffline } = useOfflineStatus();
  const { state: syncState } = useNetworkSync();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const lastErrorRef = useRef<string | null>(null);

  // Helper to format time ago
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Show sync errors as toasts instead of persistent banners
  useEffect(() => {
    if (isAuthenticated && syncState.errors.length > 0) {
      const currentError = syncState.errors[0];
      
      // Only show toast if this is a new error (different from last one)
      if (currentError !== lastErrorRef.current) {
        lastErrorRef.current = currentError;
        
        const lastAttemptText = formatTimeAgo(syncState.lastSyncAttempt);
        showSnackbar(
          `Sync failed: ${currentError} • Last attempt: ${lastAttemptText}`,
          { 
            type: 'error',
            durationMs: 8000  // Show longer for error messages
          }
        );
      }
    } else {
      // Clear reference when no errors
      lastErrorRef.current = null;
    }
  }, [isAuthenticated, syncState.errors, syncState.lastSyncAttempt, showSnackbar]);

  // Show sync in progress (for authenticated users) - as toast
  useEffect(() => {
    if (DEBUG && isAuthenticated && syncState.isSyncing) {
      showSnackbar('Syncing data... Backing up your progress to the cloud', {
        type: 'info',
        durationMs: 3000
      });
    }
  }, [DEBUG, isAuthenticated, syncState.isSyncing, showSnackbar]);

  // Show offline message (highest priority for non-authenticated users) - as toast
  const offlineMessageRef = useRef(false);
  useEffect(() => {
    if (isOffline && !offlineMessageRef.current) {
      offlineMessageRef.current = true;
      const message = isAuthenticated
        ? "You're offline. All features work normally. You'll reconnect automatically."
        : "You're offline. All features work normally. Your data is saved locally.";
      showSnackbar(message, {
        type: 'warning',
        durationMs: 5000
      });
    } else if (!isOffline) {
      offlineMessageRef.current = false;
    }
  }, [isOffline, isAuthenticated, showSnackbar]);

  // Show reconnection message briefly (for all users) - as toast
  const reconnectionMessageRef = useRef(false);
  useEffect(() => {
    if (isOnline && hasBeenOffline && !reconnectionMessageRef.current) {
      reconnectionMessageRef.current = true;
      const message = isAuthenticated
        ? (DEBUG ? "Connection restored! Data will sync automatically." : "Connection restored! All features available.")
        : "Connection restored! All features available.";
      showSnackbar(message, {
        type: 'success',
        durationMs: 4000
      });

      // Reset the flag after a delay to allow for future reconnections
      setTimeout(() => {
        reconnectionMessageRef.current = false;
      }, 10000);
    }
  }, [isOnline, hasBeenOffline, isAuthenticated, DEBUG, showSnackbar]);

  // Show pending changes indicator (for authenticated users only) - as toast
  const pendingChangesRef = useRef(false);
  useEffect(() => {
    if (DEBUG && isAuthenticated && isOnline && syncState.hasChangesToSync && !syncState.isSyncing && !pendingChangesRef.current) {
      pendingChangesRef.current = true;
      const lastSyncText = formatTimeAgo(syncState.lastSuccessfulSync);
      showSnackbar(`Changes ready to sync. Last synced: ${lastSyncText}`, {
        type: 'info',
        durationMs: 6000
      });

      // Reset flag when changes are no longer pending
      setTimeout(() => {
        pendingChangesRef.current = false;
      }, 30000);
    } else if (!syncState.hasChangesToSync) {
      pendingChangesRef.current = false;
    }
  }, [DEBUG, isAuthenticated, isOnline, syncState.hasChangesToSync, syncState.isSyncing, syncState.lastSuccessfulSync, showSnackbar]);

  // No banner when online and no sync issues
  return null;
};

export default SyncStatusBanner;
