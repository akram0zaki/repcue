import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkSync } from '../useNetworkSync';
import { useOfflineStatus } from '../useOfflineStatus';
import { SyncService } from '../../services/syncService';

// Mock SyncService
vi.mock('../../services/syncService', () => ({
  SyncService: {
    getInstance: vi.fn()
  }
}));

// Mock useOfflineStatus
vi.mock('../useOfflineStatus', () => ({
  useOfflineStatus: vi.fn()
}));

// Mock useAuth
vi.mock('../useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    user: undefined
  })
}));

describe('useNetworkSync', () => {
  let mockSyncService: any;
  let mockStatusListener: (status: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock SyncService
    mockSyncService = {
      getSyncStatus: vi.fn().mockReturnValue({
        isOnline: true,
        isSyncing: false,
        hasChangesToSync: false,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        errors: []
      }),
      onSyncStatusChange: vi.fn().mockImplementation((listener) => {
        mockStatusListener = listener;
        // Call listener immediately with initial status
        listener({
          isOnline: true,
          isSyncing: false,
          hasChangesToSync: false,
          lastSyncAttempt: undefined,
          lastSuccessfulSync: undefined,
          errors: []
        });
        return vi.fn(); // unsubscribe function
      }),
      sync: vi.fn().mockResolvedValue({
        success: true,
        tablesProcessed: 2,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: []
      })
    };

    // Apply the mock
    const MockedSyncService = vi.mocked(SyncService);
    MockedSyncService.getInstance.mockReturnValue(mockSyncService);

    // Mock useOfflineStatus
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOffline: false,
      isOnline: true,
      hasBeenOffline: false
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { 
      value: true, 
      writable: true 
    });

    // Mock window events
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useNetworkSync());

      expect(result.current.state).toEqual({
        isOnline: true,
        isSyncing: false,
        hasChangesToSync: false,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        errors: [],
        canSync: true
      });
    });

    it('should setup sync status listener', () => {
      renderHook(() => useNetworkSync());

      expect(mockSyncService.onSyncStatusChange).toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    it('should update state when sync status changes', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Simulate sync status change
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: true,
          hasChangesToSync: true,
          lastSyncAttempt: Date.now(),
          lastSuccessfulSync: undefined,
          errors: []
        });
      });

      expect(result.current.state.isSyncing).toBe(true);
      expect(result.current.state.hasChangesToSync).toBe(true);
      expect(result.current.state.canSync).toBe(false); // Can't sync when already syncing
    });

    it('should calculate canSync correctly', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Online and not syncing = can sync
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          hasChangesToSync: false,
          lastSyncAttempt: undefined,
          lastSuccessfulSync: undefined,
          errors: []
        });
      });

      expect(result.current.state.canSync).toBe(true);

      // Offline = can't sync
      act(() => {
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          hasChangesToSync: false,
          lastSyncAttempt: undefined,
          lastSuccessfulSync: undefined,
          errors: []
        });
      });

      expect(result.current.state.canSync).toBe(false);
    });
  });

  describe('Manual Sync', () => {
    it('should trigger sync successfully', async () => {
      const { result } = renderHook(() => useNetworkSync());

      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.sync).toHaveBeenCalled();
    });

    it('should handle sync when SyncService is not available', async () => {
      // Mock SyncService to be null
      vi.mocked(SyncService).getInstance.mockReturnValue(null as any);

      const { result } = renderHook(() => useNetworkSync());

      await act(async () => {
        await result.current.actions.triggerSync();
      });

      // Should not throw error
      expect(result.current).toBeDefined();
    });
  });

  describe('Actions', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set some errors first
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          hasChangesToSync: false,
          lastSyncAttempt: undefined,
          lastSuccessfulSync: undefined,
          errors: ['Some error']
        });
      });

      expect(result.current.state.errors).toEqual(['Some error']);

      // Clear errors
      act(() => {
        result.current.actions.clearErrors();
      });

      expect(result.current.state.errors).toEqual([]);
    });

    it('should retry sync when available', async () => {
      const { result } = renderHook(() => useNetworkSync());

      await act(async () => {
        await result.current.actions.retry();
      });

      expect(mockSyncService.sync).toHaveBeenCalledWith(true); // Force sync
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const unsubscribe = vi.fn();
      mockSyncService.onSyncStatusChange.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useNetworkSync());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SyncService initialization errors', () => {
      // Mock SyncService.getInstance to throw
      vi.mocked(SyncService).getInstance.mockImplementation(() => {
        throw new Error('SyncService init failed');
      });

      const { result } = renderHook(() => useNetworkSync());

      // Should still render without crashing
      expect(result.current.state).toEqual({
        isOnline: true,
        isSyncing: false,
        hasChangesToSync: false,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        errors: [],
        canSync: false
      });
    });
  });
});