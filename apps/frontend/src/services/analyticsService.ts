/**
 * Analytics Service - Wrapper around activity chart utilities
 * 
 * Provides a thin service layer for aggregating workout data from IndexedDB.
 * Leverages existing production-tested utilities from activityCharts.ts.
 * 
 * Features:
 * - Workout statistics aggregation
 * - Streak tracking and calculation
 * - Muscle group balance analysis (NEW)
 * - Personal records tracking (Phase 2)
 * - Time-based analytics with flexible date ranges
 */

import type { ActivityLog } from '../types';
import type {
  WorkoutStatistics,
  StreakData,
  MuscleGroupBalance,
  AnalyticsSummary
} from '../types/coaching';
import {
  calculateCurrentStreak,
  getWeekStart
} from '../utils/activityCharts';
import { StorageService } from './storageService';
import logger from '../utils/logger';

/**
 * Analytics Service singleton for workout data analysis
 */
export class AnalyticsService {
  private static instance: AnalyticsService | null = null;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get workout statistics for a date range
   * 
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @param logs - Optional pre-filtered activity logs
   * @returns Aggregated workout statistics
   */
  public async getWorkoutStatistics(
    startDate: Date,
    endDate: Date,
    logs?: ActivityLog[]
  ): Promise<WorkoutStatistics> {
    try {
      // Fetch logs if not provided
      const activityLogs = logs || await this.storageService.getActivityLogs();

      // Filter logs for the date range
      const filteredLogs = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });

      // Calculate total workouts
      const totalWorkouts = filteredLogs.length;

      // Calculate total duration (in seconds)
      const totalDuration = filteredLogs.reduce((sum, log) => sum + log.duration, 0);

      // Count unique exercises
      const uniqueExercises = new Set(filteredLogs.map(log => log.exercise_id));
      const totalExercises = uniqueExercises.size;

      // Calculate total reps (sum of reps from all logs)
      const totalReps = filteredLogs.reduce((sum, log) => {
        return sum + (log.reps_count || 0);
      }, 0);

      // Calculate average workout duration
      const averageWorkoutDuration = totalWorkouts > 0 
        ? Math.round(totalDuration / totalWorkouts)
        : 0;

      // Calculate workouts per week
      const daysDifference = Math.max(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        1
      );
      const weeks = daysDifference / 7;
      const workoutsPerWeek = weeks > 0 ? totalWorkouts / weeks : totalWorkouts;

