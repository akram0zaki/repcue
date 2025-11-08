/**
 * Catalog Badge System Utilities
 * 
 * Provides utility functions for working with catalog badges, including:
 * - Getting badge definitions for a catalog
 * - Discovering badge values from exercises
 * - Matching exercises against badge filters
 * - Extracting badge values for display
 */

import type { Exercise, CatalogBadge, BadgeValue } from '../types';
import { EXERCISE_CATALOGS } from '../data/catalogs';

/**
 * Get all badge definitions for a specific catalog
 * 
 * @param catalogId - The catalog ID (e.g., 'aikido', 'general-fitness')
 * @returns Array of badge definitions, or empty array if catalog not found or has no badges
 * 
 * @example
 * const aikidoBadges = getCatalogBadges('aikido');
 * // Returns: [{ id: 'category', ...}, { id: 'kyuLevel', ... }]
 */
export function getCatalogBadges(catalogId: string): CatalogBadge[] {
  const catalog = EXERCISE_CATALOGS.find(c => c.id === catalogId);
  return catalog?.badges || [];
}

/**
 * Get a specific badge definition from a catalog
 * 
 * @param catalogId - The catalog ID
 * @param badgeId - The badge ID within the catalog
 * @returns Badge definition, or undefined if not found
 */
export function getCatalogBadge(catalogId: string, badgeId: string): CatalogBadge | undefined {
  const badges = getCatalogBadges(catalogId);
  return badges.find(b => b.id === badgeId);
}

/**
 * Helper function to extract category from exercise (supports both legacy field and badge)
 * 
 * This function provides backward compatibility during the migration from the category field
 * to the category badge system.
 * 
 * @param exercise - The exercise to extract category from
 * @returns Category string or null if no category found
 * 
 * @example
 * // Exercise with new badge format
 * getExerciseCategory({ tags: ['category:core', 'equipment:bodyweight'] })
 * // Returns: 'core'
 * 
 * @example
 * // Exercise with legacy field
 * getExerciseCategory({ category: 'strength', tags: [] })
 * // Returns: 'strength'
 */
/**
 * Get the category value from an exercise's tags
 * @deprecated Use getExerciseBadgeValues with badgeId='category' instead
 */
export function getExerciseCategory(exercise: Exercise): string | null {
  // Get category from tags
  if (exercise.tags && exercise.tags.length > 0) {
    const categoryTag = exercise.tags.find(tag => tag.startsWith('category:'));
    if (categoryTag) {
      return categoryTag.substring(9); // Remove 'category:' prefix
    }
  }
  
  return null;
}

/**
 * Get the badge value(s) for a specific badge from an exercise's tags
 * @param exercise - The exercise to extract badge values from
 * @param badgeId - The badge ID to look for (e.g., 'category', 'kyuLevel')
 * @param tagPattern - The tag pattern for the badge (e.g., { prefix: 'category:' })
 * @returns Array of badge value IDs found in the exercise's tags
 * 
 * @example
 * getExerciseBadgeValues(exercise, 'category', { prefix: 'category:' })
 * // Returns: ['core']
 */
export function getExerciseBadgeValues(
  exercise: Exercise,
  _badgeId: string,
  tagPattern: { prefix?: string; suffix?: string; extractPattern?: RegExp }
): Array<string | number> {
  const values: Array<string | number> = [];
  
  if (!exercise.tags || exercise.tags.length === 0) {
    return values;
  }
  
  const { prefix = '', suffix = '', extractPattern } = tagPattern;
  
  for (const tag of exercise.tags) {
    if (extractPattern) {
      const match = tag.match(extractPattern);
      if (match && match[1]) {
        values.push(match[1]);
      }
    } else if (prefix) {
      if (tag.startsWith(prefix)) {
        const value = tag.substring(prefix.length);
        if (suffix && value.endsWith(suffix)) {
          values.push(value.substring(0, value.length - suffix.length));
        } else {
          values.push(value);
        }
      }
    }
  }
  
  return values;
}

/**
 * Check if an exercise matches a badge filter
 * 
 * Uses OR logic within a badge: exercise matches if it has ANY of the selected values.
 * The calling code should use AND logic across different badges.
 * 
 * @param exercise - The exercise to check
 * @param badge - The badge definition
 * @param selectedValues - Set of selected values to match against
 * @returns true if exercise matches (has at least one of the selected values)
 * 
 * @example
 * // Check if exercise matches Kyu level 3 or 4
 * const matches = matchesBadgeFilter(
 *   exercise,
 *   kyuLevelBadge,
 *   new Set([3, 4])
 * );
 */
