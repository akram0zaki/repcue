/**
 * AIWorkoutAuthGate Component
 *
 * Modal shown when unauthenticated user clicks the AI workout button.
 * Prompts user to sign in with options to proceed or defer.
 */

import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

interface AIWorkoutAuthGateProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback when user clicks "Sign In" button */
  onSignIn: () => void;
  /** Callback when user clicks "Try Later" or closes modal */
  onClose: () => void;
}

/**
 * Authentication gate modal for AI Workout feature
 *
 * Shows when unauthenticated users try to access the AI workout builder.
 * Provides clear messaging about why auth is required and options to proceed or defer.
 */
export default function AIWorkoutAuthGate({ isOpen, onSignIn, onClose }: AIWorkoutAuthGateProps) {
  const { t } = useTranslation('aiWorkout');

  if (!isOpen) {
    return null;
  }

  const handleSignIn = () => {
    logger.log('[AIWorkoutAuthGate] User clicked Sign In');
    onSignIn();
  };

  const handleTryLater = () => {
    logger.log('[AIWorkoutAuthGate] User clicked Try Later');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      logger.log('[AIWorkoutAuthGate] User clicked backdrop');
      onClose();
    }
  };

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      logger.log('[AIWorkoutAuthGate] User pressed Escape');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleEscapeKey}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      data-testid="ai-workout-auth-gate"
    >
      <div className="bg-surface-primary rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 id="auth-gate-title" className="text-h2 text-text-primary mb-2">
            {t('authGate.title', 'Sign In Required')}
          </h2>
          <p className="text-body text-text-secondary">
            {t(
              'authGate.message',
              'The RepCue AI Assistant requires an account to save your personalized workouts.'
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSignIn}
            className="btn-primary w-full"
            data-testid="auth-gate-sign-in-button"
          >
            {t('authGate.signIn', 'Sign In')}
          </button>
          <button
            type="button"
            onClick={handleTryLater}
            className="btn-neutral w-full"
            data-testid="auth-gate-try-later-button"
          >
            {t('authGate.tryLater', 'Try Later')}
          </button>
        </div>

        {/* Close button (X) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
          aria-label={t('authGate.close', 'Close')}
          data-testid="auth-gate-close-button"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
