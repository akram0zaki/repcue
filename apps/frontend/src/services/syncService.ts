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
    // Call listener immediately with current status
    try {
      listener(this.getSyncStatus());
    } catch (error) {
      logger.warn('Sync status listener error:', error);
    }
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

      // Enhanced logging based on sync status and detailed metadata
      const resWithMetadata = res as typeof res & {
        sync_metadata?: {
          push_successes: number;
          push_errors: number;
          pull_successes: number;
          pull_errors: number;
          total_successes: number;
          total_errors: number;
          table_statuses?: Record<string, {
            table: string;
            push_attempted: boolean;
            push_success: boolean;
            push_errors: number;
            push_successes: number;
            pull_attempted: boolean;
            pull_success: boolean;
            pull_errors: number;
            pull_successes: number;
          }>;
          detailed_errors?: Array<{
            table: string;
            record_id: string;
            operation: string;
            error: string;
          }>;
        };
        status?: string;
        message?: string;
      };

      const metadata = resWithMetadata.sync_metadata;
      const status = resWithMetadata.status || 'unknown';
      const totalErrors = metadata?.total_errors || 0;
      const totalSuccesses = metadata?.total_successes || 0;

      // Determine log level based on sync status
      const isPartialSuccess = status === 'partial_success' || (totalErrors > 0 && totalSuccesses > 0);
      const isFailure = status === 'error' || status === 'failure' || (totalErrors > 0 && totalSuccesses === 0);

      // Log correlation ID first
      if (res.correlationId) {
        const logLevel = isFailure ? 'error' : isPartialSuccess ? 'info' : 'debug';
        logger[logLevel](`[sync:v2] 🔗 Correlation ID: ${res.correlationId}`);
      }

      // Log detailed sync results based on status
      if (metadata) {
        const syncSummary = {
          correlationId: res.correlationId,
          status: status,
          message: resWithMetadata.message,
          pushSuccesses: metadata.push_successes,
          pushErrors: metadata.push_errors,
          pullSuccesses: metadata.pull_successes,
          pullErrors: metadata.pull_errors,
          totalSuccesses: metadata.total_successes,
          totalErrors: metadata.total_errors
        };

        if (isFailure) {
          logger.error(`[sync:v2] ❌ Sync failed:`, syncSummary);
        } else if (isPartialSuccess) {
          logger.info(`[sync:v2] ⚠️ Sync partially successful:`, syncSummary);
        } else {
          logger.debug(`[sync:v2] ✅ Sync completed successfully:`, syncSummary);
        }

        // Log per-table status details for partial success and failures
        if ((isPartialSuccess || isFailure) && metadata.table_statuses) {
          const tableResults = Object.values(metadata.table_statuses);
          const tablesWithErrors = tableResults.filter(t => t.push_errors > 0 || t.pull_errors > 0);
          const tablesWithSuccess = tableResults.filter(t => t.push_successes > 0 || t.pull_successes > 0);

          if (tablesWithSuccess.length > 0) {
            const logLevel = isFailure ? 'error' : 'info';
            logger[logLevel](`[sync:v2] 📊 Tables with successful operations:`,
              tablesWithSuccess.map(t => ({
                table: t.table,
                pushSuccesses: t.push_successes,
                pullSuccesses: t.pull_successes
              }))
            );
          }

          if (tablesWithErrors.length > 0) {
            const logLevel = isFailure ? 'error' : 'info';
            logger[logLevel](`[sync:v2] 🚨 Tables with errors:`,
              tablesWithErrors.map(t => ({
                table: t.table,
                pushErrors: t.push_errors,
                pullErrors: t.pull_errors,
                pushAttempted: t.push_attempted,
                pullAttempted: t.pull_attempted
              }))
            );
          }
        }

        // Log specific detailed errors if available
        if (metadata.detailed_errors && metadata.detailed_errors.length > 0) {
          const logLevel = isFailure ? 'error' : 'info';
          logger[logLevel](`[sync:v2] 🔍 Detailed error breakdown:`, metadata.detailed_errors);
        }
      } else {
        // Fallback for responses without metadata
        const logLevel = res.success ? 'debug' : 'error';
        logger[logLevel](`[sync:v2] ${res.success ? '✅' : '❌'} Sync ${res.success ? 'completed' : 'failed'}:`, {
          correlationId: res.correlationId,
          pushed: res.pushed,
          pulled: res.pulled,
          tables: res.tables,
          errors: res.errors
        });
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
  hasChangesToSync: () => Promise<boolean>;
} = {
  getSyncStatus: () => getSyncServiceInstance().getSyncStatus(),
  onSyncStatusChange: (listener: (status: SyncStatus) => void) => getSyncServiceInstance().onSyncStatusChange(listener),
  clearErrors: () => getSyncServiceInstance().clearErrors(),
  sync: (force?: boolean) => getSyncServiceInstance().sync(force),
  hasChangesToSync: () => Promise.resolve(false) // V2 doesn't track this granularly
};