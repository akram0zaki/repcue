import Dexie, { type Table } from 'dexie';

// Queue operation types
export interface QueueOperation {
  id?: number;
  type: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    entityType: 'exercise' | 'activityLog' | 'settings';
    entityId?: string;
    operation: string;
  };
}

export interface QueueStats {
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  successfulOperations: number;
  lastSyncAttempt?: number;
  nextRetryAt?: number;
}

class QueueDatabase extends Dexie {
  operations!: Table<QueueOperation>;

  constructor() {
    super('RepCueQueue');
    this.version(1).stores({
      operations: '++id, timestamp, nextRetryAt, priority, type, endpoint'
    });
  }
}

export class QueueService {
  private static instance: QueueService;
  private db: QueueDatabase;
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly DEFAULT_MAX_RETRIES = 5;
  private readonly BACKOFF_MULTIPLIER = 2;
  private readonly BASE_DELAY = 1000; // 1 second

  private constructor() {
    this.db = new QueueDatabase();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retryCount' | 'nextRetryAt' | 'maxRetries'> & { maxRetries?: number }): Promise<number> {
    try {
      // Check queue size limit
      const queueSize = await this.db.operations.count();
      if (queueSize >= this.MAX_QUEUE_SIZE) {
        await this.cleanup();
      }

      const queueOperation: Omit<QueueOperation, 'id'> = {
        ...operation,
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
        maxRetries: operation.maxRetries || this.DEFAULT_MAX_RETRIES
      };

      const id = await this.db.operations.add(queueOperation);
      console.log(`📤 Queued operation ${operation.type} ${operation.endpoint}`, { id, operation: queueOperation });
      return id;
    } catch (error) {
      console.error('Failed to enqueue operation:', error);
      throw error;
    }
  }

  /**
   * Get next operations ready for processing
   */
  async getNextOperations(limit: number = 10): Promise<QueueOperation[]> {
    try {
      const now = Date.now();
      const operations = await this.db.operations
        .where('nextRetryAt')
        .belowOrEqual(now)
        .and(op => op.retryCount < op.maxRetries)
        .toArray();

      // Sort by priority (high > medium > low) then by timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return operations
        .sort((a, b) => {
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.timestamp - b.timestamp; // Older operations first
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get next operations:', error);
      return [];
    }
  }

  /**
   * Mark operation as successful and remove from queue
   */
  async markSuccess(operationId: number): Promise<void> {
    try {
      await this.db.operations.delete(operationId);
      console.log(`✅ Operation ${operationId} completed successfully`);
    } catch (error) {
      console.error(`Failed to mark operation ${operationId} as successful:`, error);
    }
  }

  /**
   * Mark operation as failed and schedule retry
   */
  async markFailure(operationId: number, error?: string): Promise<void> {
    try {
      const operation = await this.db.operations.get(operationId);
      if (!operation) {
        console.warn(`Operation ${operationId} not found for failure marking`);
        return;
      }

      const newRetryCount = operation.retryCount + 1;
      
      if (newRetryCount >= operation.maxRetries) {
        // Max retries reached, remove from queue
        await this.db.operations.delete(operationId);
        console.error(`❌ Operation ${operationId} failed permanently after ${newRetryCount} attempts`, error);
        return;
      }

      // Calculate exponential backoff delay
      const delay = this.BASE_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, newRetryCount);
      const nextRetryAt = Date.now() + delay;

      await this.db.operations.update(operationId, {
        retryCount: newRetryCount,
        nextRetryAt
      });

      console.warn(`⚠️ Operation ${operationId} failed (attempt ${newRetryCount}/${operation.maxRetries}). Next retry at ${new Date(nextRetryAt).toLocaleTimeString()}`, error);
    } catch (updateError) {
      console.error(`Failed to mark operation ${operationId} as failed:`, updateError);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    try {
      const allOperations = await this.db.operations.toArray();
      const now = Date.now();
      
      const pendingOperations = allOperations.filter(op => 
        op.retryCount < op.maxRetries && op.nextRetryAt <= now
      ).length;
      
      const failedOperations = allOperations.filter(op => 
        op.retryCount >= op.maxRetries
      ).length;

      const nextRetryAt = allOperations
        .filter(op => op.retryCount < op.maxRetries && op.nextRetryAt > now)
        .reduce((earliest, op) => 
          earliest ? Math.min(earliest, op.nextRetryAt) : op.nextRetryAt, 
          null as number | null
        );

      return {
        totalOperations: allOperations.length,
        pendingOperations,
        failedOperations,
        successfulOperations: 0, // We don't store successful operations
        nextRetryAt: nextRetryAt || undefined
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        totalOperations: 0,
        pendingOperations: 0,
        failedOperations: 0,
        successfulOperations: 0
      };
    }
  }

  /**
   * Clear all operations from queue
   */
  async clear(): Promise<void> {
    try {
      await this.db.operations.clear();
      console.log('🧹 Queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Remove failed operations and old entries
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      // Remove operations that have exceeded max retries
      const failedCount = await this.db.operations
        .where('retryCount')
        .aboveOrEqual(0)
        .and(op => op.retryCount >= op.maxRetries)
        .delete();

      // Remove very old operations (older than 1 week)
      const oldCount = await this.db.operations
        .where('timestamp')
        .below(oneWeekAgo)
        .delete();

      if (failedCount > 0 || oldCount > 0) {
        console.log(`🧹 Cleaned up ${failedCount} failed operations and ${oldCount} old operations`);
      }
    } catch (error) {
      console.error('Failed to cleanup queue:', error);
    }
  }

  /**
   * Get operations by type or endpoint
   */
  async getOperations(filter?: { 
    type?: QueueOperation['type']; 
    endpoint?: string; 
    entityType?: QueueOperation['metadata'] extends { entityType: infer T } ? T : string 
  }): Promise<QueueOperation[]> {
    try {
      const query = this.db.operations.orderBy('timestamp').reverse();
      
      if (filter) {
        const operations = await query.toArray();
        return operations.filter(op => {
          if (filter.type && op.type !== filter.type) return false;
          if (filter.endpoint && op.endpoint !== filter.endpoint) return false;
          if (filter.entityType && op.metadata?.entityType !== filter.entityType) return false;
          return true;
        });
      }
      
      return await query.toArray();
    } catch (error) {
      console.error('Failed to get operations:', error);
      return [];
    }
  }

  /**
   * Check if there are pending operations
   */
  async hasPendingOperations(): Promise<boolean> {
    try {
      const stats = await this.getStats();
      return stats.pendingOperations > 0;
    } catch (error) {
      console.error('Failed to check pending operations:', error);
      return false;
    }
  }

  /**
   * Get the next retry time for pending operations
   */
  async getNextRetryTime(): Promise<number | null> {
    try {
      const stats = await this.getStats();
      return stats.nextRetryAt || null;
    } catch (error) {
      console.error('Failed to get next retry time:', error);
      return null;
    }
  }
}

// Export singleton instance
export const queueService = QueueService.getInstance();
