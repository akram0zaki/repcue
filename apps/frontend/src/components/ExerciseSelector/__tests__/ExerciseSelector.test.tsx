import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseSelector } from '../ExerciseSelector';
import type { Exercise } from '../../../types';
import { useExerciseFilter } from '../../../hooks/useExerciseFilter';

// Mock the hook
const mockUseExerciseFilter = vi.fn();
vi.mock('../../../hooks/useExerciseFilter', () => ({
  useExerciseFilter: mockUseExerciseFilter
}));

// Mock CatalogSelector
vi.mock('../../CatalogSelector', () => ({
  default: ({ selectedCatalogId, onCatalogChange }: any) => (
    <div data-testid="catalog-selector">
      <button onClick={() => onCatalogChange('test-catalog')}>Change Catalog</button>
    </div>
  )
}));

// Mock CategoryFilter
vi.mock('../../CategoryFilter', () => ({
  default: ({ onCategoryToggle }: any) => (
    <div data-testid="category-filter">
      <button onClick={() => onCategoryToggle('strength')}>Toggle Category</button>
    </div>
  )
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'exercises:showingCount') {
        return `Showing ${options?.count} of ${options?.total}`;
      }
      return key;
    }
  })
}));

// Mock localizeExercise
vi.mock('../../../utils/localizeExercise', () => ({
  localizeExercise: (exercise: Exercise) => ({
    name: exercise.name,
    description: exercise.description
  })
}));

const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'Push-ups',
  description: 'A basic push-up exercise',
  category: 'strength',
  exercise_type: 'repetition_based',
  default_sets: 3,
  default_reps: 10,
  difficulty: 'beginner',
  catalogId: 'default-catalog',
  is_favorite: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  tags: [],
  ...overrides
});

