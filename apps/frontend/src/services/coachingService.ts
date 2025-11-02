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
import { insightsService, InsightsServiceError } from './insightsService';
import {
  analyzeMuscleGroupBalance,
  suggestNeglectedMuscleGroups,
  generateStreakMotivation,
  isStreakAtRisk,
  suggestWorkout,
  findReadyForDurationProgression,
  getDaysSinceLastTrained,
  detectProgressionOpportunities,
  calculateRecoveryRecommendations
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
 * Dismissed insight tracking
 */
interface DismissedInsight {
  id: string;
  dismissedAt: string;
  expiresAt: string; // Insights can reappear after 24 hours
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
  private readonly DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DISMISSED_INSIGHTS_KEY = 'repcue_dismissed_insights';

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.storageService = StorageService.getInstance();
    this.insightCache = new Map();
    this.cleanupExpiredDismissals();
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
   * @param clearDismissals - Clear all dismissed insights (useful for manual refresh)
   * @returns Array of coaching insights, sorted by priority
   */
  public async getAllInsights(forceRefresh: boolean = false, clearDismissals: boolean = false): Promise<CoachingInsight[]> {
    try {
      // Clear dismissed insights if requested (e.g., manual refresh button)
      if (clearDismissals) {
        this.clearAllDismissedInsights();
        this.clearCache(); // Also clear the insights cache for truly fresh insights
        logger.log('[CoachingService] Cleared dismissed insights and cache for manual refresh');
      }

      const cacheKey = 'all-insights';

      // Check cache unless force refresh
      if (!forceRefresh) {
        const cached = this.getCachedInsights(cacheKey);
        if (cached) {
          logger.log('Returning cached coaching insights');
          // Filter out dismissed insights
          return cached.filter(insight => !insight.dismissed);
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

      // Filter out dismissed insights (both in-memory and persisted)
      const filteredInsights = sortedInsights.filter(insight => 
        !insight.dismissed && !this.isInsightDismissed(insight.id)
      );
      
      logger.log(`[CoachingService] Returning ${filteredInsights.length} insights (${sortedInsights.length} before dismissal filter)`);
      return filteredInsights;
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
   * Get AI-enhanced coaching insights
   * Combines rule-based insights with AI-powered insights for a richer experience
   * 
   * Features:
   * - Fetches AI insights if user has enabled AI features
   * - Merges rule-based and AI insights
   * - Falls back gracefully to rule-based only if AI fails
   * - Deduplicates similar insights
   * - Prioritizes combined insights
   * 
   * @param forceRefresh - Bypass cache and regenerate insights
   * @param enableAI - Whether to fetch AI insights (typically from user settings)
   * @param locale - User's preferred language for AI responses (defaults to 'en')
   * @param clearDismissals - Clear all dismissed insights (useful for manual refresh)
   * @returns Array of coaching insights (rule-based + AI), sorted by priority
   */
  public async getAIEnhancedInsights(
    forceRefresh: boolean = false,
    enableAI: boolean = false,
    locale: string = 'en',
    clearDismissals: boolean = false
  ): Promise<CoachingInsight[]> {
    try {
      logger.log(`[CoachingService] getAIEnhancedInsights called with forceRefresh=${forceRefresh}, clearDismissals=${clearDismissals}, enableAI=${enableAI}`);
      
      // Always get rule-based insights as baseline
      // Get rule-based insights first (always needed as fallback)
      const ruleBasedInsights = await this.getAllInsights(forceRefresh, clearDismissals);

      // If AI is disabled, return rule-based insights only
      if (!enableAI) {
        logger.log('[CoachingService] AI insights disabled, returning rule-based only');
        logger.log('[CoachingService] To enable: Go to Settings > Coach > Enable AI Insights');
        return ruleBasedInsights;
      }

      // Check if user can fetch AI insights (authenticated, online)
      const { canFetch, reason } = insightsService.canFetchInsights();
      if (!canFetch) {
        logger.log('[CoachingService] Cannot fetch AI insights:', reason);
        if (reason?.includes('not authenticated')) {
          logger.log('[CoachingService] Please sign in to access AI-powered insights');
        }
        return ruleBasedInsights;
      }

      // Attempt to fetch AI insights
      try {
        logger.log('[CoachingService] Fetching AI-enhanced insights');
        
        const aiResponse = await insightsService.getAIInsights(forceRefresh, locale);
        const aiInsights = aiResponse.insights;

        logger.log('[CoachingService] AI insights fetched successfully', {
          aiCount: aiInsights.length,
          ruleCount: ruleBasedInsights.length,
          cached: aiResponse.metadata.cached
        });

        // Merge and deduplicate insights
        const mergedInsights = this.mergeInsights(ruleBasedInsights, aiInsights);

        // Prioritize combined insights
        const sortedInsights = this.prioritizeInsights(mergedInsights);

        logger.log('[CoachingService] Merged insights', {
          total: sortedInsights.length,
          aiInsights: aiInsights.length,
          ruleInsights: ruleBasedInsights.length
        });

        // Filter out dismissed insights (same as getAllInsights)
        const filteredInsights = sortedInsights.filter(insight => 
          !insight.dismissed && !this.isInsightDismissed(insight.id)
        );
        
        logger.log(`[CoachingService] Returning ${filteredInsights.length} AI-enhanced insights (${sortedInsights.length} before dismissal filter)`);
        return filteredInsights;

      } catch (error) {
        // Handle AI fetch errors gracefully - fall back to rule-based
        if (error instanceof InsightsServiceError) {
          logger.warn('[CoachingService] AI insights fetch failed, using rule-based fallback', {
            code: error.code,
            message: error.message
          });

          // Add a notification insight about AI failure (user-friendly)
          if (error.code !== 'RATE_LIMIT') {
            // Don't show error for rate limits (expected behavior)
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const errorInsight: CoachingInsight = {
              id: this.generateInsightId('motivation', `ai-error-${error.code}-${today}`),
              type: 'motivation',
              priority: 'low',
              source: 'rule',
              title: 'coach.aiUnavailable',
              message: 'coach.aiUnavailableMessage',
              icon: 'info',
              iconColor: 'text-primary-500',
              createdAt: new Date().toISOString(),
              dismissible: true,
              metadata: {
                errorCode: error.code
              }
            };
            return [errorInsight, ...ruleBasedInsights];
          }
        } else {
          logger.error('[CoachingService] Unexpected error fetching AI insights', error);
        }

        // Return rule-based insights as fallback
        return ruleBasedInsights;
      }

    } catch (error) {
      logger.error('[CoachingService] Error in getAIEnhancedInsights', error);
      // Final fallback - return empty array
      return [];
    }
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
    logger.log(`[CoachingService] Dismissing insight: ${insightId}`);
    
    // Mark as dismissed in all cached entries
    this.insightCache.forEach((cache) => {
      const beforeCount = cache.insights.filter(i => i.dismissed).length;
      cache.insights = cache.insights.map(insight =>
        insight.id === insightId ? { ...insight, dismissed: true } : insight
      );
      const afterCount = cache.insights.filter(i => i.dismissed).length;
      logger.log(`[CoachingService] Cache updated: ${beforeCount} -> ${afterCount} dismissed insights`);
    });

    // Persist dismissal to localStorage
    this.persistDismissedInsight(insightId);
  }

  /**
   * Persist dismissed insight to localStorage
   */
  private persistDismissedInsight(insightId: string): void {
    try {
      const dismissed = this.getDismissedInsights();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.DISMISSAL_DURATION_MS);

      // Add new dismissal (or update if already exists)
      const existingIndex = dismissed.findIndex(d => d.id === insightId);
      if (existingIndex >= 0) {
        dismissed[existingIndex] = {
          id: insightId,
          dismissedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        };
      } else {
        dismissed.push({
          id: insightId,
          dismissedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        });
      }

      localStorage.setItem(this.DISMISSED_INSIGHTS_KEY, JSON.stringify(dismissed));
      logger.log(`[CoachingService] Persisted dismissal for: ${insightId}`);
    } catch (error) {
      logger.warn('[CoachingService] Failed to persist dismissed insight:', error);
    }
  }

  /**
   * Get list of dismissed insights from localStorage
   */
  private getDismissedInsights(): DismissedInsight[] {
    try {
      const stored = localStorage.getItem(this.DISMISSED_INSIGHTS_KEY);
      if (!stored) return [];

      const dismissed = JSON.parse(stored) as DismissedInsight[];
      return dismissed.filter(d => new Date(d.expiresAt) > new Date());
    } catch (error) {
      logger.warn('[CoachingService] Failed to read dismissed insights:', error);
      return [];
    }
  }

  /**
   * Check if an insight is dismissed
   */
  private isInsightDismissed(insightId: string): boolean {
    const dismissed = this.getDismissedInsights();
    return dismissed.some(d => d.id === insightId);
  }

  /**
   * Clean up expired dismissals from localStorage
   */
  private cleanupExpiredDismissals(): void {
    try {
      const dismissed = this.getDismissedInsights(); // This already filters expired
      localStorage.setItem(this.DISMISSED_INSIGHTS_KEY, JSON.stringify(dismissed));
    } catch (error) {
      logger.warn('[CoachingService] Failed to cleanup expired dismissals:', error);
    }
  }

  /**
   * Clear all dismissed insights from localStorage
   * Used when user manually refreshes to get fresh insights
   */
  private clearAllDismissedInsights(): void {
    try {
      localStorage.removeItem(this.DISMISSED_INSIGHTS_KEY);
      logger.log('[CoachingService] Cleared all dismissed insights');
    } catch (error) {
      logger.warn('[CoachingService] Failed to clear dismissed insights:', error);
    }
  }

  /**
   * Generate stable insight ID based on type and key characteristics
   */
  private generateInsightId(type: InsightType, key: string): string {
    return `${type}-${key}`;
  }

  /**
   * Clear all cached insights (both coaching service and AI insights service)
   */
  public clearCache(): void {
    this.insightCache.clear();
    insightsService.clearCache(); // Also clear AI insights cache
    logger.log('Coaching insights cache cleared (including AI insights cache)');
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
        id: this.generateInsightId('streak', `milestone-${streakData.currentStreak}`),
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
        id: this.generateInsightId('streak', `maintain-${streakData.currentStreak}`),
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      insights.push({
        id: this.generateInsightId('streak', `risk-${today}`),
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
      const groupsKey = groups.map(g => g.muscleGroup).sort().join('-');
      insights.push({
        id: this.generateInsightId('muscle-balance', `undertrained-${groupsKey}`),
        type: 'muscle-balance',
        priority: 'medium',
        source: 'rule',
        title: 'muscleBalance.underTrained',
        message: `muscleBalance.underTrainedMessage:${groups.map(g => g.muscleGroup).join(',')}`,
        icon: 'target',
        iconColor: 'text-primary-500',
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
      const groupsKey = groups.map(g => g.muscleGroup).sort().join('-');
      insights.push({
        id: this.generateInsightId('muscle-balance', `overtrained-${groupsKey}`),
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
        id: this.generateInsightId('muscle-balance', `neglected-${group.muscleGroup}`),
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
   * Generate progressive overload insights using advanced multi-factor analysis
   * 
   * Uses detectProgressionOpportunities() for sophisticated progression detection
   * that considers completion trends, plateaus, rest quality, and volume patterns.
   * Falls back to simpler detection for duration-based exercises.
   */
  private async generateProgressionInsights(logs: ActivityLog[]): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Use advanced progression detection for rep-based exercises
    const progressionMap = detectProgressionOpportunities(logs, 21);
    const repRecommendations = Array.from(progressionMap.values());

    // Find duration-based exercises ready for progression (simpler logic)
    const durationProgressionMap = findReadyForDurationProgression(logs, 14);
    const durationRecommendations = Array.from(durationProgressionMap.values());

    // Sort rep recommendations by confidence (highest first) and take top 2
    const topRepRecommendations = repRecommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);

    // Take top 1 duration recommendation
    const topDurationRecommendations = durationRecommendations.slice(0, 1);

    // Combine recommendations (max 3 total)
    const allRecommendations = [
      ...topRepRecommendations.map(r => ({ type: 'rep' as const, data: r })),
      ...topDurationRecommendations.map(r => ({ type: 'duration' as const, data: r }))
    ].slice(0, 3);

    allRecommendations.forEach(rec => {
      if (rec.type === 'rep') {
        // Rep-based progression insight with confidence score
        const confidenceLevel = rec.data.confidence >= 0.9 
          ? 'high' 
          : rec.data.confidence >= 0.7 
            ? 'medium' 
            : 'low';

        insights.push({
          id: this.generateInsightId('progression', `rep-${rec.data.exerciseId}`),
          type: 'progression',
          priority: confidenceLevel === 'high' ? 'high' : 'medium',
          source: 'rule',
          title: 'progression.readyTitle',
          message: rec.data.reasoning,
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
            recommendedReps: rec.data.recommendedReps,
            confidence: rec.data.confidence,
            confidenceLevel,
            completionRate: rec.data.completionRate
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
        // Duration-based progression insight (simpler detection)
        insights.push({
          id: this.generateInsightId('progression', `duration-${rec.data.exerciseId}`),
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
            recommendedDuration: rec.data.recommendedDuration,
            confidence: rec.data.confidence,
            completionRate: rec.data.completionRate
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
   * Generate recovery insights using advanced multi-factor analysis
   * 
   * Uses calculateRecoveryRecommendations() for sophisticated recovery detection
   * that considers consecutive training days, workout intensity, volume spikes,
   * muscle group fatigue, and overall fatigue scoring.
   */
  private async generateRecoveryInsights(logs: ActivityLog[]): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Use advanced recovery analysis (analyzes last 14 days by default)
    const recovery = calculateRecoveryRecommendations(logs, 14);

    if (recovery) {
      const priorityMap: Record<typeof recovery.severity, InsightPriority> = {
        low: 'low',
        medium: 'medium',
        high: 'high'
      };

      // Determine icon and color based on severity
      const iconMap = {
        low: 'info',
        medium: 'alert-triangle',
        high: 'alert-circle'
      } as const;

      const colorMap = {
        low: 'text-primary-500',
        medium: 'text-amber-500',
        high: 'text-red-500'
      } as const;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      insights.push({
        id: this.generateInsightId('recovery', `${recovery.severity}-${today}`),
        type: 'recovery',
        priority: priorityMap[recovery.severity],
        source: 'rule',
        title: 'recovery.title',
        message: recovery.reasoning,
        icon: iconMap[recovery.severity],
        iconColor: colorMap[recovery.severity],
        createdAt: new Date().toISOString(),
        dismissible: true,
        metadata: {
          daysTraining: recovery.daysTraining,
          recommendedRestDays: recovery.recommendedRestDays,
          severity: recovery.severity,
          affectedMuscleGroups: recovery.affectedMuscleGroups
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
    const suggestionKey = suggestion.targetMuscleGroups 
      ? suggestion.targetMuscleGroups.sort().join('-')
      : 'general';

    insights.push({
      id: this.generateInsightId('suggestion', suggestionKey),
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
   * Merge rule-based and AI insights, removing duplicates
   * 
   * Deduplication strategy:
   * - If insights have the same type and similar content, keep the AI version
   * - AI insights get priority for progressive overload and recovery suggestions
   * - Rule-based insights retained for streaks and muscle balance
   * 
   * @param ruleInsights - Rule-based insights
   * @param aiInsights - AI-generated insights
   * @returns Merged array of insights without duplicates
   */
  private mergeInsights(
    ruleInsights: CoachingInsight[],
    aiInsights: CoachingInsight[]
  ): CoachingInsight[] {
    // Start with all AI insights (they take priority)
    const merged = [...aiInsights];

    // Track insight types we've seen from AI
    const aiInsightTypes = new Set(aiInsights.map(insight => insight.type));

    // Add rule-based insights that don't conflict with AI insights
    for (const ruleInsight of ruleInsights) {
      // For these types, AI insights replace rule-based ones
      const aiReplacesRule = ['progression', 'recovery', 'motivation'].includes(ruleInsight.type);

      if (aiReplacesRule && aiInsightTypes.has(ruleInsight.type)) {
        // Skip this rule-based insight - AI version already included
        logger.log(`[CoachingService] Skipping rule-based ${ruleInsight.type} insight (AI version available)`);
        continue;
      }

      // For streak and muscle-balance insights, keep rule-based (more reliable)
      // Also keep rule-based insights when no AI equivalent exists
      merged.push(ruleInsight);
    }

    logger.log('[CoachingService] Merged insights', {
      aiCount: aiInsights.length,
      ruleCount: ruleInsights.length,
      mergedCount: merged.length
    });

    return merged;
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
