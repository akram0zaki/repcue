/* eslint-disable no-restricted-syntax -- i18n-exempt: page already uses t() for user-visible text; remaining literals are units, icons, or fallback defaults */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, ExerciseCategory, AppSettings, CatalogMembership } from '../types';
import { ExerciseCategory as Categories } from '../types';
import { Routes as AppRoutes } from '../types';
import { syncService } from '../services/syncService';
import { PullToRefresh } from '../components/platform';
import { 
  WorkoutIcon, 
  TargetIcon, 
  StrengthIcon, 
  CardioIcon, 
  FlexibilityIcon, 
  BalanceIcon, 
  HandWarmupIcon, 
  RunnerIcon,
  StarIcon,
  StarFilledIcon,
  PlayIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon
} from '../components/icons/NavigationIcons';
import { useTranslation } from 'react-i18next';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useAuth } from '../hooks/useAuth';
import { useSharedExercises } from '../hooks/useSharedExercises';
import type { AuthUserProfile } from '../types';
import { localizeExercise } from '../utils/localizeExercise';
import getVideoSources from '../utils/videoSources';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useSnackbar } from '../components/SnackbarProvider';
import { recordVideoLoadError } from '../telemetry/videoTelemetry';
import logger from '../utils/logger';
import { ShareButton } from '../components/ShareButton';
import CatalogSelector from '../components/CatalogSelector';
import BadgeFilterGroup from '../components/BadgeFilterGroup';
import { EXERCISE_CATALOGS } from '../data/catalogs';
import { storageService } from '../services/storageService';
import { useExerciseFilter } from '../hooks/useExerciseFilter';
import { getCatalogBadges, getExerciseBadgeValues } from '../utils/catalogBadges';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface ExercisePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exercise_id: string) => void;
  onDeleteExercise?: (exercise_id: string) => Promise<void>;
}

