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
import { useCoachingInsights } from '../hooks/useCoachingInsights';
import { StorageService } from '../services/storageService';
import type { ActivityLog, AppSettings } from '../types';
import logger from '../utils/logger';

interface CoachPageProps {
  appSettings: AppSettings;
}

export const CoachPage: React.FC<CoachPageProps> = ({ appSettings }) => {
  const { t } = useTranslation(['coaching', 'common']);
  const navigate = useNavigate();
  const { insights, isLoading, error, refresh, dismissInsight } = useCoachingInsights({ settings: appSettings });
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load activity logs for charts
  React.useEffect(() => {
    const loadLogs = async () => {
      try {
        const storageService = StorageService.getInstance();
        const activityLogs = await storageService.getActivityLogs();
        setLogs(activityLogs);
      } catch (err) {
        logger.error('Error loading activity logs:', err);
      }
    };
    loadLogs();
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
          const exerciseData = data as { exerciseId: string };
          navigate(`/timer?exerciseId=${exerciseData.exerciseId}`);
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
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    
    // Reload activity logs
    try {
      const storageService = StorageService.getInstance();
      const activityLogs = await storageService.getActivityLogs();
      setLogs(activityLogs);
    } catch (err) {
      logger.error('Error reloading activity logs:', err);
    }
    
    setIsRefreshing(false);
  };

  /**
   * Loading state
   */
  if (isLoading && !isRefreshing) {
    return (
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
          </div>

          {/* Card skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
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
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              {t('coaching:error.title', { defaultValue: 'Unable to Load Insights' })}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {error.message}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
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
      <div className="min-h-screen bg-background-50 dark:bg-background-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-2">
              {t('coaching:title', { defaultValue: 'Your Coach' })}
            </h1>
            <p className="text-body">
              {t('coaching:subtitle', { defaultValue: 'Personalized insights to help you reach your goals' })}
            </p>
          </div>

          {/* Empty state */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('coaching:empty.title', { defaultValue: 'No Insights Yet' })}
            </h3>
            <p className="text-body mb-6">
              {t('coaching:empty.message', { defaultValue: 'Start working out to get personalized coaching insights!' })}
            </p>
            <button
              onClick={() => navigate('/timer')}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              {t('coaching:empty.startWorkout', { defaultValue: 'Start Your First Workout' })}
            </button>
          </div>

          {/* Show progress section even when no insights */}
          {logs.length > 0 && (
            <div id="progress-section" className="mt-6 space-y-4">
              <h2 className="text-xl font-bold text-text-900 dark:text-text-50">
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
        </div>
      </div>
    );
  }

  /**
   * Main content with insights
   */
  return (
    <div className="min-h-screen bg-background-50 dark:bg-background-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-900 dark:text-text-50 mb-2">
              {t('coaching:title', { defaultValue: 'Your Coach' })}
            </h1>
            <p className="text-body">
              {t('coaching:subtitle', { defaultValue: 'Personalized insights to help you reach your goals' })}
            </p>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50"
            aria-label={t('common:refresh', { defaultValue: 'Refresh' })}
          >
            <svg 
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Insights list */}
        <div className="space-y-4 mb-6">
          {insights.map(insight => (
            <CoachingCard
              key={insight.id}
              insight={insight}
              onAction={handleAction}
              onDismiss={dismissInsight}
            />
          ))}
        </div>

        {/* Progress section */}
        {logs.length > 0 && (
          <div id="progress-section" className="space-y-4">
            <h2 className="text-xl font-bold text-text-900 dark:text-text-50">
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
      </div>
    </div>
  );
};

export default CoachPage;
