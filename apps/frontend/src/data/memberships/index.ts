/**
 * Catalog Memberships Index
 * Aggregates all catalog memberships from individual files
 */

import { GENERAL_FITNESS_MEMBERSHIPS } from './generalFitness';
import { WOMEN_HEALTH_MEMBERSHIPS } from './womenHealth';
import { AIKIDO_MEMBERSHIPS } from './aikido';
import { TAI_CHI_MEMBERSHIPS } from './taiChi';
import { ZUMBA_MEMBERSHIPS } from './zumba';
import type { CatalogMembership } from '../../types';

/**
 * All catalog memberships from all catalogs
 * Total: 141 memberships (for 134 unique exercises)
 * - Original catalogs: 94 memberships
 * - CSV import (Nov 2025): 47 memberships
 */
export const ALL_CATALOG_MEMBERSHIPS: CatalogMembership[] = [
  ...GENERAL_FITNESS_MEMBERSHIPS,
  ...WOMEN_HEALTH_MEMBERSHIPS,
  ...AIKIDO_MEMBERSHIPS,
  ...TAI_CHI_MEMBERSHIPS,
  ...ZUMBA_MEMBERSHIPS
];

/**
 * Get memberships for a specific catalog
 * @param catalogId - The catalog ID
 * @returns Array of memberships for that catalog
 */
export function getMembershipsByCatalog(catalogId: string): CatalogMembership[] {
  return ALL_CATALOG_MEMBERSHIPS.filter(m => m.catalog_id === catalogId);
}

/**
 * Get memberships for a specific exercise
 * @param exerciseId - The exercise ID
 * @returns Array of memberships for that exercise across all catalogs
 */
export function getMembershipsByExercise(exerciseId: string): CatalogMembership[] {
  return ALL_CATALOG_MEMBERSHIPS.filter(m => m.exercise_id === exerciseId);
}

// Re-export individual membership collections
export {
  GENERAL_FITNESS_MEMBERSHIPS,
  WOMEN_HEALTH_MEMBERSHIPS,
  AIKIDO_MEMBERSHIPS,
  TAI_CHI_MEMBERSHIPS,
  ZUMBA_MEMBERSHIPS
};
