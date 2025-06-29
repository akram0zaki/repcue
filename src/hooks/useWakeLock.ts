import { useEffect, useRef, useState } from 'react';

// Wake Lock API types (not in all TypeScript versions)
interface WakeLockSentinel {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

// Wake Lock API types (for TypeScript compatibility)

export const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async (): Promise<boolean> => {
    if (!isSupported || !(navigator as any).wakeLock) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      
      // Listen for wake lock release
      const handleRelease = () => {
        console.log('Wake lock released');
        setIsActive(false);
        wakeLockRef.current = null;
      };

      if (wakeLockRef.current) {
        wakeLockRef.current.addEventListener('release', handleRelease);
      }
      
      console.log('Wake lock acquired - screen will stay active');
      setIsActive(true);
      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      return false;
    }
  };

  const releaseWakeLock = async (): Promise<void> => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
        console.log('Wake lock manually released');
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }
    wakeLockRef.current = null;
    setIsActive(false);
  };

  // Auto-reacquire wake lock when page becomes visible (handles phone wake from sleep)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        console.log('Page became visible, re-requesting wake lock');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        releaseWakeLock();
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
};

export default useWakeLock; 