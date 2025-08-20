import { useTranslation } from 'react-i18next';

/**
 * Utility hooks for internationalized formatting of numbers, dates, and times
 * Phase 6: Interpolation and number/date formatting
 */

export const useLocalizedFormatting = () => {
  const { i18n, t } = useTranslation();
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return t('timer.seconds', { count: seconds });
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (remainingSeconds === 0) {
        return t('timer.minutes', { count: minutes });
      } else {
        return `${t('timer.minutes', { count: minutes })} ${t('timer.seconds', { count: remainingSeconds })}`;
      }
    }
  };

  const formatExerciseCount = (count: number): string => {
    return t('timer.exercises', { count });
  };

  const formatExercisesRemaining = (count: number): string => {
    return t('timer.exercisesRemaining', { count });
  };

  // Format numbers using browser's Intl API with current language
  const formatNumber = (number: number): string => {
    return new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language || 'en').format(number);
  };

  // Format dates using browser's Intl API with current language
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat(
      i18n.resolvedLanguage || i18n.language || 'en',
      { ...defaultOptions, ...options }
    ).format(date);
  };

  // Format time using browser's Intl API with current language
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat(
      i18n.resolvedLanguage || i18n.language || 'en',
      { 
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  };

  return {
    formatDuration,
    formatExerciseCount,
    formatExercisesRemaining,
    formatNumber,
    formatDate,
    formatTime
  };
};

/**
 * Format seconds into MM:SS format
 * This is independent of i18n as it's a pure time format
 */
export const formatSecondsToMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
