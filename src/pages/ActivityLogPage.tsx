import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, ActivityLog } from '../types';
import { storageService } from '../services/storageService';
import { ExerciseCategory } from '../types';

interface ActivityLogPageProps {
  exercises: Exercise[];
}

interface GroupedLogs {
  [key: string]: ActivityLog[];
}

interface StatsData {
  totalWorkouts: number;
  totalDuration: number;
  favoriteExercise: string;
  currentStreak: number;
  thisWeekWorkouts: number;
}

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ exercises }) => {
  const { t, i18n } = useTranslation();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ExerciseCategory>('all');
  const [showStatsCard, setShowStatsCard] = useState(true);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<StatsData>({
    totalWorkouts: 0,
    totalDuration: 0,
    favoriteExercise: 'None yet',
    currentStreak: 0,
    thisWeekWorkouts: 0
  });

  // Load activity logs on component mount
  useEffect(() => {
    const loadActivityLogs = async () => {
      try {
        setIsLoading(true);
        const logs = await storageService.getActivityLogs();
        setActivityLogs(logs);
        calculateStats(logs);
      } catch (error) {
        console.error('Failed to load activity logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivityLogs();
  }, []);

  // Calculate user statistics
  const calculateStats = (logs: ActivityLog[]) => {
    if (logs.length === 0) {
      setStats({
        totalWorkouts: 0,
        totalDuration: 0,
        favoriteExercise: '',
        currentStreak: 0,
        thisWeekWorkouts: 0
      });
      return;
    }

    const totalWorkouts = logs.length;
    const totalDuration = Math.round(logs.reduce((sum, log) => sum + log.duration, 0));
    
    // Find favorite exercise (most frequently done) by ID for reliable localization
    const exerciseCounts: { [exerciseId: string]: number } = {};
    logs.forEach(log => {
      const id = log.exerciseId;
      exerciseCounts[id] = (exerciseCounts[id] || 0) + 1;
    });
    const favoriteExerciseId = Object.entries(exerciseCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    const favoriteExercise = favoriteExerciseId
      ? (() => {
          const ex = exercises.find(e => e.id === favoriteExerciseId);
          if (!ex) return '';
          const base = `${ex.id}`;
          return t(`${base}.name`, { ns: 'exercises', defaultValue: ex.name });
        })()
      : '';

    // Calculate current streak (consecutive days with workouts)
    const sortedLogs = [...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const workoutDates = new Set(
      sortedLogs.map(log => {
        const date = new Date(log.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    const checkDate = new Date(today);
    while (workoutDates.has(checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate this week's workouts
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekWorkouts = logs.filter(log => log.timestamp >= oneWeekAgo).length;

    setStats({
      totalWorkouts,
      totalDuration,
      favoriteExercise,
      currentStreak,
      thisWeekWorkouts
    });
  };

  // Toggle workout expansion
  const toggleWorkoutExpansion = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  // Filter logs based on selected category
  const filteredLogs = activityLogs.filter(log => {
    if (selectedFilter === 'all') return true;
    
    // For workout entries, check if any exercise in the workout matches the filter
    if (log.isWorkout && log.exercises) {
      return log.exercises.some(ex => {
        const exercise = exercises.find(e => e.id === ex.exerciseId);
        return exercise?.category === selectedFilter;
      });
    }
    
    // For individual exercise entries
    const exercise = exercises.find(ex => ex.id === log.exerciseId);
    return exercise?.category === selectedFilter;
  });

  // Group logs by date
  const groupedLogs: GroupedLogs = filteredLogs.reduce((groups, log) => {
    const date = log.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as GroupedLogs);

  // Format duration to readable string
  const formatDuration = (seconds: number): string => {
    // Round to avoid floating-point precision issues
    const roundedSeconds = Math.round(seconds);
    
    const secSuffix = t('common.secondsShortSuffix');
    const minSuffix = t('common.minutesShortSuffix', { defaultValue: 'm' });
    if (roundedSeconds < 60) return `${roundedSeconds}${secSuffix}`;
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    return remainingSeconds > 0
      ? `${minutes}${minSuffix} ${remainingSeconds}${secSuffix}`
      : `${minutes}${minSuffix}`;
  };

  // Format time to readable string
  const formatTime = (date: Date): string => {
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
  const categoryKey = (cat: string): string => cat.replace(/-([a-z])/g, (_, c) => c.toUpperCase());


  // Get exercise category color
  const getCategoryColor = (exerciseId: string): string => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return 'bg-gray-100 dark:bg-gray-700';
    
    switch (exercise.category) {
      case ExerciseCategory.CORE: return 'bg-blue-100 dark:bg-blue-900/30';
      case ExerciseCategory.STRENGTH: return 'bg-red-100 dark:bg-red-900/30';
      case ExerciseCategory.CARDIO: return 'bg-green-100 dark:bg-green-900/30';
      case ExerciseCategory.FLEXIBILITY: return 'bg-purple-100 dark:bg-purple-900/30';
      case ExerciseCategory.BALANCE: return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  // Get exercise category text color
  const getCategoryTextColor = (exerciseId: string): string => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return 'text-gray-600 dark:text-gray-400';
    
    switch (exercise.category) {
      case ExerciseCategory.CORE: return 'text-blue-700 dark:text-blue-300';
      case ExerciseCategory.STRENGTH: return 'text-red-700 dark:text-red-300';
      case ExerciseCategory.CARDIO: return 'text-green-700 dark:text-green-300';
      case ExerciseCategory.FLEXIBILITY: return 'text-purple-700 dark:text-purple-300';
      case ExerciseCategory.BALANCE: return 'text-yellow-700 dark:text-yellow-300';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Localize legacy English notes generated at log creation time
  const localizeNotes = (notes?: string): string | null => {
    if (!notes) return null;
    const stoppedMatch = notes.match(/^Stopped after (\d+)s$/);
    if (stoppedMatch) {
      const seconds = parseInt(stoppedMatch[1], 10);
      return t('activity.status.stoppedAfter', { duration: formatDuration(seconds) });
    }
    const completedSetsRepsMatch = notes.match(/^Completed (\d+) sets of (\d+) reps$/);
    if (completedSetsRepsMatch) {
      const sets = parseInt(completedSetsRepsMatch[1], 10);
      const reps = parseInt(completedSetsRepsMatch[2], 10);
      return t('activity.status.completedSetsReps', { sets, reps });
    }
    const completedTimerMatch = notes.match(/^Completed (\d+)s interval timer$/);
    if (completedTimerMatch) {
      const seconds = parseInt(completedTimerMatch[1], 10);
      return t('activity.status.completedTime', { duration: formatDuration(seconds) });
    }
    return notes;
  };

  if (isLoading) {
    return (
      <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('activity.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('activity.subtitle')}
          </p>
        </div>

        {/* Stats Card */}
        {showStatsCard && activityLogs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('activity.yourProgress')}
              </h2>
              <button
                onClick={() => setShowStatsCard(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={t('activity.closeStatsAria')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalWorkouts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('activity.totalWorkouts')}</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatDuration(stats.totalDuration)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('activity.totalTime')}</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.currentStreak}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('activity.dayStreak')}</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.thisWeekWorkouts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('activity.thisWeek')}</div>
              </div>
            </div>
            
            {stats.favoriteExercise && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{t('activity.favoriteExercise')}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.favoriteExercise}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {t('activity.all')}
            </button>
            {Object.values(ExerciseCategory).map(category => (
              <button
                key={category}
                onClick={() => setSelectedFilter(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedFilter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {t(`exercises.category.${categoryKey(category)}`, { defaultValue: category.replace('-', ' ') })}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Logs */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {selectedFilter === 'all' 
                ? t('activity.noWorkoutsYet') 
                : t('activity.noCategoryWorkoutsYet', { category: t(`exercises.category.${categoryKey(selectedFilter)}`, { defaultValue: selectedFilter.replace('-', ' ') }) })}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('activity.emptySubtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, logs]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(date).toLocaleDateString(i18n.resolvedLanguage || i18n.language || undefined, { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {logs
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .map((log) => (
                        <div key={log.id}>
                          {log.isWorkout ? (
                            // Workout entry with expandable exercises
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                              <div 
                                className="flex items-start justify-between cursor-pointer"
                                onClick={() => toggleWorkoutExpansion(log.id)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                      {(() => {
                                        const ex = exercises.find(e => e.id === log.exerciseId);
                                        if (!ex) return `${log.exerciseName} (Workout)`;
                                        const base = `${ex.id}`;
                                        const name = t(`${base}.name`, { ns: 'exercises', defaultValue: ex.name });
                                        return `${name} (Workout)`;
                                      })()}
                                    </h4>
                                    <svg 
                                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedWorkouts.has(log.id) ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime(log.timestamp)}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      {formatDuration(log.duration)}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                      </svg>
                                      {t('activity.exerciseCount', { count: log.exercises?.length || 0 })}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                    {t('activity.workoutBadge')}
                                </div>
                              </div>
                              
                              {/* Expandable exercise list */}
                              {expandedWorkouts.has(log.id) && log.exercises && (
                                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('activity.exercisesHeading')}</h5>
                                  <div className="space-y-2">
                                    {log.exercises.map((exercise, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                          <span className={`inline-block w-2 h-2 rounded-full ${getCategoryColor(exercise.exerciseId).replace('bg-', 'bg-').replace('/30', '')}`}></span>
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">{(() => {
                                            const ex = exercises.find(e => e.id === exercise.exerciseId);
                                            if (!ex) return exercise.exerciseName;
                                            const base = `${ex.id}`;
                                            return t(`${base}.name`, { ns: 'exercises', defaultValue: ex.name });
                                          })()}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                          {exercise.sets && exercise.reps && (
                                            <span>{t('exercises.defaultSetsReps', { sets: exercise.sets, reps: exercise.reps })}</span>
                                          )}
                                          <span>{formatDuration(exercise.duration)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {log.notes && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {localizeNotes(log.notes) ?? log.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Individual exercise entry
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className={`inline-block w-3 h-3 rounded-full ${getCategoryColor(log.exerciseId).replace('bg-', 'bg-').replace('/30', '')}`}
                                    ></span>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                      {(() => {
                                        const ex = exercises.find(e => e.id === log.exerciseId);
                                        if (!ex) return log.exerciseName;
                                        const base = `${ex.id}`;
                                        return t(`${base}.name`, { ns: 'exercises', defaultValue: ex.name });
                                      })()}
                                    </h4>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime(log.timestamp)}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      {formatDuration(log.duration)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(log.exerciseId)} ${getCategoryTextColor(log.exerciseId)}`}>
                                  {t(`exercises.category.${(exercises.find(ex => ex.id === log.exerciseId)?.category || '').replace('-', '')}`, { defaultValue: (exercises.find(ex => ex.id === log.exerciseId)?.category || '').replace('-', ' ') })}
                                </div>
                              </div>
                              
                              {log.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {localizeNotes(log.notes) ?? log.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage; 