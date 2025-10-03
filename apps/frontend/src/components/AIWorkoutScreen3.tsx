/**
 * AIWorkoutScreen3 Component
 *
 * Health & Training Style form (Screen 3/3):
 * - Injuries or Limitations (Textarea, optional, 500 char limit)
 * - Preferred Training Style (Single select chips: Strength, Cardio, Balanced)
 * - Time Availability (Dropdown: 15-30min, 30-45min, 45-60min, 60+min)
 */

import { useTranslation } from 'react-i18next';
import type { Screen3Data, Screen3ValidationErrors } from '../types/aiWorkout';
import { VALIDATION } from '../utils/aiWorkoutValidation';

interface AIWorkoutScreen3Props {
  /** Current form data */
  data: Partial<Screen3Data>;
  /** Validation errors */
  errors: Screen3ValidationErrors;
  /** Callback when form data changes */
  onChange: (data: Partial<Screen3Data>) => void;
}

/**
 * Screen 3: Health & Training Style form
 */
export default function AIWorkoutScreen3({ data, errors, onChange }: AIWorkoutScreen3Props) {
  const { t } = useTranslation('aiWorkout');

  const handleInjuriesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, injuries: e.target.value });
  };

  const handleTrainingStyleChange = (trainingStyle: Screen3Data['trainingStyle']) => {
    onChange({ ...data, trainingStyle });
  };

  const handleTimeAvailabilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...data, timeAvailability: e.target.value as Screen3Data['timeAvailability'] });
  };

  const trainingStyles: Array<{ value: Screen3Data['trainingStyle']; labelKey: string; descKey: string }> = [
    { value: 'strength', labelKey: 'screen3.trainingStyle.strength', descKey: 'screen3.trainingStyle.strengthDesc' },
    { value: 'cardio', labelKey: 'screen3.trainingStyle.cardio', descKey: 'screen3.trainingStyle.cardioDesc' },
    { value: 'balanced', labelKey: 'screen3.trainingStyle.balanced', descKey: 'screen3.trainingStyle.balancedDesc' },
  ];

  const timeOptions: Array<{ value: Screen3Data['timeAvailability']; labelKey: string }> = [
    { value: '15-30', labelKey: 'screen3.timeAvailability.15-30' },
    { value: '30-45', labelKey: 'screen3.timeAvailability.30-45' },
    { value: '45-60', labelKey: 'screen3.timeAvailability.45-60' },
    { value: '60+', labelKey: 'screen3.timeAvailability.60+' },
  ];

  const currentLength = data.injuries?.length || 0;
  const remainingChars = VALIDATION.INJURIES_MAX_LENGTH - currentLength;

  return (
    <div className="space-y-8">
      {/* Injuries or Limitations */}
      <div>
        <label htmlFor="injuries" className="block text-body font-medium text-text-primary mb-2">
          {t('screen3.injuries.label', 'Injuries or Limitations (Optional)')}
        </label>
        <p className="text-small text-text-secondary mb-3">
          {t(
            'screen3.injuries.description',
            'Let us know about any injuries or physical limitations so we can recommend safe exercises.'
          )}
        </p>
        <textarea
          id="injuries"
          value={data.injuries || ''}
          onChange={handleInjuriesChange}
          maxLength={VALIDATION.INJURIES_MAX_LENGTH}
          rows={4}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.injuries ? 'border-error' : 'border-border'
          } bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none`}
          placeholder={t(
            'screen3.injuries.placeholder',
            'e.g., Lower back pain, knee injury, shoulder mobility issues'
          )}
          aria-invalid={!!errors.injuries}
          aria-describedby={errors.injuries ? 'injuries-error' : 'injuries-counter'}
        />
        <div className="flex items-center justify-between mt-2">
          {errors.injuries ? (
            <p id="injuries-error" className="text-small text-error">
              {errors.injuries}
            </p>
          ) : (
            <div />
          )}
          <p
            id="injuries-counter"
            className={`text-small ${
              remainingChars < 50 ? 'text-warning' : 'text-text-tertiary'
            }`}
          >
            {t('screen3.injuries.charCount', '{{remaining}} characters remaining', {
              remaining: remainingChars,
            })}
          </p>
        </div>
      </div>

      {/* Preferred Training Style */}
      <div>
        <label className="block text-body font-medium text-text-primary mb-3">
          {t('screen3.trainingStyle.label', 'Preferred Training Style')} <span className="text-error">*</span>
        </label>
        <div className="space-y-3">
          {trainingStyles.map(({ value, labelKey, descKey }) => {
            const isSelected = data.trainingStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTrainingStyleChange(value)}
                className={`
                  w-full min-h-[44px] px-4 py-3 rounded-lg border-2 transition-all
                  text-start-rtl
                  ${
                    isSelected
                      ? 'border-accent-primary bg-accent-surface'
                      : 'border-border bg-surface-primary hover:border-accent-primary hover:bg-accent-surface'
                  }
                `}
                role="radio"
                aria-checked={isSelected}
                aria-label={t(labelKey, value)}
              >
                <div className="flex items-center gap-3">
                  {/* Radio indicator */}
                  <div
                    className={`
                      flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${
                        isSelected
                          ? 'border-accent-primary bg-accent-primary'
                          : 'border-border bg-surface-primary'
                      }
                    `}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className={`text-body font-medium ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>
                      {t(labelKey, value)}
                    </div>
                    <div className="text-small text-text-secondary mt-1">
                      {t(descKey, `${value} training description`)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.trainingStyle && <p className="text-small text-error mt-2">{errors.trainingStyle}</p>}
      </div>

      {/* Time Availability */}
      <div>
        <label htmlFor="timeAvailability" className="block text-body font-medium text-text-primary mb-2">
          {t('screen3.timeAvailability.label', 'Time Availability per Session')} <span className="text-error">*</span>
        </label>
        <p className="text-small text-text-secondary mb-3">
          {t('screen3.timeAvailability.description', 'How much time can you dedicate to each workout session?')}
        </p>
        <select
          id="timeAvailability"
          value={data.timeAvailability || ''}
          onChange={handleTimeAvailabilityChange}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.timeAvailability ? 'border-error' : 'border-border'
          } bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[44px]`}
          aria-invalid={!!errors.timeAvailability}
          aria-describedby={errors.timeAvailability ? 'time-error' : undefined}
        >
          <option value="">{t('screen3.timeAvailability.select', 'Select time availability')}</option>
          {timeOptions.map(({ value, labelKey }) => (
            <option key={value} value={value}>
              {t(labelKey, `${value} minutes`)}
            </option>
          ))}
        </select>
        {errors.timeAvailability && (
          <p id="time-error" className="text-small text-error mt-2">
            {errors.timeAvailability}
          </p>
        )}
      </div>
    </div>
  );
}
