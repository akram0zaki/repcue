/* eslint-disable no-restricted-syntax -- i18n-exempt: UI text comes from t(); remaining literals are units/IDs/tokens */
import React, { useState } from 'react';
import ToggleSwitch from '../components/ToggleSwitch';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../types';
import { audioService } from '../services/audioService';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { SpeakerIcon } from '../components/icons/NavigationIcons';
import Toast from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import { syncService } from '../services/syncService';
import { correctSyncService } from '../services/correctSyncService';
import DataExportButton from '../components/security/DataExportButton';
import DeleteAccountModal from '../components/security/DeleteAccountModal';
import { ProfileSection } from '../components/ProfileSection';
import { UpdatePreferencesPanel } from '../components/UpdatePreferencesPanel';
import {
  forceRefreshFromServer,
  clearPWACaches,
  forceUpdateServiceWorker
} from '../utils/serviceWorker';
import logger from '../utils/logger';

interface SettingsPageProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ appSettings, onUpdateSettings }) => {
  const { t } = useTranslation(['common']);
  const [showClearDataToast, setShowClearDataToast] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showForceRefreshToast, setShowForceRefreshToast] = useState(false);
  const { isAuthenticated } = useAuth();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForceFullSyncing, setIsForceFullSyncing] = useState(false);
  const [isResettingSyncState, setIsResettingSyncState] = useState(false);

  const handleVolumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    onUpdateSettings({ beep_volume: volume });
    
    // Play a test beep at the new volume
    if (appSettings.sound_enabled) {
      await audioService.playIntervalBeep(volume);
    }
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = parseInt(event.target.value);
    onUpdateSettings({ interval_duration: duration });
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
      logger.error('Failed to export data:', error);
    }
  };

  const handleClearData = async () => {
    setShowClearDataToast(true);
  };

  const handleSyncNow = async () => {
    try {
      setIsManualSyncing(true);
  // Legacy sync (and v2 wrapper) accept optional force flag; current typing expects no args
  await syncService.sync(true);
    } catch (err) {
      logger.error('Manual sync failed:', err);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Force a FULL sync cycle using v2 engine if enabled, otherwise fall back to legacy manual sync
  const handleForceFullSync = async () => {
    if (!hasConsent || !isAuthenticated) return;
    try {
      setIsForceFullSyncing(true);
      await correctSyncService.sync('full');
    } catch (err) {
      logger.error('Force full sync failed:', err);
    } finally {
      setIsForceFullSyncing(false);
    }
  };

  // Reset local sync state then immediately request a full sync
  const handleResetSyncState = async () => {
    if (!hasConsent || !isAuthenticated) return;
    try {
      setIsResettingSyncState(true);
      await correctSyncService.resetState();
      await correctSyncService.sync('full');
    } catch (err) {
      logger.error('Reset sync state failed:', err);
    } finally {
      setIsResettingSyncState(false);
    }
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
      logger.error('Failed to clear data:', error);
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
        is_favorite: false // Reset all favorites for a complete refresh
      }));
      
      // Save all refreshed exercises (this will overwrite existing ones)
      for (const exercise of refreshedExercises) {
        await storageService.saveExercise(exercise);
      }
      
      // Trigger a page reload to show updated exercises
      window.location.reload();
    } catch (error) {
      logger.error('Failed to refresh exercises:', error);
    }
  };

  const handleForceRefresh = () => {
    setShowForceRefreshToast(true);
  };

  const confirmForceRefresh = async () => {
    try {
      setIsRefreshing(true);
      await forceRefreshFromServer();
    } catch (error) {
      logger.error('Force refresh failed:', error);
      setIsRefreshing(false);
    }
  };

  const handleClearCaches = async () => {
    try {
      setIsRefreshing(true);
      await clearPWACaches();
      setIsRefreshing(false);
    } catch (error) {
      logger.error('Clear caches failed:', error);
      setIsRefreshing(false);
    }
  };

  const handleUpdateServiceWorker = async () => {
    try {
      setIsRefreshing(true);
      await forceUpdateServiceWorker();
    } catch (error) {
      logger.error('Service worker update failed:', error);
      setIsRefreshing(false);
    }
  };

  const hasConsent = consentService.hasConsent();
  const consentStatus = consentService.getConsentStatus();

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Profile Section */}
        <ProfileSection 
          onViewProfile={() => {
            window.location.href = '/profile';
          }}
        />

        {/* Audio Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <SpeakerIcon size={20} className="text-blue-600 dark:text-blue-400" />
            {t('settings.audioSettings')}
          </h2>
          
          {/* Sound Enable/Disable */}
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="sound-enabled" className="label-text">
              {t('settings.enableSound')}
            </label>
            <ToggleSwitch
              id="sound-enabled"
              checked={appSettings.sound_enabled}
              onChange={() => onUpdateSettings({ sound_enabled: !appSettings.sound_enabled })}
              dataTestId="toggle-sound-enabled"
            />
          </div>

                    {/* Volume Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="beep-volume" className="label-text">
                {t('settings.beepVolume')}
              </label>
              <span className="text-sm text-text-500 dark:text-text-400">
                {Math.round(appSettings.beep_volume * 100)}%
              </span>
            </div>
            <input
              id="beep-volume"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={appSettings.beep_volume}
              onChange={handleVolumeChange}
              disabled={!appSettings.sound_enabled}
              className="w-full h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="grid grid-cols-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-left">{t('common.low')}</span>
              <span className="text-center">{t('common.medium')}</span>
              <span className="text-right">{t('common.high')}</span>
            </div>
          </div>

          {/* Vibration Enable/Disable */}
          <div className="flex items-center justify-between">
            <label htmlFor="vibration-enabled" className="label-text">
              {t('settings.enableVibration')}
            </label>
            <ToggleSwitch
              id="vibration-enabled"
              checked={appSettings.vibration_enabled}
              onChange={() => onUpdateSettings({ vibration_enabled: !appSettings.vibration_enabled })}
              dataTestId="toggle-vibration-enabled"
            />
          </div>
        </div>

        {/* Timer Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('settings.timerSettings')}
          </h2>
          
          {/* Pre-Timer Countdown */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="pre-timer-countdown" className="label-text">
                {t('settings.preTimerCountdown')}
              </label>
              <span className="text-sm text-text-500 dark:text-text-400">
                {appSettings.pre_timer_countdown === 0 ? t('common.off') : `${appSettings.pre_timer_countdown}${t('common.secondsShortSuffix')}`}
              </span>
            </div>
            <input
              id="pre-timer-countdown"
              type="range"
              min="0"
              max="10"
              step="1"
              value={appSettings.pre_timer_countdown}
              onChange={(e) => onUpdateSettings({ pre_timer_countdown: parseInt(e.target.value) })}
              className="w-full h-2 bg-surface-200 dark:bg-surface-600 rounded-lg appearance-none cursor-pointer slider"
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
            <label htmlFor="interval-duration" className="block label-text mb-2">
              {t('timer.beepInterval')}
            </label>
            <select
              id="interval-duration"
              value={appSettings.interval_duration}
              onChange={handleIntervalChange}
              className="w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-0 dark:bg-surface-700 text-text-900 dark:text-text-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>{t('timer.beepInterval15')}</option>
              <option value={30}>{t('timer.beepInterval30')}</option>
              <option value={45}>{t('timer.beepInterval45')}</option>
              <option value={60}>{t('timer.beepInterval60')}</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.beepIntervalHelp')}
            </p>
          </div>

          {/* Ring Timer */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <label htmlFor="ring-timer" className="label-text">
              {t('settings.ringTimer')}
            </label>
            <ToggleSwitch
              id="ring-timer"
              checked={appSettings.ring_timer !== false}
              onChange={() => onUpdateSettings({ ring_timer: !appSettings.ring_timer })}
              dataTestId="toggle-ring-timer"
            />
          </div>
          <p className="text-xs help-text mb-4">
            {t('settings.ringTimerHelp')}
          </p>
        </div>

        {/* Appearance Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('settings.appearance')}
          </h2>
          
          {/* Dark Mode */}
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="dark-mode" className="label-text">
              {t('settings.darkMode')}
            </label>
            <ToggleSwitch
              id="dark-mode"
              checked={appSettings.dark_mode}
              onChange={() => onUpdateSettings({ dark_mode: !appSettings.dark_mode })}
              dataTestId="toggle-dark-mode"
            />
          </div>
          {/* Exercise Demo Videos */}
  <div className="flex items-center justify-between mb-4" data-testid="setting-show-exercise-videos">
            <label htmlFor="exercise-videos" className="label-text">
              {t('settings.showExerciseVideos')}
            </label>
            <ToggleSwitch
              id="exercise-videos"
              checked={appSettings.show_exercise_videos === true}
              onChange={() => onUpdateSettings({ show_exercise_videos: !appSettings.show_exercise_videos })}
              dataTestId="toggle-exercise-videos"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.showExerciseVideosHelp')}
          </p>

          {/* Horizontal Exercise Layout */}
          <div className="flex items-center justify-between mt-6 mb-4" data-testid="setting-horizontal-exercise-layout">
            <label htmlFor="horizontal-exercise-layout" className="label-text">
              {t('settings.horizontalExerciseLayout')}
            </label>
            <ToggleSwitch
              id="horizontal-exercise-layout"
              checked={appSettings.horizontal_exercise_layout === true}
              onChange={() => onUpdateSettings({ horizontal_exercise_layout: !appSettings.horizontal_exercise_layout })}
              dataTestId="toggle-horizontal-exercise-layout"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.horizontalExerciseLayoutHelp')}
          </p>
        </div>

        {/* Language Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('settings.language')}
          </h2>
          
          <div className="space-y-3">
            <LanguageSwitcher compact={false} showLabel={false} />
          </div>
        </div>

        {/* Data Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
            {t('settings.data')}
          </h2>

          {/* (Auto Save & Data Storage status removed as per UX cleanup) */}
          {/* Consent Status Panel */}
          <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-700 rounded-lg" data-testid="consent-status-panel">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {t('settings.consentStatusLabel', 'Consent Status')}: <span className="font-medium">{hasConsent ? t('settings.enabled', 'Enabled') : t('settings.disabled', 'Disabled')}</span>
              </p>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded" title={t('settings.consentVersion', 'Consent version')}>
                v{consentStatus.version}
              </span>
            </div>
            {hasConsent && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.dataStoredLocally', 'Your data is stored locally and governed by your granted consent.')}
              </p>
            )}
            {!hasConsent && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {t('settings.pleaseAcceptConsent', 'Please review and accept the consent notice to enable data storage.')}
              </p>
            )}
            {!consentStatus.isLatestVersion && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {t('settings.consentMigrationWarning', 'A newer consent version is available — please review to stay up to date.')}
              </p>
            )}
          </div>

          {/* Export Data Button */}
          <div className="mb-3">
            <button
              onClick={handleExportData}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.exportData')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.exportDataHelp')}
            </p>
          </div>

          {/* Sync Now Button */}
          <div className="mb-3">
            <button
              onClick={handleSyncNow}
              disabled={!hasConsent || !isAuthenticated || isManualSyncing}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              data-testid="btn-sync-now"
            >
              {isManualSyncing ? t('settings.syncInProgress') : t('settings.syncNow')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.syncNowHelp')}
            </p>
          </div>

          {/* Advanced Sync Controls */}
          <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-700 rounded-lg" data-testid="advanced-sync-controls">
              <h3 className="text-sm font-medium text-text-700 dark:text-text-300 mb-2">
                {t('settings.syncAdvanced')}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleForceFullSync}
                  disabled={!hasConsent || !isAuthenticated || isForceFullSyncing}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  data-testid="btn-force-full-sync"
                >
                  {isForceFullSyncing ? t('settings.syncInProgress') : t('settings.forceFullSync')}
                </button>
                <button
                  onClick={handleResetSyncState}
                  disabled={!hasConsent || !isAuthenticated || isResettingSyncState}
                  className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  data-testid="btn-reset-sync-state"
                >
                  {isResettingSyncState ? t('common.loading') : t('settings.resetSyncState')}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.syncAdvancedHelp')}
              </p>
            </div>

          {/* Refresh Exercises Button */}
          <div className="mb-3">
            <button
              onClick={handleRefreshExercises}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.refreshExercises')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.refreshExercisesHelp')}
            </p>
          </div>

          {/* Force Refresh Buttons */}
          <div className="mb-3 space-y-2">
            <button
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isRefreshing ? t('common.loading') : t('settings.forceRefreshApp')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings.forceRefreshAppHelp')}
            </p>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={handleClearCaches}
                disabled={isRefreshing}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('settings.clearCachesOnly')}
              </button>
              <button
                onClick={handleUpdateServiceWorker}
                disabled={isRefreshing}
                className="py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('settings.updateServiceWorker')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <p>{t('settings.clearCachesOnlyHelp')}</p>
              <p>{t('settings.updateServiceWorkerHelp')}</p>
            </div>
          </div>

          {/* Clear Data Button */}
          <div>
            <button
              onClick={handleClearData}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.clearAllDataAndReset')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.clearAllDataHelp')}
            </p>
          </div>
        </div>

        {/* Update Preferences */}
  <UpdatePreferencesPanel />

        {/* Security & Privacy Settings */}
        {isAuthenticated && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
              {t('settings.securityPrivacy')}
            </h2>
            
            {/* Data Export */}
            <div className="mb-4">
              <h3 className="section-subtitle mb-3">
                {t('settings.exportYourData')}
              </h3>
              <DataExportButton className="w-full" />
            </div>

            {/* Account Deletion */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <h3 className="section-subtitle mb-3">
                {t('settings.deleteAccount')}
              </h3>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('settings.deleteMyAccount')}
              </button>
              <p className="text-xs help-text mt-1">
                {t('settings.deleteAccountHelp')}
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

      {/* Force Refresh Confirmation Toast */}
      <Toast
        isOpen={showForceRefreshToast}
        onClose={() => setShowForceRefreshToast(false)}
        onConfirm={confirmForceRefresh}
        type="warning"
        title={t('settings.forceRefreshApp')}
        message={t('settings.forceRefreshConfirm')}
        confirmText={t('settings.forceRefreshApp')}
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