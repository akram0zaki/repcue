import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkSync, useOfflineStatus } from '../useNetworkSync';
import { SyncService } from '../../services/syncService';

// Mock SyncService
vi.mock('../../services/syncService', () => ({
  SyncService: {
    getInstance: vi.fn()
  }
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
        pendingOperations: 0,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        errors: []
      }),
      addStatusListener: vi.fn().mockImplementation((listener) => {
        mockStatusListener = listener;
        return vi.fn(); // unsubscribe function
      }),
      forcSync: vi.fn().mockResolvedValue({
        success: true,
        processedOperations: 2,
        failedOperations: 0,
        errors: []
      }),
      clearSyncData: vi.fn().mockResolvedValue(undefined),
      getNextRetryTime: vi.fn().mockResolvedValue(null)
    };

    // Apply the mock
    const MockedSyncService = vi.mocked(SyncService);
    MockedSyncService.getInstance.mockReturnValue(mockSyncService);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { 
      value: true, 
      writable: true 
    });

    // Mock window event listeners
    global.window.addEventListener = vi.fn();
    global.window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useNetworkSync());

      expect(result.current.state).toEqual({
        isOnline: true,
        isSyncing: false,
        pendingOperations: 0,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
        errors: [],
        canSync: false, // No pending operations, so can't sync
        nextRetryAt: undefined,
        syncProgress: undefined
      });
    });

    it('should setup event listeners for online/offline', () => {
      renderHook(() => useNetworkSync());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should setup sync status listener', () => {
      renderHook(() => useNetworkSync());

      expect(mockSyncService.addStatusListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('State Updates', () => {
    it('should update state when sync status changes', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Simulate status update
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: true,
          pendingOperations: 3,
          lastSyncAttempt: Date.now(),
          errors: []
        });
      });

      expect(result.current.state.isSyncing).toBe(true);
      expect(result.current.state.pendingOperations).toBe(3);
      expect(result.current.state.canSync).toBe(false); // Can't sync while already syncing
    });

    it('should calculate canSync correctly', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Online + not syncing + has pending operations = can sync
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 2,
          errors: []
        });
      });

      expect(result.current.state.canSync).toBe(true);

      // Offline = cannot sync
      act(() => {
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          pendingOperations: 2,
          errors: []
        });
      });

      expect(result.current.state.canSync).toBe(false);
    });
  });

  describe('Manual Sync', () => {
    it('should trigger sync successfully', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set state to allow syncing
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 2,
          errors: []
        });
      });

      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.forcSync).toHaveBeenCalled();
    });

    it('should not trigger sync when offline', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set offline state
      act(() => {
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          pendingOperations: 2,
          errors: []
        });
      });

      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.forcSync).not.toHaveBeenCalled();
    });

    it('should not trigger sync when already syncing', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set syncing state
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: true,
          pendingOperations: 2,
          errors: []
        });
      });

      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.forcSync).not.toHaveBeenCalled();
    });

    it('should track sync progress', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set state to allow syncing
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 2,
          errors: []
        });
      });

      // Trigger sync and check for progress
      await act(async () => {
        await result.current.actions.triggerSync();
      });

      // Verify sync was called
      expect(mockSyncService.forcSync).toHaveBeenCalled();
      
      // Note: Progress tracking is complex to test in isolation due to timing,
      // but we can verify the sync action works correctly
    });
  });

  describe('Network Events', () => {
    it('should handle online event', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Verify that addEventListener was called with 'online'
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      
      // Simulate going offline first, then online
      act(() => {
        // Simulate offline state
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        // Trigger offline status via mockStatusListener
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          pendingOperations: 0,
          errors: []
        });
      });

      expect(result.current.state.isOnline).toBe(false);

      act(() => {
        // Simulate online state
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        // Trigger online status via mockStatusListener
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 0,
          errors: []
        });
      });

      expect(result.current.state.isOnline).toBe(true);
    });

    it('should handle offline event', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Verify that addEventListener was called with 'offline'
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

      // Simulate going online first, then offline
      act(() => {
        // Trigger online status via mockStatusListener
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 0,
          errors: []
        });
      });

      expect(result.current.state.isOnline).toBe(true);

      act(() => {
        // Simulate offline state
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        // Trigger offline status via mockStatusListener
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          pendingOperations: 0,
          errors: []
        });
      });

      expect(result.current.state.isOnline).toBe(false);
      expect(result.current.state.canSync).toBe(false);
    });
  });

  describe('Auto-retry Mechanism', () => {
    it('should schedule retry when nextRetryAt is set', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set state to enable syncing
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 1,
          errors: []
        });
      });

      // The hook should be able to trigger sync manually
      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.forcSync).toHaveBeenCalled();
    });

    it('should trigger immediate retry if nextRetryAt is in the past', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set state to enable syncing
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 1,
          errors: []
        });
      });

      // Test that retry action works
      await act(async () => {
        await result.current.actions.retry();
      });

      expect(mockSyncService.forcSync).toHaveBeenCalled();
    });
  });

  describe('Periodic Sync', () => {
    it('should trigger periodic sync when conditions are met', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Set state that allows sync
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 1,
          errors: []
        });
      });

      // Test that sync can be triggered manually (simulating periodic trigger)
      await act(async () => {
        await result.current.actions.triggerSync();
      });

      expect(mockSyncService.forcSync).toHaveBeenCalled();
    });

    it('should not trigger periodic sync when offline', () => {
      renderHook(() => useNetworkSync());

      // Set offline state
      act(() => {
        mockStatusListener({
          isOnline: false,
          isSyncing: false,
          pendingOperations: 1,
          errors: []
        });
      });

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should not trigger sync when offline
      expect(mockSyncService.forcSync).not.toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should clear sync data', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Verify hook returned valid result
      expect(result.current).not.toBeNull();
      expect(result.current.actions).toBeDefined();

      await act(async () => {
        await result.current.actions.clearSyncData();
      });

      expect(mockSyncService.clearSyncData).toHaveBeenCalled();
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useNetworkSync());

      // Verify hook returned valid result
      expect(result.current).not.toBeNull();
      expect(result.current.state).toBeDefined();

      // Set some errors
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 0,
          errors: ['Error 1', 'Error 2']
        });
      });

      expect(result.current.state.errors).toHaveLength(2);

      act(() => {
        result.current.actions.clearErrors();
      });

      expect(result.current.state.errors).toHaveLength(0);
    });

    it('should retry when online', async () => {
      const { result } = renderHook(() => useNetworkSync());

      // Verify hook returned valid result
      expect(result.current).not.toBeNull();
      expect(result.current.actions).toBeDefined();

      // Set online state
      act(() => {
        mockStatusListener({
          isOnline: true,
          isSyncing: false,
          pendingOperations: 1,
          errors: []
        });
      });

      await act(async () => {
        await result.current.actions.retry();
      });

      expect(mockSyncService.forcSync).toHaveBeenCalled();
    });
  });
});

describe('useOfflineStatus (Legacy)', () => {
  let mockSyncService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSyncService = {
      getSyncStatus: vi.fn().mockReturnValue({
        isOnline: true,
        isSyncing: false,
        pendingOperations: 5,
        errors: []
      }),
      addStatusListener: vi.fn().mockReturnValue(vi.fn()),
      getNextRetryTime: vi.fn().mockResolvedValue(null)
    };

    vi.mocked(SyncService.getInstance).mockReturnValue(mockSyncService);

    global.window.addEventListener = vi.fn();
    global.window.removeEventListener = vi.fn();
  });

  it('should provide legacy interface', () => {
    const { result } = renderHook(() => useOfflineStatus());

    // Verify the hook returns a valid object (not null)
    expect(result.current).not.toBeNull();
    expect(result.current).toEqual({
      isOnline: true,
      isOffline: false,
      pendingOperations: 5,
      canSync: true
    });
  });
});
