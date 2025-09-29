import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActivityLog } from '../types';
import { getOptimizedChartData, getDateRangeOptions, formatWeekRange, formatPeriodRange } from '../utils/activityCharts';

interface ProgressChartProps {
  logs: ActivityLog[];
}

type TimeRange = 'currentMonth' | 'threeMonths' | 'sinceStart';

const ProgressChart: React.FC<ProgressChartProps> = ({ logs }) => {
  const { t, i18n } = useTranslation(['common', 'activity']);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('currentMonth');

  const dateRanges = useMemo(() => getDateRangeOptions(logs), [logs]);

  const chartResult = useMemo(() => {
    const range = dateRanges[selectedRange];
    return getOptimizedChartData(logs, range.start, range.end, 8);
  }, [logs, selectedRange, dateRanges]);

  const { data: chartData, groupSize, unit } = chartResult;

  const maxWorkouts = useMemo(() => {
    return Math.max(...chartData.map(week => week.workoutCount), 1);
  }, [chartData]);

  // Dynamic chart title based on grouping
  const chartTitle = useMemo(() => {
    if (unit === 'period' && groupSize > 1) {
      return t('common:activity.charts.workoutFrequency', { defaultValue: 'Workout Frequency' });
    }
    return t('common:activity.charts.workoutsPerWeek', { defaultValue: 'Workouts per Week' });
  }, [unit, groupSize, t]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
    
    return `${minutes}m`;
  };

  const getBarHeight = (workoutCount: number): string => {
    if (workoutCount === 0) return 'h-0.5';
    const percentage = Math.max((workoutCount / maxWorkouts) * 100, 8);
    
    // Convert percentage to Tailwind height classes
    if (percentage <= 10) return 'h-2';
    if (percentage <= 20) return 'h-4';
    if (percentage <= 30) return 'h-6';
    if (percentage <= 40) return 'h-8';
    if (percentage <= 50) return 'h-12';
    if (percentage <= 60) return 'h-16';
    if (percentage <= 70) return 'h-20';
    if (percentage <= 80) return 'h-24';
    if (percentage <= 90) return 'h-32';
    return 'h-40';
  };

  const locale = i18n.resolvedLanguage || i18n.language || undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-900 dark:text-text-50">
          {chartTitle}
        </h3>
        
        {/* Time range selector */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {Object.entries(dateRanges).map(([key, range]) => (
            <button
              key={key}
              onClick={() => setSelectedRange(key as TimeRange)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedRange === key
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {t(`common:activity.charts.${key}`, { defaultValue: range.label })}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="space-y-4">
          {/* Chart area */}
          <div className="h-48 flex items-end justify-between gap-1 px-2">
            {chartData.map((week, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group relative">
                {/* Bar */}
                <div className="w-full flex justify-center mb-1">
                  <div
                    className={`w-6 rounded-t-sm transition-all duration-300 ${getBarHeight(week.workoutCount)} ${
                      week.workoutCount > 0
                        ? 'bg-primary-500 hover:bg-primary-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                </div>
                
                {/* Period label */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight">
                  {unit === 'period' && groupSize > 1 
                    ? formatPeriodRange(week.weekStart, week.weekEnd, locale)
                    : formatWeekRange(week.weekStart, locale)
                  }
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <div className="font-medium">
                    {t('common:activity.charts.workoutCount', { 
                      count: week.workoutCount,
                      defaultValue: `${week.workoutCount} workout${week.workoutCount !== 1 ? 's' : ''}` 
                    })}
                  </div>
                  {unit === 'period' && groupSize > 1 && (
                    <div className="text-gray-300 dark:text-gray-600">
                      {t('common:activity.charts.periodSummary', { 
                        weeks: groupSize,
                        defaultValue: `${groupSize}-week period` 
                      })}
                    </div>
                  )}
                  {week.totalDuration > 0 && (
                    <div className="text-gray-300 dark:text-gray-600">
                      {formatDuration(week.totalDuration)}
                    </div>
                  )}
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                </div>
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <span>0</span>
            <span className="text-primary-600 dark:text-primary-400 font-medium">
              {t('common:activity.charts.maxWorkouts', { 
                count: maxWorkouts,
                defaultValue: `${maxWorkouts} max` 
              })}
            </span>
          </div>

          {/* Summary stats */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {chartData.reduce((sum, week) => sum + week.workoutCount, 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('common:activity.totalWorkouts', { defaultValue: 'Total' })}
                </div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {Math.round(
                    chartData.reduce((sum, week) => sum + week.workoutCount, 0) / 
                    Math.max(chartData.length, 1) * 10
                  ) / 10}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {unit === 'period' && groupSize > 1 
                    ? t('common:activity.charts.avgPerPeriod', { defaultValue: 'Avg/period' })
                    : t('common:activity.charts.avgPerWeek', { defaultValue: 'Avg/week' })
                  }
                </div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatDuration(chartData.reduce((sum, week) => sum + week.totalDuration, 0))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('common:activity.totalTime', { defaultValue: 'Total time' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {t('common:activity.charts.noDataForRange', { defaultValue: 'No workout data for this time range' })}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressChart;