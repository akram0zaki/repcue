/* eslint-disable no-restricted-syntax -- i18n-exempt: language names shown in their native forms */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguageWithPreload } from '../i18n';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';
import logger from '../utils/logger';

interface LanguageSwitcherProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

const supportedLanguages = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'fy', label: 'Frisian', nativeLabel: 'Frysk' },
  { code: 'ar', label: 'Arabic (Standard)', nativeLabel: 'العربية (فصحى)' },
  { code: 'ar-EG', label: 'Arabic (Egyptian)', nativeLabel: 'عربي مصري' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' }
] as const;

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  compact = false, 
  showLabel = true,
  className = '' 
}) => {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    if (isChanging) return; // Prevent double-clicks
    
    try {
      setIsChanging(true);
      // Use preloading for instant language switch (especially important on iOS)
      await changeLanguageWithPreload(languageCode);
      // Persist preference for cross-device sync (best-effort)
      try {
        await storageService.updateUserPreferences({ locale: languageCode });
        // Promptly push the change so other devices pick it up
        void syncService.sync(true);
      } catch (e) {
        // Non-fatal: UI language has already switched via i18n
        logger.debug('Locale persistence skipped:', e);
      }
    } catch (error) {
      logger.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className={`text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isChanging ? 'opacity-50 cursor-wait' : ''}`}
          aria-label={t('settings.selectLanguage')}
          aria-busy={isChanging}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
        {isChanging && (
          <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <label 
          htmlFor="language-selector"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('settings.language')}
        </label>
      )}
      <div className="relative">
        <select
          id="language-selector"
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isChanging ? 'opacity-50 cursor-wait' : ''}`}
          aria-describedby="language-help"
          aria-busy={isChanging}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>
        {isChanging && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" aria-hidden="true" />
        )}
      </div>
      <p 
        id="language-help"
        className="text-xs text-gray-500 dark:text-gray-400"
      >
        {t('settings.languageHelp')}
      </p>
    </div>
  );
};

export default LanguageSwitcher;
