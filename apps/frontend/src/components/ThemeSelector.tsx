import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../types/theme';

/**
 * ThemeSelector Component
 * 
 * Displays theme preview cards allowing users to select their preferred color theme.
 * Shows preview colors and applies theme selection with visual feedback.
 * 
 * Features:
 * - Visual theme preview cards with color swatches
 * - Active theme indication
 * - Accessible with keyboard navigation
 * - Loading state during theme application
 * - Responsive grid layout
 * 
 * @component
 * @example
 * ```tsx
 * <ThemeSelector />
 * ```
 */
export function ThemeSelector(): React.JSX.Element {
  const { currentThemeId, availableThemes, setTheme, isApplying } = useTheme();
  const { t } = useTranslation(['settings']);

  const handleThemeChange = async (themeId: string) => {
    if (themeId === currentThemeId || isApplying) {
      return;
    }
    await setTheme(themeId);
  };

  return (
    <div className="mt-6" data-testid="theme-selector">
      <label className="label-text mb-3 block">
        {t('settings:theme.label', 'Color Theme')}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {t('settings:theme.description', 'Choose a color theme that matches your style')}
      </p>
      
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label={t('settings:theme.label', 'Color Theme')}
      >
        {availableThemes.map((theme: Theme) => {
          const isActive = theme.id === currentThemeId;
          const isDisabled = isApplying;
          
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isActive ? 'true' : 'false'}
              aria-label={`${theme.name} theme`}
              disabled={isDisabled}
              onClick={() => handleThemeChange(theme.id)}
              data-testid={`theme-option-${theme.id}`}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isActive 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-2 end-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Theme name and description */}
              <div className="text-start mb-3">
                <h3 className="font-semibold text-text-900 dark:text-text-50 mb-1">
                  {t(`settings:theme.${theme.id}.name`, theme.name)}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t(`settings:theme.${theme.id}.description`, theme.description)}
                </p>
              </div>

              {/* Color preview swatches */}
              <div className="flex gap-2" aria-label={`${theme.name} color preview`}>
                {theme.previewColors.map((color, index) => (
                  <div
                    key={index}
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: color } as React.CSSProperties}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Applying indicator */}
      {isApplying && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {t('settings:theme.applying', 'Applying theme...')}
        </div>
      )}
    </div>
  );
}
