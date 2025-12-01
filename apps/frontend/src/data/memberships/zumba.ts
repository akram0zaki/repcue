import type { CatalogMembership } from '../../types';

/**
 * Zumba Catalog Memberships
 * 
 * Links exercises to the Zumba catalog with catalog-specific metadata.
 * Total memberships: 6
 */

/**
 * Helper function to create a membership with default sync metadata
 */
function createMembership(
  membershipData: Omit<
    CatalogMembership,
    'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty' | 'op' | 'synced_at' | 'owner_id'
  >
): CatalogMembership {
  return {
    ...membershipData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: undefined,
    synced_at: undefined,
    owner_id: undefined
  };
}

/**
 * Zumba memberships
 */
export const ZUMBA_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'basic-merengue',
    catalog_id: 'zumba',
    catalog_tags: ['category:cardio'],
    display_order: 1,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'salsa-step',
    catalog_id: 'zumba',
    catalog_tags: ['category:cardio'],
    display_order: 2,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'cumbia-step',
    catalog_id: 'zumba',
    catalog_tags: ['category:cardio'],
    display_order: 3,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'reggaeton-stomp',
    catalog_id: 'zumba',
    catalog_tags: ['category:cardio'],
    display_order: 4,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bachata-step',
    catalog_id: 'zumba',
    catalog_tags: ['category:cardio'],
    display_order: 5,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'cooldown-latin',
    catalog_id: 'zumba',
    catalog_tags: ['category:flexibility'],
    display_order: 6,
    featured: false
  })
];