export function matchesBadgeFilter(
  exercise: Exercise,
  badge: CatalogBadge,
  selectedValues: Set<string | number>
): boolean {
  // No selection means no filter applied
  if (selectedValues.size === 0) return true;
  
  const { tagPattern } = badge;
  if (!tagPattern) return true;
  
  const { prefix = '', suffix = '', extractPattern } = tagPattern;
  const exerciseTags = new Set(exercise.tags || []);
  
  // Check badge values from tags
  
  // Try to find at least one matching tag (OR logic within badge)
  for (const value of selectedValues) {
    if (extractPattern) {
      // Regex-based matching
      for (const tag of exerciseTags) {
        const match = tag.match(extractPattern);
        if (match && match[1] === String(value)) {
          return true;
        }
      }
    } else {
      // Prefix/suffix matching
      const targetTag = `${prefix}${value}${suffix}`;
      if (exerciseTags.has(targetTag)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Discover badge values from exercises
 * 
 * Used for dynamic badges where values aren't predefined.
 * Scans exercise tags and extracts unique values.
 * 
 * @param exercises - Array of exercises to scan
 * @param badge - Badge definition with dynamicDiscovery enabled
 * @param catalogId - Catalog ID to filter exercises
 * @returns Array of discovered badge values
 * 
 * @example
 * // Discover all Tai Chi form values from exercises
 * const formValues = discoverBadgeValues(
 *   exercises,
 *   formBadge, // { dynamicDiscovery: true, tagPattern: { prefix: 'form:' } }
 *   'tai-chi'
 * );
 * // Returns: [{ id: 'yang-24', label: '...', fallbackLabel: 'yang-24' }, ...]
 */
export function discoverBadgeValues(
  exercises: Exercise[],
  badge: CatalogBadge,
  catalogId: string
): BadgeValue[] {
  // If values are predefined and not dynamic, return them
  if (badge.values && !badge.dynamicDiscovery) {
    return badge.values;
  }
  
  // Discover from tags
  const { tagPattern } = badge;
  if (!tagPattern) return badge.values || [];
  
  const discoveredValues = new Set<string>();
  const { prefix = '', extractPattern } = tagPattern;
  
  for (const exercise of exercises) {
    if (exercise.catalogId !== catalogId) continue;
    
    for (const tag of exercise.tags || []) {
      let value: string;
      
      if (extractPattern) {
        const match = tag.match(extractPattern);
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
}

/**
 * Get all badge values for a catalog, including both predefined and discovered values
 * 
 * @param exercises - Array of all exercises
 * @param catalogId - Catalog ID
 * @returns Map of badgeId -> array of badge values
 */
export function getBadgeValuesForCatalog(
  exercises: Exercise[],
  catalogId: string
): Map<string, BadgeValue[]> {
  const badges = getCatalogBadges(catalogId);
  const result = new Map<string, BadgeValue[]>();
  
  for (const badge of badges) {
    if (badge.computed) {
      // Computed badges are handled separately (not stored in this map)
      continue;
    }
    
    const values = badge.dynamicDiscovery
      ? discoverBadgeValues(exercises, badge, catalogId)
      : (badge.values || []);
    
    result.set(badge.id, values);
  }
  
  return result;
}

/**
 * Extract badge values from an exercise for display purposes
 * 
 * Used in ExerciseDetailsPage, StandaloneSharedExercisePage, etc.
 * This function extracts which badge values apply to a specific exercise.
 * 
 * @param exercise - The exercise to extract badges from
 * @param catalogBadges - Badge definitions for the exercise's catalog
 * @returns Array of badge/values pairs to display
 * 
 * @example
 * const exerciseBadges = extractExerciseBadges(exercise, getCatalogBadges('aikido'));
 * // Returns: [
 * //   { badge: categoryBadge, values: [{ id: 'core', label: '...' }] },
 * //   { badge: kyuLevelBadge, values: [{ id: 3, label: '...' }] }
 * // ]
 */
export function extractExerciseBadges(
  exercise: Exercise,
  catalogBadges: CatalogBadge[]
): Array<{ badge: CatalogBadge; values: BadgeValue[] }> {
  const result: Array<{ badge: CatalogBadge; values: BadgeValue[] }> = [];
  
  if (!exercise.tags || exercise.tags.length === 0) {
    return result;
  }
  
  const exerciseTags = new Set(exercise.tags);
  
  for (const badge of catalogBadges) {
    const matchedValues: BadgeValue[] = [];
    const { tagPattern } = badge;
    
    if (!tagPattern) continue;
    
    const { prefix = '', suffix = '', extractPattern } = tagPattern;
    
    // Get all badge values (predefined or discovered)
    const availableValues = badge.values || [];
    
    for (const value of availableValues) {
      let matches = false;
      
      if (extractPattern) {
        // Regex-based matching
        for (const tag of exerciseTags) {
          const match = tag.match(extractPattern);
          if (match && match[1] === String(value.id)) {
            matches = true;
            break;
          }
        }
      } else {
        // Prefix/suffix matching
        const targetTag = `${prefix}${value.id}${suffix}`;
        if (exerciseTags.has(targetTag)) {
          matches = true;
        }
      }
      
      if (matches) {
        matchedValues.push(value);
      }
    }
    
    if (matchedValues.length > 0) {
      result.push({ badge, values: matchedValues });
    }
  }
  
  return result;
}

