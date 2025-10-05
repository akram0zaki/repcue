/**
 * AIWorkoutLoadingState Component
 *
 * Loading animation and messaging during AI workout generation.
 * Shows animated spinner, progress message, and handles timeout scenarios.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

interface AIWorkoutLoadingStateProps {
  /** Callback when timeout occurs (default 60s) */
  onTimeout?: () => void;
  /** Timeout duration in milliseconds (default 60000 = 60s) */
  timeoutMs?: number;
}

/**
 * Loading state component for AI workout generation
 *
 * Displays an animated loading spinner with progress messaging.
 * Respects prefers-reduced-motion for animations.
 * Handles timeout scenarios after 60 seconds.
 */
export default function AIWorkoutLoadingState({
  onTimeout,
  timeoutMs = 60000,
}: AIWorkoutLoadingStateProps) {
  const { t } = useTranslation('aiWorkout');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Update elapsed time every second
    const intervalId = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      logger.warn('[AIWorkoutLoadingState] Request timed out after', timeoutMs, 'ms');
      onTimeout?.();
    }, timeoutMs);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [onTimeout, timeoutMs]);

  const getProgressMessage = () => {
    if (elapsedSeconds < 5) {
      return t('loading.analyzing', 'Analyzing your profile...');
    } else if (elapsedSeconds < 15) {
      return t('loading.selecting', 'Selecting exercises...');
    } else if (elapsedSeconds < 25) {
      return t('loading.creating', 'Creating your personalized workouts...');
    } else {
      return t('loading.finalizing', 'Almost done...');
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="ai-workout-loading"
    >
      {/* Animated spinner */}
      <div className="relative w-20 h-20 mb-6">
        {/* Outer ring */}
        <div
          className="absolute inset-0 border-4 border-accent-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        {/* Inner ring (slower) */}
        <div
          className="absolute inset-2 border-4 border-accent-secondary border-b-transparent rounded-full animate-spin-slow motion-reduce:animate-none [animation-direction:_reverse]"
          aria-hidden="true"
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-accent-primary rounded-full animate-pulse motion-reduce:animate-none" />
        </div>
      </div>

      {/* Loading message */}
      <h2 className="text-h3 text-text-primary text-center mb-2">
        {t('loading.title', 'Creating Your Personalized Workouts')}
      </h2>

      {/* Progress message */}
      <p className="text-body text-text-secondary text-center mb-4">
        {getProgressMessage()}
      </p>

      {/* Elapsed time (shown after 10 seconds) */}
      {elapsedSeconds >= 10 && (
        <p className="text-small text-text-tertiary text-center">
          {t('loading.elapsed', 'Elapsed time: {{seconds}}s', { seconds: elapsedSeconds })}
        </p>
      )}

      {/* Helpful tip */}
      <div className="mt-8 max-w-md">
        <p className="text-small text-text-secondary text-center">
          {t(
            'loading.tip',
            'Our AI is analyzing thousands of exercises to create the perfect workout plan for you. This may take up to 30 seconds.'
          )}
        </p>
      </div>

      {/* Warning if taking too long (after 30 seconds) */}
      {elapsedSeconds >= 30 && (
        <div className="mt-4 px-4 py-3 bg-warning-surface border-l-4 border-warning rounded-lg max-w-md">
          <p className="text-small text-text-primary">
            {t(
              'loading.slowWarning',
              'This is taking longer than expected. Please wait a bit longer or try again if the process times out.'
            )}
          </p>
        </div>
      )}

      {/* Screen reader announcement */}
      <span className="sr-only">
        {t('loading.srAnnouncement', 'Generating AI workout plan. Please wait.')}
      </span>
    </div>
  );
}
