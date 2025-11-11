import type { CatalogMembership } from '../../types';

/**
 * Aikido Catalog Memberships
 * 
 * Links exercises to the Aikido catalog with catalog-specific metadata.
 * Total memberships: 16
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
 * Aikido memberships
 */
export const AIKIDO_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'ukemi-basics',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:6', 'stance:tachi'],
    display_order: 1,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'tai-sabaki',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:6', 'stance:tachi'],
    display_order: 2,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shikko',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:6', 'stance:suwari'],
    display_order: 3,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'ikkyo-omote',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:5', 'kyu:6', 'stance:tachi', 'attack:shomen-uchi', 'waza:tachi-waza', 'variant:omote'],
    display_order: 4,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'ikkyo-ura',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:5', 'stance:tachi', 'attack:shomen-uchi', 'variant:ura'],
    display_order: 5,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'nikyo-omote',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:5', 'stance:tachi', 'attack:katate-dori', 'variant:omote'],
    display_order: 6,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'sankyo-omote',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:4', 'stance:tachi', 'attack:katate-dori', 'variant:omote'],
    display_order: 7,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'yonkyo-omote',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:4', 'stance:tachi', 'attack:katate-dori', 'variant:omote'],
    display_order: 8,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kotegaeshi',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:4', 'stance:tachi', 'attack:katate-dori'],
    display_order: 9,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shihonage',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:3', 'stance:tachi', 'attack:ryote-dori'],
    display_order: 10,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'iriminage',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:3', 'stance:tachi', 'attack:yokomen-uchi'],
    display_order: 11,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'tenchinage',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:3', 'stance:tachi', 'attack:katate-dori'],
    display_order: 12,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kokyunage',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:2', 'stance:tachi', 'theme:timing'],
    display_order: 13,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'jiyuwaza-2',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:2', 'stance:mixed', 'sparring:light'],
    display_order: 14,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kaeshiwaza-intro',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:1', 'stance:mixed', 'theme:counters'],
    display_order: 15,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'jiyuwaza-1',
    catalog_id: 'aikido',
    catalog_tags: ['kyu:1', 'stance:mixed', 'sparring:structured'],
    display_order: 16,
    featured: false
  })
];
