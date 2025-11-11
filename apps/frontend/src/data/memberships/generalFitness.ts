import type { CatalogMembership } from '../../types';

/**
 * General Fitness Catalog Memberships
 * 
 * Links exercises to the General Fitness catalog with catalog-specific metadata.
 * Total memberships: 26
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
 * General Fitness memberships
 */
export const GENERAL_FITNESS_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'plank',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 1,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-plank',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 2,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'mountain-climbers',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 3,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bicycle-crunches',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 4,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'push-ups',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 5,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'squats',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 6,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lunges',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 7,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'wall-sit',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 8,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'burpees',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 9,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'jumping-jacks',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 10,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'high-knees',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 11,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'butt-kicks',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 12,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'downward-dog',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 13,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'child-pose',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 14,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'cat-cow',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 15,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'single-leg-stand',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:balance'],
    display_order: 16,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'tree-pose',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:balance'],
    display_order: 17,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'warrior-3',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:balance'],
    display_order: 18,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'dead-bug',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 19,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'glute-bridges',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 20,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'finger-roll',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:hand-warmup'],
    display_order: 21,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'tricep-dips',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 22,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'calf-raises',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 23,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'russian-twists',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 24,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bear-crawl',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 25,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'forward-fold',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 26,
    featured: false
  })
];
