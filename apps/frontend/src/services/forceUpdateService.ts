import type { UpdateInfo, TimerState } from '../types';
import { updateService } from './updateService';

import { consentService } from './consentService';
import logger from '../utils/logger';

interface WorkoutInterruptionData {
  isWorkoutActive: boolean;
  currentExercise?: string;
  currentSet?: number;
  currentRep?: number;
  currentTime?: number;
  totalSets?: number;
  workoutStartTime?: Date;
  workoutMode?: 'standalone' | 'workout';
}

interface ForceUpdateState {
  isForceUpdateActive: boolean;
  updateInfo?: UpdateInfo;
  workoutData?: WorkoutInterruptionData;
  retryCount: number;
  lastRetryTime?: Date;
  autoForceTriggeredAt?: Date;
  userAcknowledged: boolean;
}

/**
 * Force Update Integration Service
 * Manages the coordination between force updates, workout interruption, and update system
 * Handles the complete force update flow including workout state preservation
 */
export class ForceUpdateService {
  private static instance: ForceUpdateService;
  private forceUpdateState: ForceUpdateState;
  private timerStateRef: TimerState | null = null;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private autoForceTimeout: number | null = null;

  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly AUTO_FORCE_DELAY = 5 * 60 * 1000; // 5 minutes
  private static readonly RETRY_DELAY_BASE = 10000; // 10 seconds

  private constructor() {
    this.forceUpdateState = {
      isForceUpdateActive: false,
      retryCount: 0,
      userAcknowledged: false
    };

    this.setupUpdateServiceListeners();
  }

  public static getInstance(): ForceUpdateService {
    if (!ForceUpdateService.instance) {
      ForceUpdateService.instance = new ForceUpdateService();
    }
    return ForceUpdateService.instance;
  }

  /**
   * Setup listeners for update service events
   */
  private setupUpdateServiceListeners(): void {
    updateService.on('update-available', (updateInfo: unknown) => {
      const info = updateInfo as UpdateInfo;
      if (info.policy === 'force') {
        this.handleForceUpdateAvailable(info);
      }
    });

    updateService.on('update-started', (updateInfo: unknown) => {
      const info = updateInfo as UpdateInfo;
      if (info.policy === 'force') {
        this.emit('force-update-started', info);
      }
    });

    updateService.on('update-progress', (progress: unknown) => {
      if (this.forceUpdateState.isForceUpdateActive) {
        this.emit('force-update-progress', typeof progress === 'number' ? progress : 0);
      }
    });

    updateService.on('update-completed', (updateInfo: unknown) => {
      const info = updateInfo as UpdateInfo;
      if (this.forceUpdateState.isForceUpdateActive) {
        this.handleForceUpdateCompleted(info);
      }
    });

    updateService.on('update-failed', (error: unknown) => {
      if (this.forceUpdateState.isForceUpdateActive) {
        this.handleForceUpdateFailed(error);
      }
    });
  }

  /**
   * Handle force update becoming available
   */
  private handleForceUpdateAvailable(updateInfo: UpdateInfo): void {
    logger.log('🚨 Force update available:', updateInfo.version);

    // Capture current workout state if active
    const workoutData = this.captureWorkoutState();

    this.forceUpdateState = {
      isForceUpdateActive: true,
      updateInfo,
      workoutData,
      retryCount: 0,
      userAcknowledged: false
    };

    logger.debug('Force update state set:', {
      isActive: this.forceUpdateState.isForceUpdateActive,
      version: this.forceUpdateState.updateInfo?.version,
      hasWorkoutData: !!this.forceUpdateState.workoutData
    });

    // Start auto-force countdown
    this.startAutoForceCountdown();

    this.emit('force-update-available', {
      updateInfo,
      workoutData,
      autoForceDelay: ForceUpdateService.AUTO_FORCE_DELAY
    });
  }

  /**
   * Start the auto-force countdown timer
   */
  private startAutoForceCountdown(): void {
    this.clearAutoForceTimeout();

    this.forceUpdateState.autoForceTriggeredAt = new Date();

    this.autoForceTimeout = window.setTimeout(() => {
      if (this.forceUpdateState.isForceUpdateActive && !this.forceUpdateState.userAcknowledged) {
        logger.log('🚨 Auto-forcing security update after timeout');
        this.forceUpdate();
      }
    }, ForceUpdateService.AUTO_FORCE_DELAY);

    logger.log(`⏰ Auto-force countdown started: ${ForceUpdateService.AUTO_FORCE_DELAY / 1000}s`);
  }

  /**
   * Clear the auto-force timeout
   */
  private clearAutoForceTimeout(): void {
    if (this.autoForceTimeout) {
      clearTimeout(this.autoForceTimeout);
      this.autoForceTimeout = null;
    }
  }

