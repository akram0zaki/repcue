import type { CatalogMembership } from '../../types';

/**
 * Tai Chi Catalog Memberships
 * 
 * Links exercises to the Tai Chi catalog with catalog-specific metadata.
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
 * Tai Chi memberships
 */
export const TAI_CHI_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'commencing-form',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 1,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'parting-wild-horses-mane',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 2,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'white-crane-spreads-wings',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 3,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'brush-knee',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 4,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'wave-hands-clouds',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 5,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'golden-rooster-stand',
    catalog_id: 'tai-chi',
    catalog_tags: ['category:balance'],
    display_order: 6,
    featured: false
  })
];
