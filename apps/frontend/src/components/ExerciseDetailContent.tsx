import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Exercise, ExerciseCategory } from '../types';
import { Routes as AppRoutes } from '../types';
import {
  StarIcon,
  StarFilledIcon,
  PlayIcon,
  EditIcon,
} from './icons/NavigationIcons';
import { ExerciseRating } from './ExerciseRating';
import { CopyExerciseButton } from './CopyExerciseButton';
import { localizeExercise } from '../utils/localizeExercise';
import { getExerciseById } from '../data/exercises';

interface ExerciseDetailContentProps {
  exercise: Exercise;
  isFavorite?: boolean;
  isOwner?: boolean;
  onToggleFavorite?: () => void;
  onRatingChange?: (newRating: number, newCount: number) => void;
  onStartTimer?: () => void;
  onEdit?: () => void;
  onNavigateToExercise?: (exerciseId: string) => void;
  showActions?: boolean;
  className?: string;
}

export const ExerciseDetailContent: React.FC<ExerciseDetailContentProps> = ({
  exercise,
  isFavorite = false,
  isOwner = false,
  onToggleFavorite,
  onRatingChange,
  onStartTimer,
  onEdit,
  onNavigateToExercise,
  showActions = true,
  className = ''
}) => {
  const { t } = useTranslation(['common', 'exercises', 'exercise']);
  const navigate = useNavigate();

  const loc = localizeExercise(exercise, t);

  // Helper functions for layout consistency
  const getCategoryColor = (category: ExerciseCategory): string => {
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
    if (!seconds) return t('variable', { ns: 'exercises', defaultValue: 'Variable' });
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleStartTimer = () => {
    if (onStartTimer) {
      onStartTimer();
    } else {
      // Default behavior: navigate to timer page with exercise pre-selected
      navigate(AppRoutes.TIMER, {
        state: { selectedExercise: exercise }
      });
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      // Default behavior: navigate to edit page
      navigate(`${AppRoutes.EXERCISES}/${exercise.id}/edit`);
    }
  };

  const handleRatingChange = (newRating: number, newCount: number) => {
    if (onRatingChange) {
      onRatingChange(newRating, newCount);
    }
  };

  return (
    <div className={className}>
      {/* Category Indicator */}
      <div className={`${getCategoryColor(exercise.category)} h-1 w-full rounded-full mb-4`}></div>

      {/* Exercise Name and Type */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {loc.name}
          </h1>

          {showActions && (
            <div className="flex items-center space-x-3">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite
                      ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  title={isFavorite ? t('exercise.removeFromFavorites') : t('exercise.addToFavorites')}
                >
                  {isFavorite ? <StarFilledIcon className="h-6 w-6" /> : <StarIcon className="h-6 w-6" />}
                </button>
              )}

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
          )}
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
                {t('types.time_based', { ns: 'exercises', defaultValue: 'Time Based' })}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('types.repetition_based', { ns: 'exercises', defaultValue: 'Repetition Based' })}
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

          {/* Public/Private Status Badge */}
          <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
            exercise.is_public
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
          }`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {exercise.is_public ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              )}
            </svg>
            {exercise.is_public
              ? t('public', { ns: 'exercises', defaultValue: 'Public' })
              : t('private', { ns: 'exercises', defaultValue: 'Private' })
            }
          </span>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleStartTimer}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlayIcon className="h-5 w-5" />
              <span>{t('startTimer', { ns: 'exercises', defaultValue: 'Start Timer' })}</span>
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
        )}
      </div>

      {/* Default Values */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('defaultSettings', { ns: 'exercises', defaultValue: 'Default Settings' })}
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          {exercise.exercise_type === 'time_based' ? (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('duration', { ns: 'exercises', defaultValue: 'Duration' })}:
              </span>
              <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                {formatDuration(exercise.default_duration)}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('sets', { ns: 'exercises', defaultValue: 'Sets' })}:
                </span>
                <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {exercise.default_sets || 1}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reps', { ns: 'exercises', defaultValue: 'Reps' })}:
                </span>
                <span className="ml-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {exercise.default_reps || 1}
                </span>
              </div>
              {exercise.rep_duration_seconds && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('repDuration', { ns: 'exercises', defaultValue: 'Rep Duration' })}:
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

      {/* Exercise Metadata */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('exerciseInfo', { ns: 'exercises', defaultValue: 'Exercise Information' })}
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          {/* Difficulty Level */}
          {exercise.difficulty_level && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('difficultyLevel', { ns: 'exercises', defaultValue: 'Difficulty' })}:
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
              {t('type', { ns: 'exercises', defaultValue: 'Type' })}:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {exercise.exercise_type === 'time_based'
                ? t('types.time_based', { ns: 'exercises', defaultValue: 'Time Based' })
                : t('types.repetition_based', { ns: 'exercises', defaultValue: 'Repetition Based' })
              }
            </span>
          </div>

          {/* Sharing Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('visibility', { ns: 'exercises', defaultValue: 'Visibility' })}:
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              exercise.is_public
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            }`}>
              {exercise.is_public
                ? t('public', { ns: 'exercises', defaultValue: 'Public' })
                : t('private', { ns: 'exercises', defaultValue: 'Private' })
              }
            </span>
          </div>

          {/* Video Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('hasVideo', { ns: 'exercises', defaultValue: 'Video Demo' })}:
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              (exercise.has_video || exercise.custom_video_url)
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            }`}>
              {(exercise.has_video || exercise.custom_video_url)
                ? t('hasVideoDemo', { ns: 'exercises', defaultValue: 'Available' })
                : t('noVideoDemo', { ns: 'exercises', defaultValue: 'Not Available' })
              }
            </span>
          </div>

          {/* Exercise Source */}
          {exercise.custom_video_url && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('videoSource', { ns: 'exercises', defaultValue: 'Video Source' })}:
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                {t('customVideo', { ns: 'exercises', defaultValue: 'Custom Upload' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {loc.description && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('description', { ns: 'exercises', defaultValue: 'Description' })}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {loc.description}
          </p>
        </div>
      )}

      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('instructions', { ns: 'exercises', defaultValue: 'Instructions' })}
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

      {/* Tags */}
      {exercise.tags && exercise.tags.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('tags', { ns: 'exercise', defaultValue: 'Tags' })}
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

      {/* Equipment */}
      {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('equipment', { ns: 'exercises', defaultValue: 'Equipment' })}
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

      {/* Benefits */}
      {(exercise.benefits || t(`${exercise.id}.benefits`, { ns: 'exercises', defaultValue: null })) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('benefits', { ns: 'exercise', defaultValue: 'Benefits' })}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(`${exercise.id}.benefits`, { ns: 'exercises', defaultValue: exercise.benefits || '' })}
          </p>
        </div>
      )}

      {/* Limitations */}
      {(exercise.limitations || t(`${exercise.id}.limitations`, { ns: 'exercises', defaultValue: null })) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('limitations', { ns: 'exercise', defaultValue: 'Limitations' })}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(`${exercise.id}.limitations`, { ns: 'exercises', defaultValue: exercise.limitations || '' })}
          </p>
        </div>
      )}

      {/* Best Timing */}
      {(exercise.best_timing || t(`${exercise.id}.best_timing`, { ns: 'exercises', defaultValue: null })) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('bestTiming', { ns: 'exercise', defaultValue: 'Best Timing' })}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(`${exercise.id}.best_timing`, { ns: 'exercises', defaultValue: exercise.best_timing || '' })}
          </p>
        </div>
      )}

      {/* Suggested Combinations */}
      {((exercise.suggested_combinations && exercise.suggested_combinations.length > 0) ||
        (t(`${exercise.id}.suggested_combinations`, { ns: 'exercises', defaultValue: null }) &&
         Array.isArray(t(`${exercise.id}.suggested_combinations`, { ns: 'exercises', defaultValue: [] })))) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('suggestedCombinations', { ns: 'exercise', defaultValue: 'Suggested Combinations' })}
          </h4>
          <ul className="space-y-1">
            {(exercise.suggested_combinations || []).map((exerciseId, index) => {
              const referencedExercise = getExerciseById(exerciseId);
              return (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                  {referencedExercise ? (
                    <button
                      onClick={() => {
                        if (onNavigateToExercise) {
                          onNavigateToExercise(exerciseId);
                        } else {
                          navigate(`${AppRoutes.EXERCISES}/${exerciseId}`);
                        }
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors text-left"
                    >
                      {t(`${exerciseId}.name`, { ns: 'exercises', defaultValue: referencedExercise.name })}
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

      {/* Notes */}
      {(exercise.notes || t(`${exercise.id}.notes`, { ns: 'exercises', defaultValue: null })) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('notes', { ns: 'exercise', defaultValue: 'Notes' })}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(`${exercise.id}.notes`, { ns: 'exercises', defaultValue: exercise.notes || '' })}
          </p>
        </div>
      )}

      {/* Exercise References */}
      {((exercise.exercise_references && exercise.exercise_references.length > 0) ||
        (t(`${exercise.id}.exercise_references`, { ns: 'exercises', defaultValue: null }) &&
         Array.isArray(t(`${exercise.id}.exercise_references`, { ns: 'exercises', defaultValue: [] })))) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('references', { ns: 'exercise', defaultValue: 'References' })}
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {(exercise.exercise_references || []).map((reference, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-400">
                {reference}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Muscle Groups */}
      {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('muscleGroups', { ns: 'exercises', defaultValue: 'Muscle Groups' })}
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
          {t('ratingsAndReviews', { ns: 'exercises', defaultValue: 'Ratings & Reviews' })}
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
  );
};