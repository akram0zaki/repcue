/* eslint-disable no-restricted-syntax -- i18n-exempt: language names shown in their native forms */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';

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

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      // Persist preference for cross-device sync (best-effort)
      try {
        await storageService.updateUserPreferences({ locale: languageCode });
        // Promptly push the change so other devices pick it up
        void syncService.sync();
      } catch (e) {
        // Non-fatal: UI language has already switched via i18n
        console.debug('Locale persistence skipped:', e);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t('settings.selectLanguage')}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
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
      <select
        id="language-selector"
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-describedby="language-help"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeLabel} ({lang.label})
          </option>
        ))}
      </select>
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
