import { describe, it, expect } from 'vitest';
import { computeExerciseDuration, computeWorkoutDurations } from '../workoutDuration';
import type { AppSettings, Exercise, WorkoutExercise } from '../../types';

const appSettings: AppSettings = {
  id: 'settings-1',
  interval_duration: 30,
  sound_enabled: false,
  vibration_enabled: false,
  beep_volume: 0.5,
  dark_mode: false,
  auto_save: true,
  last_selected_exercise_id: null,
  pre_timer_countdown: 3,
  default_rest_time: 60,
  rep_speed_factor: 1.0,
  show_exercise_videos: false,
  reduce_motion: false,
  auto_start_next: false,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  deleted: false,
  version: 1
};

const timeExercise: Exercise = {
  id: 'ex-time',
  name: 'Plank',
  category: 'core',
  exercise_type: 'time_based',
  default_duration: 60,
  is_favorite: false,
  tags: [],
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  deleted: false,
  version: 1
};

const repExercise: Exercise = {
  id: 'ex-rep',
  name: 'Push Up',
  category: 'strength',
  exercise_type: 'repetition_based',
  default_sets: 2,
  default_reps: 4,
  rep_duration_seconds: 2,
  is_favorite: false,
  tags: [],
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  deleted: false,
  version: 1
};

describe('workoutDuration utils', () => {
  it('computes time-based exercise duration', () => {
    const detail = computeExerciseDuration(timeExercise, { id: 'we1', exercise_id: 'ex-time', order: 0 }, appSettings);
    expect(detail.duration).toBe(60);
  });

  it('computes rep-based exercise duration including rest between sets', () => {
    const detail = computeExerciseDuration(repExercise, { id: 'we2', exercise_id: 'ex-rep', order: 1 }, appSettings);
    // sets(2) * reps(4) * repTime(2) + rest(1*30) = 16 + 30 = 46
    expect(detail.duration).toBe(46);
    expect(detail.sets).toBe(2);
    expect(detail.reps).toBe(4);
  });

  it('computes total workout duration and per-exercise details', () => {
    const workoutExercises: WorkoutExercise[] = [
      { id: 'we1', exercise_id: 'ex-time', order: 0 },
      { id: 'we2', exercise_id: 'ex-rep', order: 1 }
    ];
    const { perExercise, total } = computeWorkoutDurations(workoutExercises, [timeExercise, repExercise], appSettings);
    expect(perExercise.map(d => d.duration)).toEqual([60, 46]);
    expect(total).toBe(106);
  });
});
