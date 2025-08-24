import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { Routes } from '../types';

/**
 * OAuth callback page that handles authentication redirects
 * This page is typically visited after OAuth sign-in (Google, Apple, etc.)
 */
const AuthCallbackPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          
          // Redirect to home with error after a delay
          setTimeout(() => {
            navigate(Routes.HOME, { replace: true });
          }, 3000);
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to home
          navigate(Routes.HOME, { replace: true });
        } else {
          // No session found, redirect to home
          navigate(Routes.HOME, { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError(t('errors.signInFailed'));
        
        // Redirect to home after a delay
        setTimeout(() => {
          navigate(Routes.HOME, { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              {/* eslint-disable-next-line no-restricted-syntax */}
              <span className="text-2xl">❌</span> {/* i18n-exempt: universal error symbol */}
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('callback.error')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              {t('callback.redirecting')}
            </p>
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
            {t('callback.processing')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('callback.pleaseWait')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

