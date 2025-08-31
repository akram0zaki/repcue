import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { useAuth } from '../hooks/useAuth';
import { DEBUG } from '../config/features';

/**
 * SyncStatusBanner component shows connectivity and sync status
 * Extends OfflineBanner with sync capabilities
 */
const SyncStatusBanner: React.FC = () => {
  const { isOffline, isOnline, hasBeenOffline } = useOfflineStatus();
  const { state: syncState, actions: syncActions } = useNetworkSync();
  const { isAuthenticated } = useAuth();

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

  // Show sync error state (highest priority)
  if (DEBUG && isAuthenticated && syncState.errors.length > 0) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4" role="alert" data-testid="sync-status-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0" aria-hidden="true">
              ⚠️
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Sync failed
              </p>
              <p className="text-xs mt-1">
                {syncState.errors[0]} • Last attempt: {formatTimeAgo(syncState.lastSyncAttempt)}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={syncActions.clearErrors}
              className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 transition-colors"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
            {isOnline && (
              <button
                onClick={syncActions.retry}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                aria-label="Retry sync"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show sync in progress (for authenticated users)
  if (DEBUG && isAuthenticated && syncState.isSyncing) {
    return (
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4" role="status" data-testid="sync-status-banner">
        <div className="flex items-center">
          <div className="flex-shrink-0" aria-hidden="true">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              Syncing data...
            </p>
            <p className="text-xs mt-1">
              Backing up your progress to the cloud
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show offline message (highest priority for non-authenticated users)
  if (isOffline) {
    return (
      <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-4" role="alert" data-testid="sync-status-banner">
        <div className="flex items-center">
          <div className="flex-shrink-0" aria-hidden="true">
            📴
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              You're offline
            </p>
            <p className="text-xs mt-1">
              {isAuthenticated
                ? "All features work normally. You'll reconnect automatically."
                : "All features work normally. Your data is saved locally."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show reconnection message briefly (for all users)
  if (isOnline && hasBeenOffline) {
    return (
      <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4" role="alert" data-testid="sync-status-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0" aria-hidden="true">
              🌐
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Connection restored
              </p>
              <p className="text-xs mt-1">
                {isAuthenticated
                  ? (DEBUG ? "Back online! Data will sync automatically." : "Back online! All features available.")
                  : "Back online! All features available."
                }
              </p>
            </div>
          </div>
          {DEBUG && isAuthenticated && syncState.hasChangesToSync && (
            <button
              onClick={syncActions.triggerSync}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors ml-3"
              aria-label="Sync now"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show pending changes indicator (for authenticated users only)
  if (DEBUG && isAuthenticated && isOnline && syncState.hasChangesToSync && !syncState.isSyncing) {
    const lastSyncText = formatTimeAgo(syncState.lastSuccessfulSync);
    
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4" role="status" data-testid="sync-status-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0" aria-hidden="true">
              🔄
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Changes ready to sync
              </p>
              <p className="text-xs mt-1">
                Last synced: {lastSyncText}
              </p>
            </div>
          </div>
          <button
            onClick={syncActions.triggerSync}
            className="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            aria-label="Sync changes now"
          >
            Sync
          </button>
        </div>
      </div>
    );
  }

  // No banner when online and no sync issues
  return null;
};

export default SyncStatusBanner;
