import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import type { Workout, Weekday } from '../types';
import { Routes } from '../types';
import { useTranslation } from 'react-i18next';

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
          setWorkouts(allWorkouts);
        } catch (error) {
          console.error('Failed to load workouts:', error);
        }
      }
      setLoading(false);
    };

    checkConsentAndLoadWorkouts();
  }, []);

  const handleCreateWorkout = () => {
    navigate(Routes.CREATE_WORKOUT);
  };

  const handleEditWorkout = (workoutId: string) => {
    navigate(`${Routes.EDIT_WORKOUT}?id=${workoutId}`);
  };

  const handleStartWorkout = (workout: Workout) => {
    navigate(Routes.TIMER, { 
      state: { 
        workoutMode: {
          workoutId: workout.id,
          workoutName: workout.name,
          exercises: workout.exercises
        }
      } 
    });
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!hasConsent) return;
    
    try {
      await storageService.deleteWorkout(workoutId);
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  const formatScheduledDays = (scheduledDays: Weekday[]): string => {
    if (!scheduledDays || scheduledDays.length === 0) {
  return t('common:common.workouts.notScheduled');
    }
    
    const dayNames = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };
    
  return scheduledDays.map(day => dayNames[day as keyof typeof dayNames]).join(', ');
  };

  const calculateDuration = (workout: Workout): string => {
    let totalSeconds = 0;
    
    workout.exercises.forEach(workoutExercise => {
      // For now, estimate 30 seconds per exercise + rest time
      const duration = workoutExercise.customDuration || 30;
      const sets = workoutExercise.customSets || 1;
      const restTime = workoutExercise.customRestTime || 30;
      
      totalSeconds += (duration * sets) + restTime;
    });
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0) {
      return `${seconds}s`;
    } else if (seconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('common:common.workouts.title')}</h1>
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('common:common.workouts.title')}</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('common:common.workouts.dataRequiredTitle')}
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>{t('common:common.workouts.dataRequiredBody')}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(Routes.SETTINGS)}
                    className="bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('common:common.goToSettings')}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('common:common.workouts.title')}
          </h1>
          <button
            onClick={handleCreateWorkout}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {t('common:common.workouts.createWorkout')}
          </button>
        </div>

        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('common:common.workouts.emptyTitle')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('common:common.workouts.emptyBody')}
            </p>
            <button
              onClick={handleCreateWorkout}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {t('common:common.workouts.createFirstWorkout')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {workout.name}
                      </h3>
                      {!workout.isActive && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {t('common:common.workouts.paused')}
                        </span>
                      )}
                    </div>
                    
                    {workout.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                        {workout.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleStartWorkout(workout)}
                      disabled={!workout.isActive}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                      title={workout.isActive ? t('common:common.workouts.startWorkout') : t('common:common.workouts.workoutPaused')}
                    >
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
                      </svg>
                      {t('common:common.start')}
                    </button>
                    <button
                      onClick={() => handleEditWorkout(workout.id)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      title={t('common:common.workouts.editWorkout')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(workout.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title={t('common:common.workouts.deleteWorkout')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {t('common:common.workouts.exerciseCount', { count: workout.exercises.length })}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ~{calculateDuration(workout)}
                    </span>
                  </div>
                  <span className="text-xs">
                    {formatScheduledDays(workout.scheduledDays)}
                  </span>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === workout.id && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                      {t('common:common.workouts.deleteConfirm', { name: workout.name })}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                      >
                        {t('common:common.workouts.delete')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded transition-colors"
                      >
                        {t('common:common.cancel')}
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
