/**
 * Database-specific type mappings for Supabase operations
 * These types handle the conversion between our TypeScript types and Supabase's Json types
 */

import type { Exercise, ExerciseInstruction } from './index';

/**
 * Type for inserting exercises into Supabase
 * Converts complex types to Json for JSONB columns
 */
export type ExerciseInsert = Omit<Exercise, 'instructions' | 'tags' | 'muscle_groups' | 'equipment_needed'> & {
  instructions?: any; // ExerciseInstruction[] cast to Json
  tags?: any; // string[] cast to Json  
  muscle_groups?: any; // string[] cast to Json
  equipment_needed?: any; // string[] cast to Json
};

/**
 * Helper function to transform Exercise data for Supabase insert
 */
export const prepareExerciseForInsert = (exercise: Partial<Exercise>): ExerciseInsert => {
  return {
    ...exercise,
    // Cast arrays and objects to 'any' for JSONB compatibility
    instructions: exercise.instructions as any,
    tags: exercise.tags as any,
    muscle_groups: exercise.muscle_groups as any,
    equipment_needed: exercise.equipment_needed as any,
  };
};

/**
 * Helper function to transform database result back to Exercise type
 */
export const parseExerciseFromDatabase = (dbExercise: any): Exercise => {
  return {
    ...dbExercise,
    // Parse JSONB fields back to their TypeScript types
    instructions: dbExercise.instructions as ExerciseInstruction[],
    tags: dbExercise.tags as string[],
    muscle_groups: dbExercise.muscle_groups as string[],
    equipment_needed: dbExercise.equipment_needed as string[],
  };
};