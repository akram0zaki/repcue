import React, { useState, useMemo } from 'react';
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
  StarFilledIcon
} from '../components/icons/NavigationIcons';
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '../utils/localizeExercise';

interface ExercisePageProps {
  exercises: Exercise[];
  onToggleFavorite: (exerciseId: string) => void;
}

const ExercisePage: React.FC<ExercisePageProps> = ({ exercises, onToggleFavorite }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises']);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Filter exercises based on selected criteria
  const filteredExercises = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return exercises.filter(exercise => {
      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory;
      // Use localized name/description for search while preserving canonical tags
      const loc = localizeExercise(exercise, t);
      const matchesSearch = term.length === 0
        || loc.name.toLowerCase().includes(term)
        || (loc.description || '').toLowerCase().includes(term)
        || exercise.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesFavorites = !showFavoritesOnly || exercise.isFavorite;
      return matchesCategory && matchesSearch && matchesFavorites;
    });
  }, [exercises, selectedCategory, searchTerm, showFavoritesOnly, t]);

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
        selectedDuration: exercise.defaultDuration || 30
      }
    });
  };

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <WorkoutIcon size={24} className="text-blue-600 dark:text-blue-400" />
              {t('exercises.title')}
            </h1>
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

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ExerciseCategory | 'all')}
              className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('exercises.allCategories')}</option>
              <option value={Categories.CORE}>{t('exercises.category.core')}</option>
              <option value={Categories.STRENGTH}>{t('exercises.category.strength')}</option>
              <option value={Categories.CARDIO}>{t('exercises.category.cardio')}</option>
              <option value={Categories.FLEXIBILITY}>{t('exercises.category.flexibility')}</option>
              <option value={Categories.BALANCE}>{t('exercises.category.balance')}</option>
              <option value={Categories.HAND_WARMUP}>{t('exercises.category.handWarmup')}</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-md transition-colors min-h-[44px] ${
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
        {selectedCategory === 'all' ? (
          // Show by category when viewing all
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(exercisesByCategory).map(([category, categoryExercises]) => {
              if (categoryExercises.length === 0) return null;
              
              return (
                <div key={category}>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                    <span>{getCategoryIcon(category as ExerciseCategory)}</span>
                    <span className="capitalize">{category}</span>
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
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setShowFavoritesOnly(false);
              }}
              className="px-4 py-2.5 bg-blue-500 text-white text-sm sm:text-base font-medium rounded-md hover:bg-blue-600 transition-colors min-h-[44px]"
            >
              {t('exercises.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Exercise Card Component
interface ExerciseCardProps {
  exercise: Exercise;
  onToggleFavorite: (exerciseId: string) => void;
  onStartTimer: (exercise: Exercise) => void;
  getCategoryColor: (category: ExerciseCategory) => string;
  formatDuration: (seconds?: number) => string;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggleFavorite,
  onStartTimer,
  getCategoryColor,
  formatDuration
}) => {
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const { t } = useTranslation(['common', 'exercises']);
  const loc = localizeExercise(exercise, t);
  
  const visibleTags = isTagsExpanded ? exercise.tags : exercise.tags.slice(0, 2);
  const additionalTagsCount = exercise.tags.length - 2;
  const hasMoreTags = exercise.tags.length > 2;

  const handleTagExpansionToggle = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };

  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow touch-manipulation" data-testid="exercise-card">
      {/* Category Header */}
      <div className={`${getCategoryColor(exercise.category)} h-2`}></div>
      
      <div className="p-3 sm:p-4">
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight flex-1 mr-2">
            {loc.name}
          </h3>
          <button
            onClick={() => onToggleFavorite(exercise.id)}
            className="flex-shrink-0 text-lg sm:text-xl hover:scale-110 transition-transform p-1 -m-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-yellow-500 hover:text-yellow-600"
            title={exercise.isFavorite ? t('exercises.removeFromFavorites') : t('exercises.addToFavorites')}
            aria-label={exercise.isFavorite ? t('home.removeFromFavoritesAria', { name: loc.name }) : t('exercises.addToFavoritesAria', { name: loc.name })}
          >
            {exercise.isFavorite ? <StarFilledIcon size={20} /> : <StarIcon size={20} />}
          </button>
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
                exercise.exerciseType === 'time-based'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}
            >
              {exercise.exerciseType === 'time-based' ? (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                {t('exercises.timeBased')}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                {t('exercises.repBased')}
                </>
              )}
            </span>
            
            {/* Default Values */}
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {exercise.exerciseType === 'time-based' ? (
                t('exercises.defaultDuration', { duration: formatDuration(exercise.defaultDuration) })
              ) : (
                t('exercises.defaultSetsReps', { sets: exercise.defaultSets || 1, reps: exercise.defaultReps || 1 })
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
                {tag}
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