import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';

describe('TimerPage - Rep Flow', () => {
  const mockExercise: Exercise = {
    id: 'ex1',
    name: 'Push-ups',
    description: 'Classic push-up exercise',
    category: 'strength',
    exerciseType: 'repetition-based',
    defaultSets: 3,
    defaultReps: 8,
    isFavorite: false,
    tags: []
  };

  const mockAppSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    repSpeedFactor: 1.0
  };

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
          exerciseId: 'ex1',
          order: 0,
          customSets: 3,
          customReps: 8,
          customRestTime: 60
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

    // Should show 0 of 3 sets completed (currentSet 0 = 0 completed when working on current set)
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument();
    // Should show 0/8 (currentRep 0 means 0 completed reps)
    expect(screen.getByText('0 / 8')).toBeInTheDocument();
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
          exerciseId: 'ex1',
          order: 0,
          customSets: 3,
          customReps: 8,
          customRestTime: 60
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

    // Should show 2 completed reps (currentRep 2 means working on rep 3, so 2 completed)
    expect(screen.getByText('2 / 8')).toBeInTheDocument();
    
    // Should show nested circles (outer for rep progress, inner for current rep timer)
    // For rep-based exercises, it shows "Rep 3" not time display
    expect(screen.getByText('Rep 3')).toBeInTheDocument();
    
    // Look for SVG element within the timer section
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    
    // Look for multiple circles (nested circles structure)
    const circles = svgElement?.querySelectorAll('circle');
    expect(circles?.length).toBeGreaterThan(2); // Should have at least 4 circles (2 for outer, 2 for inner)
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
          exerciseId: 'ex1',
          order: 0,
          customSets: 3,
          customReps: 8,
          customRestTime: 60
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

    // Should show 4 completed reps (currentRep 4 means working on rep 5, so 4 completed)
    expect(screen.getByText('4 / 8')).toBeInTheDocument();
    // Should still be on set 1 of 3
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument();
  });
});
