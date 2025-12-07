import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../../types';
import { useExerciseFilter, type ExerciseFilterOptions } from '../../hooks/useExerciseFilter';
import { localizeExercise } from '../../utils/localizeExercise';
import CatalogSelector from '../CatalogSelector';
import BadgeFilterGroup from '../BadgeFilterGroup';
import { StarIcon, StarFilledIcon } from '../icons/NavigationIcons';

export interface ExerciseSelectorProps {
  /** Available exercises to choose from */
  exercises: Exercise[];

  /** Currently selected exercise (for highlighting) */
  selectedExercise?: Exercise | null;

  /** Exercises to exclude from the list (e.g., already added to workout) */
  excludeExercises?: Exercise[];

  /** Callback when exercise is selected */
  onSelectExercise: (exercise: Exercise) => void;

  /** Show catalog selector */
  showCatalogSelector?: boolean;

  /** Show badge filters */
  showBadgeFilters?: boolean;

  /** Show exercise type filter (All/Built-in/Custom/Shared) */
  showTypeFilter?: boolean;

  /** Show favorites toggle */
  showFavoritesToggle?: boolean;

  /** Show search bar */
  showSearch?: boolean;

  /** Show sort options */
  showSort?: boolean;

  /** Persist filter state to localStorage */
  persistFilters?: boolean;

  /** Custom storage key for filter persistence */
  filterStorageKey?: string;

  /** Callback for toggling favorite status */
  onToggleFavorite?: (exerciseId: string) => void;

  /** Custom empty state message */
  emptyStateMessage?: string;

  /** Custom className for styling */
  className?: string;
}

/**
 * Unified exercise selector component with advanced filtering
 * Provides search, catalog, category, type filtering, and favorites toggle
 */
