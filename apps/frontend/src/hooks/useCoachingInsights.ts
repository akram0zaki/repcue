/**
 * useCoachingInsights Hook
 * 
 * Custom React hook to fetch and manage coaching insights.
 * Handles loading states, error states, and insight refresh logic.
 * 
 * Features:
 * - Fetch all insights or filter by type
 * - Loading and error state management
 * - Manual refresh capability
 * - Dismiss insights
 * - Cache management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoachingInsight, InsightType } from '../types/coaching';
import type { AppSettings } from '../types';
import { CoachingService } from '../services/coachingService';
import logger from '../utils/logger';

interface UseCoachingInsightsOptions {
  type?: InsightType;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  settings?: AppSettings; // App settings for filtering
  enableAI?: boolean; // Enable AI-powered insights (requires authentication)
}

interface UseCoachingInsightsReturn {
  insights: CoachingInsight[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  dismissInsight: (insightId: string) => void;
  clearCache: () => void;
}

/**
 * Hook to fetch and manage coaching insights
 */
export const useCoachingInsights = (
  options: UseCoachingInsightsOptions = {}
): UseCoachingInsightsReturn => {
  const { type, autoRefresh = false, refreshInterval = 5 * 60 * 1000, settings, enableAI = false } = options;
  const { i18n } = useTranslation();

  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const coachingService = CoachingService.getInstance();

  // Get user's current language for AI responses
  const userLocale = i18n.language || 'en';

  /**
   * Memoize settings-based filter criteria to avoid recalculating on every render
   * Only recalculates when settings actually change
   */
  const filterCriteria = useMemo(() => {
    if (!settings) return null;
    
    return {
      enabled: settings.coach_enabled !== false,
      showStreak: settings.coach_show_streak !== false,
      showMuscleBalance: settings.coach_show_muscle_balance !== false,
      showProgression: settings.coach_show_progression !== false,
      showRecovery: settings.coach_show_recovery !== false,
      showSuggestions: settings.coach_show_suggestions !== false
    };
  }, [
    settings?.coach_enabled,
    settings?.coach_show_streak,
    settings?.coach_show_muscle_balance,
    settings?.coach_show_progression,
    settings?.coach_show_recovery,
    settings?.coach_show_suggestions
  ]);

  /**
   * Filter insights based on settings (memoized criteria)
   */
  const filterInsightsBySettings = useCallback((insights: CoachingInsight[]): CoachingInsight[] => {
    if (!filterCriteria) return insights;

    // If coach is disabled, return empty array
    if (!filterCriteria.enabled) {
      return [];
    }

    // Filter by enabled insight types using memoized criteria
    return insights.filter(insight => {
      switch (insight.type) {
        case 'streak':
        case 'milestone':
          return filterCriteria.showStreak;
        case 'muscle-balance':
          return filterCriteria.showMuscleBalance;
        case 'progression':
        case 'personal-record':
          return filterCriteria.showProgression;
        case 'recovery':
          return filterCriteria.showRecovery;
        case 'suggestion':
        case 'motivation':
          return filterCriteria.showSuggestions;
        default:
          return true; // Show unknown types by default
      }
    });
  }, [filterCriteria]);

  /**
   * Fetch insights from service
   */
  const fetchInsights = useCallback(async (forceRefresh: boolean = false, clearDismissals: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      let fetchedInsights: CoachingInsight[];

      if (type) {
        // Fetch specific type (this will use cached data from getAllInsights)
        fetchedInsights = await coachingService.getInsightsByType(type);
      } else {
        // Fetch all insights - use AI-enhanced if enabled
        if (enableAI) {
          fetchedInsights = await coachingService.getAIEnhancedInsights(forceRefresh, true, userLocale, clearDismissals);
        } else {
          fetchedInsights = await coachingService.getAllInsights(forceRefresh, clearDismissals);
        }
      }

      // Apply settings-based filtering
      const filteredInsights = filterInsightsBySettings(fetchedInsights);

      setInsights(filteredInsights);
      logger.log(`Fetched ${filteredInsights.length} coaching insights${type ? ` of type ${type}` : ''}${enableAI ? ' (AI-enhanced)' : ''} (${fetchedInsights.length} before filtering)`);
      logger.log(`Insight IDs: ${filteredInsights.map(i => `${i.id} (${i.source})`).join(', ')}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch insights');
      setError(error);
      logger.error('Error fetching coaching insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [type, coachingService, filterInsightsBySettings, enableAI, userLocale]);

  /**
   * Refresh insights (force refresh)
   */
  const refresh = useCallback(async () => {
    await fetchInsights(true, true); // Force refresh AND clear dismissals
  }, [fetchInsights]);

  /**
   * Dismiss an insight
   */
  const dismissInsight = useCallback((insightId: string) => {
    coachingService.dismissInsight(insightId);
    
    // Update local state
    setInsights(prevInsights => 
      prevInsights.filter(insight => insight.id !== insightId)
    );

    logger.log(`Dismissed insight: ${insightId}`);
  }, [coachingService]);

  /**
   * Clear cache and refresh
   */
  const clearCache = useCallback(() => {
    coachingService.clearCache();
    logger.log('Cleared coaching insights cache');
  }, [coachingService]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchInsights(false);
  }, [fetchInsights]);

  /**
   * Auto-refresh if enabled
   */
  useEffect(() => {
    // Check if auto-refresh is enabled in settings (if provided)
    const shouldAutoRefresh = settings?.coach_auto_refresh ?? autoRefresh;
    
    if (!shouldAutoRefresh) return;

    // Use refresh interval from settings if provided
    const interval = settings?.coach_refresh_interval ?? refreshInterval;

    const intervalId = setInterval(() => {
      logger.log('Auto-refreshing coaching insights');
      fetchInsights(false);
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, fetchInsights, settings]);

  return {
    insights,
    isLoading,
    error,
    refresh,
    dismissInsight,
    clearCache
  };
};

/**
 * Hook to fetch top insight only (for HomePage display)
 */
export const useTopInsight = (settings?: AppSettings): {
  insight: CoachingInsight | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  dismissInsight: (insightId: string) => void;
} => {
  const [insight, setInsight] = useState<CoachingInsight | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const coachingService = CoachingService.getInstance();

  /**
   * Memoize type enablement check to avoid recalculation on every render
   */
  const isTypeEnabled = useCallback((insightType: InsightType): boolean => {
    if (!settings) return true;
    
    switch (insightType) {
      case 'streak':
      case 'milestone':
        return settings.coach_show_streak !== false;
      case 'muscle-balance':
        return settings.coach_show_muscle_balance !== false;
      case 'progression':
      case 'personal-record':
        return settings.coach_show_progression !== false;
      case 'recovery':
        return settings.coach_show_recovery !== false;
      case 'suggestion':
      case 'motivation':
        return settings.coach_show_suggestions !== false;
      default:
        return true;
    }
  }, [
    settings?.coach_show_streak,
    settings?.coach_show_muscle_balance,
    settings?.coach_show_progression,
    settings?.coach_show_recovery,
    settings?.coach_show_suggestions
  ]);

  const fetchTopInsight = useCallback(async (forceRefresh: boolean = false, clearDismissals: boolean = false) => {
    try {
      // If coach is disabled, don't fetch
      if (settings?.coach_enabled === false) {
        setInsight(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // First refresh cache if requested
      if (forceRefresh) {
        await coachingService.getAllInsights(true, clearDismissals);
      }

      const topInsight = await coachingService.getTopInsight();
      
      // Check if top insight type is enabled in settings (using memoized callback)
      if (topInsight) {
        const enabled = isTypeEnabled(topInsight.type);
        setInsight(enabled ? topInsight : null);
      } else {
        setInsight(topInsight);
      }
      
      logger.log('Fetched top coaching insight');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch top insight');
      setError(error);
      logger.error('Error fetching top insight:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coachingService, settings?.coach_enabled, isTypeEnabled]);

  const refresh = useCallback(async () => {
    await fetchTopInsight(true, true); // Force refresh AND clear dismissals
  }, [fetchTopInsight]);

  /**
   * Dismiss the current top insight
   */
  const dismissInsight = useCallback((insightId: string) => {
    coachingService.dismissInsight(insightId);

    // Clear the insight from local state
    setInsight(null);

    logger.log(`Dismissed top insight: ${insightId}`);
  }, [coachingService]);

  useEffect(() => {
    fetchTopInsight(false);
  }, [fetchTopInsight]);

  return {
    insight,
    isLoading,
    error,
    refresh,
    dismissInsight
  };
};

export default useCoachingInsights;
