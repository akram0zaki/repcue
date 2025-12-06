/**
 * CoachPage Component
 * 
 * Main coaching insights page that displays personalized coaching insights,
 * progress charts, and weekly streak calendar.
 * 
 * Features:
 * - List of coaching insights with actions
 * - Integrated WeeklyStreakCalendar component
 * - Integrated ProgressChart component
 * - Pull-to-refresh on mobile
 * - Empty state when no insights
 * - Loading state
 * - Error handling
 * - Accessibility compliant
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CoachingCard from '../components/CoachingCard';
import WeeklyStreakCalendar from '../components/WeeklyStreakCalendar';
import ProgressChart from '../components/ProgressChart';
import { PullToRefresh } from '../components/platform';
import { useCoachingInsights } from '../hooks/useCoachingInsights';
import { StorageService } from '../services/storageService';
import type { ActivityLog, AppSettings, Exercise, Workout } from '../types';
import logger from '../utils/logger';

interface CoachPageProps {
  appSettings: AppSettings;
  exercises: Exercise[];
}

export const CoachPage: React.FC<CoachPageProps> = ({ appSettings, exercises }) => {
  const { t, i18n } = useTranslation(['coaching', 'common', 'exercises', 'exerciseDetails']);
  const navigate = useNavigate();
  const { insights, isLoading, error, refresh, dismissInsight } = useCoachingInsights({ 
    settings: appSettings,
    enableAI: appSettings.coach_ai_insights_enabled || false
  });
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [workoutNameMap, setWorkoutNameMap] = useState<Record<string, string>>({});

  // Load activity logs for charts
  React.useEffect(() => {
    const loadLogs = async () => {
      try {
        const storageService = StorageService.getInstance();
        const activityLogs = await storageService.getActivityLogs();
        setLogs(activityLogs);
        
        // Load workouts to resolve workout names for display
        try {
          const workouts: Workout[] = await storageService.getWorkouts();
          const map: Record<string, string> = {};
          for (const w of workouts) map[w.id] = w.name;
          setWorkoutNameMap(map);
        } catch (e) {
          // Non-fatal; UI will fall back to log.exercise_name
          logger.debug('Workout name map load failed (non-fatal):', e);
        }
      } catch (err) {
        logger.error('Error loading activity logs:', err);
      }
    };
    loadLogs();
    
    // Refresh logs after a successful sync pull
    const handleSyncApplied = async () => {
      try {
        const storageService = StorageService.getInstance();
        const [activityLogs, workouts] = await Promise.all([
          storageService.getActivityLogs(),
          storageService.getWorkouts()
        ]);
        setLogs(activityLogs);
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

  /**
   * Handle insight actions
   */
  const handleAction = async (action: string, data?: unknown) => {
    logger.log('Coaching action:', action, data);

    switch (action) {
      case 'start-workout':
        navigate('/timer');
        break;
      
      case 'start-exercise':
        if (data && typeof data === 'object' && 'exerciseId' in data) {
          const exerciseData = data as {
            exerciseId: string;
            sets?: number;
            reps?: number;
            duration?: number;
          };

          // Build query string with all provided parameters
          const params = new URLSearchParams({ exerciseId: exerciseData.exerciseId });

          if (exerciseData.sets !== undefined) {
            params.append('sets', String(exerciseData.sets));
          }
          if (exerciseData.reps !== undefined) {
            params.append('reps', String(exerciseData.reps));
          }
          if (exerciseData.duration !== undefined) {
            params.append('duration', String(exerciseData.duration));
          }

          navigate(`/timer?${params.toString()}`);
        } else {
          navigate('/timer');
        }
        break;
      
      case 'find-exercises':
        if (data && typeof data === 'object' && 'muscleGroups' in data) {
          const groupsData = data as { muscleGroups: string[] };
          navigate(`/exercises?muscleGroups=${groupsData.muscleGroups.join(',')}`);
        } else {
          navigate('/exercises');
        }
        break;
      
      case 'view-progress':
        // Scroll to progress section
        document.getElementById('progress-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      
      default:
        logger.warn('Unknown action:', action);
    }
  };

  /**
   * Toggle workout expansion
   */
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

  /**
   * Format duration to readable string
   */
  const formatDuration = (seconds: number): string => {
    // Round to avoid floating-point precision issues
    const roundedSeconds = Math.round(seconds);
    
    const secSuffix = t('common:common.secondsShortSuffix');
    const minSuffix = t('common:common.minutesShortSuffix', { defaultValue: 'm' });
    if (roundedSeconds < 60) return `${roundedSeconds}${secSuffix}`;
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    return remainingSeconds > 0
      ? `${minutes}${minSuffix} ${remainingSeconds}${secSuffix}`
      : `${minutes}${minSuffix}`;
  };

  /**
   * Format time to readable string
   */
  const formatTime = (date: Date): string => {
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Localize legacy English notes generated at log creation time
   */
  const localizeNotes = (notes?: string): string | null => {
    if (!notes) return null;
    const workoutCompletedMatch = notes.match(/^Workout completed with (\d+) exercises?$/);
    if (workoutCompletedMatch) {
      const count = parseInt(workoutCompletedMatch[1], 10);
      return t('common:activity.status.completedWorkout', { count });
    }
    const stoppedMatch = notes.match(/^Stopped after (\d+)s$/);
    if (stoppedMatch) {
      const seconds = parseInt(stoppedMatch[1], 10);
      return t('common:activity.status.stoppedAfter', { duration: formatDuration(seconds) });
    }
    // Match "Completed Xs in workout: Name"
    const completedTimeInWorkoutMatch = notes.match(/^Completed (\d+)s in workout: (.+)$/);
    if (completedTimeInWorkoutMatch) {
      const seconds = parseInt(completedTimeInWorkoutMatch[1], 10);
      const workoutName = completedTimeInWorkoutMatch[2];
      return t('common:activity.status.completedTimeInWorkout', { duration: formatDuration(seconds), workoutName });
    }
    // Match "Completed X sets of Y reps in workout: Name"
    const completedSetsRepsInWorkoutMatch = notes.match(/^Completed (\d+) sets of (\d+) reps in workout: (.+)$/);
    if (completedSetsRepsInWorkoutMatch) {
      const sets = parseInt(completedSetsRepsInWorkoutMatch[1], 10);
      const reps = parseInt(completedSetsRepsInWorkoutMatch[2], 10);
      const workoutName = completedSetsRepsInWorkoutMatch[3];
      return t('common:activity.status.completedSetsRepsInWorkout', { sets, reps, workoutName });
    }
    const completedSetsRepsMatch = notes.match(/^Completed (\d+) sets of (\d+) reps$/);
    if (completedSetsRepsMatch) {
      const sets = parseInt(completedSetsRepsMatch[1], 10);
      const reps = parseInt(completedSetsRepsMatch[2], 10);
      return t('common:activity.status.completedSetsReps', { sets, reps });
    }
    const completedTimerMatch = notes.match(/^Completed (\d+)s interval timer$/);
    if (completedTimerMatch) {
      const seconds = parseInt(completedTimerMatch[1], 10);
      return t('common:activity.status.completedTime', { duration: formatDuration(seconds) });
    }
    return notes;
  };

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    
    // Reload activity logs
    try {
      const storageService = StorageService.getInstance();
      const [activityLogs, workouts] = await Promise.all([
        storageService.getActivityLogs(),
        storageService.getWorkouts()
      ]);
      setLogs(activityLogs);
      const map: Record<string, string> = {};
      for (const w of workouts) map[w.id] = w.name;
      setWorkoutNameMap(map);
    } catch (err) {
      logger.error('Error reloading activity logs:', err);
    }
    
    setIsRefreshing(false);
  };

  // Group logs by date
  interface GroupedLogs {
    [key: string]: ActivityLog[];
  }

  const groupedLogs: GroupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as GroupedLogs);

  /**
   * Loading state
   */
  if (isLoading && !isRefreshing) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-surface-200 dark:bg-surface-600 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-surface-200 dark:bg-surface-600 rounded w-2/3"></div>
          </div>

          {/* Card skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-0 dark:bg-surface-900 rounded-xl p-3 sm:p-4 shadow-sm border border-surface-200 dark:border-surface-700 mb-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-surface-200 dark:bg-surface-600 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-5 bg-surface-200 dark:bg-surface-600 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-surface-200 dark:bg-surface-600 rounded w-full mb-2"></div>
                  <div className="h-4 bg-surface-200 dark:bg-surface-600 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error && !isRefreshing) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-error-soft border border-error rounded-xl p-4 sm:p-6 text-center">
            <svg className="w-12 h-12 text-error mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-h3 text-error mb-2">
              {t('coaching:error.title', { defaultValue: 'Unable to Load Insights' })}
            </h3>
            <p className="text-body text-error mb-4">
              {error.message}
            </p>
            <button
              onClick={handleRefresh}
              className="btn-danger"
            >
              {t('common:retry', { defaultValue: 'Try Again' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (insights.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-h1 mb-2">
              {t('coaching:title', { defaultValue: 'Your Coach' })}
            </h1>
            <p className="text-body">
              {t('coaching:subtitle', { defaultValue: 'Personalized insights to help you reach your goals' })}
            </p>
          </div>

          {/* Empty state */}
          <div className="bg-surface-0 dark:bg-surface-900 rounded-xl p-4 sm:p-6 shadow-sm border border-surface-200 dark:border-surface-700 text-center">
            <svg className="w-16 h-16 text-surface-400 dark:text-surface-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-h3 mb-2">
              {t('coaching:empty.title', { defaultValue: 'No Insights Yet' })}
            </h3>
            <p className="text-body mb-6">
              {t('coaching:empty.message', { defaultValue: 'Start working out to get personalized coaching insights!' })}
            </p>
            <button
              onClick={() => navigate('/timer')}
              className="btn-primary"
            >
              {t('coaching:empty.startWorkout', { defaultValue: 'Start Your First Workout' })}
            </button>
          </div>

          {/* Show progress section even when no insights */}
          {logs.length > 0 && (
            <>
              <div id="progress-section" className="mt-4 space-y-3">
                <h2 className="text-h2">
                  {t('coaching:progress.title', { defaultValue: 'Your Progress' })}
                </h2>
                <WeeklyStreakCalendar
                  logs={logs}
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                />
                <ProgressChart logs={logs} />
              </div>

              {/* Activity Log section */}
              <div className="mt-4 space-y-3">
                <h2 className="text-h2">
                  {t('common:activity.title', { defaultValue: 'Activity Log' })}
                </h2>
                
                <div className="space-y-4">
                  {Object.entries(groupedLogs)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .slice(0, 3) /* Show only last 3 days in empty state */
                    .map(([date, dateLogs]) => (
                      <div key={date}>
                        <div className="sticky top-0 bg-background-50 dark:bg-background-900 py-1.5 mb-2">
                          <h3 className="text-caption font-semibold text-text-900 dark:text-text-50">
                            {new Date(date).toLocaleDateString(i18n.resolvedLanguage || i18n.language || undefined, { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          {dateLogs
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((log) => (
                              <div key={log.id}>
                                {log.is_workout ? (
                                  // Workout entry - simplified version
                                  <div className="bg-surface-100 dark:bg-surface-800 rounded-xl p-3 shadow-sm border border-slate-300 dark:border-surface-700">
                                    <div className="grid grid-cols-[1fr,auto] gap-2 sm:gap-3 items-start mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="inline-block w-3 h-3 rounded-full activity-log-dot shrink-0"></span>
                                        <h4 className="text-h3 break-words">
                                          {(() => {
                                            const nameFromMap = log.workout_id ? workoutNameMap[log.workout_id] : undefined;
                                            if (nameFromMap) return nameFromMap;
                                            const ex = exercises.find(e => e.id === log.exercise_id);
                                            if (ex) {
                                              const base = `${ex.id}`;
                                              return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                            }
                                            return log.exercise_name && typeof log.exercise_name === 'string' ? log.exercise_name : t('common:activity.workoutBadge');
                                          })()}
                                        </h4>
                                      </div>
                                      
                                      <div className="px-2 py-1 rounded-full text-small font-medium bg-surface-100 dark:bg-surface-700 text-text-900 dark:text-text-50 whitespace-nowrap shrink-0">
                                          {t('common:activity.workoutBadge', { defaultValue: 'Workout' })}
                                      </div>
                                    </div>
                                        
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-caption text-text-tertiary">
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="whitespace-nowrap">{formatTime(new Date(log.timestamp))}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="whitespace-nowrap">{formatDuration(log.duration)}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span className="whitespace-nowrap">{t('common:activity.exerciseCount', { count: log.exercises?.length || 0 })}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Individual exercise entry
                                  <div className="bg-surface-100 dark:bg-surface-800 rounded-xl p-3 shadow-sm border border-slate-300 dark:border-surface-700">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="inline-block w-3 h-3 rounded-full activity-log-dot"></span>
                                          <h4 className="text-h3 truncate">
                                            {(() => {
                                              const ex = exercises.find(e => e.id === log.exercise_id);
                                              if (!ex) return (log.exercise_name && typeof log.exercise_name === 'string') ? log.exercise_name : t('common:activity.unknownExercise', { defaultValue: 'Unknown Exercise' });
                                              const base = `${ex.id}`;
                                              return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                            })()}
                                          </h4>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-small text-text-tertiary">
                                          <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatTime(new Date(log.timestamp))}
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            {formatDuration(log.duration)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /**
   * Main content with insights
   */
  return (
    <PullToRefresh onRefresh={handleRefresh} testId="coach-pull-to-refresh">
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-3 sm:p-4 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            {/* Row 1: Title + Refresh button */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h1 className="text-h1">
                {t('coaching:title', { defaultValue: 'Your Coach' })}
              </h1>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900 disabled:opacity-50"
                style={{ direction: 'ltr' }}
                aria-label={t('common:refresh', { defaultValue: 'Refresh' })}
              >
                <svg 
                  className={`section-icon ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* Row 2: Description + AI badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-body">
              {t('coaching:subtitle', { defaultValue: 'Personalized insights to help you reach your goals' })}
            </p>
            {appSettings.coach_ai_insights_enabled && (
              <span className="ai-badge inline-flex items-center px-2 py-0.5 rounded text-small font-medium whitespace-nowrap">
                {t('coaching:aiEnabled', { defaultValue: 'AI-Powered' })}
              </span>
            )}
          </div>
        </div>

        {/* Insights list */}
        <div className="space-y-3 mb-4">
          {(() => {
            // Group insights by source
            const aiInsights = insights.filter(i => i.source === 'ai');
            const ruleInsights = insights.filter(i => i.source === 'rule' || !i.source);
            
            return (
              <>
                {/* AI-powered insights section */}
                {aiInsights.length > 0 && (
                  <div key="ai-insights-section" className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 streak-count" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <h2 className="text-h3 font-semibold">
                        {t('coaching:aiInsights', { defaultValue: 'AI-Powered Insights' })}
                      </h2>
                    </div>
                    {aiInsights.map(insight => (
                      <CoachingCard
                        key={insight.id}
                        insight={insight}
                        onAction={handleAction}
                        onDismiss={dismissInsight}
                      />
                    ))}
                  </div>
                )}
                
                {/* Rule-based insights section */}
                {ruleInsights.length > 0 && (
                  <div key="rule-insights-section" className="space-y-3">
                    {aiInsights.length > 0 && (
                      <h2 className="text-h3 font-semibold mt-6">
                        {t('coaching:additionalInsights', { defaultValue: 'Additional Insights' })}
                      </h2>
                    )}
                    {ruleInsights.map(insight => (
                      <CoachingCard
                        key={insight.id}
                        insight={insight}
                        onAction={handleAction}
                        onDismiss={dismissInsight}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Progress section */}
        {logs.length > 0 && (
          <div id="progress-section" className="space-y-3 mb-4">
            <h2 className="text-h2">
              {t('coaching:progress.title', { defaultValue: 'Your Progress' })}
            </h2>
            <WeeklyStreakCalendar
              logs={logs}
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
            />
            <ProgressChart logs={logs} />
          </div>
        )}

        {/* Activity Log section */}
        {logs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-h2">
              {t('common:activity.title', { defaultValue: 'Activity Log' })}
            </h2>
            
            <div className="space-y-4">
              {Object.entries(groupedLogs)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dateLogs]) => (
                  <div key={date}>
                    <div className="sticky top-0 z-10 bg-background-50 dark:bg-background-900 py-1.5 mb-2">
                      <h3 className="text-small font-semibold">
                        {new Date(date).toLocaleDateString(i18n.resolvedLanguage || i18n.language || undefined, { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      {dateLogs
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((log) => (
                          <div key={log.id}>
                            {log.is_workout ? (
                              // Workout entry with expandable exercises
                              <div className="bg-surface-100 dark:bg-surface-800 rounded-xl p-3 shadow-sm border border-slate-300 dark:border-surface-700">
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => toggleWorkoutExpansion(log.id)}
                                >
                                  {/* Title row with badge in top-right */}
                                  <div className="grid grid-cols-[1fr,auto] gap-2 sm:gap-3 items-start mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="inline-block w-3 h-3 rounded-full activity-log-dot shrink-0"></span>
                                      <h4 className="text-h3 break-words">
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
                                          const fallback = log.exercise_name && typeof log.exercise_name === 'string' ? log.exercise_name : t('common:activity.workoutBadge');
                                          return fallback;
                                        })()}
                                      </h4>
                                    </div>
                                    
                                    <div className="px-2 py-1 rounded-full text-small font-medium bg-surface-100 dark:bg-surface-700 text-text-900 dark:text-text-50 whitespace-nowrap shrink-0">
                                        {t('common:activity.workoutBadge', { defaultValue: 'Workout' })}
                                    </div>
                                  </div>
                                    
                                  {/* Metadata row with expand button */}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-caption text-text-tertiary">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="whitespace-nowrap">{formatTime(new Date(log.timestamp))}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="whitespace-nowrap">{formatDuration(log.duration)}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span className="whitespace-nowrap">{t('common:activity.exerciseCount', { count: log.exercises?.length || 0 })}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Expand/collapse button */}
                                    <svg 
                                      className={`w-5 h-5 text-text-tertiary transition-transform shrink-0 ${expandedWorkouts.has(log.id) ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                      style={{ direction: 'ltr' }}
                                      aria-hidden="true"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                
                                {/* Expandable exercise list */}
                                {expandedWorkouts.has(log.id) && log.exercises && (
                                  <div className="mt-3 pt-3 border-t border-slate-300 dark:border-surface-700">
                                      <h5 className="text-body font-medium mb-1.5">{t('common:activity.exercisesHeading', { defaultValue: 'Exercises' })}</h5>
                                    <div className="space-y-1.5">
                                      {log.exercises.map((exercise, index) => (
                                        <div key={index} className="bg-surface-50 dark:bg-surface-700 rounded-lg p-2.5 border border-slate-300 dark:border-surface-600">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="inline-block w-2 h-2 rounded-full shrink-0 activity-log-dot"></span>
                                            <span className="text-body font-medium break-words flex-1">{(() => {
                                              const ex = exercises.find(e => e.id === exercise.exercise_id);
                                              if (!ex) return exercise.exercise_name;
                                              const base = `${ex.id}`;
                                              return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                            })()}</span>
                                          </div>
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-small text-text-tertiary ltr:ml-4 rtl:mr-4">
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
                                  <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                                    <p className="text-small text-text-tertiary">
                                      {localizeNotes(log.notes) ?? log.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Individual exercise entry
                              <div className="bg-surface-100 dark:bg-surface-800 rounded-xl p-3 shadow-sm border border-slate-300 dark:border-surface-700">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className="inline-block w-3 h-3 rounded-full activity-log-dot"
                                      ></span>
                                      <h4 className="text-h3 truncate">
                                        {(() => {
                                          const ex = exercises.find(e => e.id === log.exercise_id);
                                          if (!ex) return (log.exercise_name && typeof log.exercise_name === 'string') ? log.exercise_name : t('common:activity.unknownExercise', { defaultValue: 'Unknown Exercise' });
                                          const base = `${ex.id}`;
                                          return t(`exerciseDetails:${base}.name`, { defaultValue: ex.name });
                                        })()}
                                      </h4>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-caption text-text-tertiary">
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatTime(new Date(log.timestamp))}
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {formatDuration(log.duration)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {log.notes && (
                                  <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                                    <p className="text-small text-text-tertiary">
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
          </div>
        )}
        </div>
      </div>
    </PullToRefresh>
  );
};

export default CoachPage;