export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  exercises,
  selectedExercise,
  excludeExercises = [],
  onSelectExercise,
  showCatalogSelector = true,
  showBadgeFilters = true,
  showTypeFilter = true,
  showFavoritesToggle = false,
  showSearch = true,
  showSort = true,
  persistFilters = false,
  filterStorageKey = 'exercise-selector',
  onToggleFavorite,
  emptyStateMessage,
  className = ''
}) => {
  const { t } = useTranslation(['common', 'exercises', 'catalogs']);

  // Use the filtering hook
  const filterOptions: ExerciseFilterOptions = {
    persistFilters,
    storageKey: filterStorageKey,
    excludeExercises
  };

  const {
    filteredExercises,
    filterState,
    updateFilter,
    clearFilters,
    setCatalog,
    toggleBadgeValue,
    clearBadge
  } = useExerciseFilter(exercises, filterOptions);

  // Format exercise details for display
  const formatSimplifiedDetails = (exercise: Exercise): string => {
    if (exercise.exercise_type === 'time_based') {
      const seconds = exercise.default_duration;
      if (!seconds) return t('exercises:variable');
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes > 0) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
      }
      return `${seconds}s`;
    } else {
      const sets = exercise.default_sets || 1;
      const reps = exercise.default_reps || 1;
      return `${sets}×${reps}`;
    }
  };

  return (
    <div className={`exercise-selector flex flex-col ${className}`}>
      {/* Catalog Selector */}
      {showCatalogSelector && (
        <div className="flex-shrink-0 mb-4">
          <CatalogSelector
            selectedCatalogId={filterState.selectedCatalogId}
            onCatalogChange={(catalogId) => setCatalog(catalogId, true)}
          />
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="flex-shrink-0 mb-3">
          <label htmlFor="exercise-search" className="sr-only">
            {t('exercises:searchLabel', { defaultValue: 'Search exercises' })}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="exercise-search"
              type="text"
              placeholder={t('exercises:searchPlaceholder', { defaultValue: 'Search exercises...' })}
              value={filterState.searchTerm}
              onChange={(e) => updateFilter({ searchTerm: e.target.value })}
              className="block w-full ps-14 sm:ps-16 pe-10 sm:pe-12 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {filterState.searchTerm && (
              <button
                onClick={() => updateFilter({ searchTerm: '' })}
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={t('common.clearSearch', { defaultValue: 'Clear search' })}
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex-shrink-0 mb-3 space-y-3">
        {/* Badge Filters */}
        {showBadgeFilters && (
          <BadgeFilterGroup
            catalogId={filterState.selectedCatalogId}
            exercises={exercises}
            selectedBadges={filterState.selectedBadges}
            onToggleBadgeValue={toggleBadgeValue}
            onClearBadge={clearBadge}
            className="mb-3"
          />
        )}

        {/* Sort Options */}
        {showSort && (
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('exercises:sortBy', { defaultValue: 'Sort by:' })}
            </label>
            <select
              id="sort-select"
              value={filterState.sortBy}
              onChange={(e) => updateFilter({ sortBy: e.target.value as 'name' | 'type' | 'recently-added' })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="name">{t('exercises:sortName', { defaultValue: 'Name' })}</option>
              <option value="type">{t('exercises:sortType', { defaultValue: 'Type' })}</option>
              <option value="recently-added">{t('exercises:sortRecentlyAdded', { defaultValue: 'Recently Added' })}</option>
            </select>
          </div>
        )}

        {/* Exercise Type Filter and Favorites Toggle */}
        {(showTypeFilter || showFavoritesToggle) && (
          <div className="flex flex-wrap gap-2">
            {showTypeFilter && (
              <>
                <button
                  onClick={() => updateFilter({ exerciseFilter: 'all' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterState.exerciseFilter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('exercises:filterAll', { defaultValue: 'All' })}
                </button>
                <button
                  onClick={() => updateFilter({ exerciseFilter: 'built-in' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterState.exerciseFilter === 'built-in'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('exercises:filterBuiltIn', { defaultValue: 'Built-in' })}
                </button>
                <button
                  onClick={() => updateFilter({ exerciseFilter: 'custom' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterState.exerciseFilter === 'custom'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('exercises:filterCustom', { defaultValue: 'Custom' })}
                </button>
                <button
                  onClick={() => updateFilter({ exerciseFilter: 'shared' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterState.exerciseFilter === 'shared'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('exercises:filterShared', { defaultValue: 'Shared with me' })}
                </button>
              </>
            )}

            {showFavoritesToggle && (
              <button
                onClick={() => updateFilter({ showFavoritesOnly: !filterState.showFavoritesOnly })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterState.showFavoritesOnly
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <StarIcon size={16} />
                <span>{t('exercises:favoritesOnly', { defaultValue: 'Favorites Only' })}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex-shrink-0 mb-2 text-sm text-gray-600 dark:text-gray-400">
        {t('exercises:showingCount', {
          count: filteredExercises.length,
          total: exercises.length - excludeExercises.length,
          defaultValue: `Showing ${filteredExercises.length} of ${exercises.length - excludeExercises.length} exercises`
        })}
      </div>

      {/* Exercise List */}
      <div className="flex-1 -mx-1 px-1">
        {filteredExercises.length === 0 ? (
          /* Empty State */
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('exercises:noResults', { defaultValue: 'No exercises found' })}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {emptyStateMessage || t('exercises:noResultsDescription', { defaultValue: 'Try adjusting your filters or search term' })}
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              {t('exercises:clearFilters', { defaultValue: 'Clear all filters' })}
            </button>
          </div>
        ) : (
          /* Exercise Grid */
          <div className="space-y-2">
            {filteredExercises.map((exercise) => {
              const loc = localizeExercise(exercise, t);
              const isSelected = selectedExercise?.id === exercise.id;

              return (
                <button
                  key={exercise.id}
                  onClick={() => onSelectExercise(exercise)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 shadow-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                        {loc.name}
                      </h4>
                      {loc.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {loc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatSimplifiedDetails(exercise)}</span>
                      </div>
                    </div>

                    {/* Favorite Icon */}
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(exercise.id);
                        }}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        aria-label={exercise.is_favorite ? t('common.unfavorite') : t('common.favorite')}
                      >
                        {exercise.is_favorite ? (
                          <StarFilledIcon size={20} className="text-yellow-500" />
                        ) : (
                          <StarIcon size={20} />
                        )}
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseSelector;
