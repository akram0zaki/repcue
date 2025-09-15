/**
 * SyncService V2 — simplified sync service using only CorrectSyncService
 * Old legacy SyncService has been completely removed
 */
import { correctSyncService } from './correctSyncService';
import logger from '../utils/logger';

// Legacy interfaces maintained for backward compatibility with existing code
export interface SyncResult {
  success: boolean;
  tablesProcessed: number;
  recordsPushed: number;
  recordsPulled: number;
  conflicts: number;
  errors: SyncError[];
}

export interface SyncError {
  type: 'network' | 'validation' | 'conflict' | 'storage' | 'auth' | 'unknown';
  message: string;
  table?: string;
  recordId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  hasChangesToSync: boolean;
  errors: SyncError[];
}

/**
 * V2 Sync Service - wraps CorrectSyncService with legacy interface compatibility
 */
class V2SyncService {
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private errors: SyncError[] = [];
  private lastSyncAttempt?: number;
  private lastSuccessfulSync?: number;
  private isSyncing = false;

  constructor(private correctSync: typeof correctSyncService) {
    // Initialize with current status
    this.notify();
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSuccessfulSync: this.lastSuccessfulSync,
      hasChangesToSync: false, // V2 doesn't track this granularly
      errors: this.errors
    };
  }

  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearErrors(): void {
    this.errors = [];
    this.notify();
  }

  private notify(): void {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.warn('Sync status listener error:', error);
      }
    });
  }

  async sync(force?: boolean): Promise<SyncResult> {
    if (this.isSyncing) {
      // Return early with info message instead of queuing
      logger.debug('[sync:v2] sync already in progress, returning early');
      return {
        success: true,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: [{ 
          type: 'unknown', 
          message: 'Sync already in progress', 
          timestamp: new Date().toISOString() 
        } as SyncError]
      };
    }

    this.isSyncing = true;
    this.lastSyncAttempt = Date.now();
    this.notify();

    try {
      const mode = force ? 'full' : 'light';
      const res = await this.correctSync.sync(mode as 'light' | 'full');
      this.lastSuccessfulSync = res.success ? Date.now() : this.lastSuccessfulSync;
      
      // Map CorrectSyncResult to legacy SyncResult
      const mappedResult: SyncResult = {
        success: res.success,
        tablesProcessed: res.tables,
        recordsPushed: res.pushed,
        recordsPulled: res.pulled,
        conflicts: 0,
        errors: (res.errors || []).map(e => ({
          type: 'unknown' as const,
          message: e.message,
          table: e.table,
          timestamp: new Date().toISOString()
        } as SyncError))
      };

      // Enhanced logging for sync results with correlation ID
      if (res.correlationId) {
        logger.info(`[sync:v2] 🔗 Correlation ID: ${res.correlationId}`);
      }

      // Log detailed sync metadata if available
      if ((res as any).sync_metadata) {
        const metadata = (res as any).sync_metadata;
        logger.info(`[sync:v2] 📊 Detailed sync results:`, {
          correlationId: res.correlationId,
          pushSuccesses: metadata.push_successes,
          pushErrors: metadata.push_errors,
          pullSuccesses: metadata.pull_successes,
          pullErrors: metadata.pull_errors,
          totalSuccesses: metadata.total_successes,
          totalErrors: metadata.total_errors,
          status: (res as any).status,
          message: (res as any).message
        });

        // Log specific error details if there were failures
        if (metadata.total_errors > 0) {
          logger.warn(`[sync:v2] ⚠️ Sync completed with ${metadata.total_errors} errors out of ${metadata.total_successes + metadata.total_errors} operations`);
          if (mappedResult.errors.length > 0) {
            logger.warn(`[sync:v2] 🔍 Error details:`, mappedResult.errors);
          }
        }
      }

      this.errors = mappedResult.errors;
      return mappedResult;

    } catch (err) {
      const syncErr: SyncError = {
        type: 'unknown',
        message: err instanceof Error ? err.message : 'Unknown sync error',
        timestamp: new Date().toISOString()
      };
      
      this.errors = [syncErr];
      return {
        success: false,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: [syncErr]
      };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

// Singleton instance
let _syncServiceInstance: V2SyncService | null = null;

function getSyncServiceInstance(): V2SyncService {
  if (!_syncServiceInstance) {
    _syncServiceInstance = new V2SyncService(correctSyncService);
  }
  return _syncServiceInstance;
}

// Export singleton instance as factory
export const syncService: {
  getSyncStatus: () => SyncStatus;
  onSyncStatusChange: (listener: (status: SyncStatus) => void) => () => void;
  clearErrors: () => void;
  sync: (force?: boolean) => Promise<SyncResult>;
} = {
  getSyncStatus: () => getSyncServiceInstance().getSyncStatus(),
  onSyncStatusChange: (listener: (status: SyncStatus) => void) => getSyncServiceInstance().onSyncStatusChange(listener),
  clearErrors: () => getSyncServiceInstance().clearErrors(),
  sync: (force?: boolean) => getSyncServiceInstance().sync(force)
};