      // Find most active day of the week
      const dayCount: Record<string, number> = {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0
      };
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      filteredLogs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const dayName = dayNames[logDate.getDay()];
        dayCount[dayName]++;
      });

      const mostActiveDay = Object.entries(dayCount).reduce(
        (max, [day, count]) => (count > max.count ? { day, count } : max),
        { day: 'Monday', count: 0 }
      ).day;

      // Find most active category
      const mostActiveCategory = await this.getMostActiveCatalog(filteredLogs);

      return {
        totalWorkouts,
        totalDuration,
        totalExercises,
        totalReps,
        averageWorkoutDuration,
        workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10, // Round to 1 decimal
        mostActiveDay,
        mostActiveCategory
      };
    } catch (error) {
      logger.error('Error calculating workout statistics:', error);
      // Return empty statistics on error
      return {
        totalWorkouts: 0,
        totalDuration: 0,
        totalExercises: 0,
        totalReps: 0,
        averageWorkoutDuration: 0,
        workoutsPerWeek: 0,
        mostActiveDay: 'Monday',
        mostActiveCategory: null
      };
    }
  }

  /**
   * Get streak data (current and longest streak)
   * Leverages existing calculateCurrentStreak utility
   * 
   * @param logs - Optional pre-filtered activity logs
   * @returns Streak information
   */
  public async getStreakData(logs?: ActivityLog[]): Promise<StreakData> {
    try {
      const activityLogs = logs || await this.storageService.getActivityLogs();

      // Use existing utility for current streak
      const currentStreak = calculateCurrentStreak(activityLogs);

      // Calculate longest streak
      const longestStreak = this.calculateLongestStreak(activityLogs);

      // Check if user has worked out today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isActiveToday = activityLogs.some(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });

      // Find streak start date (if current streak > 0)
      let streakStartDate: string | undefined;
      if (currentStreak > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (currentStreak - 1));
        startDate.setHours(0, 0, 0, 0);
        streakStartDate = startDate.toISOString();
      }

      return {
        currentStreak,
        longestStreak,
        streakStartDate,
        isActiveToday
      };
    } catch (error) {
      logger.error('Error calculating streak data:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        isActiveToday: false
      };
    }
  }

  /**
   * Get muscle group balance analysis for a date range
   * NEW FUNCTIONALITY - not in existing utilities
   * 
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @param logs - Optional pre-filtered activity logs
   * @returns Muscle group distribution and balance metrics
   */
  public async getMuscleGroupBalance(
    startDate: Date,
    endDate: Date,
    logs?: ActivityLog[]
  ): Promise<MuscleGroupBalance[]> {
    try {
      const activityLogs = logs || await this.storageService.getActivityLogs();
      
      // Filter logs for date range
      const filteredLogs = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });

      if (filteredLogs.length === 0) {
        return [];
      }

      // Get all exercises to access muscle group data
      const exercises = await this.storageService.getExercises();
      const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));

      // Aggregate by muscle groups
      const muscleGroupData = new Map<string, {
        workoutCount: number;
        totalSets: number;
        totalReps: number;
        totalDuration: number;
        lastTrainedAt: string;
      }>();

      filteredLogs.forEach(log => {
        const exercise = exerciseMap.get(log.exercise_id);
        if (!exercise || !exercise.muscle_groups) {
          return;
        }

        // An exercise can target multiple muscle groups
        exercise.muscle_groups.forEach(muscleGroup => {
          const existing = muscleGroupData.get(muscleGroup) || {
            workoutCount: 0,
            totalSets: 0,
            totalReps: 0,
            totalDuration: 0,
            lastTrainedAt: log.timestamp
          };

          existing.workoutCount++;
          existing.totalSets += log.sets_count || 1;
          existing.totalReps += log.reps_count || 0;
          existing.totalDuration += log.duration;

          // Update last trained date (keep most recent)
          if (new Date(log.timestamp) > new Date(existing.lastTrainedAt)) {
            existing.lastTrainedAt = log.timestamp;
          }

          muscleGroupData.set(muscleGroup, existing);
        });
      });

      // Calculate percentages and thresholds
      const totalWorkouts = filteredLogs.length;
      const balanceArray: MuscleGroupBalance[] = Array.from(muscleGroupData.entries()).map(
        ([muscleGroup, data]) => {
          const percentage = (data.workoutCount / totalWorkouts) * 100;
          
          return {
            muscleGroup,
            workoutCount: data.workoutCount,
            totalSets: data.totalSets,
            totalReps: data.totalReps,
            totalDuration: data.totalDuration,
            percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
            lastTrainedAt: data.lastTrainedAt,
            isOverTrained: percentage > 30, // More than 30% of workouts
            isUnderTrained: percentage < 10 // Less than 10% of workouts
          };
        }
      );

      // Sort by workout count (descending)
      balanceArray.sort((a, b) => b.workoutCount - a.workoutCount);

      return balanceArray;
    } catch (error) {
      logger.error('Error calculating muscle group balance:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics summary for a time period
   * Combines all analytics data into a single response
   * 
   * @param period - Time period ('week', 'month', 'all-time')
   * @param customStartDate - Optional custom start date (for 'all-time' period)
   * @returns Complete analytics summary
   */
  public async getAnalyticsSummary(
    period: 'week' | 'month' | 'all-time',
    customStartDate?: Date
  ): Promise<AnalyticsSummary> {
    try {
      // Calculate date range based on period
      const endDate = new Date();
      let startDate: Date;

      if (period === 'week') {
        startDate = getWeekStart(endDate);
      } else if (period === 'month') {
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      } else {
        // all-time: use custom start date or earliest log
        if (customStartDate) {
          startDate = customStartDate;
        } else {
          const allLogs = await this.storageService.getActivityLogs();
          if (allLogs.length > 0) {
            const earliestLog = allLogs.reduce((earliest, log) => {
              return new Date(log.timestamp) < new Date(earliest.timestamp) ? log : earliest;
            });
            startDate = getWeekStart(new Date(earliestLog.timestamp));
          } else {
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          }
        }
      }

      // Fetch all logs once for efficiency
      const logs = await this.storageService.getActivityLogs();

      // Get all analytics data in parallel
      const [statistics, streak, muscleGroupBalance] = await Promise.all([
        this.getWorkoutStatistics(startDate, endDate, logs),
        this.getStreakData(logs),
        this.getMuscleGroupBalance(startDate, endDate, logs)
      ]);

      // Calculate trends (placeholder for Phase 2 AI)
      const trends = {
        workoutFrequency: 'maintaining' as const,
        consistency: 0.7,
        variety: 0.6
      };

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        statistics,
        streak,
        muscleGroupBalance,
        personalRecords: [], // Phase 2
        trends
      };
    } catch (error) {
      logger.error('Error generating analytics summary:', error);
      throw error;
    }
  }

  // =============== Private Helper Methods ===============

  /**
   * Calculate longest streak from activity logs
   */
  private calculateLongestStreak(logs: ActivityLog[]): number {
    if (logs.length === 0) return 0;

    // Get unique workout dates
    const workoutDates = Array.from(
      new Set(
        logs.map(log => {
          const date = new Date(log.timestamp);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      )
    ).sort((a, b) => a - b);

    let longestStreak = 1;
    let currentStreakLength = 1;

    for (let i = 1; i < workoutDates.length; i++) {
      const daysDiff = (workoutDates[i] - workoutDates[i - 1]) / (1000 * 60 * 60 * 24);
      
      if (daysDiff === 1) {
        // Consecutive day
        currentStreakLength++;
        longestStreak = Math.max(longestStreak, currentStreakLength);
      } else {
        // Gap in streak
        currentStreakLength = 1;
      }
    }

    return longestStreak;
  }

  /**
   * Find most active catalog ID from logs
   * Note: mostActiveCategory in WorkoutStatistics is typed as ExerciseCategory but represents catalogId
   */
  private async getMostActiveCatalog(
    logs: ActivityLog[]
  ): Promise<string | null> {
    if (logs.length === 0) return null;

    try {
      const exercises = await this.storageService.getExercises();
      const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));

      const catalogCount: Record<string, number> = {};

      logs.forEach(log => {
        const exercise = exerciseMap.get(log.exercise_id);
        if (exercise && exercise.catalogId) {
          catalogCount[exercise.catalogId] = (catalogCount[exercise.catalogId] || 0) + 1;
        }
      });

      // Find catalog with max count
      let maxCatalog: string | null = null;
      let maxCount = 0;

      Object.entries(catalogCount).forEach(([catalog, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxCatalog = catalog;
        }
      });

      return maxCatalog;
    } catch (error) {
      logger.error('Error finding most active catalog:', error);
      return null;
    }
  }
}

// Export singleton instance getter
export const analyticsService = AnalyticsService.getInstance();
