import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { isOffline, isOnline, hasBeenOffline } = useOfflineStatus();
  const { state: syncState } = useNetworkSync();
  const { isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const lastErrorRef = useRef<string | null>(null);

  // Helper to format time ago
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return t('sync.timeAgo.never');
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return t('sync.timeAgo.justNow');
    if (minutes < 60) return t('sync.timeAgo.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('sync.timeAgo.hoursAgo', { count: hours });
    return t('sync.timeAgo.daysAgo', { count: Math.floor(hours / 24) });
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
          t('sync.failed', { error: currentError }) + ' • ' + t('sync.lastAttempt', { time: lastAttemptText }),
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
  }, [isAuthenticated, syncState.errors, syncState.lastSyncAttempt, showSnackbar, t, formatTimeAgo]);

  // Show sync in progress (for authenticated users) - as toast
  useEffect(() => {
    if (DEBUG && isAuthenticated && syncState.isSyncing) {
      showSnackbar(t('sync.syncing') + ' ' + t('sync.backingUp'), {
        type: 'info',
        durationMs: 3000
      });
    }
  }, [DEBUG, isAuthenticated, syncState.isSyncing, showSnackbar, t]);

  // Show offline message (highest priority for non-authenticated users) - as toast
  const offlineMessageRef = useRef(false);
  useEffect(() => {
    if (isOffline && !offlineMessageRef.current) {
      offlineMessageRef.current = true;
      const message = isAuthenticated
        ? t('sync.offline.authenticated')
        : t('sync.offline.unauthenticated');
      showSnackbar(message, {
        type: 'warning',
        durationMs: 5000
      });
    } else if (!isOffline) {
      offlineMessageRef.current = false;
    }
  }, [isOffline, isAuthenticated, showSnackbar, t]);

  // Show reconnection message briefly (for all users) - as toast
  const reconnectionMessageRef = useRef(false);
  useEffect(() => {
    if (isOnline && hasBeenOffline && !reconnectionMessageRef.current) {
      reconnectionMessageRef.current = true;
      const message = isAuthenticated
        ? (DEBUG ? t('sync.reconnected.authenticated') : t('sync.reconnected.authenticatedSimple'))
        : t('sync.reconnected.unauthenticated');
      showSnackbar(message, {
        type: 'success',
        durationMs: 4000
      });

      // Reset the flag after a delay to allow for future reconnections
      setTimeout(() => {
        reconnectionMessageRef.current = false;
      }, 10000);
    }
  }, [isOnline, hasBeenOffline, isAuthenticated, DEBUG, showSnackbar, t]);

  // Show pending changes indicator (for authenticated users only) - as toast
  const pendingChangesRef = useRef(false);
  useEffect(() => {
    if (DEBUG && isAuthenticated && isOnline && syncState.hasChangesToSync && !syncState.isSyncing && !pendingChangesRef.current) {
      pendingChangesRef.current = true;
      const lastSyncText = formatTimeAgo(syncState.lastSuccessfulSync);
      showSnackbar(t('sync.pendingChanges', { time: lastSyncText }), {
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
  }, [DEBUG, isAuthenticated, isOnline, syncState.hasChangesToSync, syncState.isSyncing, syncState.lastSuccessfulSync, showSnackbar, t, formatTimeAgo]);

  // No banner when online and no sync issues
  return null;
};

export default SyncStatusBanner;
