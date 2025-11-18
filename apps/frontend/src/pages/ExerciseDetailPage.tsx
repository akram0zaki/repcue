import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../types';
import { Routes as AppRoutes } from '../types';
import { ExerciseDetailContent } from '../components/ExerciseDetailContent';
import { storageService } from '../services/storageService';
import { getExerciseById } from '../data/exercises';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { useAuth } from '../hooks/useAuth';
import logger from '../utils/logger';
import '../styles/exerciseDetailParallax.css';
import type { AppSettings } from '../types';

const ExerciseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises', 'exerciseDetails']);
  const { user } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoFitMode, setVideoFitMode] = useState<'fit' | 'fill'>('fit');

  useEffect(() => {
    if (!id) {
  setError(t('exercises:notFound'));
      setLoading(false);
      return;
    }

    loadExerciseDetails();
  }, [id]);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    // Handle scroll for parallax effect
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load video fit mode from settings
  useEffect(() => {
    (async () => {
      try {
        const settings = await storageService.getAppSettings();
        const mode = settings?.video_fit_mode === 'fill' ? 'fill' : 'fit';
        setVideoFitMode(mode);
      } catch (e) {
        // default remains 'fit'
      }
    })();
  }, []);

  // Refresh favorite status when page regains focus or becomes visible
  useEffect(() => {
    const refreshFavoriteStatus = async () => {
      if (!id) return;

      try {
        const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        let favoriteStatus = false;

        if (isUUID) {
          if (user?.id) {
            favoriteStatus = await storageService.isUserCreatedExerciseFavorited(id, user.id);
          }
        } else {
          const prefs = await storageService.getUserPreferences();
          favoriteStatus = prefs?.favorite_exercises.includes(id) || false;
        }

        setIsFavorite(favoriteStatus);
      } catch (err) {
        logger.error('Error refreshing favorite status:', err);
      }
    };

    const handleFocus = () => refreshFavoriteStatus();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshFavoriteStatus();
      }
    };

    // Listen for page focus and visibility changes
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for favorite changes from other parts of the app
    const handleFavoriteUpdate = (event: CustomEvent) => {
      if (event.detail?.exerciseId === id) {
        refreshFavoriteStatus();
      }
    };
    window.addEventListener('exercise-favorite-updated', handleFavoriteUpdate as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('exercise-favorite-updated', handleFavoriteUpdate as EventListener);
    };
  }, [id]);

  const loadExerciseDetails = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Check if this is a user-created exercise (UUID) or builtin (slug)
      const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      let exerciseData;

      if (isUUID) {
        // Load user-created exercise from IndexedDB (offline-first)
        exerciseData = await storageService.getExerciseById(id);

        if (!exerciseData) {
          throw new Error(`User exercise not found: ${id}`);
        }

        // Check if current user owns this exercise
        setIsOwner(user?.id === exerciseData.owner_id);
      } else {
        // For built-in exercises, load from the exercises data
        const builtInExercise = getExerciseById(id);
        if (!builtInExercise) {
          throw new Error(`Built-in exercise not found: ${id}`);
        }
        exerciseData = builtInExercise;
        setIsOwner(false); // Built-in exercises are not owned by users
      }

      // Transform server data to match Exercise type
      const transformedExercise = {
        ...exerciseData,
        description: exerciseData.description || undefined,
        tags: Array.isArray(exerciseData.tags) ? exerciseData.tags : 
              (typeof exerciseData.tags === 'string' ? JSON.parse(exerciseData.tags) : []),
        instructions: Array.isArray(exerciseData.instructions) ? exerciseData.instructions :
                     (typeof exerciseData.instructions === 'string' ? JSON.parse(exerciseData.instructions) : []),
        muscle_groups: exerciseData.muscle_groups || [],
        equipment_needed: exerciseData.equipment_needed || [],
        difficulty_level: exerciseData.difficulty_level || 'beginner',
        catalogId: 'catalogId' in exerciseData ? (exerciseData as { catalogId: string }).catalogId : 'general-fitness'
      } as Exercise;
      setExercise(transformedExercise);

      // Check favorite status
      let favoriteStatus = false;
      if (isUUID) {
        // For user-created exercises, check user_favorites table
        if (user?.id) {
          favoriteStatus = await storageService.isUserCreatedExerciseFavorited(id, user.id);
        }
      } else {
        // For built-in exercises, check user preferences
        const prefs = await storageService.getUserPreferences();
        favoriteStatus = prefs?.favorite_exercises.includes(id) || false;
      }
      setIsFavorite(favoriteStatus);

    } catch (err) {
      logger.error('Error loading exercise details:', err);
  setError(t('exercises:loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!exercise) return;

    try {
      const isUUID = exercise.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      if (isUUID) {
        // For user-created exercises, use toggleUserCreatedExerciseFavorite
        if (user?.id) {
          const newStatus = await storageService.toggleUserCreatedExerciseFavorite(exercise.id, user.id);
          setIsFavorite(newStatus);
        }
      } else {
        // For built-in exercises, use toggleExerciseFavorite (returns void)
        await storageService.toggleExerciseFavorite(exercise.id);

        // Check the new status from preferences
        const prefs = await storageService.getUserPreferences();
        const newStatus = prefs?.favorite_exercises.includes(exercise.id) || false;
        setIsFavorite(newStatus);
      }

      // Notify other components of the favorite update
      window.dispatchEvent(new CustomEvent('exercise-favorite-updated', {
        detail: { exerciseId: exercise.id }
      }));
    } catch (err) {
      logger.error('Error toggling favorite:', err);
    }
  };

  const handleRatingChange = (newRating: number, newCount: number) => {
    if (exercise) {
      setExercise({
        ...exercise,
        rating_average: newRating,
        rating_count: newCount
      });
    }
  };

  const handleStartTimer = () => {
    if (!exercise) return;

    // Navigate to timer page with exercise pre-selected
    navigate(AppRoutes.TIMER, {
      state: { selectedExercise: exercise }
    });
  };

  const handleEdit = () => {
    if (!exercise) return;
    navigate(`/exercises/edit/${exercise.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <p className="text-text-500 dark:text-text-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-h2 text-error mb-4">
            {t('exercises:loadError')}
          </h1>
          <p className="text-text-500 dark:text-text-400 mb-6">
            {error || t('exercises:notFound')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            {t('common.back', 'Back')}
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return null;
  }

  // Calculate video dimensions
  const videoHeight = videoContainerRef.current?.offsetHeight || 600;
  const initialOverlap = videoHeight * 0.10; // Content starts covering 10% of video from bottom
  const minVisibleVideo = videoHeight * 0.25; // Keep 25% of video visible when fully collapsed
  const maxScroll = videoHeight - minVisibleVideo - initialOverlap; // Maximum amount content can slide up

  return (
    <div className="exercise-detail-container bg-surface-0 dark:bg-surface-900">
      {/* Fixed Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="exercise-detail-back-button"
        aria-label={t('common.back', 'Back')}
        title={t('common.back', 'Back')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Hero Video Section - Fixed position, stays in place */}
      <div 
        ref={videoContainerRef}
        className="exercise-detail-video-container"
      >
        <div className="w-full h-full">
          <VideoThumbnail
            exercise={exercise}
            className="w-full h-full [&>video]:aspect-auto [&>video]:h-full [&>video]:w-full [&>div]:h-full [&>div]:aspect-auto"
            objectFit={videoFitMode === 'fit' ? 'contain' : 'cover'}
            onVideoLoad={() => logger.log('Hero video loaded for exercise:', exercise.id)}
            onVideoError={() => logger.warn('Hero video failed to load for exercise:', exercise.id)}
          />
          {/* Fit/Fill toggle overlay */}
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={async () => {
                const next = videoFitMode === 'fit' ? 'fill' : 'fit';
                setVideoFitMode(next);
                try {
                  const current = await storageService.getAppSettings();
                  if (current) {
                    const nextSettings: AppSettings = {
                      ...current,
                      video_fit_mode: next,
                      version: (current.version || 1) + 1,
                      updated_at: new Date().toISOString(),
                      dirty: 1,
                      op: 'upsert'
                    } as AppSettings;
                    await storageService.saveAppSettings(nextSettings);
                  }
                } catch (e) {
                  logger.warn('Failed to persist video_fit_mode setting from ExerciseDetailPage', e);
                }
              }}
              aria-label={videoFitMode === 'fit' ? t('common:timer.fit', 'Fit') : t('common:timer.fill', 'Fill')}
              title={videoFitMode === 'fit' ? t('common:timer.fit', 'Fit') : t('common:timer.fill', 'Fill')}
              data-testid="toggle-video-fit-detail"
            >
              {videoFitMode === 'fit' ? t('common:timer.fit', 'Fit') : t('common:timer.fill', 'Fill')}
            </button>
          </div>
        </div>
      </div>

      {/* Content Section - Positioned to slide up over video */}
      <div 
        className="exercise-detail-content-panel"
        // Initial position: covering bottom 10% of video, slides up as page scrolls
        style={{ 
          top: `${videoHeight - initialOverlap}px`,
          transform: `translateY(-${Math.min(scrollY, maxScroll)}px)`
        }}
      >
        <div className="px-6 py-6">
          {/* Use the existing ExerciseDetailContent component to preserve all functionality */}
          <ExerciseDetailContent
            exercise={exercise}
            isFavorite={isFavorite}
            isOwner={isOwner}
            onToggleFavorite={handleToggleFavorite}
            onRatingChange={handleRatingChange}
            onStartTimer={handleStartTimer}
            onEdit={handleEdit}
            showActions={true}
            className=""
          />
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailPage;