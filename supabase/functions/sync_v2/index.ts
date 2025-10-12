// deno-lint-ignore-file no-explicit-any
// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Enhanced logging with correlation ID and per-table status tracking
function logWithContext(correlationId: string, level: string, message: string, data: any = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${correlationId}] [${level}] [COMPREHENSIVE]`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// JWT validation function
async function validateJWT(jwt: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error || !user) {
      console.log('JWT validation failed:', error?.message || 'No user');
      return null;
    }
    return user.id;
  } catch (e) {
    console.log('JWT validation error:', e.message);
    return null;
  }
}

// Allow-list of tables (exercise_catalogs removed - built-in reference data only)
const SYNC_TABLES = [
  'user_preferences',
  'app_settings',
  'exercises',
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions',
  'video_files'
];

// Shared UUID validation pattern (defense-in-depth: prevents any slug / built-in IDs from being processed server-side)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Singleton tables that have one record per user
const SINGLETON_TABLES = [
  'user_preferences',
  'app_settings'
];

const PULL_PAGE_SIZE = 50; // Standard batch size for pulling server changes

// Comprehensive allowlisted fields per table (merging best from both versions)
const MUTABLE_FIELD_ALLOWLIST = {
  user_preferences: new Set([
    'id', 'locale', 'units', 'rep_speed_factor', 'cues', 'favorite_exercises',
    'owner_id', 'created_at', 'updated_at', 'version', 'deleted'
  ]),
  app_settings: new Set([
    'id', 'dark_mode', 'reduce_motion', 'vibration_enabled', 'auto_start_next',
    'default_rest_time', 'beep_interval_seconds', 'beep_volume', 'beep_sound_enabled',
    'pre_timer_countdown', 'show_exercise_videos', 'data_auto_save', 'owner_id',
    'sound_enabled', 'default_interval_duration', 'app_version', 'horizontal_exercise_layout',
    'created_at', 'updated_at', 'version', 'deleted'
  ]),
  exercises: new Set([
    'id', 'name', 'description', 'category', 'exercise_type', 'instructions',
    'rep_duration_seconds', 'is_favorite', 'owner_id', 'created_at', 'updated_at',
    'version', 'deleted', 'is_public', 'is_verified', 'rating_average', 'rating_count',
    'copy_count', 'difficulty_level', 'equipment_needed', 'muscle_groups', 'tags',
    'custom_video_url', 'has_video', 'default_duration', 'default_sets', 'default_reps',
    'catalog_id', 'benefits', 'limitations', 'best_timing', 'suggested_combinations',
    'notes', 'exercise_references'
  ]),
  user_favorites: new Set([
    'id', 'owner_id', 'item_id', 'item_type', 'exercise_type',
    'created_at', 'updated_at', 'version', 'deleted'
  ]),
  workouts: new Set([
    'id', 'name', 'description', 'exercises', 'owner_id', 'created_at', 'updated_at',
    'version', 'deleted', 'is_public', 'is_verified', 'rating_average', 'rating_count',
    'copy_count', 'difficulty_level', 'tags', 'scheduled_days', 'is_active', 'estimated_duration'
  ]),
  activity_logs: new Set([
    'id', 'exercise_id', 'exercise_name', 'workout_id', 'workout_name', 'duration',
    'notes', 'timestamp', 'owner_id', 'created_at', 'updated_at', 'version', 'deleted',
    'is_workout', 'exercises', 'sets_count', 'reps_count', 'catalog_id'
  ]),
  workout_sessions: new Set([
    'id', 'workout_id', 'workout_name', 'start_time', 'end_time', 'total_duration',
    'total_exercises', 'exercises_completed', 'is_completed', 'notes', 'owner_id',
    'created_at', 'updated_at', 'version', 'deleted', 'exercises', 'completion_percentage'
  ]),
  video_files: new Set([
    'id', 'owner_id', 'exercise_id', 'file_name', 'file_data', 'file_size',
    'mime_type', 'upload_pending', 'storage_path', 'created_at', 'updated_at',
    'deleted', 'version'
  ])
};

// Table-specific sync status tracking
interface TableSyncStatus {
  table: string;
  push_attempted: boolean;
  push_success: boolean;
  push_errors: number;
  push_successes: number;
  pull_attempted: boolean;
  pull_success: boolean;
  pull_errors: number;
  pull_records: number;
  error_messages: string[];
}

// Badge tag validation constants
const MAX_TAG_LENGTH = 100;
const MAX_TAGS_PER_EXERCISE = 20;
const TAG_FORMAT_REGEX = /^[a-z0-9-]{1,30}:[a-z0-9-_]{1,50}$/i;

/**
 * Validate and sanitize badge tags array
 * Server-side defense-in-depth validation
 */
function validateAndSanitizeTags(tags: any, correlationId: string): string[] {
  if (!tags) return [];
  
  if (!Array.isArray(tags)) {
    logWithContext(correlationId, 'WARN', 'Tags field is not an array, converting to empty array');
    return [];
  }

  const validTags: string[] = [];

  for (const tag of tags) {
    // Type check
    if (typeof tag !== 'string') {
      logWithContext(correlationId, 'WARN', `Skipping non-string tag`, { tag });
      continue;
    }

    // Length check
    if (tag.length > MAX_TAG_LENGTH) {
      logWithContext(correlationId, 'WARN', `Tag exceeds max length, skipping`, { 
        tag: tag.substring(0, 50) + '...', 
        length: tag.length 
      });
      continue;
    }

    // Format validation (badgeId:value)
    if (!TAG_FORMAT_REGEX.test(tag)) {
      logWithContext(correlationId, 'WARN', `Tag has invalid format, skipping`, { tag });
      continue;
    }

    // XSS prevention - reject tags with dangerous patterns
    const dangerous = /<script|javascript:|on\w+=|data:text\/html|<iframe|eval\(|expression\(/i;
    if (dangerous.test(tag)) {
      logWithContext(correlationId, 'ERROR', `Dangerous pattern detected in tag, rejecting`, { tag });
      continue;
    }

    validTags.push(tag.trim().toLowerCase());
  }

  // Remove duplicates
  const uniqueTags = Array.from(new Set(validTags));

  // Enforce max tag count
  if (uniqueTags.length > MAX_TAGS_PER_EXERCISE) {
    logWithContext(correlationId, 'WARN', `Too many tags, truncating to max`, {
      original: uniqueTags.length,
      max: MAX_TAGS_PER_EXERCISE
    });
    return uniqueTags.slice(0, MAX_TAGS_PER_EXERCISE);
  }

  return uniqueTags;
}

// Filter fields using allow-list for security
function filterAllowedFields(table: string, record: any, correlationId: string): any {
  const allowlist = MUTABLE_FIELD_ALLOWLIST[table];
  if (!allowlist) {
    console.warn(`No allowlist found for table '${table}', rejecting record`);
    return {};
  }
  const scrubbed: any = {};
  for (const [key, value] of Object.entries(record)) {
    if (allowlist.has(key)) {
      // Special handling for tags array in exercises table
      if (table === 'exercises' && key === 'tags') {
        scrubbed[key] = validateAndSanitizeTags(value, correlationId);
      } else {
        scrubbed[key] = value;
      }
    } else {
      console.warn(`Filtered disallowed field '${key}' from ${table} record`);
    }
  }
  return scrubbed;
}

// Enhanced video file upload handling with multiple storage bucket support
async function processVideoFileUpload(supabase: any, record: any, userId: string, correlationId: string): Promise<{ success: boolean; error?: string; updatedRecord?: any }> {
  try {
    const { id, exercise_id, file_name, file_data, file_size, mime_type } = record;

    logWithContext(correlationId, 'INFO', `Processing video upload: ${file_name}`, {
      fileSize: file_size,
      exerciseId: exercise_id,
      dataType: typeof file_data,
      isArray: Array.isArray(file_data)
    });

    // Handle different file data formats
    let uint8Array: Uint8Array;
    if (Array.isArray(file_data)) {
      // Client sent file_data as byte array - convert to Uint8Array
      uint8Array = new Uint8Array(file_data);
    } else if (file_data instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(file_data);
    } else if (file_data instanceof Uint8Array) {
      uint8Array = file_data;
    } else if (typeof file_data === 'string') {
      // Handle base64 encoded data
      const binaryString = atob(file_data);
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    } else {
      throw new Error(`Unsupported file_data type: ${typeof file_data}`);
    }

    logWithContext(correlationId, 'INFO', `File conversion complete. Size: ${uint8Array.length} bytes`);

    // Generate storage path
    const storagePath = `${userId}/${exercise_id}/${file_name}`;

    // Upload to exercise-videos bucket only
    let uploadResult;
    let actualBucket = 'exercise-videos';

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exercise-videos')
        .upload(storagePath, uint8Array, {
          contentType: mime_type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Video upload failed: ${uploadError.message}`);
      }

      uploadResult = uploadData;
    } catch (e) {
      throw new Error(`Storage upload failed: ${e.message}`);
    }

    logWithContext(correlationId, 'INFO', `Storage upload successful: ${uploadResult.path} (bucket: ${actualBucket})`);

    // Create updated record (remove file_data, mark as uploaded)
    const updatedRecord = {
      ...record,
      file_data: null, // Clear the binary data
      upload_pending: false,
      storage_path: uploadResult.path,
      updated_at: new Date().toISOString(),
      version: (record.version || 0) + 1
    };

    // Update exercise's custom_video_url to indicate video is synced
    try {
      const { error: exerciseError } = await supabase
        .from('exercises')
        .update({
          custom_video_url: `blob-video://${exercise_id}/${file_name}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', exercise_id)
        .eq('owner_id', userId);

      if (exerciseError) {
        logWithContext(correlationId, 'WARN', 'Failed to update exercise custom_video_url', { error: exerciseError.message });
        // Don't fail the entire operation for this
      } else {
        logWithContext(correlationId, 'INFO', `Updated exercise custom_video_url to blob-video:// scheme indicating sync complete`);
      }
    } catch (e) {
      logWithContext(correlationId, 'WARN', 'Exception updating exercise custom_video_url', { error: e.message });
    }

    return {
      success: true,
      updatedRecord
    };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', 'Video upload processing failed', { error: e.message });
    return {
      success: false,
      error: e.message
    };
  }
}

