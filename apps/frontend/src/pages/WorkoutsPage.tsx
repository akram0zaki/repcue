/* eslint-disable no-restricted-syntax -- i18n-exempt: UI strings use t(); remaining literals are icons/units */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import type { Workout, Weekday } from '../types';
import { Routes } from '../types';
import { useTranslation } from 'react-i18next';
import AIWorkoutButton from '../components/AIWorkoutButton';
import logger from '../utils/logger';

const WorkoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const checkConsentAndLoadWorkouts = async () => {
      const consent = consentService.hasConsent();
      setHasConsent(consent);
      
      if (consent) {
        try {
          const allWorkouts = await storageService.getWorkouts();
          logger.debug('WorkoutsPage: Loaded workouts:', allWorkouts);
          setWorkouts(allWorkouts);
        } catch (error) {
          logger.error('Failed to load workouts:', error);
        }
      }
      setLoading(false);
    };

    checkConsentAndLoadWorkouts();
    
    // Refresh workouts after a successful sync pull
    const handleSyncApplied = async () => {
      try {
        if (consentService.hasConsent()) {
          const allWorkouts = await storageService.getWorkouts();
          setWorkouts(allWorkouts);
        }
      } catch (e) {
        logger.warn('Failed to refresh workouts after sync:', e);
      }
    };
    window.addEventListener('sync:applied', handleSyncApplied as EventListener);

    return () => {
      window.removeEventListener('sync:applied', handleSyncApplied as EventListener);
    };
  }, []);

  const handleCreateWorkout = () => {
    navigate(Routes.CREATE_WORKOUT);
  };

  const handleEditWorkout = (workout_id: string) => {
    navigate(`${Routes.EDIT_WORKOUT}?id=${workout_id}`);
  };

  const handleStartWorkout = (workout: Workout) => {
    navigate(Routes.TIMER, { 
      state: { 
        workoutMode: {
          // Use snake_case keys for compatibility with existing tests
          workout_id: workout.id,
          workout_name: workout.name,
          exercises: workout.exercises
        }
      } 
    });
  };

  const handleDeleteWorkout = async (workout_id: string) => {
    if (!hasConsent) return;
    
    try {
      await storageService.deleteWorkout(workout_id);
      setWorkouts(prev => prev.filter(w => w.id !== workout_id));
      setDeleteConfirm(null);
    } catch (error) {
      logger.error('Failed to delete workout:', error);
    }
  };

  const formatScheduledDays = (scheduled_days: Weekday[]): string => {
    if (!scheduled_days || scheduled_days.length === 0) {
  return t('workouts.notScheduled');
    }
    
    const dayNames = {
      monday: t('weekdayAbbrev.monday', { defaultValue: 'Mon' }),
      tuesday: t('weekdayAbbrev.tuesday', { defaultValue: 'Tue' }),
      wednesday: t('weekdayAbbrev.wednesday', { defaultValue: 'Wed' }),
      thursday: t('weekdayAbbrev.thursday', { defaultValue: 'Thu' }),
      friday: t('weekdayAbbrev.friday', { defaultValue: 'Fri' }),
      saturday: t('weekdayAbbrev.saturday', { defaultValue: 'Sat' }),
      sunday: t('weekdayAbbrev.sunday', { defaultValue: 'Sun' })
    } as const;
    
  return scheduled_days.map(day => dayNames[day as keyof typeof dayNames]).join(', ');
  };

  const calculateDuration = (workout: Workout): string => {
    let totalSeconds = 0;
    
    workout.exercises.forEach(workoutExercise => {
      // For now, estimate 30 seconds per exercise + rest time
      const duration = workoutExercise.custom_duration || 30;
      const sets = workoutExercise.custom_sets || 1;
      const restTime = workoutExercise.custom_rest_time || 30;
      
      totalSeconds += (duration * sets) + restTime;
    });
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const minSuffix = t('common.minutesShortSuffix', { defaultValue: 'm' });
    const secSuffix = t('common.secondsShortSuffix');
    if (minutes === 0) {
      return `${seconds}${secSuffix}`;
    } else if (seconds === 0) {
      return `${minutes}${minSuffix}`;
    } else {
      return `${minutes}${minSuffix} ${seconds}${secSuffix}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-950 pt-safe pb-20">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text-900 dark:text-text-50">{t('workouts.title')}</h1>
            <div className="w-24 h-10 bg-surface-200 dark:bg-surface-700 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-surface-0 dark:bg-surface-800 rounded-lg p-4 shadow animate-pulse">
                <div className="h-6 bg-surface-200 dark:bg-surface-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-950 pt-safe pb-20">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-6">{t('workouts.title')}</h1>
          <div className="bg-warning-soft border border-warning rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-warning">
                  {t('workouts.dataRequiredTitle')}
                </h3>
                <div className="mt-2 text-sm text-warning">
                  <p>{t('workouts.dataRequiredBody')}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(Routes.SETTINGS)}
                    className="btn-secondary px-4 py-2 text-sm"
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

  return (
    <div className="min-h-screen bg-background-50 dark:bg-background-950 pt-safe pb-20">
      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50">
            {t('workouts.title')}
          </h1>
          <button
            onClick={handleCreateWorkout}
            className="btn-primary"
          >
            {t('workouts.createWorkout')}
          </button>
        </div>

        {/* AI Workout Assistant */}
        <div className="mb-4">
          <AIWorkoutButton
            variant="secondary"
            isFirstTime={workouts.length === 0}
            className="w-full"
          />
        </div>

        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-2">
              {t('workouts.emptyTitle')}
            </h3>
            <p className="text-text-500 dark:text-text-400 mb-6">
              {t('workouts.emptyBody')}
            </p>
            <button
              onClick={handleCreateWorkout}
              className="btn-primary"
            >
              {t('workouts.createFirstWorkout')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-surface-0 dark:bg-surface-800 rounded-lg p-4 border border-primary shadow-sm"
              >
                {/* Workout Header */}
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-text-900 dark:text-text-50">
                      {workout.name || t('workouts.unnamedWorkout', { defaultValue: 'Unnamed Workout' })}
                    </h3>
                    {!workout.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-surface-100 dark:bg-surface-700 text-text-600 dark:text-text-400 rounded">
                        {t('workouts.paused')}
                      </span>
                    )}
                  </div>
                  
                  {workout.description && (
                    <p className="text-body text-sm mb-2 line-clamp-2">
                      {workout.description}
                    </p>
                  )}
                  
                </div>
                
                {/* Centered Action Buttons */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => handleStartWorkout(workout)}
                    disabled={!workout.is_active}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-2 flex-shrink-0"
                    title={workout.is_active ? t('workouts.startWorkout') : t('workouts.workoutPaused')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
                    </svg>
                    {t('common.start')}
                  </button>
                  <button
                    onClick={() => handleEditWorkout(workout.id)}
                    className="btn-neutral p-2 flex-shrink-0"
                    title={t('workouts.editWorkout')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(workout.id)}
                    className="btn-danger p-2 flex-shrink-0"
                    title={t('workouts.deleteWorkout')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                {/* Workout Info */}
                <div className="flex items-center justify-center gap-4 text-sm text-body mt-4 mb-3 flex-wrap">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {t('workouts.exerciseCount', { count: workout.exercises.length, ns: 'common' })}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ~{calculateDuration(workout)}
                  </span>
                  <span className="text-xs flex-shrink-0">
                    {formatScheduledDays(workout.scheduled_days)}
                  </span>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === workout.id && (
                  <div className="mt-4 p-3 bg-error-soft border border-error rounded-lg">
                    <p className="text-sm text-error mb-3">
                      {t('workouts.deleteConfirm', { name: workout.name })}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="btn-danger px-3 py-1.5 text-sm"
                      >
                        {t('workouts.delete')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="btn-secondary px-3 py-1.5 text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutsPage;
