import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import { createMockExercise, createMockAppSettings } from '../../test/testUtils';

const mockExercise: Exercise = createMockExercise({
  id: 'exercise-1',
  name: 'Push-ups',
  description: 'Classic upper body exercise',
  category: 'strength',
  exercise_type: 'repetition_based',
  default_sets: 3,
  default_reps: 10,
  is_favorite: false,
  tags: ['upper-body', 'bodyweight']
});

const mockWorkoutMode = {
  workoutId: 'workout-1',
  workoutName: 'Upper Body Workout',
  exercises: [
    {
      id: 'ex-1',
      exercise_id: 'exercise-1',
      order: 1,
      custom_sets: 3,
      custom_reps: 10
    }
  ],
  currentExerciseIndex: 0,
  isResting: false,
  sessionId: 'session-1'
};

const defaultProps = {
  exercises: [mockExercise],
  appSettings: DEFAULT_APP_SETTINGS,
  selectedExercise: mockExercise,
  selectedDuration: 30 as any,
  showExerciseSelector: false,
  wakeLockSupported: true,
  wakeLockActive: false,
  onSetSelectedExercise: vi.fn(),
  onSetSelectedDuration: vi.fn(),
  onSetShowExerciseSelector: vi.fn(),
  onStartTimer: vi.fn(),
  onStopTimer: vi.fn(),
  onResetTimer: vi.fn(),
  onStartWorkoutMode: vi.fn(),
};

describe('TimerPage - Exercise Display Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTimerPage = (timerState: Partial<TimerState> = {}) => {
    const fullTimerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      intervalDuration: 30,
      targetTime: 30,
      startTime: undefined,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      workoutMode: undefined,
      ...timerState
    };

    let renderResult;
    act(() => {
      renderResult = render(
        <MemoryRouter>
          <TimerPage {...defaultProps} timerState={fullTimerState} />
        </MemoryRouter>
      );
    });
    return renderResult;
  };

  it('should display workout name in workout mode', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the workout name is displayed in the header
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();

    // Check that it shows as a heading
    const workoutNameElement = screen.getByText('Upper Body Workout');
    expect(workoutNameElement.tagName.toLowerCase()).toBe('h2');
  });

  it('should display exercise counter in workout mode', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the exercise counter is displayed in the timer area
    expect(screen.getByText('Exercise 1/1')).toBeInTheDocument();
  });

  it('should display workout progress indicator', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the progress indicator exists in the header (1/1 without spaces)
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('should not display workout header when not in workout mode', () => {
    renderTimerPage({
      workoutMode: undefined
    });

    // The workout header should not be present
    const workoutHeader = screen.queryByText('Upper Body Workout');
    expect(workoutHeader).not.toBeInTheDocument();

    // Exercise counter should also not be present
    const exerciseCounter = screen.queryByText('Exercise 1/1');
    expect(exerciseCounter).not.toBeInTheDocument();
  });

  it('should handle normal workout mode display', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Should display workout name and progress
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('Exercise 1/1')).toBeInTheDocument();
  });

  it('should display workout header correctly', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check workout header is present
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    // Check exercise counter is displayed in timer area
    expect(screen.getByText('Exercise 1/1')).toBeInTheDocument();
  });

  it('should handle missing exercise gracefully', () => {
    // Create a workout mode with an exercise ID that doesn't exist in the exercises array
    const workoutModeWithMissingExercise = {
      ...mockWorkoutMode,
      exercises: [
        {
          id: 'ex-1',
          exercise_id: 'missing-exercise-id', // This ID doesn't exist in the exercises array
          order: 1,
          custom_sets: 3,
          custom_reps: 10
        }
      ]
    };

    const propsWithMissingExercise = {
      ...defaultProps,
      selectedExercise: null,
    };

    act(() => {
      render(
        <MemoryRouter>
          <TimerPage {...propsWithMissingExercise} timerState={{
            isRunning: false,
            currentTime: 0,
            intervalDuration: 30,
            targetTime: 30,
            startTime: undefined,
            currentExercise: undefined,
            isCountdown: false,
            countdownTime: 0,
            isResting: false,
            workoutMode: workoutModeWithMissingExercise,
          }} />
        </MemoryRouter>
      );
    });

    // Should still show the workout header
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });
});
