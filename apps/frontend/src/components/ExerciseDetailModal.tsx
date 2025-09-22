import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, ExerciseCategory } from '../types';
import { ExerciseDetailContent } from './ExerciseDetailContent';
import { VideoThumbnail } from './VideoThumbnail';
import { ExercisePlaceholder } from './ExercisePlaceholder';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  getCategoryColor?: (category: ExerciseCategory) => string; // Made optional since we're not using it
  formatDuration?: (seconds?: number) => string; // Made optional since we're not using it
  onNavigateToExercise?: (exerciseId: string) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onNavigateToExercise
}) => {
  const { t } = useTranslation(['common', 'exercises']);

  if (!isOpen || !exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('exerciseDetails', { ns: 'exercises', defaultValue: 'Exercise Details' })}
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

        {/* Video/Image Section - Unique to Modal */}
        <div className="px-6 pt-6">
          {(exercise.has_video || exercise.custom_video_url) ? (
            <div className="max-w-md mx-auto mb-6">
              <VideoThumbnail
                exercise={exercise}
                onVideoLoad={() => {}}
                onVideoError={() => {}}
                className="w-full"
              />
            </div>
          ) : (
            <div className="max-w-md mx-auto mb-6">
              <ExercisePlaceholder size="lg" />
            </div>
          )}
        </div>

        {/* Shared Content */}
        <ExerciseDetailContent
          exercise={exercise}
          showActions={false} // Modal doesn't show action buttons like favorites/edit
          onNavigateToExercise={onNavigateToExercise ? (exerciseId) => {
            onClose(); // Close modal first
            onNavigateToExercise(exerciseId);
          } : undefined}
          className="px-6 pb-6"
        />
      </div>
    </div>
  );
};