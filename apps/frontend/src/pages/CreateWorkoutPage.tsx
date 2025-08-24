/* eslint-disable no-restricted-syntax -- i18n-exempt: form validation messages pending localization */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '../utils/localizeExercise';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import type { Exercise, Workout, WorkoutExercise, Weekday } from '../types';
import { Routes } from '../types';

interface SelectedExercise extends Exercise {
  order: number;
  customDuration?: number;
  customSets?: number;
  customReps?: number;
  customRestTime?: number;
}

const CreateWorkoutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [scheduledDays, setScheduledDays] = useState<Weekday[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const consentStatus = consentService.hasConsent();
      setHasConsent(consentStatus);

      if (consentStatus) {
        try {
          const exercises = await storageService.getExercises();
          setAvailableExercises(exercises);
        } catch (error) {
          console.error('Failed to load exercises:', error);
          setError(t('workouts.loadExercisesError'));
        }
      }
      setLoading(false);
    };

    loadData();
  }, [t]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!workoutName.trim()) {
      errors.workoutName = 'Workout name is required';
    } else if (workoutName.trim().length < 2) {
      errors.workoutName = 'Workout name must be at least 2 characters';
    }

    if (selectedExercises.length === 0) {
      errors.exercises = 'At least one exercise must be selected';
    }

    // Validate each exercise's custom values
    selectedExercises.forEach((exercise, index) => {
      if (exercise.exerciseType === 'time-based') {
        if (exercise.customDuration !== undefined && exercise.customDuration <= 0) {
          errors[`exercise_${index}_duration`] = 'Duration must be greater than 0';
        }
      } else if (exercise.exerciseType === 'repetition-based') {
        if (exercise.customSets !== undefined && exercise.customSets <= 0) {
          errors[`exercise_${index}_sets`] = 'Sets must be greater than 0';
        }
        if (exercise.customReps !== undefined && exercise.customReps <= 0) {
          errors[`exercise_${index}_reps`] = 'Reps must be greater than 0';
        }
      }
      
      if (exercise.customRestTime !== undefined && exercise.customRestTime < 0) {
        errors[`exercise_${index}_rest`] = 'Rest time cannot be negative';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addExercise = (exercise: Exercise) => {
    const newOrder = selectedExercises.length + 1;
    const selectedExercise: SelectedExercise = {
      ...exercise,
      order: newOrder,
      customDuration: exercise.exerciseType === 'time-based' ? exercise.defaultDuration : undefined,
      customSets: exercise.exerciseType === 'repetition-based' ? exercise.defaultSets : undefined,
      customReps: exercise.exerciseType === 'repetition-based' ? exercise.defaultReps : undefined,
      customRestTime: 60 // Default 60 seconds rest
    };

    setSelectedExercises([...selectedExercises, selectedExercise]);
    setShowExercisePicker(false);

    // Clear validation errors
    if (validationErrors.exercises) {
      const newErrors = { ...validationErrors };
      delete newErrors.exercises;
      setValidationErrors(newErrors);
    }
  };

  const removeExercise = (index: number) => {
    const newSelected = selectedExercises.filter((_, i) => i !== index);
    // Reorder remaining exercises
    const reordered = newSelected.map((exercise, i) => ({
      ...exercise,
      order: i + 1
    }));
    setSelectedExercises(reordered);
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    const newSelected = [...selectedExercises];
    const [movedItem] = newSelected.splice(fromIndex, 1);
    newSelected.splice(toIndex, 0, movedItem);
    
    // Reorder
    const reordered = newSelected.map((exercise, i) => ({
      ...exercise,
      order: i + 1
    }));
    setSelectedExercises(reordered);
  };

  const updateExerciseValue = (index: number, field: keyof SelectedExercise, value: number) => {
    const newSelected = [...selectedExercises];
    newSelected[index] = { ...newSelected[index], [field]: value };
    setSelectedExercises(newSelected);

    // Clear validation error for this field
    const errorKey = `exercise_${index}_${field.replace('custom', '').toLowerCase()}`;
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };

  const calculateEstimatedDuration = (): number => {
    return selectedExercises.reduce((total, exercise) => {
      let exerciseTime = 0;
      
      if (exercise.exerciseType === 'time-based') {
        exerciseTime = exercise.customDuration || exercise.defaultDuration || 30;
      } else if (exercise.exerciseType === 'repetition-based') {
        // Estimate 2 seconds per rep
        const sets = exercise.customSets || exercise.defaultSets || 1;
        const reps = exercise.customReps || exercise.defaultReps || 10;
        exerciseTime = sets * reps * 2;
      }
      
      const restTime = exercise.customRestTime || 0;
      return total + exerciseTime + restTime;
    }, 0);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create workout exercises
      const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise, index) => ({
        id: `we_${Date.now()}_${index}`,
        exerciseId: exercise.id,
        order: exercise.order,
        customDuration: exercise.customDuration,
        customSets: exercise.customSets,
        customReps: exercise.customReps,
        customRestTime: exercise.customRestTime
      }));

      // Create new workout
      const newWorkout: Workout = {
        id: `workout_${Date.now()}`,
        name: workoutName.trim(),
        description: workoutDescription.trim() || undefined,
        exercises: workoutExercises,
        estimatedDuration: calculateEstimatedDuration(),
        scheduledDays: scheduledDays,
        isActive: isActive,
        createdAt: new Date(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        version: 1
      };

      await storageService.saveWorkout(newWorkout);
      
      // Navigate back to workouts page
      navigate(Routes.WORKOUTS);
    } catch (error) {
      console.error('Failed to save workout:', error);
      setError('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('workouts.createTitle')}
            </h1>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                {t('workouts.dataRequiredBody')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
      <div className="p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('workouts.createTitle')}
          </h1>
          <button
            onClick={handleCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 p-2"
            aria-label={t('common.cancel')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Workout Name */}
          <div>
            <label htmlFor="workoutName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('workouts.nameLabel')}
            </label>
            <input
              id="workoutName"
              type="text"
              value={workoutName}
              onChange={(e) => {
                setWorkoutName(e.target.value);
                if (validationErrors.workoutName) {
                  const newErrors = { ...validationErrors };
                  delete newErrors.workoutName;
                  setValidationErrors(newErrors);
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:text-white transition-colors ${
                validationErrors.workoutName
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={t('workouts.namePlaceholder')}
              disabled={saving}
            />
            {validationErrors.workoutName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.workoutName}</p>
            )}
          </div>

          {/* Workout Description */}
          <div>
            <label htmlFor="workoutDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('workouts.descriptionLabel')}
            </label>
            <textarea
              id="workoutDescription"
              value={workoutDescription}
              onChange={(e) => setWorkoutDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('workouts.descriptionPlaceholder')}
              disabled={saving}
            />
          </div>

          {/* Workout Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('workouts.scheduleLabel')}
            </label>
            <div className="space-y-3">
              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={saving}
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('workouts.isActiveLabel')}
                </label>
              </div>
              
              {/* Days of Week */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('workouts.scheduledDaysLabel')}
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as Weekday[]).map((day) => {
                    const dayLabels = {
                      monday: t('weekdayAbbrev.monday', { defaultValue: 'Mon' }),
                      tuesday: t('weekdayAbbrev.tuesday', { defaultValue: 'Tue' }), 
                      wednesday: t('weekdayAbbrev.wednesday', { defaultValue: 'Wed' }),
                      thursday: t('weekdayAbbrev.thursday', { defaultValue: 'Thu' }),
                      friday: t('weekdayAbbrev.friday', { defaultValue: 'Fri' }),
                      saturday: t('weekdayAbbrev.saturday', { defaultValue: 'Sat' }),
                      sunday: t('weekdayAbbrev.sunday', { defaultValue: 'Sun' })
                    } as const;
                    
                    const isSelected = scheduledDays.includes(day);
                    
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setScheduledDays(prev => prev.filter(d => d !== day));
                          } else {
                            setScheduledDays(prev => [...prev, day]);
                          }
                        }}
                        className={`p-2 text-xs font-medium rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        disabled={saving || !isActive}
                      >
                        {dayLabels[day]}
                      </button>
                    );
                  })}
                </div>
                {scheduledDays.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('workouts.scheduledPerWeek', { count: scheduledDays.length })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Selected Exercises */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('workouts.exercisesLabel', { count: selectedExercises.length })}
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('workouts.estimatedAbbrev')} {formatDuration(calculateEstimatedDuration())}
              </span>
            </div>
            
            {validationErrors.exercises && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{validationErrors.exercises}</p>
            )}

            {selectedExercises.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('workouts.noneSelectedTitle')}</p>
                <button
                  onClick={() => setShowExercisePicker(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={saving}
                >
                  {t('workouts.addFirstExercise')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedExercises.map((exercise, index) => (
                  <div key={`${exercise.id}_${index}`} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {index + 1}. {exercise.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {exercise.category} • {exercise.exerciseType}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        {index > 0 && (
                          <button
                            onClick={() => moveExercise(index, index - 1)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            disabled={saving}
                            aria-label={t('workouts.moveUpAria')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                        )}
                        {index < selectedExercises.length - 1 && (
                          <button
                            onClick={() => moveExercise(index, index + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            disabled={saving}
                            aria-label={t('workouts.moveDownAria')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeExercise(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                          disabled={saving}
                          aria-label={t('workouts.removeExerciseAria')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Exercise Configuration */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {exercise.exerciseType === 'time-based' ? (
                        <div>
                          <label htmlFor={`exercise_${index}_duration`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {t('workouts.durationSeconds')}
                          </label>
                          <input
                            id={`exercise_${index}_duration`}
                            type="number"
                            min="1"
                            value={exercise.customDuration || ''}
                            onChange={(e) => updateExerciseValue(index, 'customDuration', parseInt(e.target.value) || 0)}
                            className={`w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                              validationErrors[`exercise_${index}_duration`]
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            disabled={saving}
                          />
                          {validationErrors[`exercise_${index}_duration`] && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {t('workouts.errors.durationPositive')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label htmlFor={`exercise_${index}_sets`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('workouts.sets')}
                            </label>
                            <input
                              id={`exercise_${index}_sets`}
                              type="number"
                              min="1"
                              value={exercise.customSets || ''}
                              onChange={(e) => updateExerciseValue(index, 'customSets', parseInt(e.target.value) || 0)}
                              className={`w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                                validationErrors[`exercise_${index}_sets`]
                                  ? 'border-red-300 dark:border-red-600'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                              disabled={saving}
                            />
                            {validationErrors[`exercise_${index}_sets`] && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {t('workouts.errors.setsPositive')}
                              </p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`exercise_${index}_reps`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('workouts.reps')}
                            </label>
                            <input
                              id={`exercise_${index}_reps`}
                              type="number"
                              min="1"
                              value={exercise.customReps || ''}
                              onChange={(e) => updateExerciseValue(index, 'customReps', parseInt(e.target.value) || 0)}
                              className={`w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                                validationErrors[`exercise_${index}_reps`]
                                  ? 'border-red-300 dark:border-red-600'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                              disabled={saving}
                            />
                            {validationErrors[`exercise_${index}_reps`] && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {t('workouts.errors.repsPositive')}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      
                      <div className="col-span-2">
                        <label htmlFor={`exercise_${index}_rest`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('workouts.restSeconds')}
                        </label>
                        <input
                          id={`exercise_${index}_rest`}
                          type="number"
                          min="0"
                          value={exercise.customRestTime || ''}
                          onChange={(e) => updateExerciseValue(index, 'customRestTime', parseInt(e.target.value) || 0)}
                          className={`w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                            validationErrors[`exercise_${index}_rest`]
                              ? 'border-red-300 dark:border-red-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                          disabled={saving}
                        />
                        {validationErrors[`exercise_${index}_rest`] && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {t('workouts.errors.restNonNegative')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setShowExercisePicker(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  disabled={saving}
                >
                  + {t('workouts.addAnotherExercise')}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selectedExercises.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('workouts.saving')}
                </>
              ) : (
                t('workouts.createWorkout')
              )}
            </button>
          </div>
        </div>

        {/* Exercise Picker Modal */}
        {showExercisePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('workouts.addExerciseTitle')}
                  </h3>
                  <button
                    onClick={() => setShowExercisePicker(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-80">
                <div className="space-y-2">
                  {availableExercises
                    .filter(exercise => !selectedExercises.find(selected => selected.id === exercise.id))
                    .map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => addExercise(exercise)}
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {localizeExercise(exercise, t).name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`exercises.category.${exercise.category.replace('-', '')}`, { defaultValue: exercise.category.replace('-', ' ') })} • {exercise.exerciseType === 'time-based' ? t('exercises.timeBased') : t('exercises.repBased')}
                          {exercise.exerciseType === 'time-based' 
                            ? ` • ${exercise.defaultDuration}s` 
                            : ` • ${exercise.defaultSets}×${exercise.defaultReps}`}
                        </div>
                      </button>
                    ))}
                </div>
                {availableExercises.filter(exercise => !selectedExercises.find(selected => selected.id === exercise.id)).length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('workouts.allExercisesAdded')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWorkoutPage;
