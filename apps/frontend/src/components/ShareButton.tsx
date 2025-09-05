import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareIcon } from '../components/icons/NavigationIcons';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useSnackbar } from './SnackbarProvider';
import { supabase } from '../config/supabase';

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
  const [isSharing, setIsSharing] = useState(false);
  const [shareWithEmail, setShareWithEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'copy'>('view');

  const handleSharePublic = async () => {
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/functions/v1/share-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          exercise_id: exerciseId,
          permission_level: permissionLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share exercise');
      }

      showSnackbar(t('exercises.sharedPublicly', 'Exercise shared publicly!'), {
        type: 'success'
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to share exercise:', error);
      showSnackbar(t('exercises.shareError', 'Failed to share exercise'), {
        type: 'error'
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareWithUser = async () => {
    if (!shareWithEmail.trim()) {
      showSnackbar(t('exercises.emailRequired', 'Email is required'), {
        type: 'error'
      });
      return;
    }

    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // First, get user ID by email (this would need a backend endpoint)
      const response = await fetch('/api/functions/v1/share-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          exercise_id: exerciseId,
          shared_with_email: shareWithEmail,
          permission_level: permissionLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share exercise');
      }

      showSnackbar(t('exercises.sharedWithUser', 'Exercise shared with {{email}}!', { email: shareWithEmail }), {
        type: 'success'
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to share exercise:', error);
      showSnackbar(t('exercises.shareError', 'Failed to share exercise'), {
        type: 'error'
      });
    } finally {
      setIsSharing(false);
    }
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
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('exercises.shareDescription', 'Share "{{name}}" with others', { name: exerciseName })}
          </p>

          {/* Permission Level */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('exercises.permissionLevel', 'Permission Level')}
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="permission"
                  value="view"
                  checked={permissionLevel === 'view'}
                  onChange={(e) => setPermissionLevel(e.target.value as 'view')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('exercises.viewOnly', 'View Only')} - {t('exercises.viewOnlyDesc', 'Can view but not copy')}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="permission"
                  value="copy"
                  checked={permissionLevel === 'copy'}
                  onChange={(e) => setPermissionLevel(e.target.value as 'copy')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('exercises.canCopy', 'Can Copy')} - {t('exercises.canCopyDesc', 'Can view and make a copy')}
                </span>
              </label>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-4">
            {/* Share Publicly */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('exercises.sharePublic', 'Share Publicly')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('exercises.sharePublicDesc', 'Anyone can discover this exercise in the community')}
              </p>
              <button
                onClick={handleSharePublic}
                disabled={isSharing}
                className="btn-primary btn-small"
              >
                {isSharing ? t('common.sharing', 'Sharing...') : t('exercises.makePublic', 'Make Public')}
              </button>
            </div>

            {/* Share with Specific User */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('exercises.shareWithUser', 'Share with User')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('exercises.shareWithUserDesc', 'Share with a specific user by email')}
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  value={shareWithEmail}
                  onChange={(e) => setShareWithEmail(e.target.value)}
                  placeholder={t('common.emailPlaceholder', 'user@example.com')}
                  className="form-input"
                />
                <button
                  onClick={handleShareWithUser}
                  disabled={isSharing || !shareWithEmail.trim()}
                  className="btn-primary btn-small"
                >
                  {isSharing ? t('common.sharing', 'Sharing...') : t('exercises.shareWithUser', 'Share')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="btn-secondary">
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