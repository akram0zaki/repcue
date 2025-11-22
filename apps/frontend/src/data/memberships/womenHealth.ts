import type { CatalogMembership } from '../../types';

/**
 * Women's Health Catalog Memberships
 * 
 * Links exercises to the Women's Health catalog with catalog-specific metadata.
 * Total memberships: 50 (40 original + 10 from CSV import Nov 2025)
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
 * Women's Health memberships
 */
export const WOMEN_HEALTH_MEMBERSHIPS: CatalogMembership[] = [
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'chair-squat',
    catalog_id: 'women-health',
    catalog_tags: ['category:strength'],
    display_order: 1,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'wall-push-up',
    catalog_id: 'women-health',
    catalog_tags: ['category:strength'],
    display_order: 2,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'glute-bridges',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 3,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'desk-plank',
    catalog_id: 'women-health',
    catalog_tags: ['category:core'],
    display_order: 4,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bird-dog',
    catalog_id: 'women-health',
    catalog_tags: ['category:core'],
    display_order: 5,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lunges',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 6,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'calf-raises',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 7,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'modified-push-up',
    catalog_id: 'women-health',
    catalog_tags: ['category:strength'],
    display_order: 8,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'arm-circles',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 9,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'step-up-stair',
    catalog_id: 'women-health',
    catalog_tags: ['category:strength'],
    display_order: 10,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'neck-rolls',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 11,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shoulder-rolls',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 12,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'cat-cow',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 13,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-spinal-twist',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 14,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'hamstring-stretch',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 15,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'calf-stretch',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 16,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'quad-stretch',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 17,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'hip-opener',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 18,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'chest-opener',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 19,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-stretch',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 20,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'marching-in-place',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 21,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'step-touch',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 22,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'jumping-jacks-modified',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 23,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'butt-kicks',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 24,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'high-knees',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 25,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-steps-cardio',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 26,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-cardio-arm-pumps',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 27,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'dance-moves-basic',
    catalog_id: 'women-health',
    catalog_tags: ['category:cardio'],
    display_order: 28,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'single-leg-stand',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:balance'],
    display_order: 29,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'heel-to-toe-walk',
    catalog_id: 'women-health',
    catalog_tags: ['category:balance'],
    display_order: 30,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'balance-hold-arm-raise',
    catalog_id: 'women-health',
    catalog_tags: ['category:balance'],
    display_order: 31,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-twists',
    catalog_id: 'women-health',
    catalog_tags: ['category:balance'],
    display_order: 32,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'tandem-balance',
    catalog_id: 'women-health',
    catalog_tags: ['category:balance'],
    display_order: 33,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'chair-posture-hold',
    catalog_id: 'women-health',
    catalog_tags: ['category:balance'],
    display_order: 34,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'pelvic-tilts',
    catalog_id: 'women-health',
    catalog_tags: ['category:core'],
    display_order: 35,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kegel-exercise',
    catalog_id: 'women-health',
    catalog_tags: ['category:core'],
    display_order: 36,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'gentle-yoga-menstrual',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 37,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'breathing-exercise',
    catalog_id: 'women-health',
    catalog_tags: ['category:breathing'],
    display_order: 38,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'prenatal-stretch',
    catalog_id: 'women-health',
    catalog_tags: ['category:flexibility'],
    display_order: 39,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'postnatal-core',
    catalog_id: 'women-health',
    catalog_tags: ['category:core'],
    display_order: 40,
    featured: false
  }),

  // CSV Import - November 2025
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lying-back-extension',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 41,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'front-plank-toe-tap',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 42,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'crab-twist-toe-touch',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 43,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'standing-side-crunch',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 44,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bodyweight-side-squat-step',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 45,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'hip-roll-plank',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 46,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'bodyweight-pulse-squat',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 47,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shoulder-rolls',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 48,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-cardio-arm-pumps',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 49,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'heel-to-toe-walk',
    catalog_id: 'women-health',
    catalog_tags: ['equipment:bodyweight', 'category:balance'],
    display_order: 50,
    featured: false
  })
];
