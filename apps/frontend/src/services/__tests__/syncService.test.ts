import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService, type SyncResult, type SyncStatus } from '../syncService';
import { QueueService } from '../queueService';
import { StorageService } from '../storageService';
import { ConsentService } from '../consentService';

// Mock dependencies
vi.mock('../queueService');
vi.mock('../storageService');
vi.mock('../consentService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockQueueService: any;
  let mockStorageService: any;
  let mockConsentService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset singleton instances
    (SyncService as any).instance = undefined;
    
    // Mock QueueService
    mockQueueService = {
      enqueue: vi.fn().mockResolvedValue(1),
      getNextOperations: vi.fn().mockResolvedValue([]),
      markSuccess: vi.fn().mockResolvedValue(undefined),
      markFailure: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalOperations: 0,
        pendingOperations: 0,
        failedOperations: 0,
        successfulOperations: 0
      }),
      clear: vi.fn().mockResolvedValue(undefined),
      getNextRetryTime: vi.fn().mockResolvedValue(null)
    };

    // Mock StorageService
    mockStorageService = {
      saveExercise: vi.fn().mockResolvedValue(undefined),
      saveActivityLog: vi.fn().mockResolvedValue(undefined),
      saveAppSettings: vi.fn().mockResolvedValue(undefined),
      deleteExercise: vi.fn().mockResolvedValue(undefined),
      deleteActivityLog: vi.fn().mockResolvedValue(undefined)
    };

    // Mock ConsentService
    mockConsentService = {
      hasConsent: vi.fn().mockReturnValue(true)
    };

    // Mock getInstance methods
    vi.mocked(QueueService.getInstance).mockReturnValue(mockQueueService);
    vi.mocked(StorageService.getInstance).mockReturnValue(mockStorageService);
    vi.mocked(ConsentService.getInstance).mockReturnValue(mockConsentService);

    // Mock global objects
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    
    global.window = {
      addEventListener: vi.fn(),
      ServiceWorkerRegistration: {
        prototype: { sync: {} }
      }
    } as any;

    global.navigator = {
      ...global.navigator,
      onLine: true,
      serviceWorker: {
        ready: Promise.resolve({
          sync: {
            register: vi.fn().mockResolvedValue(undefined)
          }
        })
      }
    } as any;

    syncService = SyncService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SyncService.getInstance();
      const instance2 = SyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('queueOperation', () => {
    it('should queue operation successfully', async () => {
      const operationId = await syncService.queueOperation(
        'POST',
        '/api/exercises',
        { name: 'Test Exercise' },
        { priority: 'high', metadata: { entityType: 'exercise', operation: 'create' } }
      );

      expect(operationId).toBe(1);
      expect(mockQueueService.enqueue).toHaveBeenCalledWith({
        type: 'POST',
        endpoint: '/api/exercises',
        data: { name: 'Test Exercise' },
        priority: 'high',
        metadata: { entityType: 'exercise', operation: 'create' }
      });
    });

    it('should use default priority when not specified', async () => {
      await syncService.queueOperation('PUT', '/api/exercises/1', { name: 'Updated' });

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium'
        })
      );
    });
  });

  describe('sync', () => {
    it('should skip sync when no consent', async () => {
      mockConsentService.hasConsent.mockReturnValue(false);

      const result = await syncService.sync();

      expect(result).toEqual({
        success: true,
        processedOperations: 0,
        failedOperations: 0,
        errors: []
      });
      expect(mockQueueService.getNextOperations).not.toHaveBeenCalled();
    });

    it('should skip sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      (syncService as any).isOnline = false;

      const result = await syncService.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Device is offline');
      expect(mockQueueService.getNextOperations).not.toHaveBeenCalled();
    });

    it('should process operations successfully', async () => {
      const mockOperations = [
        {
          id: 1,
          type: 'POST',
          endpoint: '/api/exercises',
          data: { name: 'Test Exercise' },
          metadata: { entityType: 'exercise', operation: 'create' }
        }
      ];

      mockQueueService.getNextOperations.mockResolvedValue(mockOperations);

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.processedOperations).toBe(1);
      expect(result.failedOperations).toBe(0);
      expect(mockStorageService.saveExercise).toHaveBeenCalledWith({ name: 'Test Exercise' });
      expect(mockQueueService.markSuccess).toHaveBeenCalledWith(1);
    });

    it('should handle operation failures', async () => {
      const mockOperations = [
        {
          id: 1,
          type: 'POST',
          endpoint: '/api/exercises',
          data: { name: 'Test Exercise' },
          metadata: { entityType: 'exercise', operation: 'create' }
        }
      ];

      mockQueueService.getNextOperations.mockResolvedValue(mockOperations);
      mockStorageService.saveExercise.mockRejectedValue(new Error('Storage error'));

      const result = await syncService.sync();

      expect(result.success).toBe(false);
      expect(result.processedOperations).toBe(0);
      expect(result.failedOperations).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockQueueService.markFailure).toHaveBeenCalledWith(1, 'Storage error');
    });
  });

  describe('operation processing', () => {
    it('should handle POST exercise operation', async () => {
      const operation = {
        id: 1,
        type: 'POST' as const,
        endpoint: '/api/exercises',
        data: { name: 'Test Exercise' },
        metadata: { entityType: 'exercise' as const, operation: 'create' }
      };

      const result = await (syncService as any).processOperation(operation);

      expect(result.success).toBe(true);
      expect(mockStorageService.saveExercise).toHaveBeenCalledWith({ name: 'Test Exercise' });
    });

    it('should handle PUT activity log operation', async () => {
      const operation = {
        id: 1,
        type: 'PUT' as const,
        endpoint: '/api/activity-logs/1',
        data: { exerciseId: '1', duration: 30 },
        metadata: { entityType: 'activityLog' as const, operation: 'update' }
      };

      const result = await (syncService as any).processOperation(operation);

      expect(result.success).toBe(true);
      expect(mockStorageService.saveActivityLog).toHaveBeenCalledWith({ exerciseId: '1', duration: 30 });
    });

    it('should handle DELETE exercise operation', async () => {
      const operation = {
        id: 1,
        type: 'DELETE' as const,
        endpoint: '/api/exercises/exercise-1',
        metadata: { entityType: 'exercise' as const, entityId: 'exercise-1', operation: 'delete' }
      };

      const result = await (syncService as any).processOperation(operation);

      expect(result.success).toBe(true);
      expect(mockStorageService.deleteExercise).toHaveBeenCalledWith('exercise-1');
    });

    it('should handle unknown operation type', async () => {
      const operation = {
        id: 1,
        type: 'PATCH' as any,
        endpoint: '/api/exercises/1',
        data: {},
        metadata: { entityType: 'exercise' as const, operation: 'patch' }
      };

      const result = await (syncService as any).processOperation(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown operation type: PATCH');
    });
  });

  describe('status management', () => {
    it('should return correct sync status', () => {
      const status = syncService.getSyncStatus();

      expect(status).toEqual({
        isOnline: true,
        isSyncing: false,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        pendingOperations: 0,
        errors: []
      });
    });

    it('should add and remove status listeners', async () => {
      const listener = vi.fn();
      
      const unsubscribe = syncService.addStatusListener(listener);
      
      // Should call listener immediately
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      
      // Verify listener is removed
      const listenerCount = (syncService as any).listeners.length;
      expect(listenerCount).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should clear sync data', async () => {
      await syncService.clearSyncData();

      expect(mockQueueService.clear).toHaveBeenCalled();
    });

    it('should force sync', async () => {
      const result = await syncService.forcSync();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should get next retry time', async () => {
      mockQueueService.getNextRetryTime.mockResolvedValue(Date.now() + 5000);

      const nextRetry = await syncService.getNextRetryTime();

      expect(nextRetry).toBeDefined();
      expect(mockQueueService.getNextRetryTime).toHaveBeenCalled();
    });
  });
});
