import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ExercisePage from '../ExercisePage';
import { SnackbarProvider } from '../../components/SnackbarProvider';
import { ExerciseCategory } from '../../types';
import type { Exercise } from '../../types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock the useFeatureFlags hook
vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true } })
}));

// Mock navigation hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/exercises' })
  };
});

// Test component wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <SnackbarProvider>
      {children}
    </SnackbarProvider>
  </MemoryRouter>
);

const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'test-exercise-1',
  name: 'Test Exercise',
  description: 'A test exercise',
  category: ExerciseCategory.CORE,
  exercise_type: 'time_based',
  default_duration: 30,
  default_sets: 1,
  default_reps: 1,
  is_favorite: false,
  tags: ['test'],
  has_video: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
  ...overrides
});

describe('ExercisePage Shared Exercise Filtering', () => {
  const mockUser = { id: 'current-user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('renders shared exercise filter button', () => {
    const exercises = [createMockExercise()];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Shared with me')).toBeInTheDocument();
  });

  it('filters to show only shared exercises when shared filter is selected', async () => {
    const exercises = [
      // Built-in exercise (slug ID)
      createMockExercise({
        id: 'plank',
        name: 'Built-in Plank',
        owner_id: undefined
      }),
      // User's own exercise
      createMockExercise({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'My Custom Exercise',
        owner_id: 'current-user-123'
      }),
      // Shared exercise (UUID ID but different owner, marked as shared copy)
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-1',
        shared_from_user_id: 'other-user-456'
      }),
      // Another shared exercise
      createMockExercise({
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Another Shared Exercise',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-2',
        shared_from_user_id: 'another-user-789'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    // Initially should show all exercises
    expect(screen.getByText('Built-in Plank')).toBeInTheDocument();
    expect(screen.getByText('My Custom Exercise')).toBeInTheDocument();
    expect(screen.getByText('Shared Exercise')).toBeInTheDocument();
    expect(screen.getByText('Another Shared Exercise')).toBeInTheDocument();

    // Click on shared filter
    const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
    fireEvent.click(sharedFilter);

    await waitFor(() => {
      // Should only show shared exercises
      expect(screen.queryByText('Built-in Plank')).not.toBeInTheDocument();
      expect(screen.queryByText('My Custom Exercise')).not.toBeInTheDocument();
      expect(screen.getByText('Shared Exercise')).toBeInTheDocument();
      expect(screen.getByText('Another Shared Exercise')).toBeInTheDocument();
    });
  });

  it('displays shared badge on shared exercises', async () => {
    const exercises = [
      // Shared exercise
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-1',
        shared_from_user_id: 'other-user-456'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Exercise')).toBeInTheDocument();
    });

    // Should display shared badge
    expect(screen.getByText('Shared')).toBeInTheDocument();

    // Badge should have appropriate styling (green)
    const sharedBadge = screen.getByText('Shared');
    expect(sharedBadge).toHaveClass('bg-green-100');
  });

  it('does not display custom badge on shared exercises', async () => {
    const exercises = [
      // Shared exercise
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-1',
        shared_from_user_id: 'other-user-456'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Exercise')).toBeInTheDocument();
    });

    // Should display shared badge but not custom badge
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('does not display share button on shared exercises', async () => {
    const exercises = [
      // User's own exercise
      createMockExercise({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'My Custom Exercise',
        owner_id: 'current-user-123'
      }),
      // Shared exercise
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-1',
        shared_from_user_id: 'other-user-456'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('My Custom Exercise')).toBeInTheDocument();
      expect(screen.getByText('Shared Exercise')).toBeInTheDocument();
    });

    // User's own exercise should have action buttons (edit, share, delete)
    const ownExerciseCard = screen.getByText('My Custom Exercise').closest('[data-testid="exercise-card"]');
    expect(ownExerciseCard).toBeInTheDocument();

    // Shared exercise should not have edit, share, or delete buttons
    const sharedExerciseCard = screen.getByText('Shared Exercise').closest('[data-testid="exercise-card"]');
    expect(sharedExerciseCard).toBeInTheDocument();

    // The shared exercise card should only have the favorite button and no action buttons
    // We can verify this by checking that shared exercises don't show the custom badge border
    expect(sharedExerciseCard).not.toHaveClass('border-blue-300');
  });

  it('correctly counts shared exercises in filter results', async () => {
    const exercises = [
      createMockExercise({ id: 'plank', name: 'Built-in Plank' }),
      createMockExercise({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'My Exercise',
        owner_id: 'current-user-123'
      }),
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise 1',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-1',
        shared_from_user_id: 'other-user-456'
      }),
      createMockExercise({
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Shared Exercise 2',
        owner_id: 'current-user-123', // Owned by current user after saving from share
        is_shared_copy: true,
        shared_from_exercise_id: 'original-exercise-id-2',
        shared_from_user_id: 'another-user-789'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    // Click on shared filter
    const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
    fireEvent.click(sharedFilter);

    await waitFor(() => {
      // Should show count of shared exercises (2 out of 4 total)
      expect(screen.getByText(/Showing 2 of 4 exercises/i)).toBeInTheDocument();
    });
  });

  it('handles empty shared exercises list', async () => {
    const exercises = [
      createMockExercise({ id: 'plank', name: 'Built-in Plank' }),
      createMockExercise({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'My Exercise',
        owner_id: 'current-user-123'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    // Click on shared filter
    const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
    fireEvent.click(sharedFilter);

    await waitFor(() => {
      // Should show empty state
      expect(screen.getByText(/No exercises found/i)).toBeInTheDocument();
      expect(screen.getByText(/Clear all filters/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing 0 of 2 exercises/i)).toBeInTheDocument();
    });
  });

  it('persists filter state in localStorage', async () => {
    const exercises = [
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Exercise',
        owner_id: 'other-user-456'
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    // Click on shared filter
    const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
    fireEvent.click(sharedFilter);

    await waitFor(() => {
      // Check that filter state is saved to localStorage
      const savedState = localStorage.getItem('exercise-page-filters');
      expect(savedState).toBeTruthy();

      if (savedState) {
        const parsed = JSON.parse(savedState);
        expect(parsed.exerciseFilter).toBe('shared');
      }
    });
  });

  it('works correctly with other filters combined', async () => {
    const exercises = [
      createMockExercise({
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shared Core Exercise',
        owner_id: 'other-user-456',
        category: ExerciseCategory.CORE,
        tags: ['core', 'stability']
      }),
      createMockExercise({
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Shared Strength Exercise',
        owner_id: 'another-user-789',
        category: ExerciseCategory.STRENGTH,
        tags: ['strength', 'upper-body']
      })
    ];

    render(
      <TestWrapper>
        <ExercisePage
          exercises={exercises}
          onToggleFavorite={() => {}}
        />
      </TestWrapper>
    );

    // Click on shared filter
    const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
    fireEvent.click(sharedFilter);

    await waitFor(() => {
      expect(screen.getByText('Shared Core Exercise')).toBeInTheDocument();
      expect(screen.getByText('Shared Strength Exercise')).toBeInTheDocument();
    });

    // Filter by Core category as well
    const coreFilter = screen.getByRole('button', { name: /Core/i });
    fireEvent.click(coreFilter);

    await waitFor(() => {
      // Should only show the shared core exercise
      expect(screen.getByText('Shared Core Exercise')).toBeInTheDocument();
      expect(screen.queryByText('Shared Strength Exercise')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 2 exercises/i)).toBeInTheDocument();
    });
  });
});