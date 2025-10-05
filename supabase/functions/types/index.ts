/**
 * Shared types for Supabase Edge Functions
 * Subset of types from apps/frontend/src/types/index.ts
 */

// Sync metadata for exercises
export interface SyncMetadata {
  id: string;
  owner_id?: string | null;
  updated_at: string;
  deleted: boolean;
  version: number;
  created_at: string;
  dirty?: number;
  op?: 'upsert' | 'delete' | 'seed';
  synced_at?: string;
}

// Exercise types
export const ExerciseType = {
  TIME_BASED: 'time_based',
  REPETITION_BASED: 'repetition_based'
} as const;

export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

// Exercise instruction structure
export interface ExerciseInstruction {
  step: number;
  text: string;
  image_url?: string;
  duration_seconds?: number;
}

// Exercise categories
export const ExerciseCategory = {
  CORE: 'core',
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  HAND_WARMUP: 'hand-warmup'
} as const;

export type ExerciseCategory = typeof ExerciseCategory[keyof typeof ExerciseCategory];

// Core exercise interface
export interface Exercise extends SyncMetadata {
  name: string;
  description?: string;
  category: ExerciseCategory;
  exercise_type: ExerciseType;
  catalogId: string;
  default_duration?: number;
  default_sets?: number;
  default_reps?: number;
  rep_duration_seconds?: number;
  has_video?: boolean;
  is_favorite: boolean;
  tags: string[];
  instructions?: ExerciseInstruction[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed?: string[];
  muscle_groups?: string[];
  is_public?: boolean;
  is_verified?: boolean;
  custom_video_url?: string;
  rating_average?: number;
  rating_count?: number;
  copy_count?: number;
  benefits?: string;
  limitations?: string;
  best_timing?: string;
  suggested_combinations?: string[];
  notes?: string;
  exercise_references?: string[];
  is_shared_reference?: boolean;
  shared_at?: string;
}
