import type { Exercise } from '../types';
import { ExerciseCategory } from '../types';
import { GLOBAL_EXERCISES } from './globalExercises';
import { ALL_CATALOG_MEMBERSHIPS } from './memberships';

/**
 * Convert global exercises and memberships back to legacy Exercise format
 * for backward compatibility
 */
function convertToLegacyExercises(): Exercise[] {
  const exerciseMap = new Map<string, Exercise>();
  
  // For each membership, create an Exercise record combining global exercise + membership data
  ALL_CATALOG_MEMBERSHIPS.forEach(membership => {
    const globalExercise = GLOBAL_EXERCISES.find(ex => ex.id === membership.exercise_id);
    if (!globalExercise) return;
    
    // Create a unique key for this exercise-catalog combination
    const key = `${membership.exercise_id}-${membership.catalog_id}`;
    
    // Convert GlobalExercise to Exercise format with catalogId restored
    const legacyExercise: Exercise = {
      ...globalExercise,
      catalogId: membership.catalog_id,
      // Merge base_tags and catalog_tags back into single tags array
      tags: [
        ...(globalExercise.base_tags || []),
        ...(membership.catalog_tags || [])
      ]
    };
    
    exerciseMap.set(key, legacyExercise);
  });
  
  return Array.from(exerciseMap.values());
}

/**
 * All exercises from all catalogs
 * Now generated from global exercises + memberships for the new many-to-many model
 * Maintains backward compatibility by presenting exercises in legacy format
 * 
 * NOTE: This creates duplicate Exercise objects for exercises that belong to multiple catalogs
 * (e.g., an exercise in both General Fitness and Women's Health will appear twice with different catalogIds)
 */
export const INITIAL_EXERCISES: Exercise[] = convertToLegacyExercises();

/**
 * Export global exercises and memberships for new code
 */
export { GLOBAL_EXERCISES, ALL_CATALOG_MEMBERSHIPS };


// Helper functions for exercise management
/**
 * @deprecated Use badge-based filtering instead with getExerciseBadgeValues
 */
export const getExercisesByCategory = (category: ExerciseCategory): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise => 
    exercise.tags?.includes(`category:${category}`)
  );
};

export const getFavoriteExercises = (exercises: Exercise[]): Exercise[] => {
  return exercises.filter(exercise => exercise.is_favorite);
};

export const searchExercises = (exercises: Exercise[], query: string): Exercise[] => {
  const lowercaseQuery = query.toLowerCase();
  return exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(lowercaseQuery) ||
    exercise.description?.toLowerCase().includes(lowercaseQuery) ||
    exercise.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getExerciseById = (exercise_id: string): Exercise | undefined => {
  return INITIAL_EXERCISES.find(exercise => exercise.id === exercise_id);
};

// New catalog-aware helper functions
export const getExercisesByCatalog = (catalogId: string): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise => exercise.catalogId === catalogId);
};

/**
 * @deprecated Use badge-based filtering instead with getExerciseBadgeValues
 */
export const getExercisesByCatalogAndCategory = (catalogId: string, category: ExerciseCategory): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise =>
    exercise.catalogId === catalogId && exercise.tags?.includes(`category:${category}`)
  );
};

export const searchExercisesInCatalog = (catalogId: string, query: string): Exercise[] => {
  const catalogExercises = getExercisesByCatalog(catalogId);
  return searchExercises(catalogExercises, query);
}; 