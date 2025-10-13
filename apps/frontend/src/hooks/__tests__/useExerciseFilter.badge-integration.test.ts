/**
 * Integration test for badge filtering flow
 * Tests: badge selection → filtering → persistence → catalog switching
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExerciseFilter } from '../useExerciseFilter';
import type { Exercise } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useExerciseFilter - Badge Integration', () => {
  // Sample exercises for testing
  const exercises: Exercise[] = [
    {
      id: 'ex-1',
      name: 'Push-ups',
      catalogId: 'general-fitness',
      tags: ['category:strength', 'equipment:bodyweight', 'intensity:moderate'],
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 10,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 'ex-2',
      name: 'Dumbbell Curls',
      catalogId: 'general-fitness',
      tags: ['category:strength', 'equipment:dumbbells', 'intensity:moderate'],
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 12,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 'ex-3',
      name: 'Running',
      catalogId: 'general-fitness',
      tags: ['category:cardio', 'equipment:none', 'intensity:high'],
      exercise_type: 'time_based',
      default_duration: 1800,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 'ex-4',
      name: 'Aikido Basics',
      catalogId: 'aikido',
      tags: ['category:core', 'kyu:3'],
      exercise_type: 'time_based',
      default_duration: 300,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
  ];

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should filter exercises by single badge selection', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Initially, all exercises should be visible
    expect(result.current.filteredExercises).toHaveLength(4);

    // Select category: strength
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
    });

    // Should show only strength exercises
    expect(result.current.filteredExercises).toHaveLength(2);
    expect(result.current.filteredExercises.map(e => e.id)).toEqual(['ex-1', 'ex-2']);
  });

  it('should filter exercises by multiple badge selections (OR within badge)', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select category: strength AND cardio (OR within badge)
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
      result.current.toggleBadgeValue('category', 'cardio');
    });

    // Should show strength OR cardio exercises
    expect(result.current.filteredExercises).toHaveLength(3);
    expect(result.current.filteredExercises.map(e => e.id).sort()).toEqual(['ex-1', 'ex-2', 'ex-3']);
  });

  it('should apply AND logic across different badges', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select category: strength AND equipment: bodyweight
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
      result.current.toggleBadgeValue('equipment', 'bodyweight');
    });

    // Should show exercises that are (strength) AND (bodyweight)
    expect(result.current.filteredExercises).toHaveLength(1);
    expect(result.current.filteredExercises[0].id).toBe('ex-1');
  });

  it('should persist badge selections to localStorage', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select category: strength
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
    });

    // Check localStorage
    const saved = JSON.parse(localStorage.getItem('exerciseFilters') || '{}');
    expect(saved.selectedBadges).toBeDefined();
    expect(saved.selectedBadges.category).toEqual(['strength']);
  });

  it('should restore badge selections from localStorage', () => {
    // Pre-populate localStorage
    localStorage.setItem(
      'exerciseFilters',
      JSON.stringify({
        selectedCatalogId: 'all',
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name',
        selectedBadges: {
          category: ['strength'],
          equipment: ['bodyweight'],
        },
      })
    );

    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Should restore selections and apply filtering
    expect(result.current.filteredExercises).toHaveLength(1);
    expect(result.current.filteredExercises[0].id).toBe('ex-1');
  });

  it('should clear badge selections', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select category: strength
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
    });

    expect(result.current.filteredExercises).toHaveLength(2);

    // Clear category badge
    act(() => {
      result.current.clearBadge('category');
    });

    // Should show all exercises again
    expect(result.current.filteredExercises).toHaveLength(4);
  });

  it('should clear all badge selections when clearing all filters', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select multiple badges
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
      result.current.toggleBadgeValue('equipment', 'bodyweight');
    });

    expect(result.current.filteredExercises).toHaveLength(1);

    // Clear all filters
    act(() => {
      result.current.clearFilters();
    });

    // Should show all exercises and clear badge selections
    expect(result.current.filteredExercises).toHaveLength(4);

    // Check localStorage is cleared
    const saved = JSON.parse(localStorage.getItem('exerciseFilters') || '{}');
    expect(saved.selectedBadges).toEqual({});
  });

  it('should handle catalog switching correctly', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select general-fitness catalog and badges
    act(() => {
      result.current.setSelectedCatalogId('general-fitness');
      result.current.toggleBadgeValue('category', 'strength');
    });

    expect(result.current.filteredExercises).toHaveLength(2);

    // Switch to aikido catalog
    act(() => {
      result.current.setSelectedCatalogId('aikido');
    });

    // Should show only aikido exercises (badge selections persist but apply to new catalog)
    expect(result.current.filteredExercises).toHaveLength(1);
    expect(result.current.filteredExercises[0].catalogId).toBe('aikido');

    // Switch back to all catalogs
    act(() => {
      result.current.setSelectedCatalogId('all');
    });

    // Badge filter should still apply across all catalogs
    expect(result.current.filteredExercises).toHaveLength(3);
  });

  it('should migrate old kyuLevel format to badge format', () => {
    // Pre-populate localStorage with old format
    localStorage.setItem(
      'exerciseFilters',
      JSON.stringify({
        selectedCatalogId: 'aikido',
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name',
        selectedKyuLevels: [3, 4], // Old format
      })
    );

    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Should migrate and filter correctly
    expect(result.current.filteredExercises.some(e => e.id === 'ex-4')).toBe(true);

    // Check new format is saved
    const saved = JSON.parse(localStorage.getItem('exerciseFilters') || '{}');
    expect(saved.selectedBadges?.kyuLevel).toEqual([3, 4]);
    expect(saved.selectedKyuLevels).toBeUndefined();
  });

  it('should migrate old category format to badge format', () => {
    // Pre-populate localStorage with old format
    localStorage.setItem(
      'exerciseFilters',
      JSON.stringify({
        selectedCatalogId: 'all',
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name',
        selectedCategories: ['strength', 'cardio'], // Old format
      })
    );

    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Should migrate and filter correctly
    expect(result.current.filteredExercises).toHaveLength(3);

    // Check new format is saved
    const saved = JSON.parse(localStorage.getItem('exerciseFilters') || '{}');
    expect(saved.selectedBadges?.category).toEqual(['strength', 'cardio']);
    expect(saved.selectedCategories).toBeUndefined();
  });

  it('should handle empty badge selections', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Toggle on and off
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
    });

    expect(result.current.filteredExercises).toHaveLength(2);

    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
    });

    // Should show all exercises when badge is deselected
    expect(result.current.filteredExercises).toHaveLength(4);
  });

  it('should combine badge filtering with search term', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select category: strength AND search for "push"
    act(() => {
      result.current.toggleBadgeValue('category', 'strength');
      result.current.setSearchTerm('push');
    });

    // Should show only push-ups (strength + matches "push")
    expect(result.current.filteredExercises).toHaveLength(1);
    expect(result.current.filteredExercises[0].id).toBe('ex-1');
  });

  it('should combine badge filtering with catalog selection', () => {
    const { result } = renderHook(() => useExerciseFilter(exercises));

    // Select general-fitness catalog AND category: strength
    act(() => {
      result.current.setSelectedCatalogId('general-fitness');
      result.current.toggleBadgeValue('category', 'strength');
    });

    // Should show only general-fitness strength exercises
    expect(result.current.filteredExercises).toHaveLength(2);
    expect(result.current.filteredExercises.every(e => e.catalogId === 'general-fitness')).toBe(true);
  });
});
