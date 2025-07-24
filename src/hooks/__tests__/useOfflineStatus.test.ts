import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineStatus } from '../useOfflineStatus';

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true
});

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('should return correct initial online status', () => {
    const { result } = renderHook(() => useOfflineStatus());
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.hasBeenOffline).toBe(false);
  });

  it('should return correct initial offline status', () => {
    // Set navigator.onLine to false before rendering
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useOfflineStatus());
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.hasBeenOffline).toBe(true);
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useOfflineStatus());
    
    // Initially online
    expect(result.current.isOffline).toBe(false);
    expect(result.current.hasBeenOffline).toBe(false);
    
    // Simulate going offline
    act(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Trigger offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.hasBeenOffline).toBe(true);
  });

  it('should update status when coming back online', () => {
    // Start offline
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useOfflineStatus());
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.hasBeenOffline).toBe(true);
    
    // Simulate coming back online
    act(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.hasBeenOffline).toBe(true); // Should remember being offline
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useOfflineStatus());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
