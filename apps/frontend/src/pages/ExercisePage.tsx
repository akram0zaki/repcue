/* eslint-disable no-restricted-syntax -- i18n-exempt: page already uses t() for user-visible text; remaining literals are units, icons, or fallback defaults */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, ExerciseCategory, AppSettings } from '../types';
import { ExerciseCategory as Categories } from '../types';
import { Routes as AppRoutes } from '../types';
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
import { ExercisePlaceholder } from '../components/ExercisePlaceholder';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useSnackbar } from '../components/SnackbarProvider';
import { recordVideoLoadError } from '../telemetry/videoTelemetry';
import logger from '../utils/logger';
import { ShareButton } from '../components/ShareButton';
import CatalogSelector from '../components/CatalogSelector';
import CategoryFilter from '../components/CategoryFilter';
import { getDefaultCatalog, EXERCISE_CATALOGS } from '../data/catalogs';

interface ExercisePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exercise_id: string) => void;
  onDeleteExercise?: (exercise_id: string) => Promise<void>;
}

const ExercisePage: React.FC<ExercisePageProps> = ({ exercises, appSettings, onToggleFavorite, onDeleteExercise }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises', 'exerciseDetails', 'catalogs']);
  const { showSnackbar } = useSnackbar();
  const { flags } = useFeatureFlags();
  const { user } = useAuth();
  const { isSharedExercise } = useSharedExercises();

  // Filter state with persistence
  const FILTER_STORAGE_KEY = 'exercise-page-filters';
  
  // Helper to load saved filter state
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
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
      logger.warn('[ExercisePage] Failed to load saved filter state:', error);
    }
    return {
      selectedCatalogId: getDefaultCatalog().id,
      selectedCategories: new Set<ExerciseCategory>(),
      searchTerm: '',
      showFavoritesOnly: false,
      exerciseFilter: 'all' as const,
      sortBy: 'name' as const
    };
  };

  // Initialize state with saved values
  const savedFilters = loadSavedFilters();
  const [selectedCatalogId, setSelectedCatalogId] = useState(savedFilters.selectedCatalogId);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExerciseCategory>>(savedFilters.selectedCategories);
  const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(savedFilters.showFavoritesOnly);
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'built-in' | 'custom' | 'shared'>(savedFilters.exerciseFilter);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'recently-added'>(savedFilters.sortBy);
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


  // Save filter state whenever it changes
  useEffect(() => {
    try {
      const filterState = {
        selectedCatalogId,
        selectedCategories: Array.from(selectedCategories),
        searchTerm,
        showFavoritesOnly,
        exerciseFilter,
        sortBy
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterState));
    } catch (error) {
      logger.warn('[ExercisePage] Failed to save filter state:', error);
    }
  }, [selectedCatalogId, selectedCategories, searchTerm, showFavoritesOnly, exerciseFilter, sortBy]);

  // Clear all filters and reset to defaults (except catalog)
  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSearchTerm('');
    setShowFavoritesOnly(false);
    setExerciseFilter('all');
    setSortBy('name');
    // Don't reset catalog - let user keep their catalog selection
  };

  // Category selector handlers
  const handleCategoryToggle = (category: ExerciseCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  // Handle catalog change with optional filter reset
  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    // Clear other filters when switching catalogs to start fresh
    setSelectedCategories(new Set());
    setSearchTerm('');
    setShowFavoritesOnly(false);
    setExerciseFilter('all');
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

  // Helper function to check if exercise is user-created
  const isUserCreatedExercise = (exercise: Exercise): boolean => {
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
        // This handles exercises created before the ownership fix or created offline
        return true;
      } else {
        // If user is not logged in, only show orphaned exercises (created offline)
        return exercise.owner_id === null;
      }
    }

    return false;
  };

  // Helper function to check if exercise is shared with current user
  const isSharedExerciseHelper = (exercise: Exercise): boolean => {
    if (!user?.id) return false;

    // Use the hook to check if exercise ID is in shared references
    return isSharedExercise(exercise.id);
  };

  // Filter exercises based on selected criteria
  const filteredExercises = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Debug: Log exercise catalog distribution (removed unused catalogCounts)


    const filtered = exercises.filter(exercise => {
      // Filter by catalog first
      const matchesCatalog = exercise.catalogId === selectedCatalogId;

      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(exercise.category);
      // Use localized name/description for search while preserving canonical tags
      const loc = localizeExercise(exercise, t);
      const matchesSearch = term.length === 0
        || loc.name.toLowerCase().includes(term)
        || (loc.description || '').toLowerCase().includes(term)
        || (exercise.tags || []).some(tag => tag.toLowerCase().includes(term));
      const matchesFavorites = !showFavoritesOnly || exercise.is_favorite;

      // Apply exercise type filter
      const isUserCreated = isUserCreatedExercise(exercise);
      const isShared = isSharedExerciseHelper(exercise);

      // Debug logging for the "Ya 7amada" exercise
      if (exercise.name === 'Ya 7amada') {
        logger.log(`[ExercisePage] Filtering "Ya 7amada":`, {
          exerciseId: exercise.id,
          exerciseFilter,
          isUserCreated,
          isShared,
          owner_id: exercise.owner_id,
          userId: user?.id
        });
      }

      const matchesExerciseFilter = exerciseFilter === 'all' ||
        (exerciseFilter === 'built-in' && !isUserCreated && !isShared) ||
        (exerciseFilter === 'custom' && isUserCreated) ||
        (exerciseFilter === 'shared' && isShared);

      return matchesCatalog && matchesCategory && matchesSearch && matchesFavorites && matchesExerciseFilter;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aLoc = localizeExercise(a, t);
      const bLoc = localizeExercise(b, t);
      
      switch (sortBy) {
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
  }, [exercises, selectedCatalogId, selectedCategories, searchTerm, showFavoritesOnly, exerciseFilter, sortBy, t]);

  // Group exercises by category for better organization
  const exercisesByCategory = useMemo(() => {
    const grouped: Record<ExerciseCategory, Exercise[]> = {
      [Categories.CORE]: [],
      [Categories.STRENGTH]: [],
      [Categories.CARDIO]: [],
      [Categories.FLEXIBILITY]: [],
      [Categories.BALANCE]: [],
      [Categories.HAND_WARMUP]: []
    };

    filteredExercises.forEach(exercise => {
      grouped[exercise.category].push(exercise);
    });

    return grouped;
  }, [filteredExercises]);

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
      case Categories.STRENGTH: return 'bg-primary-500';
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
    <>
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-background-50 dark:bg-background-950">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-text-900 dark:text-text-50 flex items-center gap-2">
              <WorkoutIcon size={24} className="text-primary-600 dark:text-primary-400" />
              {t('common:exercises.title')}
            </h1>
            {flags.canCreateExercises && (
              <button
                onClick={() => navigate('/exercises/create')}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                aria-label={t('exercises:createNew', 'Create New Exercise')}
              >
                <PlusIcon size={20} />
                <span className="hidden sm:inline">{t('exercises:createNew', 'Create New Exercise')}</span>
                <span className="sm:hidden">{t('common.create', 'Create')}</span>
              </button>
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('common:exercises.subtitle')}
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
                    selectedCategories.size, // Count each selected category
                    searchTerm ? 1 : 0, // Count search if present
                    showFavoritesOnly ? 1 : 0, // Count favorites toggle if active
                    // Do NOT count exerciseFilter when it's 'all' (default state)
                    (exerciseFilter !== 'all') ? 1 : 0,
                    // Do NOT count sortBy when it's 'name' (default state)  
                    (sortBy !== 'name') ? 1 : 0
                  ].reduce((sum, count) => sum + count, 0);
                  
                  return activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary-500 text-white rounded-full">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-14 sm:pl-16 pr-10 sm:pr-12 py-2.5 sm:py-2 border border-surface-300 dark:border-surface-600 rounded-md text-sm sm:text-base bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
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

              {/* Category Filter Selector and Sort */}
              <div className="mb-2 sm:mb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <CategoryFilter
                    selectedCategories={selectedCategories}
                    onCategoryToggle={handleCategoryToggle}
                    onClearAll={handleClearCategories}
                    style="dropdown"
                    label={t('exercises:category', { defaultValue: 'Category' })}
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
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'recently-added')}
                      className="px-2.5 py-1.5 border border-surface-300 dark:border-surface-600 rounded-md text-sm bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[36px] rtl:text-right rtl:pr-8 rtl:pl-2.5"
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
                    onClick={() => setExerciseFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterAll', { defaultValue: 'All' })}
                  </button>
                  <button
                    onClick={() => setExerciseFilter('built-in')}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'built-in'
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterBuiltIn', { defaultValue: 'Built-in' })}
                  </button>
                  <button
                    onClick={() => setExerciseFilter('custom')}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'custom'
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterCustom', { defaultValue: 'Custom' })}
                  </button>
                  <button
                    onClick={() => setExerciseFilter('shared')}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      exerciseFilter === 'shared'
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-0 dark:bg-surface-800 filter-button-text border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {t('exercises:filterShared', { defaultValue: 'Shared with me' })}
                  </button>
                </div>

                {/* Favorites Toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
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
        {selectedCategories.size === 0 ? (
          // Show by category when viewing all
          appSettings.horizontal_exercise_layout ? (
            // Netflix-style horizontal category layout
            <div className="space-y-6 sm:space-y-8">
              {(Object.entries(exercisesByCategory) as [ExerciseCategory, Exercise[]][]).map(([category, categoryExercises]) => {
                if (categoryExercises.length === 0) return null;

                return (
                  <div key={category}>
                    <h2 className="text-lg sm:text-xl font-semibold text-text-900 dark:text-text-50 mb-3 sm:mb-4 flex items-center gap-2">
                      <span>{getCategoryIcon(category as ExerciseCategory)}</span>
                      <span className="capitalize">{t(`common:categories.${String(category)}` as const, { defaultValue: String(category).replace('-', ' ') })}</span>
                      <span className="text-sm font-normal text-text-500 dark:text-text-400">
                        ({categoryExercises.length})
                      </span>
                    </h2>
                    {/* Horizontal scrollable container with navigation */}
                    <div className="relative group -mx-3 sm:-mx-4">
                      {/* Left navigation button */}
                      {categoryExercises.length > 1 && (
                        <button
                          onClick={() => scrollCategory(category, 'left')}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
                          aria-label={t('a11y.scrollLeft', 'Scroll left')}
                        >
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Right navigation button */}
                      {categoryExercises.length > 1 && (
                        <button
                          onClick={() => scrollCategory(category, 'right')}
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
                          aria-label={t('a11y.scrollRight', 'Scroll right')}
                        >
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      <div
                        ref={(el) => {
                          categoryScrollRefs.current[category] = el;
                        }}
                        className="overflow-x-auto scrollbar-hide px-3 sm:px-4"
                      >
                        <div className="flex gap-3 sm:gap-4 pb-2 w-max">
                          {categoryExercises.map((exercise) => (
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
              {(Object.entries(exercisesByCategory) as [ExerciseCategory, Exercise[]][]).map(([category, categoryExercises]) => {
                if (categoryExercises.length === 0) return null;

                return (
                  <div key={category}>
                    <h2 className="text-lg sm:text-xl font-semibold text-text-900 dark:text-text-50 mb-3 sm:mb-4 flex items-center gap-2">
                      <span>{getCategoryIcon(category as ExerciseCategory)}</span>
                      <span className="capitalize">{t(`common:categories.${String(category)}` as const, { defaultValue: String(category).replace('-', ' ') })}</span>
                      <span className="text-sm font-normal text-text-500 dark:text-text-400">
                        ({categoryExercises.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {categoryExercises.map((exercise) => (
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
              />
            ))}
          </div>
        )}

        {/* Empty State */}
  {filteredExercises.length === 0 && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('common:exercises.emptyTitle')}
            </h3>
            <p className="text-sm sm:text-base text-text-600 dark:text-text-400 mb-4">
              {t('common:exercises.emptyBody')}
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 bg-primary-500 text-white text-sm sm:text-base font-medium rounded-md hover:bg-primary-600 transition-colors min-h-[44px]"
            >
              {t('common:exercises.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
    {/* Preview Modal */}
    {previewOpen && (
      <div className="fixed inset-0 z-[100]" aria-hidden={!previewOpen}>
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
                  className="w-full h-auto rounded-md bg-black"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={handleVideoError}
                  ref={videoRef}
                  className="w-full h-auto rounded-md bg-black gpu-accelerated"
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
      confirmText={t('common.delete', { defaultValue: 'Delete' })}
      cancelText={t('common.cancel')}
      variant="danger"
    />



    </>
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
  isSharedExercise
}) => {
  const { t } = useTranslation(['common', 'exercises', 'exerciseDetails']);
  const loc = localizeExercise(exercise, t);
  
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

  return (
    <div className={`bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation ${
      isUserCreated
        ? 'border-2 border-primary-300 dark:border-primary-600'
        : 'border border-surface-200 dark:border-surface-700'
    }`} data-testid="exercise-card">

      <div className="p-2 sm:p-3">
        {/* Top Row - Exercise Details (Left) and Action Buttons (Right) */}
        <div className="mb-1">
          <div className="flex items-center justify-between">
            {/* Left Side - Exercise Details and Tags */}
            <div className="flex items-center gap-2">
              {/* Exercise Details - Left-aligned */}
              <span className="text-sm font-medium text-text-800 dark:text-text-100">
                {formatSimplifiedDetails(exercise)}
              </span>
              {/* Custom/Shared Tags */}
              <div className="flex items-center gap-1">
                {isUserCreated && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-200 text-primary-800 dark:text-primary-900 rounded-full">
                    {t('exercises:custom', { defaultValue: 'Custom' })}
                  </span>
                )}
                {currentUser && isSharedExerciseCard && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                    {t('exercises:shared', { defaultValue: 'Shared' })}
                  </span>
                )}
              </div>
            </div>

            {/* Right Side - Action Buttons */}
            <div className="flex items-center gap-1">

              {/* Edit Button - Only for user-created */}
              {isUserCreated && onEdit && (
                <button
                  onClick={() => onEdit(exercise)}
                  className="flex-shrink-0 text-text-700 dark:text-text-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
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

        {/* Exercise Name - Clickable Link to Details */}
        <div className="mb-2">
          <button
            onClick={() => onNavigateToExercise(exercise.id)}
            className="text-left w-full text-sm sm:text-base font-semibold text-text-900 dark:text-text-50 leading-tight line-clamp-2 h-8 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            aria-label={t('exercises:viewDetailsAria', { name: loc.name, defaultValue: `View details for ${loc.name}` })}
          >
            {loc.name}
          </button>
        </div>

        {/* Video/Image Area */}
        <div className="mb-2">
          {(exercise.has_video || exercise.custom_video_url) ? (
            <VideoThumbnail
              exercise={exercise}
              onVideoLoad={() => {}}
              onVideoError={() => {}}
              className="w-full aspect-square"
            />
          ) : (
            <ExercisePlaceholder size="md" />
          )}
        </div>

        {/* Start Timer Button - Full Width */}
        <button
          onClick={() => onStartTimer(exercise)}
          className="w-full px-3 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors min-h-[36px] flex items-center justify-center gap-1.5"
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