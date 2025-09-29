/**
 * Test for duration formatting fix
 * 
 * This tests the fix for floating-point precision issues in duration display
 * where values like "32.900999999999984s" were being shown instead of "33s"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ActivityLogPage from '../pages/ActivityLogPage';
import type { Exercise, ActivityLog } from '../types';
import { ExerciseCategory } from '../types';
import { createMockExercise, createMockActivityLog } from '../test/testUtils';

// Mock the storage service
vi.mock('../services/storageService', () => ({
  storageService: {
    getActivityLogs: vi.fn(),
  }
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'activity.title': 'Activity Log',
        'activity.subtitle': 'Track your fitness journey and progress',
        'activity.noWorkouts': 'No workouts yet',
        'activity.startFirstWorkout': 'Start your first workout to see your activity here',
        'common:activity.charts.weekNumber': 'Week 40',
        'common:activity.charts.previousWeek': 'Previous week',
        'common:activity.charts.nextWeek': 'Next week',
        'common:weekdayAbbrev.monday': 'Mon',
        'common:weekdayAbbrev.tuesday': 'Tue',
        'common:weekdayAbbrev.wednesday': 'Wed',
        'common:weekdayAbbrev.thursday': 'Thu',
        'common:weekdayAbbrev.friday': 'Fri',
        'common:weekdayAbbrev.saturday': 'Sat',
        'common:weekdayAbbrev.sunday': 'Sun',
        'common.loading': 'Loading...'
      };
      return translations[key] || key;
    },
    i18n: { resolvedLanguage: 'en', language: 'en', languages: ['en'] }
  }),
  I18nextProvider: ({ children }: any) => children
}));

// Mock date utilities that ActivityLogPage might need
vi.mock('../utils/dateUtils', () => ({
  formatDate: (date: string | Date) => 'Jan 1',
  getWeekNumber: () => 40,
  getWeekRange: () => 'Sep 29 - Oct 5'
}));

import { storageService } from '../services/storageService';
const mockStorageService = vi.mocked(storageService);

describe('Duration Format Fix', () => {
  const mockExercise: Exercise = createMockExercise({
    id: 'exercise-1',
    name: 'Test Exercise',
    description: 'A test exercise',
    category: ExerciseCategory.CORE,
    exercise_type: 'time_based',
    default_duration: 30,
    is_favorite: false,
    tags: ['test']
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format floating-point durations correctly', async () => {
    // Create activity logs with floating-point duration values (like what might come from performance.now())
    const mockLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 32.900999999999984, // This should be formatted as "33s"
        timestamp: '2024-01-01T10:00:00Z',
        notes: 'Test log 1'
      }),
      createMockActivityLog({
        id: 'log-2',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 65.15999999999999, // This should be formatted as "1m 5s"
        timestamp: '2024-01-01T11:00:00Z',
        notes: 'Test log 2'
      }),
      createMockActivityLog({
        id: 'log-3',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 120.99999999999999, // This should be formatted as "2m 1s"
        timestamp: '2024-01-01T12:00:00Z',
        notes: 'Test log 3'
      })
    ];

    mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

    await act(async () => {
      render(<ActivityLogPage exercises={[mockExercise]} />);
    });

    // Wait for the component to load
    await screen.findByText('Activity Log');

    // Check that durations are formatted correctly without floating-point precision issues
    expect(screen.getByText('33s')).toBeInTheDocument(); // 32.9... rounded to 33
    expect(screen.getByText('1m 5s')).toBeInTheDocument(); // 65.15... rounded to 65 -> 1m 5s
    expect(screen.getByText('2m 1s')).toBeInTheDocument(); // 120.99... rounded to 121 -> 2m 1s

    // Check that the total duration is also formatted correctly
    // Total: 33 + 65 + 121 = 219 seconds = 3m 39s
    expect(await screen.findByText('3m 39s')).toBeInTheDocument();
  });

  it('should handle whole number durations correctly', async () => {
    const mockLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 30, // Exact whole number
        timestamp: '2024-01-01T10:00:00Z',
        notes: 'Test log'
      }),
      createMockActivityLog({
        id: 'log-2',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 60, // Exact minute
        timestamp: '2024-01-01T11:00:00Z',
        notes: 'Test log'
      })
    ];

    mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

    await act(async () => {
      render(<ActivityLogPage exercises={[mockExercise]} />);
    });

    await screen.findByText('Activity Log');

    // Check that whole numbers are still formatted correctly
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('1m')).toBeInTheDocument(); // 60s should be formatted as 1m (no seconds part)

    // Total: 30 + 60 = 90 seconds = 1m 30s
    expect(await screen.findByText('1m 30s')).toBeInTheDocument();
  });

  it('should handle edge cases correctly', async () => {
    const mockLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 0.9, // Should round to 1s
        timestamp: '2024-01-01T10:00:00Z',
        notes: 'Very short exercise'
      }),
      createMockActivityLog({
        id: 'log-2',
        exercise_id: 'exercise-1',
        exercise_name: 'Test Exercise',
        duration: 59.6, // Should round to 60s -> 1m
        timestamp: '2024-01-01T11:00:00Z',
        notes: 'Almost a minute'
      })
    ];

    mockStorageService.getActivityLogs.mockResolvedValue(mockLogs);

    await act(async () => {
      render(<ActivityLogPage exercises={[mockExercise]} />);
    });

    await screen.findByText('Activity Log');

    // Check edge case rounding
    expect(screen.getByText('1s')).toBeInTheDocument(); // 0.9 rounds to 1
    expect(screen.getByText('1m')).toBeInTheDocument(); // 59.6 rounds to 60 -> 1m

    // Total: 1 + 60 = 61 seconds = 1m 1s
    expect(await screen.findByText('1m 1s')).toBeInTheDocument();
  });
});
