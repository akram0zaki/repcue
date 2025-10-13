/**
 * Coaching Service - Core service for generating coaching insights
 * 
 * Orchestrates analytics and recommendation engine to generate
 * actionable coaching insights for users.
 * 
 * Features:
 * - Insight generation from multiple sources
 * - Insight prioritization
 * - Caching to avoid redundant calculations
 * - Integration with AnalyticsService and recommendation engine
 */

import type {
  CoachingInsight,
  InsightType,
  InsightPriority,
  StreakData,
  MuscleGroupBalance
} from '../types/coaching';
import type { ActivityLog } from '../types';
import { AnalyticsService } from './analyticsService';
import { StorageService } from './storageService';
import {
  analyzeMuscleGroupBalance,
  suggestNeglectedMuscleGroups,
  generateStreakMotivation,
  isStreakAtRisk,
  suggestWorkout,
  findReadyForProgression,
  findReadyForDurationProgression,
  analyzeRecoveryNeeds,
  getDaysSinceLastTrained
} from '../utils/recommendationEngine';
import logger from '../utils/logger';

/**
 * Cache entry for insights
 */
interface InsightCache {
  insights: CoachingInsight[];
  generatedAt: string;
  expiresAt: string;
}

/**
 * Coaching Service singleton
 */
export class CoachingService {
  private static instance: CoachingService | null = null;
  private analyticsService: AnalyticsService;
  private storageService: StorageService;
  private insightCache: Map<string, InsightCache>;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.storageService = StorageService.getInstance();
    this.insightCache = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CoachingService {
    if (!CoachingService.instance) {
      CoachingService.instance = new CoachingService();
    }
    return CoachingService.instance;
  }

  /**
   * Get all coaching insights for current user
   * Combines insights from multiple sources and prioritizes them
   * 
   * @param forceRefresh - Bypass cache and regenerate insights
   * @returns Array of coaching insights, sorted by priority
   */
  public async getAllInsights(forceRefresh: boolean = false): Promise<CoachingInsight[]> {
    try {
      const cacheKey = 'all-insights';

      // Check cache unless force refresh
      if (!forceRefresh) {
        const cached = this.getCachedInsights(cacheKey);
        if (cached) {
          logger.log('Returning cached coaching insights');
          return cached;
        }
      }

      logger.log('Generating fresh coaching insights');

      // Fetch all necessary data in parallel
      const [analytics, logs] = await Promise.all([
        this.analyticsService.getAnalyticsSummary('week'),
        this.storageService.getActivityLogs()
      ]);

      const insights: CoachingInsight[] = [];

      // Generate different types of insights
      insights.push(...await this.generateStreakInsights(analytics.streak));
      insights.push(...await this.generateMuscleBalanceInsights(analytics.muscleGroupBalance));
      insights.push(...await this.generateProgressionInsights(logs));
      insights.push(...await this.generateRecoveryInsights(logs));
      insights.push(...await this.generateSuggestionInsights(logs, analytics.muscleGroupBalance));

      // Sort by priority
      const sortedInsights = this.prioritizeInsights(insights);

      // Cache the results
      this.cacheInsights(cacheKey, sortedInsights);

      return sortedInsights;
    } catch (error) {
      logger.error('Error generating coaching insights:', error);
      return [];
    }
  }

  /**
   * Get insights of a specific type
   */
  public async getInsightsByType(type: InsightType): Promise<CoachingInsight[]> {
    const allInsights = await this.getAllInsights();
    return allInsights.filter(insight => insight.type === type);
  }

  /**
   * Get highest priority insight (for display on home page)
   */
  public async getTopInsight(): Promise<CoachingInsight | null> {
    const insights = await this.getAllInsights();
    return insights.length > 0 ? insights[0] : null;
  }

  /**
   * Dismiss an insight
   */
  public dismissInsight(insightId: string): void {
    // Mark as dismissed in all cached entries
    this.insightCache.forEach((cache) => {
      cache.insights = cache.insights.map(insight =>
        insight.id === insightId ? { ...insight, dismissed: true } : insight
      );
    });
  }

  /**
   * Clear all cached insights
   */
  public clearCache(): void {
    this.insightCache.clear();
    logger.log('Coaching insights cache cleared');
  }

  // ============= Private Insight Generation Methods =============

  /**
   * Generate streak-related insights
   */
  private async generateStreakInsights(streakData: StreakData): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Generate motivation message
    const motivation = generateStreakMotivation(streakData);
    
    if (motivation.type === 'milestone') {
      insights.push({
        id: `streak-milestone-${Date.now()}`,
        type: 'streak',
        priority: 'high',
        source: 'rule',
        title: 'streak.title',
        message: motivation.messageKey,
        icon: 'trophy',
        iconColor: 'text-yellow-500',
        createdAt: new Date().toISOString(),
        dismissible: true,
        actions: [
          {
            label: 'actions.viewProgress',
            action: 'view-progress'
          }
        ]
      });
    } else if (motivation.type === 'maintain') {
      insights.push({
        id: `streak-maintain-${Date.now()}`,
        type: 'streak',
        priority: 'medium',
        source: 'rule',
        title: 'streak.title',
        message: motivation.messageKey,
        icon: 'fire',
        iconColor: 'text-orange-500',
        createdAt: new Date().toISOString(),
        dismissible: true
      });
    }

