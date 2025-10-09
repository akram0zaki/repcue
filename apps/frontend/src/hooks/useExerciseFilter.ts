import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Exercise, ExerciseCategory } from '../types';
import { localizeExercise } from '../utils/localizeExercise';
import { getDefaultCatalog } from '../data/catalogs';
import { useAuth } from './useAuth';
import { useSharedExercises } from './useSharedExercises';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';
import { getCatalogBadges, matchesBadgeFilter } from '../utils/catalogBadges';

export interface ExerciseFilterState {
  selectedCatalogId: string;
  searchTerm: string;
  showFavoritesOnly: boolean;
  exerciseFilter: 'all' | 'built-in' | 'custom' | 'shared';
  sortBy: 'name' | 'type' | 'recently-added';
  /** Generic badge selections: badgeId -> Set of selected values */
  selectedBadges: Record<string, Set<string | number>>;
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
  /** Toggle a badge value */
  toggleBadgeValue: (badgeId: string, value: string | number) => void;
  /** Clear all selections for a specific badge */
  clearBadge: (badgeId: string) => void;
  /** 
   * @deprecated Use toggleBadgeValue with badgeId='category' instead
   * Kept for backward compatibility 
   */
  toggleCategory: (category: ExerciseCategory) => void;
  /** 
   * @deprecated Use clearBadge('category') instead
   * Kept for backward compatibility 
   */
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
          
          // Migrate old filter formats to badge system
          const selectedBadges: Record<string, Set<string | number>> = {};
          
          // Migrate old Kyu levels (Aikido-specific)
          if (parsed.selectedKyuLevels && Array.isArray(parsed.selectedKyuLevels) && parsed.selectedKyuLevels.length > 0) {
            selectedBadges.kyuLevel = new Set(parsed.selectedKyuLevels);
            logger.log('[useExerciseFilter] Migrated old Kyu level filters to badge system');
          }
          
          // Migrate old categories to category badge
          if (parsed.selectedCategories && Array.isArray(parsed.selectedCategories) && parsed.selectedCategories.length > 0) {
            selectedBadges.category = new Set(parsed.selectedCategories);
            logger.log('[useExerciseFilter] Migrated old category filters to badge system');
          }
          
          // Load new badge format if present
          if (parsed.selectedBadges) {
            Object.entries(parsed.selectedBadges).forEach(([badgeId, values]) => {
              if (Array.isArray(values)) {
                selectedBadges[badgeId] = new Set(values);
              }
            });
          }
          
          return {
            selectedCatalogId: parsed.selectedCatalogId || getDefaultCatalog().id,
            searchTerm: parsed.searchTerm || '',
            showFavoritesOnly: parsed.showFavoritesOnly || false,
            exerciseFilter: parsed.exerciseFilter || 'all',
            sortBy: parsed.sortBy || 'name',
            selectedBadges
          };
        }
      } catch (error) {
        logger.warn('[useExerciseFilter] Failed to load saved filter state:', error);
      }
    }

    // Default state
    return {
      selectedCatalogId: initialFilters.selectedCatalogId || getDefaultCatalog().id,
      searchTerm: initialFilters.searchTerm || '',
      showFavoritesOnly: initialFilters.showFavoritesOnly || false,
      exerciseFilter: initialFilters.exerciseFilter || 'all',
      sortBy: initialFilters.sortBy || 'name',
      selectedBadges: initialFilters.selectedBadges || {}
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
          selectedBadges: Object.fromEntries(
            Object.entries(filterState.selectedBadges).map(([badgeId, values]) => [
              badgeId,
              Array.from(values)
            ])
          )
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
    
    // Get catalog badges for filtering
    const catalogBadges = getCatalogBadges(filterState.selectedCatalogId);

    const filtered = exercises.filter(exercise => {
      // Exclude exercises that are in the exclude list
      if (excludedIds.has(exercise.id)) {
        return false;
      }

      // Filter by catalog
      const matchesCatalog = exercise.catalogId === filterState.selectedCatalogId;

      // Filter by badges (AND logic across different badges, OR within each badge)
      let matchesBadges = true;
      for (const [badgeId, selectedValues] of Object.entries(filterState.selectedBadges)) {
        if (selectedValues.size === 0) continue; // Skip badges with no selections
        
        const badge = catalogBadges.find(b => b.id === badgeId);
        if (!badge) continue; // Skip if badge not found in catalog
        
        if (!matchesBadgeFilter(exercise, badge, selectedValues)) {
          matchesBadges = false;
          break; // AND logic: if any badge doesn't match, exclude exercise
        }
      }

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

      return matchesCatalog && matchesBadges && matchesSearch && matchesFavorites && matchesExerciseFilter;
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
      // Handle badge Set updates properly
      ...(updates.selectedBadges && {
        selectedBadges: Object.fromEntries(
          Object.entries(updates.selectedBadges).map(([badgeId, values]) => [
            badgeId,
            new Set(values)
          ])
        )
      })
    }));
  }, []);

  // Clear all filters (except catalog)
  const clearFilters = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      selectedBadges: {},
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
        selectedBadges: {},
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

  // Toggle a badge value
  const toggleBadgeValue = useCallback((badgeId: string, value: string | number) => {
    setFilterState(prev => {
      const currentBadge = prev.selectedBadges[badgeId] || new Set();
      const newBadgeValues = new Set(currentBadge);
      
      if (newBadgeValues.has(value)) {
        newBadgeValues.delete(value);
      } else {
        newBadgeValues.add(value);
      }
      
      const newSelectedBadges = { ...prev.selectedBadges };
      if (newBadgeValues.size === 0) {
        delete newSelectedBadges[badgeId]; // Remove badge if no values selected
      } else {
        newSelectedBadges[badgeId] = newBadgeValues;
      }
      
      return {
        ...prev,
        selectedBadges: newSelectedBadges
      };
    });
  }, []);

  // Clear all selections for a specific badge
  const clearBadge = useCallback((badgeId: string) => {
    setFilterState(prev => {
      const newSelectedBadges = { ...prev.selectedBadges };
      delete newSelectedBadges[badgeId];
      return {
        ...prev,
        selectedBadges: newSelectedBadges
      };
    });
  }, []);

  // DEPRECATED: Toggle category (for backward compatibility)
  const toggleCategory = useCallback((category: ExerciseCategory) => {
    toggleBadgeValue('category', category);
  }, [toggleBadgeValue]);

  // DEPRECATED: Clear all categories (for backward compatibility)
  const clearCategories = useCallback(() => {
    clearBadge('category');
  }, [clearBadge]);

  return {
    filteredExercises,
    filterState,
    updateFilter,
    clearFilters,
    setCatalog,
    toggleBadgeValue,
    clearBadge,
    toggleCategory,
    clearCategories
  };
}
