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
    exerciseType: 'repetition-based',
    defaultSets: 2,
    defaultReps: 8,
    isFavorite: false,
    tags: []
  });

  const mockAppSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    repSpeedFactor: 1.0
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

    // FIXED EXPECTATIONS:
    // Set Progress: Should show 1 of 2 sets completed because we're still working on set 2
    expect(screen.getByText('1 of 2 sets completed')).toBeInTheDocument(); // Shows completed sets
    
    // Rep Progress: Should show 7/8 (7 completed, working on 8th)
    expect(screen.getByText('7 / 8')).toBeInTheDocument();
    
    // Set progress bar should be 50% (1 completed set out of 2)
    const setProgressBar = screen.getByText('1 of 2 sets completed').parentElement?.parentElement?.querySelector('.bg-blue-600');
    expect(setProgressBar).toHaveStyle('width: 50%');
    expect(setProgressBar).toHaveStyle('width: 50%');
    
    // Rep progress bar should be 87.5% (7 out of 8 completed)
    const repProgressBar = screen.getByText('7 / 8').parentElement?.parentElement?.querySelector('.bg-green-600');
    expect(repProgressBar).toHaveStyle('width: 87.5%');
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

    // Set Progress: Should show 2 of 2 sets completed (exercise complete)
    expect(screen.getByText('2 of 2 sets completed')).toBeInTheDocument();
    
    // Rep Progress: Should show 8/8 (all reps completed)
    expect(screen.getByText('8 / 8')).toBeInTheDocument();
    
    // Set progress bar should be 100% (exercise complete)
    const setProgressBar = screen.getByText('2 of 2 sets completed').parentElement?.parentElement?.querySelector('.bg-blue-600');
    expect(setProgressBar).toHaveStyle('width: 100%');
    expect(setProgressBar).toHaveStyle('width: 100%');
    
    // Rep progress bar should be 100% (all reps in set completed)
    const repProgressBar = screen.getByText('8 / 8').parentElement?.parentElement?.querySelector('.bg-green-600');
    expect(repProgressBar).toHaveStyle('width: 100%');
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

    // Set Progress: Should show 1 of 2 sets completed (1 set completed, resting before 2nd)
    expect(screen.getByText('1 of 2 sets completed')).toBeInTheDocument();
    
    // Rep Progress: Should show 8/8 (all reps of current set completed)
    expect(screen.getByText('8 / 8')).toBeInTheDocument();
    
    // Set progress bar should be 50% (1 set complete out of 2)
    const setProgressBar = screen.getByText('1 of 2 sets completed').parentElement?.parentElement?.querySelector('.bg-blue-600');
    expect(setProgressBar).toHaveStyle('width: 50%');
    expect(setProgressBar).toHaveStyle('width: 50%');
    
    // Rep progress bar should be 100% (all reps in current set completed)
    const repProgressBar = screen.getByText('8 / 8').parentElement?.parentElement?.querySelector('.bg-green-600');
    expect(repProgressBar).toHaveStyle('width: 100%');
  });
});