const ExercisePage: React.FC<ExercisePageProps> = ({ exercises, appSettings, onToggleFavorite, onDeleteExercise }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['exercises', 'common', 'exerciseDetails', 'catalogs']);
  const { showSnackbar } = useSnackbar();
  const { flags } = useFeatureFlags();
  const { user } = useAuth();
  const { isSharedExercise } = useSharedExercises();

  // Pull-to-refresh handler - triggers sync and refreshes exercises
  const handleRefresh = useCallback(async () => {
    try {
      // Trigger sync if user is authenticated
      if (user) {
        await syncService.sync(true);
      }
      // Emit event to refresh data in App.tsx
      window.dispatchEvent(new CustomEvent('sync:applied'));
    } catch (error) {
      // Log silently - sync errors shouldn't disrupt the user
      logger.error('Failed to refresh:', error);
    }
  }, [user]);

  // Bulk load all exercise memberships to prevent N+1 query problem
  const [exerciseMemberships, setExerciseMemberships] = useState<Map<string, CatalogMembership[]>>(new Map());
  
  useEffect(() => {
    const loadMemberships = async () => {
      const exerciseIds = exercises.map(ex => ex.id);
      const memberships = await storageService.getAllExerciseMemberships(exerciseIds);
      setExerciseMemberships(memberships);
    };
    loadMemberships();
  }, [exercises]);

  // Use the centralized exercise filter hook with badge support
  const {
    filteredExercises: hookFilteredExercises,
    filterState,
    updateFilter,
    setCatalog,
    toggleBadgeValue,
    clearBadge,
    clearFilters
  } = useExerciseFilter(exercises, {
    persistFilters: true,
    storageKey: 'exercise-page-filters'
  });

  // Destructure filter state for easier access
  const {
    selectedCatalogId,
    selectedBadges,
    searchTerm,
    showFavoritesOnly,
    exerciseFilter,
    sortBy
  } = filterState;
  // Filter collapse state - collapsed by default
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  // Video preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);



  // Refs for horizontal scrolling navigation
  const categoryScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Scroll functions for horizontal navigation
  const scrollCategory = useCallback((category: string, direction: 'left' | 'right') => {
    const scrollContainer = categoryScrollRefs.current[category];
    if (!scrollContainer) return;

    const scrollAmount = 280; // Slightly more than card width (256px + gap)
    const currentScroll = scrollContainer.scrollLeft;
    const newScroll = direction === 'left'
      ? currentScroll - scrollAmount
      : currentScroll + scrollAmount;

    scrollContainer.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }, []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);

  // Count active badge selections for UI display
  const badgeSelectionCount = Object.values(selectedBadges).reduce(
    (sum: number, badgeSet) => sum + (badgeSet as Set<string | number>).size,
    0
  );

  // Clear all filters and reset to defaults (except catalog)
  const clearAllFilters = () => {
    clearFilters(); // Clear all filters (catalog is preserved by the hook)
  };

  // Handle catalog change with optional filter reset
  const handleCatalogChange = (catalogId: string) => {
    setCatalog(catalogId, true); // Reset other filters when switching catalogs
  };

  const closePreview = () => {
    // Clean up blob URL if it's a blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewExercise(null);
    setPreviewUrl(null);
  };

  // Ensure element-level error closes dialog reliably during tests
  const handleVideoError = React.useCallback(() => {
    if (previewExercise && previewUrl) {
      recordVideoLoadError({ exercise_id: previewExercise.id, url: previewUrl, reason: 'preview-element-error' });
    }
    setPreviewUrl(null);
    showSnackbar(
      t('exercises:previewUnavailable', { defaultValue: 'Video is not available at this time' }),
      { type: 'warning', durationMs: 1200 }
    );
    setPreviewOpen(false);
    setPreviewExercise(null);
  }, [previewExercise, previewUrl, showSnackbar, t]);

  useEffect(() => {
    if (!previewOpen) return;
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === 'function') { p.catch(() => {}); }
    };
    const handleError = () => {
      if (previewExercise && previewUrl) {
        recordVideoLoadError({ exercise_id: previewExercise.id, url: previewUrl, reason: 'preview-element-error' });
      }
      setPreviewUrl(null);
      showSnackbar(
        t('exercises:previewUnavailable', { defaultValue: 'Video is not available at this time' }),
        { type: 'warning', durationMs: 1200 }
      );
      // Auto-close preview on error to avoid intrusive duplicate messaging
      setPreviewOpen(false);
      setPreviewExercise(null);
    };
    if (previewUrl) tryPlay();
    v.addEventListener('error', handleError);
    return () => { v.removeEventListener('error', handleError); };
  }, [previewOpen, previewUrl, previewExercise, showSnackbar, t]);

  // Use the filtered exercises from the hook (filtering is now handled by useExerciseFilter)
  const filteredExercises = hookFilteredExercises;

  // Get the current catalog configuration
  const currentCatalog = useMemo(() => 
    EXERCISE_CATALOGS.find(c => c.id === selectedCatalogId),
    [selectedCatalogId]
  );

  // Get the grouping badge if specified
  const groupingBadge = useMemo(() => {
    if (!currentCatalog?.groupByBadge) return null;
    const catalogBadges = getCatalogBadges(selectedCatalogId);
    return catalogBadges.find(b => b.id === currentCatalog.groupByBadge) || null;
  }, [currentCatalog, selectedCatalogId]);

  // Group exercises dynamically by the specified badge (or flat list if no grouping)
  const exercisesByGroup = useMemo(() => {
    if (!groupingBadge) {
      // No grouping specified - return flat list
      return { ungrouped: filteredExercises };
    }

    const grouped: Record<string, Exercise[]> = {};
    
    // Initialize groups from badge values
    groupingBadge.values?.forEach(value => {
      grouped[String(value.id)] = [];
    });

    // Assign exercises to groups
    filteredExercises.forEach(exercise => {
      const badgeValues = getExerciseBadgeValues(
        exercise,
        groupingBadge.id,
        groupingBadge.tagPattern || {}
      );

      if (badgeValues.length > 0) {
        // Add exercise to all matching groups (an exercise can belong to multiple groups)
        badgeValues.forEach(value => {
          const groupKey = String(value);
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(exercise);
        });
      } else {
        // Exercise has no badge value - add to 'other' group
        if (!grouped.other) {
          grouped.other = [];
        }
        grouped.other.push(exercise);
      }
    });

    return grouped;
  }, [filteredExercises, groupingBadge]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return t('exercises:variable');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const formatSimplifiedDetails = (exercise: Exercise): string => {
    if (exercise.exercise_type === 'time_based') {
      return formatDuration(exercise.default_duration);
    } else {
      const sets = exercise.default_sets || 1;
      const reps = exercise.default_reps || 1;
      return `${sets}x${reps}`;
    }
  };

  // Get display info for a group (label and icon)
  const getGroupDisplayInfo = (groupKey: string) => {
    if (!groupingBadge) {
      return { label: t('exercises:allExercises', { defaultValue: 'All Exercises' }), icon: null };
    }

    // Find the badge value for this group
    const badgeValue = groupingBadge.values?.find(v => String(v.id) === groupKey);
    
    if (badgeValue) {
      const label = t(badgeValue.label, { defaultValue: badgeValue.fallbackLabel || String(groupKey) });
      const icon = badgeValue.icon || null;
      return { label, icon };
    }

    // Fallback for 'other' or ungrouped
    return {
      label: groupKey === 'other' 
        ? t('common:other', { defaultValue: 'Other' })
        : groupKey === 'ungrouped'
        ? t('exercises:allExercises', { defaultValue: 'All Exercises' })
        : String(groupKey).replace('-', ' '),
      icon: null
    };
  };

  const getCategoryIcon = (category: ExerciseCategory) => {
    const iconProps = { size: 20, className: "text-current" };
    switch (category) {
      case Categories.CORE: return <TargetIcon {...iconProps} />;
      case Categories.STRENGTH: return <StrengthIcon {...iconProps} />;
      case Categories.CARDIO: return <CardioIcon {...iconProps} />;
      case Categories.FLEXIBILITY: return <FlexibilityIcon {...iconProps} />;
      case Categories.BALANCE: return <BalanceIcon {...iconProps} />;
      case Categories.HAND_WARMUP: return <HandWarmupIcon {...iconProps} />;
      default: return <RunnerIcon {...iconProps} />;
    }
  };

  const getCategoryColor = (category: ExerciseCategory): string => {
    switch (category) {
      case Categories.CORE: return 'bg-red-500';
      case Categories.STRENGTH: return 'exercise-category-strength';
      case Categories.CARDIO: return 'bg-green-500';
      case Categories.FLEXIBILITY: return 'bg-purple-500';
      case Categories.BALANCE: return 'bg-yellow-500';
      case Categories.HAND_WARMUP: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStartTimer = (exercise: Exercise) => {
    navigate(AppRoutes.TIMER, { 
      state: { 
        selectedExercise: exercise,
        selectedDuration: exercise.default_duration || 30
      }
    });
  };

  const handleEditExercise = (exercise: Exercise) => {
    navigate(`/exercises/edit/${exercise.id}`);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    // Store the exercise ID and show the confirmation modal
    setExerciseToDelete(exerciseId);
    setDeleteModalOpen(true);
  };

  const handleNavigateToExercise = (exerciseId: string) => {
    navigate(`/exercises/${exerciseId}`);
  };

  const handleConfirmDelete = async () => {
    if (exerciseToDelete && onDeleteExercise) {
      try {
        await onDeleteExercise(exerciseToDelete);
        showSnackbar(t('exercises:deleteSuccess', { defaultValue: 'Exercise deleted successfully' }), { type: 'success' });
      } catch (error) {
        logger.error('Failed to delete exercise:', error);
        showSnackbar(t('exercises:deleteError', { defaultValue: 'Failed to delete exercise' }), { type: 'error' });
      } finally {
        setExerciseToDelete(null);
      }
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} testId="exercises-pull-to-refresh">
    <>
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-text-900 dark:text-text-50 flex items-center gap-2">
              <WorkoutIcon size={24} className="exercise-icon" />
              {t('exercises:title')}
            </h1>
            {flags.canCreateExercises && (
              <button
                onClick={() => navigate('/exercises/create')}
                className="flex items-center gap-2 btn-primary px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                aria-label={t('exercises:createNew', 'Create New Exercise')}
              >
                <PlusIcon size={20} />
                <span className="hidden sm:inline">{t('exercises:createNew', 'Create New Exercise')}</span>
                <span className="sm:hidden">{t('common:common.create', 'Create')}</span>
              </button>
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('exercises:subtitle')}
          </p>
        </div>

        {/* Catalog Selector */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-3 sm:p-4 mb-4">
          <CatalogSelector
            selectedCatalogId={selectedCatalogId}
            onCatalogChange={handleCatalogChange}
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg mb-4 sm:mb-6">
          {/* Filter Toggle Header - Always Visible */}
          <div className="p-3 border-b border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full flex items-center justify-between text-left"
              aria-expanded={filtersExpanded}
              aria-controls="filters-content"
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                <span className="text-base font-medium text-text-900 dark:text-text-50">
                  {t('exercises:filtersAndSearch', { defaultValue: 'Filters & Search' })}
                </span>
                {/* Active filter count indicator - only show when non-default filters are active */}
                {(() => {
                  const activeFilterCount = [
                    badgeSelectionCount, // Count all selected badge values
                    searchTerm ? 1 : 0, // Count search if present
                    showFavoritesOnly ? 1 : 0, // Count favorites toggle if active
                    // Do NOT count exerciseFilter when it's 'all' (default state)
                    (exerciseFilter !== 'all') ? 1 : 0,
                    // Do NOT count sortBy when it's 'name' (default state)  
                    (sortBy !== 'name') ? 1 : 0
                  ].reduce((sum: number, count: number) => sum + count, 0);
                  
                  return activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold exercise-badge-count rounded-full">
                      {activeFilterCount}
                    </span>
                  );
                })()}
              </div>
              <svg 
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Collapsible Filter Content */}
          <div 
            id="filters-content"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              filtersExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-3">
              {/* Search Bar */}
              <div className="mb-2 sm:mb-3">
                <label htmlFor="search" className="sr-only">{t('exercises:searchLabel')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="search"
                    type="text"
                    placeholder={t('exercises:searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                    className="block w-full pl-14 sm:pl-16 pr-10 sm:pr-12 py-2.5 sm:py-2 border border-surface-300 dark:border-surface-600 rounded-md text-sm sm:text-base bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 placeholder-gray-500 dark:placeholder-gray-400 input-focus"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => updateFilter({ searchTerm: '' })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Clear search"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Badge Filter Group and Sort */}
              <div className="mb-2 sm:mb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <BadgeFilterGroup
                    catalogId={selectedCatalogId}
                    exercises={exercises}
                    selectedBadges={selectedBadges}
                    onToggleBadgeValue={toggleBadgeValue}
                    onClearBadge={clearBadge}
                    className="flex-1"
                    maxVisibleBadges={3}
                  />

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <label htmlFor="sort-select" className="text-sm font-medium sort-label-text flex-shrink-0">
                      <span className="hidden sm:inline">{t('exercises:sortBy', { defaultValue: 'Sort by:' })}</span>
                      <span className="sm:hidden">{t('exercises:sortByShort', { defaultValue: 'Sort:' })}</span>
                    </label>
                    <select
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) => updateFilter({ sortBy: e.target.value as 'name' | 'type' | 'recently-added' })}
                      className="px-2.5 py-1.5 border border-surface-300 dark:border-surface-600 rounded-md text-sm bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 input-focus min-h-[36px] rtl:text-right rtl:pr-8 rtl:pl-2.5"
                    >
                      <option value="name">{t('exercises:sortName', { defaultValue: 'Name' })}</option>
                      <option value="type">{t('exercises:sortType', { defaultValue: 'Type' })}</option>
                      <option value="recently-added">{t('exercises:sortRecentlyAdded', { defaultValue: 'Recently Added' })}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                {/* Exercise Type Filter */}
                <div className="flex gap-1 flex-wrap justify-start">
                  <button
                    onClick={() => updateFilter({ exerciseFilter: 'all' })}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'all'
                        ? 'filter-button-active'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterAll', { defaultValue: 'All' })}
                  </button>
                  <button
                    onClick={() => updateFilter({ exerciseFilter: 'built-in' })}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'built-in'
                        ? 'filter-button-active'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterBuiltIn', { defaultValue: 'Built-in' })}
                  </button>
                  <button
                    onClick={() => updateFilter({ exerciseFilter: 'custom' })}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'custom'
                        ? 'filter-button-active'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterCustom', { defaultValue: 'Custom' })}
                  </button>
                  <button
                    onClick={() => updateFilter({ exerciseFilter: 'shared' })}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'shared'
                        ? 'filter-button-active'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterShared', { defaultValue: 'Shared with me' })}
                  </button>
                </div>

                {/* Favorites Toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => updateFilter({ showFavoritesOnly: !showFavoritesOnly })}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      showFavoritesOnly
                        ? 'bg-yellow-500 text-white'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    <StarIcon size={16} />
                    <span>{t('exercises:favoritesOnly')}</span>
                  </button>
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-2 text-xs sm:text-sm summary-text">
                {(() => {
                  const selectedCatalog = EXERCISE_CATALOGS.find(c => c.id === selectedCatalogId);
                  const catalogName = selectedCatalog ? t(selectedCatalog.nameKey, { ns: 'catalogs', defaultValue: selectedCatalog.id }) : 'Unknown';
                  const totalInCatalog = exercises.filter(ex => ex.catalogId === selectedCatalogId).length;
                  return t('exercises:showingCountInCatalog', {
                    count: filteredExercises.length,
                    total: totalInCatalog,
                    catalog: catalogName,
                    defaultValue: `Showing ${filteredExercises.length} of ${totalInCatalog} exercises in ${catalogName}`
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Grid */}
        {badgeSelectionCount === 0 ? (
          // Show by group (badge-based) when viewing all
          appSettings.horizontal_exercise_layout ? (
            // Netflix-style horizontal group layout
            <div className="space-y-6 sm:space-y-8">
              {Object.entries(exercisesByGroup).map(([groupKey, groupExercises]) => {
                if (groupExercises.length === 0) return null;
                const { label: groupLabel, icon: groupIcon } = getGroupDisplayInfo(groupKey);

                return (
                  <div key={groupKey}>
                    <h2 className="text-lg sm:text-xl font-semibold text-text-900 dark:text-text-50 mb-3 sm:mb-4 flex items-center gap-2">
                      {groupIcon && <span>{groupIcon}</span>}
                      {!groupIcon && groupingBadge?.id === 'category' && <span>{getCategoryIcon(groupKey as ExerciseCategory)}</span>}
                      <span className="capitalize">{groupLabel}</span>
                      <span className="text-sm font-normal text-text-500 dark:text-text-400">
                        ({groupExercises.length})
                      </span>
                    </h2>
                    {/* Horizontal scrollable container with navigation */}
                    <div className="relative group -mx-3 sm:-mx-4">
                      {/* Left navigation button */}
                      {groupExercises.length > 1 && (
                        <button
                          onClick={() => scrollCategory(groupKey, 'left')}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
                          aria-label={t('a11y.scrollLeft', 'Scroll left')}
                        >
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Right navigation button */}
                      {groupExercises.length > 1 && (
                        <button
                          onClick={() => scrollCategory(groupKey, 'right')}
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
                          aria-label={t('a11y.scrollRight', 'Scroll right')}
                        >
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      <div
                        ref={(el) => {
                          categoryScrollRefs.current[groupKey] = el;
                        }}
                        className="overflow-x-auto scrollbar-hide px-3 sm:px-4"
                      >
                        <div className="flex gap-3 sm:gap-4 pb-2 w-max">
                          {groupExercises.map((exercise) => (
                            <div key={exercise.id} className="flex-none w-64 sm:w-72">
                              <ExerciseCard
                                exercise={exercise}
                                onToggleFavorite={onToggleFavorite}
                                onStartTimer={handleStartTimer}
                                getCategoryColor={getCategoryColor}
                                formatDuration={formatDuration}
                                formatSimplifiedDetails={formatSimplifiedDetails}
                                onEdit={handleEditExercise}
                                onDelete={handleDeleteExercise}
                                onNavigateToExercise={handleNavigateToExercise}
                                currentUser={user}
                                isSharedExercise={isSharedExercise}
                                memberships={exerciseMemberships.get(exercise.id) || []}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Traditional grid layout
            <div className="space-y-6 sm:space-y-8">
              {Object.entries(exercisesByGroup).map(([groupKey, groupExercises]) => {
                if (groupExercises.length === 0) return null;
                const { label: groupLabel, icon: groupIcon } = getGroupDisplayInfo(groupKey);

                return (
                  <div key={groupKey}>
                    <h2 className="text-lg sm:text-xl font-semibold text-text-900 dark:text-text-50 mb-3 sm:mb-4 flex items-center gap-2">
                      {groupIcon && <span>{groupIcon}</span>}
                      {!groupIcon && groupingBadge?.id === 'category' && <span>{getCategoryIcon(groupKey as ExerciseCategory)}</span>}
                      <span className="capitalize">{groupLabel}</span>
                      <span className="text-sm font-normal text-text-500 dark:text-text-400">
                        ({groupExercises.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {groupExercises.map((exercise) => (
                        <ExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          onToggleFavorite={onToggleFavorite}
                          onStartTimer={handleStartTimer}
                          getCategoryColor={getCategoryColor}
                          formatDuration={formatDuration}
                          formatSimplifiedDetails={formatSimplifiedDetails}
                          onEdit={handleEditExercise}
                          onDelete={handleDeleteExercise}
                          onNavigateToExercise={handleNavigateToExercise}
                          currentUser={user}
                          isSharedExercise={isSharedExercise}
                          memberships={exerciseMemberships.get(exercise.id) || []}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Show flat grid when filtering by category or search
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onToggleFavorite={onToggleFavorite}
                onStartTimer={handleStartTimer}
                getCategoryColor={getCategoryColor}
                formatDuration={formatDuration}
                formatSimplifiedDetails={formatSimplifiedDetails}
                onEdit={handleEditExercise}
                onDelete={handleDeleteExercise}
                onNavigateToExercise={handleNavigateToExercise}
                currentUser={user}
                isSharedExercise={isSharedExercise}
                memberships={exerciseMemberships.get(exercise.id) || []}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
  {filteredExercises.length === 0 && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('exercises:emptyTitle')}
            </h3>
            <p className="text-sm sm:text-base text-text-600 dark:text-text-400 mb-4">
              {t('exercises:emptyBody')}
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 btn-primary text-sm sm:text-base font-medium rounded-md transition-colors min-h-[44px]"
            >
              {t('exercises:clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
    {/* Preview Modal */}
    {previewOpen && (
      <div className="fixed inset-0 z-[100]">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closePreview}
          data-testid="preview-backdrop"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise-preview-title"
          className="absolute inset-0 flex items-center justify-center p-4"
        >
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
              <h2 id="exercise-preview-title" className="text-base sm:text-lg font-semibold text-text-900 dark:text-text-50">
                {previewExercise ? localizeExercise(previewExercise, t).name : t('exercises:preview', { defaultValue: 'Preview' })}
              </h2>
              <button
                onClick={closePreview}
                aria-label={t('common.close')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="p-3 sm:p-4">
              {previewUrl ? (
                <video
                  className="w-full h-auto rounded-md bg-black gpu-accelerated"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  crossOrigin="anonymous"
                  onError={handleVideoError}
                  ref={videoRef}
                >
                  {getVideoSources(previewUrl).map(s => (
                    <source key={s.src} src={s.src} type={s.type} />
                  ))}
                </video>
              ) : (
                <div className="w-full h-40 rounded-md bg-surface-200 dark:bg-surface-700 animate-pulse" data-testid="preview-loading" />
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Delete confirmation modal */}
    <ConfirmationModal
      isOpen={deleteModalOpen}
      onClose={() => {
        setDeleteModalOpen(false);
        setExerciseToDelete(null);
      }}
      onConfirm={handleConfirmDelete}
      title={t('exercises:deleteExerciseTitle', { defaultValue: 'Delete Exercise' })}
      message={
        exerciseToDelete 
          ? t('exercises:deleteConfirm', { 
              name: exercises.find(ex => ex.id === exerciseToDelete) 
                ? localizeExercise(exercises.find(ex => ex.id === exerciseToDelete)!, t).name 
                : 'this exercise',
              defaultValue: `Are you sure you want to delete "${exercises.find(ex => ex.id === exerciseToDelete) 
                ? localizeExercise(exercises.find(ex => ex.id === exerciseToDelete)!, t).name 
                : 'this exercise'}"? This action cannot be undone.`
            })
          : ''
      }
      confirmText={t('common:common.delete', { defaultValue: 'Delete' })}
      cancelText={t('common:common.cancel')}
      variant="danger"
    />



    </>
    </PullToRefresh>
  );
};

// Exercise Card Component
interface ExerciseCardProps {
  exercise: Exercise;
  onToggleFavorite: (exercise_id: string) => void;
  onStartTimer: (exercise: Exercise) => void;
  getCategoryColor: (category: ExerciseCategory) => string;
  formatDuration: (seconds?: number) => string;
  formatSimplifiedDetails: (exercise: Exercise) => string;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise_id: string) => Promise<void>;
  onNavigateToExercise: (exerciseId: string) => void;
  currentUser?: AuthUserProfile; // User from auth hook
  isSharedExercise: (exerciseId: string) => boolean; // Function to check if exercise is shared
  memberships?: CatalogMembership[]; // Pre-loaded memberships to prevent N+1 queries
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggleFavorite,
  onStartTimer,
  formatSimplifiedDetails,
  onEdit,
  onDelete,
  onNavigateToExercise,
  currentUser,
  isSharedExercise,
  memberships
}) => {
  const { t } = useTranslation(['common', 'exercises', 'exerciseDetails']);
  const loc = localizeExercise(exercise, t);
  
  // Use pre-loaded memberships to determine catalog IDs (prevents N+1 query problem)
  const catalogIds = useMemo(() => {
    if (memberships && memberships.length > 0) {
      return Array.from(new Set(memberships.map(m => m.catalog_id)));
    }
    return exercise.catalogId ? [exercise.catalogId] : [];
  }, [memberships, exercise.catalogId]);
  
  // Lazy load video thumbnails using intersection observer
  // Note: freezeOnceVisible=true is safe because VideoCacheService persists blob URLs
  // The async cleanup (isMounted flag) in VideoThumbnail prevents race conditions
  const { ref: cardRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin: '300px', // Start loading 300px before visible
    freezeOnceVisible: true // Optimization: once visible, stay visible (blob URLs persist)
  });
  
  // Check if the exercise is user-created and belongs to the current user
  // Built-in exercises have slug IDs (like 'plank'), user-created have UUID IDs
  const isUserCreatedExerciseCard = (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };
  
  // Only show edit/delete for user-created exercises owned by current user or orphaned exercises
  const isUserCreated = isUserCreatedExerciseCard(exercise.id) &&
                        (currentUser ? (exercise.owner_id === currentUser.id || !exercise.owner_id) : !exercise.owner_id) &&
                        !isSharedExercise(exercise.id); // Don't treat shared exercises as user-created

  // Check if exercise is shared using the tracking field
  const isSharedExerciseCard = isSharedExercise(exercise.id);

  /**
   * Handle card click - navigate to exercise details
   */
  const handleCardClick = () => {
    onNavigateToExercise(exercise.id);
  };

  return (
    <div 
      ref={cardRef}
      className={`relative bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg overflow-hidden transition-shadow select-none ${
      isUserCreated
        ? 'exercise-card-custom'
        : 'border border-surface-200 dark:border-surface-700'
    }`} data-testid="exercise-card">
      {/* Invisible button overlay for card-level click - native button works on iOS first tap */}
      <button
        type="button"
        onClick={handleCardClick}
        className="absolute inset-0 w-full h-full z-0 cursor-pointer bg-transparent border-0 p-0 m-0"
        aria-label={t('exercises:viewDetailsAria', { name: loc.name, defaultValue: `View details for ${loc.name}` })}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />

      <div className="p-2 sm:p-3 relative z-10 pointer-events-none">
        {/* Top Row - Exercise Details (Left) and Action Buttons (Right) */}
        <div className="mb-1">
          <div className="flex items-start justify-between gap-3">
            {/* Left Side - Exercise Details and Tags - Allow wrapping */}
            <div className="flex flex-col gap-y-1 flex-1 min-w-0">
              {/* Exercise Details - Left-aligned */}
              <span className="text-sm font-medium text-text-800 dark:text-text-100">
                {formatSimplifiedDetails(exercise)}
              </span>
              
              {/* Category Badges Section - Fixed 2 lines with overflow indicator */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 h-[3rem] overflow-hidden relative">
                {/* Custom/Shared Tags */}
                {isUserCreated && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium exercise-custom-badge rounded-full whitespace-nowrap">
                    {t('exercises:custom', { defaultValue: 'Custom' })}
                  </span>
                )}
                {currentUser && isSharedExerciseCard && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full whitespace-nowrap">
                    {t('exercises:shared', { defaultValue: 'Shared' })}
                  </span>
                )}
                {/* Catalog badges (multi-catalog) */}
                {(() => {
                  const MAX_VISIBLE_BADGES = 3;
                  const visibleCatalogIds = catalogIds.slice(0, MAX_VISIBLE_BADGES);
                  const hiddenCount = catalogIds.length - MAX_VISIBLE_BADGES;
                  
                  return (
                    <>
                      {visibleCatalogIds.map(cid => {
                        const catalog = EXERCISE_CATALOGS.find(c => c.id === cid);
                        const label = catalog ? t(catalog.nameKey, { ns: 'catalogs', defaultValue: cid }) : cid;
                        return (
                          <span
                            key={cid}
                            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 whitespace-nowrap"
                            aria-label={t('exercises:catalogBadgeAria', { catalog: label, defaultValue: `Catalog: ${label}` })}
                          >
                            {label}
                          </span>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-surface-200 dark:bg-surface-600 text-text-700 dark:text-text-200 whitespace-nowrap">
                          +{hiddenCount}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Right Side - Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0 flex-nowrap pointer-events-auto">

              {/* Edit Button - Only for user-created */}
              {isUserCreated && onEdit && (
                <button
                  onClick={() => onEdit(exercise)}
                  className="flex-shrink-0 text-text-700 dark:text-text-200 exercise-hover-link transition-colors p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                  title={t('exercises:editExercise', { defaultValue: 'Edit exercise' })}
                  aria-label={t('exercises:editExerciseAria', { name: loc.name, defaultValue: `Edit ${loc.name}` })}
                >
                  <EditIcon size={18} className="sm:!w-5 sm:!h-5" />
                </button>
              )}

              {/* Delete Button - For user-created and shared */}
              {(isUserCreated || isSharedExerciseCard) && onDelete && (
                <button
                  onClick={() => onDelete(exercise.id)}
                  className="flex-shrink-0 text-text-700 dark:text-text-200 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                  title={t('exercises:deleteExercise', { defaultValue: 'Delete exercise' })}
                  aria-label={t('exercises:deleteExerciseAria', { name: loc.name, defaultValue: `Delete ${loc.name}` })}
                >
                  <DeleteIcon size={18} className="sm:!w-5 sm:!h-5" />
                </button>
              )}

              {/* Share Button - Only for user-created */}
              {isUserCreated && (
                <ShareButton
                  exerciseId={exercise.id}
                  exerciseName={loc.name}
                  ownerId={exercise.owner_id}
                  className="flex-shrink-0 text-text-700 dark:text-text-200 hover:text-green-600 dark:hover:text-green-400 transition-colors p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                  iconSize={18}
                  iconClassName="sm:!w-5 sm:!h-5"
                />
              )}

              {/* Favorite Button - Always visible */}
              <button
                onClick={() => onToggleFavorite(exercise.id)}
                className="flex-shrink-0 text-lg sm:text-xl hover:scale-110 transition-transform p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center text-yellow-500 hover:text-yellow-600"
                title={exercise.is_favorite ? t('exercises:removeFromFavorites') : t('exercises:addToFavorites')}
                aria-label={exercise.is_favorite ? t('home.removeFromFavoritesAria', { name: loc.name }) : t('exercises:addToFavoritesAria', { name: loc.name })}
              >
                {exercise.is_favorite ? <StarFilledIcon size={18} className="sm:!w-5 sm:!h-5" /> : <StarIcon size={18} className="sm:!w-5 sm:!h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Exercise Name - Card click handles navigation */}
        <div className="mb-2">
          <span
            className="block text-left w-full text-sm sm:text-base font-semibold text-text-900 dark:text-text-50 leading-tight line-clamp-2 h-8 exercise-hover-link transition-colors"
            aria-label={t('exercises:viewDetailsAria', { name: loc.name, defaultValue: `View details for ${loc.name}` })}
          >
            {loc.name}
          </span>
        </div>
        {/* Base tags preview - Fixed 2 lines with overflow indicator */}
        {Array.isArray((exercise as Exercise & { base_tags?: string[] }).base_tags) && (exercise as Exercise & { base_tags?: string[] }).base_tags!.length > 0 ? (
          <div className="mb-2 h-[3rem] overflow-hidden relative" aria-label={t('exercises:baseTagsPreview', { defaultValue: 'Base tags' })}>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const baseTags = (exercise as Exercise & { base_tags?: string[] }).base_tags!;
                const MAX_VISIBLE_TAGS = 6;
                const visibleTags = baseTags.slice(0, MAX_VISIBLE_TAGS);
                const hiddenCount = baseTags.length - MAX_VISIBLE_TAGS;
                
                return (
                  <>
                    {visibleTags.map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium bg-surface-100 dark:bg-surface-700 text-text-700 dark:text-text-200 rounded whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                    {hiddenCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-surface-200 dark:bg-surface-600 text-text-700 dark:text-text-200 rounded whitespace-nowrap">
                        +{hiddenCount}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="mb-2 h-[3rem]" aria-hidden="true" />
        )}

        {/* Video/Image Area - Lazy loaded when visible */}
        <div className="mb-2 pointer-events-auto">
          {isIntersecting ? (
            <VideoThumbnail
              exercise={exercise}
              onVideoLoad={() => {}}
              onVideoError={() => {}}
              className="w-full aspect-square"
            />
          ) : (
            // Lightweight placeholder while off-screen
            <div className="w-full aspect-square bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />
          )}
        </div>

        {/* Start Timer Button - Full Width */}
        <button
          onClick={() => onStartTimer(exercise)}
          className="w-full px-3 py-2 btn-primary text-sm font-medium rounded-lg transition-colors min-h-[36px] flex items-center justify-center gap-1.5 pointer-events-auto"
          data-testid="start-exercise-timer"
        >
          <PlayIcon size={16} />
          {t('home.startTimer')}
        </button>
      </div>
    </div>
  );
};

export default ExercisePage; 