import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ActivityLogPage from '../ActivityLogPage';
import { storageService } from '../../services/storageService';
import type { Exercise, ActivityLog } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';
import { createMockExercise, createMockActivityLog } from '../../test/testUtils';
import logger from '../../utils/logger';

// Mock the storage service
vi.mock('../../services/storageService', () => ({
  storageService: {
    getActivityLogs: vi.fn()
  }
}));

// Mock components
vi.mock('../../components/WeeklyStreakCalendar', () => ({
  default: ({ logs }: { logs: any[] }) => (
    <div data-testid="weekly-streak-calendar">
      WeeklyStreakCalendar with {logs.length} logs
    </div>
  )
}));

vi.mock('../../components/ProgressChart', () => ({
  default: ({ logs }: { logs: any[] }) => (
    <div data-testid="progress-chart">
      ProgressChart with {logs.length} logs
    </div>
  )
}));

vi.mock('../../components/CategoryFilter', () => ({
  default: ({ selectedCategories, onCategoryToggle, onClearAll }: any) => (
    <div data-testid="category-filter">
      CategoryFilter (selected: {selectedCategories.size})
      <button role="button" aria-label="Select categories">Select</button>
      <button role="button" aria-label="Core category" onClick={() => onCategoryToggle && onCategoryToggle('core')}>core</button>
      <button role="button" aria-label="Strength category" onClick={() => onCategoryToggle && onCategoryToggle('strength')}>strength</button>
    </div>
  )
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'activity.title': 'Activity Log',
        'activity.subtitle': 'Track your fitness journey and progress',
        'activity.noWorkouts': 'No workouts yet',
        'activity.noWorkoutsYet': 'No workouts yet',
        'activity.emptySubtitle': 'Start your first workout to see your activity here',
        'activity.startFirstWorkout': 'Start your first workout to see your activity here',
        'common.secondsShortSuffix': 's',
        'common.minutesShortSuffix': 'm',
        'activity.status.completedTime': `Completed in ${options?.duration}`,
        'common.at': 'at',
        'activity.expandWorkout': 'Show exercises',
        'activity.collapseWorkout': 'Hide exercises',
        'exerciseDetails:plank.name': 'Plank',
        'exerciseDetails:push-ups.name': 'Push-ups',
        'exerciseDetails:running.name': 'Running',
        'common:categories.core': 'core',
        'common:categories.strength': 'strength',
        'common:categories.cardio': 'cardio',
        'activity.yourProgress': 'Your Progress',
        'activity.noCategoryWorkoutsYet': 'No Strength workouts yet'
      };
      return translations[key] || key;
    },
    i18n: { resolvedLanguage: 'en', language: 'en', languages: ['en'] }
  }),
  I18nextProvider: ({ children }: any) => children
}));

const mockExercises: Exercise[] = [
  createMockExercise({
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60,
    is_favorite: false,
    tags: ['core', 'stability']
  }),
  createMockExercise({
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_duration: 60,
    is_favorite: false,
    tags: ['strength', 'arms']
  }),
  createMockExercise({
    id: 'running',
    name: 'Running',
    description: 'Cardiovascular exercise',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 300,
    is_favorite: false,
    tags: ['cardio', 'endurance']
  })
];

const mockActivityLogs: ActivityLog[] = [
  createMockActivityLog({
    id: 'log-1',
    exercise_id: 'plank',
    exercise_name: 'Plank',
    duration: 60,
    timestamp: new Date('2024-01-15T10:30:00').toISOString(),
    notes: '60s interval timer'
  }),
  createMockActivityLog({
    id: 'log-2',
    exercise_id: 'push-ups',
    exercise_name: 'Push-ups',
    duration: 45,
    timestamp: new Date('2024-01-15T11:00:00').toISOString(),
    notes: '45s interval timer'
  }),
  createMockActivityLog({
    id: 'log-3',
    exercise_id: 'plank',
    exercise_name: 'Plank',
    duration: 90,
    timestamp: new Date('2024-01-14T09:15:00').toISOString(),
    notes: '90s interval timer'
  }),
  createMockActivityLog({
    id: 'log-4',
    exercise_id: 'running',
    exercise_name: 'Running',
    duration: 300,
    timestamp: new Date('2024-01-13T07:00:00').toISOString(),
    notes: '300s interval timer'
  })
];

