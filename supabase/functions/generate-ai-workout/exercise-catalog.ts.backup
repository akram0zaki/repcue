/**
 * Exercise Catalog Fetcher
 *
 * Fetches exercises from Supabase database for AI workout generation.
 * Includes all exercise attributes needed for intelligent workout planning.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo, logDebug } from './logger.ts';

/**
 * Exercise data structure (matches frontend Exercise type)
 */
export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: string;
  exercise_type: 'time_based' | 'repetition_based';
  catalogId: string;
  default_duration?: number;
  default_sets?: number;
  default_reps?: number;
  rep_duration_seconds?: number;
  tags: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed?: string[];
  muscle_groups?: string[];
  benefits?: string;
  limitations?: string;
  best_timing?: string;
  suggested_combinations?: string[];
  notes?: string;
}

/**
 * Fetches exercises from Supabase database
 *
 * @param correlationId - Correlation ID for logging
 * @returns Array of exercises from all catalogs (excluding user-created/deleted exercises)
 */
export async function fetchExerciseCatalog(correlationId: string): Promise<Exercise[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logError(correlationId, 'Missing Supabase environment variables', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logDebug(correlationId, 'Fetching exercises from database', {});

    // Fetch all built-in exercises (exclude user-created, only get non-deleted)
    // Built-in exercises have owner_id = null
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .is('owner_id', null) // Only built-in exercises
      .eq('deleted', false) // Only active exercises
      .order('name');

    if (error) {
      logError(correlationId, 'Failed to fetch exercises from database', {
        error: error.message,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }

    if (!exercises || exercises.length === 0) {
      logError(correlationId, 'No exercises found in database', {});
      throw new Error('Exercise catalog is empty');
    }

    logInfo(correlationId, 'Successfully fetched exercises from database', {
      count: exercises.length
    });

    // Map database records to Exercise interface
    const mappedExercises: Exercise[] = exercises.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      description: ex.description,
      category: ex.category,
      exercise_type: ex.exercise_type,
      catalogId: ex.catalogId || 'general-fitness',
      default_duration: ex.default_duration,
      default_sets: ex.default_sets,
      default_reps: ex.default_reps,
      rep_duration_seconds: ex.rep_duration_seconds,
      tags: ex.tags || [],
      difficulty_level: ex.difficulty_level,
      equipment_needed: ex.equipment_needed || [],
      muscle_groups: ex.muscle_groups || [],
      benefits: ex.benefits,
      limitations: ex.limitations,
      best_timing: ex.best_timing,
      suggested_combinations: ex.suggested_combinations || [],
      notes: ex.notes
    }));

    return mappedExercises;

  } catch (error) {
    logError(correlationId, 'Error fetching exercise catalog', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Filters exercises based on user profile and constraints
 *
 * @param exercises - All available exercises
 * @param userProfile - User's profile data
 * @param correlationId - Correlation ID for logging
 * @returns Filtered exercises suitable for the user
 */
export function filterExercisesForUser(
  exercises: Exercise[],
  userProfile: {
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    injuries?: string;
    goal: string;
    trainingStyle: 'strength' | 'cardio' | 'balanced';
  },
  correlationId: string
): Exercise[] {
  logDebug(correlationId, 'Filtering exercises for user', {
    totalExercises: exercises.length,
    fitnessLevel: userProfile.fitnessLevel,
    hasInjuries: !!userProfile.injuries,
    goal: userProfile.goal,
    trainingStyle: userProfile.trainingStyle
  });

  let filtered = [...exercises];

  // Filter by fitness level (include same level and below)
  const levelHierarchy = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  const userLevel = levelHierarchy[userProfile.fitnessLevel];

  filtered = filtered.filter(ex => {
    if (!ex.difficulty_level) return true; // Include exercises without difficulty level
    const exerciseLevel = levelHierarchy[ex.difficulty_level];
    return exerciseLevel <= userLevel;
  });

  // Filter by training style
  if (userProfile.trainingStyle === 'strength') {
    filtered = filtered.filter(ex =>
      ex.category === 'strength' || ex.category === 'core' || ex.category === 'balance'
    );
  } else if (userProfile.trainingStyle === 'cardio') {
    filtered = filtered.filter(ex =>
      ex.category === 'cardio' || ex.category === 'flexibility'
    );
  }
  // For 'balanced', include all categories

  // Filter by injuries (if specified)
  // This is a simplified version; AI will do more sophisticated filtering via prompt
  if (userProfile.injuries && userProfile.injuries.trim().length > 0) {
    const injuries = userProfile.injuries.toLowerCase();

    filtered = filtered.filter(ex => {
      // Check if exercise has limitations that mention the injury
      if (ex.limitations) {
        const limitations = ex.limitations.toLowerCase();
        // Very basic keyword matching (AI will do better)
        if (
          (injuries.includes('knee') && limitations.includes('knee')) ||
          (injuries.includes('back') && limitations.includes('back')) ||
          (injuries.includes('shoulder') && limitations.includes('shoulder')) ||
          (injuries.includes('ankle') && limitations.includes('ankle')) ||
          (injuries.includes('wrist') && limitations.includes('wrist'))
        ) {
          return false; // Exclude exercises with matching limitations
        }
      }
      return true;
    });
  }

  logInfo(correlationId, 'Filtered exercises for user', {
    originalCount: exercises.length,
    filteredCount: filtered.length,
    removed: exercises.length - filtered.length
  });

  return filtered;
}

/**
 * Groups exercises by category for AI context
 *
 * @param exercises - Exercises to group
 * @returns Record of category to exercises
 */
export function groupExercisesByCategory(exercises: Exercise[]): Record<string, Exercise[]> {
  const grouped: Record<string, Exercise[]> = {};

  for (const exercise of exercises) {
    if (!grouped[exercise.category]) {
      grouped[exercise.category] = [];
    }
    grouped[exercise.category].push(exercise);
  }

  return grouped;
}