  /**
   * Capture current workout state for interruption handling
   */
  private captureWorkoutState(): WorkoutInterruptionData {
    const workoutData: WorkoutInterruptionData = {
      isWorkoutActive: false
    };

    if (this.timerStateRef) {
      const isActive = this.timerStateRef.isRunning || this.timerStateRef.isResting;

      if (isActive) {
        workoutData.isWorkoutActive = true;
        workoutData.currentSet = this.timerStateRef.currentSet;
        workoutData.currentRep = this.timerStateRef.currentRep;
        workoutData.currentTime = this.timerStateRef.currentTime;
        workoutData.workoutMode = this.timerStateRef.workoutMode ? 'workout' : 'standalone';
        workoutData.workoutStartTime = new Date();

        // Get current exercise name if available
        if (this.timerStateRef.currentExercise) {
          workoutData.currentExercise = this.timerStateRef.currentExercise.name;
          workoutData.totalSets = this.timerStateRef.currentExercise.default_sets;
        } else if (this.timerStateRef.workoutMode?.exercises) {
          const currentExerciseIndex = this.timerStateRef.workoutMode.currentExerciseIndex || 0;
          const currentExercise = this.timerStateRef.workoutMode.exercises[currentExerciseIndex];
          workoutData.currentExercise = currentExercise?.exercise_id || 'Unknown Exercise';
          workoutData.totalSets = currentExercise?.custom_sets || 1;
        }

        logger.log('💪 Captured workout state:', workoutData);
      }
    }

    return workoutData;
  }

  /**
   * Set timer state reference for workout integration
   */
  public setTimerStateRef(timerState: TimerState): void {
    this.timerStateRef = timerState;
  }

  /**
   * User acknowledges the force update
   */
  public acknowledgeForceUpdate(): void {
    if (!this.forceUpdateState.isForceUpdateActive) {
      return;
    }

    this.forceUpdateState.userAcknowledged = true;
    this.clearAutoForceTimeout();

    logger.log('✅ User acknowledged force update');
    this.emit('force-update-acknowledged');
  }

  /**
   * User chooses to apply force update immediately
   */
  public async applyForceUpdate(): Promise<void> {
    logger.debug('applyForceUpdate called, current state:', {
      isForceUpdateActive: this.forceUpdateState.isForceUpdateActive,
      hasUpdateInfo: !!this.forceUpdateState.updateInfo,
      userAcknowledged: this.forceUpdateState.userAcknowledged
    });

    if (!this.forceUpdateState.isForceUpdateActive || !this.forceUpdateState.updateInfo) {
      logger.error('No active force update to apply - state dump:', {
        forceUpdateState: this.forceUpdateState,
        isActive: this.forceUpdateState.isForceUpdateActive,
        hasInfo: !!this.forceUpdateState.updateInfo
      });

      logger.warn('🔧 Attempting to recover force update state...');

      // Try to recover using pendingUpdate from updateService without network call
      try {
        // Check if updateService has a pending update instead of making network call
        const updateState = updateService.getUpdateState();
        if (updateState?.pendingUpdate && updateState.pendingUpdate.policy === 'force') {
          logger.warn('Found pending force update in updateService, reinitializing force update state');
          this.handleForceUpdateAvailable(updateState.pendingUpdate);
          // Retry the apply after reinitializing
          return this.forceUpdate();
        }

        // Fallback: try network check only if no pending update
        logger.warn('No pending update found, attempting network recovery...');
        const updateInfo = await updateService.checkForUpdates();
        if (updateInfo && updateInfo.policy === 'force') {
          logger.warn('Found force update info from network check, reinitializing force update state');
          this.handleForceUpdateAvailable(updateInfo);
          // Retry the apply after reinitializing
          return this.forceUpdate();
        }
      } catch (error) {
        logger.error('Failed to recover force update state:', error);
        // If recovery fails, try to create a mock force update for development
        logger.warn('Creating fallback force update for development...');
        const fallbackUpdate = {
          version: '1.0.2',
          policy: 'force' as const,
          message: 'Fallback force update for development',
          changelog: { security_updates: ['Development fallback update'] },
          releaseDate: new Date().toISOString(),
          forceUpdate: true
        };
        this.handleForceUpdateAvailable(fallbackUpdate);
        return this.forceUpdate();
      }

      throw new Error('No active force update to apply');
    }

    this.acknowledgeForceUpdate();
    return this.forceUpdate();
  }