// Enforce singleton video file per exercise
async function enforceVideoFileSingleton(supabase: any, userId: string, exerciseId: string, excludeId: string, correlationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    logWithContext(correlationId, 'INFO', `Enforcing video singleton for exercise ${exerciseId}, excluding ${excludeId}`);

    // Find existing video files for this exercise
    const { data: existingVideos, error: queryError } = await supabase
      .from('video_files')
      .select('id, storage_path')
      .eq('owner_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('deleted', false)
      .neq('id', excludeId);

    if (queryError) {
      logWithContext(correlationId, 'ERROR', 'Failed to query existing videos', { error: queryError.message });
      return { success: false, error: queryError.message };
    }

    if (!existingVideos || existingVideos.length === 0) {
      logWithContext(correlationId, 'INFO', 'No existing videos to clean up');
      return { success: true };
    }

    logWithContext(correlationId, 'INFO', `Found ${existingVideos.length} existing videos to remove`);

    // Delete storage files and database records
    for (const video of existingVideos) {
      try {
        // Delete from storage if storage_path exists
        if (video.storage_path) {
          try {
            const { error: storageError } = await supabase.storage
              .from('exercise-videos')
              .remove([video.storage_path]);

            if (!storageError) {
              logWithContext(correlationId, 'INFO', `Deleted storage file: ${video.storage_path}`);
            } else {
              logWithContext(correlationId, 'WARN', `Failed to delete storage file: ${video.storage_path}`, { error: storageError.message });
            }
          } catch (e) {
            logWithContext(correlationId, 'WARN', `Exception deleting storage file: ${video.storage_path}`, { error: e.message });
          }
        }

        // Soft delete database record
        const { error: dbError } = await supabase
          .from('video_files')
          .update({
            deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', video.id);

        if (dbError) {
          logWithContext(correlationId, 'WARN', `Failed to delete video record ${video.id}`, { error: dbError.message });
        } else {
          logWithContext(correlationId, 'INFO', `Successfully deleted video ${video.id}`);
        }
      } catch (e) {
        logWithContext(correlationId, 'WARN', `Error cleaning up video ${video.id}`, { error: e.message });
      }
    }

    return { success: true };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', 'Singleton enforcement failed', { error: e.message });
    return { success: false, error: e.message };
  }
}

// Pull exercises including shared exercises referenced in user_favorites
async function pullExercisesWithShared(supabase: any, userId: string, cursor: any, limit: number, correlationId: string): Promise<any> {
  try {
    logWithContext(correlationId, 'INFO', 'Pulling exercises with shared exercises', { userId, cursor, limit });

    // First, get user's own exercises
    const { query: ownQuery, params: ownParams } = pullTableQuery('exercises', userId, cursor, limit);
    const { data: ownExercises, error: ownError } = await supabase.rpc('exec_sql', {
      sql: ownQuery,
      params: ownParams
    });

    if (ownError) {
      logWithContext(correlationId, 'ERROR', 'Failed to pull own exercises', { error: ownError.message });
      return {
        records: [],
        nextCursor: cursor || { lastUpdatedAt: '', lastId: '' },
        hasMore: false,
        error: true,
        errorMessage: ownError.message
      };
    }

    logWithContext(correlationId, 'INFO', `Found ${ownExercises?.length || 0} own exercises`);

    // Get shared exercise references from user_favorites
    const favoritesQuery = `
      SELECT item_id FROM user_favorites
      WHERE owner_id = $1 AND item_type = 'exercise' AND exercise_type = 'shared' AND deleted != true
    `;
    const { data: favoritesData, error: favoritesError } = await supabase.rpc('exec_sql', {
      sql: favoritesQuery,
      params: [userId]
    });

    if (favoritesError) {
      logWithContext(correlationId, 'WARN', 'No shared exercise favorites found', { error: favoritesError.message });
      // Continue with just own exercises
      return {
        records: ownExercises || [],
        nextCursor: generateNextCursor(ownExercises, limit),
        hasMore: (ownExercises?.length || 0) === limit,
        error: false
      };
    }

    // Extract shared exercise IDs
    const sharedExerciseIds = new Set();
    if (favoritesData && favoritesData.length > 0) {
      for (const favRecord of favoritesData) {
        if (favRecord.item_id) {
          sharedExerciseIds.add(favRecord.item_id);
        }
      }
    }

    logWithContext(correlationId, 'INFO', `Found ${sharedExerciseIds.size} shared exercise IDs in favorites`);

    // Get shared exercises that user doesn't own
    let sharedExercises = [];
    if (sharedExerciseIds.size > 0) {
      const ownExerciseIds = new Set((ownExercises || []).map(ex => ex.id));
      const externalSharedIds = Array.from(sharedExerciseIds).filter(id => !ownExerciseIds.has(id));

      if (externalSharedIds.length > 0) {
        const placeholders = externalSharedIds.map((_, i) => `$${i + 1}`).join(', ');
        const sharedQuery = `
          SELECT * FROM exercises
          WHERE id IN (${placeholders}) AND deleted != true
        `;
        const { data: sharedData, error: sharedError } = await supabase.rpc('exec_sql', {
          sql: sharedQuery,
          params: externalSharedIds
        });

        if (sharedError) {
          logWithContext(correlationId, 'WARN', 'Failed to pull shared exercises', { error: sharedError.message });
        } else {
          sharedExercises = sharedData || [];
          logWithContext(correlationId, 'INFO', `Found ${sharedExercises.length} external shared exercises`);
        }
      }
    }

    // Combine and return
    let allExercises = [...(ownExercises || []), ...sharedExercises];

    // Defense-in-depth: filter any non-UUID IDs (should never occur because built-ins are not stored server-side)
    const preFilterCount = allExercises.length;
    allExercises = allExercises.filter(ex => ex?.id && UUID_PATTERN.test(ex.id));
    if (allExercises.length !== preFilterCount) {
      logWithContext(correlationId, 'WARN', `Filtered ${preFilterCount - allExercises.length} non-UUID exercise records from pull response`);
    }

    logWithContext(correlationId, 'INFO', `Total exercises: ${allExercises.length} (${ownExercises?.length || 0} own + ${sharedExercises.length} shared after filtering)`);

    return {
      records: allExercises,
      nextCursor: generateNextCursor(ownExercises, limit),
      hasMore: (ownExercises?.length || 0) === limit,
      error: false
    };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', 'Pull exercises failed', { error: e.message });
    return {
      records: [],
      nextCursor: cursor || { lastUpdatedAt: '', lastId: '' },
      hasMore: false,
      error: true,
      errorMessage: e.message
    };
  }
}

// Regular table pull query
function pullTableQuery(table: string, userId: string, cursor: any, limit: number): { query: string; params: any[] } {
  let query = `
    SELECT * FROM ${table}
    WHERE owner_id = $1 AND deleted != true
  `;
  const params = [userId];

  if (cursor?.lastUpdatedAt) {
    query += ` AND (updated_at > $${params.length + 1} OR (updated_at = $${params.length + 1} AND id > $${params.length + 2}))`;
    params.push(cursor.lastUpdatedAt, cursor.lastId || '');
  }

  query += ` ORDER BY updated_at ASC, id ASC LIMIT $${params.length + 1}`;
  params.push(limit);

  return { query, params };
}

// Generate next cursor for pagination
function generateNextCursor(records: any[], limit: number): any {
  if (!records || records.length === 0 || records.length < limit) {
    return null;
  }
  const lastRecord = records[records.length - 1];
  return {
    lastUpdatedAt: lastRecord.updated_at,
    lastId: lastRecord.id
  };
}

// Generic table pull with cursor-based pagination
async function pullTableWithCursor(supabase: any, table: string, userId: string, cursor: any, limit: number, correlationId: string): Promise<any> {
  try {
    logWithContext(correlationId, 'INFO', `Pulling ${table} for user ${userId}`, { cursor });

    const { query, params } = pullTableQuery(table, userId, cursor, limit);
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: query,
      params: params
    });

    if (error) {
      logWithContext(correlationId, 'ERROR', `Pull operation failed for ${table}`, { error: error.message });
      return {
        records: [],
        nextCursor: cursor || { lastUpdatedAt: '', lastId: '' },
        hasMore: false,
        error: true,
        errorMessage: error.message
      };
    }

    const records = data || [];
    const nextCursor = generateNextCursor(records, limit);
    const hasMore = records.length === limit;

    logWithContext(correlationId, 'INFO', `Pulled ${records.length} records from ${table}`, { hasMore });

    return {
      records,
      nextCursor,
      hasMore,
      error: false
    };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', `Pull operation failed for ${table}`, { error: e.message });
    return {
      records: [],
      nextCursor: cursor || { lastUpdatedAt: '', lastId: '' },
      hasMore: false,
      error: true,
      errorMessage: e.message
    };
  }
}

