import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

interface SignInFormProps {
  onSwitchToSignUp: () => void;
  onSwitchToMagicLink: () => void;
  onClose?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSwitchToSignUp,
  onSwitchToMagicLink,
  onClose
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const { 
    signInWithPassword, 
    signInWithOAuth, 
    signInWithPasskey,
    isPasskeySupported,
    isPlatformAuthenticatorAvailable,
    loading 
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError(t('errors.allFieldsRequired'));
      return;
    }

    const result = await signInWithPassword(email.trim(), password);
    
    if (!result.success) {
      setError(result.error || t('errors.signInFailed'));
    } else if (onClose) {
      onClose();
    }
  };

  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

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
    } catch (error) {
      console.error('OAuth error:', error);
      setError(t('errors.signInFailed'));
      setOauthLoading(null);
    }
  };

  const handlePasskeySignIn = async () => {
    setError('');
    const result = await signInWithPasskey(email.trim() || undefined);
    
    if (!result.success) {
      setError(result.error || t('errors.signInFailed'));
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('signIn.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('signIn.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Passkey Sign In - Primary Method */}
        {passkeySupported && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <span className="mr-2 text-lg">🔐</span>
              {platformAuthAvailable ? 
                t('signInWithBiometrics', 'Sign in with biometrics') : /* i18n-exempt: fallback text provided */
                t('signInWithPasskey', 'Sign in with passkey') /* i18n-exempt: fallback text provided */
              }
            </button>
            
            <div className="mt-4 text-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder={t('fields.emailOptional', 'Email (optional for faster sign in)')} /* i18n-exempt: fallback text provided */
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('passkeyHint', 'Use your fingerprint, face, or security key to sign in instantly')} {/* i18n-exempt: fallback text provided */}
              </p>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {t('orUseTraditionalMethod', 'Or use traditional method')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show email field if passkeys are not supported */}
          {!passkeySupported && (
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
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fields.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('placeholders.password')}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  { }
                  {showPassword ? '👁️' : '👁️‍🗨️'} {/* i18n-exempt: universal eye icons for password visibility */}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {loading ? t('common:loading') : t('signIn.button')}
          </button>
        </form>

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

          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading || oauthLoading !== null}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              { }
              <span className="mr-2">✉️</span> {/* i18n-exempt: universal email icon */}
              {t('continueWithEmail')}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToSignUp}
            disabled={loading}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('signIn.switchToSignUp')}
          </button>
        </div>
      </div>
    </div>
  );
};

