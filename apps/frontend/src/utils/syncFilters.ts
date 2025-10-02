/**
 * Sync filtering utilities for RepCue
 *
 * Provides helper methods to determine whether exercises and catalogs should be synced
 * based on their ID format and ownership characteristics.
 */

import type { Exercise, ExerciseCatalog } from '../types';

/**
 * UUID v4 pattern for detecting user-created content
 * User-created exercises and catalogs use UUID format IDs
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Determines if an exercise is a built-in exercise that should never be synced
 *
 * Built-in exercises are characterized by:
 * - String/slug IDs (like "arm-circles", "plank", "basic-merengue")
 * - Always have owner_id = null
 * - Defined in src/data/exercises/*.ts files
 * - Should never be synced to server
 *
 * @param exercise Exercise object or exercise ID string
 * @returns true if the exercise is built-in (should not sync)
 */
export function isBuiltin(exercise: Exercise | string): boolean {
  const exerciseId = typeof exercise === 'string' ? exercise : exercise?.id;

  if (!exerciseId) {
    return false;
  }

  // Built-in exercises have slug IDs, not UUID format
  return !UUID_PATTERN.test(exerciseId);
}

/**
 * Determines if an exercise is user-created and should be synced
 *
 * User-created exercises are characterized by:
 * - UUID v4 format IDs (like "550e8400-e29b-41d4-a716-446655440000")
 * - Have owner_id set to the creating user's UUID
 * - Created through the app interface
 * - Should be synced to server
 *
 * @param exercise Exercise object or exercise ID string
 * @returns true if the exercise is user-created (should sync)
 */
export function isCustom(exercise: Exercise | string): boolean {
  const exerciseId = typeof exercise === 'string' ? exercise : exercise?.id;

  if (!exerciseId) {
    return false;
  }

  // User-created exercises have UUID format IDs
  return UUID_PATTERN.test(exerciseId);
}

/**
 * Determines if an exercise catalog is built-in and should never be synced
 *
 * Built-in catalogs are characterized by:
 * - String IDs (like "general-fitness", "tai-chi", "zumba", "women-health")
 * - Defined in src/data/catalogs.ts
 * - Should never be synced to server
 *
 * @param catalog ExerciseCatalog object or catalog ID string
 * @returns true if the catalog is built-in (should not sync)
 */
export function isBuiltinCatalog(catalog: ExerciseCatalog | string): boolean {
  const catalogId = typeof catalog === 'string' ? catalog : catalog?.id;

  if (!catalogId) {
    return false;
  }

  // Built-in catalogs have string IDs, not UUID format
  return !UUID_PATTERN.test(catalogId);
}

/**
 * Determines if an exercise catalog is user-created and should be synced
 *
 * User-created catalogs are characterized by:
 * - UUID v4 format IDs
 * - Have owner_id set to the creating user's UUID
 * - Created through the app interface
 * - Should be synced to server
 *
 * @param catalog ExerciseCatalog object or catalog ID string
 * @returns true if the catalog is user-created (should sync)
 */
export function isCustomCatalog(catalog: ExerciseCatalog | string): boolean {
  const catalogId = typeof catalog === 'string' ? catalog : catalog?.id;

  if (!catalogId) {
    return false;
  }

  // User-created catalogs have UUID format IDs
  return UUID_PATTERN.test(catalogId);
}

/**
 * Filters an array of exercises to include only syncable (user-created) exercises
 *
 * @param exercises Array of exercises to filter
 * @returns Array containing only user-created exercises that should be synced
 */
export function filterSyncableExercises(exercises: Exercise[]): Exercise[] {
  return exercises.filter(exercise => isCustom(exercise));
}

/**
 * Filters an array of catalogs to include only syncable (user-created) catalogs
 *
 * @param catalogs Array of catalogs to filter
 * @returns Array containing only user-created catalogs that should be synced
 */
export function filterSyncableCatalogs(catalogs: ExerciseCatalog[]): ExerciseCatalog[] {
  return catalogs.filter(catalog => isCustomCatalog(catalog));
}

/**
 * Debug utility to analyze exercise ID patterns in a collection
 * Useful for troubleshooting sync filtering issues
 *
 * @param exercises Array of exercises to analyze
 * @returns Object with counts and examples of different ID patterns
 */
export function analyzeExerciseIdPatterns(exercises: Exercise[]): {
  builtin: { count: number; examples: string[] };
  custom: { count: number; examples: string[] };
  invalid: { count: number; examples: string[] };
} {
  const result = {
    builtin: { count: 0, examples: [] as string[] },
    custom: { count: 0, examples: [] as string[] },
    invalid: { count: 0, examples: [] as string[] }
  };

  for (const exercise of exercises) {
    if (!exercise.id) {
      result.invalid.count++;
      result.invalid.examples.push('(missing ID)');
      continue;
    }

    if (isBuiltin(exercise)) {
      result.builtin.count++;
      if (result.builtin.examples.length < 3) {
        result.builtin.examples.push(exercise.id);
      }
    } else if (isCustom(exercise)) {
      result.custom.count++;
      if (result.custom.examples.length < 3) {
        result.custom.examples.push(exercise.id);
      }
    } else {
      result.invalid.count++;
      if (result.invalid.examples.length < 3) {
        result.invalid.examples.push(exercise.id);
      }
    }
  }

  return result;
}

/**
 * Determines if an exercise was shared with the current user (reference based)
 *
 * Shared exercises are stored in the local exercises table just like user-created
 * ones (keep their original UUID) but ownership remains with the original creator.
 * We identify them client-side using a provided Set of shared exercise IDs that
 * comes from the `useSharedExercises` hook (source of truth = user_favorites refs).
 *
 * This helper intentionally requires the caller to pass in the resolved set of
 * shared exercise IDs so that we avoid hidden global state or repeated DB lookups.
 *
 * @param exercise Exercise object or ID
 * @param sharedExerciseIds A Set of exercise UUIDs that are shared references
 * @returns true if the exercise represents a shared reference for this user
 */
export function isSharedWithMe(
  exercise: Exercise | string,
  sharedExerciseIds: Set<string>
): boolean {
  const exerciseId = typeof exercise === 'string' ? exercise : exercise?.id;
  if (!exerciseId) return false;
  // Only UUIDs can be shared; slug IDs are always built-in.
  if (!isCustom(exerciseId)) return false;
  return sharedExerciseIds.has(exerciseId);
}