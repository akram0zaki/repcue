import type {
  UpdateInfo,
  UpdatePreferences,
  UpdateState,
  UpdateMode,
  UpdatePolicy,
  VersionCheckRequest,
  VersionCheckResponse,
  TimerState,
  UpdateError,
  UpdateRecoveryState,
  RecoveryAction
} from '../types';
import { UpdateErrorType } from '../types';
import { consentService } from './consentService';
import { storageService } from './storageService';
import { APP_VERSION } from '../constants';
import { swEventEmitter, updateServiceWorkerCoordinated } from '../utils/serviceWorker';
import { updateErrorHandler } from '../utils/updateErrorHandler';
import logger from '../utils/logger';

const UPDATE_PREFERENCES_KEY = 'repcue_update_preferences';
const UPDATE_STATE_KEY = 'repcue_update_state';
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const FORCE_UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes for force updates

/**
 * PWA Update management service
 * Handles version checking, update policies, and user preferences
 * Integrates with existing consent and privacy systems
 */
export class UpdateService {
  private static instance: UpdateService;
  private updateState: UpdateState;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval: number | null = null;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private timerStateRef: TimerState | null = null;
  private recoveryState: UpdateRecoveryState;
  private emergencyCallbacks: Set<(error: { originalError?: Error; rollbackError?: Error; recoveryActions?: RecoveryAction[] }) => void> = new Set();
  private updateMetrics = {
    totalChecks: 0,
    lastCheckDuration: 0,
    failedChecks: 0,
    successfulUpdates: 0,
    failedUpdates: 0
  };

  private constructor() {
    this.updateState = this.getDefaultUpdateState();
    this.recoveryState = updateErrorHandler.getRecoveryState();
    this.initializeServiceWorker();
    this.setupEventListeners();
    this.loadUpdateStateAsync();
    this.startPeriodicChecks();
    this.setupCriticalErrorHandling();
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  /**
   * Get default update state (synchronous for constructor)
   */
  private getDefaultUpdateState(): UpdateState {
    return {
      currentVersion: APP_VERSION, // Will be updated asynchronously
      updateAvailable: false,
      isUpdating: false,
      userPreferences: {
        updateMode: 'notify' as UpdateMode,
        allowMeteredUpdates: false,
        showChangelog: true
      }
    };
  }

  /**
   * Load update state asynchronously during initialization
   */
  private async loadUpdateStateAsync(): Promise<void> {
    try {
      // Load current app version from IndexedDB
      const currentVersion = await storageService.getCurrentAppVersion();

      // Load saved state from localStorage
      const savedStateJson = localStorage.getItem(UPDATE_STATE_KEY);
      if (savedStateJson) {
        try {
          const savedState = JSON.parse(savedStateJson);
          this.updateState = {
            ...this.updateState,
            ...savedState,
            currentVersion, // Override with version from IndexedDB
            lastCheckTime: savedState.lastCheckTime ? new Date(savedState.lastCheckTime) : undefined
          };
        } catch (parseError) {
          logger.warn('Failed to parse saved update state, using defaults:', parseError);
        }
      } else {
        // No saved state, just update the version
        this.updateState = {
          ...this.updateState,
          currentVersion
        };
      }

      // Load preferences from AppSettings
      const preferences = await this.loadUpdatePreferences();
      this.updateState = {
        ...this.updateState,
        userPreferences: preferences
      };
      this.emit('preferences-loaded', preferences);
    } catch (error) {
      logger.error('Failed to load update state:', error);
    }
  }



  /**
   * Load update preferences from AppSettings via storageService
   */
  private async loadUpdatePreferences(): Promise<UpdatePreferences> {
    try {
      // Load from AppSettings via storageService (respects consent)
      const appSettings = await storageService.getAppSettings();

      if (appSettings) {
        return {
          updateMode: appSettings.update_mode || 'notify',
          allowMeteredUpdates: !(appSettings.allow_auto_updates ?? true), // Invert for metered logic
          showChangelog: true // Default to showing changelog
        };
      }
    } catch (error) {
      logger.error('Failed to load update preferences from storage:', error);
    }

    // Default preferences - privacy-first
    return {
      updateMode: 'notify' as UpdateMode,
      allowMeteredUpdates: false,
      showChangelog: true
    };
  }

  /**
   * Save update state respecting user consent
   */
  private saveUpdateState(): void {
    try {
      const stateToSave = {
        ...this.updateState,
        lastCheckTime: this.updateState.lastCheckTime?.toISOString()
      };

      if (consentService.hasConsent()) {
        // Save to localStorage if user has consented to data storage
        localStorage.setItem(UPDATE_STATE_KEY, JSON.stringify(stateToSave));
      } else {
        // Use session storage for temporary state without consent
        sessionStorage.setItem(UPDATE_STATE_KEY, JSON.stringify(stateToSave));
      }
    } catch (error) {
      logger.error('Failed to save update state:', error);
    }
  }


  /**
   * Migrate preferences from session to persistent storage when user consents
   */
  public migratePreferencesOnConsent(): void {
    try {
      const sessionPrefs = sessionStorage.getItem(UPDATE_PREFERENCES_KEY);
      const sessionState = sessionStorage.getItem(UPDATE_STATE_KEY);

      if (sessionPrefs && consentService.hasConsent()) {
        localStorage.setItem(UPDATE_PREFERENCES_KEY, sessionPrefs);
        sessionStorage.removeItem(UPDATE_PREFERENCES_KEY);
        logger.log('Migrated update preferences to persistent storage');
      }

      if (sessionState && consentService.hasConsent()) {
        localStorage.setItem(UPDATE_STATE_KEY, sessionState);
        sessionStorage.removeItem(UPDATE_STATE_KEY);
        logger.log('Migrated update state to persistent storage');
      }
    } catch (error) {
      logger.error('Failed to migrate update preferences on consent:', error);
    }
  }

  /**
   * Clear all stored preferences and state (for data erasure)
   */
  public clearAllStoredData(): void {
    try {
      localStorage.removeItem(UPDATE_PREFERENCES_KEY);
      localStorage.removeItem(UPDATE_STATE_KEY);
      sessionStorage.removeItem(UPDATE_PREFERENCES_KEY);
      sessionStorage.removeItem(UPDATE_STATE_KEY);

      // Reset to defaults
      this.updateState = {
        currentVersion: APP_VERSION, // Fallback to constant, will be updated by next loadUpdateStateAsync
        updateAvailable: false,
        isUpdating: false,
        userPreferences: {
          updateMode: 'notify' as UpdateMode,
          allowMeteredUpdates: false,
          showChangelog: true
        }
      };

      logger.log('Cleared all update service stored data');
    } catch (error) {
      logger.error('Failed to clear update service data:', error);
    }
  }

  /**
   * Initialize service worker for PWA updates with enhanced coordination
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;

      // Set up enhanced service worker event listeners
      this.setupServiceWorkerEventListeners();

      logger.log('✅ Service worker integration initialized');

    } catch (error) {
      logger.error('Failed to initialize service worker:', error);
    }
  }

  /**
   * Set up enhanced service worker event listeners
   */
  private setupServiceWorkerEventListeners(): void {
    // Listen for service worker update events
    swEventEmitter.on('update-available', () => {
      logger.log('📦 Service worker update available');
      this.handleServiceWorkerUpdate();
    });

    swEventEmitter.on('update-activated', () => {
      logger.log('✅ Service worker update activated');
      this.handleServiceWorkerControllerChange();
    });

    swEventEmitter.on('controller-changed', () => {
      logger.log('🔄 Service worker controller changed');
      this.handleServiceWorkerControllerChange();
    });

    swEventEmitter.on('trigger-version-check', () => {
      logger.log('🔍 Service worker triggered version check');
      this.checkForUpdates();
    });

    swEventEmitter.on('sw-updated', (data: unknown) => {
      logger.log('✅ Service worker updated successfully');
      this.emit('service-worker-updated', data);
    });

    swEventEmitter.on('sw-activated', (data: unknown) => {
      logger.log('🎯 Service worker activated and controlling all tabs');
      this.emit('service-worker-activated', data);
    });

    // Listen for background sync triggers
    swEventEmitter.on('update-notification', (data: unknown) => {
      logger.log('📬 Received update notification from service worker');
      const notificationData = data as { data?: { updateInfo?: unknown } };
      if (notificationData.data?.updateInfo) {
        this.handleExternalUpdateNotification(notificationData.data.updateInfo as UpdateInfo);
      }
    });
  }

  /**
   * Setup event listeners for window events
   */
  private setupEventListeners(): void {
    // Check for updates when app becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });

    // Check for updates on focus
    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    this.stopPeriodicChecks();

    const interval = this.updateState.updatePolicy === 'force'
      ? FORCE_UPDATE_CHECK_INTERVAL
      : UPDATE_CHECK_INTERVAL;

    this.updateCheckInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, interval);
  }

