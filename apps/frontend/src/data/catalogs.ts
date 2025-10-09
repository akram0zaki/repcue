import type { ExerciseCatalog } from '../types';

/**
 * Exercise catalog definitions - supporting multi-catalog system
 *
 * Each catalog represents a specialized collection of exercises:
 * - General Fitness: The default catalog with core exercises
 * - Women's Health: Specialized exercises for women's wellness
 * - Aikido: Traditional Japanese martial art exercises
 * - Tai Chi: Gentle, flowing movements for balance and flexibility
 * - Zumba: High-energy dance-based cardio exercises
 */

export const EXERCISE_CATALOGS: ExerciseCatalog[] = [
  {
    id: 'general-fitness',
    nameKey: 'general-fitness.name',
    descriptionKey: 'general-fitness.description',
    isDefault: true,
    isPremium: false,
    displayOrder: 0,
    icon: 'fitness',
    colorTheme: 'blue',
    pictureUrl: '/images/catalogs/general-fitness-square.png',
    badges: [
      {
        id: 'category',
        label: 'catalogs:general-fitness.badges.category.label',
        values: [
          { id: 'core', label: 'common:categories.core' },
          { id: 'strength', label: 'common:categories.strength' },
          { id: 'cardio', label: 'common:categories.cardio' },
          { id: 'flexibility', label: 'common:categories.flexibility' },
          { id: 'balance', label: 'common:categories.balance' }
        ],
        tagPattern: { prefix: 'category:' }
      },
      {
        id: 'equipment',
        label: 'catalogs:general-fitness.badges.equipment.label',
        values: [
          { id: 'bodyweight', label: 'catalogs:general-fitness.badges.equipment.values.bodyweight' },
          { id: 'dumbbells', label: 'catalogs:general-fitness.badges.equipment.values.dumbbells' },
          { id: 'resistance-band', label: 'catalogs:general-fitness.badges.equipment.values.resistanceBand' },
          { id: 'none', label: 'catalogs:general-fitness.badges.equipment.values.none' }
        ],
        tagPattern: { prefix: 'equipment:' }
      },
      {
        id: 'intensity',
        label: 'catalogs:general-fitness.badges.intensity.label',
        filterType: 'single',
        values: [
          { id: 'low', label: 'catalogs:general-fitness.badges.intensity.values.low' },
          { id: 'moderate', label: 'catalogs:general-fitness.badges.intensity.values.moderate' },
          { id: 'high', label: 'catalogs:general-fitness.badges.intensity.values.high' }
        ],
        tagPattern: { prefix: 'intensity:' }
      }
    ]
  },
  {
    id: 'women-health',
    nameKey: 'women-health.name',
    descriptionKey: 'women-health.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 1,
    icon: 'woman',
    colorTheme: 'pink',
    pictureUrl: '/images/catalogs/women-health-square.png',
    badges: [
      {
        id: 'category',
        label: 'catalogs:women-health.badges.category.label',
        values: [
          { id: 'core', label: 'common:categories.core' },
          { id: 'strength', label: 'common:categories.strength' },
          { id: 'flexibility', label: 'common:categories.flexibility' },
          { id: 'balance', label: 'common:categories.balance' }
        ],
        tagPattern: { prefix: 'category:' }
      },
      {
        id: 'focus',
        label: 'catalogs:women-health.badges.focus.label',
        values: [
          { id: 'prenatal', label: 'catalogs:women-health.badges.focus.values.prenatal' },
          { id: 'postnatal', label: 'catalogs:women-health.badges.focus.values.postnatal' },
          { id: 'pelvic-floor', label: 'catalogs:women-health.badges.focus.values.pelvicFloor' },
          { id: 'core-strength', label: 'catalogs:women-health.badges.focus.values.coreStrength' }
        ],
        tagPattern: { prefix: 'focus:' }
      }
    ]
  },
  {
    id: 'aikido',
    nameKey: 'aikido.name',
    descriptionKey: 'aikido.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 2,
    icon: 'aikido',
    colorTheme: 'black',
    pictureUrl: '/images/catalogs/aikido-square.png',
    badges: [
      {
        id: 'category',
        label: 'catalogs:aikido.badges.category.label',
        values: [
          { id: 'core', label: 'common:categories.core' },
          { id: 'strength', label: 'common:categories.strength' },
          { id: 'flexibility', label: 'common:categories.flexibility' },
          { id: 'balance', label: 'common:categories.balance' }
        ],
        tagPattern: { prefix: 'category:' }
      },
      {
        id: 'kyuLevel',
        label: 'catalogs:aikido.badges.kyuLevel.label',
        values: [
          { id: 1, label: 'catalogs:aikido.badges.kyuLevel.values.kyu1' },
          { id: 2, label: 'catalogs:aikido.badges.kyuLevel.values.kyu2' },
          { id: 3, label: 'catalogs:aikido.badges.kyuLevel.values.kyu3' },
          { id: 4, label: 'catalogs:aikido.badges.kyuLevel.values.kyu4' },
          { id: 5, label: 'catalogs:aikido.badges.kyuLevel.values.kyu5' },
          { id: 6, label: 'catalogs:aikido.badges.kyuLevel.values.kyu6' }
        ],
        tagPattern: { prefix: 'kyu:' }
      }
    ]
  },
  {
    id: 'tai-chi',
    nameKey: 'tai-chi.name',
    descriptionKey: 'tai-chi.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 3,
    icon: 'tai-chi',
    colorTheme: 'green',
    pictureUrl: '/images/catalogs/tai-chi-square.png',
    badges: [
      {
        id: 'category',
        label: 'catalogs:tai-chi.badges.category.label',
        values: [
          { id: 'flexibility', label: 'common:categories.flexibility' },
          { id: 'balance', label: 'common:categories.balance' }
        ],
        tagPattern: { prefix: 'category:' }
      },
      {
        id: 'form',
        label: 'catalogs:tai-chi.badges.form.label',
        dynamicDiscovery: true,
        tagPattern: {
          prefix: 'form:',
          extractPattern: /^form:(.+)$/
        }
      }
    ]
  },
  {
    id: 'zumba',
    nameKey: 'zumba.name',
    descriptionKey: 'zumba.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 4,
    icon: 'dance',
    colorTheme: 'purple',
    pictureUrl: '/images/catalogs/zumba-square.png',
    badges: [
      {
        id: 'category',
        label: 'catalogs:zumba.badges.category.label',
        values: [
          { id: 'cardio', label: 'common:categories.cardio' }
        ],
        tagPattern: { prefix: 'category:' }
      },
      {
        id: 'style',
        label: 'catalogs:zumba.badges.style.label',
        values: [
          { id: 'salsa', label: 'catalogs:zumba.badges.style.values.salsa' },
          { id: 'merengue', label: 'catalogs:zumba.badges.style.values.merengue' },
          { id: 'reggaeton', label: 'catalogs:zumba.badges.style.values.reggaeton' },
          { id: 'cumbia', label: 'catalogs:zumba.badges.style.values.cumbia' }
        ],
        tagPattern: { prefix: 'style:' }
      }
    ]
  }
];

/**
 * Get the default catalog (General Fitness)
 */
export function getDefaultCatalog(): ExerciseCatalog {
  const defaultCatalog = EXERCISE_CATALOGS.find(catalog => catalog.isDefault);
  if (!defaultCatalog) {
    throw new Error('No default catalog found');
  }
  return defaultCatalog;
}

/**
 * Get catalog by ID
 */
export function getCatalogById(catalogId: string): ExerciseCatalog | undefined {
  return EXERCISE_CATALOGS.find(catalog => catalog.id === catalogId);
}

/**
 * Get all available catalogs sorted by display order
 */
export function getAllCatalogs(): ExerciseCatalog[] {
  return [...EXERCISE_CATALOGS].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get catalogs available to user based on premium status
 */
export function getAvailableCatalogs(isPremiumUser: boolean = false): ExerciseCatalog[] {
  return getAllCatalogs().filter(catalog => !catalog.isPremium || isPremiumUser);
}