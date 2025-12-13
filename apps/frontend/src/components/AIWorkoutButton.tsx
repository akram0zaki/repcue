/**
 * AIWorkoutButton Component
 *
 * Entry point button for the AI workout generation feature.
 * Shows on HomePage (above workouts section) and SettingsPage (below profile section).
 * Label changes based on first-time vs. returning usage.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AI_WORKOUT_BUILDER } from '../config/features';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './auth/AuthModal';
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingNavigation = useRef(false);

  // Watch for auth state changes - navigate when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && pendingNavigation.current) {
      logger.log('[AIWorkoutButton] User authenticated, navigating to onboarding');
      setShowAuthModal(false);
      pendingNavigation.current = false;
      navigate('/ai-workout-onboarding');
    }
  }, [isAuthenticated, navigate]);

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
    logger.log('[AIWorkoutButton] Opening auth modal, setting pending navigation');
    setShowAuthGate(false);
    setShowAuthModal(true);
    pendingNavigation.current = true; // Mark that we want to navigate after auth
  };

  const handleTryLater = () => {
    logger.log('[AIWorkoutButton] User chose to try later');
    setShowAuthGate(false);
    pendingNavigation.current = false; // Cancel pending navigation
  };

  const handleAuthModalClose = () => {
    logger.log('[AIWorkoutButton] Auth modal closed', { isAuthenticated, hasPendingNav: pendingNavigation.current });
    setShowAuthModal(false);
    // If user closed modal without authenticating, cancel pending navigation
    if (!isAuthenticated) {
      pendingNavigation.current = false;
    }
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
        className={`${buttonClass} ai-workout-btn ${className}`}
        aria-label={buttonLabel}
        data-testid="ai-workout-button"
      >
        <span className="flex items-center h-full">
          {/* Icon section - left side (LTR) / right side (RTL) */}
          <span className="ai-workout-icon-section flex items-center justify-center w-12 h-12 rtl:order-2">
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
                strokeWidth={1}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </span>
          {/* Text section - right side (LTR) / left side (RTL) */}
          <span className="ai-workout-text-section flex-1 rtl:order-1 flex items-center justify-start">
            {buttonLabel}
          </span>
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

          {/* Modal Content - Mobile-first, responsive */}
          <div
            className="relative bg-white dark:bg-surface-900 rounded-lg w-full sm:max-w-md p-5 sm:p-6 shadow-2xl border border-surface-200 dark:border-surface-700"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="auth-gate-title"
            aria-describedby="auth-gate-message"
          >
            <h2
              id="auth-gate-title"
              className="text-h3 font-semibold text-text-900 dark:text-text-50 mb-3"
            >
              {t('authGate.title', 'Sign In Required')}
            </h2>
            <p
              id="auth-gate-message"
              className="text-body text-text-600 dark:text-text-400 mb-6"
            >
              {t(
                'authGate.message',
                'You must be signed in to use the AI Workout Assistant. Sign in to save your personalized workouts.'
              )}
            </p>
            {/* Buttons: always equal width and height using grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTryLater}
                className="btn-secondary w-full touch-target h-12 text-base"
              >
                {t('authGate.tryLater', 'Try Later')}
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                className="btn-primary w-full touch-target h-12 text-base"
              >
                {t('authGate.signIn', 'Sign In')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Sign In */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        initialMode="signin"
      />
    </>
  );
}
