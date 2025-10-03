/**
 * AIWorkoutScreen2 Component
 *
 * Goals & Preferences form (Screen 2/3):
 * - Primary Goal (Single select chips: Weight Loss, Muscle Building, Health Maintenance, Flexibility)
 * - Fitness Level (Single select chips: Beginner, Intermediate, Advanced)
 * - Preferred Training Time (Single select chips: Morning, Afternoon, Evening, Mixed)
 */

import { useTranslation } from 'react-i18next';
import type { Screen2Data, Screen2ValidationErrors } from '../types/aiWorkout';

interface AIWorkoutScreen2Props {
  /** Current form data */
  data: Partial<Screen2Data>;
  /** Validation errors */
  errors: Screen2ValidationErrors;
  /** Callback when form data changes */
  onChange: (data: Partial<Screen2Data>) => void;
}

/**
 * Screen 2: Goals & Preferences form
 */
export default function AIWorkoutScreen2({ data, errors, onChange }: AIWorkoutScreen2Props) {
  const { t } = useTranslation('aiWorkout');

  const handleGoalChange = (goal: Screen2Data['goal']) => {
    onChange({ ...data, goal });
  };

  const handleFitnessLevelChange = (fitnessLevel: Screen2Data['fitnessLevel']) => {
    onChange({ ...data, fitnessLevel });
  };

  const handleTrainingTimeChange = (trainingTime: Screen2Data['trainingTime']) => {
    onChange({ ...data, trainingTime });
  };

  const goals: Array<{ value: Screen2Data['goal']; labelKey: string }> = [
    { value: 'weight_loss', labelKey: 'screen2.goal.weightLoss' },
    { value: 'muscle_building', labelKey: 'screen2.goal.muscleBuilding' },
    { value: 'health_maintenance', labelKey: 'screen2.goal.healthMaintenance' },
    { value: 'flexibility', labelKey: 'screen2.goal.flexibility' },
  ];

  const fitnessLevels: Array<{ value: Screen2Data['fitnessLevel']; labelKey: string; descKey: string }> = [
    { value: 'beginner', labelKey: 'screen2.fitnessLevel.beginner', descKey: 'screen2.fitnessLevel.beginnerDesc' },
    { value: 'intermediate', labelKey: 'screen2.fitnessLevel.intermediate', descKey: 'screen2.fitnessLevel.intermediateDesc' },
    { value: 'advanced', labelKey: 'screen2.fitnessLevel.advanced', descKey: 'screen2.fitnessLevel.advancedDesc' },
  ];

  const trainingTimes: Array<{ value: Screen2Data['trainingTime']; labelKey: string }> = [
    { value: 'morning', labelKey: 'screen2.trainingTime.morning' },
    { value: 'afternoon', labelKey: 'screen2.trainingTime.afternoon' },
    { value: 'evening', labelKey: 'screen2.trainingTime.evening' },
    { value: 'mixed', labelKey: 'screen2.trainingTime.mixed' },
  ];

  return (
    <div className="space-y-5">
      {/* Primary Goal */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen2.goal.label', 'Primary Goal')} <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {goals.map(({ value, labelKey }) => {
            const isSelected = data.goal === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleGoalChange(value)}
                className={`
                  touch-target px-3 py-2.5 rounded-lg border-2 transition-all
                  text-xs font-medium text-center break-words
                  ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }
                `}
                role="radio"
                aria-checked={isSelected}
                aria-label={t(labelKey, value)}
              >
                {t(labelKey, value.replace('_', ' '))}
              </button>
            );
          })}
        </div>
        {errors.goal && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.goal}</p>}
      </div>

      {/* Fitness Level */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen2.fitnessLevel.label', 'Fitness Level')} <span className="text-red-600">*</span>
        </label>
        <div className="space-y-2">
          {fitnessLevels.map(({ value, labelKey, descKey }) => {
            const isSelected = data.fitnessLevel === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleFitnessLevelChange(value)}
                className={`
                  w-full touch-target px-4 py-3 rounded-lg border-2 transition-all
                  text-start-rtl
                  ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }
                `}
                role="radio"
                aria-checked={isSelected}
                aria-label={t(labelKey, value)}
              >
                <div className="flex items-start gap-3">
                  {/* Radio indicator */}
                  <div
                    className={`
                      flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                      ${
                        isSelected
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className={`text-sm font-medium break-words ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-text-900 dark:text-text-50'}`}>
                      {t(labelKey, value)}
                    </div>
                    <div className="text-xs secondary-label-text mt-0.5 break-words">
                      {t(descKey, `${value} description`)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.fitnessLevel && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.fitnessLevel}</p>}
      </div>

      {/* Preferred Training Time */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen2.trainingTime.label', 'Preferred Training Time')} <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {trainingTimes.map(({ value, labelKey }) => {
            const isSelected = data.trainingTime === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTrainingTimeChange(value)}
                className={`
                  touch-target px-3 py-2.5 rounded-lg border-2 transition-all
                  text-xs font-medium text-center break-words
                  ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }
                `}
                role="radio"
                aria-checked={isSelected}
                aria-label={t(labelKey, value)}
              >
                {t(labelKey, value)}
              </button>
            );
          })}
        </div>
        {errors.trainingTime && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.trainingTime}</p>}
      </div>
    </div>
  );
}
