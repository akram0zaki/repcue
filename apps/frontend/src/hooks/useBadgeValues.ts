/**
 * useBadgeValues Hook
 * 
 * Custom hook for memoized badge value discovery.
 * Provides performance optimization through caching and regex compilation.
 */

import { useMemo, useEffect, useState } from 'react';
import type { Exercise, CatalogBadge, BadgeValue } from '../types';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import type { ExerciseMediaIndex } from '../types/media';

/**
 * Hook for retrieving badge values with memoization for performance
 * 
 * This hook handles three types of badges:
 * 1. Predefined static badges (values provided in badge definition)
 * 2. Dynamic discovery badges (values discovered from exercise tags)
 * 3. Computed badges (read-only, derived from other exercise data)
 * 
 * @param exercises - Array of all exercises to scan for values
 * @param catalogId - The catalog ID to filter exercises
 * @param badge - The badge definition
 * @returns Array of badge values (either predefined or discovered)
 * 
 * @example
 * // For predefined badge
 * const kyuValues = useBadgeValues(exercises, 'aikido', kyuLevelBadge);
 * // Returns: [{ id: 1, label: '...' }, { id: 2, label: '...' }, ...]
 * 
 * @example
 * // For dynamic discovery badge
 * const formValues = useBadgeValues(exercises, 'tai-chi', formBadge);
 * // Returns: [{ id: 'yang-24', label: '...', fallbackLabel: 'yang-24' }, ...]
 * 
 * @example
 * // For computed badge
 * const videoValues = useBadgeValues(exercises, 'general-fitness', hasVideoBadge);
 * // Returns: [{ id: 'yes', label: '...' }, { id: 'no', label: '...' }]
 */
export function useBadgeValues(
  exercises: Exercise[],
  catalogId: string,
  badge: CatalogBadge
): BadgeValue[] {
  // Load media index once so computed badges (like hasVideo) can reflect real availability
  const [mediaIndex, setMediaIndex] = useState<ExerciseMediaIndex | null>(null);
  useEffect(() => {
    let mounted = true;
    loadExerciseMedia().then(idx => { if (mounted) setMediaIndex(idx); }).catch(() => { if (mounted) setMediaIndex({} as ExerciseMediaIndex); });
    return () => { mounted = false; };
  }, []);
  // Compile regex once and reuse (cost control for extractPattern)
  // Only recompile if badge changes
  const compiledRegex = useMemo(() => {
    return badge.tagPattern?.extractPattern || null;
  }, [badge.id]); // Cache key: only recompile when badge ID changes

  return useMemo(() => {
    // If values are predefined and not dynamic, return them
    if (badge.values && !badge.dynamicDiscovery && !badge.computed) {
      return badge.values;
    }

    // Handle computed badges (read-only, derived from other data)
    if (badge.computed) {
      return computeBadgeValues(exercises, catalogId, badge, mediaIndex);
    }

    // Discover values from tags
    const { tagPattern } = badge;
    if (!tagPattern) return badge.values || [];

    const discoveredValues = new Set<string>();
    const { prefix = '' } = tagPattern;

    for (const exercise of exercises) {
      if (exercise.catalogId !== catalogId) continue;

      for (const tag of exercise.tags || []) {
        let value: string;

        if (compiledRegex) {
          const match = tag.match(compiledRegex);
          if (!match || !match[1]) continue;
          value = match[1];
        } else if (prefix) {
          if (!tag.startsWith(prefix)) continue;
          value = tag.substring(prefix.length);
        } else {
          value = tag;
        }

        discoveredValues.add(value);
      }
    }

    // Convert to badge values with i18n keys
    return Array.from(discoveredValues)
      .sort()
      .map(value => ({
        id: value,
        label: `catalogs:${catalogId}.badges.${badge.id}.values.${value}`,
        fallbackLabel: value
      }));
  }, [exercises, catalogId, badge.id, badge.values, badge.dynamicDiscovery, badge.computed, compiledRegex]);
}

/**
 * Helper function to compute badge values from exercise data
 * 
 * Handles read-only badges that are derived from other exercise properties
 * rather than stored explicitly in tags.
 * 
 * @param exercises - Array of exercises to analyze
 * @param catalogId - Catalog ID to filter exercises
 * @param badge - Badge definition with computed: true
 * @returns Array of computed badge values
 */
function computeBadgeValues(
  exercises: Exercise[],
  catalogId: string,
  badge: CatalogBadge,
  mediaIndex: ExerciseMediaIndex | null
): BadgeValue[] {
  const values = new Set<string>();

  for (const exercise of exercises) {
    if (exercise.catalogId !== catalogId) continue;

    // Handle different computed badge types
    switch (badge.id) {
      case 'hasVideo':
        // Derived from real availability: custom_video_url OR media index entry (R2/legacy)
        if (exercise.custom_video_url || (mediaIndex && !!mediaIndex[exercise.id])) {
          values.add('yes');
        } else {
          values.add('no');
        }
        break;

      case 'durationRange':
        // Derived from default_duration field
        if (exercise.default_duration) {
          const mins = Math.floor(exercise.default_duration / 60);
          if (mins < 5) values.add('0-5min');
          else if (mins < 15) values.add('5-15min');
          else if (mins < 30) values.add('15-30min');
          else values.add('30min+');
        }
        break;

      case 'difficultyLevel':
        // Derived from difficulty_level field
        if (exercise.difficulty_level) {
          values.add(exercise.difficulty_level);
        }
        break;

      // Add more computed badge types as needed
      default:
        // Unknown computed badge type - return empty
        break;
    }
  }

  // Convert to badge values with i18n keys
  return Array.from(values)
    .sort()
    .map(value => ({
      id: value,
      label: `catalogs:${catalogId}.badges.${badge.id}.values.${value}`,
      fallbackLabel: value
    }));
}

