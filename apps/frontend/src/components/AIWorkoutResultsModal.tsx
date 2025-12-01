/**
 * AIWorkoutResultsModal Component
 *
 * Success screen displaying AI-generated workouts.
 * Shows list of workouts with details and action buttons.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GeneratedWorkout } from '../types/aiWorkout';
import logger from '../utils/logger';

interface AIWorkoutResultsModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Generated workouts to display */
  workouts: GeneratedWorkout[];
  /** AI-generated feedback for the user */
  feedback?: string;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to generate new workouts */
  onGenerateAgain: () => void;
}

/**
 * Results modal showing AI-generated workouts
 *
 * Displays success message, workout details, and action buttons.
 * Provides options to view workouts, generate again, or close.
 */
export default function AIWorkoutResultsModal({
  isOpen,
  workouts,
  feedback,
  onClose,
  onGenerateAgain,
}: AIWorkoutResultsModalProps) {
  const { t } = useTranslation('aiWorkout');
  const navigate = useNavigate();

  // Prevent body scroll when modal is open (iOS Safari fix)
  useEffect(() => {
    if (!isOpen) return;

    // Save current scroll position and body styles
    const scrollY = window.scrollY;
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };

    // Lock body scroll - this combination works on iOS Safari
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      // Restore original styles
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.width = originalStyles.width;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleViewWorkouts = () => {
    logger.log('[AIWorkoutResultsModal] Navigating to workouts page');
    navigate('/workouts');
  };

  const handleGenerateAgain = () => {
    logger.log('[AIWorkoutResultsModal] User clicked Generate Again');
    onGenerateAgain();
  };

  const handleClose = () => {
    logger.log('[AIWorkoutResultsModal] User closed modal');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return t('results.durationSeconds', '{{seconds}}s', { seconds });
    }
    const minutes = Math.round(seconds / 60);
    return t('results.durationMinutes', '{{minutes}} min', { minutes });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      onKeyDown={handleEscapeKey}
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      data-testid="ai-workout-results-modal"
    >
      <div className="bg-surface-primary rounded-lg shadow-lg max-w-2xl w-full my-8 relative">
        {/* Close button (X) */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors z-10"
          aria-label={t('results.close', 'Close')}
          data-testid="results-close-button"
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

        {/* Header */}
        <div className="p-6 border-b border-border">
          {/* Success icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-success-surface rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 id="results-title" className="text-h2 text-text-primary text-center mb-2">
            {t('results.title', 'Your Personalized Workouts Are Ready!')}
          </h2>
          <p className="text-body text-text-secondary text-center">
            {t(
              'results.subtitle',
              'We created {{count}} workout plan{{plural}} tailored to your goals.',
              { count: workouts.length, plural: workouts.length > 1 ? 's' : '' }
            )}
          </p>
        </div>

        {/* AI Feedback Section (if available) */}
        {feedback && (
          <div className="px-6 py-4 bg-info-surface border-t border-b border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <svg
                  className="w-5 h-5 text-info"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-body font-semibold text-text-primary mb-1">
                  {t('results.feedbackTitle', 'AI Coach Insights')}
                </h3>
                <p className="text-body text-text-secondary whitespace-pre-line">
                  {feedback}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workouts list */}
        <div className="p-6 max-h-96 overflow-y-auto overscroll-contain">
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="p-4 bg-surface-secondary rounded-lg border border-border hover:border-accent-primary transition-colors"
              >
                {/* AI badge - separate line for better readability */}
                <div className="mb-3">
                  <span className="inline-block px-2 py-1 bg-accent-surface text-accent-primary text-small font-medium rounded">
                    {t('results.aiGeneratedBadge', 'AI-Generated')}
                  </span>
                </div>

                {/* Workout name and description */}
                <div className="mb-2">
                  <h3 className="text-body font-semibold text-text-primary mb-2">
                    {workout.name}
                  </h3>
                  <p className="text-small text-text-secondary line-clamp-2">
                    {workout.description}
                  </p>
                </div>

                {/* Workout details */}
                <div className="flex items-center gap-4 mt-3 text-small text-text-tertiary">
                  {/* Exercise count */}
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span>
                      {t('results.exerciseCount', '{{count}} exercise{{plural}}', {
                        count: workout.exercises.length,
                        plural: workout.exercises.length > 1 ? 's' : '',
                      })}
                    </span>
                  </div>

                  {/* Estimated duration */}
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{formatDuration(workout.estimatedDuration)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border bg-surface-secondary rounded-b-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleViewWorkouts}
              className="btn-primary flex-1"
              data-testid="results-view-workouts-button"
            >
              {t('results.viewWorkouts', 'View Workouts')}
            </button>
            <button
              type="button"
              onClick={handleGenerateAgain}
              className="btn-secondary flex-1"
              data-testid="results-generate-again-button"
            >
              {t('results.generateAgain', 'Generate Again')}
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-neutral w-full mt-3"
            data-testid="results-close-action-button"
          >
            {t('results.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