  /**
   * Apply the force update
   */
  private async forceUpdate(): Promise<void> {
    if (!this.forceUpdateState.updateInfo) {
      throw new Error('No force update info available');
    }

    try {
      logger.log('🚀 Starting force update application');
      this.emit('force-update-applying');

      // Save workout state if active
      if (this.forceUpdateState.workoutData?.isWorkoutActive) {
        await this.saveWorkoutState();
      }

      // Check if we're in PWA mode vs dev mode
      const isPWAMode = !('serviceWorker' in navigator) ||
                       !import.meta.env.DEV ||
                       window.matchMedia('(display-mode: standalone)').matches;

      logger.debug('Force update context:', {
        isPWAMode,
        hasServiceWorker: 'serviceWorker' in navigator,
        isDev: import.meta.env.DEV,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches
      });

      if (isPWAMode) {
        // In PWA mode, try the update service first, but have fallback
        try {
          await updateService.applyUpdate(true); // Force override all checks
          logger.log('✅ PWA update service succeeded');
        } catch (updateError) {
          logger.warn('PWA update service failed, falling back to force reload:', updateError);
          // Fallback to force reload in PWA mode
          this.forceReload();
          return;
        }
      } else {
        // In dev mode, update version first then reload
        logger.log('🔄 Dev mode detected, updating version then reloading');
        try {
          // Use the updateService to update the version properly
          await updateService.applyUpdate(true); // Force override all checks
          logger.log('✅ Dev mode version update succeeded');
        } catch (updateError) {
          logger.warn('Dev mode update service failed, manually updating version before reload:', updateError);

          // Manually update the version in IndexedDB before reload
          try {
            const { storageService } = await import('./storageService');
            await storageService.updateAppVersion(this.forceUpdateState.updateInfo.version);
            logger.info(`🔄 Manually updated version to ${this.forceUpdateState.updateInfo.version} before reload`);
          } catch (versionError) {
            logger.error('Failed to update version manually:', versionError);
          }

          this.forceReload();
          return;
        }
      }

      // Update completed - this will trigger page reload
      this.handleForceUpdateCompleted(this.forceUpdateState.updateInfo);

    } catch (error) {
      logger.error('❌ Force update failed:', error);
      this.handleForceUpdateFailed(error);
      throw error;
    }
  }

  /**
   * Retry failed force update with exponential backoff
   */
  public async retryForceUpdate(): Promise<void> {
    if (!this.forceUpdateState.isForceUpdateActive) {
      throw new Error('No active force update to retry');
    }

    if (this.forceUpdateState.retryCount >= ForceUpdateService.MAX_RETRY_ATTEMPTS) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Calculate exponential backoff delay
    const delayMs = ForceUpdateService.RETRY_DELAY_BASE * Math.pow(2, this.forceUpdateState.retryCount);

    logger.log(`🔄 Retrying force update in ${delayMs}ms (attempt ${this.forceUpdateState.retryCount + 1})`);

    this.emit('force-update-retry-scheduled', {
      attempt: this.forceUpdateState.retryCount + 1,
      maxAttempts: ForceUpdateService.MAX_RETRY_ATTEMPTS,
      delayMs
    });

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          this.forceUpdateState.retryCount++;
          this.forceUpdateState.lastRetryTime = new Date();

          await this.forceUpdate();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  }

