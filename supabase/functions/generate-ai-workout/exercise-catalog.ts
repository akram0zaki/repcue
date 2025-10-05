/**
 * Exercise Catalog Manager with Access Control
 *
 * Fetches exercises based on user's catalog access.
 * Implements granular catalog access control for premium features.
 *
 * Access Rules:
 * - general-fitness: Always accessible (free for all users)
 * - Premium catalogs (women-health, tai-chi, zumba): Require user_catalog_access record
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo, logDebug } from './logger.ts';
import {
  CATALOG_METADATA,
  FREE_CATALOGS,
  PREMIUM_CATALOGS,
  INITIAL_EXERCISES,
  getExercisesFromCatalogs,
  type CatalogId
} from './exercises.ts';

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
 * Fetches exercises based on user's catalog access
 *
 * Access Rules:
 * - general-fitness: Always included (free for all users)
 * - Premium catalogs: Requires record in user_catalog_access table
 *
 * @param userId - User UUID from auth.users
 * @param correlationId - Request correlation ID for logging
 * @returns Array of exercises user has access to
 * @throws Error if no exercises available or access check fails
 */
export async function fetchExerciseCatalog(
  userId: string,
  correlationId: string
): Promise<Exercise[]> {
  try {
    logInfo(correlationId, 'Fetching exercise catalog for user', {
      userId,
      totalExercises: INITIAL_EXERCISES.length,
      totalCatalogs: Object.keys(CATALOG_METADATA).length
    });

    // Step 1: Get user's allowed catalog IDs
    const allowedCatalogIds = await getUserCatalogAccess(userId, correlationId);

    logInfo(correlationId, 'User catalog access retrieved', {
      userId,
      allowedCatalogs: allowedCatalogIds,
      catalogCount: allowedCatalogIds.length
    });

    // Step 2: Get exercises from allowed catalogs
    const allowedExercises = getExercisesFromCatalogs(allowedCatalogIds);

    if (allowedExercises.length === 0) {
      logError(correlationId, 'No exercises available for user', {
        userId,
        allowedCatalogs: allowedCatalogIds
      });
      throw new Error('No exercises available. Please contact support.');
    }

    // Step 3: Log catalog breakdown for debugging
    const catalogBreakdown = allowedCatalogIds.map(catalogId => ({
      catalogId,
      name: CATALOG_METADATA[catalogId]?.name,
      isPremium: CATALOG_METADATA[catalogId]?.isPremium,
      exerciseCount: CATALOG_METADATA[catalogId]?.exercises.length
    }));

    logInfo(correlationId, 'Exercises filtered by catalog access', {
      userId,
      totalExercises: INITIAL_EXERCISES.length,
      allowedExercises: allowedExercises.length,
      catalogsUsed: catalogBreakdown
    });

    return allowedExercises;

  } catch (error) {
    logError(correlationId, 'Failed to fetch exercise catalog', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Gets catalog IDs the user has access to
 *
 * Access Logic:
 * 1. Always include FREE_CATALOGS (general-fitness)
 * 2. Query user_catalog_access for premium catalogs
 * 3. Filter by active access (not expired)
 * 4. Return combined list
 *
 * @param userId - User UUID
 * @param correlationId - Request correlation ID for logging
 * @returns Array of catalog IDs (always includes 'general-fitness')
 */
async function getUserCatalogAccess(
  userId: string,
  correlationId: string
): Promise<CatalogId[]> {
  // Always include free catalogs
  const accessibleCatalogs: CatalogId[] = [...FREE_CATALOGS];

  logDebug(correlationId, 'Starting catalog access check', {
    userId,
    freeCatalogs: FREE_CATALOGS
  });

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logError(correlationId, 'Supabase configuration missing - returning free catalogs only', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return accessibleCatalogs;
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query user's premium catalog access
    // Filter for active access: expires_at IS NULL OR expires_at > now()
    const { data, error } = await supabase
      .from('user_catalog_access')
      .select('catalog_id, expires_at, granted_at, granted_by, notes')
      .eq('owner_id', userId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      // Log error but don't fail - return free catalogs as fallback
      logError(correlationId, 'Failed to query catalog access - returning free catalogs only', {
        userId,
        error: error.message,
        code: error.code
      });
      return accessibleCatalogs;
    }

    // Log query result
    logDebug(correlationId, 'Catalog access query completed', {
      userId,
      recordsFound: data?.length || 0
    });

    // Add premium catalogs user has access to
    if (data && data.length > 0) {
      const premiumCatalogs = data
        .map(row => row.catalog_id as CatalogId)
        .filter(catalogId => PREMIUM_CATALOGS.includes(catalogId));

      if (premiumCatalogs.length > 0) {
        accessibleCatalogs.push(...premiumCatalogs);

        logInfo(correlationId, 'Premium catalog access granted', {
          userId,
          premiumCatalogs,
          grantDetails: data.map(row => ({
            catalog: row.catalog_id,
            grantedBy: row.granted_by,
            grantedAt: row.granted_at,
            expiresAt: row.expires_at,
            notes: row.notes
          }))
        });
      }
    } else {
      logDebug(correlationId, 'No premium catalog access found', {
        userId,
        message: 'User has access to free catalogs only'
      });
    }

  } catch (error) {
    // Catch any unexpected errors - log but return free catalogs as fallback
    logError(correlationId, 'Unexpected error during catalog access check', {
      userId,
      error: error.message,
      stack: error.stack
    });
  }

  return accessibleCatalogs;
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

/**
 * Get catalog metadata for a specific catalog
 *
 * @param catalogId - Catalog identifier
 * @returns Catalog metadata or undefined if not found
 */
export function getCatalogMetadata(catalogId: string) {
  return CATALOG_METADATA[catalogId as CatalogId];
}

/**
 * Check if user has access to a specific catalog
 *
 * @param userId - User UUID
 * @param catalogId - Catalog identifier
 * @param correlationId - Request correlation ID
 * @returns True if user has access, false otherwise
 */
export async function hasUserCatalogAccess(
  userId: string,
  catalogId: CatalogId,
  correlationId: string
): Promise<boolean> {
  const allowedCatalogs = await getUserCatalogAccess(userId, correlationId);
  return allowedCatalogs.includes(catalogId);
}
