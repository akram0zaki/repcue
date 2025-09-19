import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import type { Exercise } from '../types';
import { Routes as AppRoutes } from '../types';
import { ExerciseDetailContent } from '../components/ExerciseDetailContent';
import { favoritesService } from '../services/favoritesService';
import { getExerciseById } from '../data/exercises';
import logger from '../utils/logger';

const ExerciseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercise', 'exercises']);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(t('exercise.notFound'));
      setLoading(false);
      return;
    }

    loadExerciseDetails();
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
      const favoriteStatus = await favoritesService.isFavorite(id);
      setIsFavorite(favoriteStatus);

    } catch (err) {
      logger.error('Error loading exercise details:', err);
      setError(t('exercise.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!exercise) return;

    try {
      const newStatus = await favoritesService.toggleFavorite(
        exercise.id,
        'exercise',
        'user_created'
      );
      setIsFavorite(newStatus);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            {t('exercise.error')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || t('exercise.notFound')}
          </p>
          <button
            onClick={() => navigate(AppRoutes.EXERCISES)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('exercise.backToExercises')}
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(AppRoutes.EXERCISES)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('exercise.backToExercises', { defaultValue: 'Back to Exercises' })}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full overflow-hidden">
        <ExerciseDetailContent
          exercise={exercise}
          isFavorite={isFavorite}
          isOwner={isOwner}
          onToggleFavorite={handleToggleFavorite}
          onRatingChange={handleRatingChange}
          onStartTimer={handleStartTimer}
          onEdit={handleEdit}
          showActions={true}
          className="p-6"
        />
      </div>
    </div>
  );
};

export default ExerciseDetailPage;