serve(async (req) => {
  console.log(`🚀 COMPREHENSIVE sync_v2 edge function called: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Generate correlation ID for request tracing
  const correlationId = crypto.randomUUID();
  logWithContext(correlationId, 'INFO', 'Processing comprehensive sync request');

  try {
    // Parse and validate request
    const { mode, since = {}, tables = {}, clientInfo } = await req.json();
    logWithContext(correlationId, 'INFO', `Sync mode: ${mode}`, { clientInfo });

    // Extract and validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logWithContext(correlationId, 'WARN', 'Missing or invalid authorization header');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const jwt = authHeader.substring(7);
    const userId = await validateJWT(jwt);
    if (!userId) {
      logWithContext(correlationId, 'WARN', 'Invalid JWT');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    logWithContext(correlationId, 'INFO', `Authenticated user: ${userId}`);

    // Initialize Supabase client for server operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Initialize response and tracking
    const response = {
      server_time: new Date().toISOString(),
      tables: {}
    };

    // Track detailed errors and per-table status
    const detailedErrors: any[] = [];
    const tableStatuses: { [key: string]: TableSyncStatus } = {};

    // Initialize table status tracking
    SYNC_TABLES.forEach(table => {
      tableStatuses[table] = {
        table,
        push_attempted: false,
        push_success: false,
        push_errors: 0,
        push_successes: 0,
        pull_attempted: false,
        pull_success: false,
        pull_errors: 0,
        pull_records: 0,
        error_messages: []
      };
    });

    // PHASE 1: Push changes to server (upserts and deletes)
    let pushErrors = 0;
    let pushSuccesses = 0;

    logWithContext(correlationId, 'INFO', `Push phase: processing ${Object.keys(tables).length} tables`);

    for (const [table, data] of Object.entries(tables)) {
      if (!SYNC_TABLES.includes(table)) {
        logWithContext(correlationId, 'WARN', `Skipping unknown table: ${table}`);
        continue;
      }

      const tableStatus = tableStatuses[table];
      tableStatus.push_attempted = true;

      const { upserts = [], deletes = [] } = data as any;
      logWithContext(correlationId, 'INFO', `Processing ${table}: ${upserts.length} upserts, ${deletes.length} deletes`);

      // Process deletes (soft delete with tombstone)
      for (const id of deletes) {
        try {
          // Reject delete attempts for non-UUID exercise IDs (built-ins) silently (not counted as error)
          if (table === 'exercises' && (!id || !UUID_PATTERN.test(id))) {
            logWithContext(correlationId, 'WARN', `Skipping delete for non-UUID exercise id (built-in / invalid): ${id}`);
            continue;
          }
          logWithContext(correlationId, 'INFO', `Soft-deleting ${table}:${id}`);

          const deleteQuery = `UPDATE ${table} SET deleted = true, updated_at = NOW() WHERE id = $1 AND owner_id = $2`;
          const deleteParams = [id, userId];

          const { error: deleteError } = await supabase.rpc('exec_sql', {
            sql: deleteQuery,
            params: deleteParams
          });

          if (deleteError) {
            logWithContext(correlationId, 'ERROR', `Delete failed for ${table}:${id}`, { error: deleteError.message });
            detailedErrors.push({
              table,
              record_id: id,
              operation: 'delete',
              error: deleteError.message
            });
            tableStatus.push_errors++;
            tableStatus.error_messages.push(`Delete ${id}: ${deleteError.message}`);
            pushErrors++;
          } else {
            logWithContext(correlationId, 'INFO', `Successfully deleted ${table}:${id}`);
            tableStatus.push_successes++;
            pushSuccesses++;
          }
        } catch (e) {
          logWithContext(correlationId, 'ERROR', `Delete exception for ${table}:${id}`, { error: e.message });
          detailedErrors.push({
            table,
            record_id: id,
            operation: 'delete',
            error: e.message
          });
          tableStatus.push_errors++;
          tableStatus.error_messages.push(`Delete ${id}: ${e.message}`);
          pushErrors++;
        }
      }

      // Process upserts
      for (let record of upserts) {
        try {
          const id = record.id;
          if (!id) {
            logWithContext(correlationId, 'WARN', `Skipping record without ID in ${table}`);
            continue;
          }

          // Server-side validation: Reject built-in exercises (string IDs)
          if (table === 'exercises' && !UUID_PATTERN.test(id)) {
            logWithContext(correlationId, 'WARN', `Rejecting built-in exercise with string ID: ${id}`);
            detailedErrors.push({
              table,
              record_id: id,
              operation: 'upsert',
              error: 'Built-in exercises with string IDs cannot be synced to server'
            });
            tableStatus.push_errors++;
            tableStatus.error_messages.push(`Reject ${id}: Built-in exercise`);
            pushErrors++;
            continue;
          }

          logWithContext(correlationId, 'DEBUG', `Processing ${table}:${id}`, {
            incomingFields: Object.keys(record)
          });

          // Special handling for video_files table with file uploads
          if (table === 'video_files' && record.file_data && record.upload_pending) {
            logWithContext(correlationId, 'INFO', `Processing video file upload for ${id}`, {
              fileName: record.file_name,
              fileSize: record.file_size,
              exerciseId: record.exercise_id
            });

            // SINGLETON ENFORCEMENT: Delete any existing video files for this exercise
            const singletonResult = await enforceVideoFileSingleton(supabase, userId, record.exercise_id, id, correlationId);
            if (!singletonResult.success) {
              logWithContext(correlationId, 'WARN', 'Singleton enforcement failed', { error: singletonResult.error });
              // Continue with upload even if singleton enforcement fails (best effort)
            }

            // Process the video file upload
            const uploadResult = await processVideoFileUpload(supabase, record, userId, correlationId);
            if (uploadResult.success && uploadResult.updatedRecord) {
              // Use the updated record without file_data for database upsert
              record = uploadResult.updatedRecord;
              logWithContext(correlationId, 'INFO', `Video upload successful for ${id}`);
            } else {
              logWithContext(correlationId, 'ERROR', `Video upload failed for ${id}`, { error: uploadResult.error });
              detailedErrors.push({
                table,
                record_id: id,
                operation: 'upsert',
                error: uploadResult.error || 'Video upload failed'
              });
              tableStatus.push_errors++;
              tableStatus.error_messages.push(`Upload ${id}: ${uploadResult.error}`);
              pushErrors++;
              continue; // Skip regular upsert for failed video uploads
            }
          }

          // Filter fields for security
          const filteredRecord = filterAllowedFields(table, record, correlationId);
          if (Object.keys(filteredRecord).length === 0) {
            logWithContext(correlationId, 'WARN', `All fields filtered out for ${table}:${id}`);
            detailedErrors.push({
              table,
              record_id: id,
              operation: 'upsert',
              error: 'All fields were filtered out due to security restrictions'
            });
            tableStatus.push_errors++;
            tableStatus.error_messages.push(`Filter ${id}: All fields filtered`);
            pushErrors++;
            continue;
          }

          // Set ownership and metadata
          filteredRecord.owner_id = userId;
          filteredRecord.updated_at = new Date().toISOString();
          filteredRecord.version = (filteredRecord.version || 0) + 1;

          logWithContext(correlationId, 'INFO', `Upserting ${table}:${id} with version ${filteredRecord.version}`);

          // Handle singletons - update existing record rather than insert
          if (SINGLETON_TABLES.includes(table)) {
            logWithContext(correlationId, 'INFO', `Singleton table ${table} - checking for existing record`);

            const { data: existing } = await supabase
              .from(table)
              .select('id')
              .eq('owner_id', userId)
              .eq('deleted', false)
              .limit(1);

            if (existing && existing.length > 0) {
              // Update existing singleton
              const existingId = existing[0].id;
              logWithContext(correlationId, 'INFO', `Updating existing singleton ${table}:${existingId}`);
              // Ensure we do NOT attempt to overwrite primary key with client placeholder (e.g. 'default-app-settings')
              if (filteredRecord.id && filteredRecord.id !== existingId) {
                if (!UUID_PATTERN.test(filteredRecord.id)) {
                  // Remove non-UUID client placeholder id to avoid PK mutation attempt
                  delete filteredRecord.id;
                } else if (filteredRecord.id !== existingId) {
                  // UUID differs (client drift) – prefer existingId, drop incoming id
                  delete filteredRecord.id;
                }
              }

              const { error: updateError } = await supabase
                .from(table)
                .update(filteredRecord)
                .eq('id', existingId)
                .eq('owner_id', userId);

              if (updateError) {
                logWithContext(correlationId, 'ERROR', `Singleton update failed for ${table}:${existingId}`, { error: updateError.message });
                detailedErrors.push({
                  table,
                  record_id: id,
                  operation: 'upsert',
                  error: updateError.message
                });
                tableStatus.push_errors++;
                tableStatus.error_messages.push(`Update ${id}: ${updateError.message}`);
                pushErrors++;
              } else {
                logWithContext(correlationId, 'INFO', `Successfully updated singleton ${table}:${existingId}`);
                tableStatus.push_successes++;
                pushSuccesses++;
              }
            } else {
              // Insert new singleton
              logWithContext(correlationId, 'INFO', `Inserting new singleton ${table}:${id}`);
              // If client supplied a non-UUID id (placeholder) remove it so DB default / generated uuid is used
              if (filteredRecord.id && !UUID_PATTERN.test(filteredRecord.id)) {
                delete filteredRecord.id;
              }
              const { error: insertError } = await supabase
                .from(table)
                .insert(filteredRecord);

              if (insertError) {
                logWithContext(correlationId, 'ERROR', `Singleton insert failed for ${table}:${id}`, { error: insertError.message });
                detailedErrors.push({
                  table,
                  record_id: id,
                  operation: 'upsert',
                  error: insertError.message
                });
                tableStatus.push_errors++;
                tableStatus.error_messages.push(`Insert ${id}: ${insertError.message}`);
                pushErrors++;
              } else {
                logWithContext(correlationId, 'INFO', `Successfully inserted singleton ${table}:${id}`);
                tableStatus.push_successes++;
                pushSuccesses++;
              }
            }
          } else {
            // Regular upsert
            const { error: upsertError } = await supabase
              .from(table)
              .upsert(filteredRecord, { onConflict: 'id' });

            if (upsertError) {
              logWithContext(correlationId, 'ERROR', `Upsert failed for ${table}:${id}`, { error: upsertError.message });
              detailedErrors.push({
                table,
                record_id: id,
                operation: 'upsert',
                error: upsertError.message
              });
              tableStatus.push_errors++;
              tableStatus.error_messages.push(`Upsert ${id}: ${upsertError.message}`);
              pushErrors++;
            } else {
              logWithContext(correlationId, 'INFO', `Successfully upserted ${table}:${id}`);
              tableStatus.push_successes++;
              pushSuccesses++;
            }
          }
        } catch (e) {
          logWithContext(correlationId, 'ERROR', `Upsert exception for ${table}:${record.id}`, { error: e.message });
          detailedErrors.push({
            table,
            record_id: record.id,
            operation: 'upsert',
            error: e.message
          });
          tableStatus.push_errors++;
          tableStatus.error_messages.push(`Exception ${record.id}: ${e.message}`);
          pushErrors++;
        }
      }

      // Mark push as successful if no errors for this table
      tableStatus.push_success = tableStatus.push_errors === 0;
    }

    logWithContext(correlationId, 'INFO', `Push phase completed: ${pushSuccesses} successes, ${pushErrors} errors`);

    // PHASE 2: Pull changes per table with pagination via composite cursor
    let pullErrors = 0;
    let pullSuccesses = 0;

    logWithContext(correlationId, 'INFO', `Pull phase: processing ${SYNC_TABLES.length} tables`);

    for (const table of SYNC_TABLES) {
      const tableStatus = tableStatuses[table];
      tableStatus.pull_attempted = true;

      const cursor = since[table] || null;

      try {
        let pullResult;

        if (table === 'exercises') {
          pullResult = await pullExercisesWithShared(supabase, userId, cursor, PULL_PAGE_SIZE, correlationId);
        } else {
          pullResult = await pullTableWithCursor(supabase, table, userId, cursor, PULL_PAGE_SIZE, correlationId);
        }

        if (pullResult.error) {
          logWithContext(correlationId, 'ERROR', `Pull failed for ${table}`, { error: pullResult.errorMessage });
          tableStatus.pull_errors++;
          tableStatus.error_messages.push(`Pull: ${pullResult.errorMessage}`);
          pullErrors++;

          // Add to detailed errors array for client visibility
          detailedErrors.push({
            table,
            record_id: 'unknown',
            operation: 'pull',
            error: pullResult.errorMessage
          });

          // Continue with empty result for this table
          response.tables[table] = {
            upserts: [],
            deletes: [],
            nextCursor: cursor,
            more: false
          };
        } else {
          logWithContext(correlationId, 'INFO', `Pull successful for ${table}: ${pullResult.records.length} records`);
          tableStatus.pull_records = pullResult.records.length;
          tableStatus.pull_success = true;
          pullSuccesses++;

          response.tables[table] = {
            upserts: pullResult.records,
            deletes: [],
            nextCursor: pullResult.nextCursor,
            more: pullResult.hasMore
          };
        }
      } catch (e) {
        logWithContext(correlationId, 'ERROR', `Pull exception for ${table}`, { error: e.message });
        tableStatus.pull_errors++;
        tableStatus.error_messages.push(`Pull exception: ${e.message}`);
        pullErrors++;

        // Add to detailed errors array for client visibility
        detailedErrors.push({
          table,
          record_id: 'unknown',
          operation: 'pull',
          error: e.message
        });

        response.tables[table] = {
          upserts: [],
          deletes: [],
          nextCursor: cursor,
          more: false
        };
      }
    }

    logWithContext(correlationId, 'INFO', `Pull phase completed: ${pullSuccesses} successes, ${pullErrors} errors`);

    // Determine overall sync status and response
    const totalErrors = pushErrors + pullErrors;
    const totalSuccesses = pushSuccesses + pullSuccesses;

    // Add comprehensive sync metadata to response
    response.sync_metadata = {
      push_successes: pushSuccesses,
      push_errors: pushErrors,
      pull_successes: pullSuccesses,
      pull_errors: pullErrors,
      total_successes: totalSuccesses,
      total_errors: totalErrors,
      detailed_errors: detailedErrors,
      table_statuses: tableStatuses // Include per-table status tracking
    };

    logWithContext(correlationId, 'INFO', 'Final response sync_metadata', response.sync_metadata);

    if (totalErrors > 0) {
      // Partial success - return 207 Multi-Status with detailed results
      logWithContext(correlationId, 'WARN', `Sync completed with partial success: ${totalSuccesses} successes, ${totalErrors} errors`);
      return json({
        ...response,
        status: 'partial_success',
        message: `Sync completed with ${totalErrors} errors out of ${totalSuccesses + totalErrors} total operations`
      }, 207, correlationId); // 207 Multi-Status for partial success
    } else {
      // Full success
      logWithContext(correlationId, 'INFO', `Sync completed successfully: ${totalSuccesses} successes, 0 errors`);
      return json(response, 200, correlationId);
    }

  } catch (e) {
    logWithContext(correlationId, 'CRITICAL', 'Sync failed with error', {
      error: {
        message: e.message,
        name: e.name,
        stack: e.stack
      }
    });
    return json({
      error: 'Internal error',
      message: e.message
    }, 500, correlationId);
  }
});

function json(body: any, status = 200, correlationId: string) {
  const payload = {
    ...body,
    correlation_id: correlationId,
    timestamp: new Date().toISOString()
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}