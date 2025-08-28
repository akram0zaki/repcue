import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './auth/AuthModal';

interface ProfileSectionProps {
  onViewProfile?: () => void;
  className?: string;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  onViewProfile,
  className = ''
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || t('profile.anonymous');
  const initials = getInitials(user?.displayName, user?.email);

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4 ${className}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t('profile.title', 'Profile')}
        </h2>

      {isAuthenticated && user ? (
        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {user.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onViewProfile}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('profile.viewProfile', 'View Profile')}
            </button>
            
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {loading ? t('common:loading') : t('signOut')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Not signed in message */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {t('profile.notSignedIn', 'You are not signed in')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('profile.signInToSync', 'Sign in to sync your data across devices')}
            </p>
          </div>

          {/* Sign In Button */}
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m0 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {t('signIn.button')}
          </button>
        </div>
      )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </>
  );
};
