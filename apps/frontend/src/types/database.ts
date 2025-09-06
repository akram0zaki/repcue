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
  instructions?: ExerciseInstruction[]; // ExerciseInstruction[] for JSONB
  tags?: string[]; // string[] for JSONB  
  muscle_groups?: string[]; // string[] for JSONB
  equipment_needed?: string[]; // string[] for JSONB
};

/**
 * Helper function to transform Exercise data for Supabase insert
 */
export const prepareExerciseForInsert = (exercise: Partial<Exercise>): ExerciseInsert => {
  // Ensure required fields have defaults
  const baseExercise = {
    id: exercise.id ?? crypto.randomUUID(),
    name: exercise.name ?? '',
    category: exercise.category ?? 'core' as const,
    exercise_type: exercise.exercise_type ?? 'repetition_based' as const,
    is_favorite: exercise.is_favorite ?? false,
    tags: exercise.tags ?? [],
    created_at: exercise.created_at ?? new Date().toISOString(),
    updated_at: exercise.updated_at ?? new Date().toISOString(),
    deleted: exercise.deleted ?? false,
    version: exercise.version ?? 1,
  };

  return {
    ...exercise,
    ...baseExercise,
    // Ensure arrays are properly typed for JSONB compatibility
    instructions: exercise.instructions,
    tags: baseExercise.tags,
    muscle_groups: exercise.muscle_groups,
    equipment_needed: exercise.equipment_needed,
  };
};

/**
 * Helper function to transform database result back to Exercise type
 */
export const parseExerciseFromDatabase = (dbExercise: Record<string, unknown>): Exercise => {
  return {
    ...dbExercise,
    // Parse JSONB fields back to their TypeScript types
    instructions: dbExercise.instructions as ExerciseInstruction[],
    tags: dbExercise.tags as string[],
    muscle_groups: dbExercise.muscle_groups as string[],
    equipment_needed: dbExercise.equipment_needed as string[],
  };
};