/* eslint-disable no-restricted-syntax -- i18n-exempt: file already uses t(); any remaining literals are app constants or non-user-visible */
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, AppSettings, Workout } from '../types';
import { Routes, Weekday } from '../types';
import { APP_NAME, APP_DESCRIPTION } from '../constants';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { StarFilledIcon } from '../components/icons/NavigationIcons';
import CalendarIcon from '../components/icons/CalendarIcon';
import { localizeExercise } from '../utils/localizeExercise';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../hooks/useAuth';
import { VideoThumbnail } from '../components/VideoThumbnail';
import logger from '../utils/logger';

interface HomePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exercise_id: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ exercises, onToggleFavorite }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common', 'exerciseDetails']);
  const { isAuthenticated } = useAuth();
  const [upcomingWorkout, setUpcomingWorkout] = useState<{
    workout: Workout;
    weekday: string;
    date: string;
  } | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const checkConsentAndLoadUpcoming = async () => {
      const consentStatus = consentService.hasConsent();
      setHasConsent(consentStatus);
      
      if (consentStatus) {
        try {
          const workouts = await storageService.getWorkouts();
          const activeWorkouts = workouts.filter(workout => workout.is_active);
          
          if (activeWorkouts.length > 0) {
            const today = new Date();
            const currentWeekday = Object.values(Weekday)[today.getDay()] as Weekday;
            
            // Find today's workout or next upcoming workout
            let targetWorkout = activeWorkouts.find(workout => 
              workout.scheduled_days.includes(currentWeekday)
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
                  workout.scheduled_days.includes(nextWeekday)
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
              
              // Convert JavaScript's getDay() (0=Sunday) to our Weekday enum index (0=Monday)
              const jsWeekdayToWeekdayIndex = (jsDay: number): number => {
                return (jsDay + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0, Tuesday(2) -> 1, etc.
              };
              
              const currentWeekdayIndex = jsWeekdayToWeekdayIndex(today.getDay());
              const targetWeekdayIndex = Object.values(Weekday).indexOf(targetWeekday);
              
              let daysUntilWorkout = (targetWeekdayIndex - currentWeekdayIndex + 7) % 7;
              // If it's 0 (same day), and we're looking for next occurrence, make it 7
              if (daysUntilWorkout === 0 && targetWeekday !== currentWeekday) {
                daysUntilWorkout = 7;
              }
              
              workoutDate.setDate(today.getDate() + daysUntilWorkout);
              
              setUpcomingWorkout({
                workout: targetWorkout,
                weekday: weekdayNames[targetWeekday],
                date: workoutDate.toLocaleDateString(i18n.resolvedLanguage || 'en', { month: 'short', day: 'numeric' })
              });
            }
          }
        } catch (error) {
          logger.error('Failed to load upcoming workout:', error);
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
          selectedDuration: exercise.default_duration || 30
        }
      });
    } else {
      navigate(Routes.TIMER);
    }
  };

  // Get popular exercises from general fitness catalog with videos
  const getPopularExercises = () => {
    return exercises
      .filter(exercise =>
        exercise.catalogId === 'general-fitness' &&
        (exercise.has_video || exercise.custom_video_url)
      )
      .slice(0, 3);
  };

  const popularExercises = getPopularExercises();
  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
      <div className="container mx-auto px-4 py-2 max-w-md">
        {/* Hero Banner */}
        <div className="relative mb-4 rounded-lg overflow-hidden shadow-lg">
          <div className="relative h-40 bg-gradient-to-br from-primary-600 to-primary-800">
            <img
              src="/images/hero-banner.png"
              alt="Fitness motivation"
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            {/* Motivational Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <h2 className="text-white text-xl font-bold mb-2 leading-tight drop-shadow-lg">
                  {t('home.heroTitle', { defaultValue: 'Stay consistent, stay strong.' })}
                </h2>
                <p className="text-white/90 text-sm font-medium drop-shadow-md">
                  {t('home.heroSubtitle', { defaultValue: 'Your workouts, your way.' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <header className="text-center mb-3">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-1">
            {APP_NAME}
          </h1>
          <p className="text-sm secondary-label-text">
            {t('home.tagline', { defaultValue: APP_DESCRIPTION })}
          </p>
        </header>

        {/* Sign-in prompt - only show if not authenticated */}
        {!isAuthenticated && (
          <div className="text-center mb-4 text-sm secondary-label-text">
            <p>
              {t('home.signInMessage', { defaultValue: 'You can ' })}
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-primary-600 dark:text-primary-400 underline hover:no-underline font-normal bg-transparent border-0 p-0 m-0 cursor-pointer inline leading-none"
                style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
              >
                {t('home.signInLink', { defaultValue: 'sign-in' })}
              </button>
              {t('home.signInSuffix', { defaultValue: ' to track your progress from different devices.' })}
            </p>
          </div>
        )}

        {/* Upcoming Workout Section */}
        {hasConsent && (
          <section className="mb-4">
            {upcomingWorkout ? (
              <div className="bg-surface-0 dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-1">
                      {t('home.upcomingWorkout')}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                          {upcomingWorkout.weekday}
                        </div>
                        <div className="text-sm secondary-label-text">
                          {upcomingWorkout.date}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm label-text">
                          {upcomingWorkout.workout.name}
                        </div>
                        <div className="text-xs help-text">
                          {t('workouts.exerciseCount', { count: upcomingWorkout.workout.exercises.length })}
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
                            workout_id: upcomingWorkout.workout.id,
                            workout_name: upcomingWorkout.workout.name,
                            exercises: upcomingWorkout.workout.exercises
                          }
                        }
                      });
                    }}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {t('home.startNow')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <CalendarIcon size={48} className="drop-shadow-sm" />
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="text-xl font-bold mb-2">
                      {t('home.noScheduleTitle')}
                    </h2>
                    <p className="text-white/90 text-sm mb-4 leading-relaxed">
                      {t('home.noScheduleBody')}
                    </p>
                    <button
                      onClick={() => navigate(Routes.WORKOUTS)}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border border-white/20 hover:border-white/30 shadow-sm"
                    >
                      {t('home.addWorkout')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="space-y-3">
          {/* Popular Exercises Section */}
          <section>
            <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('home.popularExercises', { defaultValue: 'Popular Exercises' })}
            </h2>
            {popularExercises.length > 0 ? (
              <div className="space-y-2">
                {popularExercises.map(exercise => (
                  <div key={exercise.id} className="exercise-card w-full p-3 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <button
                        onClick={() => navigate(`${Routes.EXERCISES}/${exercise.id}`)}
                        className="text-left flex-1 min-w-0 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <h3 className="font-medium text-text-900 dark:text-text-50 truncate">
                          {localizeExercise(exercise, t).name}
                        </h3>
                      </button>
                      <button
                        className="btn-primary text-sm flex-shrink-0"
                        onClick={() => handleStartTimer(exercise)}
                      >
                        {t('common.start')}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <VideoThumbnail
                        exercise={exercise}
                        className="w-24 h-20 rounded-md overflow-hidden flex-shrink-0"
                      />
                      <button
                        onClick={() => navigate(`${Routes.EXERCISES}/${exercise.id}`)}
                        className="text-left line-clamp-2 flex-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <p className="text-sm secondary-label-text line-clamp-2">
                          {localizeExercise(exercise, t).description}
                        </p>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="help-text text-center py-3">
                {t('home.noPopularExercises', { defaultValue: 'No popular exercises with videos available.' })}
              </p>
            )}
          </section>

          {/* Favorites Section */}
          <section>
            <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('home.favoriteExercises')}
            </h2>
            {exercises.filter(ex => ex.is_favorite).length > 0 ? (
              <div className="space-y-2">
                {exercises
                  .filter(exercise => exercise.is_favorite)
                  .slice(0, 3)
                  .map(exercise => (
                    <div key={exercise.id} className="exercise-card w-full p-3 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-900 dark:text-text-50 truncate">
                            {localizeExercise(exercise, t).name}
                          </h3>
                          <p className="text-sm secondary-label-text line-clamp-2">
                            {localizeExercise(exercise, t).description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleFavorite(exercise.id)}
                            className="p-1 text-yellow-500 hover:text-yellow-600 transition-colors"
                            aria-label={t('home.removeFromFavoritesAria', { name: localizeExercise(exercise, t).name })}
                          >
                            <StarFilledIcon size={16} />
                          </button>
                          <button
                            className="btn-primary text-sm"
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
              <p className="help-text text-center py-3">
                {t('home.noFavorites')}
              </p>
            )}
          </section>

          {/* Available Exercises Count Section */}
          <section>
            <div className="bg-surface-0 dark:bg-surface-800 rounded-lg p-4 shadow-md">
              <button
                className="w-full text-center hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors rounded-lg p-2"
                onClick={() => navigate(Routes.EXERCISES)}
                data-testid="exercises-count-link"
              >
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {exercises.length}
                </div>
                <div className="text-sm secondary-label-text">
                  {t('home.availableExercises')}
                </div>
              </button>
            </div>
          </section>

          {/* Language Selection Footer */}
          <footer className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
            <div className="text-center">
              <p className="text-sm secondary-label-text mb-2">
                {t('home.changeLanguage')}
              </p>
              <LanguageSwitcher compact={true} className="justify-center" />
            </div>
          </footer>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
};

export default HomePage; 