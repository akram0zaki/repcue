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
    pictureUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    id: 'tai-chi',
    nameKey: 'tai-chi.name',
    descriptionKey: 'tai-chi.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 1,
    icon: 'tai-chi',
    colorTheme: 'green',
    pictureUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop'
  },
  {
    id: 'zumba',
    nameKey: 'zumba.name',
    descriptionKey: 'zumba.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 2,
    icon: 'dance',
    colorTheme: 'purple',
    pictureUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop'
  },
  {
    id: 'women-health',
    nameKey: 'women-health.name',
    descriptionKey: 'women-health.description',
    isDefault: false,
    isPremium: true,
    displayOrder: 3,
    icon: 'woman',
    colorTheme: 'pink',
    pictureUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop'
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