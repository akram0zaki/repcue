/* eslint-disable no-restricted-syntax -- i18n-exempt: UI text comes from t(); remaining literals are units/IDs/tokens */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../types';
import { audioService } from '../services/audioService';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { SpeakerIcon } from '../components/icons/NavigationIcons';
import Toast from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import DataExportButton from '../components/security/DataExportButton';
import DeleteAccountModal from '../components/security/DeleteAccountModal';

interface SettingsPageProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ appSettings, onUpdateSettings }) => {
  const { t } = useTranslation(['common']);
  const [showClearDataToast, setShowClearDataToast] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleVolumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    onUpdateSettings({ beepVolume: volume });
    
    // Play a test beep at the new volume
    if (appSettings.soundEnabled) {
      await audioService.playIntervalBeep(volume);
    }
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = parseInt(event.target.value);
    onUpdateSettings({ intervalDuration: duration });
  };

  const handleExportData = async () => {
    try {
      const data = await storageService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repcue-data-${new Date().toISOString().split('T')[0]}.json`;
      // In jsdom, body may be missing or not accept Nodes in sequential runs; guard append
      try {
        document.body?.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // Fallback: just trigger click without DOM insertion
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleClearData = async () => {
    setShowClearDataToast(true);
  };

  const confirmClearData = async () => {
    try {
      // Clear all application data
      await storageService.clearAllData();
      
      // Reset consent to trigger banner on next load
      consentService.resetConsent();
      
      // Navigate to home screen and reload to show consent banner (skip full nav in tests)
      const isTest = typeof window !== 'undefined' && (window as Window & { __TEST__?: boolean }).__TEST__ === true;
      if (!isTest) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  const handleRefreshExercises = async () => {
    try {
      // Import fresh exercise data from server/source
      const { INITIAL_EXERCISES } = await import('../data/exercises');
      
      // Force refresh: Use fresh exercise data WITHOUT preserving favorites
      // This gives users a clean slate with the latest exercise definitions
      const refreshedExercises = INITIAL_EXERCISES.map(exercise => ({
        ...exercise,
        isFavorite: false // Reset all favorites for a complete refresh
      }));
      
      // Save all refreshed exercises (this will overwrite existing ones)
      for (const exercise of refreshedExercises) {
        await storageService.saveExercise(exercise);
      }
      
      // Trigger a page reload to show updated exercises
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh exercises:', error);
    }
  };

  const hasConsent = consentService.hasConsent();
  const consentStatus = consentService.getConsentStatus();

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Audio Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <SpeakerIcon size={20} className="text-blue-600 dark:text-blue-400" />
            {t('settings.audioSettings')}
          </h2>
          
          {/* Sound Enable/Disable */}
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="sound-enabled" className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.enableSound')}
            </label>
            <button
              id="sound-enabled"
              onClick={() => onUpdateSettings({ soundEnabled: !appSettings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.soundEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.soundEnabled 
                    ? 'translate-x-6 toggle-switch-on' 
                    : 'translate-x-1 toggle-switch-off'
                }`}
              />
            </button>
          </div>

                    {/* Volume Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="beep-volume" className="text-gray-700 dark:text-gray-300 font-medium">
                {t('settings.beepVolume')}
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(appSettings.beepVolume * 100)}%
              </span>
            </div>
            <input
              id="beep-volume"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={appSettings.beepVolume}
              onChange={handleVolumeChange}
              disabled={!appSettings.soundEnabled}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="grid grid-cols-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-left">{t('common.low')}</span>
              <span className="text-center">{t('common.medium')}</span>
              <span className="text-right">{t('common.high')}</span>
            </div>
          </div>

          {/* Vibration Enable/Disable */}
          <div className="flex items-center justify-between">
            <label htmlFor="vibration-enabled" className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.enableVibration')}
            </label>
            <button
              id="vibration-enabled"
              onClick={() => onUpdateSettings({ vibrationEnabled: !appSettings.vibrationEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.vibrationEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.vibrationEnabled 
                    ? 'translate-x-6 toggle-switch-on' 
                    : 'translate-x-1 toggle-switch-off'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Timer Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.timerSettings')}
          </h2>
          
          {/* Pre-Timer Countdown */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="pre-timer-countdown" className="text-gray-700 dark:text-gray-300 font-medium">
                {t('settings.preTimerCountdown')}
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {appSettings.preTimerCountdown === 0 ? t('common.off') : `${appSettings.preTimerCountdown}${t('common.secondsShortSuffix')}`}
              </span>
            </div>
            <input
              id="pre-timer-countdown"
              type="range"
              min="0"
              max="10"
              step="1"
              value={appSettings.preTimerCountdown}
              onChange={(e) => onUpdateSettings({ preTimerCountdown: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t('common.off')}</span>
              <span>5s</span>
              <span>10s</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.preTimerCountdownHelp')}
            </p>
          </div>
          
          {/* Interval Duration */}
          <div>
            <label htmlFor="interval-duration" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
              {t('timer.beepInterval')}
            </label>
            <select
              id="interval-duration"
              value={appSettings.intervalDuration}
              onChange={handleIntervalChange}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>Every 15 seconds</option>
              <option value={30}>Every 30 seconds</option>
              <option value={45}>Every 45 seconds</option>
              <option value={60}>Every 60 seconds</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.beepIntervalHelp')}
            </p>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.appearance')}
          </h2>
          
          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <label htmlFor="dark-mode" className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.darkMode')}
            </label>
            <button
              id="dark-mode"
              onClick={() => onUpdateSettings({ darkMode: !appSettings.darkMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.darkMode 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.darkMode 
                    ? 'translate-x-6 toggle-switch-on' 
                    : 'translate-x-1 toggle-switch-off'
                }`}
              />
            </button>
          </div>
          {/* Exercise Demo Videos */}
      <div className="flex items-center justify-between mt-4" data-testid="setting-show-exercise-videos">
            <label htmlFor="exercise-videos" className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.showExerciseVideos')}
            </label>
            <button
              id="exercise-videos"
              onClick={() => onUpdateSettings({ showExerciseVideos: !appSettings.showExerciseVideos })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.showExerciseVideos ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
        data-testid="toggle-exercise-videos"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.showExerciseVideos 
                    ? 'translate-x-6 toggle-switch-on' 
                    : 'translate-x-1 toggle-switch-off'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.showExerciseVideosHelp')}
          </p>
        </div>

        {/* Language Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.language')}
          </h2>
          
          <div className="space-y-3">
            <LanguageSwitcher compact={false} showLabel={false} />
          </div>
        </div>

        {/* Data Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('settings.data')}
          </h2>
          
          {/* Auto Save */}
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="auto-save" className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.autoSave')}
            </label>
            <button
              id="auto-save"
              onClick={() => onUpdateSettings({ autoSave: !appSettings.autoSave })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.autoSave 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.autoSave 
                    ? 'translate-x-6 toggle-switch-on' 
                    : 'translate-x-1 toggle-switch-off'
                }`}
              />
            </button>
          </div>

          {/* Data Storage Status */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.dataStorageLabel')} <span className="font-medium">{hasConsent ? t('settings.enabled') : t('settings.disabled')}</span>
              </p>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                v{consentStatus.version}
              </span>
            </div>
            {hasConsent && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('settings.dataStoredLocally')}
              </p>
            )}
            {!hasConsent && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {t('settings.pleaseAcceptConsent')}
              </p>
            )}
            {!consentStatus.isLatestVersion && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {t('settings.consentMigrationWarning')}
              </p>
            )}
          </div>

          {/* Export Data Button */}
          <div className="mb-3">
            <button
              onClick={handleExportData}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.exportData')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.exportDataHelp')}
            </p>
          </div>

          {/* Refresh Exercises Button */}
          <div className="mb-3">
            <button
              onClick={handleRefreshExercises}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.refreshExercises')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.refreshExercisesHelp')}
            </p>
          </div>

          {/* Clear Data Button */}
          <div>
            <button
              onClick={handleClearData}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.clearAllDataAndReset')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.clearAllDataHelp')}
            </p>
          </div>
        </div>

        {/* Security & Privacy Settings */}
        {isAuthenticated && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Security & Privacy
            </h2>
            
            {/* Data Export */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Your Data
              </h3>
              <DataExportButton className="w-full" />
            </div>

            {/* Account Deletion */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delete Account
              </h3>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete My Account
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Permanently delete your account and all associated data. This action has a 30-day grace period.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clear Data Confirmation Toast */}
      <Toast
        isOpen={showClearDataToast}
        onClose={() => setShowClearDataToast(false)}
        onConfirm={confirmClearData}
        type="danger"
        title={t('settings.clearAllDataAndReset')}
        message={t('settings.clearAllDataMessage')}
        confirmText={t('settings.clearAllData')}
        cancelText={t('common.cancel')}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onSuccess={() => {
          setShowDeleteAccountModal(false);
          // User will be signed out automatically
        }}
      />
    </div>
  );
};

export default SettingsPage; 