    // Check if streak is at risk
    const currentHour = new Date().getHours();
    if (isStreakAtRisk(streakData, currentHour)) {
      insights.push({
        id: `streak-risk-${Date.now()}`,
        type: 'streak',
        priority: 'high',
        source: 'rule',
        title: 'streak.atRisk',
        message: `streak.atRiskMessage:${streakData.currentStreak}`,
        icon: 'warning',
        iconColor: 'text-amber-500',
        createdAt: new Date().toISOString(),
        dismissible: false,
        actions: [
          {
            label: 'actions.workoutNow',
            action: 'start-workout'
          }
        ]
      });
    }

    return insights;
  }

  /**
   * Generate muscle balance insights
   */
  private async generateMuscleBalanceInsights(
    balance: MuscleGroupBalance[]
  ): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    if (balance.length === 0) return insights;

    const analysis = analyzeMuscleGroupBalance(balance);

    // Recommend under-trained groups
    if (analysis.underTrainedGroups.length > 0) {
      const groups = analysis.underTrainedGroups.slice(0, 2);
      insights.push({
        id: `muscle-undertrained-${Date.now()}`,
        type: 'muscle-balance',
        priority: 'medium',
        source: 'rule',
        title: 'muscleBalance.underTrained',
        message: `muscleBalance.underTrainedMessage:${groups.map(g => g.muscleGroup).join(',')}`,
        icon: 'target',
        iconColor: 'text-blue-500',
        createdAt: new Date().toISOString(),
        dismissible: true,
        actions: [
          {
            label: 'actions.findExercises',
            action: 'find-exercises',
            data: { muscleGroups: groups.map(g => g.muscleGroup) }
          }
        ]
      });
    }

    // Warn about over-trained groups
    if (analysis.overTrainedGroups.length > 0) {
      const groups = analysis.overTrainedGroups.slice(0, 2);
      insights.push({
        id: `muscle-overtrained-${Date.now()}`,
        type: 'muscle-balance',
        priority: 'low',
        source: 'rule',
        title: 'muscleBalance.overTrained',
        message: `muscleBalance.overTrainedMessage:${groups.map(g => g.muscleGroup).join(',')}`,
        icon: 'alert',
        iconColor: 'text-amber-500',
        createdAt: new Date().toISOString(),
        dismissible: true
      });
    }

    // Suggest neglected muscle groups (not trained in 7+ days)
    const neglected = suggestNeglectedMuscleGroups(balance, 7);
    if (neglected.length > 0) {
      const group = neglected[0];
      const daysSince = getDaysSinceLastTrained(group.lastTrainedAt!);
      
      insights.push({
        id: `muscle-neglected-${Date.now()}`,
        type: 'muscle-balance',
        priority: 'low',
        source: 'rule',
        title: 'muscleBalance.neglected',
        message: `muscleBalance.neglectedMessage:${group.muscleGroup}:${daysSince}`,
        icon: 'calendar',
        iconColor: 'text-gray-500',
        createdAt: new Date().toISOString(),
        dismissible: true,
        actions: [
          {
            label: 'actions.findExercises',
            action: 'find-exercises',
            data: { muscleGroups: [group.muscleGroup] }
          }
        ]
      });
    }

    return insights;
  }

  /**
   * Generate progressive overload insights
   */
  /**
   * Generate progression insights (rep-based and duration-based)
   */
  private async generateProgressionInsights(logs: ActivityLog[]): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Find rep-based exercises ready for progression
    const progressionMap = findReadyForProgression(logs, 14);
    const repRecommendations = Array.from(progressionMap.values());

    // Find duration-based exercises ready for progression
    const durationProgressionMap = findReadyForDurationProgression(logs, 14);
    const durationRecommendations = Array.from(durationProgressionMap.values());

    // Combine and limit to top 3 recommendations
    const allRecommendations = [
      ...repRecommendations.map(r => ({ type: 'rep' as const, data: r })),
      ...durationRecommendations.map(r => ({ type: 'duration' as const, data: r }))
    ].slice(0, 3);

    allRecommendations.forEach(rec => {
      if (rec.type === 'rep') {
        // Rep-based progression insight
        insights.push({
          id: `progression-${rec.data.exerciseId}-${Date.now()}`,
          type: 'progression',
          priority: 'medium',
          source: 'rule',
          title: 'progression.readyTitle',
          message: `progression.readyMessage:${rec.data.exerciseId}:${rec.data.recommendedSets}:${rec.data.recommendedReps}`,
          icon: 'trending-up',
          iconColor: 'text-green-500',
          createdAt: new Date().toISOString(),
          dismissible: true,
          metadata: {
            exerciseId: rec.data.exerciseId,
            exerciseName: rec.data.exerciseName,
            currentSets: rec.data.currentSets,
            currentReps: rec.data.currentReps,
            recommendedSets: rec.data.recommendedSets,
            recommendedReps: rec.data.recommendedReps
          },
          actions: [
            {
              label: 'actions.tryIt',
              action: 'start-exercise',
              data: {
                exerciseId: rec.data.exerciseId,
                sets: rec.data.recommendedSets,
                reps: rec.data.recommendedReps
              }
            }
          ]
        });
      } else {
        // Duration-based progression insight
        insights.push({
          id: `progression-duration-${rec.data.exerciseId}-${Date.now()}`,
          type: 'progression',
          priority: 'medium',
          source: 'rule',
          title: 'progression.readyTitle',
          message: `progression.readyDurationMessage:${rec.data.exerciseId}:${rec.data.recommendedSets}:${rec.data.recommendedDuration}`,
          icon: 'trending-up',
          iconColor: 'text-green-500',
          createdAt: new Date().toISOString(),
          dismissible: true,
          metadata: {
            exerciseId: rec.data.exerciseId,
            exerciseName: rec.data.exerciseName,
            currentSets: rec.data.currentSets,
            currentDuration: rec.data.currentDuration,
            recommendedSets: rec.data.recommendedSets,
            recommendedDuration: rec.data.recommendedDuration
          },
          actions: [
            {
              label: 'actions.tryIt',
              action: 'start-exercise',
              data: {
                exerciseId: rec.data.exerciseId,
                sets: rec.data.recommendedSets,
                duration: rec.data.recommendedDuration
              }
            }
          ]
        });
      }
    });

    return insights;
  }

  /**
   * Generate recovery insights
   */
  private async generateRecoveryInsights(logs: ActivityLog[]): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Get logs from last 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);

    const recovery = analyzeRecoveryNeeds(recentLogs);

    if (recovery) {
      const priorityMap: Record<typeof recovery.severity, InsightPriority> = {
        low: 'low',
        medium: 'medium',
        high: 'high'
      };

      insights.push({
        id: `recovery-${Date.now()}`,
        type: 'recovery',
        priority: priorityMap[recovery.severity],
        source: 'rule',
        title: 'recovery.title',
        message: recovery.reasoning,
        icon: recovery.severity === 'high' ? 'alert-circle' : 'info',
        iconColor: recovery.severity === 'high' ? 'text-red-500' : 'text-blue-500',
        createdAt: new Date().toISOString(),
        dismissible: true,
        metadata: {
          daysTraining: recovery.daysTraining,
          recommendedRestDays: recovery.recommendedRestDays,
          severity: recovery.severity
        }
      });
    }

    return insights;
  }

  /**
   * Generate contextual workout suggestions
   */
  private async generateSuggestionInsights(
    logs: ActivityLog[],
    balance: MuscleGroupBalance[]
  ): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Sort logs by timestamp (most recent first)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const suggestion = suggestWorkout(sortedLogs, balance);

    insights.push({
      id: `suggestion-${Date.now()}`,
      type: 'suggestion',
      priority: 'low',
      source: 'rule',
      title: 'suggestion.title',
      message: suggestion.suggestionKey,
      icon: 'lightbulb',
      iconColor: 'text-yellow-500',
      createdAt: new Date().toISOString(),
      dismissible: true,
      metadata: {
        targetMuscleGroups: suggestion.targetMuscleGroups
      },
      actions: suggestion.targetMuscleGroups ? [
        {
          label: 'actions.findExercises',
          action: 'find-exercises',
          data: { muscleGroups: suggestion.targetMuscleGroups }
        }
      ] : [
        {
          label: 'actions.startWorkout',
          action: 'start-workout'
        }
      ]
    });

    return insights;
  }

  // ============= Helper Methods =============

  /**
   * Prioritize insights based on multiple factors
   */
  private prioritizeInsights(insights: CoachingInsight[]): CoachingInsight[] {
    // Filter out dismissed insights
    const activeInsights = insights.filter(insight => !insight.dismissed);

    // Sort by priority (high > medium > low) and creation time (newer first)
    const priorityOrder: Record<InsightPriority, number> = {
      high: 3,
      medium: 2,
      low: 1
    };

    return activeInsights.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by creation time (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Get cached insights if available and not expired
   */
  private getCachedInsights(cacheKey: string): CoachingInsight[] | null {
    const cached = this.insightCache.get(cacheKey);
    
    if (!cached) return null;

    const now = new Date();
    const expiresAt = new Date(cached.expiresAt);

    if (now > expiresAt) {
      // Cache expired, remove it
      this.insightCache.delete(cacheKey);
      return null;
    }

    return cached.insights;
  }

  /**
   * Cache insights with expiration
   */
  private cacheInsights(cacheKey: string, insights: CoachingInsight[]): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_MS);

    this.insightCache.set(cacheKey, {
      insights,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
  }
}

// Export singleton instance getter
export const coachingService = CoachingService.getInstance();
