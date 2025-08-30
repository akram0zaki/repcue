import { BASE_REP_TIME, REST_TIME_BETWEEN_SETS } from '../constants';
import type { AppSettings, Exercise, WorkoutExercise } from '../types';

export interface ExerciseDurationDetail {
  exercise_id: string;
  duration: number;
  sets?: number;
  reps?: number;
}

/**
 * Compute duration for a single workout exercise using app settings and exercise defaults.
 * - Time-based: custom_duration || default_duration || 30
 * - Rep-based: (sets * reps * (rep_duration_seconds||BASE_REP_TIME) * rep_speed_factor) + rest_between_sets
 */
export function computeExerciseDuration(
  exercise: Exercise,
  workoutExercise: WorkoutExercise,
  appSettings: AppSettings
): ExerciseDurationDetail {
  if (exercise.exercise_type === 'time_based') {
    const duration = workoutExercise.custom_duration || exercise.default_duration || 30;
    return { exercise_id: exercise.id, duration: Math.round(duration) };
  }

  const sets = workoutExercise.custom_sets || exercise.default_sets || 1;
  const reps = workoutExercise.custom_reps || exercise.default_reps || 10;
  const baseRep = exercise.rep_duration_seconds || BASE_REP_TIME;
  const repTime = Math.round(baseRep * appSettings.rep_speed_factor);
  const restTime = sets > 1 ? (sets - 1) * REST_TIME_BETWEEN_SETS : 0;
  const duration = (sets * reps * repTime) + restTime;
  return { exercise_id: exercise.id, duration: Math.round(duration), sets, reps };
}

/**
 * Compute per-exercise and total workout duration with consistent semantics across the app.
 */
export function computeWorkoutDurations(
  workoutExercises: WorkoutExercise[],
  exercises: Exercise[],
  appSettings: AppSettings
): { perExercise: ExerciseDurationDetail[]; total: number } {
  const perExercise: ExerciseDurationDetail[] = [];

  for (const we of workoutExercises) {
    const exercise = exercises.find(ex => ex.id === we.exercise_id);
    if (!exercise) continue;
    perExercise.push(computeExerciseDuration(exercise, we, appSettings));
  }

  const total = Math.round(perExercise.reduce((a, b) => a + b.duration, 0));
  return { perExercise, total };
}
