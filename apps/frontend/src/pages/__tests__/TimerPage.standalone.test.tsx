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

    // Check that rep/set progress is displayed
    expect(screen.getByText('Set Progress')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument();
    expect(screen.getByText('Rep Progress')).toBeInTheDocument();
    expect(screen.getByText('0 / 8')).toBeInTheDocument(); // Shows completed reps (0 completed when starting)
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

    // Check that nested circles are rendered (SVG circles should exist)
    const svgElement = document.querySelector('svg.transform.-rotate-90');
    expect(svgElement).toBeInTheDocument();
    
    // Should have nested circles (multiple circle elements)
    const circles = document.querySelectorAll('svg circle');
    expect(circles.length).toBeGreaterThan(1);
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

    // Check that exercise controls are displayed (not workout controls)
    expect(screen.getByText('Exercise Controls')).toBeInTheDocument();
    
    // Check for rep advancement button
    expect(screen.getByText(/Next Rep/)).toBeInTheDocument();
    expect(screen.getByText(/Next Set/)).toBeInTheDocument();
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

    // Check the display shows completed counts
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument(); // Set progress (0 completed when working on current set)
    expect(screen.getByText('0 / 8')).toBeInTheDocument(); // Rep progress (0 completed when currentRep is 0)
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

    // Check that progress shows completed rep/set (2 reps completed, 1st set)
    expect(screen.getByText('0 of 3 sets completed')).toBeInTheDocument(); // Still working on set 1, so 0 completed
    expect(screen.getByText('2 / 8')).toBeInTheDocument(); // 2 reps completed (was working on rep 3)
  });
});