  /**
   * Force reload as last resort
   */
  public forceReload(): void {
    logger.log('🔄 Force reloading application as last resort');

    // Save workout state if possible
    if (this.forceUpdateState.workoutData?.isWorkoutActive) {
      this.saveWorkoutState().catch(error => {
        logger.error('Failed to save workout state before force reload:', error);
      });
    }

    this.emit('force-reload-initiated');

    // Mark force update as completed before reload to prevent state issues
    if (this.forceUpdateState.updateInfo) {
      this.handleForceUpdateCompleted(this.forceUpdateState.updateInfo);
    }

    // Clear any cached data that might be causing issues
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      }).catch(error => {
        logger.debug('Failed to clear caches:', error);
      });
    }

    // Small delay to allow event to be processed and caches to be cleared
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }

  /**
   * Save workout state for recovery after update
   */
  private async saveWorkoutState(): Promise<void> {
    if (!this.forceUpdateState.workoutData?.isWorkoutActive) {
      return;
    }

    try {
      const workoutRecoveryData = {
        ...this.forceUpdateState.workoutData,
        savedAt: new Date().toISOString(),
        forceUpdateVersion: this.forceUpdateState.updateInfo?.version
      };

      // Use localStorage directly for update recovery data (respects user consent)
      if (consentService.hasConsent()) {
        localStorage.setItem('repcue_workout_recovery_data', JSON.stringify(workoutRecoveryData));
      }

      logger.log('💾 Saved workout state for post-update recovery');
      this.emit('workout-state-saved', workoutRecoveryData);

    } catch (error) {
      logger.error('Failed to save workout state:', error);
      throw error;
    }
  }

  /**
   * Load and clear saved workout state after update
   */
  public async loadAndClearWorkoutRecovery(): Promise<WorkoutInterruptionData | null> {
    try {
      let recoveryData: WorkoutInterruptionData | null = null;

      // Use localStorage directly for recovery data
      if (consentService.hasConsent()) {
        const stored = localStorage.getItem('repcue_workout_recovery_data');
        if (stored) {
          recoveryData = JSON.parse(stored);
          // Clear the recovery data
          localStorage.removeItem('repcue_workout_recovery_data');
        }
      }

      if (recoveryData) {

        logger.log('📥 Loaded workout recovery data:', recoveryData);
        return recoveryData;
      }

      return null;
    } catch (error) {
      logger.error('Failed to load workout recovery data:', error);
      return null;
    }
  }

  /**
   * Handle force update completion
   */
  private handleForceUpdateCompleted(updateInfo: UpdateInfo): void {
    logger.log('✅ Force update completed successfully');

    logger.debug('Clearing force update state (completion):', {
      previousState: this.forceUpdateState.isForceUpdateActive,
      version: updateInfo.version
    });

    this.forceUpdateState.isForceUpdateActive = false;
    this.clearAutoForceTimeout();

    this.emit('force-update-completed', updateInfo);
  }

  /**
   * Handle force update failure
   */
  private handleForceUpdateFailed(error: unknown): void {
    logger.error('❌ Force update failed:', error);

    this.emit('force-update-failed', {
      error,
      retryCount: this.forceUpdateState.retryCount,
      maxRetries: ForceUpdateService.MAX_RETRY_ATTEMPTS,
      canRetry: this.forceUpdateState.retryCount < ForceUpdateService.MAX_RETRY_ATTEMPTS
    });
  }

  /**
   * Get current force update state
   */
  public getForceUpdateState(): ForceUpdateState {
    return { ...this.forceUpdateState };
  }

  /**
   * Get time remaining for auto-force countdown
   */
  public getAutoForceTimeRemaining(): number {
    if (!this.forceUpdateState.autoForceTriggeredAt) {
      return 0;
    }

    const elapsed = Date.now() - this.forceUpdateState.autoForceTriggeredAt.getTime();
    const remaining = ForceUpdateService.AUTO_FORCE_DELAY - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Check if force update is currently active
   */
  public isForceUpdateActive(): boolean {
    return this.forceUpdateState.isForceUpdateActive;
  }

  /**
   * Debug method to check if there's actually an update available
   */
  public async debugCheckForUpdates(): Promise<void> {
    try {
      logger.debug('🔍 Checking for updates (debug)...');
      const updateInfo = await updateService.checkForUpdates();
      logger.debug('Update check result:', {
        hasUpdate: !!updateInfo,
        version: updateInfo?.version,
        policy: updateInfo?.policy,
        forceUpdate: updateInfo?.forceUpdate,
        currentForceState: this.forceUpdateState.isForceUpdateActive
      });
    } catch (error) {
      logger.debug('Update check failed:', error);
    }
  }

  /**
   * Check if workout is currently interrupted by force update
   */
  public isWorkoutInterrupted(): boolean {
    return this.forceUpdateState.isForceUpdateActive &&
           (this.forceUpdateState.workoutData?.isWorkoutActive || false);
  }

  /**
   * Get workout interruption data
   */
  public getWorkoutInterruptionData(): WorkoutInterruptionData | undefined {
    return this.forceUpdateState.workoutData;
  }

  /**
   * Cancel force update (only if user acknowledged and not auto-forced)
   */
  public cancelForceUpdate(): boolean {
    if (!this.forceUpdateState.isForceUpdateActive) {
      return false;
    }

    // Can only cancel if user acknowledged (i.e., not auto-forced)
    if (!this.forceUpdateState.userAcknowledged) {
      return false;
    }

    logger.debug('Clearing force update state (cancellation):', {
      previousState: this.forceUpdateState.isForceUpdateActive,
      userAcknowledged: this.forceUpdateState.userAcknowledged
    });

    this.forceUpdateState.isForceUpdateActive = false;
    this.clearAutoForceTimeout();

    logger.log('❌ Force update cancelled by user');
    this.emit('force-update-cancelled');

    return true;
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
          logger.error(`Error in force update event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clearAutoForceTimeout();
    this.eventListeners.clear();
    this.forceUpdateState.isForceUpdateActive = false;
  }
}

// Export singleton instance
export const forceUpdateService = ForceUpdateService.getInstance();