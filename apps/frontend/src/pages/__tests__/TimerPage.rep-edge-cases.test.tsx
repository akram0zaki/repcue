import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import { createMockExercise } from '../../test/testUtils';

describe('TimerPage - Rep Logic Edge Cases', () => {
  const mockExercise: Exercise = createMockExercise({
    id: 'ex1',
    name: 'Cat-Cow Stretch',
    description: 'Alternate arching and rounding spine on hands and knees',
    category: 'flexibility',
    exercise_type: 'repetition_based',
    default_sets: 2,
    default_reps: 8,
    is_favorite: false,
    tags: []
  });

  const mockAppSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    rep_speed_factor: 1.0
  };

  const defaultProps = {
    exercises: [mockExercise],
    appSettings: mockAppSettings,
    selectedExercise: mockExercise,
    selectedDuration: 5 as const,
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

  it('should show correct progress on last set, 7th rep completed (user scenario)', () => {
    // This simulates the exact scenario from the user's image:
    // - 2 sets × 8 reps (Cat-Cow Stretch)
    // - Currently on set 2 (currentSet=1), 7 reps completed (currentRep=7)
    const timerState: TimerState = {
      isRunning: true,
      currentTime: 1, // 1 second into current rep
      targetTime: 3,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentSet: 1, // 0-indexed: set 2 of 2
      totalSets: 2,
      currentRep: 7, // 7 completed reps (working on 8th)
      totalReps: 8
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timerState}
      />
    );

    // UPDATED EXPECTATIONS: Component shows rep progress in compact progress section
    // Progress section should show "Rep 8/8" (current rep being worked on)
    expect(screen.getByText('Rep 8/8')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Set 2/2')).toBeInTheDocument();
  });

  it('should show correct progress when last rep is completed', () => {
    // This simulates what should happen after completing the 8th rep of the last set
    const timerState: TimerState = {
      isRunning: false, // Timer stops after last rep
      currentTime: 3, // Completed the 3-second rep
      targetTime: 3,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentSet: 1, // Still on set 2 (0-indexed)
      totalSets: 2,
      currentRep: 8, // All 8 reps completed
      totalReps: 8
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timerState}
      />
    );

    // UPDATED EXPECTATIONS: When stopped after completion, compact section shows final state
    // Progress section should show completed reps (capped at 8/8, not 9/8)
    expect(screen.getByText('Rep 8/8')).toBeInTheDocument();
    expect(screen.getByText('Set 2/2')).toBeInTheDocument();
  });

  it('should show correct progress during rest between sets', () => {
    // This simulates rest period after completing first set
    const timerState: TimerState = {
      isRunning: true,
      currentTime: 15, // 15 seconds into 30-second rest
      targetTime: 30,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: true,
      restTimeRemaining: 15, // 15 seconds left
      currentSet: 0, // Completed set 1, will start set 2 after rest
      totalSets: 2,
      currentRep: 8, // Completed all 8 reps of first set
      totalReps: 8
    };

    render(
      <TimerPage
        {...defaultProps}
        timerState={timerState}
      />
    );

    // UPDATED EXPECTATIONS: Component shows rest period display
    // Timer display should show rest countdown (00:15)
    expect(screen.getByText('00:15')).toBeInTheDocument();
    
    // Timer display should show "Rest Period"
    expect(screen.getByText('Rest Period')).toBeInTheDocument();
  });
});
