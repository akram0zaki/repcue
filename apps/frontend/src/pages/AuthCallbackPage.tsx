import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { Routes } from '../types';

/**
 * OAuth callback page that handles authentication redirects
 * This page is typically visited after OAuth sign-in (Google, Apple, etc.)
 * Enhanced with better error handling and user feedback
 */
const AuthCallbackPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>('OAuth provider');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract provider from URL params for better UX
        const providerParam = searchParams.get('provider') || 'OAuth provider';
        setProvider(providerParam.charAt(0).toUpperCase() + providerParam.slice(1));

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
          
          console.error('OAuth error from URL params:', { error: errorParam, description: errorDescription });
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
          console.error('Auth callback error:', error);
          
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
          console.log('OAuth authentication successful:', {
            provider: data.session.user.app_metadata?.provider,
            userId: data.session.user.id,
            email: data.session.user.email
          });
          
          setSuccess(true);
          
          // Show success state briefly before redirecting
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 2000);
        } else {
          // No session found - could be a refresh issue
          console.warn('No session found during OAuth callback');
          setError(t('errors.noSessionFound', 'Authentication session not found. Please try signing in again.'));
          
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 3000);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
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
              {t('callback.successMessage', `Successfully signed in with ${provider}. Redirecting to your dashboard...`)} {/* i18n-exempt: fallback text provided */}
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <svg className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('callback.processing', 'Processing authentication...')} {/* i18n-exempt: fallback text provided */}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('callback.processingMessage', `Completing sign-in with ${provider}. This should only take a moment.`)} {/* i18n-exempt: fallback text provided */}
          </p>
          <div className="mt-4">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {t('callback.pleaseWait', 'Please wait...')} {/* i18n-exempt: fallback text provided */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

