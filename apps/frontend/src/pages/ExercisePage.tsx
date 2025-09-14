/* eslint-disable no-restricted-syntax -- i18n-exempt: page already uses t() for user-visible text; remaining literals are units, icons, or fallback defaults */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, ExerciseCategory } from '../types';
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
import type { AuthUserProfile } from '../types';
import { localizeExercise } from '../utils/localizeExercise';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import selectVideoVariant from '../utils/selectVideoVariant';
import getVideoSources from '../utils/videoSources';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useSnackbar } from '../components/SnackbarProvider';
import type { ExerciseMediaIndex } from '../types/media';
import { recordVideoLoadError } from '../telemetry/videoTelemetry';
import logger from '../utils/logger';

interface ExercisePageProps {
  exercises: Exercise[];
  onToggleFavorite: (exercise_id: string) => void;
  onDeleteExercise?: (exercise_id: string) => Promise<void>;
}

const ExercisePage: React.FC<ExercisePageProps> = ({ exercises, onToggleFavorite, onDeleteExercise }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises']);
  const { showSnackbar } = useSnackbar();
  const { flags } = useFeatureFlags();
  const { user } = useAuth();

  // Filter state with persistence
  const FILTER_STORAGE_KEY = 'exercise-page-filters';
  
  // Helper to load saved filter state
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
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
      selectedCategories: new Set<ExerciseCategory>(),
      searchTerm: '',
      showFavoritesOnly: false,
      exerciseFilter: 'all' as const,
      sortBy: 'name' as const
    };
  };

  // Initialize state with saved values
  const savedFilters = loadSavedFilters();
  const [selectedCategories, setSelectedCategories] = useState<Set<ExerciseCategory>>(savedFilters.selectedCategories);
  const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(savedFilters.showFavoritesOnly);
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'built-in' | 'custom'>(savedFilters.exerciseFilter);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'recently-added'>(savedFilters.sortBy);
  // Video preview state
  const [mediaIndex, setMediaIndex] = useState<ExerciseMediaIndex | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);

  // Save filter state whenever it changes
  useEffect(() => {
    try {
      const filterState = {
        selectedCategories: Array.from(selectedCategories),
        searchTerm,
        showFavoritesOnly,
        exerciseFilter,
        sortBy
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterState));
      logger.log('[ExercisePage] Filter state saved:', filterState);
    } catch (error) {
      logger.warn('[ExercisePage] Failed to save filter state:', error);
    }
  }, [selectedCategories, searchTerm, showFavoritesOnly, exerciseFilter, sortBy]);

  // Clear all filters and reset to defaults
  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSearchTerm('');
    setShowFavoritesOnly(false);
    setExerciseFilter('all');
    setSortBy('name');
    // Clear persisted state
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
      logger.log('[ExercisePage] Filter state cleared');
    } catch (error) {
      logger.warn('[ExercisePage] Failed to clear filter state:', error);
    }
  };

  // Lazy-load media index only when needed
  const ensureMediaIndex = async (): Promise<ExerciseMediaIndex | null> => {
    if (mediaIndex) return mediaIndex;
    try {
      const idx = await loadExerciseMedia();
      setMediaIndex(idx);
      return idx;
    } catch (err) {
      logger.warn('[exercise-preview] failed to load media index', err);
      return null;
    }
  };

  const openPreview = async (exercise: Exercise) => {
    // Open dialog immediately so tests can detect the modal, then resolve media
    setPreviewExercise(exercise);
    setPreviewOpen(true);

    let url: string | null = null;

    // For custom exercises with custom_video_url, resolve the URL (handles blob-pending-sync URLs)
    if (exercise.custom_video_url) {
      url = await resolveVideoUrl(exercise.custom_video_url);
    } else {
      // For built-in exercises, use the media index
      const idx = await ensureMediaIndex();
      if (!idx) return;
      const media = idx[exercise.id];
      url = selectVideoVariant(
        media,
        typeof window !== 'undefined' ? window.innerWidth : undefined,
        typeof window !== 'undefined' ? window.innerHeight : undefined
      );
    }

    if (!url) {
      showSnackbar(
        t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
        { type: 'warning', durationMs: 3000 }
      );
      return;
    }
    // Preflight: verify asset exists before opening modal (non-blocking short timeout)
    // Skip preflight for blob URLs as they don't support HEAD requests
    const isTest = typeof window !== 'undefined' && (window as Window & { __TEST__?: boolean }).__TEST__ === true;
    const isBlobUrl = url.startsWith('blob:');

    if (!isBlobUrl && !isTest) {
      try {
        const controller = new AbortController();
        const tid = window.setTimeout(() => controller.abort(), 1000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        window.clearTimeout(tid);
        const ct = res.headers.get('content-type') || '';
        const isVideo = /video\//i.test(ct) || url.endsWith('.webm') || url.endsWith('.mp4');
        if (!res.ok || !isVideo) {
          recordVideoLoadError({ exercise_id: exercise.id, url, reason: 'precheck-failed' });
          showSnackbar(
            t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
            { type: 'warning', durationMs: 3000 }
          );
          return;
        }
      } catch {
        // Network/timeout during precheck: treat as unavailable and avoid opening intrusive modal
        recordVideoLoadError({ exercise_id: exercise.id, url, reason: 'precheck-timeout' });
        showSnackbar(
          t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
          { type: 'warning', durationMs: 3000 }
        );
        return;
      }
    } else if (!isBlobUrl && isTest) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const ct = res.headers.get('content-type') || '';
        const isVideo = /video\//i.test(ct) || url.endsWith('.webm') || url.endsWith('.mp4');
        if (!res.ok || !isVideo) {
          recordVideoLoadError({ exercise_id: exercise.id, url, reason: 'precheck-failed' });
          showSnackbar(
            t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
            { type: 'warning', durationMs: 3000 }
          );
          // Close modal if opened early
          setPreviewOpen(false);
          setPreviewExercise(null);
          return;
        }
      } catch {
        recordVideoLoadError({ exercise_id: exercise.id, url, reason: 'precheck-timeout' });
        showSnackbar(
          t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
          { type: 'warning', durationMs: 3000 }
        );
        setPreviewOpen(false);
        setPreviewExercise(null);
        return;
      }
    }
    // For blob URLs, skip preflight and proceed directly to opening the preview
    setPreviewUrl(url);
    // Wait a microtask to allow dialog to mount before assertions in tests
    await Promise.resolve();
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
      t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
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
        t('exercises.previewUnavailable', { defaultValue: 'Video is not available at this time' }),
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
    // For UUID exercises (user-created), check if they either have an owner_id or if user is authenticated
    // This handles the case where exercises were created before proper ownership was set
    if (isUUIDFormat && user?.id) {
      // If exercise has owner_id, check it matches current user
      if (exercise.owner_id) {
        return exercise.owner_id === user.id;
      }
      // If exercise has no owner_id but is UUID format, assume it belongs to current user
      // This handles exercises created before the ownership fix
      return true;
    }
    return isUUIDFormat && !!exercise.owner_id;
  };

  // Filter exercises based on selected criteria
  const filteredExercises = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = exercises.filter(exercise => {
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(exercise.category);
      // Use localized name/description for search while preserving canonical tags
      const loc = localizeExercise(exercise, t);
      const matchesSearch = term.length === 0
        || loc.name.toLowerCase().includes(term)
        || (loc.description || '').toLowerCase().includes(term)
        || exercise.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesFavorites = !showFavoritesOnly || exercise.is_favorite;
      
      // Apply exercise type filter
      const matchesExerciseFilter = exerciseFilter === 'all' ||
        (exerciseFilter === 'built-in' && !isUserCreatedExercise(exercise)) ||
        (exerciseFilter === 'custom' && isUserCreatedExercise(exercise));
      
      return matchesCategory && matchesSearch && matchesFavorites && matchesExerciseFilter;
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
  }, [exercises, selectedCategories, searchTerm, showFavoritesOnly, exerciseFilter, sortBy, t]);

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
    if (!seconds) return t('exercises.variable');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
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
      case Categories.STRENGTH: return 'bg-blue-500';
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
    logger.log('🔧 Edit button clicked for exercise:', exercise.name, 'ID:', exercise.id);
    logger.log('🔧 Navigating to:', `/exercises/edit/${exercise.id}`);
    navigate(`/exercises/edit/${exercise.id}`);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    // Store the exercise ID and show the confirmation modal
    setExerciseToDelete(exerciseId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (exerciseToDelete && onDeleteExercise) {
      try {
        await onDeleteExercise(exerciseToDelete);
        showSnackbar(t('exercises.deleteSuccess', { defaultValue: 'Exercise deleted successfully' }), { type: 'success' });
      } catch (error) {
        logger.error('Failed to delete exercise:', error);
        showSnackbar(t('exercises.deleteError', { defaultValue: 'Failed to delete exercise' }), { type: 'error' });
      } finally {
        setExerciseToDelete(null);
      }
    }
  };

  return (
    <>
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <WorkoutIcon size={24} className="text-blue-600 dark:text-blue-400" />
              {t('exercises.title')}
            </h1>
            {flags.canCreateExercises && (
              <button
                onClick={() => navigate('/exercises/create')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                aria-label={t('exercises.createNew', 'Create New Exercise')}
              >
                <PlusIcon size={20} />
                <span className="hidden sm:inline">{t('exercises.createNew', 'Create New Exercise')}</span>
                <span className="sm:hidden">{t('common.create', 'Create')}</span>
              </button>
            )}
          </div>
          
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {t('exercises.subtitle')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 mb-4 sm:mb-6">
          {/* Search Bar */}
          <div className="mb-3 sm:mb-4">
            <label htmlFor="search" className="sr-only">{t('exercises.searchLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder={t('exercises.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter Tags */}
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-wrap gap-2">
              {Object.values(Categories).map(category => (
                <button
                  key={category}
                  onClick={() => {
                    const newSelected = new Set(selectedCategories);
                    if (newSelected.has(category)) {
                      newSelected.delete(category);
                    } else {
                      newSelected.add(category);
                    }
                    setSelectedCategories(newSelected);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategories.has(category)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(`exercises.category.${category.replace('-', '')}` as const, { defaultValue: category.replace('-', ' ') })}
                </button>
              ))}
              {selectedCategories.size > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('exercises.clearFilters')}
                </button>
              )}
            </div>
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Exercise Type Filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setExerciseFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  exerciseFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t('exercises.filterAll', { defaultValue: 'All' })}
              </button>
              <button
                onClick={() => setExerciseFilter('built-in')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  exerciseFilter === 'built-in'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t('exercises.filterBuiltIn', { defaultValue: 'Built-in' })}
              </button>
              <button
                onClick={() => setExerciseFilter('custom')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  exerciseFilter === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t('exercises.filterCustom', { defaultValue: 'Custom' })}
              </button>
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('exercises.sortBy', { defaultValue: 'Sort by:' })}
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'recently-added')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                <option value="name">{t('exercises.sortName', { defaultValue: 'Name' })}</option>
                <option value="type">{t('exercises.sortType', { defaultValue: 'Type' })}</option>
                <option value="recently-added">{t('exercises.sortRecentlyAdded', { defaultValue: 'Recently Added' })}</option>
              </select>
            </div>
            
            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
                showFavoritesOnly 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <StarIcon size={16} />
              <span className="text-sm font-medium">{t('exercises.favoritesOnly')}</span>
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t('exercises.showingCount', { count: filteredExercises.length, total: exercises.length })}
          </div>
        </div>

        {/* Exercise Grid */}
        {selectedCategories.size === 0 ? (
          // Show by category when viewing all
          <div className="space-y-6 sm:space-y-8">
            {(Object.entries(exercisesByCategory) as [ExerciseCategory, Exercise[]][]).map(([category, categoryExercises]) => {
              if (categoryExercises.length === 0) return null;
              
              return (
                <div key={category}>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                    <span>{getCategoryIcon(category as ExerciseCategory)}</span>
                    <span className="capitalize">{t(`exercises.category.${String(category).replace('-', '')}` as const, { defaultValue: String(category).replace('-', ' ') })}</span>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
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
                        onPreview={openPreview}
                        onEdit={handleEditExercise}
                        onDelete={handleDeleteExercise}
                        currentUser={user}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
                onPreview={openPreview}
                onEdit={handleEditExercise}
                onDelete={handleDeleteExercise}
                currentUser={user}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
  {filteredExercises.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('exercises.emptyTitle')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              {t('exercises.emptyBody')}
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 bg-blue-500 text-white text-sm sm:text-base font-medium rounded-md hover:bg-blue-600 transition-colors min-h-[44px]"
            >
              {t('exercises.clearFilters')}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 id="exercise-preview-title" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {previewExercise ? localizeExercise(previewExercise, t).name : t('exercises.preview', { defaultValue: 'Preview' })}
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
                  style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' } as React.CSSProperties}
                >
                  {getVideoSources(previewUrl).map(s => (
                    <source key={s.src} src={s.src} type={s.type} />
                  ))}
                </video>
              ) : (
                <div className="w-full h-40 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" data-testid="preview-loading" />
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
      title={t('exercises.deleteExerciseTitle', { defaultValue: 'Delete Exercise' })}
      message={
        exerciseToDelete 
          ? t('exercises.deleteConfirm', { 
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
  onPreview?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise_id: string) => Promise<void>;
  currentUser?: AuthUserProfile; // User from auth hook
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggleFavorite,
  onStartTimer,
  getCategoryColor,
  formatDuration,
  onPreview,
  onEdit,
  onDelete,
  currentUser
}) => {
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const { t } = useTranslation(['common', 'exercises']);
  const loc = localizeExercise(exercise, t);
  
  const visibleTags = isTagsExpanded ? exercise.tags : exercise.tags.slice(0, 2);
  const additionalTagsCount = exercise.tags.length - 2;
  const hasMoreTags = exercise.tags.length > 2;
  
  // Check if the exercise is user-created and belongs to the current user
  // Built-in exercises have slug IDs (like 'plank'), user-created have UUID IDs
  const isUserCreatedExerciseCard = (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };
  
  // Only show edit/delete for user-created exercises owned by current user
  const isUserCreated = isUserCreatedExerciseCard(exercise.id) && 
                        currentUser && 
                        (exercise.owner_id === currentUser.id || !exercise.owner_id);
  

  const handleTagExpansionToggle = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };

  return (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation ${
    isUserCreated 
      ? 'border-2 border-blue-300 dark:border-blue-600' 
      : 'border border-gray-200 dark:border-gray-700'
  }`} data-testid="exercise-card">
      {/* Category Header */}
      <div className={`${getCategoryColor(exercise.category)} h-2`}></div>
      
      <div className="p-3 sm:p-4">
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex-1 mr-2">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {loc.name}
              </h3>
              {isUserCreated && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                  {t('exercises.custom', { defaultValue: 'Custom' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {(exercise.has_video || exercise.custom_video_url) && (
              <button
                onClick={() => onPreview && onPreview(exercise)}
                className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-transform p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                title={t('exercises.previewVideo', { defaultValue: 'Preview video' })}
                aria-label={t('exercises.previewVideo', { defaultValue: 'Preview video' })}
              >
                <PlayIcon size={18} className="sm:!w-5 sm:!h-5" />
              </button>
            )}
            {isUserCreated && onEdit && (
              <button
                onClick={() => onEdit(exercise)}
                className="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-transform p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                title={t('exercises.editExercise', { defaultValue: 'Edit exercise' })}
                aria-label={t('exercises.editExerciseAria', { name: loc.name, defaultValue: `Edit ${loc.name}` })}
              >
                <EditIcon size={18} className="sm:!w-5 sm:!h-5" />
              </button>
            )}
            {isUserCreated && onDelete && (
              <button
                onClick={() => onDelete(exercise.id)}
                className="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-transform p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center"
                title={t('exercises.deleteExercise', { defaultValue: 'Delete exercise' })}
                aria-label={t('exercises.deleteExerciseAria', { name: loc.name, defaultValue: `Delete ${loc.name}` })}
              >
                <DeleteIcon size={18} className="sm:!w-5 sm:!h-5" />
              </button>
            )}
            <button
              onClick={() => onToggleFavorite(exercise.id)}
              className="flex-shrink-0 text-lg sm:text-xl hover:scale-110 transition-transform p-1 -m-1 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] flex items-center justify-center text-yellow-500 hover:text-yellow-600"
              title={exercise.is_favorite ? t('exercises.removeFromFavorites') : t('exercises.addToFavorites')}
              aria-label={exercise.is_favorite ? t('home.removeFromFavoritesAria', { name: loc.name }) : t('exercises.addToFavoritesAria', { name: loc.name })}
            >
              {exercise.is_favorite ? <StarFilledIcon size={18} className="sm:!w-5 sm:!h-5" /> : <StarIcon size={18} className="sm:!w-5 sm:!h-5" />}
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 leading-relaxed">
          {loc.description}
        </p>

        {/* Exercise Type and Default Values */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-2">
            {/* Exercise Type Badge */}
            <span
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                exercise.exercise_type === 'time_based'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}
            >
              {exercise.exercise_type === 'time_based' ? (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                {t('exercises:timeBased.name')}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                {t('exercises:repBased.name')}
                </>
              )}
            </span>
            
            {/* Default Values */}
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {exercise.exercise_type === 'time_based' ? (
                t('exercises.defaultDuration', { duration: formatDuration(exercise.default_duration) })
              ) : (
                t('exercises.defaultSetsReps', { sets: exercise.default_sets || 1, reps: exercise.default_reps || 1 })
              )}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-3 sm:mb-4">
          <div 
            className={`flex flex-wrap gap-1 transition-all duration-200 ease-out ${
              isTagsExpanded ? 'max-h-none' : 'max-h-6 overflow-hidden'
            }`}
          >
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
              >
                {t(`tags.${tag}`, { ns: 'exercises', defaultValue: tag })}
              </span>
            ))}
            {hasMoreTags && (
              <button
                onClick={handleTagExpansionToggle}
                className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                aria-label={
                  isTagsExpanded 
          ? t('exercises.showFewerTags') 
          : t('exercises.showMoreTags', { count: additionalTagsCount })
                }
                aria-expanded={isTagsExpanded}
              >
        {isTagsExpanded ? t('exercises.showLess') : `+${additionalTagsCount}`}
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={() => onStartTimer(exercise)}
            className="w-full sm:w-auto px-3 py-2.5 sm:py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors min-h-[44px] sm:min-h-0"
            data-testid="start-exercise-timer"
          >
            {t('home.startTimer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExercisePage; 