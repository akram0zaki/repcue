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
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    let suppressOnlineUntilTs = 0;
    const handleOnline = () => {
      console.log('🌐 Connection restored - switching to online mode');
      if (navigator.onLine === false) return; // Ignore synthetic online when still reported offline
      if (suppressOnlineUntilTs > Date.now()) return;
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('📴 Connection lost - switching to offline mode');
      setIsOffline(true);
      setHasBeenOffline(true);
      // Temporarily suppress immediate online events fired by other listeners in the same tick
      suppressOnlineUntilTs = Date.now() + 1;
      setTimeout(() => { suppressOnlineUntilTs = 0; }, 0);
    };

    // Add event listeners for online/offline detection on both window and document (capture + bubble)
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('online', handleOnline as EventListener, true);
    document.addEventListener('offline', handleOffline as EventListener, true);

    // Support tests dispatching custom events to simulate connectivity
    const handleCustomOffline = () => handleOffline();
    const handleCustomOnline = () => handleOnline();
    window.addEventListener('repcue:offline', handleCustomOffline as EventListener);
    window.addEventListener('repcue:online', handleCustomOnline as EventListener);
    document.addEventListener('repcue:offline', handleCustomOffline as EventListener, true);
    document.addEventListener('repcue:online', handleCustomOnline as EventListener, true);

    // Check initial state
    // Reconcile with current navigator.onLine after listeners are attached
    if (navigator.onLine === false) {
      setIsOffline(true);
      setHasBeenOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('online', handleOnline as EventListener, true);
      document.removeEventListener('offline', handleOffline as EventListener, true);
      window.removeEventListener('repcue:offline', handleCustomOffline as EventListener);
      window.removeEventListener('repcue:online', handleCustomOnline as EventListener);
      document.removeEventListener('repcue:offline', handleCustomOffline as EventListener, true);
      document.removeEventListener('repcue:online', handleCustomOnline as EventListener, true);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    hasBeenOffline
  };
};
