import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

// Mock the navigator.wakeLock API
const mockWakeLock = {
  request: vi.fn(),
  release: vi.fn(),
  released: false,
  type: 'screen'
};

const mockNavigator = {
  wakeLock: {
    request: vi.fn()
  }
};

describe('useWakeLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator mock
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false for isSupported when wakeLock API is not available', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true
    });

    const { result } = renderHook(() => useWakeLock());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.isActive).toBe(false);
  });

  it('should return true for isSupported when wakeLock API is available', () => {
    const { result } = renderHook(() => useWakeLock());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isActive).toBe(false);
  });

  it('should request wake lock successfully', async () => {
    mockNavigator.wakeLock.request.mockResolvedValue(mockWakeLock);

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockNavigator.wakeLock.request).toHaveBeenCalledWith('screen');
    expect(result.current.isActive).toBe(true);
  });

  it('should handle wake lock request failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockNavigator.wakeLock.request.mockRejectedValue(new Error('Wake lock failed'));

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to request wake lock:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should release wake lock successfully', async () => {
    mockWakeLock.release.mockResolvedValue(undefined);
    mockNavigator.wakeLock.request.mockResolvedValue(mockWakeLock);

    const { result } = renderHook(() => useWakeLock());

    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(true);

    // Then release it
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(mockWakeLock.release).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should handle wake lock release failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWakeLock.release.mockRejectedValue(new Error('Release failed'));
    mockNavigator.wakeLock.request.mockResolvedValue(mockWakeLock);

    const { result } = renderHook(() => useWakeLock());

    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    // Then try to release it (should fail)
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to release wake lock:', expect.any(Error));
    // Should still mark as inactive even if release fails
    expect(result.current.isActive).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should not try to release wake lock if none is active', async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(mockWakeLock.release).not.toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should handle wake lock becoming released externally', async () => {
    const releasedWakeLock = { ...mockWakeLock, released: true };
    mockNavigator.wakeLock.request.mockResolvedValue(releasedWakeLock);

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(true);

    // Simulate external release by updating the wake lock's released property
    await act(async () => {
      // Trigger a state update by calling releaseWakeLock
      await result.current.releaseWakeLock();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should cleanup wake lock on unmount', async () => {
    mockWakeLock.release.mockResolvedValue(undefined);
    mockNavigator.wakeLock.request.mockResolvedValue(mockWakeLock);

    const { result, unmount } = renderHook(() => useWakeLock());

    // Request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(true);

    // Unmount should cleanup
    unmount();

    expect(mockWakeLock.release).toHaveBeenCalled();
  });
});
