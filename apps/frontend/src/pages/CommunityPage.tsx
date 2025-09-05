import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Exercise, Workout } from '../types';
import { ExerciseCategory } from '../types';
import { supabase } from '../config/supabase';
import { favoritesService } from '../services/favoritesService';
import { communityCacheService } from '../services/communityCache';
import { FeatureGuard } from '../components/FeatureGuard';
import { SearchIcon, FilterIcon, StarIcon } from '../components/icons/NavigationIcons';

interface CommunityPageProps {}

interface CommunityExercise extends Exercise {
  creator_name?: string;
  is_favorited?: boolean;
}

interface CommunityWorkout extends Workout {
  creator_name?: string;
  is_favorited?: boolean;
}

interface SearchFilters {
  query: string;
  category: ExerciseCategory | 'all';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  contentType: 'exercises' | 'workouts' | 'all';
  sortBy: 'recent' | 'popular' | 'rating' | 'alphabetical';
}

const CommunityPage: React.FC<CommunityPageProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<CommunityExercise[]>([]);
  const [workouts, setWorkouts] = useState<CommunityWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    difficulty: 'all',
    contentType: 'all',
    sortBy: 'recent'
  });

  // Load community content
  const loadCommunityContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      // Generate cache key for this query
      const exerciseQueryKey = communityCacheService.generateQueryKey({
        type: 'exercises',
        sortBy: 'recent',
        limit: 50
      });
      
      const workoutQueryKey = communityCacheService.generateQueryKey({
        type: 'workouts', 
        sortBy: 'recent',
        limit: 50
      });

      // Try to get from cache first
      let exerciseData = communityCacheService.getCachedExerciseList(exerciseQueryKey);
      let workoutData = communityCacheService.getCachedWorkoutList(workoutQueryKey);

      // If not in cache, fetch from server
      if (!exerciseData) {
        const { data: serverExerciseData, error: exerciseError } = await supabase
          .from('exercises')
          .select(`
            *,
            profiles!owner_id(display_name)
          `)
          .eq('is_public', true)
          .eq('deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (exerciseError) throw exerciseError;
        // Transform server data to match Exercise type
        exerciseData = (serverExerciseData || []).map((exercise: any) => ({
          ...exercise,
          description: exercise.description || undefined,
          tags: exercise.tags || [],
          muscle_groups: exercise.muscle_groups || [],
          equipment_needed: exercise.equipment_needed || [],
          difficulty_level: exercise.difficulty_level || 'beginner'
        })) as Exercise[];
        
        // Cache the results
        communityCacheService.cacheExerciseList(exerciseQueryKey, exerciseData);
      }

      if (!workoutData) {
        const { data: serverWorkoutData, error: workoutError } = await supabase
          .from('workouts')
          .select(`
            *,
            profiles!owner_id(display_name)
          `)
          .eq('is_public', true)
          .eq('deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (workoutError) throw workoutError;
        // Transform server data to match Workout type
        workoutData = (serverWorkoutData || []).map((workout: any) => ({
          ...workout,
          description: workout.description || undefined,
          scheduled_days: workout.scheduled_days || [],
          is_active: workout.is_active ?? true,
          exercises: Array.isArray(workout.exercises) ? workout.exercises : []
        })) as Workout[];
        
        // Cache the results
        communityCacheService.cacheWorkoutList(workoutQueryKey, workoutData);
      }

      // Get all item IDs to check favorites
      const exerciseIds = exerciseData?.map(ex => ex.id) || [];
      const workoutIds = workoutData?.map(w => w.id) || [];
      const allItemIds = [...exerciseIds, ...workoutIds];
      
      // Check favorites status
      const favorites = await favoritesService.checkFavorites(allItemIds);

      // Process exercises
      const processedExercises = (exerciseData || []).map(exercise => ({
        ...exercise,
        creator_name: (exercise as any).profiles?.display_name || 'Anonymous',
        is_favorited: favorites[exercise.id] || false
      }));

      // Process workouts
      const processedWorkouts = (workoutData || []).map(workout => ({
        ...workout,
        creator_name: (workout as any).profiles?.display_name || 'Anonymous',
        is_favorited: favorites[workout.id] || false
      }));

      setExercises(processedExercises);
      setWorkouts(processedWorkouts);
    } catch (err) {
      console.error('Error loading community content:', err);
      setError(t('community.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityContent();
  }, []);

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filteredExercises = exercises;
    let filteredWorkouts = workouts;

    // Apply search query
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filteredExercises = exercises.filter(ex => 
        ex.name.toLowerCase().includes(query) ||
        ex.description?.toLowerCase().includes(query) ||
        ex.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      filteredWorkouts = workouts.filter(w => 
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query) ||
        w.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filteredExercises = filteredExercises.filter(ex => ex.category === filters.category);
    }

    // Apply difficulty filter
    if (filters.difficulty !== 'all') {
      filteredExercises = filteredExercises.filter(ex => ex.difficulty_level === filters.difficulty);
      filteredWorkouts = filteredWorkouts.filter(w => w.difficulty_level === filters.difficulty);
    }

    // Sort content
    const sortFunction = (a: CommunityExercise | CommunityWorkout, b: CommunityExercise | CommunityWorkout) => {
      switch (filters.sortBy) {
        case 'popular':
          return (b.copy_count || 0) - (a.copy_count || 0);
        case 'rating':
          return (b.rating_average || 0) - (a.rating_average || 0);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    };

    filteredExercises.sort(sortFunction);
    filteredWorkouts.sort(sortFunction);

    // Return based on content type filter
    if (filters.contentType === 'exercises') return { exercises: filteredExercises, workouts: [] };
    if (filters.contentType === 'workouts') return { exercises: [], workouts: filteredWorkouts };
    return { exercises: filteredExercises, workouts: filteredWorkouts };
  }, [exercises, workouts, filters]);

  const handleToggleFavorite = async (itemId: string, itemType: 'exercise' | 'workout') => {
    try {
      const newStatus = await favoritesService.toggleFavorite(
        itemId, 
        itemType, 
        itemType === 'exercise' ? 'user_created' : 'user_created'
      );

      // Update local state
      if (itemType === 'exercise') {
        setExercises(prev => prev.map(ex => 
          ex.id === itemId ? { ...ex, is_favorited: newStatus } : ex
        ));
      } else {
        setWorkouts(prev => prev.map(w => 
          w.id === itemId ? { ...w, is_favorited: newStatus } : w
        ));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleCopyExercise = async (exerciseId: string) => {
    try {
      if (!supabase) return;
      
      const response = await supabase.functions.invoke('copy-exercise', {
        body: { exercise_id: exerciseId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Invalidate cache since copy count may have changed
      communityCacheService.invalidateExercise(exerciseId);
      
      // Show success message or redirect to copied exercise
      alert(t('community.exerciseCopied'));
    } catch (err) {
      console.error('Error copying exercise:', err);
      alert(t('community.copyError'));
    }
  };

  const renderStars = (rating: number | undefined, count: number | undefined) => {
    if (!rating || !count) return null;
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`h-4 w-4 ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          ({count})
        </span>
      </div>
    );
  };

  const renderExerciseCard = (exercise: CommunityExercise) => (
    <div key={exercise.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div 
        className="flex justify-between items-start mb-4"
        onClick={() => navigate(`/exercises/${exercise.id}`)}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {exercise.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('community.createdBy')} {exercise.creator_name}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(exercise.id, 'exercise');
          }}
          className={`p-2 rounded-full ${
            exercise.is_favorited 
              ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          <StarIcon className="h-5 w-5" />
        </button>
      </div>

      {exercise.description && (
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {exercise.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
          {t(`exercises.categories.${exercise.category}`)}
        </span>
        {exercise.difficulty_level && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
            {t(`exercises.difficulty.${exercise.difficulty_level}`)}
          </span>
        )}
        {exercise.exercise_type && (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded">
            {t(`exercises.types.${exercise.exercise_type}`)}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="space-y-1">
          {renderStars(exercise.rating_average, exercise.rating_count)}
          {exercise.copy_count && exercise.copy_count > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {exercise.copy_count} {t('community.copies')}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyExercise(exercise.id);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {t('community.copyExercise')}
        </button>
      </div>
    </div>
  );

  const renderWorkoutCard = (workout: CommunityWorkout) => (
    <div key={workout.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {workout.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('community.createdBy')} {workout.creator_name}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(workout.id, 'workout');
          }}
          className={`p-2 rounded-full ${
            workout.is_favorited 
              ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          <StarIcon className="h-5 w-5" />
        </button>
      </div>

      {workout.description && (
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {workout.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {workout.difficulty_level && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
            {t(`exercises.difficulty.${workout.difficulty_level}`)}
          </span>
        )}
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded">
          {workout.exercises.length} {t('community.exercises')}
        </span>
        {workout.estimated_duration && (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-xs rounded">
            {Math.round(workout.estimated_duration / 60)}min
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="space-y-1">
          {renderStars(workout.rating_average, workout.rating_count)}
          {workout.copy_count && workout.copy_count > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {workout.copy_count} {t('community.copies')}
            </p>
          )}
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {t('community.viewWorkout')}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <FeatureGuard feature="canCreateExercises">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('community.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('community.description')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('community.searchPlaceholder')}
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FilterIcon className="h-5 w-5" />
              {t('community.filters')}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.contentType')}
                </label>
                <select
                  value={filters.contentType}
                  onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value as SearchFilters['contentType'] }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('community.allContent')}</option>
                  <option value="exercises">{t('community.exercisesOnly')}</option>
                  <option value="workouts">{t('community.workoutsOnly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.category')}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as SearchFilters['category'] }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('community.allCategories')}</option>
                  <option value="core">{t('exercises.categories.core')}</option>
                  <option value="strength">{t('exercises.categories.strength')}</option>
                  <option value="cardio">{t('exercises.categories.cardio')}</option>
                  <option value="flexibility">{t('exercises.categories.flexibility')}</option>
                  <option value="balance">{t('exercises.categories.balance')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.difficulty')}
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as SearchFilters['difficulty'] }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('community.allDifficulties')}</option>
                  <option value="beginner">{t('exercises.difficulty.beginner')}</option>
                  <option value="intermediate">{t('exercises.difficulty.intermediate')}</option>
                  <option value="advanced">{t('exercises.difficulty.advanced')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('community.sortBy')}
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="recent">{t('community.sortRecent')}</option>
                  <option value="popular">{t('community.sortPopular')}</option>
                  <option value="rating">{t('community.sortRating')}</option>
                  <option value="alphabetical">{t('community.sortAlphabetical')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="space-y-8">
          {filteredContent.exercises.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('community.exercises')} ({filteredContent.exercises.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.exercises.map(renderExerciseCard)}
              </div>
            </div>
          )}

          {filteredContent.workouts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('community.workouts')} ({filteredContent.workouts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.workouts.map(renderWorkoutCard)}
              </div>
            </div>
          )}

          {filteredContent.exercises.length === 0 && filteredContent.workouts.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('community.noResults')}
              </p>
              <p className="text-gray-500 dark:text-gray-500 mt-2">
                {t('community.tryDifferentSearch')}
              </p>
            </div>
          )}
        </div>
      </div>
    </FeatureGuard>
  );
};

export default CommunityPage;