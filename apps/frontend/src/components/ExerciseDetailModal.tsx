import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, ExerciseCategory } from '../types';
import { localizeExercise } from '../utils/localizeExercise';
import { VideoThumbnail } from './VideoThumbnail';
import { ExercisePlaceholder } from './ExercisePlaceholder';
import { getExerciseById } from '../data/exercises';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  getCategoryColor: (category: ExerciseCategory) => string;
  formatDuration: (seconds?: number) => string;
  onNavigateToExercise?: (exerciseId: string) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  isOpen,
  onClose,
  getCategoryColor,
  formatDuration,
  onNavigateToExercise
}) => {
  const { t } = useTranslation(['common', 'exercises']);

  if (!isOpen || !exercise) return null;

  const loc = localizeExercise(exercise, t);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('exercises.exerciseDetails', { defaultValue: 'Exercise Details' })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category Indicator */}
          <div className={`${getCategoryColor(exercise.category)} h-1 w-full rounded-full mb-4`}></div>

          {/* Exercise Name and Type */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {loc.name}
            </h3>
            
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
                    {t('exercises:timeBased.name')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('exercises:repBased.name')}
                  </>
                )}
              </span>
              
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                {t(`exercises.category.${exercise.category.replace('-', '')}` as const, { defaultValue: exercise.category.replace('-', ' ') })}
              </span>

              {/* Difficulty Badge */}
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
                  {t(`exercises.difficulties.${exercise.difficulty_level}`, { defaultValue: exercise.difficulty_level })}
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
                  ? t('exercises.public', { defaultValue: 'Public' })
                  : t('exercises.private', { defaultValue: 'Private' })
                }
              </span>
            </div>
          </div>

          {/* Video/Image */}
          <div className="mb-6">
            {(exercise.has_video || exercise.custom_video_url) ? (
              <div className="max-w-md mx-auto">
                <VideoThumbnail
                  exercise={exercise}
                  onVideoLoad={() => {}}
                  onVideoError={() => {}}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <ExercisePlaceholder size="lg" />
              </div>
            )}
          </div>

          {/* Default Values */}
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

          {/* Exercise Metadata */}
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

          {/* Description */}
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

          {/* Instructions */}
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

          {/* Tags */}
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

          {/* Equipment */}
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

          {/* Benefits */}
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

          {/* Limitations */}
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

          {/* Best Timing */}
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

          {/* Suggested Combinations */}
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
                        onNavigateToExercise ? (
                          <button
                            onClick={() => {
                              onClose(); // Close modal first
                              onNavigateToExercise(exerciseId);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors text-left"
                          >
                            {referencedExercise.name}
                          </button>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">
                            {referencedExercise.name}
                          </span>
                        )
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

          {/* Exercise References */}
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

          {/* Muscle Groups */}
          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <div>
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
        </div>
      </div>
    </div>
  );
};