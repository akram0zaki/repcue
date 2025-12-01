import type { CatalogMembership } from '../../types';

/**
 * General Fitness Catalog Memberships
 * 
 * Links exercises to the General Fitness catalog with catalog-specific metadata.
 * Total memberships: 64 (26 original + 38 from CSV import Nov 2025)
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
  }),

  // CSV Import - November 2025
  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-plank-rotation',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 27,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kneeling-backward-hip-circles',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 28,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lying-floor-abduction',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 29,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'balance-board',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:balance-board', 'category:balance'],
    display_order: 30,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'hip-swirls',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 31,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'push-up-jack',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 32,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'hip-crunch',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 33,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shin-box',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 34,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'standing-side-crunch-elbow-to-knee',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 35,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-circle-leg-crunch',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 36,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'sitting-lotus-pose-hip-horizontal',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 37,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lying-abduction-leg-raise-on-floor',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 38,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-bridge-bent-leg',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 39,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'leg-pull-side',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 40,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'power-clean-thruster',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:barbell', 'category:strength'],
    display_order: 41,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'snatch-high',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:barbell', 'category:strength'],
    display_order: 42,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'press-under',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:barbell', 'category:strength'],
    display_order: 43,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lever-stepper',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:machine', 'category:cardio'],
    display_order: 44,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'seated-neck-tap',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 45,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'elbow-flexion',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 46,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'side-kick-burpee',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:cardio'],
    display_order: 47,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'butterfly-pull-up',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:pull-up-bar', 'category:strength'],
    display_order: 48,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'front-scoops',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 49,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shoulder-flexion',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 50,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'shoulder-transverse-flexion',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 51,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'forearm-supination',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 52,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'brachialis-pull-up',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:pull-up-bar', 'category:strength'],
    display_order: 53,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'brachialis-narrow-pull-up',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:pull-up-bar', 'category:strength'],
    display_order: 54,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'prayer-push',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 55,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'lying-prone-w-to-y',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 56,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'palm-up-palm-down-rotation',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 57,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'air-twisting-crunch',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 58,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'standing-swimmer',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:flexibility'],
    display_order: 59,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: '3-4-sit-ups',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 60,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'alternate-lying-floor-leg-raise',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core'],
    display_order: 61,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'assisted-lying-leg-raise-with-lateral-throw-down',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:partner', 'category:core'],
    display_order: 62,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'reverse-lunge-leg-kick',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:strength'],
    display_order: 63,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'kneeling-thoracic-spine',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bench', 'category:flexibility'],
    display_order: 64,
    featured: false
  }),

  createMembership({
    id: crypto.randomUUID(),
    exercise_id: 'plank-cross-body-touch',
    catalog_id: 'general-fitness',
    catalog_tags: ['equipment:bodyweight', 'category:core', 'intensity:moderate'],
    display_order: 65,
    featured: false
  })
];
