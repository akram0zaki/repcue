import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import logger from '../../utils/logger';

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  onSwitchToMagicLink: () => void;
  onClose?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSwitchToSignIn,
  onSwitchToMagicLink,
  onClose
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const { 
    signInWithOAuth, 
    registerPasskey,
    isPasskeySupported,
    isPlatformAuthenticatorAvailable,
    loading 
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Check passkey availability on mount
  React.useEffect(() => {
    const checkPasskeySupport = async () => {
      const supported = isPasskeySupported();
      setPasskeySupported(supported);
      
      if (supported) {
        const platformAvailable = await isPlatformAuthenticatorAvailable();
        setPlatformAuthAvailable(platformAvailable);
      }
    };
    
    checkPasskeySupport();
  }, [isPasskeySupported, isPlatformAuthenticatorAvailable]);

  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'github') => {
    setError('');
    setOauthLoading(provider);
    
    try {
      const result = await signInWithOAuth(provider);
      
      if (!result.success) {
        setError(result.error || t('errors.signInFailed'));
        setOauthLoading(null);
      }
      // Note: successful OAuth redirects to provider, so no need to clear loading state
    } catch (err) {
      logger.error('OAuth error:', err);
      setError(t('errors.signInFailed'));
      setOauthLoading(null);
    }
  };

  const handlePasskeyRegistration = async () => {
    setError('');
    
    if (!email.trim()) {
      setError(t('errors.emailRequired'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('errors.invalidEmail'));
      return;
    }

    const result = await registerPasskey(email.trim());
    
    if (!result.success) {
      setError(result.error || t('errors.registrationFailed'));
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('signUp.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('signUp.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Passkey Registration - Primary Method */}
        {passkeySupported && (
          <div className="mb-6">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('passkeyRegisterInfo', 'Create an account with just your email and biometrics - no password needed!')}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('fields.email')}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="button"
                onClick={handlePasskeyRegistration}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span className="mr-2 text-lg">🔐</span>
                {platformAuthAvailable ? 
                  t('signUpWithBiometrics', 'Sign up with biometrics') : 
                  t('signUpWithPasskey', 'Sign up with passkey')
                }
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('passkeyRegisterHint', 'Your device will securely create and store a passkey for this account')}
              </p>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {t('orContinueWith')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading || oauthLoading !== null}
            className="btn-secondary w-full inline-flex justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {oauthLoading === 'google' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('redirectingToProvider', 'Redirecting to Google...')}
              </>
            ) : (
              <>
                <span className="mr-2">🔍</span> {/* i18n-exempt: Google search icon */}
                {t('continueWithGoogle')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSwitchToMagicLink}
            disabled={loading}
            className="btn-secondary w-full inline-flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            { }
            <span className="mr-2">✉️</span> {/* i18n-exempt: universal email icon */}
            {t('continueWithEmail')}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            disabled={loading}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('signUp.switchToSignIn')}
          </button>
        </div>
      </div>
    </div>
  );
};

