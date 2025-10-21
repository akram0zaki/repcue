import { LegalDocsService } from './legalDocsService';
import logger from '../utils/logger';
import { LEGAL_ACCEPTANCE_V3_ENABLED } from '../config/features';

/**
 * Legal Update Service
 * 
 * Manages scheduled checks for legal document updates and emits events
 * for the UI to react to. Implements workout-aware deferral to avoid
 * interrupting active workouts.
 * 
 * Features:
 * - Check on app boot
 * - Check every 4 hours while app is active
 * - Check on network reconnection
 * - Emit custom events for UI components
 * - Workout-aware deferral (non-blocking notifications during workouts)
 */
export class LegalUpdateService {
  private static instance: LegalUpdateService;
  private legalDocsService: LegalDocsService;
  private checkIntervalId: number | null = null;
  private readonly CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
  private lastCheckTime: number = 0;
  private isInitialized: boolean = false;

  private constructor() {
    this.legalDocsService = LegalDocsService.getInstance();
  }

  public static getInstance(): LegalUpdateService {
    if (!LegalUpdateService.instance) {
      LegalUpdateService.instance = new LegalUpdateService();
    }
    return LegalUpdateService.instance;
  }

  /**
   * Initialize service and start scheduled checks
   * Should be called once on app boot
   */
  public async initialize(): Promise<boolean> {
    if (!LEGAL_ACCEPTANCE_V3_ENABLED) {
      logger.log('Legal Update Service disabled by feature flag');
      return false;
    }

    if (this.isInitialized) {
      logger.warn('Legal Update Service already initialized');
      return true;
    }

    try {
      logger.log('Initializing Legal Update Service...');

      // Initialize LegalDocsService first
      const docsInitialized = await this.legalDocsService.initialize();
      if (!docsInitialized) {
        logger.error('Failed to initialize LegalDocsService');
        return false;
      }

      // Perform initial check
      await this.checkForUpdates();

      // Start scheduled checks
      this.startScheduledChecks();

      // Listen for network reconnection
      this.setupNetworkListener();

      this.isInitialized = true;
      logger.log('Legal Update Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Legal Update Service:', error);
      return false;
    }
  }

  /**
   * Check for legal document updates
   * Compares live manifest with baseline and emits events if changes detected
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!LEGAL_ACCEPTANCE_V3_ENABLED) {
      return false;
    }

    try {
      logger.log('Checking for legal document updates...');
      this.lastCheckTime = Date.now();

      // Load live manifest (with ETag cache validation)
      const liveManifest = await this.legalDocsService.loadLiveManifest();
      
      if (!liveManifest) {
        logger.warn('Failed to load live manifest');
        return false;
      }

      // Detect updates (new documents or version/hash changes)
      const updates = this.legalDocsService.detectUpdates();

      if (updates.length > 0) {
        logger.log(`Found ${updates.length} legal document update(s)`);
        
        // Emit event for UI to react
        this.emitUpdatesAvailable(updates);
      } else {
        logger.log('No legal document updates found');
      }

      // Emit check completed event
      window.dispatchEvent(new CustomEvent('legal-check-completed', {
        detail: {
          timestamp: new Date().toISOString(),
          updatesFound: updates.length
        }
      }));

      return true;
    } catch (error) {
      logger.error('Error checking for legal updates:', error);
      return false;
    }
  }

  /**
   * Emit updates-available event for UI components
   */
  private emitUpdatesAvailable(updates: import('../types/legal').LegalDoc[]): void {
    // Check if any updates are blocking
    const hasBlocking = updates.some(doc => {
      const isEffective = this.isEffectiveNow(doc.effectiveFrom);
      const policy = doc.policy || 'deferred';
      return doc.required && isEffective && policy === 'force';
    });

    // Check if user is in an active workout
    const isInWorkout = this.isUserInWorkout();

    window.dispatchEvent(new CustomEvent('legal-updates-available', {
      detail: {
        updates,
        hasBlocking,
        isInWorkout,
        timestamp: new Date().toISOString()
      }
    }));

    logger.log(`Emitted legal-updates-available event (blocking: ${hasBlocking}, in workout: ${isInWorkout})`);
  }

  /**
   * Check if document is effective now based on effectiveFrom date
   */
  private isEffectiveNow(effectiveFrom?: string): boolean {
    if (!effectiveFrom) {
      return true;
    }

    try {
      const effectiveDate = new Date(effectiveFrom);
      const now = new Date();
      return now >= effectiveDate;
    } catch {
      return true;
    }
  }

  /**
   * Check if user is currently in an active workout
   * This is a simplified check - in production, would integrate with timer state
   */
  private isUserInWorkout(): boolean {
    // TODO: Integrate with timer state management
    // For now, check if timer page is active based on URL
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/timer';
    }
    return false;
  }

  /**
   * Start scheduled checks every 4 hours
   */
  private startScheduledChecks(): void {
    if (this.checkIntervalId) {
      logger.warn('Scheduled checks already running');
      return;
    }

    this.checkIntervalId = window.setInterval(async () => {
      logger.log('Running scheduled legal document check...');
      await this.checkForUpdates();
    }, this.CHECK_INTERVAL_MS);

    logger.log(`Scheduled checks started (interval: ${this.CHECK_INTERVAL_MS}ms)`);
  }

  /**
   * Stop scheduled checks
   */
  public stopScheduledChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      logger.log('Scheduled checks stopped');
    }
  }

  /**
   * Setup network reconnection listener
   */
  private setupNetworkListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', async () => {
      logger.log('Network reconnected, checking for legal updates...');
      await this.checkForUpdates();
    });

    logger.log('Network listener setup complete');
  }

  /**
   * Force an immediate check (bypasses cache)
   */
  public async forceCheck(): Promise<boolean> {
    if (!LEGAL_ACCEPTANCE_V3_ENABLED) {
      return false;
    }

    try {
      logger.log('Forcing legal document update check (bypassing cache)...');
      
      // Force refresh of live manifest (no ETag)
      await this.legalDocsService.loadLiveManifest(true);
      
      // Check for updates
      return await this.checkForUpdates();
    } catch (error) {
      logger.error('Error in forced check:', error);
      return false;
    }
  }

  /**
   * Get time since last check in milliseconds
   */
  public getTimeSinceLastCheck(): number {
    return Date.now() - this.lastCheckTime;
  }

  /**
   * Check if it's time for a scheduled check (for manual triggering)
   */
  public shouldCheck(): boolean {
    const timeSinceLastCheck = this.getTimeSinceLastCheck();
    return timeSinceLastCheck >= this.CHECK_INTERVAL_MS;
  }

  /**
   * Cleanup service (for testing or app shutdown)
   */
  public cleanup(): void {
    this.stopScheduledChecks();
    this.isInitialized = false;
    logger.log('Legal Update Service cleaned up');
  }
}

// Export singleton instance
export const legalUpdateService = LegalUpdateService.getInstance();