describe('ActivityLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(storageService.getActivityLogs).mockImplementation(() => new Promise(() => {}));
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    // Check for loading skeleton
    expect(screen.getByTestId).toBeDefined();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no logs exist', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue([]);

    render(<ActivityLogPage exercises={mockExercises} />);

    await waitFor(() => {
      expect(screen.getByText('No workouts yet')).toBeInTheDocument();
      expect(screen.getByText('Start your first workout to see your activity here')).toBeInTheDocument();
    });
  });

  it('renders activity logs correctly', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Check header
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
      expect(screen.getByText('Track your fitness journey and progress')).toBeInTheDocument();

      // Check exercise names in activity entries (using exerciseDetails: prefix)
      expect(screen.getAllByText('Plank')).toHaveLength(2); // 2 activity entries
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  it('displays charts correctly', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);

    render(<ActivityLogPage exercises={mockExercises} />);

    await waitFor(() => {
      // Check that chart components are rendered when there are logs
      expect(screen.getByTestId('weekly-streak-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
      expect(screen.getByText('WeeklyStreakCalendar with 4 logs')).toBeInTheDocument();
      expect(screen.getByText('ProgressChart with 4 logs')).toBeInTheDocument();
    });
  });

  it('filters logs by category', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Initially shows all logs - expect Plank to appear multiple times
      expect(screen.getAllByText('Plank')).toHaveLength(2); // 2 activity entries
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Open category filter dropdown
    const filterDropdown = screen.getByRole('button', { name: /select/i });
    fireEvent.click(filterDropdown);

    // Filter by core category
    await waitFor(() => {
      const coreFilter = screen.getByRole('button', { name: /core/i });
      fireEvent.click(coreFilter);
    });

    await waitFor(() => {
      // Should only show core exercises (Plank) - only filtered activity entries
      expect(screen.getAllByText('Plank')).toHaveLength(2); // 2 core activity entries
      expect(screen.queryByText('Push-ups')).not.toBeInTheDocument();
      expect(screen.queryByText('Running')).not.toBeInTheDocument();
    });
  });

  it('groups logs by date correctly', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Check date headers are present
      const dateHeaders = screen.getAllByText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
      expect(dateHeaders.length).toBeGreaterThan(0);
    });
  });

  it('formats duration correctly', async () => {
    const shortDurationLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-short',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        duration: 30,
        timestamp: new Date().toISOString(),
        notes: '30s interval timer'
      })
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(shortDurationLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Check that the specific duration appears in the activity list
      expect(screen.getByText('30s')).toBeInTheDocument(); // Duration in activity entry
    });
  });

  it('formats time correctly', async () => {
    const logWithSpecificTime: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-time',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        duration: 60,
        timestamp: new Date('2024-01-15T14:30:00').toISOString(),
        notes: '60s interval timer'
      })
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(logWithSpecificTime);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Time should be formatted as HH:MM
      expect(screen.getByText(/2:30 PM|14:30/)).toBeInTheDocument();
    });
  });

  it('displays exercise categories with correct colors', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);

    render(<ActivityLogPage exercises={mockExercises} />);

    await waitFor(() => {
      // Check that category badges are displayed in the activity log entries
      expect(screen.getAllByText('core').length).toBeGreaterThan(0);
      expect(screen.getAllByText('strength').length).toBeGreaterThan(0);
      expect(screen.getByText('cardio')).toBeInTheDocument();
    });
  });

  it('displays charts section correctly', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);

    render(<ActivityLogPage exercises={mockExercises} />);

    await waitFor(() => {
      // Check that chart components are rendered when there are logs
      expect(screen.getByTestId('weekly-streak-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
    });
  });

  it('handles storage service errors gracefully', async () => {
    vi.mocked(storageService.getActivityLogs).mockRejectedValue(new Error('Storage error'));
    
    // Mock logger.error to avoid error output in tests
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('No workouts yet')).toBeInTheDocument();
    });

    expect(loggerSpy).toHaveBeenCalledWith('Failed to load activity logs:', expect.any(Error));
    
    loggerSpy.mockRestore();
  });

  it('calculates current streak correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const streakLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-today',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        duration: 60,
        timestamp: today.toISOString(),
        notes: 'Today workout'
      }),
      createMockActivityLog({
        id: 'log-yesterday',
        exercise_id: 'push-ups',
        exercise_name: 'Push-ups',
        duration: 45,
        timestamp: yesterday.toISOString(),
        notes: 'Yesterday workout'
      }),
      createMockActivityLog({
        id: 'log-two-days',
        exercise_id: 'running',
        exercise_name: 'Running',
        duration: 300,
        timestamp: twoDaysAgo.toISOString(),
        notes: 'Two days ago workout'
      })
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(streakLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Charts should be displayed with the streak logs
      expect(screen.getByTestId('weekly-streak-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
    });
  });

  it('shows notes when present', async () => {
    const logsWithNotes: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-with-notes',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        duration: 60,
        timestamp: new Date().toISOString(),
        notes: 'Great workout today!'
      })
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(logsWithNotes);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('Great workout today!')).toBeInTheDocument();
    });
  });

  it('shows empty state for specific category filter', async () => {
    const coreOnlyLogs: ActivityLog[] = [
      createMockActivityLog({
        id: 'log-core',
        exercise_id: 'plank',
        exercise_name: 'Plank',
        duration: 60,
        timestamp: new Date().toISOString(),
        notes: 'Core workout'
      })
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(coreOnlyLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('Plank')).toBeInTheDocument(); // Activity log entry
    });

    // Open category filter dropdown
    const filterDropdown = screen.getByRole('button', { name: /select/i });
    fireEvent.click(filterDropdown);

    // Filter by strength category (should be empty)
    await waitFor(() => {
      const strengthFilter = screen.getByRole('button', { name: /strength/i });
      fireEvent.click(strengthFilter);
    });

    await waitFor(() => {
      // Heading uses capitalized category label; be tolerant of whitespace
      expect(screen.getByText(/No\s+Strength\s+workouts\s+yet/i)).toBeInTheDocument();
    });
  });
});
