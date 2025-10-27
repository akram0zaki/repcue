/* eslint-disable no-restricted-syntax -- i18n-exempt: UI text comes from t(); remaining literals are units/IDs/tokens */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToggleSwitch from '../components/ToggleSwitch';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../types';
import { audioService } from '../services/audioService';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import { SpeakerIcon, DocumentTextIcon } from '../components/icons/NavigationIcons';
import Toast from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ThemeSelector } from '../components/ThemeSelector';
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
  const { t } = useTranslation(['common', 'coaching', 'legal']);
  const navigate = useNavigate();
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

      // Show success message
      alert(t('settings.exportSuccess', 'Data exported successfully'));
    } catch (error) {
      logger.error('Failed to export data:', error);
      // Show error message to user
      alert(t('settings.exportError', 'Failed to export data. Please try again.'));
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

  const handleUpgradeDatabase = async () => {
    try {
      await storageService.checkAndUpgradeDatabase();
      alert(t('settings.databaseUpgradeSuccess', 'Database upgraded successfully! Please refresh the page.'));
      window.location.reload();
    } catch (error) {
      logger.error('Failed to upgrade database:', error);
      alert(t('settings.databaseUpgradeError', 'Failed to upgrade database. Please try again.'));
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

        {/* Language Settings */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <svg className="section-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {t('settings.language')}
          </h2>
          
          <div className="space-y-3">
            <LanguageSwitcher compact={false} showLabel={false} />
          </div>
        </div>

        {/* Legal Section (separate, directly below Language) */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <DocumentTextIcon size={20} className="section-icon" />
            {t('legal:title')}
          </h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/legal')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700 hover:bg-surface-100 dark:hover:bg-surface-600 transition-colors"
              data-testid="open-legal-center"
              aria-label={t('a11y.navigateTo', { label: t('legal:title'), defaultValue: 'Navigate to {{label}}' })}
            >
              <span className="flex items-center gap-2 text-text-900 dark:text-text-50">
                <DocumentTextIcon size={18} />
                {t('legal:title')}
              </span>
              <svg className="w-5 h-5 text-text-500 dark:text-text-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Audio Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <SpeakerIcon size={20} className="section-icon" />
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
          <div className="flex items-center justify-between mb-3">
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
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <svg className="section-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
              className="w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-0 dark:bg-surface-700 text-text-900 dark:text-text-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          <div className="flex items-center justify-between mt-6 mb-3">
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.ringTimerHelp')}
          </p>
        </div>

        {/* Appearance Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <svg className="section-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            {t('settings.appearance')}
          </h2>
          
          {/* Dark Mode */}
          <div className="flex items-center justify-between mb-3">
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

          {/* Theme Selector */}
          <ThemeSelector />

          {/* Exercise Demo Videos */}
          <div className="flex items-center justify-between mb-3" data-testid="setting-show-exercise-videos">
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.showExerciseVideosHelp')}
          </p>

          {/* Horizontal Exercise Layout */}
          <div className="flex items-center justify-between mt-6 mb-3" data-testid="setting-horizontal-exercise-layout">
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.horizontalExerciseLayoutHelp')}
          </p>
        </div>

        {/* AI Coach Settings */}
        <section 
          className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6"
          aria-labelledby="coach-settings-heading"
        >
          <h2 
            id="coach-settings-heading"
            className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2"
          >
            <svg 
              className="section-icon" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {t('coaching:settings.title', 'AI Coach')}
          </h2>
          
          {/* Master Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <label htmlFor="coach-enabled" className="label-text">
                {t('coaching:settings.enabled', 'Enable AI Coach')}
              </label>
              <p 
                id="coach-enabled-help"
                className="text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                {t('coaching:settings.enabledHelp', 'Get personalized insights and recommendations based on your workout history')}
              </p>
            </div>
            <ToggleSwitch
              id="coach-enabled"
              checked={appSettings.coach_enabled === true}
              onChange={() => onUpdateSettings({ coach_enabled: !appSettings.coach_enabled })}
              dataTestId="toggle-coach-enabled"
              aria-describedby="coach-enabled-help"
            />
          </div>

          {/* Show on Home Page */}
          {appSettings.coach_enabled && (
            <>
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex-1">
                  <label htmlFor="coach-show-on-home" className="label-text">
                    {t('coaching:settings.showOnHome', 'Show on Home Page')}
                  </label>
                  <p 
                    id="coach-show-on-home-help"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {t('coaching:settings.showOnHomeHelp', 'Display top insight on your home page')}
                  </p>
                </div>
                <ToggleSwitch
                  id="coach-show-on-home"
                  checked={appSettings.coach_show_on_home === true}
                  onChange={() => onUpdateSettings({ coach_show_on_home: !appSettings.coach_show_on_home })}
                  dataTestId="toggle-coach-show-on-home"
                  aria-describedby="coach-show-on-home-help"
                />
              </div>

              {/* Auto-Refresh */}
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex-1">
                  <label htmlFor="coach-auto-refresh" className="label-text">
                    {t('coaching:settings.autoRefresh', 'Auto-Refresh Insights')}
                  </label>
                  <p 
                    id="coach-auto-refresh-help"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {t('coaching:settings.autoRefreshHelp', 'Automatically refresh insights every 5 minutes')}
                  </p>
                </div>
                <ToggleSwitch
                  id="coach-auto-refresh"
                  checked={appSettings.coach_auto_refresh === true}
                  onChange={() => onUpdateSettings({ coach_auto_refresh: !appSettings.coach_auto_refresh })}
                  dataTestId="toggle-coach-auto-refresh"
                  aria-describedby="coach-auto-refresh-help"
                />
              </div>

              {/* AI-Powered Insights */}
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex-1">
                  <label htmlFor="coach-ai-insights-enabled" className="label-text">
                    {t('coaching:settings.aiInsightsEnabled', 'Enable AI-Powered Insights')}
                  </label>
                  <p 
                    id="coach-ai-insights-help"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {isAuthenticated 
                      ? t('coaching:settings.aiInsightsHelp', 'Get advanced AI analysis of your progress, trends, and personalized recommendations. Your data is processed securely and used only to generate insights.')
                      : t('coaching:settings.aiInsightsAuthRequired', 'Sign in to enable AI-powered insights.')
                    }
                  </p>
                  {isAuthenticated && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('coaching:settings.aiInsightsDataUsage', 'Limited to 10 AI requests per hour. Cached for 24 hours.')}
                    </p>
                  )}
                </div>
                <ToggleSwitch
                  id="coach-ai-insights-enabled"
                  checked={appSettings.coach_ai_insights_enabled === true}
                  onChange={() => onUpdateSettings({ coach_ai_insights_enabled: !appSettings.coach_ai_insights_enabled })}
                  dataTestId="toggle-coach-ai-insights-enabled"
                  aria-describedby="coach-ai-insights-help"
                  disabled={!isAuthenticated}
                />
              </div>

              {/* Celebration Sounds */}
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex-1">
                  <label htmlFor="celebration-sounds-enabled" className="label-text">
                    {t('coaching:settings.celebrationSounds', 'Celebration Sounds')}
                  </label>
                  <p
                    id="celebration-sounds-help"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {t('coaching:settings.celebrationSoundsHelp', 'Play celebration sounds for personal records and milestones')}
                  </p>
                </div>
                <ToggleSwitch
                  id="celebration-sounds-enabled"
                  checked={appSettings.celebration_sounds_enabled === true}
                  onChange={() => onUpdateSettings({ celebration_sounds_enabled: !appSettings.celebration_sounds_enabled })}
                  dataTestId="toggle-celebration-sounds-enabled"
                  aria-describedby="celebration-sounds-help"
                />
              </div>

              {/* Coach Persona Selection */}
              <div className="mt-6">
                <label htmlFor="coach-persona" className="label-text">
                  {t('coaching:persona.title', 'Coach Personality')}
                </label>
                <p 
                  id="coach-persona-help"
                  className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3"
                >
                  {t('coaching:persona.description', 'Choose how your coach communicates with you')}
                </p>
                <select
                  id="coach-persona"
                  value={appSettings.coach_persona || 'zen'}
                  onChange={(e) => onUpdateSettings({ coach_persona: e.target.value as 'zen' | 'energy' | 'logic' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  data-testid="select-coach-persona"
                  aria-describedby="coach-persona-help coach-persona-description"
                >
                  <option value="zen">
                    {t('coaching:persona.zen.name', 'Zen Coach')}
                  </option>
                  <option value="energy">
                    {t('coaching:persona.energy.name', 'Energy Coach')}
                  </option>
                  <option value="logic">
                    {t('coaching:persona.logic.name', 'Logic Coach')}
                  </option>
                </select>
                <p 
                  id="coach-persona-description"
                  className="text-xs text-gray-600 dark:text-gray-400 mt-2"
                >
                  {appSettings.coach_persona === 'energy' && (
                    <span>🔥 {t('coaching:persona.energy.description', 'Enthusiastic, motivational, high-energy')}</span>
                  )}
                  {appSettings.coach_persona === 'logic' && (
                    <span>📊 {t('coaching:persona.logic.description', 'Data-driven, analytical, precise')}</span>
                  )}
                  {(!appSettings.coach_persona || appSettings.coach_persona === 'zen') && (
                    <span>🧘 {t('coaching:persona.zen.description', 'Calm, mindful, holistic approach')}</span>
                  )}
                </p>
              </div>

              {/* Post-Workout Survey */}
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex-1">
                  <label htmlFor="coach-post-workout-survey-enabled" className="label-text">
                    {t('coaching:settings.postWorkoutSurvey', 'Post-Workout Survey')}
                  </label>
                  <p
                    id="coach-post-workout-survey-help"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {t('coaching:settings.postWorkoutSurveyHelp', 'Quick feedback after workouts helps personalize your coaching insights')}
                  </p>
                </div>
                <ToggleSwitch
                  id="coach-post-workout-survey-enabled"
                  checked={appSettings.coach_post_workout_survey_enabled === true}
                  onChange={() => onUpdateSettings({ coach_post_workout_survey_enabled: !appSettings.coach_post_workout_survey_enabled })}
                  dataTestId="toggle-coach-post-workout-survey-enabled"
                  aria-describedby="coach-post-workout-survey-help"
                />
              </div>

              {/* Insight Type Filters */}
              <fieldset className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <legend className="text-sm font-medium text-text-700 dark:text-text-300 mb-3">
                  {t('coaching:settings.insightTypes', 'Insight Types')}
                </legend>

                {/* Streak Insights */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="coach-show-streak" className="label-text text-sm">
                    {t('coaching:settings.showStreak', 'Workout Streaks')}
                  </label>
                  <ToggleSwitch
                    id="coach-show-streak"
                    checked={appSettings.coach_show_streak === true}
                    onChange={() => onUpdateSettings({ coach_show_streak: !appSettings.coach_show_streak })}
                    dataTestId="toggle-coach-show-streak"
                  />
                </div>

                {/* Muscle Balance Insights */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="coach-show-muscle-balance" className="label-text text-sm">
                    {t('coaching:settings.showMuscleBalance', 'Muscle Balance')}
                  </label>
                  <ToggleSwitch
                    id="coach-show-muscle-balance"
                    checked={appSettings.coach_show_muscle_balance === true}
                    onChange={() => onUpdateSettings({ coach_show_muscle_balance: !appSettings.coach_show_muscle_balance })}
                    dataTestId="toggle-coach-show-muscle-balance"
                  />
                </div>

                {/* Progression Insights */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="coach-show-progression" className="label-text text-sm">
                    {t('coaching:settings.showProgression', 'Progressive Overload')}
                  </label>
                  <ToggleSwitch
                    id="coach-show-progression"
                    checked={appSettings.coach_show_progression === true}
                    onChange={() => onUpdateSettings({ coach_show_progression: !appSettings.coach_show_progression })}
                    dataTestId="toggle-coach-show-progression"
                  />
                </div>

                {/* Recovery Insights */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="coach-show-recovery" className="label-text text-sm">
                    {t('coaching:settings.showRecovery', 'Recovery Time')}
                  </label>
                  <ToggleSwitch
                    id="coach-show-recovery"
                    checked={appSettings.coach_show_recovery === true}
                    onChange={() => onUpdateSettings({ coach_show_recovery: !appSettings.coach_show_recovery })}
                    dataTestId="toggle-coach-show-recovery"
                  />
                </div>

                {/* Suggestion Insights */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="coach-show-suggestions" className="label-text text-sm">
                    {t('coaching:settings.showSuggestions', 'Workout Suggestions')}
                  </label>
                  <ToggleSwitch
                    id="coach-show-suggestions"
                    checked={appSettings.coach_show_suggestions === true}
                    onChange={() => onUpdateSettings({ coach_show_suggestions: !appSettings.coach_show_suggestions })}
                    dataTestId="toggle-coach-show-suggestions"
                  />
                </div>
              </fieldset>
            </>
          )}
        </section>

        {/* Data Settings */}
  <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
            <svg className="section-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            {t('settings.data')}
          </h2>

          {/* (Auto Save & Data Storage status removed as per UX cleanup) */}
          {/* Consent Status Panel */}
          <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-700 rounded-lg" data-testid="consent-status-panel">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {t('settings.consentStatusLabel', 'Consent Status')}: <span className="font-medium">{hasConsent ? t('settings.enabled', 'Enabled') : t('settings.disabled', 'Disabled')}</span>
              </p>
              <span className="text-xs bg-primary-100 dark:bg-primary-200 text-primary-800 dark:text-primary-900 px-2 py-1 rounded" title={t('settings.consentVersion', 'Consent version')}>
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
              className="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
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
              className="w-full btn-primary"
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
                  className="w-full btn-primary text-sm"
                  data-testid="btn-force-full-sync"
                >
                  {isForceFullSyncing ? t('settings.syncInProgress') : t('settings.forceFullSync')}
                </button>
                <button
                  onClick={handleResetSyncState}
                  disabled={!hasConsent || !isAuthenticated || isResettingSyncState}
                  className="w-full btn-danger text-sm"
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

          {/* Upgrade Database Button */}
          <div className="mb-3">
            <button
              onClick={handleUpgradeDatabase}
              disabled={!hasConsent}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-surface-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('settings.upgradeDatabase', 'Upgrade Database')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.upgradeDatabaseHelp', 'Updates your local database to the latest version with new features like personal records tracking.')}
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
                className="btn-primary text-sm"
              >
                {t('settings.clearCachesOnly')}
              </button>
              <button
                onClick={handleUpdateServiceWorker}
                disabled={isRefreshing}
                className="btn-neutral text-sm"
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
              className="w-full btn-danger"
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
            <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3 flex items-center gap-2">
              <svg className="section-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
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
              <p className="help-text mt-1">
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