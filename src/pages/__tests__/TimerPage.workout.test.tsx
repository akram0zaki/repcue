import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';

// Mock audio service
vi.mock('../../services/audioService', () => ({
  audioService: {
    playStartFeedback: vi.fn(),
    announceText: vi.fn(),
    playIntervalBeep: vi.fn(),
    vibrate: vi.fn()
  }
}));

describe('TimerPage - Workout Mode', () => {
  const mockExercises: Exercise[] = [
    {
      id: 'ex1',
      name: 'Push-ups',
      description: 'Classic push-up exercise',
      category: 'strength',
      exerciseType: 'repetition-based',
      defaultSets: 3,
      defaultReps: 12,
      isFavorite: false,
      tags: []
    },
    {
      id: 'ex2', 
      name: 'Plank',
      description: 'Core strengthening exercise',
      category: 'core',
      exerciseType: 'time-based',
      defaultDuration: 60,
      isFavorite: false,
      tags: []
    }
  ];

  const mockAppSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS
  };

  const mockWorkoutTimerState: TimerState = {
    isRunning: false,
    currentTime: 0,
    intervalDuration: 30,
    isCountdown: false,
    countdownTime: 0,
    isResting: false,
    workoutMode: {
      workoutId: 'workout-1',
      workoutName: 'Test Workout',
      exercises: [
        {
          id: 'we1',
          exerciseId: 'ex1',
          order: 0,
          customSets: 3,
          customReps: 15,
          customRestTime: 30
        },
        {
          id: 'we2', 
          exerciseId: 'ex2',
          order: 1,
          customDuration: 45,
          customRestTime: 20
        }
      ],
      currentExerciseIndex: 0,
      currentSet: 0, // Start at 0, display as 1
      totalSets: 3,
      currentRep: 0, // Start at 0, display as 1
      totalReps: 15,
      isResting: false,
      sessionId: 'session-123'
    }
  };

  const defaultProps = {
    exercises: mockExercises,
    appSettings: mockAppSettings,
    selectedExercise: mockExercises[0],
    selectedDuration: 30 as const,
    showExerciseSelector: false,
    wakeLockSupported: true,
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

  it('should display workout mode header when in workout mode', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    expect(screen.getByText('Test Workout')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Exercise 1: Push-ups')).toBeInTheDocument();
  });

  it('should show workout progress bar', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    const progressBars = screen.getAllByRole('generic');
    const workoutProgressBar = progressBars.find(el => 
      el.className.includes('bg-white') && 
      el.className.includes('h-2') &&
      el.style.width === '0%' // 0 of 2 exercises completed = 0%
    );
    expect(workoutProgressBar).toBeInTheDocument();
  });

  it('should show correct workout progress when on second exercise', () => {
    const secondExerciseState = {
      ...mockWorkoutTimerState,
      workoutMode: {
        ...mockWorkoutTimerState.workoutMode!,
        currentExerciseIndex: 1, // On second exercise of 2
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={secondExerciseState}
      />
    );

    const progressBars = screen.getAllByRole('generic');
    const workoutProgressBar = progressBars.find(el => 
      el.className.includes('bg-white') && 
      el.className.includes('h-2') &&
      el.style.width === '50%' // 1 of 2 exercises completed = 50%
    );
    expect(workoutProgressBar).toBeInTheDocument();
  });

  it('should display rep/set progress for repetition-based exercises', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    expect(screen.getByText('Set Progress')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument();
    expect(screen.getByText('Rep Progress')).toBeInTheDocument();
    expect(screen.getByText('0 / 15')).toBeInTheDocument(); // Shows completed reps (0 completed when starting)
  });

  it('should show workout controls in workout mode', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    expect(screen.getByText('Workout Controls')).toBeInTheDocument();
    expect(screen.getByText('Next Rep (1/15)')).toBeInTheDocument();
    expect(screen.getByText('Next Set (1/3)')).toBeInTheDocument();
    expect(screen.getByText('Complete Exercise')).toBeInTheDocument();
    expect(screen.getByText('Exit Workout')).toBeInTheDocument();
  });

  it('should hide exercise selection in workout mode', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    expect(screen.queryByText('Choose')).not.toBeInTheDocument();
    expect(screen.queryByText('Exercise')).not.toBeInTheDocument();
  });

  it('should hide duration selection in workout mode', () => {
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    // Check that duration buttons are not present
    expect(screen.queryByRole('button', { name: /30s/ })).not.toBeInTheDocument();
  });

  it('should show outer circle for workout progress', () => {
    const { container } = render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
      />
    );

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(2); // Should have outer workout progress circle
    
    // Check for workout progress circle (r="75")
    const outerCircle = Array.from(circles).find((circle: Element) => 
      circle.getAttribute('r') === '75'
    );
    expect(outerCircle).toBeInTheDocument();
  });

  it('should display exercise progress in timer display', () => {
    // Use a timer state with the second exercise (time-based, not rep-based)
    const timeBasedWorkoutState = {
      ...mockWorkoutTimerState,
      workoutMode: {
        ...mockWorkoutTimerState.workoutMode!,
        currentExerciseIndex: 1, // Second exercise (time-based)
        // Remove rep-based properties for time-based exercise
        currentSet: undefined,
        totalSets: undefined, 
        currentRep: undefined,
        totalReps: undefined
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timeBasedWorkoutState}
      />
    );

    expect(screen.getByText('Exercise 2/2')).toBeInTheDocument();
  });

  it('should call onStopTimer when Complete Exercise is clicked', () => {
    const mockOnStopTimer = vi.fn();
    
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
        onStopTimer={mockOnStopTimer}
      />
    );

    fireEvent.click(screen.getByText('Complete Exercise'));
    expect(mockOnStopTimer).toHaveBeenCalledWith(true);
  });

  it('should call onResetTimer when Exit Workout is clicked', () => {
    const mockOnResetTimer = vi.fn();
    
    render(
      <TimerPage
        {...defaultProps}
        timerState={mockWorkoutTimerState}
        onResetTimer={mockOnResetTimer}
      />
    );

    fireEvent.click(screen.getByText('Exit Workout'));
    expect(mockOnResetTimer).toHaveBeenCalled();
  });

  it('should work in standalone mode when no workout mode is active', () => {
    const standaloneTimerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false
      // No workoutMode property
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={standaloneTimerState}
      />
    );

    // Should show normal timer interface
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Choose')).toBeInTheDocument();
    // Duration section is hidden for rep-based exercises, so don't expect it
    expect(screen.queryByText('Workout Controls')).not.toBeInTheDocument();
  });

  it('should handle time-based exercises in workout mode', () => {
    const timeBasedWorkoutState: TimerState = {
      ...mockWorkoutTimerState,
      workoutMode: {
        ...mockWorkoutTimerState.workoutMode!,
        currentExerciseIndex: 1, // Move to plank (time-based)
        currentSet: undefined,
        totalSets: undefined,
        currentRep: undefined,
        totalReps: undefined
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timeBasedWorkoutState}
        selectedExercise={mockExercises[1]} // Plank
      />
    );

    expect(screen.getByText('Exercise 2: Plank')).toBeInTheDocument();
    expect(screen.queryByText('Set Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Rep Progress')).not.toBeInTheDocument();
  });

  it('should show resting state UI when in rest period', () => {
    const restingTimerState: TimerState = {
      ...mockWorkoutTimerState,
      isRunning: true,
      currentTime: 15,
      targetTime: 30,
      workoutMode: {
        ...mockWorkoutTimerState.workoutMode!,
        isResting: true,
        restTimeRemaining: 15
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={restingTimerState}
      />
    );

    // Timer should be running during rest
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });
});
