import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService, type SyncResult, type SyncStatus } from '../syncService';

// Mock dependencies
vi.mock('../storageService', () => ({
  StorageService: {
    getInstance: vi.fn()
  }
}));

vi.mock('../consentService', () => ({
  ConsentService: {
    getInstance: vi.fn()
  }
}));

vi.mock('../authService', () => ({
  AuthService: {
    getInstance: vi.fn()
  }
}));

const mockSupabaseResponse = {
  data: {
    changes: {
      exercises: { upserts: [], deletes: [] },
      activity_logs: { upserts: [], deletes: [] },
      user_preferences: { upserts: [], deletes: [] },
      app_settings: { upserts: [], deletes: [] },
      workouts: { upserts: [], deletes: [] },
      workout_sessions: { upserts: [], deletes: [] }
    },
    cursor: new Date().toISOString()
  },
  error: null
};

vi.mock('../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue(mockSupabaseResponse)
    }
  }
}));

describe('SyncService', () => {
  let syncService: SyncService;
  let mockStorageService: any;
  let mockConsentService: any;
  let mockAuthService: any;
  let mockDatabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset singleton instances
    (SyncService as any).instance = undefined;

    // Reset other singleton instances too
    const StorageServiceClass = (await import('../storageService')).StorageService;
    const ConsentServiceClass = (await import('../consentService')).ConsentService;
    const AuthServiceClass = (await import('../authService')).AuthService;
    
    // Clear any existing singleton instances
    (StorageServiceClass as any).instance = undefined;
    (ConsentServiceClass as any).instance = undefined;
    (AuthServiceClass as any).instance = undefined;

    // Mock StorageService
    mockDatabase = {
        exercises: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        },
        activity_logs: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        },
        user_preferences: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        },
        app_settings: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        },
        workouts: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        },
        workout_sessions: {
          where: vi.fn(() => ({
            equals: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
              count: vi.fn().mockResolvedValue(0),
              modify: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        }
    };

    mockStorageService = {
      getDatabase: vi.fn().mockReturnValue(mockDatabase),
      claimOwnership: vi.fn().mockResolvedValue(true)
    };

    // Mock ConsentService
    mockConsentService = {
      hasConsent: vi.fn().mockReturnValue(true)
    };

    // Mock AuthService
    mockAuthService = {
      getAuthState: vi.fn().mockReturnValue({
        isAuthenticated: false,
        user: undefined,
        accessToken: undefined,
        refreshToken: undefined
      }),
      onAuthStateChange: vi.fn(() => () => {})
    };

    // Setup the mocked getInstance methods
    const { StorageService } = await import('../storageService');
    const { ConsentService } = await import('../consentService');
    const { AuthService } = await import('../authService');
    
    vi.mocked(StorageService.getInstance).mockReturnValue(mockStorageService);
    vi.mocked(ConsentService.getInstance).mockReturnValue(mockConsentService);
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);

    // Ensure the mocks are properly set before creating the service
    expect(StorageService.getInstance()).toBe(mockStorageService);
    expect(ConsentService.getInstance()).toBe(mockConsentService);
    expect(AuthService.getInstance()).toBe(mockAuthService);

    syncService = SyncService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SyncService.getInstance();
      const instance2 = SyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sync', () => {
    it('should skip sync when no consent', async () => {
      mockConsentService.hasConsent.mockReturnValue(false);

      const result = await syncService.sync();

      expect(result).toEqual({
        success: true,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: []
      });
    });

    it('should skip sync when not authenticated', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: false,
        user: undefined,
        accessToken: undefined,
        refreshToken: undefined
      });

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.tablesProcessed).toBe(0);
    });

    it('should skip sync when offline', async () => {
      // Store original navigator.onLine value
      const originalOnline = navigator.onLine;
      
      try {
        // Mock navigator.onLine to be false BEFORE creating the SyncService instance
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });

        // Reset singleton to force new instance creation with false onLine value
        (SyncService as any).instance = undefined;
        
        // Create a new SyncService instance that will read the false onLine value
        syncService = SyncService.getInstance();

        mockConsentService.hasConsent.mockReturnValue(true);
        mockAuthService.getAuthState.mockReturnValue({
          isAuthenticated: true,
          user: { id: 'user1' },
          accessToken: 'token123',
          refreshToken: 'refresh123'
        });
        
        // Trigger the offline event to update the sync service's internal state
        const offlineEvent = new Event('offline');
        window.dispatchEvent(offlineEvent);

        // Wait for the event to be processed
        await new Promise(resolve => setTimeout(resolve, 0));

        const result = await syncService.sync();

        expect(result.success).toBe(true);
        expect(result.errors).toContain('Device is offline');
      } finally {
        // Restore original navigator.onLine value
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: originalOnline
        });
      }
    });

    // Note: Full sync integration tests moved to syncService.integration.test.ts
  });

  describe('status management', () => {
    it('should return correct sync status', () => {
      const status = syncService.getSyncStatus();

      expect(status).toEqual({
        isOnline: expect.any(Boolean),
        isSyncing: false,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        hasChangesToSync: false,
        errors: []
      });
    });

    it('should add and remove status listeners', () => {
      const listener = vi.fn();

      const unsubscribe = syncService.onSyncStatusChange(listener);

      // Should call listener immediately
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        isOnline: expect.any(Boolean),
        isSyncing: false
      }));

      // Should allow unsubscribe
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('hasChangesToSync', () => {
    it('should return false when no consent', async () => {
      mockConsentService.hasConsent.mockReturnValue(false);

      const hasChanges = await syncService.hasChangesToSync();

      expect(hasChanges).toBe(false);
    });

    it('should return false when no dirty records', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);

      const hasChanges = await syncService.hasChangesToSync();

      expect(hasChanges).toBe(false);
    });

    it('should return true when there are dirty records', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);
      
      // Mock one table to have dirty records
      // Set up the full chain: where('dirty').equals(true).count()
      const mockCount = vi.fn().mockResolvedValue(1);
      const mockEquals = vi.fn().mockReturnValue({ count: mockCount, toArray: vi.fn(), modify: vi.fn() });
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals });
      
      mockDatabase.exercises.where = mockWhere;

      const hasChanges = await syncService.hasChangesToSync();

      // Verify the call chain was used correctly
      expect(mockWhere).toHaveBeenCalledWith('dirty');
      expect(mockEquals).toHaveBeenCalledWith(true);
      expect(mockCount).toHaveBeenCalled();
      expect(hasChanges).toBe(true);
    });
  });

  // Note: forcSync integration tests moved to syncService.integration.test.ts
});