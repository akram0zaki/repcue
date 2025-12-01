/**
 * AIWorkoutScreen2 Component
 *
 * Goals & Preferences form (Screen 2/3):
 * - Primary Goals (Multi-select chips: Weight Loss, Muscle Building, Health Maintenance, Flexibility, Marathon des Sables)
 * - Goal Duration (Optional: Time in months to achieve goals)
 * - Fitness Level (Single select chips: Beginner, Intermediate, Advanced)
 * - Preferred Training Time (Single select chips: Morning, Afternoon, Evening, Mixed)
 */

import { useTranslation } from 'react-i18next';
import type { Screen2Data, Screen2ValidationErrors, FitnessGoal } from '../types/aiWorkout';

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

  const handleGoalToggle = (goal: FitnessGoal) => {
    const currentGoals = data.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    onChange({ ...data, goals: newGoals });
  };

  const handleGoalDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const duration = value === '' ? undefined : parseInt(value, 10);
    onChange({ ...data, goalDuration: duration });
  };

  const handleFitnessLevelChange = (fitnessLevel: Screen2Data['fitnessLevel']) => {
    onChange({ ...data, fitnessLevel });
  };

  const handleTrainingTimeChange = (trainingTime: Screen2Data['trainingTime']) => {
    onChange({ ...data, trainingTime });
  };

  const goals: Array<{ value: FitnessGoal; labelKey: string }> = [
    { value: 'weight_loss', labelKey: 'screen2.goals.weightLoss' },
    { value: 'muscle_building', labelKey: 'screen2.goals.muscleBuilding' },
    { value: 'health_maintenance', labelKey: 'screen2.goals.healthMaintenance' },
    { value: 'flexibility', labelKey: 'screen2.goals.flexibility' },
    { value: 'marathon_des_sables', labelKey: 'screen2.goals.marathonDesSables' },
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
      {/* Primary Goals (Multi-select) */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen2.goals.label', 'Primary Goals')} <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-text-600 dark:text-text-400 mb-2">
          {t('screen2.goals.helper', 'Select one or more goals you want to achieve')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goals.map(({ value, labelKey }) => {
            const isSelected = (data.goals || []).includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleGoalToggle(value)}
                className={`
                  touch-target px-3 py-2.5 rounded-lg border-2 transition-all
                  text-xs font-medium text-center break-words
                  ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }
                `}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={t(labelKey, value)}
              >
                {t(labelKey, value.replace(/_/g, ' '))}
              </button>
            );
          })}
        </div>
        {errors.goals && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.goals}</p>}
      </div>

      {/* Goal Duration */}
      <div>
        <label htmlFor="goal-duration" className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen2.goalDuration.label', 'Time to Achieve Goals (Optional)')}
        </label>
        <p className="text-xs text-text-600 dark:text-text-400 mb-2">
          {t('screen2.goalDuration.helper', 'How many months do you have to achieve your goals?')}
        </p>
        <div className="relative">
          <input
            id="goal-duration"
            type="number"
            min="1"
            max="24"
            value={data.goalDuration || ''}
            onChange={handleGoalDurationChange}
            placeholder={t('screen2.goalDuration.placeholder', 'e.g., 3, 6, 12')}
            className="
              w-full px-4 py-2.5 rounded-lg border-2
              border-surface-300 dark:border-surface-600
              bg-surface-0 dark:bg-surface-800
              text-text-900 dark:text-text-50
              placeholder:text-text-400 dark:placeholder:text-text-500
              focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20
              transition-colors
            "
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-500 dark:text-text-400">
            {t('screen2.goalDuration.unit', 'months')}
          </span>
        </div>
        {errors.goalDuration && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.goalDuration}</p>}
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
