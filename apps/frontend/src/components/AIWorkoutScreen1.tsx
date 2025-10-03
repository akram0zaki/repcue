/**
 * AIWorkoutScreen1 Component
 *
 * Basic information form (Screen 1/3):
 * - Gender (Radio buttons)
 * - Age (Number input, 16-100)
 * - Height (Number input with unit selector: cm / ft+in)
 * - Weight (Number input with unit selector: kg / lbs)
 */

import { useTranslation } from 'react-i18next';
import type { Screen1Data, Screen1ValidationErrors } from '../types/aiWorkout';

interface AIWorkoutScreen1Props {
  /** Current form data */
  data: Partial<Screen1Data>;
  /** Validation errors */
  errors: Screen1ValidationErrors;
  /** Callback when form data changes */
  onChange: (data: Partial<Screen1Data>) => void;
}

/**
 * Screen 1: Basic Information form
 */
export default function AIWorkoutScreen1({ data, errors, onChange }: AIWorkoutScreen1Props) {
  const { t } = useTranslation('aiWorkout');

  const handleGenderChange = (gender: Screen1Data['gender']) => {
    onChange({ ...data, gender });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(e.target.value, 10);
    onChange({ ...data, age: isNaN(age) ? undefined : age });
  };

  const handleHeightValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...data,
      height: {
        ...data.height,
        value: isNaN(value) ? 0 : value,
        unit: data.height?.unit || 'cm',
      },
    });
  };

  const handleHeightInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inches = parseInt(e.target.value, 10);
    onChange({
      ...data,
      height: {
        ...data.height,
        value: data.height?.value || 0,
        unit: 'ft-in',
        inches: isNaN(inches) ? 0 : inches,
      },
    });
  };

  const handleHeightUnitChange = (unit: 'cm' | 'ft-in') => {
    onChange({
      ...data,
      height: {
        value: data.height?.value || 0,
        unit,
        inches: unit === 'ft-in' ? data.height?.inches || 0 : undefined,
      },
    });
  };

  const handleWeightValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...data,
      weight: {
        ...data.weight,
        value: isNaN(value) ? 0 : value,
        unit: data.weight?.unit || 'kg',
      },
    });
  };

  const handleWeightUnitChange = (unit: 'kg' | 'lbs') => {
    onChange({
      ...data,
      weight: {
        value: data.weight?.value || 0,
        unit,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen1.gender.label', 'Gender')} <span className="text-red-600">*</span>
        </label>
        <div className="flex flex-wrap gap-4">
          {(['male', 'female', 'other'] as const).map((gender) => (
            <label
              key={gender}
              className="flex items-center gap-2 cursor-pointer touch-target"
            >
              <input
                type="radio"
                name="gender"
                value={gender}
                checked={data.gender === gender}
                onChange={() => handleGenderChange(gender)}
                className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-600"
              />
              <span className="text-sm text-text-900 dark:text-text-50 capitalize">
                {t(`screen1.gender.${gender}`, gender)}
              </span>
            </label>
          ))}
        </div>
        {errors.gender && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.gender}</p>}
      </div>

      {/* Age */}
      <div>
        <label htmlFor="age" className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen1.age.label', 'Age')} <span className="text-red-600">*</span>
        </label>
        <input
          id="age"
          type="number"
          min="16"
          max="100"
          value={data.age || ''}
          onChange={handleAgeChange}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.age ? 'border-red-600' : 'border-surface-300 dark:border-surface-600'
          } bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target`}
          placeholder={t('screen1.age.placeholder', 'Enter your age')}
          aria-invalid={!!errors.age}
          aria-describedby={errors.age ? 'age-error' : undefined}
        />
        {errors.age && (
          <p id="age-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.age}
          </p>
        )}
      </div>

      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen1.height.label', 'Height')} <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={data.height?.value || ''}
            onChange={handleHeightValueChange}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              errors.height ? 'border-red-600' : 'border-surface-300 dark:border-surface-600'
            } bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target`}
            placeholder={
              data.height?.unit === 'ft-in'
                ? t('screen1.height.placeholderFeet', 'Feet')
                : t('screen1.height.placeholderCm', 'Centimeters')
            }
            aria-invalid={!!errors.height}
            aria-label={t('screen1.height.valueLabel', 'Height value')}
          />
          {data.height?.unit === 'ft-in' && (
            <input
              type="number"
              min="0"
              max="11"
              value={data.height.inches || ''}
              onChange={handleHeightInchesChange}
              className="w-20 px-4 py-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target"
              placeholder={t('screen1.height.placeholderInches', 'In')}
              aria-label={t('screen1.height.inchesLabel', 'Inches')}
            />
          )}
          <select
            value={data.height?.unit || 'cm'}
            onChange={(e) => handleHeightUnitChange(e.target.value as 'cm' | 'ft-in')}
            className="px-4 py-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target"
            aria-label={t('screen1.height.unitLabel', 'Height unit')}
          >
            <option value="cm">{t('screen1.height.unitCm', 'cm')}</option>
            <option value="ft-in">{t('screen1.height.unitFtIn', 'ft/in')}</option>
          </select>
        </div>
        {errors.height && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.height}</p>}
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
          {t('screen1.weight.label', 'Weight')} <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={data.weight?.value || ''}
            onChange={handleWeightValueChange}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              errors.weight ? 'border-red-600' : 'border-surface-300 dark:border-surface-600'
            } bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target`}
            placeholder={
              data.weight?.unit === 'lbs'
                ? t('screen1.weight.placeholderLbs', 'Pounds')
                : t('screen1.weight.placeholderKg', 'Kilograms')
            }
            aria-invalid={!!errors.weight}
            aria-label={t('screen1.weight.valueLabel', 'Weight value')}
          />
          <select
            value={data.weight?.unit || 'kg'}
            onChange={(e) => handleWeightUnitChange(e.target.value as 'kg' | 'lbs')}
            className="px-4 py-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-600 touch-target"
            aria-label={t('screen1.weight.unitLabel', 'Weight unit')}
          >
            <option value="kg">{t('screen1.weight.unitKg', 'kg')}</option>
            <option value="lbs">{t('screen1.weight.unitLbs', 'lbs')}</option>
          </select>
        </div>
        {errors.weight && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.weight}</p>}
      </div>
    </div>
  );
}
