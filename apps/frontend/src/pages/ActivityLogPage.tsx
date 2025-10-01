/* eslint-disable no-restricted-syntax -- i18n-exempt: certain fallback strings localized via t(); remaining literals are icons/units */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, ActivityLog, Workout } from '../types';
import { storageService } from '../services/storageService';
import { ExerciseCategory } from '../types';
import CategoryFilter from '../components/CategoryFilter';
import WeeklyStreakCalendar from '../components/WeeklyStreakCalendar';
import ProgressChart from '../components/ProgressChart';
import logger from '../utils/logger';

interface ActivityLogPageProps {
  exercises: Exercise[];
}

interface GroupedLogs {
  [key: string]: ActivityLog[];
}

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ exercises }) => {
  const { t, i18n } = useTranslation(['common', 'exercises', 'exerciseDetails']);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExerciseCategory>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [workoutNameMap, setWorkoutNameMap] = useState<Record<string, string>>({});

  // Category filter handlers
  const handleCategoryToggle = (category: ExerciseCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  // Load activity logs once on mount
  useEffect(() => {
    const loadActivityLogs = async () => {
      try {
        setIsLoading(true);
        const logs = await storageService.getActivityLogs();
        // Also load workouts to resolve workout names for display
        try {
          const workouts: Workout[] = await storageService.getWorkouts();
          const map: Record<string, string> = {};
          for (const w of workouts) map[w.id] = w.name;
          setWorkoutNameMap(map);
        } catch (e) {
          // Non-fatal; UI will fall back to log.exercise_name
          logger.debug('Workout name map load failed (non-fatal):', e);
        }
        setActivityLogs(logs);
      } catch (error) {
        logger.error('Failed to load activity logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivityLogs();

    // Refresh logs after a successful sync pull
    const handleSyncApplied = async () => {
      try {
        const [logs, workouts] = await Promise.all([
          storageService.getActivityLogs(),
          storageService.getWorkouts()
        ]);
        setActivityLogs(logs);
        const map: Record<string, string> = {};
        for (const w of workouts) map[w.id] = w.name;
        setWorkoutNameMap(map);
      } catch (e) {
        logger.warn('Failed to refresh activity logs after sync:', e);
      }
    };
    window.addEventListener('sync:applied', handleSyncApplied as EventListener);

    return () => {
      window.removeEventListener('sync:applied', handleSyncApplied as EventListener);
    };
  }, []);

  // Toggle workout expansion
  const toggleWorkoutExpansion = (workout_id: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workout_id)) {
        newSet.delete(workout_id);
      } else {
        newSet.add(workout_id);
      }
      return newSet;
    });
  };

  // Filter logs based on selected categories
  const filteredLogs = activityLogs.filter(log => {
    if (selectedCategories.size === 0) return true;
    
    // For workout entries, check if any exercise in the workout matches the filter
    if (log.is_workout && log.exercises) {
      return log.exercises.some(ex => {
        const exercise = exercises.find(e => e.id === ex.exercise_id);
        return exercise && selectedCategories.has(exercise.category);
      });
    }
    
    // For individual exercise entries
    const exercise = exercises.find(ex => ex.id === log.exercise_id);
    return exercise && selectedCategories.has(exercise.category);
  });

  // Group logs by date
  const groupedLogs: GroupedLogs = filteredLogs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toDateString();
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

  // Get exercise category color per style guide
  const getCategoryColor = (exercise_id: string): string => {
    const exercise = exercises.find(ex => ex.id === exercise_id);
    if (!exercise) return 'bg-gray-100 dark:bg-gray-200';

    switch (exercise.category) {
      case ExerciseCategory.CORE: return 'bg-blue-100 dark:bg-blue-200';
      case ExerciseCategory.STRENGTH: return 'bg-red-100 dark:bg-red-200';
      case ExerciseCategory.CARDIO: return 'bg-green-100 dark:bg-green-200';
      case ExerciseCategory.FLEXIBILITY: return 'bg-purple-100 dark:bg-purple-200';
      case ExerciseCategory.BALANCE: return 'bg-yellow-100 dark:bg-yellow-200';
      default: return 'bg-gray-100 dark:bg-gray-200';
    }
  };

  // Get exercise category text color per style guide
  const getCategoryTextColor = (exercise_id: string): string => {
    const exercise = exercises.find(ex => ex.id === exercise_id);
    if (!exercise) return 'text-gray-800 dark:text-gray-900';

    switch (exercise.category) {
      case ExerciseCategory.CORE: return 'text-blue-800 dark:text-blue-900';
      case ExerciseCategory.STRENGTH: return 'text-red-800 dark:text-red-900';
      case ExerciseCategory.CARDIO: return 'text-green-800 dark:text-green-900';
      case ExerciseCategory.FLEXIBILITY: return 'text-purple-800 dark:text-purple-900';
      case ExerciseCategory.BALANCE: return 'text-yellow-800 dark:text-yellow-900';
      default: return 'text-gray-800 dark:text-gray-900';
    }
  };

  // Localize legacy English notes generated at log creation time
  const localizeNotes = (notes?: string): string | null => {
    if (!notes) return null;
    const workoutCompletedMatch = notes.match(/^Workout completed with (\d+) exercises?$/);
    if (workoutCompletedMatch) {
      const count = parseInt(workoutCompletedMatch[1], 10);
      return t('activity.status.completedWorkout', { count });
    }
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
          <h1 className="text-h2 font-bold text-text-900 dark:text-text-50 mb-2">
            {t('activity.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('activity.subtitle')}
          </p>
        </div>

        {/* Charts Section */}
        {activityLogs.length > 0 && (
          <div className="space-y-4 mb-6">
            {/* Weekly Streak Calendar */}
            <WeeklyStreakCalendar 
              logs={activityLogs} 
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
            />

            {/* Progress Chart */}
            <ProgressChart logs={activityLogs} />
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <CategoryFilter
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            onClearAll={handleClearCategories}
            style="dropdown"
            size="md"
            allowMultiple={true}
          />
        </div>

        {/* Activity Logs */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-h3 font-medium text-text-900 dark:text-text-50 mb-2">
              {selectedCategories.size === 0
                ? t('activity.noWorkoutsYet') 
                : t('activity.noCategoryWorkoutsYet', { 
                    category: Array.from(selectedCategories)
                      .map(cat => t(`common:categories.${String(cat)}`, { defaultValue: cat.replace('-', ' ') }))
                      .join(', ')
                  })}
            </h3>
            <p className="text-text-600 dark:text-text-400 mb-4">
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
                    <h3 className="text-caption font-semibold text-text-900 dark:text-text-50">
                      {new Date(date).toLocaleDateString(i18n.resolvedLanguage || i18n.language || undefined, { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {logs
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((log) => (
                        <div key={log.id}>
                          {log.is_workout ? (
                            // Workout entry with expandable exercises
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                              <div 
                                className="cursor-pointer"
                                onClick={() => toggleWorkoutExpansion(log.id)}
                              >
                                {/* Title row with badge in top-right */}
                                <div className="grid grid-cols-[1fr,auto] gap-3 items-start mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                                    <h4 className="text-h3 font-semibold text-text-900 dark:text-text-50 break-words">
                                      {(() => {
                                        // Prefer the known workout name if available
                                        const nameFromMap = log.workout_id ? workoutNameMap[log.workout_id] : undefined;
                                        if (nameFromMap) {
                                          return nameFromMap;
                                        }
                                        // Fallback to exercise lookup (legacy) or stored log name
                                        const ex = exercises.find(e => e.id === log.exercise_id);
                                        if (ex) {
                                          const base = `${ex.id}`;
                                          const name = t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                          return name;
                                        }
                                        const fallback = log.exercise_name && typeof log.exercise_name === 'string' ? log.exercise_name : t('activity.workoutBadge');
                                        return fallback;
                                      })()}
                                    </h4>
                                  </div>
                                  
                                  <div className="px-2 py-1 rounded-full text-small font-medium bg-blue-100 dark:bg-blue-200 text-blue-800 dark:text-blue-900 whitespace-nowrap shrink-0">
                                      {t('activity.workoutBadge')}
                                  </div>
                                </div>
                                  
                                {/* Metadata row with expand button */}
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-1 shrink-0">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="whitespace-nowrap">{formatTime(new Date(log.timestamp))}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      <span className="whitespace-nowrap">{formatDuration(log.duration)}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                      </svg>
                                      <span className="whitespace-nowrap">{t('activity.exerciseCount', { count: log.exercises?.length || 0 })}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Expand/collapse button */}
                                  <svg 
                                    className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${expandedWorkouts.has(log.id) ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                              
                              {/* Expandable exercise list */}
                              {expandedWorkouts.has(log.id) && log.exercises && (
                                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                                    <h5 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{t('activity.exercisesHeading')}</h5>
                                  <div className="space-y-2">
                                    {log.exercises.map((exercise, index) => (
                                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${getCategoryColor(exercise.exercise_id).replace('bg-', 'bg-').replace('/30', '')}`}></span>
                                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words flex-1">{(() => {
                                            const ex = exercises.find(e => e.id === exercise.exercise_id);
                                            if (!ex) return exercise.exercise_name;
                                            const base = `${ex.id}`;
                                            return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                          })()}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500 dark:text-gray-400">
                                          {exercise.sets && exercise.reps && (
                                            <span className="whitespace-nowrap">{exercise.sets}×{exercise.reps}</span>
                                          )}
                                          <span className="whitespace-nowrap">{formatDuration(exercise.duration)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {log.notes && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                      className={`inline-block w-3 h-3 rounded-full ${getCategoryColor(log.exercise_id).replace('bg-', 'bg-').replace('/30', '')}`}
                                    ></span>
                                    <h4 className="text-h3 font-semibold text-text-900 dark:text-text-50 truncate">
                                      {(() => {
                                        const ex = exercises.find(e => e.id === log.exercise_id);
                                        if (!ex) return (log.exercise_name && typeof log.exercise_name === 'string') ? log.exercise_name : t('activity.unknownExercise', { defaultValue: 'Unknown Exercise' });
                                        const base = `${ex.id}`;
                                        return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                      })()}
                                    </h4>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime(new Date(log.timestamp))}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      {formatDuration(log.duration)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={`px-2 py-1 rounded-full text-small font-medium ${getCategoryColor(log.exercise_id)} ${getCategoryTextColor(log.exercise_id)}`}>
                                  {t(`common:categories.${exercises.find(ex => ex.id === log.exercise_id)?.category || ''}`, { defaultValue: (exercises.find(ex => ex.id === log.exercise_id)?.category || '').replace('-', ' ') })}
                                </div>
                              </div>
                              
                              {log.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
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