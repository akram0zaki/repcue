/* eslint-disable no-restricted-syntax -- i18n-exempt: form validation/fallback strings pending localization */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import type { Exercise, Workout, WorkoutExercise, Weekday } from '../types';
import { Routes } from '../types';
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '../utils/localizeExercise';

interface SelectedExercise extends Exercise {
  order: number;
  custom_duration?: number;
  custom_sets?: number;
  custom_reps?: number;
  custom_rest_time?: number;
}

const EditWorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get('id');
  const { t } = useTranslation();

  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
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

      if (!consentStatus) {
        setLoading(false);
        return;
      }

      if (!workoutId) {
        setError(t('workouts.missingId'));
        setLoading(false);
        return;
      }

      try {
        const [exercises, workoutData] = await Promise.all([
          storageService.getExercises(),
          storageService.getWorkout(workoutId)
        ]);

        setAvailableExercises(exercises);

        if (!workoutData) {
          setError(t('workouts.loadFailed'));
          setLoading(false);
          return;
        }

        setWorkout(workoutData);
        setWorkoutName(workoutData.name);
        setWorkoutDescription(workoutData.description || '');
        setScheduledDays(workoutData.scheduled_days || []);
        setIsActive(workoutData.is_active ?? true);

        // Convert workout exercises to selected exercises
        const selectedExs: SelectedExercise[] = workoutData.exercises.map((we, index) => {
          const exercise = exercises.find(e => e.id === we.exercise_id);
          if (!exercise) {
            throw new Error(`Exercise not found: ${we.exercise_id}`);
          }
          return {
            ...exercise,
            order: we.order || index,
            custom_duration: we.custom_duration,
            custom_sets: we.custom_sets,
            custom_reps: we.custom_reps,
            custom_rest_time: we.custom_rest_time
          };
        });

        setSelectedExercises(selectedExs);
      } catch (error) {
        console.error('Failed to load workout:', error);
        setError(t('workouts.loadFailed'));
      }
      setLoading(false);
    };

    loadData();
  }, [workoutId, t]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!workoutName.trim()) {
      errors.name = 'Workout name is required';
    }

    if (selectedExercises.length === 0) {
      errors.exercises = 'At least one exercise is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!hasConsent || !workout) return;

  if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create workout exercises
      const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise, index) => ({
        id: `we_${Date.now()}_${index}`,
        exercise_id: exercise.id,
        order: exercise.order,
        custom_duration: exercise.custom_duration,
        custom_sets: exercise.custom_sets,
        custom_reps: exercise.custom_reps,
        custom_rest_time: exercise.custom_rest_time
      }));

      // Update workout
      const updatedWorkout: Workout = {
        ...workout,
        name: workoutName.trim(),
        description: workoutDescription.trim() || undefined,
        exercises: workoutExercises,
        estimated_duration: calculateEstimatedDuration(),
        scheduled_days: scheduledDays,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      await storageService.saveWorkout(updatedWorkout);
      
      // Navigate back to workouts page
      navigate(Routes.WORKOUTS);
    } catch (error) {
      console.error('Failed to update workout:', error);
      setError(t('workouts.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const calculateEstimatedDuration = (): number => {
    let totalSeconds = 0;
    
    selectedExercises.forEach(exercise => {
      const duration = exercise.custom_duration || 30;
      const sets = exercise.custom_sets || 1;
      const restTime = exercise.custom_rest_time || 30;
      
      totalSeconds += (duration * sets) + restTime;
    });
    
    return totalSeconds;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    } else if (remainingSeconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    const newOrder = selectedExercises.length > 0 
      ? Math.max(...selectedExercises.map(e => e.order)) + 1 
      : 0;
    
    const selectedExercise: SelectedExercise = {
      ...exercise,
      order: newOrder
    };
    
    setSelectedExercises(prev => [...prev, selectedExercise]);
    setShowExercisePicker(false);
  };

  const handleRemoveExercise = (exercise_id: string) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exercise_id));
  };

  const handleUpdateExercise = (exercise_id: string, updates: Partial<SelectedExercise>) => {
    setSelectedExercises(prev => 
      prev.map(exercise => 
        exercise.id === exercise_id 
          ? { ...exercise, ...updates }
          : exercise
      )
    );
  };

  const handleMoveExercise = (exercise_id: string, direction: 'up' | 'down') => {
    setSelectedExercises(prev => {
      const currentIndex = prev.findIndex(e => e.id === exercise_id);
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newArray = [...prev];
      [newArray[currentIndex], newArray[newIndex]] = [newArray[newIndex], newArray[currentIndex]];
      
      // Update order values
      return newArray.map((exercise, index) => ({
        ...exercise,
        order: index
      }));
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('workouts.editTitle')}</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('workouts.dataRequiredTitle')}
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>{t('workouts.dataRequiredBody')}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(Routes.SETTINGS)}
                    className="bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('common.goToSettings')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('workouts.editTitle')}</h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t('workouts.errorLoadingTitle')}
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4 space-x-2">
                  <button
                    onClick={() => navigate(Routes.WORKOUTS)}
                    className="bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('workouts.backToWorkouts')}
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('workouts.retry')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('workouts.editTitle')}</h1>
          <button
            onClick={() => navigate(Routes.WORKOUTS)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
      {/* Workout Name */}
          <div>
            <label htmlFor="workoutName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('workouts.nameLabel')}
            </label>
            <input
              type="text"
              id="workoutName"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={t('workouts.namePlaceholder')}
              disabled={saving}
              required
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
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
                      monday: t('weekdayAbbrev.monday', { defaultValue: t('weekday.monday').slice(0, 3) }),
                      tuesday: t('weekdayAbbrev.tuesday', { defaultValue: t('weekday.tuesday').slice(0, 3) }), 
                      wednesday: t('weekdayAbbrev.wednesday', { defaultValue: t('weekday.wednesday').slice(0, 3) }),
                      thursday: t('weekdayAbbrev.thursday', { defaultValue: t('weekday.thursday').slice(0, 3) }),
                      friday: t('weekdayAbbrev.friday', { defaultValue: t('weekday.friday').slice(0, 3) }),
                      saturday: t('weekdayAbbrev.saturday', { defaultValue: t('weekday.saturday').slice(0, 3) }),
                      sunday: t('weekdayAbbrev.sunday', { defaultValue: t('weekday.sunday').slice(0, 3) })
                    } as Record<Weekday, string>;
                    
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('workouts.noExercisesSelected')}</p>
                <button
                  type="button"
                  onClick={() => setShowExercisePicker(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  disabled={saving}
                >
                  {t('workouts.addExercise')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedExercises
                  .sort((a, b) => a.order - b.order)
                  .map((exercise, index) => (
                    <div key={exercise.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {localizeExercise(exercise, t).name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {localizeExercise(exercise, t).description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-4">
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(exercise.id, 'up')}
                            disabled={index === 0 || saving}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t('workouts.moveUpAria')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(exercise.id, 'down')}
                            disabled={index === selectedExercises.length - 1 || saving}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t('workouts.moveDownAria')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(exercise.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                            disabled={saving}
                            aria-label={t('workouts.removeExerciseAria')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Custom Exercise Settings */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {t('workouts.durationSeconds')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={exercise.custom_duration || ''}
                            onChange={(e) => handleUpdateExercise(exercise.id, { 
                              custom_duration: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder={exercise.default_duration?.toString() || '30'}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {t('workouts.sets')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={exercise.custom_sets || ''}
                            onChange={(e) => handleUpdateExercise(exercise.id, { 
                              custom_sets: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder={exercise.default_sets?.toString() || '1'}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {t('workouts.reps')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={exercise.custom_reps || ''}
                            onChange={(e) => handleUpdateExercise(exercise.id, { 
                              custom_reps: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder={exercise.default_reps?.toString() || '-'}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {t('workouts.restSeconds')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={exercise.custom_rest_time || ''}
                            onChange={(e) => handleUpdateExercise(exercise.id, { 
                              custom_rest_time: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder={'30'}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                
                <button
                  type="button"
                  onClick={() => setShowExercisePicker(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  disabled={saving}
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('workouts.addAnotherExercise')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
      <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => navigate(Routes.WORKOUTS)}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
        {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || selectedExercises.length === 0 || !workoutName.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
        {saving ? t('workouts.saving') : t('workouts.saveWorkout')}
            </button>
          </div>
        </form>

        {/* Exercise Picker Modal */}
  {showExercisePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
      {t('workouts.addExerciseTitle')}
                </h3>
                <button
                  onClick={() => setShowExercisePicker(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-96">
                <div className="space-y-2">
                  {availableExercises
                    .filter(exercise => !selectedExercises.some(se => se.id === exercise.id))
                    .map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {localizeExercise(exercise, t).name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {localizeExercise(exercise, t).description}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditWorkoutPage;
