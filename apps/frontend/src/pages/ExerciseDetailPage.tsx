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
  TargetIcon,
  StrengthIcon,
  CardioIcon,
  FlexibilityIcon,
  BalanceIcon,
  HandWarmupIcon,
} from '../components/icons/NavigationIcons';
import { ExerciseRating } from '../components/ExerciseRating';
import { CopyExerciseButton } from '../components/CopyExerciseButton';
import { favoritesService } from '../services/favoritesService';

interface ExerciseDetailPageProps {}

const ExerciseDetailPage: React.FC<ExerciseDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Category icons mapping
  const categoryIcons = {
    core: TargetIcon,
    strength: StrengthIcon,
    cardio: CardioIcon,
    flexibility: FlexibilityIcon,
    balance: BalanceIcon,
    'hand-warmup': HandWarmupIcon,
  };

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
        // For builtin exercises, we would need to load from the exercises data
        // For now, redirect to exercises list if not found
        throw new Error('Builtin exercise details not supported yet');
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
        difficulty_level: exerciseData.difficulty_level || 'beginner'
      } as Exercise;
      setExercise(transformedExercise);

      // Check favorite status
      const favoriteStatus = await favoritesService.isFavorite(id);
      setIsFavorite(favoriteStatus);

    } catch (err) {
      console.error('Error loading exercise details:', err);
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
      console.error('Error toggling favorite:', err);
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

  const CategoryIcon = exercise ? categoryIcons[exercise.category] : TargetIcon;

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CategoryIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {exercise.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t(`exercises.categories.${exercise.category}`)}
              </p>
            </div>
          </div>
          
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleStartTimer}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlayIcon className="h-5 w-5" />
            <span>{t('exercise.startTimer')}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {exercise.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('exercise.description')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {exercise.description}
              </p>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('exercise.instructions')}
              </h2>
              <ol className="space-y-3">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="flex space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {instruction.step}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-300">
                        {instruction.text}
                      </p>
                      {instruction.duration_seconds && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t('exercise.duration')}: {instruction.duration_seconds}s
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Ratings & Reviews */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t('exercise.ratingsAndReviews')}
            </h2>
            <ExerciseRating
              exerciseId={exercise.id}
              currentRating={exercise.rating_average || 0}
              ratingCount={exercise.rating_count || 0}
              onRatingChange={handleRatingChange}
              showReviewForm={!isOwner} // Don't allow owners to rate their own exercises
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Exercise Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('exercise.details')}
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('exercise.type')}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {t(`exercises.types.${exercise.exercise_type}`)}
                </dd>
              </div>

              {exercise.difficulty_level && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('exercise.difficulty')}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {t(`exercises.difficulty.${exercise.difficulty_level}`)}
                  </dd>
                </div>
              )}

              {exercise.default_duration && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('exercise.defaultDuration')}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {Math.round(exercise.default_duration / 60)} {t('common.minutes')}
                  </dd>
                </div>
              )}

              {exercise.default_sets && exercise.default_reps && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('exercise.defaultSetsReps')}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {exercise.default_sets} sets × {exercise.default_reps} reps
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Equipment */}
          {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('exercise.equipmentNeeded')}
              </h3>
              <ul className="space-y-2">
                {exercise.equipment_needed.map((equipment, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {equipment}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Muscle Groups */}
          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('exercise.muscleGroups')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscle_groups.map((muscle, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {exercise.tags && exercise.tags.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('exercise.tags')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('exercise.stats')}
            </h3>
            <dl className="space-y-3">
              {exercise.copy_count !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    {t('exercise.copies')}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {exercise.copy_count}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  {t('exercise.created')}
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(exercise.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailPage;