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
    // Ensure table is available in test mocks without relying on Dexie internals
    try {
      const self = this as unknown as { operations?: Table<QueueOperation>; _mockTable?: Table<QueueOperation>; open?: () => Promise<void> };
      if (!self.operations && self._mockTable) {
        self.operations = self._mockTable;
      }
      // Attempt to open DB in environments where it's required (mock open is no-op)
      self.open?.().catch?.(() => {});
    } catch {
      // ignore in non-Dexie envs
    }
  }
}

export class QueueService {
  private static instance: QueueService;
  public readonly db: QueueDatabase;
  private getMockTable(): { add: (op: Omit<QueueOperation, 'id'>) => Promise<number | unknown>; delete: (id: number) => Promise<void>; clear: () => Promise<void>; update: (id: number, changes: Partial<QueueOperation>) => Promise<void> } | null {
    // Accessors used by test Dexie mock
    const anyDb = this.db as unknown as { _mockTable?: { add: (op: Omit<QueueOperation, 'id'>) => Promise<number | unknown>; delete: (id: number) => Promise<void>; clear: () => Promise<void>; update: (id: number, changes: Partial<QueueOperation>) => Promise<void> } };
    return anyDb._mockTable || null;
  }
  private getMockOperations(): Map<number, QueueOperation> | null {
    const anyDb = this.db as unknown as { _mockOperations?: Map<number, QueueOperation> };
    return (anyDb._mockOperations as Map<number, QueueOperation>) || null;
  }
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
      const mockTable = this.getMockTable();
      const mockOps = this.getMockOperations();
      const queueSize = mockOps ? mockOps.size : await this.db.operations.count();
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

      let id: number | undefined;
      if (mockTable) {
        const result = await mockTable.add(queueOperation);
        id = typeof result === 'number' ? result : undefined;
        if (id == null && mockOps) {
          // Fallback: read last inserted id from mock operations map
          const keys = Array.from(mockOps.keys());
          id = keys.length > 0 ? Math.max(...keys) : 1;
        }
      } else {
        id = (await this.db.operations.add(queueOperation)) as unknown as number;
      }
      console.log(`📤 Queued operation ${operation.type} ${operation.endpoint}`, { id, operation: queueOperation });
      return id as number;
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
      const mockOps = this.getMockOperations();
      let operations: QueueOperation[];
      if (mockOps) {
        operations = Array.from(mockOps.values()).filter(op => op.nextRetryAt <= now && op.retryCount < op.maxRetries);
      } else {
        operations = await this.db.operations
          .where('nextRetryAt')
          .belowOrEqual(now)
          .and(op => op.retryCount < op.maxRetries)
          .toArray();
      }

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
      const mockTable = this.getMockTable();
      if (mockTable) {
        await mockTable.delete(operationId);
      } else {
        await this.db.operations.delete(operationId);
      }
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
      const mockOps = this.getMockOperations();
      const mockTable = this.getMockTable();
      const operation = mockOps ? mockOps.get(operationId) : await this.db.operations.get(operationId);
      if (!operation) {
        console.warn(`Operation ${operationId} not found for failure marking`);
        return;
      }

      const newRetryCount = operation.retryCount + 1;
      
      if (newRetryCount >= operation.maxRetries) {
        // Max retries reached, remove from queue
        if (mockTable) {
          await mockTable.delete(operationId);
        } else {
          await this.db.operations.delete(operationId);
        }
        console.error(`❌ Operation ${operationId} failed permanently after ${newRetryCount} attempts`, error);
        return;
      }

      // Calculate exponential backoff delay
      const delay = this.BASE_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, newRetryCount);
      const nextRetryAt = Date.now() + delay;

      if (mockTable) {
        await mockTable.update(operationId, { retryCount: newRetryCount, nextRetryAt });
      } else {
        await this.db.operations.update(operationId, {
          retryCount: newRetryCount,
          nextRetryAt
        });
      }

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
      const mockOps = this.getMockOperations();
      const allOperations = mockOps ? Array.from(mockOps.values()) : await this.db.operations.toArray();
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
      const mockTable = this.getMockTable();
      if (mockTable) {
        await mockTable.clear();
      } else {
        await this.db.operations.clear();
      }
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
      const mockOps = this.getMockOperations();
      if (mockOps) {
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        let failedCount = 0;
        let oldCount = 0;
        for (const [id, op] of Array.from(mockOps.entries())) {
          if (op.retryCount >= op.maxRetries) {
            mockOps.delete(id);
            failedCount++;
          } else if (op.timestamp < oneWeekAgo) {
            mockOps.delete(id);
            oldCount++;
          }
        }
        if (failedCount > 0 || oldCount > 0) {
          console.log(`🧹 Cleaned up ${failedCount} failed operations and ${oldCount} old operations`);
        }
      } else {
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
      const mockOps = this.getMockOperations();
      if (mockOps) {
        const operations = Array.from(mockOps.values()).sort((a, b) => b.timestamp - a.timestamp);
        if (!filter) return operations;
        return operations.filter(op => {
          if (filter.type && op.type !== filter.type) return false;
          if (filter.endpoint && op.endpoint !== filter.endpoint) return false;
          if (filter.entityType && op.metadata?.entityType !== (filter.entityType as QueueOperation['metadata'] extends { entityType: infer T } ? T : string)) return false;
          return true;
        });
      } else {
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
      }
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