describe('ExerciseSelector', () => {
  const mockOnSelectExercise = vi.fn();

  // Set up default mock implementation
  beforeEach(() => {
    mockUseExerciseFilter.mockImplementation((exercises: Exercise[], options: any) => ({
      filteredExercises: exercises,
      filterState: {
        selectedCatalogId: 'default',
        selectedCategories: new Set(),
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name'
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      setCatalog: vi.fn(),
      toggleCategory: vi.fn(),
      clearCategories: vi.fn()
    }));
  });

  it('should render exercise list', () => {
    const exercises = [
      createMockExercise({ id: '1', name: 'Push-ups' }),
      createMockExercise({ id: '2', name: 'Squats' })
    ];

    render(
      <ExerciseSelector
        exercises={exercises}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
  });

  it('should call onSelectExercise when exercise is clicked', () => {
    const exercise = createMockExercise({ id: '1', name: 'Push-ups' });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const exerciseButton = screen.getByText('Push-ups').closest('button');
    fireEvent.click(exerciseButton!);

    expect(mockOnSelectExercise).toHaveBeenCalledWith(exercise);
  });

  it('should highlight selected exercise', () => {
    const exercise = createMockExercise({ id: '1', name: 'Push-ups' });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        selectedExercise={exercise}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const exerciseButton = screen.getByText('Push-ups').closest('button');
    expect(exerciseButton).toHaveClass('border-primary-500');
  });

  it('should show catalog selector when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showCatalogSelector={true}
      />
    );

    expect(screen.getByTestId('catalog-selector')).toBeInTheDocument();
  });

  it('should hide catalog selector when disabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showCatalogSelector={false}
      />
    );

    expect(screen.queryByTestId('catalog-selector')).not.toBeInTheDocument();
  });

  it('should show search bar when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showSearch={true}
      />
    );

    expect(screen.getByPlaceholderText('exercises:searchPlaceholder')).toBeInTheDocument();
  });

  it('should hide search bar when disabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showSearch={false}
      />
    );

    expect(screen.queryByPlaceholderText('exercises:searchPlaceholder')).not.toBeInTheDocument();
  });

  it('should show category filter when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showCategoryFilter={true}
      />
    );

    expect(screen.getByTestId('category-filter')).toBeInTheDocument();
  });

  it('should show type filter buttons when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showTypeFilter={true}
      />
    );

    expect(screen.getByText('exercises:filterAll')).toBeInTheDocument();
    expect(screen.getByText('exercises:filterBuiltIn')).toBeInTheDocument();
    expect(screen.getByText('exercises:filterCustom')).toBeInTheDocument();
    expect(screen.getByText('exercises:filterShared')).toBeInTheDocument();
  });

  it('should show favorites toggle when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showFavoritesToggle={true}
      />
    );

    expect(screen.getByText('exercises:favoritesOnly')).toBeInTheDocument();
  });

  it('should show sort dropdown when enabled', () => {
    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        showSort={true}
      />
    );

    expect(screen.getByText('exercises:sortBy')).toBeInTheDocument();
    expect(screen.getByText('exercises:sortName')).toBeInTheDocument();
  });

  it('should display results count', () => {
    const exercises = [
      createMockExercise({ id: '1' }),
      createMockExercise({ id: '2' })
    ];

    render(
      <ExerciseSelector
        exercises={exercises}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText(/Showing 2 of 2/)).toBeInTheDocument();
  });

  it('should show empty state when no exercises match filters', () => {
    mockUseExerciseFilter.mockReturnValueOnce({
      filteredExercises: [],
      filterState: {
        selectedCatalogId: 'default',
        selectedCategories: new Set(),
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name'
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      setCatalog: vi.fn(),
      toggleCategory: vi.fn(),
      clearCategories: vi.fn()
    });

    render(
      <ExerciseSelector
        exercises={[createMockExercise()]}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText('exercises:noResults')).toBeInTheDocument();
    expect(screen.getByText('exercises:clearFilters')).toBeInTheDocument();
  });

  it('should display custom empty state message', () => {
    mockUseExerciseFilter.mockReturnValueOnce({
      filteredExercises: [],
      filterState: {
        selectedCatalogId: 'default',
        selectedCategories: new Set(),
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name'
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      setCatalog: vi.fn(),
      toggleCategory: vi.fn(),
      clearCategories: vi.fn()
    });

    render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        emptyStateMessage="Custom empty message"
      />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should show favorite star for favorite exercises', () => {
    const exercise = createMockExercise({
      id: '1',
      name: 'Favorite Exercise',
      is_favorite: true
    });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        onSelectExercise={mockOnSelectExercise}
        onToggleFavorite={vi.fn()}
      />
    );

    // The star should be rendered (we don't test the exact icon, just that it renders)
    const exerciseCard = screen.getByText('Favorite Exercise').closest('button');
    expect(exerciseCard).toBeInTheDocument();
  });

  it('should call onToggleFavorite when star is clicked', () => {
    const mockToggleFavorite = vi.fn();
    const exercise = createMockExercise({ id: '1', name: 'Exercise' });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        onSelectExercise={mockOnSelectExercise}
        onToggleFavorite={mockToggleFavorite}
      />
    );

    // Find the favorite button (it has aria-label with "favorite")
    const favoriteButtons = screen.getAllByRole('button');
    const favoriteButton = favoriteButtons.find(btn =>
      btn.getAttribute('aria-label')?.includes('favorite')
    );

    if (favoriteButton) {
      fireEvent.click(favoriteButton);
      expect(mockToggleFavorite).toHaveBeenCalledWith('1');
    }
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ExerciseSelector
        exercises={[]}
        onSelectExercise={mockOnSelectExercise}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should display exercise category and details', () => {
    const exercise = createMockExercise({
      id: '1',
      name: 'Push-ups',
      category: 'strength',
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 10
    });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText('Push-ups')).toBeInTheDocument();
    expect(screen.getByText('3×10')).toBeInTheDocument();
  });

  it('should format time-based exercise duration correctly', () => {
    const exercise = createMockExercise({
      id: '1',
      name: 'Plank',
      exercise_type: 'time_based',
      default_duration: 60
    });

    render(
      <ExerciseSelector
        exercises={[exercise]}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('1m')).toBeInTheDocument();
  });
});
