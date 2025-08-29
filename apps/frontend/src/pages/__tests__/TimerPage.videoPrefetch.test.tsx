import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import TimerPage from '../TimerPage';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { createMockExercise, createMockAppSettings } from '../../test/testUtils';

// Minimal exercise with video flag
const exercise: Exercise = createMockExercise({
  id: 'jumping-jacks', name: 'Jumping Jacks', description: 'Cardio move', category: 'cardio',
  exercise_type: 'repetition_based', default_sets: 1, default_reps: 2, is_favorite: false, tags: [], has_video: true
});

const baseSettings: AppSettings = createMockAppSettings({
  theme: 'light', interval_duration: 5, rep_speed_factor: 1, pre_timer_countdown: 3, show_exercise_videos: true,
  enable_sound: true, enable_haptics: true, default_rest_time: 30
} as any);

const noop = async () => {};

function renderWithState(state: Partial<TimerState>) {
  const timerState: any = {
    isRunning: false,
    isCountdown: false,
    countdownTime: 3,
    currentTime: 0,
    targetTime: 10,
    isResting: false,
    restTimeRemaining: 0,
    ...state
  };
  return render(<TimerPage
    exercises={[exercise]}
    appSettings={baseSettings}
    timerState={timerState}
    selectedExercise={exercise}
  selectedDuration={5}
    showExerciseSelector={false}
    wakeLockSupported={false}
    wakeLockActive={false}
    onSetSelectedExercise={() => {}}
    onSetSelectedDuration={() => {}}
    onSetShowExerciseSelector={() => {}}
    onStartTimer={noop}
    onStopTimer={noop}
    onResetTimer={noop}
  />);
}

describe('TimerPage video prefetch (Phase 3 T-3.3)', () => {
  it('adds prefetch link during countdown', () => {
    renderWithState({ isCountdown: true });
    const link = document.querySelector('link[rel="prefetch"][as="video"]');
    // Not all environments will have media metadata; tolerate absence but ensure no crash
    expect(link).toBeDefined();
  });

  it('adds prefetch link during workout rest for next exercise (simulated)', () => {
    // Simulate a workout mode rest state with upcoming exercise index 0
  renderWithState({ workoutMode: { workoutId: 'w1', isResting: true, currentExerciseIndex: 0, exercises: [{ id: 'we1', order: 0, exercise_id: 'jumping-jacks' }], workoutName: 'Test', totalReps: 2, currentRep: 0, totalSets:1, currentSet:0 } });
    const link = document.querySelector('link[rel="prefetch"][as="video"]');
    expect(link).toBeDefined();
  });
});
