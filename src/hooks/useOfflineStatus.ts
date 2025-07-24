import { useState, useEffect } from 'react';

export interface OfflineStatus {
  isOffline: boolean;
  isOnline: boolean;
  hasBeenOffline: boolean;
}

/**
 * Hook to detect and manage offline/online status
 * Provides granular offline state management for PWA functionality
 */
export const useOfflineStatus = (): OfflineStatus => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connection restored - switching to online mode');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('📴 Connection lost - switching to offline mode');
      setIsOffline(true);
      setHasBeenOffline(true);
    };

    // Add event listeners for online/offline detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setHasBeenOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    hasBeenOffline
  };
};
