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
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              { }
              <span className="text-2xl">✅</span> {/* i18n-exempt: universal success symbol */}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('magicLink.checkEmail')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('magicLink.sentTo', { email })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('magicLink.instructions')}
            </p>
            
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {t('common:close')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
            { }
            <span className="text-2xl">✉️</span> {/* i18n-exempt: universal email symbol */}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('magicLink.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('magicLink.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fields.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('placeholders.email')}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {loading ? t('common:loading') : t('magicLink.button')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            disabled={loading}
            className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('magicLink.switchToSignIn')}
          </button>
          <button
            type="button"
            onClick={onSwitchToSignUp}
            disabled={loading}
            className="block w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('magicLink.switchToSignUp')}
          </button>
        </div>
      </div>
    </div>
  );
};

