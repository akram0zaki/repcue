import type { Exercise } from '../types';
import { ExerciseCategory } from '../types';
import { GENERAL_FITNESS_EXERCISES } from './exercises/generalFitness';
import { WOMEN_HEALTH_EXERCISES } from './exercises/womenHealth';
import { TAI_CHI_EXERCISES } from './exercises/taiChi';
import { ZUMBA_EXERCISES } from './exercises/zumba';

/**
 * All exercises from all catalogs
 * Maintains backward compatibility by re-exporting all exercises as INITIAL_EXERCISES
 */
export const INITIAL_EXERCISES: Exercise[] = [
  ...GENERAL_FITNESS_EXERCISES,
  ...WOMEN_HEALTH_EXERCISES,
  ...TAI_CHI_EXERCISES,
  ...ZUMBA_EXERCISES
];


// Helper functions for exercise management (backward compatible)
export const getExercisesByCategory = (category: ExerciseCategory): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise => exercise.category === category);
};

export const getFavoriteExercises = (exercises: Exercise[]): Exercise[] => {
  return exercises.filter(exercise => exercise.is_favorite);
};

export const searchExercises = (exercises: Exercise[], query: string): Exercise[] => {
  const lowercaseQuery = query.toLowerCase();
  return exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(lowercaseQuery) ||
    exercise.description?.toLowerCase().includes(lowercaseQuery) ||
    exercise.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getExerciseById = (exercise_id: string): Exercise | undefined => {
  return INITIAL_EXERCISES.find(exercise => exercise.id === exercise_id);
};

// New catalog-aware helper functions
export const getExercisesByCatalog = (catalogId: string): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise => exercise.catalogId === catalogId);
};

export const getExercisesByCatalogAndCategory = (catalogId: string, category: ExerciseCategory): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise =>
    exercise.catalogId === catalogId && exercise.category === category
  );
};

export const searchExercisesInCatalog = (catalogId: string, query: string): Exercise[] => {
  const catalogExercises = getExercisesByCatalog(catalogId);
  return searchExercises(catalogExercises, query);
}; 