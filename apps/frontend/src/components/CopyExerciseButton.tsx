import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { CopyIcon, CheckIcon } from './icons/NavigationIcons';

interface CopyExerciseButtonProps {
  exerciseId: string;
  exerciseName: string;
  onCopySuccess?: (copiedExerciseId: string) => void;
  onCopyError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  showLabel?: boolean;
}

export const CopyExerciseButton: React.FC<CopyExerciseButtonProps> = ({
  exerciseId,
  exerciseName,
  onCopySuccess,
  onCopyError,
  size = 'md',
  variant = 'primary',
  className = '',
  showLabel = true
}) => {
  const { t } = useTranslation();
  const [isCoying, setIsCoying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication on mount
  React.useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(false);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
  }, []);

  const handleCopy = async () => {
    if (!isAuthenticated || isCoying) return;

    setIsCoying(true);

    try {
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call the copy-exercise Edge Function
      const response = await supabase.functions.invoke('copy-exercise', {
        body: { exercise_id: exerciseId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      // Show success state
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Notify parent component
      if (onCopySuccess) {
        onCopySuccess(result.copied_exercise_id);
      }

    } catch (err) {
      console.error('Error copying exercise:', err);
      const errorMessage = err instanceof Error ? err.message : t('copy.genericError');
      
      if (onCopyError) {
        onCopyError(errorMessage);
      } else {
        // Show error as alert if no custom handler
        alert(t('copy.error', { error: errorMessage }));
      }
    } finally {
      setIsCoying(false);
    }
  };

  // Size configurations
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      button: 'px-3 py-2 text-sm',
      icon: 'h-4 w-4',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'h-5 w-5',
    }
  };

  // Variant configurations
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    ghost: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  // Don't render if authentication status is unknown
  if (isAuthenticated === null) {
    return null;
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <button
          disabled
          className={`${currentSize.button} ${currentVariant} opacity-50 cursor-not-allowed rounded-md transition-colors ${className}`}
        >
          <div className="flex items-center space-x-2">
            <CopyIcon className={currentSize.icon} />
            {showLabel && <span>{t('copy.loginRequired')}</span>}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleCopy}
        disabled={isCoying || copied}
        className={`${currentSize.button} ${currentVariant} rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={t('copy.tooltip', { name: exerciseName })}
      >
        <div className="flex items-center space-x-2">
          {copied ? (
            <CheckIcon className={`${currentSize.icon} text-green-500`} />
          ) : (
            <CopyIcon className={currentSize.icon} />
          )}
          {showLabel && (
            <span>
              {copied 
                ? t('copy.copied') 
                : isCoying 
                  ? t('copy.copying') 
                  : t('copy.copy')
              }
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export default CopyExerciseButton;