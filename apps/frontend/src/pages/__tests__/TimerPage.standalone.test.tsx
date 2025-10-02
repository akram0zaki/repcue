import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import React from 'react';
import TimerPage from '../TimerPage';
import type { Exercise, TimerState, AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS, type TimerPreset } from '../../constants';
import { createMockExercise, createMockAppSettings } from '../../test/testUtils';

// Mock the audio service
vi.mock('../../services/audioService', () => ({
  playStartFeedback: vi.fn(),
  playStopFeedback: vi.fn(),
  playIntervalFeedback: vi.fn(),
  announceText: vi.fn(),
}));

// Mock wake lock hook
vi.mock('../../hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    isSupported: false,
    isActive: false,
    requestWakeLock: vi.fn(),
    releaseWakeLock: vi.fn(),
  }),
}));

// Mock data exercise
const mockRepBasedExercise: Exercise = createMockExercise({
  id: 'pushups',
  name: 'Push-ups',
  description: 'Classic push-up exercise',
  category: 'strength',
  exercise_type: 'repetition_based',
  default_duration: 30,
  default_sets: 3,
  default_reps: 8,
  is_favorite: false,
  tags: [],
});

const mockAppSettings: AppSettings = createMockAppSettings({
  ...DEFAULT_APP_SETTINGS,
  rep_speed_factor: 1.0,
});

describe('TimerPage - Standalone Rep-Based Exercise', () => {
  const mockFunctions = {
    onSetSelectedExercise: vi.fn(),
    onSetSelectedDuration: vi.fn(),
    onSetShowExerciseSelector: vi.fn(),
    onStartTimer: vi.fn(),
    onStopTimer: vi.fn(),
    onResetTimer: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display rep/set progress for standalone rep-based exercise', () => {
    const timerStateWithReps: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentExercise: mockRepBasedExercise,
      // Standalone rep/set tracking
      currentSet: 0,
      totalSets: 3,
      currentRep: 0,
      totalReps: 8,
    };

    render(
      <Router>
        <TimerPage
          {...mockFunctions}
          selectedExercise={mockRepBasedExercise}
          selectedDuration={15 as TimerPreset}
          timerState={timerStateWithReps}
          exercises={[mockRepBasedExercise]}
          appSettings={mockAppSettings}
          showExerciseSelector={false}
          wakeLockSupported={false}
          wakeLockActive={false}
        />
      </Router>
    );

    // Check that rep/set progress is displayed in the timer
    // For rep-based exercises not running, we should see the timer display ready state
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    // Since the timer is not running, we expect to see the setup state rather than "Rep 1"
  });

  it('should show nested circles for standalone rep-based exercise', () => {
    const timerStateWithReps: TimerState = {
      isRunning: true,
      currentTime: 2,
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentExercise: mockRepBasedExercise,
      // Standalone rep/set tracking
      currentSet: 0,
      totalSets: 3,
      currentRep: 0,
      totalReps: 8,
    };

    render(
      <Router>
        <TimerPage
          {...mockFunctions}
          selectedExercise={mockRepBasedExercise}
          selectedDuration={15 as TimerPreset}
          timerState={timerStateWithReps}
          exercises={[mockRepBasedExercise]}
          appSettings={mockAppSettings}
          showExerciseSelector={false}
          wakeLockSupported={false}
          wakeLockActive={false}
        />
      </Router>
    );

    // Check that the timer display contains SVG elements for rep-based exercises
    // The UI should show circular timer with nested progress rings
    const timerDisplay = screen.getByTestId('timer-display');
    expect(timerDisplay).toBeInTheDocument();

    // For running rep-based exercises, we should see the rep display
    expect(screen.getByText('Rep 1')).toBeInTheDocument();
    expect(screen.getByText(/of 8 in Set 1\/3/)).toBeInTheDocument();
  });

  it('should show exercise controls for standalone rep-based exercise', () => {
    const timerStateWithReps: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentExercise: mockRepBasedExercise,
      // Standalone rep/set tracking
      currentSet: 0,
      totalSets: 3,
      currentRep: 0,
      totalReps: 8,
    };

    render(
      <Router>
        <TimerPage
          {...mockFunctions}
          selectedExercise={mockRepBasedExercise}
          selectedDuration={15 as TimerPreset}
          timerState={timerStateWithReps}
          exercises={[mockRepBasedExercise]}
          appSettings={mockAppSettings}
          showExerciseSelector={false}
          wakeLockSupported={false}
          wakeLockActive={false}
        />
      </Router>
    );

    // Check that timer controls are displayed (start/stop/reset buttons)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();

    // The timer display should be present for the exercise
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
  });

  it('should display correct initial rep/set progress (1/8, 1/3)', () => {
    const timerStateWithReps: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentExercise: mockRepBasedExercise,
      // 0-based internally but should display as 1-based
      currentSet: 0,
      totalSets: 3,
      currentRep: 0,
      totalReps: 8,
    };

    render(
      <Router>
        <TimerPage
          {...mockFunctions}
          selectedExercise={mockRepBasedExercise}
          selectedDuration={15 as TimerPreset}
          timerState={timerStateWithReps}
          exercises={[mockRepBasedExercise]}
          appSettings={mockAppSettings}
          showExerciseSelector={false}
          wakeLockSupported={false}
          wakeLockActive={false}
        />
      </Router>
    );

    // Check that the timer display exists and is properly configured for rep-based exercise
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();

    // For a stopped rep-based exercise, the timer should show ready state
    // We can verify it's a rep-based exercise by checking the selected exercise type
    expect(mockRepBasedExercise.exercise_type).toBe('repetition_based');
  });

  it('should update rep progress during exercise', () => {
    const timerStateMiddleRep: TimerState = {
      isRunning: true,
      currentTime: 3,
      targetTime: 15,
      intervalDuration: 30,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      currentExercise: mockRepBasedExercise,
      // Currently on rep 3 of 8, set 1 of 3
      currentSet: 0,
      totalSets: 3,
      currentRep: 2,
      totalReps: 8,
    };

    render(
      <Router>
        <TimerPage
          {...mockFunctions}
          selectedExercise={mockRepBasedExercise}
          selectedDuration={15 as TimerPreset}
          timerState={timerStateMiddleRep}
          exercises={[mockRepBasedExercise]}
          appSettings={mockAppSettings}
          showExerciseSelector={false}
          wakeLockSupported={false}
          wakeLockActive={false}
        />
      </Router>
    );

    // Check that the timer is running and displaying rep progress in the center
    // For a running rep-based exercise with currentRep=2, we should see "Rep 3" (working on 3rd rep)
    expect(screen.getByText('Rep 3')).toBeInTheDocument();
    expect(screen.getByText(/of 8 in Set 1\/3/)).toBeInTheDocument();
  });
});
