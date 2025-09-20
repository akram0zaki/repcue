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
  private eventListeners: Map<string, Set<Function>> = new Map();
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
    updateService.on('update-available', (updateInfo: UpdateInfo) => {
      if (updateInfo.policy === 'force') {
        this.handleForceUpdateAvailable(updateInfo);
      }
    });

    updateService.on('update-started', (updateInfo: UpdateInfo) => {
      if (updateInfo.policy === 'force') {
        this.emit('force-update-started', updateInfo);
      }
    });

    updateService.on('update-progress', (progress: number) => {
      if (this.forceUpdateState.isForceUpdateActive) {
        this.emit('force-update-progress', progress);
      }
    });

    updateService.on('update-completed', (updateInfo: UpdateInfo) => {
      if (this.forceUpdateState.isForceUpdateActive) {
        this.handleForceUpdateCompleted(updateInfo);
      }
    });

    updateService.on('update-failed', (error: any) => {
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
    if (!this.forceUpdateState.isForceUpdateActive || !this.forceUpdateState.updateInfo) {
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

      // Apply the update using the update service
      await updateService.applyUpdate(true); // Force override all checks

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

    // Small delay to allow event to be processed
    setTimeout(() => {
      window.location.reload();
    }, 100);
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

    this.forceUpdateState.isForceUpdateActive = false;
    this.clearAutoForceTimeout();

    this.emit('force-update-completed', updateInfo);
  }

  /**
   * Handle force update failure
   */
  private handleForceUpdateFailed(error: any): void {
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

    this.forceUpdateState.isForceUpdateActive = false;
    this.clearAutoForceTimeout();

    logger.log('❌ Force update cancelled by user');
    this.emit('force-update-cancelled');

    return true;
  }

  /**
   * Event emitter functionality
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
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