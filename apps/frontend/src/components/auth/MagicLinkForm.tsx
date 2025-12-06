import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

interface MagicLinkFormProps {
  onSwitchToSignIn: () => void;
  onSwitchToSignUp: () => void;
  onClose?: () => void;
}

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({
  onSwitchToSignIn,
  onSwitchToSignUp,
  onClose
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const { signInWithMagicLink, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError(t('errors.emailRequired'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }

    const result = await signInWithMagicLink(email.trim());
    
    if (!result.success) {
      setError(result.error || t('errors.magicLinkFailed'));
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 mb-3">
              { }
              <span className="text-xl">✅</span> {/* i18n-exempt: universal success symbol */}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('magicLink.checkEmail')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('magicLink.sentTo', { email })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('magicLink.instructions')}
            </p>
            
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                {t('common.close', { ns: 'common' })}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5">
        {/* Compact header */}
        <div className="text-center mb-4">
          <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-dark-disabled mb-3">
            { }
            <span className="text-xl">✉️</span> {/* i18n-exempt: universal email symbol */}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('magicLink.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('magicLink.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fields.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder={t('placeholders.email')}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2 text-sm"
          >
            {loading ? t('common:loading') : t('magicLink.button')}
          </button>
        </form>

        {/* Compact footer links */}
        <div className="mt-4 text-center space-y-1">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            disabled={loading}
            className="block w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('magicLink.switchToSignIn')}
          </button>
          <button
            type="button"
            onClick={onSwitchToSignUp}
            disabled={loading}
            className="block w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('magicLink.switchToSignUp')}
          </button>
        </div>
      </div>
    </div>
  );
};

