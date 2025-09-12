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
// JWT validation function
async function validateJWT(jwt) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
// Allow-list of tables (keep minimal for v2 scope)
const SYNC_TABLES = [
  'user_preferences',
  'app_settings',
  'exercises',
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions'
];
// Singleton tables that have one record per user
const SINGLETON_TABLES = [
  'user_preferences',
  'app_settings'
];
const PULL_PAGE_SIZE = 50; // Standard batch size for pulling server changes
// Allowlisted fields per table (security measure to prevent unauthorized data modification)
const MUTABLE_FIELD_ALLOWLIST = {
  user_preferences: new Set([
    'id',
    'owner_id',
    'language',
    'theme_mode',
    'notification_enabled',
    'default_exercise_duration',
    'default_rest_duration',
    'sound_profile',
    'haptic_feedback',
    'auto_lock_screen',
    'keep_screen_on',
    'privacy_analytics',
    'data_sync_enabled',
    'exercise_history_retention_days',
    'workout_reminders_enabled',
    'achievement_notifications',
    'social_sharing_enabled',
    'export_format_preference',
    'timezone',
    'date_format',
    'time_format',
    'measurement_units',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  app_settings: new Set([
    'id',
    'owner_id',
    'beep_interval_seconds',
    'beep_sound_enabled',
    'beep_volume',
    'vibration_enabled',
    'dark_mode',
    'reduce_motion',
    'auto_start_next',
    'pre_timer_countdown',
    'show_exercise_videos',
    'data_auto_save',
    'default_rest_time',
    'rep_speed_factor',
    'last_selected_exercise_id',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  exercises: new Set([
    'id',
    'owner_id',
    'name',
    'description',
    'category',
    'exercise_type',
    'default_sets',
    'default_reps',
    'default_duration',
    'default_rest_time',
    'instructions',
    'tips',
    'difficulty_level',
    'equipment_needed',
    'muscle_groups',
    'tags',
    'is_favorite',
    'custom_fields',
    'rep_duration_seconds',
    'has_video',
    'video_url',
    'image_url',
    'created_by',
    'is_public',
    'rating',
    'times_used',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  user_favorites: new Set([
    'id',
    'owner_id',
    'item_id',
    'item_type',
    'exercise_type',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  workouts: new Set([
    'id',
    'owner_id',
    'name',
    'description',
    'category',
    'difficulty_level',
    'estimated_duration',
    'equipment_needed',
    'is_favorite',
    'is_public',
    'tags',
    'instructions',
    'exercises',
    'rest_between_exercises',
    'rest_between_sets',
    'created_by',
    'rating',
    'times_used',
    'total_exercises',
    'total_sets',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  activity_logs: new Set([
    'id',
    'owner_id',
    'exercise_id',
    'workout_id',
    'session_id',
    'activity_type',
    'duration',
    'sets_completed',
    'reps_completed',
    'weight_used',
    'distance',
    'calories_burned',
    'heart_rate_avg',
    'heart_rate_max',
    'notes',
    'difficulty_rating',
    'completion_status',
    'started_at',
    'completed_at',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ]),
  workout_sessions: new Set([
    'id',
    'owner_id',
    'workout_id',
    'session_name',
    'planned_duration',
    'actual_duration',
    'total_exercises',
    'completed_exercises',
    'total_sets',
    'completed_sets',
    'total_reps',
    'completed_reps',
    'calories_burned',
    'average_heart_rate',
    'max_heart_rate',
    'difficulty_rating',
    'completion_percentage',
    'notes',
    'started_at',
    'paused_at',
    'resumed_at',
    'completed_at',
    'created_at',
    'updated_at',
    'version',
    'deleted'
  ])
};
// Validate and scrub incoming record fields against allowlist
function scrubIncoming(table, record) {
  const allowlist = MUTABLE_FIELD_ALLOWLIST[table];
  if (!allowlist) {
    console.warn(`No field allowlist defined for table: ${table}`);
    return record; // Allow all fields if no allowlist (fallback)
  }
  const scrubbed = {};
  for (const [key, value] of Object.entries(record)){
    if (allowlist.has(key)) {
      scrubbed[key] = value;
    } else {
      console.warn(`Filtered disallowed field '${key}' from ${table} record`);
    }
  }
  return scrubbed;
}
// Pull changes from a table with cursor-based pagination
async function pullTablePage(supabase, table, userId, cursor, limit, correlationId) {
  try {
    console.log(`[${correlationId}] Pulling ${table} with cursor:`, cursor, `limit: ${limit}`);
    // Build query - fetch records newer than cursor or all if no cursor
    let query = supabase.from(table).select('*').eq('owner_id', userId).order('updated_at', {
      ascending: true
    }).order('id', {
      ascending: true
    }) // Secondary sort for stable pagination
    .limit(limit + 1); // +1 to detect if there are more records
    if (cursor) {
      // Use composite cursor: (updated_at > cursor.lastUpdatedAt) OR (updated_at = cursor.lastUpdatedAt AND id > cursor.lastId)
      query = query.or(`updated_at.gt.${cursor.lastUpdatedAt},and(updated_at.eq.${cursor.lastUpdatedAt},id.gt.${cursor.lastId})`);
    }
    const { data, error } = await query;
    if (error) {
      console.error(`[${correlationId}] Pull query failed for ${table}:`, error);
      return {
        records: [],
        nextCursor: cursor || {
          lastUpdatedAt: '',
          lastId: ''
        },
        hasMore: false,
        error: true,
        errorMessage: error.message
      };
    }
    const records = data || [];
    const hasMore = records.length > limit;
    const actualRecords = hasMore ? records.slice(0, limit) : records;
    // Generate next cursor from last record
    const nextCursor = actualRecords.length > 0 ? {
      lastUpdatedAt: actualRecords[actualRecords.length - 1].updated_at,
      lastId: actualRecords[actualRecords.length - 1].id
    } : cursor || {
      lastUpdatedAt: '',
      lastId: ''
    };
    console.log(`[${correlationId}] Pulled ${actualRecords.length} records from ${table}, hasMore: ${hasMore}`);
    return {
      records: actualRecords,
      nextCursor,
      hasMore,
      error: false
    };
  } catch (e) {
    console.error(`[${correlationId}] Pull operation failed for ${table}:`, e);
    return {
      records: [],
      nextCursor: cursor || {
        lastUpdatedAt: '',
        lastId: ''
      },
      hasMore: false,
      error: true,
      errorMessage: e.message
    };
  }
}
serve(async (req)=>{
  console.log(`🚀 sync_v2 edge function called: ${req.method} ${req.url}`);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Generate correlation ID for request tracing
  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Processing sync request`);
  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log(`[${correlationId}] Missing or invalid Authorization header`);
      return json({
        error: 'Missing Authorization header'
      }, 401, correlationId);
    }
    const jwt = authHeader.substring(7);
    const userId = await validateJWT(jwt);
    if (!userId) {
      console.log(`[${correlationId}] JWT validation failed`);
      return json({
        error: 'Invalid or expired token'
      }, 401, correlationId);
    }
    console.log(`[${correlationId}] Authenticated user: ${userId}`);
    // 2. Parse request body
    const body = await req.json();
    console.log(`[${correlationId}] Request body:`, {
      mode: body.mode,
      tablesWithData: Object.keys(body.tables || {}),
      sinceKeys: Object.keys(body.since || {}),
      clientInfo: body.clientInfo
    });
    // 3. Connect to Supabase with service key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // 4. Initialize response
    const response = {
      correlation_id: correlationId,
      server_time: new Date().toISOString(),
      tables: {}
    };
    let pushErrors = 0;
    let pushSuccesses = 0;
    // 1. Process pushes (upserts / deletes) respecting version precedence & resurrection rules
    for (const table of Object.keys(body.tables)){
      const { upserts = [], deletes = [] } = body.tables[table];
      console.log(`[${correlationId}] Processing ${table}: ${upserts.length} upserts, ${deletes.length} deletes`);
      // Upserts
      for (const record of upserts){
        try {
          const id = record.id;
          if (!id) {
            console.log(`[${correlationId}] Skipping record without ID in ${table}`);
            continue;
          }
          console.log(`[${correlationId}] Processing ${table}:${id} - incoming fields:`, Object.keys(record).join(', '));
          // Fetch existing - use owner_id for singleton tables, id for others
          let existing, fetchError;
          if (SINGLETON_TABLES.includes(table)) {
            console.log(`[${correlationId}] 🔸 Singleton table: fetching by owner_id for ${table}`);
            const { data, error } = await supabase.from(table).select('id, version, owner_id, deleted, updated_at').eq('owner_id', userId).maybeSingle();
            existing = data;
            fetchError = error;
          } else {
            const { data, error } = await supabase.from(table).select('id, version, owner_id, deleted, updated_at').eq('id', id).maybeSingle();
            existing = data;
            fetchError = error;
          }
          if (fetchError) {
            console.error(`[${correlationId}] Fetch error for ${table}:${id}:`, fetchError);
            pushErrors++;
            continue;
          }
          const now = new Date().toISOString();
          const incomingVersion = typeof record.version === 'number' ? record.version : 1;
          if (!existing) {
            // INSERT: New record
            console.log(`[${correlationId}] 🆕 INSERT: ${table}:${id} (new record)`);
            const scrubbedRecord = scrubIncoming(table, {
              ...record,
              owner_id: userId,
              created_at: record.created_at || now,
              updated_at: now,
              version: incomingVersion
            });
            const { error: insertError } = await supabase.from(table).insert(scrubbedRecord);
            if (insertError) {
              console.error(`[${correlationId}] Insert error for ${table}:${id}:`, {
                message: insertError.message,
                details: insertError.details
              });
              pushErrors++;
            } else {
              console.log(`[${correlationId}] ✅ INSERT success: ${table}:${id}`);
              pushSuccesses++;
            }
          } else {
            // UPDATE: Handle version conflicts and resurrection
            const existingVersion = existing.version || 1;
            const existingDeleted = existing.deleted || false;
            console.log(`[${correlationId}] 🔄 UPDATE: ${table}:${id} - existing v${existingVersion} (deleted: ${existingDeleted}) vs incoming v${incomingVersion}`);
            if (incomingVersion > existingVersion || incomingVersion === existingVersion && !existingDeleted && record.deleted) {
              // Version wins OR resurrection case
              console.log(`[${correlationId}] 📝 Updating ${table}:${id} (version precedence: ${incomingVersion} > ${existingVersion})`);
              const scrubbedRecord = scrubIncoming(table, {
                ...record,
                owner_id: userId,
                updated_at: now,
                version: incomingVersion
              });
              const { error: updateError } = await supabase.from(table).update(scrubbedRecord).eq('id', existing.id);
              if (updateError) {
                console.error(`[${correlationId}] Update error for ${table}:${id}:`, {
                  message: updateError.message,
                  details: updateError.details
                });
                pushErrors++;
              } else {
                console.log(`[${correlationId}] ✅ UPDATE success: ${table}:${id}`);
                pushSuccesses++;
              }
            } else {
              // Skip due to version conflict or no change needed
              console.log(`[${correlationId}] ⏭️ SKIP: ${table}:${id} (version conflict: incoming ${incomingVersion} <= existing ${existingVersion})`);
              pushSuccesses++; // Count as success since it's handled correctly
            }
          }
        } catch (e) {
          console.error(`[${correlationId}] Upsert processing error for ${table}:`, e);
          pushErrors++;
        }
      }
      // Deletes
      for (const deleteId of deletes){
        try {
          console.log(`[${correlationId}] 🗑️ DELETE: ${table}:${deleteId}`);
          const { error: deleteError } = await supabase.from(table).update({
            deleted: true,
            updated_at: new Date().toISOString()
          }).eq('id', deleteId).eq('owner_id', userId); // Security: only delete user's own records
          if (deleteError) {
            console.error(`[${correlationId}] Delete error for ${table}:${deleteId}:`, deleteError);
            pushErrors++;
          } else {
            console.log(`[${correlationId}] ✅ DELETE success: ${table}:${deleteId}`);
            pushSuccesses++;
          }
        } catch (e) {
          console.error(`[${correlationId}] Delete processing error for ${table}:${deleteId}:`, e);
          pushErrors++;
        }
      }
    }
    console.log(`[${correlationId}] Push phase completed: ${pushSuccesses} successes, ${pushErrors} errors`);
    // Store push phase results for final response (don't fail fast on partial errors)
    const pushPhaseResults = {
      successes: pushSuccesses,
      errors: pushErrors,
      hasErrors: pushErrors > 0
    };
    // 2. Pull changes per table with pagination via composite cursor
    let pullErrors = 0;
    let pullSuccesses = 0;
    for (const table of SYNC_TABLES){
      const cursor = body.since?.[table];
      console.log(`[${correlationId}] Pulling ${table} since:`, cursor);
      const pullResult = await pullTablePage(supabase, table, userId, cursor, PULL_PAGE_SIZE, correlationId);
      if (pullResult.error) {
        console.error(`[${correlationId}] Pull error for ${table}: ${pullResult.errorMessage}`);
        pullErrors++;
        continue; // Skip this table but continue with others
      }
      pullSuccesses++;
      const { records, nextCursor, hasMore } = pullResult;
      const upserts = records.filter((r)=>!r.deleted);
      const deletes = records.filter((r)=>r.deleted).map((r)=>r.id);
      console.log(`[${correlationId}] ${table} pull results: ${upserts.length} upserts, ${deletes.length} deletes, hasMore: ${hasMore}`);
      response.tables[table] = {
        upserts,
        deletes,
        nextCursor,
        more: hasMore
      };
    }
    console.log(`[${correlationId}] Pull phase completed: ${pullSuccesses} successes, ${pullErrors} errors`);
    // Determine overall sync status and response
    const totalErrors = pushPhaseResults.errors + pullErrors;
    const totalSuccesses = pushPhaseResults.successes + pullSuccesses;
    // Add sync metadata to response
    response.sync_metadata = {
      push_successes: pushPhaseResults.successes,
      push_errors: pushPhaseResults.errors,
      pull_successes: pullSuccesses,
      pull_errors: pullErrors,
      total_successes: totalSuccesses,
      total_errors: totalErrors
    };
    if (totalErrors > 0) {
      // Partial success - return 207 Multi-Status with detailed results
      console.log(`[${correlationId}] Sync completed with partial success: ${totalSuccesses} successes, ${totalErrors} errors`);
      return json({
        ...response,
        status: 'partial_success',
        message: `Sync completed with ${totalErrors} errors out of ${totalSuccesses + totalErrors} total operations`
      }, 207, correlationId); // 207 Multi-Status for partial success
    } else {
      // Full success
      console.log(`[${correlationId}] Sync completed successfully: ${totalSuccesses} successes, 0 errors`);
      return json(response, 200, correlationId);
    }
  } catch (e) {
    console.error(`[${correlationId}] Sync failed with error:`, e.message, e.stack);
    return json({
      error: 'Internal error',
      message: e.message
    }, 500, correlationId);
  }
});
function json(body, status = 200, correlationId) {
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
