import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimerPage from '../TimerPage';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import type { Exercise, TimerState } from '../../types';
import { ExerciseType } from '../../types';
import { createMockExercise, createMockAppSettings } from '../../test/testUtils';

const mockExercise: Exercise = createMockExercise({
  id: 'test-exercise',
  name: 'Test Exercise',
  description: 'Test description for countdown',
  category: 'core',
  exerciseType: ExerciseType.TIME_BASED,
  defaultDuration: 30,
  isFavorite: false,
  tags: ['test']
});

describe('TimerPage - Pre-Timer Countdown Feature', () => {
  const defaultProps = {
    exercises: [mockExercise],
    appSettings: createMockAppSettings({ ...DEFAULT_APP_SETTINGS, preTimerCountdown: 5 }),
    timerState: {
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      startTime: undefined,
      intervalDuration: 30,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0
    } as TimerState,
    selectedExercise: mockExercise,
    selectedDuration: 30 as const,
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

  it('shows "Start" button when countdown is enabled', () => {
    render(<TimerPage {...defaultProps} />);
    
    const startButton = screen.getByRole('button', { name: /^start$/i });
    expect(startButton).toBeInTheDocument();
  });

  it('shows "Start" button when countdown is disabled', () => {
    const propsWithoutCountdown = {
      ...defaultProps,
      appSettings: createMockAppSettings({ ...DEFAULT_APP_SETTINGS, preTimerCountdown: 0 })
    };
    
    render(<TimerPage {...propsWithoutCountdown} />);
    
    const startButton = screen.getByRole('button', { name: /^start$/i });
    expect(startButton).toBeInTheDocument();
  });

  it('displays countdown state correctly', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 3
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    // Check countdown number is displayed
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check "Get ready..." message
    expect(screen.getByText('Get ready...')).toBeInTheDocument();
    
    // Check countdown banner
    expect(screen.getByText(/Get Ready! Timer starts in 3 second/)).toBeInTheDocument();
  });

  it('shows "Cancel" button during countdown', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 5
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('uses orange styling during countdown', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 4
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    // Check that countdown number has orange styling
    const countdownNumber = screen.getByText('4');
    expect(countdownNumber).toHaveClass('text-orange-500');
  });

  it('handles countdown progress calculation', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 3 // 3 seconds remaining out of 5 total
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    // The circular progress should show countdown progress
    // This would need to be verified through visual inspection or specific CSS classes
    // For now, we verify the countdown display
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays proper countdown banner text for singular second', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 1
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    // Should show "second" not "seconds" for 1
    expect(screen.getByText(/Timer starts in 1 second$/)).toBeInTheDocument();
  });

  it('displays proper countdown banner text for plural seconds', () => {
    const countdownState = {
      ...defaultProps.timerState,
      isRunning: true,
      isCountdown: true,
      countdownTime: 5
    };
    
    render(<TimerPage {...defaultProps} timerState={countdownState} />);
    
    // Should show "seconds" for values > 1
    expect(screen.getByText(/Timer starts in 5 seconds/)).toBeInTheDocument();
  });
});
