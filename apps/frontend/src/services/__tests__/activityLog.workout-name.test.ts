import { describe, it, expect, beforeAll } from 'vitest';
import { storageService } from '../storageService';
import type { ActivityLog, Workout } from '../../types';

describe('ActivityLog workout name', () => {
  beforeAll(async () => {
    // Ensure clean DB for this test run
    await storageService.resetDatabase();
  });

  it('saves workout activity log with workout name as exercise_name', async () => {
    const workout: Workout = {
      id: 'workout_test_1',
      name: 'Test Workout',
      exercises: [],
      estimated_duration: 60,
      scheduled_days: [],
      is_active: true,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      deleted: false,
      version: 1
    };

    await storageService.saveWorkout(workout);

    const log: ActivityLog = {
      id: 'workout-session-abc',
      exercise_id: 'workout',
      // intentionally omit exercise_name to exercise the backfill path
      exercise_name: undefined as unknown as string,
      duration: 60,
      timestamp: new Date().toISOString(),
      notes: 'Completed workout',
      is_workout: true,
      workout_id: workout.id,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      deleted: false,
      version: 1
    };

    await storageService.saveActivityLog(log);
    const logs = await storageService.getActivityLogs(5);
    const saved = logs.find(l => l.id === log.id);
    expect(saved).toBeTruthy();
    expect(saved!.exercise_name).toBe('Test Workout');
  });
});
