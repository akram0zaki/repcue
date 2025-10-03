/**
 * AIWorkoutButton Component
 *
 * Entry point button for the AI workout generation feature.
 * Shows on HomePage (above workouts section) and SettingsPage (below profile section).
 * Label changes based on first-time vs. returning usage.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AI_WORKOUT_BUILDER } from '../config/features';
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

  // Don't render if feature flag is disabled
  if (!AI_WORKOUT_BUILDER) {
    return null;
  }

  const handleClick = () => {
    logger.log('[AIWorkoutButton] Button clicked, navigating to onboarding');
    navigate('/ai-workout-onboarding');
  };

  // Determine button label based on first-time usage
  const buttonLabel = isFirstTime
    ? t('button.getStarted', 'Get Your Personalized Workout Plan')
    : t('button.createNew', 'Create New Workout Plan');

  // Determine button CSS classes based on variant
  const buttonClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  return (
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
  );
}
