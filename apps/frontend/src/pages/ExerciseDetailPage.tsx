import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import type { Exercise } from '../types';
import { Routes as AppRoutes } from '../types';
import {
  StarIcon,
  StarFilledIcon,
  PlayIcon,
  EditIcon,
} from '../components/icons/NavigationIcons';
import { ExerciseRating } from '../components/ExerciseRating';
import { CopyExerciseButton } from '../components/CopyExerciseButton';
import { favoritesService } from '../services/favoritesService';
import { getExerciseById } from '../data/exercises';
import { localizeExercise } from '../utils/localizeExercise';
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

  // Category icons mapping (currently unused but kept for potential future use)
  // const categoryIcons = {
  //   core: TargetIcon,
  //   strength: StrengthIcon,
  //   cardio: CardioIcon,
  //   flexibility: FlexibilityIcon,
  //   balance: BalanceIcon,
  //   'hand-warmup': HandWarmupIcon,
  // };

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

  // const CategoryIcon = exercise ? categoryIcons[exercise.category] : TargetIcon;

  // Helper functions for layout consistency with modal
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'core': return 'bg-red-500';
      case 'strength': return 'bg-blue-500';
      case 'cardio': return 'bg-green-500';
      case 'flexibility': return 'bg-purple-500';
      case 'balance': return 'bg-yellow-500';
      case 'hand-warmup': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return t('exercises:variable', 'Variable');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
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

  const loc = localizeExercise(exercise, t);

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
        {/* Content */}
        <div className="p-6">
          {/* Category Indicator */}
          <div className={`${getCategoryColor(exercise.category)} h-1 w-full rounded-full mb-4`}></div>

          {/* Exercise Name and Type */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {loc.name}
              </h1>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite
                      ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  title={isFavorite ? t('exercise.removeFromFavorites') : t('exercise.addToFavorites')}
                >
                  {isFavorite ? <StarFilledIcon className="h-6 w-6" /> : <StarIcon className="h-6 w-6" />}
                </button>

                {isOwner && (
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t('exercise.edit')}
                  >
                    <EditIcon className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Type and Category Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                exercise.exercise_type === 'time_based'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}>
                {exercise.exercise_type === 'time_based' ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('exercises.types.time_based', { defaultValue: 'Time Based' })}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('exercises.types.repetition_based', { defaultValue: 'Repetition Based' })}
                  </>
                )}
              </span>

              <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                {t(`exercises.categories.${exercise.category}`, { defaultValue: exercise.category.replace('-', ' ') })}
              </span>

              {exercise.difficulty_level && (
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                  exercise.difficulty_level === 'beginner'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : exercise.difficulty_level === 'intermediate'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t(`exercises.difficulty.${exercise.difficulty_level}`, { defaultValue: exercise.difficulty_level })}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleStartTimer}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="h-5 w-5" />
                <span>{t('exercises.startTimer', { defaultValue: 'Start Timer' })}</span>
              </button>

              {!isOwner && (
                <CopyExerciseButton
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  size="md"
                  variant="secondary"
                />
              )}
            </div>
          </div>

          {/* Default Values - Modal Style */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('exercises.defaultSettings', { defaultValue: 'Default Settings' })}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              {exercise.exercise_type === 'time_based' ? (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('exercises.duration', { defaultValue: 'Duration' })}:
                  </span>
                  <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                    {formatDuration(exercise.default_duration)}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('exercises.sets', { defaultValue: 'Sets' })}:
                    </span>
                    <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                      {exercise.default_sets || 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('exercises.reps', { defaultValue: 'Reps' })}:
                    </span>
                    <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                      {exercise.default_reps || 1}
                    </span>
                  </div>
                  {exercise.rep_duration_seconds && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('exercises.repDuration', { defaultValue: 'Rep Duration' })}:
                      </span>
                      <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatDuration(exercise.rep_duration_seconds)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Exercise Metadata - Modal Style */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('exercises.exerciseInfo', { defaultValue: 'Exercise Information' })}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
              {/* Difficulty Level */}
              {exercise.difficulty_level && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('exercises.difficultyLevel', { defaultValue: 'Difficulty' })}:
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    exercise.difficulty_level === 'beginner'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : exercise.difficulty_level === 'intermediate'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {t(`exercises.difficulties.${exercise.difficulty_level}`, { defaultValue: exercise.difficulty_level })}
                  </span>
                </div>
              )}

              {/* Exercise Type Detail */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('exercises.type', { defaultValue: 'Type' })}:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {exercise.exercise_type === 'time_based'
                    ? t('exercises.types.time_based', { defaultValue: 'Time Based' })
                    : t('exercises.types.repetition_based', { defaultValue: 'Repetition Based' })
                  }
                </span>
              </div>

              {/* Sharing Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('exercises.visibility', { defaultValue: 'Visibility' })}:
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  exercise.is_public
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {exercise.is_public
                    ? t('exercises.public', { defaultValue: 'Public' })
                    : t('exercises.private', { defaultValue: 'Private' })
                  }
                </span>
              </div>

              {/* Video Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('exercises.hasVideo', { defaultValue: 'Video Demo' })}:
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  (exercise.has_video || exercise.custom_video_url)
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {(exercise.has_video || exercise.custom_video_url)
                    ? t('exercises.hasVideoDemo', { defaultValue: 'Available' })
                    : t('exercises.noVideoDemo', { defaultValue: 'Not Available' })
                  }
                </span>
              </div>

              {/* Exercise Source */}
              {exercise.custom_video_url && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('exercises.videoSource', { defaultValue: 'Video Source' })}:
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                    {t('exercises.customVideo', { defaultValue: 'Custom Upload' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description - Modal Style */}
          {loc.description && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.description', { defaultValue: 'Description' })}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {loc.description}
              </p>
            </div>
          )}

          {/* Instructions - Modal Style */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.instructions', { defaultValue: 'Instructions' })}
              </h4>
              <ol className="list-decimal list-inside space-y-2">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400">
                    {instruction.text}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tags - Modal Style */}
          {exercise.tags && exercise.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.tags', { defaultValue: 'Tags' })}
              </h4>
              <div className="flex flex-wrap gap-2">
                {exercise.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    {t(`tags.${tag}`, { ns: 'exercises', defaultValue: tag })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Equipment - Modal Style */}
          {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.equipment', { defaultValue: 'Equipment' })}
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {exercise.equipment_needed.map((item, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits - Modal Style */}
          {exercise.benefits && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.benefits', { defaultValue: 'Benefits' })}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {exercise.benefits}
              </p>
            </div>
          )}

          {/* Limitations - Modal Style */}
          {exercise.limitations && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.limitations', { defaultValue: 'Limitations' })}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {exercise.limitations}
              </p>
            </div>
          )}

          {/* Best Timing - Modal Style */}
          {exercise.best_timing && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.bestTiming', { defaultValue: 'Best Timing' })}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {exercise.best_timing}
              </p>
            </div>
          )}

          {/* Suggested Combinations - Modal Style */}
          {exercise.suggested_combinations && exercise.suggested_combinations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.suggestedCombinations', { defaultValue: 'Suggested Combinations' })}
              </h4>
              <ul className="space-y-1">
                {exercise.suggested_combinations.map((exerciseId, index) => {
                  const referencedExercise = getExerciseById(exerciseId);
                  return (
                    <li key={index} className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                      {referencedExercise ? (
                        <button
                          onClick={() => navigate(`${AppRoutes.EXERCISES}/${exerciseId}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors text-left"
                        >
                          {referencedExercise.name}
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic text-sm">
                          Exercise not found (ID: {exerciseId})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Notes - Modal Style */}
          {exercise.notes && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.notes', { defaultValue: 'Notes' })}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {exercise.notes}
              </p>
            </div>
          )}

          {/* Exercise References - Modal Style */}
          {exercise.exercise_references && exercise.exercise_references.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.references', { defaultValue: 'References' })}
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {exercise.exercise_references.map((reference, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400">
                    {reference}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Muscle Groups - Modal Style */}
          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('exercises.muscleGroups', { defaultValue: 'Muscle Groups' })}
              </h4>
              <div className="flex flex-wrap gap-2">
                {exercise.muscle_groups.map((muscle) => (
                  <span
                    key={muscle}
                    className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ratings & Reviews */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('exercises.ratingsAndReviews', { defaultValue: 'Ratings & Reviews' })}
            </h4>
            <ExerciseRating
              exerciseId={exercise.id}
              currentRating={exercise.rating_average || 0}
              ratingCount={exercise.rating_count || 0}
              onRatingChange={handleRatingChange}
              showReviewForm={!isOwner}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailPage;