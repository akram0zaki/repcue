import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, supabaseFunctionBaseUrl } from '../config/supabase';
import type { Exercise, AuthUserProfile } from '../types';
import { Routes as AppRoutes } from '../types';
import logger from '../utils/logger';

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

const useSnackbar = () => React.useContext(SnackbarContext);

// Lightweight auth checking - only check session without initializing full authService
const useMinimalAuth = () => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);

  useEffect(() => {
    // Only check session without triggering full auth initialization
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          display_name: session.user.user_metadata?.display_name || session.user.email!
        });
      }
    });
  }, []);

  return { user };
};
import {
  TargetIcon,
  StrengthIcon,
  CardioIcon,
  FlexibilityIcon,
  BalanceIcon,
  HandWarmupIcon,
  RunnerIcon,
  PlayIcon
} from '../components/icons/NavigationIcons';
import { ExerciseCategory as Categories } from '../types';

interface ShareInfo {
  sharedBy: string;
  sharedAt: string;
  isPublic: boolean;
  permissionLevel: string;
  expiresAt?: string;
}

interface SharedExerciseData {
  exercise: Exercise;
  shareInfo: ShareInfo;
}

const SharedExercisePageContent: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises']);
  const { user } = useMinimalAuth();
  const { showSnackbar } = useSnackbar();

  const [sharedData, setSharedData] = useState<SharedExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
        logger.error('Failed to fetch shared exercise:', error);
        setError(error instanceof Error ? error.message : 'Failed to load shared exercise');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedExercise();
  }, [shareToken]);

  // Handle saving shared exercise to user's library
  const handleSaveExercise = async () => {
    if (!user) {
      // Store the share token in session storage for after authentication
      sessionStorage.setItem('pendingShareToken', shareToken || '');
      navigate(AppRoutes.HOME, {
        state: {
          message: 'Please sign in to save this exercise to your library',
          redirectAfterAuth: true
        }
      });
      return;
    }

    if (!shareToken) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${supabaseFunctionBaseUrl}/functions/v1/save-shared-exercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shareToken: shareToken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save exercise');
      }

      const result = await response.json();
      showSnackbar(result.message || t('exercises.exerciseSaved', 'Exercise saved to your library!'), {
        type: 'success'
      });

      // Redirect to exercises page
      navigate(AppRoutes.EXERCISES);
    } catch (error) {
      logger.error('Failed to save shared exercise:', error);
      showSnackbar(error instanceof Error ? error.message : t('exercises.saveFailed', 'Failed to save exercise'), {
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { size: 24, className: "text-current" };
    switch (category) {
      case Categories.CORE: return <TargetIcon {...iconProps} />;
      case Categories.STRENGTH: return <StrengthIcon {...iconProps} />;
      case Categories.CARDIO: return <CardioIcon {...iconProps} />;
      case Categories.FLEXIBILITY: return <FlexibilityIcon {...iconProps} />;
      case Categories.BALANCE: return <BalanceIcon {...iconProps} />;
      case Categories.HAND_WARMUP: return <HandWarmupIcon {...iconProps} />;
      default: return <RunnerIcon {...iconProps} />;
    }
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
            onClick={() => navigate(AppRoutes.HOME)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
          >
            {t('common.goHome', 'Go Home')}
          </button>
        </div>
      </div>
    );
  }

  const { exercise, shareInfo } = sharedData;

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

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Share Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="text-sm font-medium">
              {t('exercises.sharedBy', 'Shared by {{name}}', { name: shareInfo.sharedBy })}
            </span>
          </div>
        </div>

        {/* Exercise Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
          {/* Category Header */}
          <div className={`${getCategoryColor(exercise.category)} h-3`}></div>

          <div className="p-6">
            {/* Exercise Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getCategoryIcon(exercise.category)}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {exercise.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="capitalize">
                    {t(`exercises.category.${exercise.category.replace('-', '')}` as const, exercise.category.replace('-', ' '))}
                  </span>
                  <span>•</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    exercise.exercise_type === 'time_based'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  }`}>
                    {exercise.exercise_type === 'time_based'
                      ? t('exercises:timeBased.name', 'Time-based')
                      : t('exercises:repBased.name', 'Rep-based')
                    }
                  </span>
                </div>
              </div>

              {(exercise.custom_video_url || shareInfo?.videoRecoveryTriggered) && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title={t('exercises.playVideo', 'Play video')}
                  disabled={!exercise.custom_video_url}
                >
                  <PlayIcon size={20} />
                </button>
              )}
            </div>

            {/* Video Recovery Notification */}
            {shareInfo?.videoRecoveryTriggered && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t('exercises.videoRecovering', 'Video is being prepared for viewing. The owner will need to sync their device for the video to become available.')}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {exercise.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                {exercise.description}
              </p>
            )}

            {/* Exercise Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {exercise.exercise_type === 'time_based' ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('exercises.defaultDurationLabel', 'Default Duration')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDuration(exercise.default_duration)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('exercises.defaultSets', 'Default Sets')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {exercise.default_sets || 1}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('exercises.defaultReps', 'Default Reps')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {exercise.default_reps || 1}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tags */}
            {exercise.tags && exercise.tags.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('exercises.tags', 'Tags')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {t(`tags.${tag}`, { ns: 'exercises', defaultValue: tag })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('exercises.instructions', 'Instructions')}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  {exercise.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                        {instruction.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {instruction.text}
                        </p>
                        {instruction.duration_seconds && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('exercises.duration', 'Duration')}: {instruction.duration_seconds}s
                          </p>
                        )}
                      </div>
                    </div>
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
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t('exercises.saveToLibrary', 'Save to My Library')}
              </>
            )}
          </button>

          <button
            onClick={() => navigate(AppRoutes.HOME)}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors min-h-[48px]"
          >
            {t('common.browseExercises', 'Browse Exercises')}
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {exercise.name} - {t('exercises.demonstrationVideo', 'Demonstration Video')}
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
                  {t('exercises.videoNotSupported', 'Your browser does not support the video tag.')}
                </video>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V3a1 1 0 011 1v1M7 4V3a1 1 0 011-1v0M7 4H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t('exercises.videoBeingPrepared', 'Video Being Prepared')}
                    </h4>
                    <p className="text-sm">
                      {t('exercises.videoRecoveryInProgress', 'The video is being prepared for viewing. Please check back shortly or ask the owner to sync their device.')}
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

// Wrap the content with standalone providers for public access
const SharedExercisePage: React.FC = () => {
  return (
    <StandaloneSnackbar>
      <SharedExercisePageContent />
    </StandaloneSnackbar>
  );
};

export default SharedExercisePage;