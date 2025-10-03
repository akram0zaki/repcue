/**
 * AIWorkoutButton Component
 *
 * Entry point button for the AI workout generation feature.
 * Shows on HomePage (above workouts section) and SettingsPage (below profile section).
 * Label changes based on first-time vs. returning usage.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AI_WORKOUT_BUILDER } from '../config/features';
import { useAuth } from '../hooks/useAuth';
import logger from '../utils/logger';

interface AIWorkoutButtonProps {
  /** Variant determines the button label and styling context */
  variant?: 'primary' | 'secondary';
  /** Whether this is the user's first time using the feature */
  isFirstTime?: boolean;
  /** Optional CSS classes */
  className?: string;
}

/**
 * AI Workout Builder entry point button
 *
 * @param variant - Button styling variant (primary or secondary)
 * @param isFirstTime - Whether user is first-time or returning
 * @param className - Additional CSS classes
 */
export default function AIWorkoutButton({
  variant = 'primary',
  isFirstTime = true,
  className = '',
}: AIWorkoutButtonProps) {
  const { t } = useTranslation('aiWorkout');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  // Don't render if feature flag is disabled
  if (!AI_WORKOUT_BUILDER) {
    return null;
  }

  const handleClick = () => {
    // Check authentication before allowing access
    if (!isAuthenticated) {
      logger.log('[AIWorkoutButton] User not authenticated, showing auth gate');
      setShowAuthGate(true);
      return;
    }

    logger.log('[AIWorkoutButton] Button clicked, navigating to onboarding');
    navigate('/ai-workout-onboarding');
  };

  const handleSignIn = () => {
    setShowAuthGate(false);
    navigate('/login', { state: { returnTo: '/ai-workout-onboarding' } });
  };

  const handleTryLater = () => {
    setShowAuthGate(false);
  };

  // Determine button label based on first-time usage
  const buttonLabel = isFirstTime
    ? t('button.getStarted', 'Get Your Personalized Workout Plan')
    : t('button.createNew', 'Create New Workout Plan');

  // Determine button CSS classes based on variant
  const buttonClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${buttonClass} w-full ${className}`}
        aria-label={buttonLabel}
        data-testid="ai-workout-button"
      >
        <span className="flex items-center justify-center gap-2">
          {/* AI icon (sparkles/stars) */}
          <svg
            className="w-5 h-5"
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
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span>{buttonLabel}</span>
        </span>
      </button>

      {/* Authentication Gate Modal */}
      {showAuthGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleTryLater}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative bg-white dark:bg-surface-900 rounded-lg max-w-sm w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="auth-gate-title"
            aria-describedby="auth-gate-message"
          >
            <h2
              id="auth-gate-title"
              className="text-xl font-bold text-text-900 dark:text-text-50 mb-3"
            >
              {t('authGate.title', 'Sign In Required')}
            </h2>
            <p
              id="auth-gate-message"
              className="text-sm text-text-600 dark:text-text-400 mb-6"
            >
              {t(
                'authGate.message',
                'You must be signed in to use the AI Workout Assistant. Sign in to save your personalized workouts.'
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTryLater}
                className="btn-secondary flex-1"
              >
                {t('authGate.tryLater', 'Try Later')}
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                className="btn-primary flex-1"
              >
                {t('authGate.signIn', 'Sign In')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
