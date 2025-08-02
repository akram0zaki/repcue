import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';

const mockExercise: Exercise = {
  id: 'exercise-1',
  name: 'Push-ups',
  description: 'Classic upper body exercise',
  category: 'strength',
  exerciseType: 'repetition-based',
  defaultSets: 3,
  defaultReps: 10,
  isFavorite: false,
  tags: ['upper-body', 'bodyweight']
};

const mockWorkoutMode = {
  workoutId: 'workout-1',
  workoutName: 'Upper Body Workout',
  exercises: [
    {
      id: 'ex-1',
      exerciseId: 'exercise-1',
      order: 1,
      customSets: 3,
      customReps: 10
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

    return render(
      <MemoryRouter>
        <TimerPage {...defaultProps} timerState={fullTimerState} />
      </MemoryRouter>
    );
  };

  it('should display prominent exercise name in workout mode', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the exercise name is prominently displayed
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    
    // Check that it shows as a heading (large and bold)
    const exerciseNameElement = screen.getByText('Push-ups');
    expect(exerciseNameElement).toHaveClass('text-lg', 'font-bold');
  });

  it('should display exercise category in workout mode', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the category is displayed
    expect(screen.getByText(/strength/)).toBeInTheDocument();
    expect(screen.getByText(/Current Exercise • strength/)).toBeInTheDocument();
  });

  it('should display exercise description when available', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check that the description is displayed
    expect(screen.getByText('Classic upper body exercise')).toBeInTheDocument();
    
    // Check that it's styled as italic text
    const descriptionElement = screen.getByText('Classic upper body exercise');
    expect(descriptionElement).toHaveClass('italic');
  });

  it('should not display prominent exercise card when not in workout mode', () => {
    renderTimerPage({
      workoutMode: undefined
    });

    // The prominent exercise display should not be present
    const exerciseCards = screen.queryByText('Current Exercise •');
    expect(exerciseCards).not.toBeInTheDocument();
  });

  it('should handle exercise without description gracefully', () => {
    const exerciseWithoutDescription: Exercise = {
      ...mockExercise,
      description: undefined as any
    };

    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Should still display the name and category
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText(/Current Exercise • strength/)).toBeInTheDocument();
  });

  it('should display workout header with exercise info', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode
    });

    // Check workout header is present
    expect(screen.getByText('Upper Body Workout')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    
    // Check exercise info in header
    expect(screen.getByText('Exercise 1: Push-ups')).toBeInTheDocument();
  });

  it('should show loading state when exercise is not yet loaded', () => {
    renderTimerPage({
      workoutMode: mockWorkoutMode,
    });

    // Render with no selected exercise
    const propsWithoutExercise = {
      ...defaultProps,
      selectedExercise: null,
      timerState: {
        isRunning: false,
        currentTime: 0,
        intervalDuration: 30,
        targetTime: 30,
        startTime: undefined,
        currentExercise: undefined,
        isCountdown: false,
        countdownTime: 0,
        isResting: false,
        workoutMode: mockWorkoutMode,
      }
    };

    render(
      <MemoryRouter>
        <TimerPage {...propsWithoutExercise} />
      </MemoryRouter>
    );

    // Should show loading text in the header
    expect(screen.getByText('Exercise 1: Loading...')).toBeInTheDocument();
  });
});
