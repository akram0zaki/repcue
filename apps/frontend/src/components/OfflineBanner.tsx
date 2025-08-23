import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

/**
 * OfflineBanner component shows current connectivity status
 * Follows OWASP guidelines by not exposing sensitive connection details
 */
const OfflineBanner: React.FC = () => {
  const { isOffline, isOnline, hasBeenOffline } = useOfflineStatus();

  // Show different messages based on connection state
  if (isOffline) {
    return (
      <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-4" role="alert">
        <div className="flex items-center">
          <div className="flex-shrink-0" aria-hidden="true">
            📴
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              You're offline
            </p>
            <p className="text-xs mt-1">
              All features work normally. Your data is saved locally and will sync when reconnected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show reconnection message briefly
  if (isOnline && hasBeenOffline) {
    return (
      <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4" role="alert">
        <div className="flex items-center">
          <div className="flex-shrink-0" aria-hidden="true">
            🌐
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              Connection restored
            </p>
            <p className="text-xs mt-1">
              Back online! All features available and data will sync automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No banner when online and never been offline
  return null;
};

export default OfflineBanner;
