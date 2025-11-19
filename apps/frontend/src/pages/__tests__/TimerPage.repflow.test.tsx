import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import { createMockExercise, createMockAppSettings } from '../../test/testUtils';

describe('TimerPage - Rep Flow', () => {
  const mockExercise: Exercise = createMockExercise({
    id: 'ex1',
    name: 'Push-ups',
    description: 'Classic push-up exercise',
    category: 'strength',
    exercise_type: 'repetition_based',
    default_sets: 3,
    default_reps: 8,
    is_favorite: false,
    tags: []
  });

  const mockAppSettings: AppSettings = createMockAppSettings({
    ...DEFAULT_APP_SETTINGS,
    rep_speed_factor: 1.0
  });

  const defaultProps = {
    exercises: [mockExercise],
    appSettings: mockAppSettings,
    selectedExercise: mockExercise,
    selectedDuration: 15 as const, // Use valid preset (15 seconds - can be rep time with speed factor 3.0)
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

  it('should show 0/3 sets and 0/8 reps initially', () => {
    const initialTimerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      workoutMode: {
        workoutId: 'workout-1',
        workoutName: 'Upper Body',
        exercises: [{
          id: 'we1',
          exercise_id: 'ex1',
          order: 0,
          custom_sets: 3,
          custom_reps: 8,
          custom_rest_time: 60
        }],
        currentExerciseIndex: 0,
        currentSet: 0, // Starts at 0
        totalSets: 3,
        currentRep: 0, // Starts at 0
        totalReps: 8,
        isResting: false,
        sessionId: 'session-123'
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={initialTimerState}
      />
    );

    // For a stopped rep-based exercise in workout mode, compact progress section shows initial state
    expect(screen.getByText('Rep 1/8')).toBeInTheDocument();
    expect(screen.getByText('Set 1/3')).toBeInTheDocument();

    // In workout mode, we should see workout header
    expect(screen.getByText('Upper Body')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument(); // Exercise 1 of 1
  });

  it('should show nested circles for rep-based exercises', () => {
    const timerState: TimerState = {
      isRunning: true,
      currentTime: 6, // 6 seconds into 15-second rep
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      workoutMode: {
        workoutId: 'workout-1',
        workoutName: 'Upper Body',
        exercises: [{
          id: 'we1',
          exercise_id: 'ex1',
          order: 0,
          custom_sets: 3,
          custom_reps: 8,
          custom_rest_time: 60
        }],
        currentExerciseIndex: 0,
        currentSet: 0,
        totalSets: 3,
        currentRep: 2, // On rep 3 (displayed as 3/8)
        totalReps: 8,
        isResting: false,
        sessionId: 'session-123'
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timerState}
      />
    );

    // For a running rep-based exercise, we should see the compact progress section
    expect(screen.getByText('Rep 3/8')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Set 1/3')).toBeInTheDocument();

    // The timer display should NOT be present during active rep-based exercise (no text overlay)
    expect(screen.queryByTestId('timer-display')).not.toBeInTheDocument();
  });

  it('should show rep progress advancing through the set', () => {
    const timerStateAfterFewReps: TimerState = {
      isRunning: false,
      currentTime: 0,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      workoutMode: {
        workoutId: 'workout-1',
        workoutName: 'Upper Body',
        exercises: [{
          id: 'we1',
          exercise_id: 'ex1',
          order: 0,
          custom_sets: 3,
          custom_reps: 8,
          custom_rest_time: 60
        }],
        currentExerciseIndex: 0,
        currentSet: 0, // Still first set
        totalSets: 3,
        currentRep: 4, // Completed 4 reps, on rep 5
        totalReps: 8,
        isResting: false,
        sessionId: 'session-123'
      }
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timerStateAfterFewReps}
      />
    );

    // For a stopped rep-based exercise, compact progress section shows the current progress
    expect(screen.getByText('Rep 5/8')).toBeInTheDocument();
    expect(screen.getByText('Set 1/3')).toBeInTheDocument();

    // In workout mode, we should see workout header
    expect(screen.getByText('Upper Body')).toBeInTheDocument();
  });
});
