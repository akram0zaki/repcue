import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, AppSettings, Workout } from '../types';
import { Routes, Weekday } from '../types';
import { APP_NAME, APP_DESCRIPTION } from '../constants';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { StarFilledIcon } from '../components/icons/NavigationIcons';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface HomePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exerciseId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ exercises, onToggleFavorite }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common']);
  const [upcomingWorkout, setUpcomingWorkout] = useState<{
    workout: Workout;
    weekday: string;
    date: string;
  } | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const checkConsentAndLoadUpcoming = async () => {
      const consentStatus = consentService.hasConsent();
      setHasConsent(consentStatus);
      
      if (consentStatus) {
        try {
          const workouts = await storageService.getWorkouts();
          const activeWorkouts = workouts.filter(workout => workout.isActive);
          
          if (activeWorkouts.length > 0) {
            const today = new Date();
            const currentWeekday = Object.values(Weekday)[today.getDay()] as Weekday;
            
            // Find today's workout or next upcoming workout
            let targetWorkout = activeWorkouts.find(workout => 
              workout.scheduledDays.includes(currentWeekday)
            );
            let targetWeekday = currentWeekday;
            
            // If no workout today, find next upcoming workout
            if (!targetWorkout) {
              const weekdayOrder = Object.values(Weekday);
              const currentIndex = weekdayOrder.indexOf(currentWeekday);
              
              for (let i = 1; i <= 7; i++) {
                const nextIndex = (currentIndex + i) % 7;
                const nextWeekday = weekdayOrder[nextIndex] as Weekday;
                targetWorkout = activeWorkouts.find(workout => 
                  workout.scheduledDays.includes(nextWeekday)
                );
                if (targetWorkout) {
                  targetWeekday = nextWeekday;
                  break;
                }
              }
            }
            
            if (targetWorkout) {
              const weekdayNames = {
                [Weekday.MONDAY]: t('weekday.monday'),
                [Weekday.TUESDAY]: t('weekday.tuesday'),
                [Weekday.WEDNESDAY]: t('weekday.wednesday'),
                [Weekday.THURSDAY]: t('weekday.thursday'),
                [Weekday.FRIDAY]: t('weekday.friday'),
                [Weekday.SATURDAY]: t('weekday.saturday'),
                [Weekday.SUNDAY]: t('weekday.sunday')
              } as const;
              
              // Calculate the date for the workout
              const workoutDate = new Date();
              const daysUntilWorkout = (Object.values(Weekday).indexOf(targetWeekday) - today.getDay() + 7) % 7;
              workoutDate.setDate(today.getDate() + daysUntilWorkout);
              
              setUpcomingWorkout({
                workout: targetWorkout,
                weekday: weekdayNames[targetWeekday],
                date: workoutDate.toLocaleDateString(i18n.resolvedLanguage || 'en', { month: 'short', day: 'numeric' })
              });
            }
          }
        } catch (error) {
          console.error('Failed to load upcoming workout:', error);
        }
      }
    };

    checkConsentAndLoadUpcoming();
  }, [t, i18n.resolvedLanguage]);

  const handleStartTimer = (exercise?: Exercise) => {
    if (exercise) {
      navigate(Routes.TIMER, { 
        state: { 
          selectedExercise: exercise,
          selectedDuration: exercise.defaultDuration || 30
        }
      });
    } else {
      navigate(Routes.TIMER);
    }
  };
  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {APP_NAME}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {APP_DESCRIPTION}
          </p>
        </header>

        {/* Upcoming Workout Section */}
        {hasConsent && (
          <section className="mb-6">
            {upcomingWorkout ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {t('home.upcomingWorkout')}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {upcomingWorkout.weekday}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {upcomingWorkout.date}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {upcomingWorkout.workout.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {upcomingWorkout.workout.exercises.length} exercise{upcomingWorkout.workout.exercises.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to timer in workout-guided mode
                      navigate(Routes.TIMER, {
                        state: {
                          workoutMode: {
                            workoutId: upcomingWorkout.workout.id,
                            workoutName: upcomingWorkout.workout.name,
                            exercises: upcomingWorkout.workout.exercises
                          }
                        }
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {t('home.startNow')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('home.noScheduleTitle')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('home.noScheduleBody')}
                </p>
                <button
                  onClick={() => navigate(Routes.WORKOUTS)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('home.addWorkout')}
                </button>
              </div>
            )}
          </section>
        )}

        <div className="space-y-4">
          {/* Quick Start Section */}
          <section>
            <div className="space-y-3">
              <button 
                className="btn-primary w-full"
                onClick={() => handleStartTimer()}
              >
                {t('home.startTimer')}
              </button>
              <button 
                className="btn-secondary w-full"
                data-testid="browse-exercises"
                onClick={() => navigate(Routes.EXERCISES)}
              >
                {t('home.browseExercises')}
              </button>
            </div>
          </section>

          {/* Favorites Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('home.favoriteExercises')}
            </h2>
            {exercises.filter(ex => ex.isFavorite).length > 0 ? (
              <div className="space-y-2">
                {exercises
                  .filter(exercise => exercise.isFavorite)
                  .slice(0, 3)
                  .map(exercise => (
                    <div key={exercise.id} className="exercise-card w-full p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {exercise.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {exercise.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => onToggleFavorite(exercise.id)}
                            className="p-1 text-yellow-500 hover:text-yellow-600 transition-colors"
                            aria-label={t('home.removeFromFavoritesAria', { name: exercise.name })}
                          >
                            <StarFilledIcon size={16} />
                          </button>
                          <button 
                            className="btn-primary px-3 py-1 text-sm"
                            onClick={() => handleStartTimer(exercise)}
                          >
                            {t('common.start')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-3 text-sm">
                {t('home.noFavorites')}
              </p>
            )}
          </section>

          {/* Stats Section */}
          <section>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {exercises.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('home.availableExercises')}
                </div>
              </div>
            </div>
          </section>

          {/* Language Selection Footer */}
          <footer className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('home.changeLanguage')}
              </p>
              <LanguageSwitcher compact={true} className="justify-center" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 