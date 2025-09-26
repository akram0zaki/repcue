import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forceUpdateService, ForceUpdateService } from '../forceUpdateService';
import type { UpdateInfo, TimerState } from '../../types';

// Mock dependencies
vi.mock('../updateService', () => ({
  updateService: {
    on: vi.fn(),
    applyUpdate: vi.fn(),
  }
}));

vi.mock('../storageService', () => ({
  storageService: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  }
}));

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn(),
  }
}));

describe('ForceUpdateService', () => {
  let service: ForceUpdateService;

  const createMockUpdateInfo = (): UpdateInfo => ({
    version: '2.1.0',
    policy: 'force',
    releaseDate: '2023-01-01T00:00:00Z',
    message: 'Critical security update',
    changelog: 'Security fixes'
  });

  const createMockTimerState = (): TimerState => ({
    isRunning: true,
    currentTime: 120,
    intervalDuration: 30,
    currentExercise: {
      id: 'test-exercise',
      name: 'Push-ups',
      catalogId: 'default',
      exercise_type: 'repetition_based',
      category: 'strength',
      is_favorite: false,
      tags: [],
      default_sets: 3,
      default_reps: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      version: 1,
      owner_id: 'test-user'
    },
    currentSet: 2,
    currentRep: 8,
    totalSets: 3,
    totalReps: 10,
    isCountdown: false,
    countdownTime: 0,
    isResting: false,
    workoutMode: 'standalone',
    elapsedTime: 120
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset singleton instance
    (ForceUpdateService as any).instance = undefined;
    service = ForceUpdateService.getInstance();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    service.destroy();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ForceUpdateService.getInstance();
      const instance2 = ForceUpdateService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('maintains state across getInstance calls', () => {
      const updateInfo = createMockUpdateInfo();

      // Trigger force update in first instance
      service['handleForceUpdateAvailable'](updateInfo);

      const newInstance = ForceUpdateService.getInstance();
      expect(newInstance.isForceUpdateActive()).toBe(true);
    });
  });

  describe('Timer State Integration', () => {
    it('sets timer state reference correctly', () => {
      const timerState = createMockTimerState();
      service.setTimerStateRef(timerState);

      expect(service['timerStateRef']).toBe(timerState);
    });

    it('captures workout state when timer is active', () => {
      const timerState = createMockTimerState();
      service.setTimerStateRef(timerState);

      const workoutData = service['captureWorkoutState']();

      expect(workoutData.isWorkoutActive).toBe(true);
      expect(workoutData.currentExercise).toBe('Push-ups');
      expect(workoutData.currentSet).toBe(2);
      expect(workoutData.currentRep).toBe(8);
      expect(workoutData.totalSets).toBe(3);
    });

    it('captures inactive workout state correctly', () => {
      const timerState = { ...createMockTimerState(), isRunning: false, isResting: false };
      service.setTimerStateRef(timerState);

      const workoutData = service['captureWorkoutState']();

      expect(workoutData.isWorkoutActive).toBe(false);
    });
  });

  describe('Force Update Lifecycle', () => {
    it('handles force update available correctly', () => {
      const updateInfo = createMockUpdateInfo();
      const timerState = createMockTimerState();
      service.setTimerStateRef(timerState);

      const eventSpy = vi.fn();
      service.on('force-update-available', eventSpy);

      service['handleForceUpdateAvailable'](updateInfo);

      expect(service.isForceUpdateActive()).toBe(true);
      expect(service.getForceUpdateState().updateInfo).toEqual(updateInfo);
      expect(eventSpy).toHaveBeenCalledWith({
        updateInfo,
        workoutData: expect.objectContaining({
          isWorkoutActive: true,
          currentExercise: 'Push-ups'
        }),
        autoForceDelay: 300000 // 5 minutes
      });
    });

    it('starts auto-force countdown when force update becomes available', () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);

      const timeRemaining = service.getAutoForceTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(300000); // 5 minutes
    });

    it('applies force update automatically after countdown', async () => {
      const updateInfo = createMockUpdateInfo();
      const { updateService } = await import('../updateService');

      service['handleForceUpdateAvailable'](updateInfo);

      // Fast-forward past auto-force delay
      vi.advanceTimersByTime(300100); // Just over 5 minutes

      expect(updateService.applyUpdate).toHaveBeenCalledWith(true);
    });
  });

  describe('User Interactions', () => {
    it('acknowledges force update correctly', () => {
      const updateInfo = createMockUpdateInfo();
      service['handleForceUpdateAvailable'](updateInfo);

      const eventSpy = vi.fn();
      service.on('force-update-acknowledged', eventSpy);

      service.acknowledgeForceUpdate();

      expect(service.getForceUpdateState().userAcknowledged).toBe(true);
      expect(eventSpy).toHaveBeenCalled();
    });

    it('applies force update when user confirms', async () => {
      const updateInfo = createMockUpdateInfo();
      const { updateService } = await import('../updateService');

      service['handleForceUpdateAvailable'](updateInfo);

      await service.applyForceUpdate();

      expect(service.getForceUpdateState().userAcknowledged).toBe(true);
      expect(updateService.applyUpdate).toHaveBeenCalledWith(true);
    });

    it('throws error when trying to apply without active force update', async () => {
      await expect(service.applyForceUpdate()).rejects.toThrow('No active force update to apply');
    });
  });

  describe('Workout State Persistence', () => {
    it('saves workout state to storage when active', async () => {
      const { consentService } = await import('../consentService');
      vi.mocked(consentService.hasConsent).mockReturnValue(true);

      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      const updateInfo = createMockUpdateInfo();
      const timerState = createMockTimerState();

      service.setTimerStateRef(timerState);
      service['handleForceUpdateAvailable'](updateInfo);

      await service['saveWorkoutState']();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'repcue_workout_recovery_data',
        expect.stringContaining('Push-ups')
      );
    });

    it('does not save workout state when inactive', async () => {
      const { storageService } = await import('../storageService');
      const updateInfo = createMockUpdateInfo();
      const timerState = { ...createMockTimerState(), isRunning: false, isResting: false };

      service.setTimerStateRef(timerState);
      service['handleForceUpdateAvailable'](updateInfo);

      await service['saveWorkoutState']();

      expect(storageService.setItem).not.toHaveBeenCalled();
    });

    it('loads and clears workout recovery data', async () => {
      const mockRecoveryData = {
        isWorkoutActive: true,
        currentExercise: 'Push-ups',
        savedAt: '2025-09-20T23:55:03.399Z'
      };

      // Mock localStorage since the method uses it directly
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(mockRecoveryData));
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {});

      // Mock consentService to return true
      const { consentService } = await import('../consentService');
      vi.mocked(consentService.hasConsent).mockReturnValue(true);

      const result = await service.loadAndClearWorkoutRecovery();

      expect(result).toEqual(mockRecoveryData);
      expect(getItemSpy).toHaveBeenCalledWith('repcue_workout_recovery_data');
      expect(removeItemSpy).toHaveBeenCalledWith('repcue_workout_recovery_data');
      
      // Clean up
      getItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    });

    it('returns null when no recovery data exists', async () => {
      const { storageService } = await import('../storageService');
      
      // Re-setup the mock after clearAllMocks
      vi.mocked(storageService.getItem).mockResolvedValue(null);

      const result = await service.loadAndClearWorkoutRecovery();

      expect(result).toBeNull();
    });
  });

  describe('Error Handling and Retry', () => {
    it('handles force update failure', () => {
      const updateInfo = createMockUpdateInfo();
      const error = new Error('Update failed');

      service['handleForceUpdateAvailable'](updateInfo);

      const eventSpy = vi.fn();
      service.on('force-update-failed', eventSpy);

      service['handleForceUpdateFailed'](error);

      expect(eventSpy).toHaveBeenCalledWith({
        error,
        retryCount: 0,
        maxRetries: 3,
        canRetry: true
      });
    });

    it('retries force update with exponential backoff', async () => {
      const updateInfo = createMockUpdateInfo();
      const { updateService } = await import('../updateService');

      service['handleForceUpdateAvailable'](updateInfo);

      const eventSpy = vi.fn();
      service.on('force-update-retry-scheduled', eventSpy);

      // Mock the first retry
      const retryPromise = service.retryForceUpdate();

      expect(eventSpy).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 3,
        delayMs: 10000 // Base delay
      });

      // Fast-forward the retry delay
      vi.advanceTimersByTime(10000);

      await retryPromise;

      expect(updateService.applyUpdate).toHaveBeenCalledWith(true);
    });

    it('throws error when maximum retries exceeded', async () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);
      service['forceUpdateState'].retryCount = 3; // Max retries

      await expect(service.retryForceUpdate()).rejects.toThrow('Maximum retry attempts exceeded');
    });

    it.skip('forces reload as last resort', () => {
      const updateInfo = createMockUpdateInfo();
      const timerState = createMockTimerState();

      service.setTimerStateRef(timerState);
      service['handleForceUpdateAvailable'](updateInfo);

      const eventSpy = vi.fn();
      service.on('force-reload-initiated', eventSpy);

      // Mock window.location.reload using vi.spyOn
      const mockReload = vi.spyOn(window.location, 'reload');
      mockReload.mockImplementation(() => {});

      service.forceReload();

      expect(eventSpy).toHaveBeenCalled();

      // Fast-forward the delay
      vi.advanceTimersByTime(200);

      expect(mockReload).toHaveBeenCalled();

      // Restore
      mockReload.mockRestore();
    });
  });

  describe('State Management', () => {
    it('returns correct force update state', () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);

      const state = service.getForceUpdateState();

      expect(state.isForceUpdateActive).toBe(true);
      expect(state.updateInfo).toEqual(updateInfo);
      expect(state.retryCount).toBe(0);
      expect(state.userAcknowledged).toBe(false);
    });

    it('checks if workout is interrupted', () => {
      const updateInfo = createMockUpdateInfo();
      const timerState = createMockTimerState();

      service.setTimerStateRef(timerState);
      service['handleForceUpdateAvailable'](updateInfo);

      expect(service.isWorkoutInterrupted()).toBe(true);
    });

    it('returns workout interruption data', () => {
      const updateInfo = createMockUpdateInfo();
      const timerState = createMockTimerState();

      service.setTimerStateRef(timerState);
      service['handleForceUpdateAvailable'](updateInfo);

      const workoutData = service.getWorkoutInterruptionData();

      expect(workoutData).toBeDefined();
      expect(workoutData?.isWorkoutActive).toBe(true);
      expect(workoutData?.currentExercise).toBe('Push-ups');
    });

    it('calculates auto-force time remaining correctly', () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);

      const initialRemaining = service.getAutoForceTimeRemaining();
      expect(initialRemaining).toBeGreaterThan(290000); // Just under 5 minutes

      // Fast-forward 1 minute
      vi.advanceTimersByTime(60000);

      const laterRemaining = service.getAutoForceTimeRemaining();
      expect(laterRemaining).toBeLessThan(initialRemaining);
      expect(laterRemaining).toBeGreaterThan(230000); // Around 4 minutes
    });
  });

  describe('Event System', () => {
    it('emits events correctly', () => {
      const eventSpy = vi.fn();

      service.on('test-event', eventSpy);
      service['emit']('test-event', { data: 'test' });

      expect(eventSpy).toHaveBeenCalledWith({ data: 'test' });
    });

    it('removes event listeners correctly', () => {
      const eventSpy = vi.fn();

      service.on('test-event', eventSpy);
      service.off('test-event', eventSpy);
      service['emit']('test-event', { data: 'test' });

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('handles errors in event listeners gracefully', async () => {
      const { default: logger } = await import('../../utils/logger');
      const errorSpy = vi.spyOn(logger, 'error');

      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      service.on('test-event', faultyListener);
      service['emit']('test-event');

      expect(errorSpy).toHaveBeenCalledWith(
        'Error in force update event listener for test-event:',
        expect.any(Error)
      );
    });
  });

  describe('Cleanup', () => {
    it('cleans up resources on destroy', () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);
      expect(service.isForceUpdateActive()).toBe(true);

      service.destroy();

      expect(service.isForceUpdateActive()).toBe(false);
    });

    it('clears auto-force timeout on destroy', () => {
      const updateInfo = createMockUpdateInfo();

      service['handleForceUpdateAvailable'](updateInfo);
      expect(service['autoForceTimeout']).toBeDefined();

      service.destroy();

      expect(service['autoForceTimeout']).toBeNull();
    });
  });
});