import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Exercise, ExerciseCategory } from '../types';
import { localizeExercise } from '../utils/localizeExercise';
import { getDefaultCatalog } from '../data/catalogs';
import { useAuth } from './useAuth';
import { useSharedExercises } from './useSharedExercises';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

export interface ExerciseFilterState {
  selectedCatalogId: string;
  selectedCategories: Set<ExerciseCategory>;
  searchTerm: string;
  showFavoritesOnly: boolean;
  exerciseFilter: 'all' | 'built-in' | 'custom' | 'shared';
  sortBy: 'name' | 'type' | 'recently-added';
}

export interface ExerciseFilterOptions {
  /** Persist filter state to localStorage */
  persistFilters?: boolean;
  /** Custom storage key for filter persistence */
  storageKey?: string;
  /** Initial filter state */
  initialFilters?: Partial<ExerciseFilterState>;
  /** Exercises to exclude from results (e.g., already selected in workout) */
  excludeExercises?: Exercise[];
}

export interface ExerciseFilterResult {
  /** Filtered and sorted exercises */
  filteredExercises: Exercise[];
  /** Current filter state */
  filterState: ExerciseFilterState;
  /** Update one or more filter values */
  updateFilter: (updates: Partial<ExerciseFilterState>) => void;
  /** Clear all filters (except catalog) */
  clearFilters: () => void;
  /** Set catalog and optionally reset other filters */
  setCatalog: (catalogId: string, resetOtherFilters?: boolean) => void;
  /** Toggle a category filter */
  toggleCategory: (category: ExerciseCategory) => void;
  /** Clear all category selections */
  clearCategories: () => void;
}

/**
 * Reusable exercise filtering hook
 * Extracts filtering logic from ExercisePage into a composable hook
 */
