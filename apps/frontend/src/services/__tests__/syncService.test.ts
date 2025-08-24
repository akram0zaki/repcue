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

vi.mock('../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('SyncService', () => {
  let syncService: SyncService;
  let mockStorageService: any;
  let mockConsentService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset singleton instances
    (SyncService as any).instance = undefined;

    // Mock StorageService
    mockStorageService = {
      getDatabase: vi.fn(() => ({
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
      })),
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
      mockConsentService.hasConsent.mockReturnValue(true);
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'user1' },
        accessToken: 'token123',
        refreshToken: 'refresh123'
      });

      // Mock navigator.onLine to be false
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.errors).toContain('Device is offline');
    });

    it('should return success when authenticated but no changes to sync', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'user1' },
        accessToken: 'token123',
        refreshToken: 'refresh123'
      });

      // Mock navigator.onLine to be true
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Mock supabase functions call to return empty response
      const mockSupabase = {
        functions: {
          invoke: vi.fn().mockResolvedValue({
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
          })
        }
      };

      vi.mocked(require('../config/supabase').supabase).functions = mockSupabase.functions;

      const result = await syncService.sync();

      expect(result.success).toBe(true);
      expect(result.tablesProcessed).toBe(6);
      expect(result.recordsPushed).toBe(0);
      expect(result.recordsPulled).toBe(0);
    });
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
      mockStorageService.getDatabase().exercises.where().equals().count.mockResolvedValue(1);

      const hasChanges = await syncService.hasChangesToSync();

      expect(hasChanges).toBe(true);
    });
  });

  describe('forcSync', () => {
    it('should force sync even when already syncing', async () => {
      mockConsentService.hasConsent.mockReturnValue(true);
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'user1' },
        accessToken: 'token123',
        refreshToken: 'refresh123'
      });

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const mockSupabase = {
        functions: {
          invoke: vi.fn().mockResolvedValue({
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
          })
        }
      };

      vi.mocked(require('../config/supabase').supabase).functions = mockSupabase.functions;

      const result = await syncService.forcSync();

      expect(result.success).toBe(true);
    });
  });
});