import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueService, type QueueOperation } from '../queueService';

// Mock Dexie
vi.mock('dexie', () => {
  // Create a shared mock operations storage
  const mockOperations = new Map<number, any>();
  let nextId = 1;

  const mockTable = {
    add: vi.fn().mockImplementation(async (operation) => {
      const id = nextId++;
      mockOperations.set(id, { ...operation, id });
      return Promise.resolve(id);
    }),
    get: vi.fn().mockImplementation(async (id) => {
      return Promise.resolve(mockOperations.get(id));
    }),
    update: vi.fn().mockImplementation(async (id, updates) => {
      const existing = mockOperations.get(id);
      if (existing) {
        mockOperations.set(id, { ...existing, ...updates });
      }
      return Promise.resolve(1);
    }),
    delete: vi.fn().mockImplementation(async (id) => {
      const deleted = mockOperations.delete(id);
      return Promise.resolve(deleted ? 1 : 0);
    }),
    clear: vi.fn().mockImplementation(async () => {
      mockOperations.clear();
      return Promise.resolve();
    }),
    count: vi.fn().mockImplementation(async () => {
      return Promise.resolve(mockOperations.size);
    }),
    toArray: vi.fn().mockImplementation(async () => {
      return Promise.resolve(Array.from(mockOperations.values()));
    }),
    where: vi.fn().mockImplementation(() => ({
      belowOrEqual: vi.fn().mockReturnValue({
        and: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => {
            const now = Date.now();
            return Promise.resolve(
              Array.from(mockOperations.values()).filter(
                op => op.nextRetryAt <= now && op.retryCount < op.maxRetries
              )
            );
          })
        })
      }),
      below: vi.fn().mockReturnValue({
        delete: vi.fn().mockImplementation(async () => Promise.resolve(0))
      }),
      aboveOrEqual: vi.fn().mockReturnValue({
        and: vi.fn().mockReturnValue({
          delete: vi.fn().mockImplementation(async () => Promise.resolve(0))
        })
      })
    })),
    orderBy: vi.fn().mockImplementation(() => ({
      toArray: vi.fn().mockImplementation(async () => {
        const values = Array.from(mockOperations.values());
        return Promise.resolve(values.sort((a, b) => {
          // Sort by priority then timestamp
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          return a.timestamp - b.timestamp; // Earlier timestamp first
        }));
      })
    }))
  };

  class MockDexie {
    operations = mockTable; // Make sure operations is properly set!
    _mockOperations = mockOperations;
    _mockTable = mockTable;
    
    constructor(name: string) {
      // Set the operations table explicitly after construction
      Object.defineProperty(this, 'operations', {
        value: mockTable,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    
    version() {
      return {
        stores: () => {
          // Ensure operations is set here too
          this.operations = mockTable;
          return this;
        }
      };
    }
    
    async open() {
      return undefined;
    }
    
    async close() {
      return undefined;
    }
    
    _resetMock() {
      mockOperations.clear();
      nextId = 1;
    }
  }

  return { 
    default: MockDexie
  };
});

describe('QueueService', () => {
  let queueService: QueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (QueueService as any).instance = undefined;
    queueService = QueueService.getInstance();
    
    // Clear mock data
    const mockDb = (queueService as any).db;
    if (mockDb && mockDb._resetMock) {
      mockDb._resetMock();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = QueueService.getInstance();
      const instance2 = QueueService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('enqueue', () => {
    it('should add operation to queue with correct defaults', async () => {
      const operation = {
        type: 'POST' as const,
        endpoint: '/api/exercises',
        data: { name: 'Test Exercise' },
        priority: 'high' as const,
        maxRetries: 3
      };

      const id = await queueService.enqueue(operation);

      expect(id).toBe(1);
      
      const mockDb = (queueService as any).db;
      expect(mockDb._mockTable.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'POST',
          endpoint: '/api/exercises',
          data: { name: 'Test Exercise' },
          priority: 'high',
          maxRetries: 3,
          retryCount: 0,
          timestamp: expect.any(Number),
          nextRetryAt: expect.any(Number)
        })
      );
    });

    it('should use default maxRetries when not provided', async () => {
      const operation = {
        type: 'PUT' as const,
        endpoint: '/api/exercises/1',
        priority: 'medium' as const
      };

      await queueService.enqueue(operation);

      const mockDb = (queueService as any).db;
      expect(mockDb._mockTable.add).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 5 // DEFAULT_MAX_RETRIES
        })
      );
    });
  });

  describe('getNextOperations', () => {
    it('should return operations ready for processing', async () => {
      const mockDb = (queueService as any).db;
      const now = Date.now();
      
      // Mock operations
      const readyOp1 = { id: 1, nextRetryAt: now - 1000, retryCount: 0, maxRetries: 3, priority: 'high', timestamp: now - 5000 };
      const readyOp2 = { id: 2, nextRetryAt: now - 500, retryCount: 1, maxRetries: 3, priority: 'medium', timestamp: now - 3000 };

      mockDb._mockOperations.set(1, readyOp1);
      mockDb._mockOperations.set(2, readyOp2);

      const operations = await queueService.getNextOperations(10);

      expect(operations).toHaveLength(2);
      expect(operations[0]).toEqual(readyOp1); // High priority first
      expect(operations[1]).toEqual(readyOp2);
    });
  });

  describe('markSuccess', () => {
    it('should remove operation from queue', async () => {
      const mockDb = (queueService as any).db;
      const operationId = 1;

      await queueService.markSuccess(operationId);

      expect(mockDb._mockTable.delete).toHaveBeenCalledWith(operationId);
    });
  });

  describe('markFailure', () => {
    it('should increment retry count and schedule next retry', async () => {
      const mockDb = (queueService as any).db;
      const operationId = 1;
      const operation = {
        id: operationId,
        retryCount: 1,
        maxRetries: 3,
        nextRetryAt: Date.now()
      };

      mockDb._mockOperations.set(operationId, operation);

      await queueService.markFailure(operationId, 'Network error');

      expect(mockDb._mockTable.update).toHaveBeenCalledWith(operationId, {
        retryCount: 2,
        nextRetryAt: expect.any(Number)
      });
    });

    it('should remove operation when max retries reached', async () => {
      const mockDb = (queueService as any).db;
      const operationId = 1;
      const operation = {
        id: operationId,
        retryCount: 2,
        maxRetries: 3,
        nextRetryAt: Date.now()
      };

      mockDb._mockOperations.set(operationId, operation);

      await queueService.markFailure(operationId, 'Final failure');

      expect(mockDb._mockTable.delete).toHaveBeenCalledWith(operationId);
      expect(mockDb._mockTable.update).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mockDb = (queueService as any).db;
      const now = Date.now();
      
      const operations = [
        { id: 1, retryCount: 0, maxRetries: 3, nextRetryAt: now - 1000 }, // pending
        { id: 2, retryCount: 1, maxRetries: 3, nextRetryAt: now + 5000 }, // waiting for retry
        { id: 3, retryCount: 3, maxRetries: 3, nextRetryAt: now - 1000 }   // failed
      ];

      operations.forEach(op => mockDb._mockOperations.set(op.id, op));

      const stats = await queueService.getStats();

      expect(stats.totalOperations).toBe(3);
      expect(stats.pendingOperations).toBe(1);
      expect(stats.failedOperations).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all operations', async () => {
      const mockDb = (queueService as any).db;

      await queueService.clear();

      expect(mockDb._mockTable.clear).toHaveBeenCalled();
    });
  });

  describe('hasPendingOperations', () => {
    it('should return true when pending operations exist', async () => {
      vi.spyOn(queueService, 'getStats').mockResolvedValue({
        totalOperations: 2,
        pendingOperations: 1,
        failedOperations: 0,
        successfulOperations: 0
      });

      const hasPending = await queueService.hasPendingOperations();

      expect(hasPending).toBe(true);
    });

    it('should return false when no pending operations', async () => {
      vi.spyOn(queueService, 'getStats').mockResolvedValue({
        totalOperations: 1,
        pendingOperations: 0,
        failedOperations: 1,
        successfulOperations: 0
      });

      const hasPending = await queueService.hasPendingOperations();

      expect(hasPending).toBe(false);
    });
  });
});