  /**
   * Stop periodic update checks
   */
  private stopPeriodicChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Check for updates from the edge function with comprehensive error handling and retry logic
   */
  public async checkForUpdates(): Promise<UpdateInfo | null> {
    this.updateMetrics.totalChecks++;

    const operation = async (): Promise<UpdateInfo | null> => {
      const startTime = Date.now();
      logger.log('Checking for updates...');

      // Don't check too frequently unless it's a force update
      const now = new Date();
      const lastCheck = this.updateState.lastCheckTime;
      const minInterval = this.updateState.updatePolicy === 'force' ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5 min for force, 30 min for others

      if (lastCheck && (now.getTime() - lastCheck.getTime()) < minInterval) {
        logger.log('Skipping update check - too recent');
        return this.updateState.pendingUpdate || null;
      }

      this.updateState.lastCheckTime = now;
      this.updateState.error = undefined;
      this.saveUpdateState();

      const updateInfo = await this.callVersionCheckAPI();

      if (updateInfo) {
        this.updateState.updateAvailable = true;
        this.updateState.latestVersion = updateInfo.version;
        this.updateState.updatePolicy = updateInfo.policy;
        this.updateState.pendingUpdate = updateInfo;

        // Restart periodic checks with appropriate interval for new policy
        this.startPeriodicChecks();

        this.emit('update-available', updateInfo);
        logger.log(`Update available: ${updateInfo.version} (${updateInfo.policy})`);
      } else {
        this.updateState.updateAvailable = false;
        this.updateState.pendingUpdate = undefined;
        this.emit('no-update-available');
        logger.log('No updates available');
      }

      this.saveUpdateState();

      // Update success metrics
      this.updateMetrics.lastCheckDuration = Date.now() - startTime;

      return updateInfo;
    };

    try {
      return await updateErrorHandler.retryWithBackoff(operation,
        updateErrorHandler.createUpdateError('Initial update check', { type: 'network_error' })
      );
    } catch (error) {
      logger.error('Update check failed after retries:', error);

      const updateError = updateErrorHandler.createUpdateError(error, {
        type: 'network_error',
        metadata: {
          operation: 'checkForUpdates',
          fallbackAvailable: true
        }
      });

      this.handleUpdateError(updateError);

      // Fall back to service worker update detection
      try {
        return await this.checkServiceWorkerUpdate();
      } catch (fallbackError) {
        const fallbackUpdateError = updateErrorHandler.createUpdateError(fallbackError, {
          type: 'service_worker_error',
          metadata: {
            operation: 'fallback-check',
            originalError: updateError
          }
        });

        this.handleUpdateError(fallbackUpdateError);
        return null;
      }
    }
  }

