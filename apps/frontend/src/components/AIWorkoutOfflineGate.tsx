/**
 * AIWorkoutOfflineGate Component
 *
 * Detects offline status and shows clear messaging that the AI workout feature
 * requires an internet connection.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

interface AIWorkoutOfflineGateProps {
  /** Callback when online status changes */
  onOnlineStatusChange?: (isOnline: boolean) => void;
  /** Whether to show as a banner or inline message */
  variant?: 'banner' | 'inline';
}

/**
 * Offline detection component for AI Workout feature
 *
 * Monitors navigator.onLine and listens to online/offline events.
 * Shows appropriate messaging when user is offline.
 */
export default function AIWorkoutOfflineGate({
  onOnlineStatusChange,
  variant = 'banner',
}: AIWorkoutOfflineGateProps) {
  const { t } = useTranslation('aiWorkout');
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online if we can't detect
  });

  useEffect(() => {
    const handleOnline = () => {
      logger.log('[AIWorkoutOfflineGate] Connection restored');
      setIsOnline(true);
      onOnlineStatusChange?.(true);
    };

    const handleOffline = () => {
      logger.warn('[AIWorkoutOfflineGate] Connection lost');
      setIsOnline(false);
      onOnlineStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check current status on mount
    const currentStatus = navigator.onLine;
    if (currentStatus !== isOnline) {
      setIsOnline(currentStatus);
      onOnlineStatusChange?.(currentStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, onOnlineStatusChange]);

  // Don't render anything if online
  if (isOnline) {
    return null;
  }

  // Banner variant (shown at top of page)
  if (variant === 'banner') {
    return (
      <div
        className="bg-warning-surface border-l-4 border-warning p-4 mb-4"
        role="alert"
        aria-live="assertive"
        data-testid="ai-workout-offline-banner"
      >
        <div className="flex items-center gap-3">
          {/* Offline icon */}
          <svg
            className="w-6 h-6 text-warning flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div className="flex-1">
            <p className="text-body font-medium text-text-primary">
              {t('offlineGate.title', 'Internet Connection Required')}
            </p>
            <p className="text-small text-text-secondary mt-1">
              {t(
                'offlineGate.message',
                'The AI Workout Builder requires an internet connection to generate personalized workouts. Please connect to the internet and try again.'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (shown within a component)
  return (
    <div
      className="text-center py-8 px-4"
      role="alert"
      aria-live="assertive"
      data-testid="ai-workout-offline-inline"
    >
      {/* Offline icon */}
      <svg
        className="w-16 h-16 text-text-tertiary mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
      <h3 className="text-h3 text-text-primary mb-2">
        {t('offlineGate.title', 'Internet Connection Required')}
      </h3>
      <p className="text-body text-text-secondary max-w-md mx-auto">
        {t(
          'offlineGate.messageShort',
          'Please connect to the internet to use the AI Workout Builder.'
        )}
      </p>
    </div>
  );
}
