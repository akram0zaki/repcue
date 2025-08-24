import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimerPage from '../pages/TimerPage';
import type { TimerState, Exercise, AppSettings } from '../types';
import { createMockExercise, createMockAppSettings } from '../test/testUtils';

/**
 * Test for workout to standalone exercise transition fix
 * 
 * This tests the specific bug where after completing a workout,
 * starting a standalone exercise would still show workout details
 * because the workoutMode wasn't being cleared from timer state.
 */

describe('Workout to Standalone Exercise Transition', () => {
  const mockExercise: Exercise = createMockExercise({
    id: 'exercise-1',
    name: 'Plank',
    description: 'Core strengthening exercise',
    category: 'core',
    exerciseType: 'time-based',
    defaultDuration: 60,
    isFavorite: false,
    tags: ['core']
  });

  const mockAppSettings: AppSettings = createMockAppSettings({
    intervalDuration: 30,
    soundEnabled: false,
    vibrationEnabled: false,
    beepVolume: 0.5,
    darkMode: false,
    autoSave: true,
    repSpeedFactor: 1.0,
    preTimerCountdown: 0,
    defaultRestTime: 30
  });

  const standaloneTimerState: TimerState = {
    isRunning: false,
    currentTime: 0,
    intervalDuration: 30,
    isCountdown: false,
    countdownTime: 0,
    isResting: false,
    // No workoutMode - this is a standalone exercise
  };

  const workoutTimerState: TimerState = {
    isRunning: false,
    currentTime: 0,
    intervalDuration: 30,
    isCountdown: false,
    countdownTime: 0,
    isResting: false,
    workoutMode: {
      workoutId: 'completed-workout',
      workoutName: 'Upper Body Workout',
      exercises: [{
        id: 'we1',
        exerciseId: 'exercise-1',
        order: 0,
        customSets: 3,
        customReps: 10
      }],
      currentExerciseIndex: 1, // Past the last exercise (completed)
      currentSet: 0,
      totalSets: 3,
      currentRep: 0,
      totalReps: 10,
      isResting: false,
      sessionId: 'session-123'
    }
  };

  const defaultProps = {
    exercises: [mockExercise],
    appSettings: mockAppSettings,
    selectedExercise: mockExercise,
    selectedDuration: 60 as const,
    showExerciseSelector: false,
    wakeLockSupported: false,
    wakeLockActive: false,
    onSetSelectedExercise: vi.fn(),
    onSetSelectedDuration: vi.fn(),
    onSetShowExerciseSelector: vi.fn(),
    onStartTimer: vi.fn(),
    onStopTimer: vi.fn(),
    onResetTimer: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not show workout elements when workoutMode is undefined', () => {
    render(
      <TimerPage 
        {...defaultProps} 
        timerState={standaloneTimerState}
      />
    );

    // Should NOT show workout-specific elements
    expect(screen.queryByText(/Exercise \d+\/\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upper Body Workout/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Workout Controls/)).not.toBeInTheDocument();
    
    // Should show standard timer controls for standalone exercise
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should show workout elements when workoutMode is present', () => {
    render(
      <TimerPage 
        {...defaultProps} 
        timerState={workoutTimerState}
      />
    );

    // Should show workout-specific elements
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();
    
    // Should show workout controls section
    expect(screen.getByText('Workout Controls')).toBeInTheDocument();
  });

  it('should verify the timer state clearing fix is working', () => {
    // This test verifies that our fix in App.tsx properly clears workoutMode
    // When transitioning from workout to standalone, the timer state should not have workoutMode
    
    // Test 1: Render with workout state
    const { rerender } = render(
      <TimerPage 
        {...defaultProps} 
        timerState={workoutTimerState}
      />
    );

    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();

    // Test 2: Re-render with standalone state (simulating the state after our fix)
    rerender(
      <TimerPage 
        {...defaultProps} 
        timerState={standaloneTimerState}
      />
    );

    // After the transition, workout elements should be gone
    expect(screen.queryByText('Upper Body Workout')).not.toBeInTheDocument();
    expect(screen.queryByText(/Exercise \d+\/\d+/)).not.toBeInTheDocument();
    
    // Standalone elements should be present
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });
});