  /**
   * Call the version check API endpoint
   */
  private async callVersionCheckAPI(): Promise<UpdateInfo | null> {
    const hasConsent = consentService.hasConsent();

    const requestBody: VersionCheckRequest = {
      current_version: this.updateState.currentVersion,
      user_consent: hasConsent,
      platform: this.getPlatformInfo()
    };

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: VersionCheckResponse = await response.json();

    if (!data.update_available) {
      return null;
    }

    return {
      version: data.latest_version!,
      policy: data.update_policy!,
      changelog: data.changelog,
      releaseDate: new Date().toISOString(), // API doesn't return this yet
      forceUpdate: data.force_update,
      message: data.message
    };
  }

  /**
   * Fall back to service worker update detection
   */
  private async checkServiceWorkerUpdate(): Promise<UpdateInfo | null> {
    const startTime = Date.now();
    
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      await this.serviceWorkerRegistration.update();

      if (this.serviceWorkerRegistration.waiting) {
        // There's an update waiting
        return {
          version: 'unknown',
          policy: 'optional' as UpdatePolicy,
          releaseDate: new Date().toISOString(),
          message: 'A new version is available and ready to install.'
        };
      }
    } catch (error) {
      logger.error('Service worker update check failed:', error);
    }

    // Update metrics
    this.updateMetrics.lastCheckDuration = Date.now() - startTime;
    this.updateMetrics.failedChecks++;

