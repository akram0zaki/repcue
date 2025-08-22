import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ActivityLogPage from '../ActivityLogPage';
import { storageService } from '../../services/storageService';
import type { Exercise, ActivityLog } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';

// Mock the storage service
vi.mock('../../services/storageService', () => ({
  storageService: {
    getActivityLogs: vi.fn()
  }
}));

const mockExercises: Exercise[] = [
  {
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['core', 'stability']
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['strength', 'arms']
  },
  {
    id: 'running',
    name: 'Running',
    description: 'Cardiovascular exercise',
    category: ExerciseCategory.CARDIO,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 300,
    isFavorite: false,
    tags: ['cardio', 'endurance']
  }
];

const mockActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    exerciseId: 'plank',
    exerciseName: 'Plank',
    duration: 60,
    timestamp: new Date('2024-01-15T10:30:00'),
    notes: '60s interval timer'
  },
  {
    id: 'log-2',
    exerciseId: 'push-ups',
    exerciseName: 'Push-ups',
    duration: 45,
    timestamp: new Date('2024-01-15T11:00:00'),
    notes: '45s interval timer'
  },
  {
    id: 'log-3',
    exerciseId: 'plank',
    exerciseName: 'Plank',
    duration: 90,
    timestamp: new Date('2024-01-14T09:15:00'),
    notes: '90s interval timer'
  },
  {
    id: 'log-4',
    exerciseId: 'running',
    exerciseName: 'Running',
    duration: 300,
    timestamp: new Date('2024-01-13T07:00:00'),
    notes: '300s interval timer'
  }
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
      
      // Check exercise names - account for multiple appearances
      expect(screen.getAllByText('Plank')).toHaveLength(3); // Stats favorite + 2 activity entries
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  it('displays statistics correctly', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Check stats card
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Total workouts
      expect(screen.getByText('8m 15s')).toBeInTheDocument(); // Total time (495 seconds)
      expect(screen.getAllByText('Plank')).toHaveLength(3); // Favorite exercise in stats + 2 activity entries
    });
  });

  it('filters logs by category', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Initially shows all logs - expect Plank to appear multiple times
      expect(screen.getAllByText('Plank')).toHaveLength(3); // Appears in stats, logs, and possibly category badge
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Filter by core category
    const coreFilter = screen.getByRole('button', { name: /core/i });
    fireEvent.click(coreFilter);

    await waitFor(() => {
      // Should only show core exercises (Plank) - stats favorite + filtered activity entries
      expect(screen.getAllByText('Plank')).toHaveLength(3); // Stats favorite + 2 core activity entries
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
      {
        id: 'log-short',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        duration: 30,
        timestamp: new Date(),
        notes: '30s interval timer'
      }
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(shortDurationLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Check that the specific duration appears in the activity list (not just stats)
      expect(screen.getAllByText('30s')).toHaveLength(2); // Appears in stats total time and activity duration
    });
  });

  it('formats time correctly', async () => {
    const logWithSpecificTime: ActivityLog[] = [
      {
        id: 'log-time',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        duration: 60,
        timestamp: new Date('2024-01-15T14:30:00'),
        notes: '60s interval timer'
      }
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
      // Check that category filter buttons are displayed - match case-insensitively
      expect(screen.getByRole('button', { name: /core/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /strength/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cardio/i })).toBeInTheDocument();
    });
  });

  it('allows closing stats card', async () => {
    vi.mocked(storageService.getActivityLogs).mockResolvedValue(mockActivityLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    // Find and click close button
    const closeButton = screen.getByLabelText('Close stats card');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Your Progress')).not.toBeInTheDocument();
    });
  });

  it('handles storage service errors gracefully', async () => {
    vi.mocked(storageService.getActivityLogs).mockRejectedValue(new Error('Storage error'));
    
    // Mock console.error to avoid error output in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('No workouts yet')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load activity logs:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('calculates current streak correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const streakLogs: ActivityLog[] = [
      {
        id: 'log-today',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        duration: 60,
        timestamp: today,
        notes: 'Today workout'
      },
      {
        id: 'log-yesterday',
        exerciseId: 'push-ups',
        exerciseName: 'Push-ups',
        duration: 45,
        timestamp: yesterday,
        notes: 'Yesterday workout'
      },
      {
        id: 'log-two-days',
        exerciseId: 'running',
        exerciseName: 'Running',
        duration: 300,
        timestamp: twoDaysAgo,
        notes: 'Two days ago workout'
      }
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(streakLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      // Should show streak of 3 days - look for the specific streak number
      const streakSection = screen.getByText('Day Streak').parentElement;
      const streakValue = streakSection?.querySelector('.text-2xl');
      expect(streakValue).toHaveTextContent('3');
    });
  });

  it('shows notes when present', async () => {
    const logsWithNotes: ActivityLog[] = [
      {
        id: 'log-with-notes',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        duration: 60,
        timestamp: new Date(),
        notes: 'Great workout today!'
      }
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(logsWithNotes);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getByText('Great workout today!')).toBeInTheDocument();
    });
  });

  it('shows empty state for specific category filter', async () => {
    const coreOnlyLogs: ActivityLog[] = [
      {
        id: 'log-core',
        exerciseId: 'plank',
        exerciseName: 'Plank',
        duration: 60,
        timestamp: new Date(),
        notes: 'Core workout'
      }
    ];

    vi.mocked(storageService.getActivityLogs).mockResolvedValue(coreOnlyLogs);
    
    render(<ActivityLogPage exercises={mockExercises} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Plank')).toHaveLength(2); // Stats + logs
    });

    // Filter by strength category (should be empty)
    const strengthFilter = screen.getByRole('button', { name: /strength/i });
    fireEvent.click(strengthFilter);

    await waitFor(() => {
      // Heading uses capitalized category label; be tolerant of whitespace
      expect(screen.getByText(/No\s+Strength\s+workouts\s+yet/i)).toBeInTheDocument();
    });
  });
});
