/* eslint-disable no-restricted-syntax -- i18n-exempt: file already uses t(); any remaining literals are app constants or non-user-visible */
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, AppSettings, Workout } from '../types';
import { Routes, Weekday } from '../types';
import { APP_NAME, APP_DESCRIPTION } from '../constants';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { syncService } from '../services/syncService';
import { PullToRefresh } from '../components/platform';
import { StarFilledIcon } from '../components/icons/NavigationIcons';
import CalendarIcon from '../components/icons/CalendarIcon';
import { localizeExercise } from '../utils/localizeExercise';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../hooks/useAuth';
import { VideoThumbnail } from '../components/VideoThumbnail';
import AIWorkoutButton from '../components/AIWorkoutButton';
import { useCoachingInsights } from '../hooks/useCoachingInsights';
import InsightsCarousel from '../components/InsightsCarousel';
import Imprint from '../components/Imprint';
import logger from '../utils/logger';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import type { ExerciseMediaIndex } from '../types/media';
import '../styles/homeParallax.css';

interface HomePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exercise_id: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ exercises, appSettings, onToggleFavorite }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common', 'exerciseDetails']);
  const { isAuthenticated } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  // Parallax effect - listen to scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pull-to-refresh handler - triggers sync and refreshes local data
  const handleRefresh = useCallback(async () => {
    try {
      // Trigger sync if authenticated
      if (isAuthenticated) {
        await syncService.sync(true);
      }
      // Emit event to refresh data in App.tsx
      window.dispatchEvent(new CustomEvent('sync:applied'));
    } catch (error) {
      logger.error('Failed to refresh:', error);
    }
  }, [isAuthenticated]);
  
  // Coaching insights for home page (conditional on settings)
  const shouldShowCoachOnHome = appSettings.coach_enabled && appSettings.coach_show_on_home;
  const { insights, isLoading: isLoadingInsights } = useCoachingInsights({
    autoRefresh: false,
    enableAI: appSettings.coach_ai_insights_enabled || false
  });
  
  // Filter to top 3 high or medium priority insights for carousel
  // High priority is preferred, but medium is shown if no high-priority insights exist
  const topInsights = insights
    .filter(i => i.priority === 'high' || i.priority === 'medium')
    .sort((a, b) => {
      // Sort by priority first (high > medium)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);
  
  const [upcomingWorkout, setUpcomingWorkout] = useState<{
    workout: Workout;
    weekday: string;
    date: string;
  } | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Media index to detect video availability independent of legacy has_video
  const [mediaIndex, setMediaIndex] = useState<ExerciseMediaIndex | null>(null);
  useEffect(() => { loadExerciseMedia().then(setMediaIndex).catch(() => setMediaIndex({} as ExerciseMediaIndex)); }, []);

  const hasAnyVideo = useCallback((ex: Exercise): boolean => {
    if (ex.custom_video_url) return true;
    if (mediaIndex && ex.id && mediaIndex[ex.id]) return true;
    return false;
  }, [mediaIndex]);

  useEffect(() => {
    const checkConsentAndLoadUpcoming = async () => {
      const consentStatus = consentService.hasConsent();
      setHasConsent(consentStatus);
      
      if (consentStatus) {
        try {
          const workouts = await storageService.getWorkouts();
          // logger.debug('HomePage: All workouts loaded:', workouts);
          const activeWorkouts = workouts.filter(workout => workout.is_active);
          // logger.debug('HomePage: Active workouts:', activeWorkouts);
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
        hasAnyVideo(exercise)
      )
      .slice(0, 3);
  };

  const popularExercises = getPopularExercises();

  // Scroll effect calculations for parallax hero
  const maxScroll = 250; // Scroll distance for full effect (increased for stickier feel)
  const scrollProgress = Math.min(scrollY / maxScroll, 1); // 0 to 1
  const heroScale = 1 - (scrollProgress * 0.25); // Scale from 1 to 0.75
  const heroOpacity = 1 - (scrollProgress * 0.7); // Opacity from 1 to 0.3
  const overlayOpacity = scrollProgress * 0.6; // Overlay from 0 to 0.6

  // Render hero section with parallax effect
  const renderHeroSection = () => {
    const heroContent = (
      <>
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
            <h2 className="text-h3 text-white mb-2 leading-tight timer-text-shadow-lg">
              {t('home.heroTitle', { defaultValue: 'Stay consistent, stay strong.' })}
            </h2>
            <p className="text-caption text-white/90 font-medium timer-text-shadow-sm">
              {t('home.heroSubtitle', { defaultValue: 'Your workouts, your way.' })}
            </p>
          </div>
        </div>
        {/* Scroll overlay - fades in as you scroll */}
        <div 
          className="home-hero-overlay"
          style={{ opacity: overlayOpacity }}
        />
      </>
    );

    // Sticky wrapper with scale/fade effect for all platforms
    return (
      <div className="home-hero-wrapper">
        <div 
          className="home-hero-container"
          style={{
            transform: `scale(${heroScale})`,
            opacity: heroOpacity,
          }}
        >
          {heroContent}
        </div>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} testId="home-pull-to-refresh">
    <div id="main-content" className="min-h-screen pb-20 bg-background-50 dark:bg-background-950 home-parallax-container">
      <div className="container mx-auto px-4 py-2 max-w-md">
        {/* Hero Banner */}
        {renderHeroSection()}

        {/* Content Panel - slides over hero */}
        <div className="home-content-panel">
        <header className="text-center mb-3">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-1">
            {APP_NAME}
          </h1>
          <p className="text-sm text-text-600 dark:text-text-100">
            {t('home.tagline', { defaultValue: APP_DESCRIPTION })}
          </p>
        </header>

        {/* AI Coach Insights Carousel */}
        {shouldShowCoachOnHome && topInsights.length > 0 && !isLoadingInsights && (
          <section className="mb-4">
            <InsightsCarousel
              insights={topInsights}
              settings={appSettings}
              onViewAll={() => navigate(Routes.COACH)}
            />
          </section>
        )}

        {/* Sign-in prompt - only show if not authenticated */}
        {!isAuthenticated && (
          <div className="text-center mb-4 text-sm secondary-label-text">
            <p>
              {t('home.signInMessage', { defaultValue: 'You can ' })}
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-primary-600 dark:text-primary-400 underline hover:no-underline font-normal bg-transparent border-0 p-0 m-0 cursor-pointer inline leading-none"
              >
                {t('home.signInLink', { defaultValue: 'sign-in' })}
              </button>
              {t('home.signInSuffix', { defaultValue: ' to track your progress from different devices.' })}
            </p>
          </div>
        )}

        {/* AI Workout Assistant Section */}
        <section className="mb-4">
          <AIWorkoutButton
            variant="primary"
            isFirstTime={true}
            className="w-full"
          />
        </section>

        {/* Upcoming Workout Section */}
        {hasConsent && (
          <section className="mb-4">
            {upcomingWorkout ? (
              <div className="upcoming-workout-card">
                <h2 className="text-h3 font-semibold text-text-900 dark:text-text-50 mb-3 sm:mb-4">
                  {t('home.upcomingWorkout')}
                </h2>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Date and Workout Info Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Date Section */}
                    <div className="text-center sm:text-left rtl:sm:text-right flex-shrink-0">
                      <div className="text-h2 font-bold upcoming-workout-weekday leading-tight">
                        {upcomingWorkout.weekday}
                      </div>
                      <div className="text-caption secondary-label-text mt-1">
                        {upcomingWorkout.date}
                      </div>
                    </div>

                    {/* Workout Info */}
                    <div className="flex-1 min-w-0 text-center sm:text-left rtl:sm:text-right">
                      <div className="text-body font-medium label-text truncate">
                        {upcomingWorkout.workout.name}
                      </div>
                      <div className="text-small help-text mt-1">
                        {t('workouts.exerciseCount', { count: upcomingWorkout.workout.exercises.length })}
                      </div>
                    </div>
                  </div>

                  {/* Start Button - Full width on mobile, auto on larger screens */}
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
                    className="btn-primary touch-target w-full sm:w-auto sm:self-start rtl:sm:self-end"
                  >
                    {t('home.startNow')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="upcoming-workout-card">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex-shrink-0 self-center sm:self-start">
                    <CalendarIcon size={48} className="section-icon !w-12 !h-12" />
                  </div>
                  <div className="flex-1 text-center sm:text-start-rtl">
                    <h2 className="text-h3 font-bold mb-3 leading-tight heading-text">
                      {t('home.noScheduleTitle')}
                    </h2>
                    <p className="text-body text-secondary mb-5 leading-relaxed">
                      {t('home.noScheduleBody')}
                    </p>
                    <button
                      onClick={() => navigate(Routes.WORKOUTS)}
                      className="btn-primary touch-target"
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
                <div className="text-xl font-bold link">
                  {exercises.filter(ex => !('is_active' in ex && ex.is_active === false)).length}
                </div>
                <div className="text-sm secondary-label-text">
                  {t('home.availableExercises')}
                </div>
              </button>
            </div>
          </section>

          {/* Language Selection Footer */}
          <footer className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm secondary-label-text mb-2">
                  {t('home.changeLanguage')}
                </p>
                <LanguageSwitcher compact={true} className="justify-center" />
              </div>
              
              {/* Imprint - Legal requirement for display */}
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <Imprint />
              </div>
            </div>
          </footer>
        </div>
        </div>{/* End content panel wrapper */}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
    </PullToRefresh>
  );
};

export default HomePage; 