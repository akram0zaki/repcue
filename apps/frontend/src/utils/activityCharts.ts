import type { ActivityLog } from '../types';

/**
 * Get the ISO week number for a given date
 */
export const getISOWeekNumber = (date: Date): number => {
  const tempDate = new Date(date.getTime());
  
  // Set to nearest Thursday (current date + 4 - current day of week)
  // Make Sunday's day of week 7 instead of 0
  const dayOfWeek = tempDate.getDay() || 7;
  tempDate.setDate(tempDate.getDate() + 4 - dayOfWeek);
  
  // Get first day of year
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  
  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return weekNumber;
};

/**
 * Utility functions for processing activity data for charts and visualizations
 */

export interface WeeklyStreakData {
  weekStart: Date;
  workoutDays: boolean[]; // 7 days, Monday=0, Sunday=6
  totalWorkouts: number;
}

export interface WeeklyProgressData {
  weekStart: Date;
  weekEnd: Date;
  workoutCount: number;
  totalDuration: number;
}

/**
 * Get the start of the week (Monday) for a given date
 */
export const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get the end of the week (Sunday) for a given date
 */
export const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * Get workout data for a specific week
 */
export const getWeeklyStreakData = (logs: ActivityLog[], targetDate: Date): WeeklyStreakData => {
  const weekStart = getWeekStart(targetDate);
  const weekEnd = getWeekEnd(targetDate);
  
  // Filter logs for this week
  const weekLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= weekStart && logDate <= weekEnd;
  });
  
  // Create array for 7 days (Monday=0, Sunday=6)
  const workoutDays = new Array(7).fill(false);
  
  weekLogs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const dayOfWeek = logDate.getDay();
    // Convert Sunday (0) to index 6, Monday (1) to index 0, etc.
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    workoutDays[adjustedDay] = true;
  });
  
  return {
    weekStart,
    workoutDays,
    totalWorkouts: weekLogs.length
  };
};

/**
 * Calculate current workout streak in days
 */
export const calculateCurrentStreak = (logs: ActivityLog[]): number => {
  if (logs.length === 0) return 0;
  
  // Get unique workout dates (without time)
  const workoutDates = new Set(
    logs.map(log => {
      const date = new Date(log.timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );
  
  // Sort dates in descending order
  const sortedDates = Array.from(workoutDates).sort((a, b) => b - a);
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check from today backwards
  const checkDate = new Date(today);
  
  for (let i = 0; i < sortedDates.length; i++) {
    if (workoutDates.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

/**
 * Group activity logs by week for progress chart
 */
export const getWeeklyProgressData = (
  logs: ActivityLog[], 
  startDate: Date, 
  endDate: Date
): WeeklyProgressData[] => {
  const weeks: WeeklyProgressData[] = [];
  const current = getWeekStart(startDate);
  const end = getWeekEnd(endDate);
  
  while (current <= end) {
    const weekEnd = getWeekEnd(current);
    
    // Filter logs for this week
    const weekLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= current && logDate <= weekEnd;
    });
    
    const weekData: WeeklyProgressData = {
      weekStart: new Date(current),
      weekEnd: new Date(weekEnd),
      workoutCount: weekLogs.length,
      totalDuration: weekLogs.reduce((sum, log) => sum + log.duration, 0)
    };
    
    weeks.push(weekData);
    
    // Move to next week
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
};

/**
 * Get date range options for progress chart
 */
export const getDateRangeOptions = (logs: ActivityLog[]) => {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  
  // Find the earliest log date for "Since Start" option
  const earliestLog = logs.reduce((earliest, log) => {
    const logDate = new Date(log.timestamp);
    return !earliest || logDate < earliest ? logDate : earliest;
  }, null as Date | null);
  
  const sinceStart = earliestLog ? getWeekStart(earliestLog) : currentMonth;
  
  return {
    currentMonth: { start: currentMonth, end: now, label: 'Current Month' },
    threeMonths: { start: threeMonthsAgo, end: now, label: '3 Months' },
    sinceStart: { start: sinceStart, end: now, label: 'Since Start' }
  };
};

/**
 * Format week range for display
 */
export const formatWeekRange = (weekStart: Date, locale?: string): string => {
  const weekEnd = getWeekEnd(weekStart);
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric' 
  };
  
  // If the week spans across months or years, show both dates
  if (weekStart.getMonth() !== weekEnd.getMonth() || weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${weekStart.toLocaleDateString(locale, options)} - ${weekEnd.toLocaleDateString(locale, options)}`;
  }
  
  // Same month, just show "Jan 1-7"
  return `${weekStart.toLocaleDateString(locale, { month: 'short' })} ${weekStart.getDate()}-${weekEnd.getDate()}`;
};