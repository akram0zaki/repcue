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
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5">
        {/* Compact header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('signUp.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('signUp.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Passkey Registration - Primary Method */}
        {passkeySupported && (
          <div className="mb-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-3">
              {t('passkeyRegisterInfo', 'Create an account with just your email and biometrics - no password needed!')}
            </p>
            
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder={t('fields.email')}
                autoComplete="username"
                disabled={loading}
                required
              />

              <button
                type="button"
                onClick={handlePasskeyRegistration}
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span className="mr-2">🔐</span>
                {platformAuthAvailable ? 
                  t('signUpWithBiometrics', 'Sign up with biometrics') : 
                  t('signUpWithPasskey', 'Sign up with passkey')
                }
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('passkeyRegisterHint', 'Your device will securely create and store a passkey for this account')}
              </p>
            </div>

            {/* Compact divider */}
            <div className="mt-4 mb-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {t('orContinueWith')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact OAuth buttons */}
        <div className="space-y-2">
          {/* Apple Sign In - prominent on iOS */}
          <button
            type="button"
            onClick={() => handleOAuthSignIn('apple')}
            disabled={loading || oauthLoading !== null}
            className="w-full py-2 text-sm inline-flex justify-center items-center bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {oauthLoading === 'apple' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('redirectingToProvider', 'Redirecting...')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {t('continueWithApple')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading || oauthLoading !== null}
            className="btn-secondary w-full py-2 text-sm inline-flex justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {oauthLoading === 'google' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('redirectingToProvider', 'Redirecting...')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('continueWithGoogle')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSwitchToMagicLink}
            disabled={loading}
            className="btn-secondary w-full py-2 text-sm inline-flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-2">✉️</span> {/* i18n-exempt: universal email icon */}
            {t('continueWithEmail')}
          </button>
        </div>

        {/* Compact footer link */}
        <div className="mt-4 text-center">
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