    return null;
  }

  /**
   * Apply the pending update with policy-aware logic and enhanced coordination
   */
  public async applyUpdate(forceOverride: boolean = false): Promise<void> {
    if (!this.updateState.pendingUpdate) {
      throw new Error('No pending update to apply');
    }

    const updateInfo = this.updateState.pendingUpdate;

    // Check workout-aware update handling
    const workoutDefer = this.shouldDeferUpdateForWorkout(updateInfo);
    if (!forceOverride && workoutDefer.shouldDefer) {
      const workoutInfo = this.getWorkoutInfo();

      if (updateInfo.policy === 'force' && workoutInfo.isRunning) {
        // For force updates during active workouts, emit special event for blocking UI
        const message = `Security update required, but ${workoutInfo.isWorkoutMode ? 'workout' : 'timer'} is active. Please complete or stop your current session.`;
        logger.warn(message);
        this.emit('update-blocked-workout-force', {
          updateInfo,
          workoutInfo,
          message,
          reason: workoutDefer.reason
        });
        throw new Error(message);
      } else if (workoutInfo.isActive) {
        // For other updates during active sessions, defer until completion
        const activityType = workoutInfo.isWorkoutMode ? 'workout' : 'timer session';
        const message = `Update deferred - ${activityType} is active. Update will be applied when session completes.`;
        logger.log(message);
        this.emit('update-deferred-workout', {
          updateInfo,
          workoutInfo,
          message,
          reason: workoutDefer.reason
        });
        throw new Error(message);
      }
    }

    // Check if update should be applied based on policy and preferences
    if (!forceOverride && !this.shouldApplyUpdateAutomatically(updateInfo)) {
      // Check for metered connection warnings
      if (this.shouldRespectMeteredConnection(updateInfo) && this.isOnMeteredConnection()) {
        const message = 'Update blocked due to metered connection. Enable "Allow updates on metered connections" in settings to proceed.';
        logger.warn(message);
        this.emit('update-blocked-metered', { updateInfo, message });
        throw new Error(message);
      }

      // For non-automatic updates, require explicit user confirmation
      if (updateInfo.policy !== 'force') {
        const message = 'Update requires user confirmation based on current preferences.';
        logger.log(message);
        this.emit('update-requires-confirmation', updateInfo);
        throw new Error(message);
      }
    }

    // Check metered connection for force updates (warn but don't block)
    if (updateInfo.policy === 'force' && this.isOnMeteredConnection()) {
      logger.warn('Applying force update on metered connection');
      this.emit('update-on-metered-connection', {
        updateInfo,
        message: 'This security update will proceed on your metered connection.'
      });
    }

    try {
      this.updateState.isUpdating = true;
      this.updateState.updateProgress = 0;
      this.saveUpdateState();

      // Enable rollback capability by storing current version
      updateErrorHandler.enableRollback(this.updateState.currentVersion);

      logger.log(`🚀 Starting ${updateInfo.policy} update: ${updateInfo.version}`);
      this.emit('update-started', updateInfo);

      // Coordinate update across all tabs
      this.broadcastToOtherTabs({
        type: 'update-starting',
        policy: updateInfo.policy,
        version: updateInfo.version
      });

      // For PWA updates, use enhanced service worker coordination
      if (this.serviceWorkerRegistration?.waiting) {
        this.updateState.updateProgress = 25;
        this.emit('update-progress', 25);

        logger.log('🚀 Starting coordinated service worker update...');

        // Use the enhanced update function
        await updateServiceWorkerCoordinated(this.serviceWorkerRegistration);

        this.updateState.updateProgress = 75;
        this.emit('update-progress', 75);
      }

      this.updateState.updateProgress = 100;
      this.emit('update-progress', 100);

      // Clear the pending update
      this.updateState.pendingUpdate = undefined;
      this.updateState.updateAvailable = false;
      this.updateState.isUpdating = false;
      this.updateState.currentVersion = updateInfo.version;

      // Persist the new version to IndexedDB for future version checks
      try {
        await storageService.updateAppVersion(updateInfo.version);
        logger.log(`✅ App version updated in IndexedDB: ${updateInfo.version}`);
      } catch (error) {
        logger.warn('Failed to persist app version to IndexedDB:', error);
        // Non-critical error, continue with update completion
      }

      this.saveUpdateState();

      logger.log(`✅ Update completed successfully: ${updateInfo.version}`);
      this.emit('update-completed', updateInfo);

      // Broadcast completion to other tabs before reload
      this.broadcastToOtherTabs({
        type: 'update-completed',
        version: updateInfo.version
      });

      // Slight delay to ensure broadcast is sent
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      logger.error('Failed to apply update:', error);
      this.updateState.isUpdating = false;

      const updateError = updateErrorHandler.createUpdateError(error, {
        type: this.categorizeUpdateError(error),
        metadata: {
          operation: 'applyUpdate',
          updateVersion: updateInfo.version,
          updatePolicy: updateInfo.policy,
          forceOverride
        }
      });

      this.handleUpdateError(updateError);

      this.emit('update-failed', updateError);
      this.broadcastToOtherTabs({
        type: 'update-failed',
        error: updateError.message,
        updateInfo,
        errorType: updateError.type,
        recoveryActions: updateErrorHandler.createRecoveryActions(updateError)
      });

      // For critical errors, attempt automatic recovery
      if (updateError.severity === 'critical') {
        try {
          await this.handleCriticalUpdateError(updateError);
        } catch (recoveryError) {
          logger.error('Update recovery failed:', recoveryError);
          updateErrorHandler.handleCriticalError(updateError);
        }
      }

      throw updateError;
    }
  }

  /**
   * Apply update with user confirmation (bypasses automatic policy checks)
   */
  public async applyUpdateWithConfirmation(): Promise<void> {
    if (!this.updateState.pendingUpdate) {
      throw new Error('No pending update to apply');
    }

    // Still check metered connection but allow override
    if (this.shouldRespectMeteredConnection(this.updateState.pendingUpdate) && this.isOnMeteredConnection()) {
      logger.warn('User confirmed update on metered connection');
      this.emit('update-confirmed-on-metered', this.updateState.pendingUpdate);
    }

    return this.applyUpdate(true); // Force override user preferences
  }

  /**
   * Dismiss the current update notification
   */
  public async dismissUpdate(): Promise<void> {
    if (!this.updateState.pendingUpdate) {
      return;
    }

    const update = this.updateState.pendingUpdate;

    // Only allow dismissing non-force updates
    if (update.policy === 'force') {
      logger.warn('Cannot dismiss force update');
      return;
    }

    this.updateState.userPreferences.lastDismissedVersion = update.version;
    this.updateState.userPreferences.lastDismissedAt = new Date().toISOString();

    this.updateState.pendingUpdate = undefined;
    this.updateState.updateAvailable = false;

    this.saveUpdateState();
    await this.saveUpdatePreferences();

    this.emit('update-dismissed', update);
    logger.log(`Update ${update.version} dismissed`);
  }

  /**
   * Get current update state
   */
  public getUpdateState(): UpdateState {
    return { ...this.updateState };
  }

  /**
   * Get user preferences
   */
  public getUserPreferences(): UpdatePreferences {
    return { ...this.updateState.userPreferences };
  }

  /**
   * Get update service health and monitoring info
   * Integrates with existing app health monitoring
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    lastCheckTime?: Date;
    serviceWorkerStatus: 'active' | 'inactive' | 'installing' | 'waiting' | 'unknown';
    updateAvailable: boolean;
    hasErrors: boolean;
    errorCount: number;
    preferences: UpdatePreferences;
    canRollback: boolean;
    stats: {
      totalChecks: number;
      lastCheckDuration?: number;
      failedChecks: number;
      successfulUpdates: number;
      failedUpdates: number;
    };
  } {
    const isHealthy = !this.updateState.error &&
                     (!this.updateState.lastCheckTime ||
                      (new Date().getTime() - this.updateState.lastCheckTime.getTime()) < 24 * 60 * 60 * 1000); // 24 hours

    return {
      isHealthy,
      lastCheckTime: this.updateState.lastCheckTime,
      serviceWorkerStatus: this.getServiceWorkerStatus(),
      updateAvailable: this.updateState.updateAvailable,
      hasErrors: !!this.updateState.error,
      errorCount: this.recoveryState.retryAttempts,
      preferences: { ...this.updateState.userPreferences },
      canRollback: this.recoveryState.canRollback,
      stats: {
        totalChecks: this.updateMetrics.totalChecks,
        lastCheckDuration: this.updateMetrics.lastCheckDuration,
        failedChecks: this.updateMetrics.failedChecks,
        successfulUpdates: this.updateMetrics.successfulUpdates,
        failedUpdates: this.updateMetrics.failedUpdates
      }
    };
  }

  /**
   * Get current service worker status
   */
  private getServiceWorkerStatus(): 'active' | 'inactive' | 'installing' | 'waiting' | 'unknown' {
    if (!navigator.serviceWorker) {
      return 'inactive';
    }

    const registration = navigator.serviceWorker.controller;
    if (!registration) {
      return 'inactive';
    }

    if (registration.state) {
      switch (registration.state) {
        case 'activated':
          return 'active';
        case 'installing':
          return 'installing';
        case 'installed':
          return 'waiting';
        default:
          return 'unknown';
      }
    }

    return 'active'; // Assume active if we have a controller
  }

  /**
   * Save update preferences to AppSettings via storageService
   */
  private async saveUpdatePreferences(): Promise<void> {
    try {
      const currentSettings = await storageService.getAppSettings();
      if (currentSettings) {
        const updatedSettings = {
          ...currentSettings,
          update_mode: this.updateState.userPreferences.updateMode,
          allow_auto_updates: !this.updateState.userPreferences.allowMeteredUpdates, // Invert for metered logic
          // Note: show_changelog is not part of AppSettings, handled separately
        };
        await storageService.saveAppSettings(updatedSettings);
        logger.log('Update preferences saved to storage');
      } else {
        logger.warn('No current settings found, skipping update preferences save');
      }
    } catch (error) {
      logger.error('Failed to save update preferences:', error);
    }
  }

  /**
   * Set user preferences
   */
  public async setUserPreferences(preferences: Partial<UpdatePreferences>): Promise<void> {
    this.updateState.userPreferences = {
      ...this.updateState.userPreferences,
      ...preferences
    };

    await this.saveUpdatePreferences();
    this.saveUpdateState();

    this.emit('preferences-changed', this.updateState.userPreferences);
    logger.log('Update preferences updated:', preferences);
  }

  /**
   * Check if should show update notification based on user preferences and policy
   */
  public shouldShowUpdateNotification(updateInfo: UpdateInfo): boolean {
    const prefs = this.updateState.userPreferences;

    // Always show force updates regardless of user preferences
    if (updateInfo.policy === 'force') {
      return true;
    }

    // For critical updates, show if not in manual mode and not recently dismissed
    if (updateInfo.policy === 'critical') {
      // Critical updates bypass automatic mode checks but respect dismissal
      if (prefs.lastDismissedVersion === updateInfo.version && prefs.lastDismissedAt) {
        const dismissedAt = new Date(prefs.lastDismissedAt);
        const now = new Date();
        const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);

        // Critical updates can only be dismissed for 12 hours (instead of 24)
        if (hoursSinceDismissal < 12) {
          return false;
        }
      }

      // Show critical updates unless user explicitly set to manual mode
      return prefs.updateMode !== 'manual';
    }

    // For optional updates, follow user preferences strictly
    if (updateInfo.policy === 'optional') {
      // Don't show if user dismissed this version recently (within 24 hours)
      if (prefs.lastDismissedVersion === updateInfo.version && prefs.lastDismissedAt) {
        const dismissedAt = new Date(prefs.lastDismissedAt);
        const now = new Date();
        const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceDismissal < 24) {
          return false;
        }
      }

      // Only show if user enabled automatic updates or notifications
      return prefs.updateMode === 'automatic' || prefs.updateMode === 'notify';
    }

    // Default to not showing unknown policy types
    return false;
  }

  /**
   * Check if update should be applied automatically based on policy and user preferences
   */
  public shouldApplyUpdateAutomatically(updateInfo: UpdateInfo): boolean {
    const prefs = this.updateState.userPreferences;

    // Force updates are always applied automatically (after user acknowledgment)
    if (updateInfo.policy === 'force') {
      return true;
    }

    // Critical updates are applied automatically if user has automatic mode enabled
    if (updateInfo.policy === 'critical') {
      return prefs.updateMode === 'automatic';
    }

    // Optional updates only applied automatically if user explicitly enabled it
    if (updateInfo.policy === 'optional') {
      return prefs.updateMode === 'automatic';
    }

    return false;
  }

  /**
   * Check if user can dismiss this update based on policy
   */
  public canDismissUpdate(updateInfo: UpdateInfo): boolean {
    // Force updates cannot be dismissed - user must update
    if (updateInfo.policy === 'force') {
      return false;
    }

    // Critical and optional updates can be dismissed
    return updateInfo.policy === 'critical' || updateInfo.policy === 'optional';
  }

  /**
   * Get appropriate message for update policy
   */
  public getUpdatePolicyMessage(updateInfo: UpdateInfo): string {
    switch (updateInfo.policy) {
      case 'force':
        return 'This is a required security update. The app will update automatically to ensure your safety.';
      case 'critical':
        return 'This is an important update with security fixes and critical improvements.';
      case 'optional':
        return 'A new version is available with improvements and new features.';
      default:
        return 'A new version is available.';
    }
  }

  /**
   * Check if update should respect metered connection settings
   */
  public shouldRespectMeteredConnection(updateInfo: UpdateInfo): boolean {
    const prefs = this.updateState.userPreferences;

    // Force updates ignore metered connection settings for security
    if (updateInfo.policy === 'force') {
      return false;
    }

    // Critical and optional updates respect user's metered connection preference
    return !prefs.allowMeteredUpdates;
  }

  /**
   * Check if on metered connection with detailed detection
   */
  public isOnMeteredConnection(): boolean {
    if ('connection' in navigator) {
      const connection = (navigator as { connection?: { type?: string; saveData?: boolean; effectiveType?: string } }).connection;

      // Check if user has enabled data saver mode
      if (connection?.saveData === true) {
        logger.log('🌐 Metered connection detected: Data saver enabled');
        return true;
      }

      // Check for slow connections that are typically metered
      const slowConnections = ['slow-2g', '2g', '3g'];
      if (connection?.effectiveType && slowConnections.includes(connection.effectiveType)) {
        logger.log(`🌐 Metered connection detected: ${connection.effectiveType} connection`);
        return true;
      }

      // Check connection type if available
      if (connection?.type === 'cellular') {
        logger.log('🌐 Metered connection detected: Cellular connection');
        return true;
      }
    }

    return false;
  }

  /**
   * Get detailed connection information for user warnings
   */
  public getConnectionInfo(): {
    isMetered: boolean;
    type: string;
    effectiveType: string;
    saveData: boolean;
    downlink: number;
    rtt: number;
  } {
    const defaultInfo = {
      isMetered: false,
      type: 'unknown',
      effectiveType: 'unknown',
      saveData: false,
      downlink: 0,
      rtt: 0
    };

    if (!('connection' in navigator)) {
      return defaultInfo;
    }

    const connection = (navigator as { connection?: { type?: string; saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number } }).connection;

    return {
      isMetered: this.isOnMeteredConnection(),
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      saveData: connection?.saveData || false,
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  }

  /**
   * Get user-friendly message about metered connection and update
   */
  public getMeteredConnectionWarning(updateInfo: UpdateInfo): string {
    const connInfo = this.getConnectionInfo();
    const sizeMB = this.estimateUpdateSize(updateInfo);

    let warning = 'You appear to be on a metered connection';

    if (connInfo.saveData) {
      warning += ' (Data Saver enabled)';
    } else if (connInfo.type === 'cellular') {
      warning += ' (cellular data)';
    } else if (['slow-2g', '2g', '3g'].includes(connInfo.effectiveType)) {
      warning += ` (${connInfo.effectiveType} connection)`;
    }

    warning += `. This update may use approximately ${sizeMB}MB of data.`;

    if (updateInfo.policy === 'force') {
      warning += ' This security update will proceed automatically to ensure your safety.';
    } else {
      warning += ' You can enable "Allow updates on metered connections" in settings to proceed.';
    }

    return warning;
  }

  /**
   * Estimate update size for user warnings (rough estimate)
   */
  private estimateUpdateSize(updateInfo: UpdateInfo): number {
    // This is a rough estimate - in a real implementation,
    // the version check API would return the actual update size
    switch (updateInfo.policy) {
      case 'force':
        return 5; // Security updates tend to be smaller
      case 'critical':
        return 10; // Medium-sized updates
      case 'optional':
        return 15; // Feature updates can be larger
      default:
        return 8; // Default estimate
    }
  }

  /**
   * Check if update should proceed on metered connection with user guidance
   */
  public async checkMeteredConnectionPolicy(updateInfo: UpdateInfo): Promise<{
    shouldProceed: boolean;
    needsUserConfirmation: boolean;
    warningMessage: string;
  }> {
    const isMetered = this.isOnMeteredConnection();
    const userAllowsMetered = this.updateState.userPreferences.allowMeteredUpdates;

    if (!isMetered) {
      return {
        shouldProceed: true,
        needsUserConfirmation: false,
        warningMessage: ''
      };
    }

    const warningMessage = this.getMeteredConnectionWarning(updateInfo);

    // Force updates always proceed but with warning
    if (updateInfo.policy === 'force') {
      return {
        shouldProceed: true,
        needsUserConfirmation: false,
        warningMessage: warningMessage
      };
    }

    // If user has enabled metered updates, proceed
    if (userAllowsMetered) {
      return {
        shouldProceed: true,
        needsUserConfirmation: false,
        warningMessage: warningMessage
      };
    }

    // Otherwise, need user confirmation
    return {
      shouldProceed: false,
      needsUserConfirmation: true,
      warningMessage: warningMessage
    };
  }

  /**
   * Handle service worker update found
   */
  private handleServiceWorkerUpdate(): void {
    logger.log('Service worker update found');

    // If we don't have a pending update from the API, create one from SW update
    if (!this.updateState.pendingUpdate) {
      const swUpdate: UpdateInfo = {
        version: 'unknown',
        policy: 'optional' as UpdatePolicy,
        releaseDate: new Date().toISOString(),
        message: 'A new version is available.'
      };

      this.updateState.pendingUpdate = swUpdate;
      this.updateState.updateAvailable = true;
      this.saveUpdateState();

      this.emit('update-available', swUpdate);
    }
  }

  /**
   * Handle service worker controller change
   */
  private handleServiceWorkerControllerChange(): void {
    logger.log('Service worker controller changed - reload may be needed');
    this.emit('controller-changed');
  }

  /**
   * Get platform information for API calls
   */
  private getPlatformInfo(): string {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return 'pwa';
    }

    return 'browser';
  }

  /**
   * Event emitter functionality
   */
  public on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle external update notifications (from service worker or other sources)
   */
  private handleExternalUpdateNotification(updateInfo: UpdateInfo): void {
    logger.log('📬 Processing external update notification:', updateInfo);

    this.updateState.updateAvailable = true;
    this.updateState.latestVersion = updateInfo.version;
    this.updateState.updatePolicy = updateInfo.policy;
    this.updateState.pendingUpdate = updateInfo;

    this.saveUpdateState();
    this.emit('update-available', updateInfo);
  }

  /**
   * Broadcast message to other tabs for coordination
   */
  private broadcastToOtherTabs(message: unknown): void {
    try {
      if ('BroadcastChannel' in window) {
        if (!this.broadcastChannel) {
          this.broadcastChannel = new BroadcastChannel('repcue-updates');
          this.setupBroadcastChannel();
        }
        this.broadcastChannel.postMessage(message);
      }
    } catch (error) {
      logger.error('Failed to broadcast to other tabs:', error);
    }
  }

  private broadcastChannel?: BroadcastChannel;

  /**
   * Setup broadcast channel for tab coordination
   */
  private setupBroadcastChannel(): void {
    if (!this.broadcastChannel) {
      return;
    }

    this.broadcastChannel.addEventListener('message', (event) => {
      const { type, ...data } = event.data;
      logger.log('📡 Received broadcast message:', type, data);

      switch (type) {
        case 'update-starting':
          // Another tab is starting an update
          this.emit('other-tab-updating');
          break;

        case 'update-completed':
          // Another tab completed an update
          this.emit('other-tab-updated');
          break;

        case 'update-failed':
          // Another tab failed to update
          this.emit('other-tab-update-failed', data.error);
          break;

        case 'version-check':
          // Another tab is requesting a version check
          this.checkForUpdates();
          break;
      }
    });
  }

  /**
   * Set timer state reference for workout-aware update handling
   */
  public setTimerStateRef(timerState: TimerState): void {
    this.timerStateRef = timerState;
  }

  /**
   * Check if there is an active workout or timer session
   */
  public isWorkoutActive(): boolean {
    if (!this.timerStateRef) {
      return false;
    }

    // Check if timer is running
    if (this.timerStateRef.isRunning) {
      return true;
    }

    // Check if in workout mode (even if paused)
    if (this.timerStateRef.workoutMode) {
      return true;
    }

    // Check if in rest period between sets
    if (this.timerStateRef.isResting) {
      return true;
    }

    // Check if in countdown mode
    if (this.timerStateRef.isCountdown) {
      return true;
    }

    return false;
  }

  /**
   * Get workout session information for update handling
   */
  public getWorkoutInfo(): {
    isActive: boolean;
    isRunning: boolean;
    isWorkoutMode: boolean;
    workoutName?: string;
    canInterrupt: boolean;
  } {
    if (!this.timerStateRef) {
      return {
        isActive: false,
        isRunning: false,
        isWorkoutMode: false,
        canInterrupt: true
      };
    }

    const isActive = this.isWorkoutActive();
    const isWorkoutMode = !!this.timerStateRef.workoutMode;
    const workoutName = this.timerStateRef.workoutMode?.workoutName;

    return {
      isActive,
      isRunning: this.timerStateRef.isRunning,
      isWorkoutMode,
      workoutName,
      canInterrupt: !isActive || !this.timerStateRef.isRunning
    };
  }

  /**
   * Check if update should be deferred due to active workout
   */
  public shouldDeferUpdateForWorkout(updateInfo: UpdateInfo): {
    shouldDefer: boolean;
    reason: string;
    canForce: boolean;
  } {
    const workoutInfo = this.getWorkoutInfo();

    // Force updates cannot be deferred indefinitely
    if (updateInfo.policy === 'force') {
      if (workoutInfo.isActive && workoutInfo.isRunning) {
        return {
          shouldDefer: true,
          reason: 'workout-active-force',
          canForce: true
        };
      }
      return {
        shouldDefer: false,
        reason: 'force-update',
        canForce: true
      };
    }

    // Defer optional and critical updates during active workouts
    if (workoutInfo.isActive) {
      const reason = workoutInfo.isWorkoutMode ? 'workout-session-active' : 'timer-active';
      return {
        shouldDefer: true,
        reason,
        canForce: false
      };
    }

    return {
      shouldDefer: false,
      reason: 'no-workout',
      canForce: false
    };
  }

  /**
   * Setup critical error handling
   */
  private setupCriticalErrorHandling(): void {
    // Listen for critical update errors from the error handler
    window.addEventListener('critical-update-error', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { originalError, rollbackError, recoveryActions } = customEvent.detail;
      this.emergencyCallbacks.forEach(callback => {
        try {
          callback({ originalError, rollbackError, recoveryActions });
        } catch (error) {
          logger.error('Error in emergency callback:', error);
        }
      });
    });
  }

  /**
   * Categorize update errors for proper handling
   */
  private categorizeUpdateError(error: unknown): UpdateErrorType {
    const errorObj = error as { message?: string; toString?: () => string };
    const message = (errorObj.message || errorObj.toString?.() || 'unknown error').toLowerCase();

    if (message.includes('service worker') || message.includes('activate')) {
      return UpdateErrorType.INSTALLATION_ERROR;
    }
    if (message.includes('fetch') || message.includes('network')) {
      return UpdateErrorType.DOWNLOAD_ERROR;
    }
    if (message.includes('storage') || message.includes('quota')) {
      return UpdateErrorType.STORAGE_ERROR;
    }
    if (message.includes('timeout')) {
      return UpdateErrorType.TIMEOUT_ERROR;
    }

    return UpdateErrorType.UNKNOWN_ERROR;
  }

  /**
   * Handle update errors with appropriate recovery actions
   */
  private handleUpdateError(error: UpdateError): void {
    this.updateState.error = error.message;
    this.recoveryState = updateErrorHandler.getRecoveryState();
    this.recoveryState.currentError = error;
    this.recoveryState.recoveryActions = updateErrorHandler.createRecoveryActions(error);
    this.saveUpdateState();

    logger.error(`Update error [${error.type}/${error.severity}]:`, error.message);

    // Emit error event with recovery actions
    this.emit('update-error-detailed', {
      error,
      recoveryState: this.recoveryState,
      canRetry: error.retryable && this.recoveryState.retryAttempts < 3
    });
  }

  /**
   * Handle critical update errors with automatic recovery attempts
   */
  private async handleCriticalUpdateError(error: UpdateError): Promise<void> {
    logger.warn('Handling critical update error, attempting recovery...');

    // Enable rollback capability if we have a previous version
    const previousVersion = localStorage.getItem('repcue_previous_version');
    if (previousVersion) {
      updateErrorHandler.enableRollback(previousVersion);
    }

    // Try automatic recovery based on error type
    switch (error.type) {
      case 'installation_error':
      case 'service_worker_error':
        await this.recoverFromInstallationError();
        break;

      case 'verification_error':
        await this.recoverFromVerificationError();
        break;

      case 'storage_error':
        await this.recoverFromStorageError();
        break;

      default:
        // For unknown critical errors, attempt rollback if available
        if (updateErrorHandler.getRecoveryState().canRollback) {
          await updateErrorHandler.performRollback();
        }
        break;
    }
  }

  /**
   * Recover from installation errors
   */
  private async recoverFromInstallationError(): Promise<void> {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister and re-register service worker
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.unregister();
        await this.initializeServiceWorker();
      }

      logger.log('Recovery from installation error completed');
    } catch (recoveryError) {
      throw updateErrorHandler.createUpdateError(recoveryError, {
        type: 'rollback_error',
        severity: 'critical'
      });
    }
  }

  /**
   * Recover from verification errors
   */
  private async recoverFromVerificationError(): Promise<void> {
    try {
      // Clear caches and force fresh download
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear any stored update state
      localStorage.removeItem(UPDATE_STATE_KEY);
      sessionStorage.removeItem(UPDATE_STATE_KEY);

      logger.log('Recovery from verification error completed');
    } catch (recoveryError) {
      throw updateErrorHandler.createUpdateError(recoveryError, {
        type: 'rollback_error',
        severity: 'critical'
      });
    }
  }

  /**
   * Recover from storage errors
   */
  private async recoverFromStorageError(): Promise<void> {
    try {
      // Try to free up storage space
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        logger.log('Storage estimate:', estimate);
      }

      // Clear non-essential caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const nonEssentialCaches = cacheNames.filter(name =>
          !name.includes('essential') && !name.includes('offline')
        );
        await Promise.all(nonEssentialCaches.map(name => caches.delete(name)));
      }

      logger.log('Recovery from storage error completed');
    } catch (recoveryError) {
      throw updateErrorHandler.createUpdateError(recoveryError, {
        type: 'storage_error',
        severity: 'high'
      });
    }
  }

  /**
   * Add emergency callback for critical errors
   */
  public addEmergencyCallback(callback: (error: { originalError?: Error; rollbackError?: Error; recoveryActions?: RecoveryAction[] }) => void): void {
    this.emergencyCallbacks.add(callback);
  }

  /**
   * Remove emergency callback
   */
  public removeEmergencyCallback(callback: (error: { originalError?: Error; rollbackError?: Error; recoveryActions?: RecoveryAction[] }) => void): void {
    this.emergencyCallbacks.delete(callback);
  }

  /**
   * Get current recovery state for UI display
   */
  public getRecoveryState(): UpdateRecoveryState {
    return this.recoveryState;
  }

  /**
   * Manually trigger recovery action
   */
  public async executeRecoveryAction(actionId: string): Promise<void> {
    const action = this.recoveryState.recoveryActions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Recovery action '${actionId}' not found`);
    }

    try {
      await action.action();
      logger.log(`Recovery action '${actionId}' executed successfully`);

      // Reset error state if recovery was successful
      this.updateState.error = undefined;
      updateErrorHandler.resetRecoveryState();
      this.recoveryState = updateErrorHandler.getRecoveryState();
      this.saveUpdateState();

      this.emit('recovery-action-completed', { actionId });
    } catch (error) {
      const recoveryError = updateErrorHandler.createUpdateError(error, {
        type: 'rollback_error',
        metadata: { failedAction: actionId }
      });

      this.handleUpdateError(recoveryError);
      this.emit('recovery-action-failed', { actionId, error: recoveryError });
      throw recoveryError;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopPeriodicChecks();
    this.eventListeners.clear();

    // Clean up service worker event listeners
    swEventEmitter.off('update-available', this.handleServiceWorkerUpdate);
    swEventEmitter.off('update-activated', this.handleServiceWorkerControllerChange);
    swEventEmitter.off('controller-changed', this.handleServiceWorkerControllerChange);

    // Clean up broadcast channel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = undefined;
    }

    // Clear timer state reference
    this.timerStateRef = null;
  }
}

// Export singleton instance
export const updateService = UpdateService.getInstance();