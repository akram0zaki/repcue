/**
 * PR History Page
 * 
 * Displays all personal records achieved by the user.
 * Features:
 * - List view of all PRs with exercise name, type, value, and date
 * - Search by exercise name
 * - Filter by record type and muscle group
 * - Sort by date (newest/oldest) or value (highest/lowest)
 * - Visual badges for milestones
 * - Responsive grid layout
 * - Empty state for users with no PRs yet
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PersonalRecord } from '../types/coaching';
import { analyticsService } from '../services/analyticsService';
import { storageService } from '../services/storageService';
import logger from '../utils/logger';

type SortOption = 'date-desc' | 'date-asc' | 'value-desc' | 'value-asc';
type FilterType = 'all' | 'max-reps' | 'max-sets' | 'max-duration' | 'max-weight';

export function PRHistoryPage() {
  const { t } = useTranslation('coaching');
  const navigate = useNavigate();
  
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  // Load PRs and muscle groups
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch personal records
        const prs = await analyticsService.getPersonalRecords();
        setRecords(prs);

        // Extract unique muscle groups from exercises
        const exercises = await storageService.getExercises();
        const allMuscleGroups = new Set<string>();
        
        // Get muscle groups for each exercise that has a PR
        prs.forEach(pr => {
          const exercise = exercises.find(ex => ex.id === pr.exerciseId);
          if (exercise?.muscle_groups) {
            exercise.muscle_groups.forEach(mg => allMuscleGroups.add(mg));
          }
        });
        
        setMuscleGroups(Array.from(allMuscleGroups).sort());
      } catch (error) {
        logger.error('Failed to load personal records:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let filtered = records;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.exerciseName.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.recordType === filterType);
    }

    // Muscle group filter
    if (filterMuscleGroup !== 'all') {
      filtered = filtered.filter(async record => {
        const exercises = await storageService.getExercises();
        const exercise = exercises.find(ex => ex.id === record.exerciseId);
        return exercise?.muscle_groups?.includes(filterMuscleGroup) ?? false;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
        case 'date-asc':
          return new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime();
        case 'value-desc':
          return b.value - a.value;
        case 'value-asc':
          return a.value - b.value;
        default:
          return 0;
      }
    });

    return filtered;
  }, [records, searchQuery, filterType, filterMuscleGroup, sortBy]);

  // Format record type for display
  const formatRecordType = (type: string): string => {
    switch (type) {
      case 'max-reps':
        return t('pr.type.maxReps', 'Max Reps');
      case 'max-sets':
        return t('pr.type.maxSets', 'Max Sets');
      case 'max-duration':
        return t('pr.type.maxDuration', 'Max Duration');
      case 'max-weight':
        return t('pr.type.maxWeight', 'Max Weight');
      default:
        return type;
    }
  };

  // Format value with unit
  const formatValue = (value: number, type: string): string => {
    switch (type) {
      case 'max-reps':
        return `${value} ${t('pr.unit.reps', 'reps')}`;
      case 'max-sets':
        return `${value} ${t('pr.unit.sets', 'sets')}`;
      case 'max-duration': {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }
      case 'max-weight':
        return `${value} kg`;
      default:
        return `${value}`;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('pr.today', 'Today');
    } else if (diffDays === 1) {
      return t('pr.yesterday', 'Yesterday');
    } else if (diffDays < 7) {
      return t('pr.daysAgo', '{{count}} days ago', { count: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get milestone badge for record
  const getMilestoneBadge = (record: PersonalRecord): string | null => {
    const value = record.value;
    
    switch (record.recordType) {
      case 'max-reps':
        if (value >= 100) return '💯';
        if (value >= 50) return '🔥';
        if (value >= 25) return '⭐';
        break;
      case 'max-sets':
        if (value >= 10) return '💪';
        if (value >= 5) return '🎯';
        break;
      case 'max-duration':
        if (value >= 600) return '⏱️'; // 10 minutes
        if (value >= 300) return '🏆'; // 5 minutes
        break;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('pr.loading', 'Loading your records...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
            dark:hover:text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          aria-label={t('common.back', 'Go back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('common.back', 'Back')}</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('pr.title', 'Personal Records')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('pr.subtitle', 'Your best performances for each exercise')}
        </p>
      </div>

      {/* Filters and Search */}
      {records.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search-prs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pr.search', 'Search')}
              </label>
              <input
                id="search-prs"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pr.searchPlaceholder', 'Search exercises...')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pr.filterType', 'Record Type')}
              </label>
              <select
                id="filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('pr.allTypes', 'All Types')}</option>
                <option value="max-reps">{t('pr.type.maxReps', 'Max Reps')}</option>
                <option value="max-sets">{t('pr.type.maxSets', 'Max Sets')}</option>
                <option value="max-duration">{t('pr.type.maxDuration', 'Max Duration')}</option>
                <option value="max-weight">{t('pr.type.maxWeight', 'Max Weight')}</option>
              </select>
            </div>

            {/* Muscle Group Filter */}
            {muscleGroups.length > 0 && (
              <div>
                <label htmlFor="filter-muscle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('pr.filterMuscle', 'Muscle Group')}
                </label>
                <select
                  id="filter-muscle"
                  value={filterMuscleGroup}
                  onChange={(e) => setFilterMuscleGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('pr.allMuscles', 'All Muscles')}</option>
                  {muscleGroups.map(mg => (
                    <option key={mg} value={mg}>
                      {t(`muscleGroups.${mg}`, mg)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort */}
            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pr.sortBy', 'Sort By')}
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date-desc">{t('pr.sortNewest', 'Newest First')}</option>
                <option value="date-asc">{t('pr.sortOldest', 'Oldest First')}</option>
                <option value="value-desc">{t('pr.sortHighest', 'Highest Value')}</option>
                <option value="value-asc">{t('pr.sortLowest', 'Lowest Value')}</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t('pr.showingCount', 'Showing {{count}} record(s)', { count: filteredRecords.length })}
          </div>
        </div>
      )}

      {/* Records Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const badge = getMilestoneBadge(record);
            
            return (
              <div
                key={record.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md 
                  transition-shadow p-5 border border-gray-200 dark:border-gray-700"
              >
                {/* Header with badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {record.exerciseName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatRecordType(record.recordType)}
                    </p>
                  </div>
                  {badge && (
                    <span className="text-2xl" aria-label={t('pr.milestone', 'Milestone')}>
                      {badge}
                    </span>
                  )}
                </div>

                {/* Value */}
                <div className="mb-3">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatValue(record.value, record.recordType)}
                  </div>
                  {record.improvementPercentage && record.improvementPercentage > 0 && (
                    <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mt-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      <span>+{record.improvementPercentage}%</span>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(record.achievedAt)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {records.length === 0 
              ? t('pr.noRecordsYet', 'No personal records yet')
              : t('pr.noMatching', 'No matching records')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {records.length === 0
              ? t('pr.emptyMessage', 'Complete workouts to set your first personal records and track your progress!')
              : t('pr.tryDifferentFilter', 'Try adjusting your search or filters to find records.')}
          </p>
          {records.length === 0 && (
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg 
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('pr.startWorkout', 'Start a Workout')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PRHistoryPage;
