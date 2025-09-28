import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import type { Exercise } from '../types';
import { Routes as AppRoutes } from '../types';
import { ExerciseDetailContent } from '../components/ExerciseDetailContent';
import { storageService } from '../services/storageService';
import { getExerciseById } from '../data/exercises';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { useAuth } from '../hooks/useAuth';
import logger from '../utils/logger';

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
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      // Check if this is a user-created exercise (UUID) or builtin (slug)
      const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      let exerciseData;
      
      if (isUUID) {
        // Load user-created exercise from database
        const { data, error } = await supabase
          .from('exercises')
          .select(`
            *,
            profiles!owner_id(display_name)
          `)
          .eq('id', id)
          .eq('deleted', false)
          .single();

        if (error) throw error;
        exerciseData = data;

        // Check if current user owns this exercise
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(user?.id === exerciseData.owner_id);
      } else {
        // For built-in exercises, load from the exercises data
        logger.log('Loading built-in exercise with ID:', id);
        const builtInExercise = getExerciseById(id);
        logger.log('Found built-in exercise:', builtInExercise ? builtInExercise.name : 'null');
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
    navigate(`${AppRoutes.EXERCISES}/${exercise.id}/edit`);
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
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            {t('exercises:loadError')}
          </h1>
          <p className="text-text-500 dark:text-text-400 mb-6">
            {error || t('exercises:notFound')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Video/Image Section */}
      <div className="relative h-[480px] rounded-b-3xl overflow-hidden">
        {/* Back Button Overlay */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-20 p-2 bg-black/20 rounded-full text-white hover:bg-black/30 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Exercise Video Thumbnail */}
        <div className="w-full h-full">
          <VideoThumbnail
            exercise={exercise}
            className="w-full h-full [&>video]:aspect-auto [&>video]:h-full [&>video]:object-cover [&>div]:h-full [&>div]:aspect-auto"
            onVideoLoad={() => logger.log('Hero video loaded for exercise:', exercise.id)}
            onVideoError={() => logger.warn('Hero video failed to load for exercise:', exercise.id)}
          />
        </div>
      </div>

      {/* Content Section with reference-style layout but keeping all existing functionality */}
      <div className="px-6 py-6 bg-white dark:bg-gray-800 rounded-t-3xl -mt-6 relative z-10 min-h-screen">

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
  );
};

export default ExerciseDetailPage;