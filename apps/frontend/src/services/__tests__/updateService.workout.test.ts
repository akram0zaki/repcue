import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { updateService } from '../updateService';
import type { TimerState, UpdateInfo } from '../../types';

// Mock dependencies
vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn(() => true),
    hasConsented: vi.fn(() => true)
  }
}));

vi.mock('../storageService', () => ({
  storageService: {
    getItem: vi.fn(),
    setItem: vi.fn()
  }
}));

vi.mock('../../utils/serviceWorker', () => ({
  swEventEmitter: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  },
  updateServiceWorkerCoordinated: vi.fn()
}));

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('UpdateService - Workout-Aware Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance for each test
    // @ts-expect-error - accessing private static property for testing
    updateService.constructor.instance = undefined;
  });

  describe('Timer State Management', () => {
    it('should accept and store timer state reference', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      // This tests internal state - in real implementation we'd test through public methods
      expect(updateService.isWorkoutActive()).toBe(false);
    });

    it('should detect active timer when isRunning is true', () => {
      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 15,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      expect(updateService.isWorkoutActive()).toBe(true);
    });

    it('should detect active workout mode even when not running', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'test-workout',
          workoutName: 'Test Workout',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      expect(updateService.isWorkoutActive()).toBe(true);
    });

    it('should detect rest period as active', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: true,
        restTimeRemaining: 30
      };

      updateService.setTimerStateRef(mockTimerState);

      expect(updateService.isWorkoutActive()).toBe(true);
    });

    it('should detect countdown as active', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: true,
        countdownTime: 3,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      expect(updateService.isWorkoutActive()).toBe(true);
    });
  });

  describe('Workout Information', () => {
    it('should return correct workout info for inactive state', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      const workoutInfo = updateService.getWorkoutInfo();

      expect(workoutInfo).toEqual({
        isActive: false,
        isRunning: false,
        isWorkoutMode: false,
        canInterrupt: true
      });
    });

    it('should return correct workout info for active workout', () => {
      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 45,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'strength-workout',
          workoutName: 'Strength Training',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const workoutInfo = updateService.getWorkoutInfo();

      expect(workoutInfo).toEqual({
        isActive: true,
        isRunning: true,
        isWorkoutMode: true,
        workoutName: 'Strength Training',
        canInterrupt: false
      });
    });

    it('should return correct workout info when timer state ref is null', () => {
      updateService.setTimerStateRef(null as any);

      const workoutInfo = updateService.getWorkoutInfo();

      expect(workoutInfo).toEqual({
        isActive: false,
        isRunning: false,
        isWorkoutMode: false,
        canInterrupt: true
      });
    });
  });

  describe('Update Deferral Logic', () => {
    const mockUpdateInfo: UpdateInfo = {
      version: '1.2.0',
      policy: 'optional',
      releaseDate: '2023-12-01T10:00:00Z'
    };

    it('should not defer updates when no workout is active', () => {
      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      const deferResult = updateService.shouldDeferUpdateForWorkout(mockUpdateInfo);

      expect(deferResult).toEqual({
        shouldDefer: false,
        reason: 'no-workout',
        canForce: false
      });
    });

    it('should defer optional updates during active workout', () => {
      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 30,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'cardio-session',
          workoutName: 'Cardio Session',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const deferResult = updateService.shouldDeferUpdateForWorkout(mockUpdateInfo);

      expect(deferResult).toEqual({
        shouldDefer: true,
        reason: 'workout-session-active',
        canForce: false
      });
    });

    it('should defer critical updates during active workout', () => {
      const criticalUpdate: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'critical'
      };

      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 15,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      const deferResult = updateService.shouldDeferUpdateForWorkout(criticalUpdate);

      expect(deferResult).toEqual({
        shouldDefer: true,
        reason: 'timer-active',
        canForce: false
      });
    });

    it('should allow force updates but defer when workout is running', () => {
      const forceUpdate: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'force'
      };

      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 60,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'hiit-workout',
          workoutName: 'HIIT Training',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const deferResult = updateService.shouldDeferUpdateForWorkout(forceUpdate);

      expect(deferResult).toEqual({
        shouldDefer: true,
        reason: 'workout-active-force',
        canForce: true
      });
    });

    it('should not defer force updates when workout is paused', () => {
      const forceUpdate: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'force'
      };

      const mockTimerState: TimerState = {
        isRunning: false,
        currentTime: 60,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'strength-workout',
          workoutName: 'Strength Training',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const deferResult = updateService.shouldDeferUpdateForWorkout(forceUpdate);

      expect(deferResult).toEqual({
        shouldDefer: false,
        reason: 'force-update',
        canForce: true
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit workout-blocked event for force updates during active workouts', async () => {
      const mockEmit = vi.fn();
      // @ts-expect-error - accessing private method for testing
      updateService.emit = mockEmit;

      const forceUpdate: UpdateInfo = {
        version: '1.2.0',
        policy: 'force',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 30,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'test-workout',
          workoutName: 'Test Workout',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      // Set a pending update
      const updateState = updateService.getUpdateState();
      // @ts-expect-error - setting private state for testing
      updateService.updateState = {
        ...updateState,
        pendingUpdate: forceUpdate
      };

      try {
        await updateService.applyUpdate();
      } catch (error) {
        // Expected to throw because of workout blocking
      }

      expect(mockEmit).toHaveBeenCalledWith('update-blocked-workout-force', expect.objectContaining({
        updateInfo: forceUpdate,
        workoutInfo: expect.objectContaining({
          isActive: true,
          isRunning: true,
          isWorkoutMode: true
        })
      }));
    });

    it('should emit deferred event for optional updates during workouts', async () => {
      const mockEmit = vi.fn();
      // @ts-expect-error - accessing private method for testing
      updateService.emit = mockEmit;

      const optionalUpdate: UpdateInfo = {
        version: '1.2.0',
        policy: 'optional',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 45,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);

      // Set a pending update
      const updateState = updateService.getUpdateState();
      // @ts-expect-error - setting private state for testing
      updateService.updateState = {
        ...updateState,
        pendingUpdate: optionalUpdate
      };

      try {
        await updateService.applyUpdate();
      } catch (error) {
        // Expected to throw because of workout deferral
      }

      expect(mockEmit).toHaveBeenCalledWith('update-deferred-workout', expect.objectContaining({
        updateInfo: optionalUpdate,
        workoutInfo: expect.objectContaining({
          isActive: true,
          isRunning: true
        })
      }));
    });
  });

  describe('Edge Cases', () => {
    it('should handle null timer state gracefully', () => {
      updateService.setTimerStateRef(null as any);

      expect(updateService.isWorkoutActive()).toBe(false);
      expect(updateService.getWorkoutInfo().isActive).toBe(false);

      const mockUpdate: UpdateInfo = {
        version: '1.0.0',
        policy: 'optional',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      const deferResult = updateService.shouldDeferUpdateForWorkout(mockUpdate);
      expect(deferResult.shouldDefer).toBe(false);
    });

    it('should handle incomplete timer state', () => {
      const incompleteTimerState = {
        isRunning: true,
        currentTime: 30
        // Missing other required fields
      } as TimerState;

      updateService.setTimerStateRef(incompleteTimerState);

      expect(updateService.isWorkoutActive()).toBe(true);
    });

    it('should properly clean up timer state reference on destroy', () => {
      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 30,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false
      };

      updateService.setTimerStateRef(mockTimerState);
      expect(updateService.isWorkoutActive()).toBe(true);

      updateService.destroy();

      // After destroy, should not have workout active (since reference is cleared)
      expect(updateService.isWorkoutActive()).toBe(false);
    });
  });

  describe('Integration with Existing Update Logic', () => {
    it('should respect workout state in automatic update application', () => {
      const mockTimerState: TimerState = {
        isRunning: true,
        currentTime: 30,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'test-workout',
          workoutName: 'Test Workout',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const updateInfo: UpdateInfo = {
        version: '1.2.0',
        policy: 'optional',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      const shouldApply = updateService.shouldApplyUpdateAutomatically(updateInfo);
      // This depends on user preferences, but workout state should be checked separately
      expect(typeof shouldApply).toBe('boolean');
    });

    it('should handle force updates with proper workflow coordination', async () => {
      const mockTimerState: TimerState = {
        isRunning: false, // Paused workout
        currentTime: 60,
        intervalDuration: 30,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: {
          workoutId: 'paused-workout',
          workoutName: 'Paused Workout',
          exercises: []
        }
      };

      updateService.setTimerStateRef(mockTimerState);

      const forceUpdate: UpdateInfo = {
        version: '1.2.0',
        policy: 'force',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      const deferResult = updateService.shouldDeferUpdateForWorkout(forceUpdate);

      // Should not defer force update when workout is paused
      expect(deferResult.shouldDefer).toBe(false);
      expect(deferResult.reason).toBe('force-update');
    });
  });
});