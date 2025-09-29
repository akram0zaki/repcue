import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateCurrentStreak } from '../activityCharts';
import type { ActivityLog } from '../../types';

describe('calculateCurrentStreak', () => {
  const createMockLog = (daysAgo: number): ActivityLog => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      id: `log-${daysAgo}`,
      exercise_id: 'test-exercise',
      exercise_name: 'Test Exercise',
      duration: 60,
      timestamp: date.toISOString(),
      notes: `Workout ${daysAgo} days ago`,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      deleted: false,
      version: 1
    };
  };

  beforeEach(() => {
    // Mock current date to September 30, 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-09-30T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 for empty logs', () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it('should preserve streak when current day has no workout yet', () => {
    // Scenario: User had workouts on Sep 26, 27, 28, 29 but not Sep 30 yet
    const logs = [
      createMockLog(1), // Sep 29
      createMockLog(2), // Sep 28
      createMockLog(3), // Sep 27
      createMockLog(4), // Sep 26
    ];

    // Should return 4 (preserving the 4-day streak from previous days)
    expect(calculateCurrentStreak(logs)).toBe(4);
  });

  it('should include today in streak when current day has workout', () => {
    // Scenario: User had workouts on Sep 26, 27, 28, 29, and also Sep 30
    const logs = [
      createMockLog(0), // Today (Sep 30)
      createMockLog(1), // Sep 29
      createMockLog(2), // Sep 28
      createMockLog(3), // Sep 27
      createMockLog(4), // Sep 26
    ];

    // Should return 5 (including today)
    expect(calculateCurrentStreak(logs)).toBe(5);
  });

  it('should break streak when there is a gap in previous days', () => {
    // Scenario: User had workouts on Sep 28, 29 but not Sep 27 (gap)
    const logs = [
      createMockLog(1), // Sep 29
      createMockLog(2), // Sep 28
      createMockLog(4), // Sep 26 (gap at Sep 27)
      createMockLog(5), // Sep 25
    ];

    // Should return 2 (only Sep 28 and 29, broken by gap at Sep 27)
    expect(calculateCurrentStreak(logs)).toBe(2);
  });

  it('should handle single workout today', () => {
    const logs = [createMockLog(0)]; // Only today

    expect(calculateCurrentStreak(logs)).toBe(1);
  });

  it('should handle single workout yesterday when no workout today', () => {
    const logs = [createMockLog(1)]; // Only yesterday

    expect(calculateCurrentStreak(logs)).toBe(1);
  });

  it('should handle workout only on older days with gaps', () => {
    // Scenario: Workouts on Sep 27, 26 but gap on Sep 28, 29
    const logs = [
      createMockLog(3), // Sep 27
      createMockLog(4), // Sep 26
      // Gap: no workouts on Sep 28, 29, 30
    ];

    // Should return 0 because there's a gap (no workouts on Sep 28, 29)
    expect(calculateCurrentStreak(logs)).toBe(0);
  });

  it('should properly count consecutive calendar days', () => {
    // Scenario: Consecutive workouts but with a gap
    const logs = [
      createMockLog(1), // Sep 29 ✅
      createMockLog(2), // Sep 28 ✅  
      // Gap: Sep 27 ❌ (no workout)
      createMockLog(4), // Sep 26 ✅
      createMockLog(5), // Sep 25 ✅
    ];

    // Should return 2 (only Sep 28, 29 - broken by gap at Sep 27)
    expect(calculateCurrentStreak(logs)).toBe(2);
  });

  it('should handle multiple workouts on same day', () => {
    // Scenario: Multiple workouts today and yesterday
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const logs: ActivityLog[] = [
      {
        id: 'log-today-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Exercise 1',
        duration: 30,
        timestamp: today.toISOString(),
        notes: 'First workout today',
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
        deleted: false,
        version: 1
      },
      {
        id: 'log-today-2',
        exercise_id: 'exercise-2',
        exercise_name: 'Exercise 2',
        duration: 30,
        timestamp: today.toISOString(),
        notes: 'Second workout today',
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
        deleted: false,
        version: 1
      },
      {
        id: 'log-yesterday',
        exercise_id: 'exercise-3',
        exercise_name: 'Exercise 3',
        duration: 30,
        timestamp: yesterday.toISOString(),
        notes: 'Yesterday workout',
        created_at: yesterday.toISOString(),
        updated_at: yesterday.toISOString(),
        deleted: false,
        version: 1
      }
    ];

    // Should return 2 (today and yesterday, multiple workouts on same day counted as 1)
    expect(calculateCurrentStreak(logs)).toBe(2);
  });
});