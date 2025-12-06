import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { Routes } from '../types';
import { isNativePlatform } from '../utils/nativeCapabilities';
import logger from '../utils/logger';

/**
 * Extract tokens from URL hash fragment
 * Supabase returns tokens in hash format: #access_token=xxx&refresh_token=xxx&...
 */
function extractTokensFromHash(hash: string): { accessToken?: string; refreshToken?: string } | null {
  if (!hash || !hash.includes('access_token')) {
    return null;
  }
  
  // Remove leading # if present
  const hashContent = hash.startsWith('#') ? hash.substring(1) : hash;
  const params = new URLSearchParams(hashContent);
  
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  
  if (accessToken) {
    return { accessToken, refreshToken: refreshToken || undefined };
  }
  
  return null;
}

/**
 * OAuth callback page that handles authentication redirects
 * This page is typically visited after OAuth sign-in (Google, Apple, etc.)
 * Enhanced with better error handling and user feedback
 * 
 * For native apps using custom URL schemes (repcue://), tokens in the hash
 * must be manually extracted and set since Supabase doesn't auto-detect them.
 */
const AuthCallbackPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Detect authentication type from URL hash or params
        const hash = window.location.hash;
        const href = window.location.href;
        const isMagicLink = hash.includes('type=magiclink') || searchParams.get('type') === 'magiclink';
        
        // Always log for debugging on native (visible in Xcode console)
        console.log('🔐 AuthCallbackPage mounted');
        console.log('🔐 Current URL:', href.substring(0, 120));
        console.log('🔐 Hash present:', !!hash, 'length:', hash.length);
        console.log('🔐 Has access_token:', hash.includes('access_token'));
        
        logger.log('🔐 Auth callback started:', {
          hash: hash ? `${hash.substring(0, 50)}...` : '(empty)',
          isNative: isNativePlatform(),
          isMagicLink,
          href: href.substring(0, 100)
        });
        
        // Extract provider from URL params or detect from auth type
        let detectedProvider = searchParams.get('provider') || '';
        if (!detectedProvider && isMagicLink) {
          detectedProvider = 'email';
        }
        // Capitalize first letter for display
        const displayProvider = detectedProvider 
          ? detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)
          : t('callback.defaultProvider', 'your account');
        setProvider(displayProvider);

        // For native apps with custom URL schemes, tokens in the hash need to be
        // manually extracted and set since Supabase doesn't auto-detect them
        if (isNativePlatform() && hash.includes('access_token')) {
          logger.log('🔐 Native app detected with tokens in hash, extracting...');
          const tokens = extractTokensFromHash(hash);
          
          if (tokens?.accessToken) {
            logger.log('🔐 Setting session from extracted tokens');
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken || ''
            });
            
            if (setSessionError) {
              logger.error('🔐 Failed to set session from tokens:', setSessionError);
              setError(t('errors.signInFailed', 'Sign-in failed. Please try again.'));
              setTimeout(() => navigate(Routes.HOME, { replace: true }), 4000);
              return;
            }
            
            if (data.session?.user) {
              logger.log('🔐 Session set successfully from tokens:', {
                userId: data.session.user.id,
                email: data.session.user.email
              });
              
              // Clear the URL hash to prevent re-processing on navigation
              if (window.location.hash) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              
              setSuccess(true);
              
              // Check for shared exercise token
              const shareToken = searchParams.get('saveSharedExercise');
              if (shareToken) {
                sessionStorage.setItem('pendingShareToken', shareToken);
              }
              
              // Quick redirect - session is already set
              setTimeout(() => {
                if (shareToken) {
                  navigate(`${Routes.HOME}?saveSharedExercise=${shareToken}`, { replace: true });
                } else {
                  navigate(Routes.HOME, { replace: true });
                }
              }, 800); // Reduced from 2000ms - just show brief success flash
              return;
            }
          }
        }

        // Check for OAuth error in URL params (common OAuth error pattern)
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          let friendlyMessage = errorDescription || errorParam;
          
          // Provide user-friendly error messages for common OAuth errors
          switch (errorParam) {
            case 'access_denied':
              friendlyMessage = t('errors.oauthAccessDenied', 'Sign-in was cancelled. You can try signing in again.');
              break;
            case 'invalid_request':
              friendlyMessage = t('errors.oauthInvalidRequest', 'There was a problem with the sign-in request. Please try again.');
              break;
            case 'server_error':
              friendlyMessage = t('errors.oauthServerError', 'The authentication service is temporarily unavailable. Please try again later.');
              break;
            default:
              friendlyMessage = t('errors.oauthGeneric', 'Sign-in failed. Please try again.');
          }
          
          logger.error('OAuth error from URL params:', { error: errorParam, description: errorDescription });
          setError(friendlyMessage);
          
          // Redirect to home with error after a delay
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 4000);
          return;
        }

        // Get the session from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Auth callback error:', error);
          
          // Map Supabase auth errors to user-friendly messages
          let friendlyMessage = error.message;
          
          if (error.message.includes('email_not_confirmed')) {
            friendlyMessage = t('errors.emailNotConfirmed', 'Please check your email and click the confirmation link to complete sign-up.');
          } else if (error.message.includes('invalid_credentials')) {
            friendlyMessage = t('errors.invalidCredentials', 'Invalid credentials. Please try signing in again.');
          } else if (error.message.includes('too_many_requests')) {
            friendlyMessage = t('errors.rateLimited', 'Too many attempts. Please wait a few minutes and try again.');
          } else {
            friendlyMessage = t('errors.signInFailed', 'Sign-in failed. Please try again.');
          }
          
          setError(friendlyMessage);
          
          // Redirect to home with error after a delay
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 4000);
          return;
        }

        if (data.session?.user) {
          // Successfully authenticated
          logger.log('OAuth authentication successful:', {
            provider: data.session.user.app_metadata?.provider,
            userId: data.session.user.id,
            email: data.session.user.email
          });
          
          setSuccess(true);
          
          // Check for shared exercise token and preserve it during redirect
          const shareToken = searchParams.get('saveSharedExercise');
          if (shareToken) {
            // Store in sessionStorage for the main app to process
            sessionStorage.setItem('pendingShareToken', shareToken);
          }

          // Show success state briefly before redirecting
          setTimeout(() => {
            if (shareToken) {
              // Redirect with the shared exercise parameter
              navigate(`${Routes.HOME}?saveSharedExercise=${shareToken}`, { replace: true });
            } else {
              navigate(Routes.HOME, { replace: true });
            }
          }, 2000);
        } else {
          // No session found - could be a refresh issue
          logger.warn('No session found during OAuth callback');
          setError(t('errors.noSessionFound', 'Authentication session not found. Please try signing in again.'));
          
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 3000);
        }
      } catch (err) {
        logger.error('Unexpected error during auth callback:', err);
        setError(t('errors.signInFailed', 'An unexpected error occurred. Please try again.'));
        
        // Redirect to home after a delay
        setTimeout(() => {
          navigate(Routes.HOME, { replace: true });
        }, 4000);
      }
    };

    handleAuthCallback();
  }, [navigate, t, searchParams]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20">
              <span className="text-2xl">✅</span> {/* i18n-exempt: universal success symbol */}
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('callback.success', 'Sign-in successful!')} {/* i18n-exempt: fallback text provided */}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('callback.successMessage', { provider, defaultValue: `Successfully signed in with ${provider}. Redirecting to your dashboard...` })} {/* i18n-exempt: fallback text provided */}
            </p>
            <div className="mt-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {t('callback.redirectingShort', 'Redirecting...')} {/* i18n-exempt: fallback text provided */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <span className="text-2xl">❌</span> {/* i18n-exempt: universal error symbol */}
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('callback.error', 'Authentication failed')} {/* i18n-exempt: fallback text provided */}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              {error}
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate(Routes.HOME, { replace: true })}
                className="btn-primary"
              >
                {t('callback.tryAgain', 'Try Again')} {/* i18n-exempt: fallback text provided */}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('callback.autoRedirectIn', 'Auto-redirecting in a few seconds...')} {/* i18n-exempt: fallback text provided */}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/20">
            <svg className="animate-spin h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('callback.processing', 'Processing authentication...')} {/* i18n-exempt: fallback text provided */}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('callback.processingMessage', { provider, defaultValue: `Completing sign-in with ${provider}. This should only take a moment.` })} {/* i18n-exempt: fallback text provided */}
          </p>
          <div className="mt-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
              {t('callback.pleaseWait', 'Please wait...')} {/* i18n-exempt: fallback text provided */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

