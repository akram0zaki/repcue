/**
 * Exercise Catalogs - Edge Function Copy
 *
 * IMPORTANT: This file is a duplicate of apps/frontend/src/data/exercises.ts
 * Keep in sync when adding/modifying exercises in the frontend.
 *
 * Why duplicated?
 * - Edge function needs exercises locally (no database dependency)
 * - Faster than querying database on every AI request
 * - Self-contained deployment
 *
 * Future: Migrate to database as single source of truth
 */

import type { Exercise } from './exercise-catalog.ts';
import { GENERAL_FITNESS_EXERCISES } from './exercises/generalFitness.ts';
import { WOMEN_HEALTH_EXERCISES } from './exercises/womenHealth.ts';
import { TAI_CHI_EXERCISES } from './exercises/taiChi.ts';
import { ZUMBA_EXERCISES } from './exercises/zumba.ts';

/**
 * Catalog metadata with access control flags
 */
export const CATALOG_METADATA = {
  'general-fitness': {
    name: 'General Fitness',
    isPremium: false,
    description: 'Core exercises for all fitness levels',
    exercises: GENERAL_FITNESS_EXERCISES
  },
  'women-health': {
    name: "Women's Health",
    isPremium: true,
    description: 'Specialized exercises for women\'s wellness',
    exercises: WOMEN_HEALTH_EXERCISES
  },
  'tai-chi': {
    name: 'Tai Chi',
    isPremium: true,
    description: 'Traditional Chinese martial art for mind-body wellness',
    exercises: TAI_CHI_EXERCISES
  },
  'zumba': {
    name: 'Zumba',
    isPremium: true,
    description: 'Dance fitness program with Latin-inspired music',
    exercises: ZUMBA_EXERCISES
  }
} as const;

export type CatalogId = keyof typeof CATALOG_METADATA;

/**
 * All catalog IDs
 */
export const ALL_CATALOGS: CatalogId[] = Object.keys(CATALOG_METADATA) as CatalogId[];

/**
 * Free catalogs (always accessible to all users)
 */
export const FREE_CATALOGS: CatalogId[] = ['general-fitness'];

/**
 * Premium catalogs (require access grant in user_catalog_access table)
 */
export const PREMIUM_CATALOGS: CatalogId[] = ['women-health', 'tai-chi', 'zumba'];

/**
 * All exercises from all catalogs
 */
export const INITIAL_EXERCISES: Exercise[] = [
  ...GENERAL_FITNESS_EXERCISES,
  ...WOMEN_HEALTH_EXERCISES,
  ...TAI_CHI_EXERCISES,
  ...ZUMBA_EXERCISES
];

/**
 * Get exercises by catalog ID
 */
export function getExercisesByCatalog(catalogId: CatalogId): Exercise[] {
  const catalog = CATALOG_METADATA[catalogId];
  return catalog ? [...catalog.exercises] : [];
}

/**
 * Get exercises from multiple catalogs
 */
export function getExercisesFromCatalogs(catalogIds: CatalogId[]): Exercise[] {
  const exercises: Exercise[] = [];

  for (const catalogId of catalogIds) {
    const catalog = CATALOG_METADATA[catalogId];
    if (catalog) {
      exercises.push(...catalog.exercises);
    }
  }

  return exercises;
}

/**
 * Check if a catalog is premium
 */
export function isPremiumCatalog(catalogId: string): boolean {
  return PREMIUM_CATALOGS.includes(catalogId as CatalogId);
}
