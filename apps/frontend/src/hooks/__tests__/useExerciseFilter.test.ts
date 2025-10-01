import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExerciseFilter } from '../useExerciseFilter';
import type { Exercise, ExerciseCategory } from '../../types';

// Mock the hooks
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));

vi.mock('../useSharedExercises', () => ({
  useSharedExercises: () => ({
    isSharedExercise: (id: string) => id.startsWith('shared-')
  })
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en'
    }
  })
}));

// Mock localizeExercise
vi.mock('../../utils/localizeExercise', () => ({
  localizeExercise: (exercise: Exercise) => ({
    name: exercise.name,
    description: exercise.description
  })
}));

// Mock catalogs
vi.mock('../../data/catalogs', () => ({
  getDefaultCatalog: () => ({ id: 'default-catalog', nameKey: 'Default Catalog' }),
  EXERCISE_CATALOGS: [
    { id: 'default-catalog', nameKey: 'Default Catalog' }
  ]
}));

const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'Push-ups',
  description: 'A basic push-up exercise',
  category: 'strength' as ExerciseCategory,
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

describe('useExerciseFilter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Basic Filtering', () => {
    it('should return all exercises when no filters applied', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Exercise 1' }),
        createMockExercise({ id: '2', name: 'Exercise 2' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      expect(result.current.filteredExercises).toHaveLength(2);
    });

    it('should filter by search term', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Push-ups' }),
        createMockExercise({ id: '2', name: 'Squats' }),
        createMockExercise({ id: '3', name: 'Push-up variations' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ searchTerm: 'push' });
      });

      expect(result.current.filteredExercises).toHaveLength(2);
      expect(result.current.filteredExercises[0].name).toContain('Push');
    });

    it('should filter by category', () => {
      const exercises = [
        createMockExercise({ id: '1', category: 'strength' }),
        createMockExercise({ id: '2', category: 'cardio' }),
        createMockExercise({ id: '3', category: 'strength' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.toggleCategory('strength' as ExerciseCategory);
      });

      expect(result.current.filteredExercises).toHaveLength(2);
      expect(result.current.filteredExercises.every(e => e.category === 'strength')).toBe(true);
    });

    it('should filter by catalog', () => {
      const exercises = [
        createMockExercise({ id: '1', catalogId: 'catalog-a' }),
        createMockExercise({ id: '2', catalogId: 'catalog-b' }),
        createMockExercise({ id: '3', catalogId: 'catalog-a' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.setCatalog('catalog-a', false);
      });

      expect(result.current.filteredExercises).toHaveLength(2);
      expect(result.current.filteredExercises.every(e => e.catalogId === 'catalog-a')).toBe(true);
    });

    it('should filter by favorites', () => {
      const exercises = [
        createMockExercise({ id: '1', is_favorite: true }),
        createMockExercise({ id: '2', is_favorite: false }),
        createMockExercise({ id: '3', is_favorite: true })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ showFavoritesOnly: true });
      });

      expect(result.current.filteredExercises).toHaveLength(2);
      expect(result.current.filteredExercises.every(e => e.is_favorite)).toBe(true);
    });
  });

  describe('Exercise Type Filtering', () => {
    it('should filter built-in exercises', () => {
      const exercises = [
        createMockExercise({ id: 'plank', name: 'Plank' }),
        createMockExercise({ id: 'uuid-1', name: 'Custom Exercise', owner_id: 'test-user-id' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ exerciseFilter: 'built-in' });
      });

      expect(result.current.filteredExercises).toHaveLength(1);
      expect(result.current.filteredExercises[0].id).toBe('plank');
    });

    it('should filter custom exercises', () => {
      const exercises = [
        createMockExercise({ id: 'plank', name: 'Plank' }),
        createMockExercise({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Custom', owner_id: 'test-user-id' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ exerciseFilter: 'custom' });
      });

      expect(result.current.filteredExercises).toHaveLength(1);
      expect(result.current.filteredExercises[0].name).toBe('Custom');
    });

    it('should filter shared exercises', () => {
      const exercises = [
        createMockExercise({ id: 'plank', name: 'Plank' }),
        createMockExercise({ id: 'shared-123', name: 'Shared Exercise' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ exerciseFilter: 'shared' });
      });

      expect(result.current.filteredExercises).toHaveLength(1);
      expect(result.current.filteredExercises[0].id).toBe('shared-123');
    });
  });

  describe('Sorting', () => {
    it('should sort by name', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Zebra' }),
        createMockExercise({ id: '2', name: 'Apple' }),
        createMockExercise({ id: '3', name: 'Mango' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ sortBy: 'name' });
      });

      expect(result.current.filteredExercises[0].name).toBe('Apple');
      expect(result.current.filteredExercises[1].name).toBe('Mango');
      expect(result.current.filteredExercises[2].name).toBe('Zebra');
    });

    it('should sort by type', () => {
      const exercises = [
        createMockExercise({ id: '1', exercise_type: 'time_based' }),
        createMockExercise({ id: '2', exercise_type: 'repetition_based' }),
        createMockExercise({ id: '3', exercise_type: 'time_based' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ sortBy: 'type' });
      });

      expect(result.current.filteredExercises[0].exercise_type).toBe('repetition_based');
    });

    it('should sort by recently added', () => {
      const exercises = [
        createMockExercise({ id: '1', created_at: '2025-01-01T00:00:00Z' }),
        createMockExercise({ id: '2', created_at: '2025-01-03T00:00:00Z' }),
        createMockExercise({ id: '3', created_at: '2025-01-02T00:00:00Z' })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({ sortBy: 'recently-added' });
      });

      // Should be newest first
      expect(result.current.filteredExercises[0].id).toBe('2');
      expect(result.current.filteredExercises[1].id).toBe('3');
      expect(result.current.filteredExercises[2].id).toBe('1');
    });
  });

  describe('Exercise Exclusion', () => {
    it('should exclude specified exercises', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Exercise 1' }),
        createMockExercise({ id: '2', name: 'Exercise 2' }),
        createMockExercise({ id: '3', name: 'Exercise 3' })
      ];

      const excludeExercises = [exercises[1]];

      const { result } = renderHook(() =>
        useExerciseFilter(exercises, { excludeExercises })
      );

      expect(result.current.filteredExercises).toHaveLength(2);
      expect(result.current.filteredExercises.find(e => e.id === '2')).toBeUndefined();
    });
  });

  describe('Filter Management', () => {
    it('should clear all filters', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Exercise 1', is_favorite: true })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.updateFilter({
          searchTerm: 'test',
          showFavoritesOnly: true,
          exerciseFilter: 'custom'
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filterState.searchTerm).toBe('');
      expect(result.current.filterState.showFavoritesOnly).toBe(false);
      expect(result.current.filterState.exerciseFilter).toBe('all');
    });

    it('should toggle category correctly', () => {
      const exercises = [createMockExercise()];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.toggleCategory('strength' as ExerciseCategory);
      });

      expect(result.current.filterState.selectedCategories.has('strength' as ExerciseCategory)).toBe(true);

      act(() => {
        result.current.toggleCategory('strength' as ExerciseCategory);
      });

      expect(result.current.filterState.selectedCategories.has('strength' as ExerciseCategory)).toBe(false);
    });

    it('should clear categories', () => {
      const exercises = [createMockExercise()];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.toggleCategory('strength' as ExerciseCategory);
        result.current.toggleCategory('cardio' as ExerciseCategory);
      });

      expect(result.current.filterState.selectedCategories.size).toBe(2);

      act(() => {
        result.current.clearCategories();
      });

      expect(result.current.filterState.selectedCategories.size).toBe(0);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist filter state to localStorage when enabled', () => {
      const exercises = [createMockExercise()];

      const { result } = renderHook(() =>
        useExerciseFilter(exercises, {
          persistFilters: true,
          storageKey: 'test-filters'
        })
      );

      act(() => {
        result.current.updateFilter({ searchTerm: 'test' });
      });

      const stored = localStorage.getItem('test-filters');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.searchTerm).toBe('test');
    });

    it('should load filter state from localStorage', () => {
      const exercises = [createMockExercise()];

      localStorage.setItem('test-filters', JSON.stringify({
        searchTerm: 'saved-search',
        selectedCategories: ['strength'],
        showFavoritesOnly: true,
        exerciseFilter: 'custom',
        sortBy: 'type'
      }));

      const { result } = renderHook(() =>
        useExerciseFilter(exercises, {
          persistFilters: true,
          storageKey: 'test-filters'
        })
      );

      expect(result.current.filterState.searchTerm).toBe('saved-search');
      expect(result.current.filterState.showFavoritesOnly).toBe(true);
      expect(result.current.filterState.exerciseFilter).toBe('custom');
      expect(result.current.filterState.sortBy).toBe('type');
    });

    it('should not persist when persistFilters is false', () => {
      const exercises = [createMockExercise()];

      const { result } = renderHook(() =>
        useExerciseFilter(exercises, {
          persistFilters: false,
          storageKey: 'test-filters'
        })
      );

      act(() => {
        result.current.updateFilter({ searchTerm: 'test' });
      });

      const stored = localStorage.getItem('test-filters');
      expect(stored).toBeNull();
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters together', () => {
      const exercises = [
        createMockExercise({
          id: '1',
          name: 'Push-ups',
          category: 'strength',
          is_favorite: true
        }),
        createMockExercise({
          id: '2',
          name: 'Squats',
          category: 'strength',
          is_favorite: false
        }),
        createMockExercise({
          id: '3',
          name: 'Running',
          category: 'cardio',
          is_favorite: true
        })
      ];

      const { result } = renderHook(() => useExerciseFilter(exercises));

      act(() => {
        result.current.toggleCategory('strength' as ExerciseCategory);
        result.current.updateFilter({ showFavoritesOnly: true });
      });

      expect(result.current.filteredExercises).toHaveLength(1);
      expect(result.current.filteredExercises[0].id).toBe('1');
    });
  });

  describe('Initial Filters', () => {
    it('should apply initial filters on mount', () => {
      const exercises = [
        createMockExercise({ id: '1', name: 'Exercise 1' }),
        createMockExercise({ id: '2', name: 'Exercise 2' })
      ];

      const { result } = renderHook(() =>
        useExerciseFilter(exercises, {
          initialFilters: {
            searchTerm: 'Exercise 1'
          }
        })
      );

      expect(result.current.filteredExercises).toHaveLength(1);
      expect(result.current.filteredExercises[0].id).toBe('1');
    });
  });
});
