import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import { ExerciseType } from '../../types';

// Mock data
const mockExercise: Exercise = {
  id: 'test-exercise',
  name: 'Test Exercise',
  description: 'Test description',
  category: 'core',
  exerciseType: ExerciseType.TIME_BASED,
  defaultDuration: 30,
  isFavorite: false,
  tags: ['test']
};

const defaultTimerState: TimerState = {
  isRunning: false,
  currentTime: 0,
  targetTime: undefined,
  startTime: undefined,
  intervalDuration: 30,
  currentExercise: undefined,
  isCountdown: false,
  countdownTime: 0,
  isResting: false
};

const defaultProps = {
  exercises: [mockExercise],
  appSettings: DEFAULT_APP_SETTINGS,
  timerState: defaultTimerState,
  selectedExercise: mockExercise,
  selectedDuration: 30 as const, // Use proper const assertion for TimerPreset
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

describe('TimerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders timer interface correctly', () => {
    render(<TimerPage {...defaultProps} />);
    
    expect(screen.getByText('Test Exercise')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument(); // Button always shows "Start"
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows stop button when timer is running', () => {
    const runningTimerState = {
      ...defaultTimerState,
      isRunning: true,
      currentTime: 10,
      targetTime: 30
    };

    render(<TimerPage {...defaultProps} timerState={runningTimerState} />);
    
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
  });

  it('calls onStopTimer when stop button is clicked', () => {
    const runningTimerState = {
      ...defaultTimerState,
      isRunning: true,
      currentTime: 10,
      targetTime: 30
    };

    render(<TimerPage {...defaultProps} timerState={runningTimerState} />);
    
    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);
    
    expect(defaultProps.onStopTimer).toHaveBeenCalledWith();
  });

  it('displays correct time format', () => {
    const runningTimerState = {
      ...defaultTimerState,
      isRunning: true,
      currentTime: 65, // 1 minute 5 seconds
      targetTime: 120
    };

    render(<TimerPage {...defaultProps} timerState={runningTimerState} />);
    
    // Should show elapsed time: 65 seconds = 01:05 (not remaining time)
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });
});
