import React from 'react';
import { useTranslation } from 'react-i18next';

interface ExercisePlaceholderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ExercisePlaceholder: React.FC<ExercisePlaceholderProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { t } = useTranslation('exercises');

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-full aspect-square',
    lg: 'w-full aspect-square'
  };

  const iconSizes = {
    sm: 24,
    md: 48,
    lg: 64
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}>
      {/* Exercise Icon */}
      <svg 
        width={iconSizes[size]} 
        height={iconSizes[size]} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        className="text-gray-400 dark:text-gray-500 mb-2"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159-.026-1.563.434L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
      
      {/* No Video Text */}
      <span className={`${textSizes[size]} text-gray-500 dark:text-gray-400 font-medium text-center px-2`}>
        {t('common:common.noVideo', { defaultValue: 'No Video' })}
      </span>
    </div>
  );
};