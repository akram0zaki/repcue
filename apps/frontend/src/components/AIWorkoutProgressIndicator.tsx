/**
 * AIWorkoutProgressIndicator Component
 *
 * Pill-shaped pagination indicator showing which screen the user is on.
 * Displays small pills for inactive screens and a larger pill for the current screen.
 */

import { useTranslation } from 'react-i18next';

interface AIWorkoutProgressIndicatorProps {
  /** Current step (1-3) */
  currentStep: 1 | 2 | 3;
  /** Total number of steps (always 3 for AI workout flow) */
  totalSteps?: 3;
}

/**
 * Pill-shaped pagination indicator for AI workout onboarding flow
 *
 * Shows rounded pills with current step larger/highlighted
 */
export default function AIWorkoutProgressIndicator({
  currentStep,
  totalSteps = 3,
}: AIWorkoutProgressIndicatorProps) {
  const { t } = useTranslation('aiWorkout');

  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="w-full flex justify-center" role="navigation" aria-label={t('progress.label', 'Progress')}>
      <div className="flex items-center gap-2">
        {steps.map((step) => {
          const isCurrent = step === currentStep;

          return (
            <div
              key={step}
              className={`
                rounded-full
                transition-all duration-300 ease-in-out
                ${
                  isCurrent
                    ? 'w-6 h-2.5 bg-primary-600 dark:bg-primary-400'
                    : 'w-10 h-2.5 bg-gray-400 dark:bg-gray-500 opacity-50'
                }
              `}
              role="img"
              aria-label={
                isCurrent
                  ? t('progress.current', 'Step {{step}} current', { step })
                  : t('progress.step', 'Step {{step}}', { step })
              }
              aria-current={isCurrent ? 'step' : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