export function useExerciseFilter(
  exercises: Exercise[],
  options: ExerciseFilterOptions = {}
): ExerciseFilterResult {
  const { t } = useTranslation(['common', 'exercises']);
  const { user } = useAuth();
  const { isSharedExercise } = useSharedExercises();

  const {
    persistFilters = false,
    storageKey = 'exercise-filter',
    initialFilters = {},
    excludeExercises = []
  } = options;

  // Helper to load saved filter state from localStorage
  const loadSavedFilters = useCallback((): ExerciseFilterState => {
    if (persistFilters && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            selectedCatalogId: parsed.selectedCatalogId || getDefaultCatalog().id,
            selectedCategories: new Set<ExerciseCategory>(parsed.selectedCategories || []),
            searchTerm: parsed.searchTerm || '',
            showFavoritesOnly: parsed.showFavoritesOnly || false,
            exerciseFilter: parsed.exerciseFilter || 'all',
            sortBy: parsed.sortBy || 'name'
          };
        }
      } catch (error) {
        logger.warn('[useExerciseFilter] Failed to load saved filter state:', error);
      }
    }

    // Default state
    return {
      selectedCatalogId: initialFilters.selectedCatalogId || getDefaultCatalog().id,
      selectedCategories: initialFilters.selectedCategories || new Set<ExerciseCategory>(),
      searchTerm: initialFilters.searchTerm || '',
      showFavoritesOnly: initialFilters.showFavoritesOnly || false,
      exerciseFilter: initialFilters.exerciseFilter || 'all',
      sortBy: initialFilters.sortBy || 'name'
    };
  }, [persistFilters, storageKey, initialFilters]);

  // Initialize state with saved values or defaults
  const [filterState, setFilterState] = useState<ExerciseFilterState>(loadSavedFilters);

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    if (persistFilters && storageKey) {
      try {
        const stateToSave = {
          ...filterState,
          selectedCategories: Array.from(filterState.selectedCategories)
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        logger.warn('[useExerciseFilter] Failed to save filter state:', error);
      }
    }
  }, [filterState, persistFilters, storageKey]);

  // Helper function to check if exercise is user-created
  const isUserCreatedExercise = useCallback((exercise: Exercise): boolean => {
    const isUUIDFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exercise.id);

    // Exclude shared copies from being considered user-created
    if (isSharedExercise(exercise.id)) {
      return false;
    }

    // For UUID exercises (user-created)
    if (isUUIDFormat) {
      // If user is logged in
      if (user?.id) {
        // If exercise has owner_id, check it matches current user
        if (exercise.owner_id) {
          return exercise.owner_id === user.id;
        }
        // If exercise has no owner_id but is UUID format, assume it belongs to current user
        return true;
      } else {
        // If user is not logged in, only show orphaned exercises (created offline)
        return exercise.owner_id === null;
      }
    }

    return false;
  }, [user?.id, isSharedExercise]);

  // Filter and sort exercises
  const filteredExercises = useMemo(() => {
    const term = filterState.searchTerm.trim().toLowerCase();

    // Create set of excluded exercise IDs for faster lookup
    const excludedIds = new Set(excludeExercises.map(ex => ex.id));

    const filtered = exercises.filter(exercise => {
      // Exclude exercises that are in the exclude list
      if (excludedIds.has(exercise.id)) {
        return false;
      }

      // Filter by catalog
      const matchesCatalog = exercise.catalogId === filterState.selectedCatalogId;

      // Filter by category
      const matchesCategory = filterState.selectedCategories.size === 0
        || filterState.selectedCategories.has(exercise.category);

      // Filter by search term (localized search)
      const loc = localizeExercise(exercise, t);
      const matchesSearch = term.length === 0
        || loc.name.toLowerCase().includes(term)
        || (loc.description || '').toLowerCase().includes(term)
        || (exercise.tags || []).some(tag => tag.toLowerCase().includes(term));

      // Filter by favorites
      const matchesFavorites = !filterState.showFavoritesOnly || exercise.is_favorite;

      // Filter by exercise type (built-in/custom/shared)
      const isUserCreated = isUserCreatedExercise(exercise);
      const isShared = isSharedExercise(exercise.id);

      const matchesExerciseFilter = filterState.exerciseFilter === 'all' ||
        (filterState.exerciseFilter === 'built-in' && !isUserCreated && !isShared) ||
        (filterState.exerciseFilter === 'custom' && isUserCreated) ||
        (filterState.exerciseFilter === 'shared' && isShared);

      return matchesCatalog && matchesCategory && matchesSearch && matchesFavorites && matchesExerciseFilter;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aLoc = localizeExercise(a, t);
      const bLoc = localizeExercise(b, t);

      switch (filterState.sortBy) {
        case 'name':
          return aLoc.name.localeCompare(bLoc.name);
        case 'type':
          // Sort by exercise type, then by name
          if (a.exercise_type !== b.exercise_type) {
            return a.exercise_type.localeCompare(b.exercise_type);
          }
          return aLoc.name.localeCompare(bLoc.name);
        case 'recently-added': {
          // Sort by created_at (newest first), fallback to name
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          if (aDate !== bDate) {
            return bDate - aDate; // newest first
          }
          return aLoc.name.localeCompare(bLoc.name);
        }
        default:
          return aLoc.name.localeCompare(bLoc.name);
      }
    });

    return filtered;
  }, [
    exercises,
    filterState,
    excludeExercises,
    t,
    isUserCreatedExercise,
    isSharedExercise
  ]);

  // Update filter state (partial update)
  const updateFilter = useCallback((updates: Partial<ExerciseFilterState>) => {
    setFilterState(prev => ({
      ...prev,
      ...updates,
      // Handle Set updates properly
      ...(updates.selectedCategories && {
        selectedCategories: new Set(updates.selectedCategories)
      })
    }));
  }, []);

  // Clear all filters (except catalog)
  const clearFilters = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      selectedCategories: new Set(),
      searchTerm: '',
      showFavoritesOnly: false,
      exerciseFilter: 'all',
      sortBy: 'name'
    }));
  }, []);

  // Set catalog with optional filter reset
  const setCatalog = useCallback((catalogId: string, resetOtherFilters = true) => {
    if (resetOtherFilters) {
      setFilterState({
        selectedCatalogId: catalogId,
        selectedCategories: new Set(),
        searchTerm: '',
        showFavoritesOnly: false,
        exerciseFilter: 'all',
        sortBy: 'name'
      });
    } else {
      setFilterState(prev => ({
        ...prev,
        selectedCatalogId: catalogId
      }));
    }
  }, []);

  // Toggle category
  const toggleCategory = useCallback((category: ExerciseCategory) => {
    setFilterState(prev => {
      const newSelected = new Set(prev.selectedCategories);
      if (newSelected.has(category)) {
        newSelected.delete(category);
      } else {
        newSelected.add(category);
      }
      return {
        ...prev,
        selectedCategories: newSelected
      };
    });
  }, []);

  // Clear all categories
  const clearCategories = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      selectedCategories: new Set()
    }));
  }, []);

  return {
    filteredExercises,
    filterState,
    updateFilter,
    clearFilters,
    setCatalog,
    toggleCategory,
    clearCategories
  };
}
