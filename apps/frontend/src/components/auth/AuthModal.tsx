import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { MagicLinkForm } from './MagicLinkForm';

type AuthMode = 'signin' | 'signup' | 'magic-link';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderAuthForm = () => {
    switch (mode) {
      case 'signin':
        return (
          <SignInForm
            onSwitchToSignUp={() => setMode('signup')}
            onSwitchToMagicLink={() => setMode('magic-link')}
            onClose={onClose}
          />
        );
      case 'signup':
        return (
          <SignUpForm
            onSwitchToSignIn={() => setMode('signin')}
            onSwitchToMagicLink={() => setMode('magic-link')}
            onClose={onClose}
          />
        );
      case 'magic-link':
        return (
          <MagicLinkForm
            onSwitchToSignIn={() => setMode('signin')}
            onSwitchToSignUp={() => setMode('signup')}
            onClose={onClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="auth-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      <div
        className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleBackdropClick}
      >
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-transparent rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle">
          <div className="relative">
            {/* Auth form content */}
            <div className="relative">
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute -top-2 -right-2 z-10 p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full shadow-lg border border-gray-200 dark:border-gray-600"
                aria-label={t('common.close')}
              >
                {/* eslint-disable-next-line no-restricted-syntax */}
                <span className="sr-only">{t('common.close')}</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {renderAuthForm()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

