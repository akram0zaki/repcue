import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ActivityLog } from '../types';
import { getWeeklyStreakData, calculateCurrentStreak, getISOWeekNumber } from '../utils/activityCharts';

interface WeeklyStreakCalendarProps {
  logs: ActivityLog[];
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
}

const WeeklyStreakCalendar: React.FC<WeeklyStreakCalendarProps> = ({
  logs,
  currentWeek,
  onWeekChange
}) => {
  const { t, i18n } = useTranslation(['common', 'activity']);

  const weekData = getWeeklyStreakData(logs, currentWeek);
  const currentStreak = calculateCurrentStreak(logs);

  // Day names starting with Monday
  const dayNames = [
    t('common:weekdayAbbrev.monday', { defaultValue: 'Mon' }),
    t('common:weekdayAbbrev.tuesday', { defaultValue: 'Tue' }),
    t('common:weekdayAbbrev.wednesday', { defaultValue: 'Wed' }),
    t('common:weekdayAbbrev.thursday', { defaultValue: 'Thu' }),
    t('common:weekdayAbbrev.friday', { defaultValue: 'Fri' }),
    t('common:weekdayAbbrev.saturday', { defaultValue: 'Sat' }),
    t('common:weekdayAbbrev.sunday', { defaultValue: 'Sun' })
  ];

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    
    // Prevent navigation into future weeks
    if (direction === 'next') {
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const newWeekStart = new Date(newDate);
      newWeekStart.setDate(newDate.getDate() - newDate.getDay() + 1); // Monday of new week
      newWeekStart.setHours(0, 0, 0, 0);
      
      // Don't allow navigation beyond current week
      if (newWeekStart > currentWeekStart) {
        return;
      }
    }
    
    onWeekChange(newDate);
  };

  const formatWeekHeader = () => {
    const weekStart = weekData.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    if (weekStart.getMonth() !== weekEnd.getMonth()) {
      return `${weekStart.toLocaleDateString(locale, options)} - ${weekEnd.toLocaleDateString(locale, options)}`;
    }
    
    return `${weekStart.toLocaleDateString(locale, { month: 'short' })} ${weekStart.getDate()}-${weekEnd.getDate()}`;
  };

  const getWeekNumber = () => {
    return getISOWeekNumber(weekData.weekStart);
  };

  const getDayDate = (dayIndex: number): number => {
    const date = new Date(weekData.weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.getDate();
  };

  const isToday = (dayIndex: number): boolean => {
    const date = new Date(weekData.weekStart);
    date.setDate(date.getDate() + dayIndex);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentWeek = (): boolean => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const viewingWeekStart = new Date(weekData.weekStart);
    viewingWeekStart.setHours(0, 0, 0, 0);
    
    return viewingWeekStart.getTime() === currentWeekStart.getTime();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('common:activity.charts.previousWeek', { defaultValue: 'Previous week' })}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" className="ltr:block rtl:hidden" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" className="ltr:hidden rtl:block" />
          </svg>
        </button>
        
        <div className="text-center">
          {/* Week number */}
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('common:activity.charts.weekNumber', { week: getWeekNumber(), defaultValue: `Week ${getWeekNumber()}` })}
          </div>
          {/* Date range */}
          <h3 className="text-base font-semibold text-text-900 dark:text-text-50">
            {formatWeekHeader()}
          </h3>
        </div>
        
        <button
          onClick={() => navigateWeek('next')}
          disabled={isCurrentWeek()}
          className={`p-2 rounded-lg transition-colors ${
            isCurrentWeek()
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={t('common:activity.charts.nextWeek', { defaultValue: 'Next week' })}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" className="ltr:block rtl:hidden" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" className="ltr:hidden rtl:block" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {dayNames.map((dayName, index) => (
          <div key={index} className="text-center">
            {/* Day name */}
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {dayName}
            </div>
            
            {/* Day circle */}
            <div className="relative flex justify-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  weekData.workoutDays[index]
                    ? 'bg-primary-500 text-white'
                    : isToday(index)
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 ring-2 ring-primary-300 dark:ring-primary-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {getDayDate(index)}
              </div>
              
              {/* Workout indicator dot */}
              {weekData.workoutDays[index] && (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Streak information */}
      <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('common:activity.charts.currentStreak', { defaultValue: 'Current streak' })}
        </div>
        <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
          {t('common:activity.charts.streakDays', { 
            count: currentStreak, 
            defaultValue: `${currentStreak} day${currentStreak !== 1 ? 's' : ''}` 
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyStreakCalendar;