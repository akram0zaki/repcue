import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseFunctionBaseUrl } from './config/supabase';
import type { Exercise } from './types';
import {
  PlayIcon
} from './components/icons/NavigationIcons';
import { VideoThumbnail } from './components/VideoThumbnail';
import { ExercisePlaceholder } from './components/ExercisePlaceholder';
import { ExerciseCategory as Categories } from './types';
import { localizeExercise } from './utils/localizeExercise';
import { getExerciseById } from './data/exercises';

interface ShareInfo {
  sharedBy: string;
  sharedAt: string;
  isPublic: boolean;
  permissionLevel: string;
  expiresAt?: string;
  videoRecoveryTriggered?: boolean;
}

interface SharedExerciseData {
  exercise: Exercise;
  shareInfo: ShareInfo;
}

// Lightweight snackbar for standalone usage
interface SnackbarContextType {
  showSnackbar: (message: string, options?: { type?: 'success' | 'error' | 'warning' | 'info' }) => void;
}

const StandaloneSnackbar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbar, setSnackbar] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    visible: boolean;
  } | null>(null);

  const showSnackbar = (message: string, options?: { type?: 'success' | 'error' | 'warning' | 'info' }) => {
    setSnackbar({ message, type: options?.type || 'info', visible: true });
    setTimeout(() => setSnackbar(null), 3000);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {snackbar?.visible && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg text-white ${
          snackbar.type === 'success' ? 'bg-green-600' :
          snackbar.type === 'error' ? 'bg-red-600' :
          snackbar.type === 'warning' ? 'bg-yellow-600' :
          'bg-blue-600'
        }`}>
          {snackbar.message}
        </div>
      )}
    </SnackbarContext.Provider>
  );
};

const SnackbarContext = React.createContext<SnackbarContextType>({
  showSnackbar: () => {}
});


const StandaloneSharedExercise: React.FC = () => {
  const { t } = useTranslation(['common', 'exercises']);

  // Extract share token from URL path
  const shareToken = window.location.pathname.split('/share/')[1];

  const [sharedData, setSharedData] = useState<SharedExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Load shared exercise data
  useEffect(() => {
    const fetchSharedExercise = async () => {
      if (!shareToken) {
        setError('Invalid share token');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${supabaseFunctionBaseUrl}/functions/v1/get-shared-exercise?token=${encodeURIComponent(shareToken)}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load shared exercise');
        }

        const data = await response.json();
        setSharedData(data);
      } catch (error) {
        console.error('Failed to fetch shared exercise:', error);
        setError(error instanceof Error ? error.message : 'Failed to load shared exercise');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedExercise();
  }, [shareToken]);

  // Handle saving shared exercise - redirect to main app
  const handleSaveExercise = () => {
    if (!shareToken) return;

    // Store the share token for the main app to process
    sessionStorage.setItem('pendingShareToken', shareToken);

    // Redirect to main app home page with a parameter
    const mainAppUrl = new URL(window.location.origin);
    mainAppUrl.searchParams.set('saveSharedExercise', shareToken);

    // Force a full page navigation to ensure main app initializes properly
    window.location.href = mainAppUrl.toString();
  };


  const getCategoryColor = (category: string): string => {
    switch (category) {
      case Categories.CORE: return 'bg-red-500';
      case Categories.STRENGTH: return 'bg-blue-500';
      case Categories.CARDIO: return 'bg-green-500';
      case Categories.FLEXIBILITY: return 'bg-purple-500';
      case Categories.BALANCE: return 'bg-yellow-500';
      case Categories.HAND_WARMUP: return 'bg-orange-500';
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

  const goToMainApp = () => {
    window.location.href = window.location.origin;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('exercises.shareNotFound', 'Exercise Not Found')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || t('exercises.shareExpired', 'This share link may have expired or is invalid.')}
          </p>
          <button
            onClick={goToMainApp}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
          >
            {t('common.goHome', 'Go to RepCue')}
          </button>
        </div>
      </div>
    );
  }

  const { exercise, shareInfo } = sharedData;
  const loc = localizeExercise(exercise, t);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal header without navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('exercises.sharedExercise', 'Shared Exercise')}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">{/* Wider container for full-page layout */}

        {/* Exercise Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="p-6">
            {/* Category Indicator */}
            <div className={`${getCategoryColor(exercise.category)} h-1 w-full rounded-full mb-4`}></div>
            {/* Top Row - Shared Tag (Left) and Debug Play Button (Right) */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                {/* Left Side - Shared Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    {t('exercises.sharedBy', { defaultValue: 'Shared by {{name}}', name: shareInfo.sharedBy })}
                  </span>
                </div>

                {/* Right Side - Debug Play Button (Temporary) */}
                {(exercise.custom_video_url || shareInfo?.videoRecoveryTriggered) && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title={t('common.playVideo', { defaultValue: 'Play video' })}
                    disabled={!exercise.custom_video_url}
                  >
                    <PlayIcon size={20} />
                  </button>
                )}
              </div>
            </div>

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

            {/* Video Recovery Notification */}
            {shareInfo?.videoRecoveryTriggered && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t('exercises.videoRecovering', { defaultValue: 'Video is being prepared for viewing. The owner will need to sync their device for the video to become available.' })}
                  </div>
                </div>
              </div>
            )}

            {/* Video/Image Area - Matching catalog style */}
            <div className="mb-4">
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
            {(exercise.benefits || t(`exercises.${exercise.id}.benefits`, { defaultValue: null })) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.benefits', { defaultValue: 'Benefits' })}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(`exercises.${exercise.id}.benefits`, { defaultValue: exercise.benefits || '' })}
                </p>
              </div>
            )}

            {/* Limitations */}
            {(exercise.limitations || t(`exercises.${exercise.id}.limitations`, { defaultValue: null })) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.limitations', { defaultValue: 'Limitations' })}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(`exercises.${exercise.id}.limitations`, { defaultValue: exercise.limitations || '' })}
                </p>
              </div>
            )}

            {/* Best Timing */}
            {(exercise.best_timing || t(`exercises.${exercise.id}.best_timing`, { defaultValue: null })) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.bestTiming', { defaultValue: 'Best Timing' })}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(`exercises.${exercise.id}.best_timing`, { defaultValue: exercise.best_timing || '' })}
                </p>
              </div>
            )}

            {/* Suggested Combinations */}
            {((exercise.suggested_combinations && exercise.suggested_combinations.length > 0) ||
              (t(`exercises.${exercise.id}.suggested_combinations`, { defaultValue: null }) &&
               Array.isArray(t(`exercises.${exercise.id}.suggested_combinations`, { defaultValue: [] })))) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.suggestedCombinations', { defaultValue: 'Suggested Combinations' })}
                </h4>
                <ul className="space-y-1">
                  {(t(`exercises.${exercise.id}.suggested_combinations`, { defaultValue: exercise.suggested_combinations || [] }) as unknown as string[]).map((exerciseId, index) => {
                    const referencedExercise = getExerciseById(exerciseId);
                    return (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                        {referencedExercise ? (
                          <a
                            href={`${window.location.origin}/exercises/${exerciseId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                          >
                            {referencedExercise.name}
                            <span className="ml-1 text-xs text-gray-500">↗</span>
                          </a>
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
            {(exercise.notes || t(`exercises.${exercise.id}.notes`, { defaultValue: null })) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.notes', { defaultValue: 'Notes' })}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(`exercises.${exercise.id}.notes`, { defaultValue: exercise.notes || '' })}
                </p>
              </div>
            )}

            {/* Exercise References */}
            {((exercise.exercise_references && exercise.exercise_references.length > 0) ||
              (t(`exercises.${exercise.id}.exercise_references`, { defaultValue: null }) &&
               Array.isArray(t(`exercises.${exercise.id}.exercise_references`, { defaultValue: [] })))) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('exercises.references', { defaultValue: 'References' })}
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {(t(`exercises.${exercise.id}.exercise_references`, { defaultValue: exercise.exercise_references || [] }) as unknown as string[]).map((reference, index) => (
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSaveExercise}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
          >
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {t('exercises.saveToLibrary', { defaultValue: 'Save to My Library' })}
            </>
          </button>

          <button
            onClick={goToMainApp}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors min-h-[48px]"
          >
            {t('common.browseExercises', { defaultValue: 'Browse Exercises' })}
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {exercise.name} - {t('exercises.demonstrationVideo', { defaultValue: 'Demonstration Video' })}
              </h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {exercise.custom_video_url ? (
                <video
                  src={exercise.custom_video_url}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[60vh] rounded"
                >
                  {t('exercises.videoNotSupported', { defaultValue: 'Your browser does not support the video tag.' })}
                </video>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V3a1 1 0 011 1v1M7 4V3a1 1 0 011-1v0M7 4H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t('exercises.videoBeingPrepared', { defaultValue: 'Video Being Prepared' })}
                    </h4>
                    <p className="text-sm">
                      {t('exercises.videoRecoveryInProgress', { defaultValue: 'The video is being prepared for viewing. Please check back shortly or ask the owner to sync their device.' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with snackbar provider
const StandaloneSharedExerciseApp: React.FC = () => {
  return (
    <StandaloneSnackbar>
      <StandaloneSharedExercise />
    </StandaloneSnackbar>
  );
};

export default StandaloneSharedExerciseApp;