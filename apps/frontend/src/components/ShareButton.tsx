import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareIcon } from '../components/icons/NavigationIcons';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useSnackbar } from './SnackbarProvider';
import { supabase, supabaseFunctionBaseUrl } from '../config/supabase';
import logger from '../utils/logger';
import { syncService } from '../services/syncService';

interface ShareButtonProps {
  exerciseId: string;
  exerciseName: string;
  ownerId?: string | null;
  className?: string;
}

interface ShareDialogProps {
  exerciseId: string;
  exerciseName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ exerciseId, exerciseName, isOpen, onClose }) => {
  const { t } = useTranslation(['common', 'exercises']);
  const { showSnackbar } = useSnackbar();
  const [shareWithEmail, setShareWithEmail] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar(t('common.copiedToClipboard', 'Copied to clipboard!'), {
        type: 'success'
      });
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      showSnackbar(t('common.copyError', 'Failed to copy to clipboard'), {
        type: 'error'
      });
    }
  };

  const handleGenerateShareUrl = async () => {
    logger.info('🔗 [ShareButton] Starting share link generation', { exerciseId, exerciseName, shareWithEmail });
    setIsGeneratingUrl(true);
    try {
      // Quick offline guard
      if (!navigator.onLine) {
        throw new Error('offline');
      }

      logger.info('🔗 [ShareButton] Getting authentication session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      logger.info('🔗 [ShareButton] Authentication successful, user ID:', session.user?.id);

      // Preflight: ensure exercise exists remotely; if not, attempt a force sync
      const ensureExerciseRemote = async (): Promise<boolean> => {
        try {
          const { data, error } = await supabase
            .from('exercises')
            .select('id')
            .eq('id', exerciseId)
            .eq('deleted', false)
            .maybeSingle();
          if (error) {
            logger.warn('🔗 [ShareButton] Preflight remote lookup error (will attempt sync if not found):', error.message);
          }
          return !!data?.id;
        } catch (err) {
          logger.warn('🔗 [ShareButton] Preflight remote lookup exception:', err);
          return false;
        }
      };

      let existsRemote = await ensureExerciseRemote();
      if (!existsRemote) {
        logger.info('🔗 [ShareButton] Exercise not found remotely, triggering force sync...');
        try {
          await syncService.sync(true);
        } catch (syncErr) {
          logger.warn('🔗 [ShareButton] Force sync threw (continuing to re-check):', syncErr);
        }
        existsRemote = await ensureExerciseRemote();
      }

      if (!existsRemote) {
        logger.error('🔗 [ShareButton] Exercise still not present on server after sync attempt');
        throw new Error('not_synced');
      }

      const requestPayload = {
        exerciseId: exerciseId,
        isPublic: true,
        recipientEmail: shareWithEmail || undefined
      };

      logger.info('🔗 [ShareButton] Making API call to share-exercise function', {
        url: `${supabaseFunctionBaseUrl}/functions/v1/share-exercise`,
        payload: requestPayload
      });

      const response = await fetch(`${supabaseFunctionBaseUrl}/functions/v1/share-exercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      logger.info('🔗 [ShareButton] API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('🔗 [ShareButton] API response error:', errorData);
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const data = await response.json();
      logger.info('🔗 [ShareButton] Share link generated successfully:', {
        shareUrl: data.shareUrl,
        responseData: data
      });

      setShareUrl(data.shareUrl);

      showSnackbar(t('exercises.shareLinkGenerated', 'Share link generated successfully!'), {
        type: 'success'
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      if (errMessage === 'offline') {
        showSnackbar(t('exercises.shareErrorOffline', 'You are offline. Connect to the internet to generate a share link.'), { type: 'error' });
      } else if (errMessage === 'not_synced') {
        showSnackbar(t('exercises.shareErrorNotSynced', 'Exercise not yet synced to the cloud. Please wait a moment and try again.'), { type: 'warning' });
      } else if (errMessage === 'No authentication token') {
        showSnackbar(t('exercises.shareErrorAuth', 'You must be signed in to share an exercise.'), { type: 'error' });
      } else {
        showSnackbar(t('exercises.shareError', 'Failed to generate share link'), { type: 'error' });
      }
      logger.error('🔗 [ShareButton] Failed to generate share link:', error);
    } finally {
      setIsGeneratingUrl(false);
      logger.info('🔗 [ShareButton] Share generation process completed');
    }
  };

  const resetDialog = () => {
    setShareUrl(null);
    setShareWithEmail('');
    setIsGeneratingUrl(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('exercises.shareExercise', 'Share Exercise')}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('exercises.shareDescription', 'Create a shareable link for "{{name}}"', { name: exerciseName })}
          </p>

          {/* Share URL Generation */}
          {!shareUrl ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('exercises.generateShareLink', 'Generate Share Link')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('exercises.generateShareLinkDesc', 'Anyone with this link will be able to view and save your exercise')}
                </p>

                <div className="space-y-3">
                  <input
                    type="email"
                    value={shareWithEmail}
                    onChange={(e) => setShareWithEmail(e.target.value)}
                    placeholder={t('exercises.optionalEmailPlaceholder', 'Optional: Recipient email')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <button
                    onClick={handleGenerateShareUrl}
                    disabled={isGeneratingUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    {isGeneratingUrl ? t('common.generating', 'Generating...') : t('exercises.generateLink', 'Generate Share Link')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Share URL Display */
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  {t('exercises.shareLinkReady', 'Share Link Ready!')}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  {t('exercises.shareLinkReadyDesc', 'Copy this link to share your exercise with others')}
                </p>

                <div className="bg-white dark:bg-gray-800 border rounded-md p-3 mb-3">
                  <div className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                    {shareUrl}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    {t('common.copyLink', 'Copy Link')}
                  </button>
                  <button
                    onClick={resetDialog}
                    className="px-4 py-2 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-md transition-colors"
                  >
                    {t('common.createAnother', 'Create Another')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button onClick={handleClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShareButton: React.FC<ShareButtonProps> = ({
  exerciseId,
  exerciseName,
  ownerId,
  className = '',
}) => {
  const { flags } = useFeatureFlags();
  const { showSnackbar } = useSnackbar();
  const [showDialog, setShowDialog] = useState(false);

  const handleClick = async () => {
    if (!flags.canShareExercises) {
      showSnackbar('Exercise sharing is not enabled', { type: 'warning' });
      return;
    }

    // Check if user owns this exercise
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (ownerId && ownerId !== currentUserId) {
      showSnackbar('You can only share your own exercises', { type: 'error' });
      return;
    }

    setShowDialog(true);
  };

  if (!flags.canShareExercises) {
    return null; // Hide button if feature is disabled
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`btn-icon ${className}`}
        title="Share Exercise"
      >
        <ShareIcon size={20} />
      </button>
      
      <ShareDialog
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
};