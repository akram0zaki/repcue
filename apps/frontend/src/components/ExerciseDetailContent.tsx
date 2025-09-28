import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Exercise } from '../types';
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
  const { t } = useTranslation(['exercises', 'exerciseDetails']);
  const navigate = useNavigate();

  const loc = localizeExercise(exercise, t);


  const formatDuration = (seconds?: number): string => {
  if (!seconds) return t('exercises:variable', 'Variable');
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

  // Helper function to detect and render URLs in references
  const renderReference = (reference: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = reference.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors break-all hyphens-auto"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={className}>

      {/* Exercise Name and Type */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
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
                      : 'text-text-400 dark:text-text-600 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  title={isFavorite ? t('exercises:removeFromFavorites') : t('exercises:addToFavorites')}
                >
                  {isFavorite ? <StarFilledIcon className="h-6 w-6" /> : <StarIcon className="h-6 w-6" />}
                </button>
              )}

              {isOwner && (
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-full text-text-400 dark:text-text-600 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title={t('exercises:edit')}
                >
                  <EditIcon className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tags - moved below exercise name */}
        {exercise.tags && exercise.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {exercise.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-200 text-gray-800 dark:text-gray-900 rounded-full"
              >
                {t(`exercises:tags.${tag}`, tag)}
              </span>
            ))}
          </div>
        )}

        {/* Exercise Description - moved to top */}
        {loc.description && (
          <p className="text-text-500 dark:text-text-400 leading-relaxed mb-4">
            {loc.description}
          </p>
        )}


        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartTimer}
              className="btn-primary flex items-center space-x-2 text-sm"
            >
              <PlayIcon className="h-4 w-4" />
              <span>{t('exercises:startTimer', 'Start Timer')}</span>
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


      {/* Exercise Metadata */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
          {t('exercises:exerciseInfo', 'Exercise Information')}
        </h4>
        <div className="space-y-3 text-text-500 dark:text-text-400 leading-relaxed">
          {/* Difficulty Level */}
          {exercise.difficulty_level && (
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {t('exercises:difficultyLevel', 'Difficulty')}:
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                exercise.difficulty_level === 'beginner'
                  ? 'bg-green-100 dark:bg-green-200 text-green-800 dark:text-green-900'
                  : exercise.difficulty_level === 'intermediate'
                  ? 'bg-yellow-100 dark:bg-yellow-200 text-yellow-800 dark:text-yellow-900'
                  : 'bg-red-100 dark:bg-red-200 text-red-800 dark:text-red-900'
              }`}>
                {t(`exercises:difficulties.${exercise.difficulty_level}`, exercise.difficulty_level)}
              </span>
            </div>
          )}

          {/* Exercise Type with Duration */}
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t('exercises:type', 'Type')}:
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              exercise.exercise_type === 'time_based'
                ? 'bg-blue-100 dark:bg-blue-200 text-blue-800 dark:text-blue-900'
                : 'bg-purple-100 dark:bg-purple-200 text-purple-800 dark:text-purple-900'
            }`}>
              {exercise.exercise_type === 'time_based'
                ? `${t('exercises:types.time_based', 'Time Based')} - ${formatDuration(exercise.default_duration)}`
                : `${t('exercises:types.repetition_based', 'Repetition Based')} - ${exercise.default_sets || 1}x${exercise.default_reps || 1}`
              }
            </span>
          </div>

          {/* Sharing Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t('exercises:visibility', 'Visibility')}:
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              exercise.is_public
                ? 'bg-primary-100 dark:bg-primary-200 text-primary-800 dark:text-primary-900'
                : 'bg-gray-100 dark:bg-gray-200 text-gray-800 dark:text-gray-900'
            }`}>
              {exercise.is_public
                ? t('exercises:public', 'Public')
                : t('exercises:private', 'Private')
              }
            </span>
          </div>

        </div>
      </div>


      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:instructions', 'Instructions')}
          </h4>
          <ol className="list-decimal list-inside space-y-2">
            {exercise.instructions.map((instruction, index) => (
              <li key={index} className="text-text-500 dark:text-text-400">
                {instruction.text}
              </li>
            ))}
          </ol>
        </div>
      )}


      {/* Equipment */}
      {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:equipment', 'Equipment')}
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {exercise.equipment_needed.map((item, index) => (
              <li key={index} className="text-text-500 dark:text-text-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Benefits */}
    {(exercise.benefits || t(`exerciseDetails:${exercise.id}.benefits`, '')) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:benefits', 'Benefits')}
          </h4>
          <p className="text-text-500 dark:text-text-400 leading-relaxed">
            {t(`exerciseDetails:${exercise.id}.benefits`, exercise.benefits || '')}
          </p>
        </div>
      )}

      {/* Limitations */}
    {(exercise.limitations || t(`exerciseDetails:${exercise.id}.limitations`, '')) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:limitations', 'Limitations')}
          </h4>
          <p className="text-text-500 dark:text-text-400 leading-relaxed">
            {t(`exerciseDetails:${exercise.id}.limitations`, exercise.limitations || '')}
          </p>
        </div>
      )}

      {/* Best Timing */}
    {(exercise.best_timing || t(`exerciseDetails:${exercise.id}.best_timing`, '')) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:bestTiming', 'Best Timing')}
          </h4>
          <p className="text-text-500 dark:text-text-400 leading-relaxed">
            {t(`exerciseDetails:${exercise.id}.best_timing`, exercise.best_timing || '')}
          </p>
        </div>
      )}

      {/* Suggested Combinations */}
            {((exercise.suggested_combinations && exercise.suggested_combinations.length > 0) ||
              (t(`exerciseDetails:${exercise.id}.suggested_combinations`, '') &&
                Array.isArray(exercise.suggested_combinations))) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:suggestedCombinations', 'Suggested Combinations')}
          </h4>
          <ul className="space-y-1">
            {(exercise.suggested_combinations || []).map((exerciseId, index) => {
              const referencedExercise = getExerciseById(exerciseId);
              return (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0"></span>
                  {referencedExercise ? (
                    <button
                      onClick={() => {
                        if (onNavigateToExercise) {
                          onNavigateToExercise(exerciseId);
                        } else {
                          navigate(`${AppRoutes.EXERCISES}/${exerciseId}`);
                        }
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors text-left"
                    >
                      {t(`exerciseDetails:${exerciseId}.name`, referencedExercise.name)}
                    </button>
                  ) : (
                    <span className="text-text-500 dark:text-text-400 italic text-sm">
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
    {(exercise.notes || t(`exerciseDetails:${exercise.id}.notes`, '')) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:notes', 'Notes')}
          </h4>
          <p className="text-text-500 dark:text-text-400 leading-relaxed">
            {t(`exerciseDetails:${exercise.id}.notes`, exercise.notes || '')}
          </p>
        </div>
      )}

      {/* Exercise References */}
            {((exercise.exercise_references && exercise.exercise_references.length > 0) ||
              (t(`exerciseDetails:${exercise.id}.exercise_references`, '') &&
                Array.isArray(exercise.exercise_references))) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:references', 'References')}
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {(exercise.exercise_references || []).map((reference, index) => (
              <li key={index} className="text-text-500 dark:text-text-400">
                {renderReference(reference)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Muscle Groups */}
      {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('exercises:muscleGroups', 'Muscle Groups')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {exercise.muscle_groups.map((muscle) => (
              <span
                key={muscle}
                className="inline-block px-3 py-1 text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ratings & Reviews */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
          {t('exercises:ratingsAndReviews', 'Ratings & Reviews')}
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