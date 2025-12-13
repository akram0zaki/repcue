import { useEffect, useRef, useState, useCallback } from 'react';
import { isNativePlatform } from '../utils/nativeCapabilities';
import logger from '../utils/logger';

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
  const isNative = isNativePlatform();

  // Check if Wake Lock API is supported (always true on native due to Capacitor plugin)
  useEffect(() => {
    setIsSupported(isNative || 'wakeLock' in navigator);
  }, [isNative]);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    // Use Capacitor plugin on native platforms
    if (isNative) {
      try {
        const { KeepAwake } = await import('@capacitor-community/keep-awake');
        await KeepAwake.keepAwake();
        logger.log('🔆 Native screen wake lock acquired');
        setIsActive(true);
        return true;
      } catch (error) {
        logger.warn('Failed to request native wake lock:', error);
        return false;
      }
    }

    // Web Wake Lock API fallback
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      const wakeLock = await (navigator as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      wakeLockRef.current = wakeLock;
      
      // Listen for wake lock release
      const handleRelease = () => {
        // Wake lock released - reducing verbosity
        setIsActive(false);
        wakeLockRef.current = null;
      };

      if (wakeLockRef.current) {
        wakeLockRef.current.addEventListener('release', handleRelease);
      }
      
      // Wake lock acquired - reducing verbosity
      setIsActive(true);
      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      return false;
    }
  }, [isNative]);

  const releaseWakeLock = useCallback(async (): Promise<void> => {
    // Use Capacitor plugin on native platforms
    if (isNative) {
      try {
        const { KeepAwake } = await import('@capacitor-community/keep-awake');
        await KeepAwake.allowSleep();
        logger.log('😴 Native screen wake lock released');
        setIsActive(false);
        return;
      } catch (error) {
        logger.warn('Failed to release native wake lock:', error);
      }
    }

    // Web Wake Lock API fallback
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
        // Wake lock manually released - reducing verbosity
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }
    wakeLockRef.current = null;
    setIsActive(false);
  }, [isNative]);

  // Auto-reacquire wake lock when page becomes visible (handles phone wake from sleep)
  // Only applies to web - native plugin handles this automatically
  useEffect(() => {
    if (isNative) return; // Native plugin handles visibility automatically

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        // Page became visible, re-requesting wake lock - reducing verbosity
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isSupported, requestWakeLock, isNative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isNative || wakeLockRef.current) {
        releaseWakeLock();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
};

export default useWakeLock; 