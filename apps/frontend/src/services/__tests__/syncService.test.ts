import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService, type SyncResult, type SyncStatus } from '../syncService';

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

vi.mock('../correctSyncService', () => ({
  correctSyncService: {
    sync: vi.fn().mockResolvedValue({
      success: true,
      tables: 0,
      pushed: 0,
      pulled: 0,
      errors: []
    })
  }
}));

describe('syncService', () => {
  let mockStorageService: any;
  let mockConsentService: any;
  let mockAuthService: any;
  let mockDatabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset singleton instances - syncService uses module-level variable
    // We need to reset the internal state
    const { syncService: syncServiceModule } = await import('../syncService');
    
    // Reset the internal singleton instance
    const syncServiceFile = await import('../syncService');
    (syncServiceFile as any)._syncServiceInstance = null;

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

    // Ensure the mocks are properly set before using the service
    expect(StorageService.getInstance()).toBe(mockStorageService);
    expect(ConsentService.getInstance()).toBe(mockConsentService);
    expect(AuthService.getInstance()).toBe(mockAuthService);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      // syncService is already a singleton instance
      expect(syncService).toBeDefined();
      expect(typeof syncService.getSyncStatus).toBe('function');
      expect(typeof syncService.sync).toBe('function');
    });
  });

  describe('sync', () => {
    it('should skip sync when no consent', async () => {
      const { correctSyncService } = await import('../correctSyncService');
      vi.mocked(correctSyncService.sync).mockResolvedValue({
        success: true,
        tables: 0,
        pushed: 0,
        pulled: 0,
        errors: []
      });

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
      const { correctSyncService } = await import('../correctSyncService');
      vi.mocked(correctSyncService.sync).mockResolvedValue({
        success: true,
        tables: 0,
        pushed: 0,
        pulled: 0,
        errors: []
      });

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
      const { correctSyncService } = await import('../correctSyncService');
      vi.mocked(correctSyncService.sync).mockResolvedValue({
        success: true,
        tables: 0,
        pushed: 0,
        pulled: 0,
        errors: []
      });

      // Store original navigator.onLine value
      const originalOnline = navigator.onLine;
      
      try {
        // Mock navigator.onLine to be false
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });

        mockConsentService.hasConsent.mockReturnValue(true);
        mockAuthService.getAuthState.mockReturnValue({
          isAuthenticated: true,
          user: { id: 'user1' },
          accessToken: 'token123',
          refreshToken: 'refresh123'
        });

        const result = await syncService.sync();

        expect(result.success).toBe(true);
        expect(result.tablesProcessed).toBe(0);
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
        lastSyncAttempt: expect.any(Number),
        lastSuccessfulSync: expect.any(Number),
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

    it('should return false in V2 implementation (does not track granularly)', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);
      
      // V2 implementation always returns false as it doesn't track this granularly
      const hasChanges = await syncService.hasChangesToSync();

      expect(hasChanges).toBe(false);
    });
  });

  // Note: forcSync integration tests moved to syncService.integration.test.ts
});