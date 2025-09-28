import type { ExerciseCatalog } from '../types';

/**
 * Exercise catalog definitions - supporting multi-catalog system
 *
 * Each catalog represents a specialized collection of exercises:
 * - General Fitness: The default catalog with core exercises
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
    pictureUrl: '/images/catalogs/general-fitness-square.png'
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
    pictureUrl: '/images/catalogs/women-health-square.png'
  },
  {
    id: 'tai-chi',
    nameKey: 'tai-chi.name',
    descriptionKey: 'tai-chi.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 2,
    icon: 'tai-chi',
    colorTheme: 'green',
    pictureUrl: '/images/catalogs/tai-chi-square.png'
  },
  {
    id: 'zumba',
    nameKey: 'zumba.name',
    descriptionKey: 'zumba.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 3,
    icon: 'dance',
    colorTheme: 'purple',
    pictureUrl: '/images/catalogs/zumba-square.png'
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