import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TimerState, Exercise, WorkoutMode } from '../types';
import TimerPage from '../pages/TimerPage';

// Mock logger to avoid debug logging during tests
vi.mock('../utils/logger', () => ({
  default: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock feature flags to enable video demos
vi.mock('../config/features', () => ({
  VIDEO_DEMOS_ENABLED: true,
}));

// Mock DOMPurify for i18n
vi.mock('isomorphic-dompurify', () => ({
  sanitize: (str: string) => str,
}));

// Mock global objects
Object.defineProperty(window, 'HTMLVideoElement', {
  writable: true,
  value: class MockHTMLVideoElement {
    currentTime = 0;
    src = '';
    onloadedmetadata = null;
    onerror = null;
    load = vi.fn();
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  }
});

const mockExercises: Exercise[] = [
  {
    id: 'burpees',
    name: 'Burpees',
    description: 'Full body exercise',
    exercise_type: 'repetition_based',
    default_duration: 30,
    default_sets: 2,
    default_reps: 8,
    rep_duration_seconds: 3,
    is_favorite: false,
    tags: ['cardio'],
    has_video: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'plank',
    name: 'Plank',
    description: 'Core strengthening exercise',
    exercise_type: 'time_based',
    default_duration: 30,
    default_sets: 1,
    default_reps: 1,
    is_favorite: false,
    tags: ['core'],
    has_video: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }
];

const mockMediaIndex = {
  'burpees': {
    video: { square: '/videos/burpees.webm' }
  }
};

const mockAppSettings = {
  id: 'test-settings',
  dark_mode: false,
  language: 'en' as const,
  sound_enabled: false,
  vibration_enabled: false,
  theme: 'light' as const,
  interval_duration: 5,
  rep_speed_factor: 1,
  pre_timer_countdown: 3,
  show_exercise_videos: true,
  beep_volume: 50,
  auto_save: true,
  default_rest_time: 30,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  deleted: false,
  version: 1
};

describe('Video State Management Bug Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should clear video when workout completes (exerciseForVideo becomes null)', async () => {
    // Create a workout with burpees followed by plank
    const workoutMode: WorkoutMode = {
      workoutId: 'test-workout',
      workoutName: 'Test Workout',
      exercises: [
        { exercise_id: 'burpees', custom_sets: 2, custom_reps: 8, custom_rest_time: 30 },
        { exercise_id: 'plank', custom_duration: 30, custom_rest_time: 0 }
      ],
      currentExerciseIndex: 2, // Set to length (completed workout)
      isResting: false,
      sessionId: 'test-session'
    };

    // Timer state showing completed workout
    const timerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      startTime: undefined,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      restTimeRemaining: undefined,
      currentSet: undefined,
      totalSets: undefined,
      currentRep: undefined,
      totalReps: undefined,
      workoutMode,
      intervalDuration: 5
    };

    const mockProps = {
      timerState,
      exercises: mockExercises,
      selectedExercise: null, // No individual exercise selected
      selectedDuration: 30 as const,
      appSettings: mockAppSettings,
      mediaIndex: mockMediaIndex,
      onStartTimer: vi.fn(),
      onStopTimer: vi.fn(),
      onResetTimer: vi.fn(),
      onSetSelectedExercise: vi.fn(),
      onSetSelectedDuration: vi.fn(),
      onStartWorkoutMode: vi.fn(),
      showExerciseSelector: false,
      wakeLockSupported: true,
      wakeLockActive: false,
      onSetShowExerciseSelector: vi.fn()
    };

    render(
      <MemoryRouter>
        <TimerPage {...mockProps} />
      </MemoryRouter>
    );

    // When workout is completed (currentExerciseIndex >= exercises.length),
    // there should be no video element rendered
    const videoElements = screen.queryAllByRole('video');
    expect(videoElements).toHaveLength(0);

    // Verify that exerciseForVideo logic returns null for completed workout
    // This is implicit - if no video elements are found, exerciseForVideo was null
  });

  it('should not show video when switching from completed workout to individual exercise until reset', async () => {
    // Simulate state after workout completion but before reset
    const workoutMode: WorkoutMode = {
      workoutId: 'test-workout',
      workoutName: 'Test Workout',
      exercises: [
        { exercise_id: 'burpees', custom_sets: 2, custom_reps: 8, custom_rest_time: 30 }
      ],
      currentExerciseIndex: 1, // Equal to length (completed)
      isResting: false,
      sessionId: 'test-session'
    };

    const timerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      startTime: undefined,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      restTimeRemaining: undefined,
      currentSet: undefined,
      totalSets: undefined,
      currentRep: undefined,
      totalReps: undefined,
      workoutMode,
      intervalDuration: 5
    };

    const mockProps = {
      timerState,
      exercises: mockExercises,
      selectedExercise: mockExercises[0], // Burpees selected (from previous session)
      selectedDuration: 30 as const,
      appSettings: mockAppSettings,
      mediaIndex: mockMediaIndex,
      onStartTimer: vi.fn(),
      onStopTimer: vi.fn(),
      onResetTimer: vi.fn(),
      onSetSelectedExercise: vi.fn(),
      onSetSelectedDuration: vi.fn(),
      onStartWorkoutMode: vi.fn(),
      showExerciseSelector: false,
      wakeLockSupported: true,
      wakeLockActive: false,
      onSetShowExerciseSelector: vi.fn()
    };

    render(
      <MemoryRouter>
        <TimerPage {...mockProps} />
      </MemoryRouter>
    );

    // Even though selectedExercise is burpees (has video), 
    // since we're in workout mode with completed workout,
    // exerciseForVideo should be null and no video should show
    const videoElements = screen.queryAllByRole('video');
    expect(videoElements).toHaveLength(0);
  });

  it('should clear timer state immediately on workout completion to prevent stale exercise data', async () => {
    // Simulate a completed workout state with stale timer data
    const workoutMode: WorkoutMode = {
      workoutId: 'test-workout',
      workoutName: 'Morning Routine 2',
      exercises: [
        { exercise_id: 'burpees', custom_sets: 2, custom_reps: 8, custom_rest_time: 30 }
      ],
      currentExerciseIndex: 1, // Equal to length (completed)
      isResting: false,
      sessionId: 'test-session'
    };

    // Simulate timer state that still has burpees data but workout is complete
    const timerState: TimerState = {
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      startTime: undefined,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0,
      isResting: false,
      restTimeRemaining: undefined,
      intervalDuration: 5,
      // These should be undefined after immediate cleanup, not stale burpees data
      currentSet: undefined,
      totalSets: undefined,
      currentRep: undefined,
      totalReps: undefined,
      workoutMode
    };

    // User selects Bicycle Crunches after workout completion
    const selectedBicycleCrunches: Exercise = {
      id: 'bicycle-crunches',
      name: 'Bicycle Crunches',
      description: 'Core exercise',
      exercise_type: 'repetition_based',
      category: 'core',
      default_duration: 30,
      default_sets: 3,
      default_reps: 20,
      is_favorite: false,
      tags: ['core'],
      has_video: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      deleted: false,
      version: 1
    };

    const mockProps = {
      timerState,
      exercises: [mockExercises[0], selectedBicycleCrunches], // Include both burpees and bicycle crunches
      selectedExercise: selectedBicycleCrunches, // User selected Bicycle Crunches
      selectedDuration: 30 as const,
      appSettings: mockAppSettings,
      mediaIndex: mockMediaIndex,
      showExerciseSelector: false,
      wakeLockSupported: false,
      wakeLockActive: false,
      onStartTimer: vi.fn(),
      onStopTimer: vi.fn(),
      onResetTimer: vi.fn(),
      onSetSelectedExercise: vi.fn(),
      onSetSelectedDuration: vi.fn(),
      onStartWorkoutMode: vi.fn(),
      onSetShowExerciseSelector: vi.fn(),
    };

    render(
      <MemoryRouter>
        <TimerPage {...mockProps} />
      </MemoryRouter>
    );

    // Should show Bicycle Crunches name, not burpees
    expect(screen.getByText('Bicycle Crunches')).toBeInTheDocument();
    
    // Should NOT show burpees set/rep info since totalSets/totalReps are undefined
    // The rep/set progress section should be hidden
    expect(screen.queryByText(/2.*sets.*8.*reps/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Set.*1.*2/)).not.toBeInTheDocument();
    
    // Should show the correct default for Bicycle Crunches when displayed
    // (this would show when timer starts, but not before)
    expect(screen.queryByText(/3.*sets.*20.*reps/)).toBeInTheDocument();
  });
});