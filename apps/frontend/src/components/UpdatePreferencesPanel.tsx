import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdatePreferences, UpdateMode } from '../types';
import { updateService } from '../services/updateService';
import logger from '../utils/logger';
import ToggleSwitch from './ToggleSwitch';

interface UpdatePreferencesPanelProps {
  className?: string;
}

/**
 * UpdatePreferencesPanel component for managing PWA update preferences
 * Integrates with existing settings UI patterns and update service
 */
export const UpdatePreferencesPanel: React.FC<UpdatePreferencesPanelProps> = ({
  className = ''
}) => {
  const { t } = useTranslation(['common']);
  const [preferences, setPreferences] = useState<UpdatePreferences>({
    updateMode: 'notify',
    allowMeteredUpdates: false,
    showChangelog: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<{
    isMetered: boolean;
    type: string;
    effectiveType: string;
  } | null>(null);

  // Load current preferences on mount
  useEffect(() => {
    try {
      const currentPrefs = updateService.getUserPreferences();
      setPreferences(currentPrefs);

      // Get connection info for displaying metered connection status
      const connInfo = updateService.getConnectionInfo();
      setConnectionInfo({
        isMetered: connInfo.isMetered,
        type: connInfo.type,
        effectiveType: connInfo.effectiveType
      });

      setIsLoading(false);
      logger.log('Loaded update preferences:', currentPrefs);
    } catch (error) {
      logger.error('Failed to load update preferences:', error);
      setIsLoading(false);
    }
  }, []);

  // Handle update mode change
  const handleUpdateModeChange = (newMode: UpdateMode) => {
    try {
      const updatedPrefs = { ...preferences, updateMode: newMode };
      setPreferences(updatedPrefs);
      updateService.setUserPreferences({ updateMode: newMode });
      logger.log('Update mode changed to:', newMode);
    } catch (error) {
      logger.error('Failed to update mode preference:', error);
    }
  };

  // Handle metered connection preference change
  const handleMeteredUpdatesChange = (allowed: boolean) => {
    try {
      const updatedPrefs = { ...preferences, allowMeteredUpdates: allowed };
      setPreferences(updatedPrefs);
      updateService.setUserPreferences({ allowMeteredUpdates: allowed });
      logger.log('Metered updates preference changed to:', allowed);
    } catch (error) {
      logger.error('Failed to update metered connection preference:', error);
    }
  };

  // Handle changelog display preference change
  const handleShowChangelogChange = (show: boolean) => {
    try {
      const updatedPrefs = { ...preferences, showChangelog: show };
      setPreferences(updatedPrefs);
      updateService.setUserPreferences({ showChangelog: show });
      logger.log('Show changelog preference changed to:', show);
    } catch (error) {
      logger.error('Failed to update changelog preference:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-48"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6 ${className}`}>
      {/* Header */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {t('settings.updatePreferences', 'App Updates')}
      </h2>

      {/* Privacy Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0h-2m9-5v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a7 7 0 1114 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              {t('settings.updatePrivacyTitle', 'Privacy First')}
            </p>
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              {t('settings.updatePrivacyMessage', 'Update checks only send your current version number. No personal data is transmitted.')}
            </p>
          </div>
        </div>
      </div>

      {/* Update Mode Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.updateModeTitle', 'Update Behavior')}
          </h3>

          <div className="space-y-3">
            {/* Automatic Updates */}
            <label className="flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 relative">
              <input
                type="radio"
                name="updateMode"
                value="automatic"
                checked={preferences.updateMode === 'automatic'}
                onChange={() => handleUpdateModeChange('automatic')}
                className="mt-1 mr-3 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.updateMode.automatic.title', 'Automatic Updates')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('settings.updateMode.automatic.description', 'Install updates automatically in the background. Recommended for most users.')}
                </div>
              </div>
              {preferences.updateMode === 'automatic' && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
              )}
            </label>

            {/* Notify Only */}
            <label className="flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 relative">
              <input
                type="radio"
                name="updateMode"
                value="notify"
                checked={preferences.updateMode === 'notify'}
                onChange={() => handleUpdateModeChange('notify')}
                className="mt-1 mr-3 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.updateMode.notify.title', 'Notify Only')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('settings.updateMode.notify.description', 'Show notifications for updates but let me decide when to install them.')}
                </div>
              </div>
              {preferences.updateMode === 'notify' && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
              )}
            </label>

            {/* Manual Only */}
            <label className="flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 relative">
              <input
                type="radio"
                name="updateMode"
                value="manual"
                checked={preferences.updateMode === 'manual'}
                onChange={() => handleUpdateModeChange('manual')}
                className="mt-1 mr-3 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.updateMode.manual.title', 'Manual Only')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('settings.updateMode.manual.description', 'Never check for updates automatically. I\'ll update manually when needed.')}
                </div>
              </div>
              {preferences.updateMode === 'manual' && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
              )}
            </label>
          </div>

          {/* Important Note for Security Updates */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
            <div className="flex items-start">
              <svg
                className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {t('settings.securityUpdatesNote', 'Critical security updates will always be applied automatically regardless of your preference.')}
              </p>
            </div>
          </div>
        </div>

        {/* Metered Connection Settings */}
  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.meteredConnection', 'Data Usage')}
          </h3>

          {/* Current Connection Status */}
          {connectionInfo && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.currentConnection', 'Current Connection:')}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    connectionInfo.isMetered
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                  }`}>
                    {connectionInfo.isMetered
                      ? t('settings.connectionMetered', 'Metered')
                      : t('settings.connectionUnmetered', 'Unmetered')
                    }
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({connectionInfo.effectiveType})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Allow Metered Updates Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label htmlFor="allow-metered-updates" className="label-text">
                {t('settings.allowMeteredUpdates', 'Allow updates on metered connections')}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.allowMeteredUpdatesDescription', 'Updates may use mobile data or count against data limits')}
              </p>
            </div>
            <ToggleSwitch
              id="allow-metered-updates"
              checked={preferences.allowMeteredUpdates}
              onChange={() => handleMeteredUpdatesChange(!preferences.allowMeteredUpdates)}
              dataTestId="toggle-allow-metered-updates"
              label={t('settings.allowMeteredUpdates', 'Allow updates on metered connections')}
              className="ml-4"
            />
          </div>
        </div>

        {/* Additional Preferences */}
  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.additionalPreferences', 'Additional Options')}
          </h3>

          {/* Show Changelog Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label htmlFor="show-changelog" className="label-text">
                {t('settings.showChangelog', 'Show what\'s new')}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.showChangelogDescription', 'Display release notes and feature highlights after updates')}
              </p>
            </div>
            <ToggleSwitch
              id="show-changelog"
              checked={preferences.showChangelog}
              onChange={() => handleShowChangelogChange(!preferences.showChangelog)}
              dataTestId="toggle-show-changelog"
              label={t('settings.showChangelog', 'Show what\'s new')}
              className="ml-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePreferencesPanel;