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
async function validateJWT(jwt: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
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

interface TableCursor { lastUpdatedAt: string; lastId: string; }
interface EdgeSyncRequestV2 {
  mode: 'light' | 'full' | 'priority';
  since?: Record<string, TableCursor>;
  tables: Record<string, { upserts: Record<string, unknown>[]; deletes: string[] }>; // push payload
  clientInfo?: { deviceId: string; appVersion: string };
}
interface EdgeSyncResponseV2 {
  correlation_id: string;
  server_time: string;
  tables: Record<string, { upserts: Record<string, unknown>[]; deletes: string[]; nextCursor: TableCursor; more: boolean }>;
}

// Allow-list of tables (keep minimal for v2 scope)
const SYNC_TABLES: readonly string[] = [
  'user_preferences',
  'app_settings',
  'exercises',
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions'
];

const PUSH_BATCH_LIMIT = 5; // Max total records (upserts+deletes) per request
const PULL_PAGE_SIZE = 50;  // Max rows per table per page
const MAX_SERVER_ERRORS_LOGGED = 5; // Cap noisy logs per request

// Comprehensive allow‑list of mutable fields using database field names
const MUTABLE_FIELD_ALLOWLIST = new Set([
  'id',
  'name',
  'title',
  'description',
  'exercise_id',
  'workout_id',
  'settings',
  'locale',
  'units',
  'rep_speed_factor',
  'cues',
  'data',
  'metadata',
  'payload',
  'version',
  'deleted',
  // app_settings fields (using database field names)
  'beep_volume',
  'dark_mode',
  'vibration_enabled',
  'reduce_motion',
  'auto_start_next',
  'default_rest_time',
  'pre_timer_countdown',
  'show_exercise_videos',
  'last_selected_exercise_id',
  'beep_interval_seconds',
  'beep_sound_enabled',
  'data_auto_save',
  // Additional app_settings fields from schema
  'interval_duration',
  'sound_enabled',
  // user_preferences fields
  'favorite_exercises',
  'daily_goal',
  'weekly_goal',
  'preferred_units',
  'notification_preferences',
  'privacy_settings',
  'default_interval_duration',
  // exercises fields
  'instructions',
  'muscle_groups',
  'difficulty',
  'equipment_needed',
  'video_url',
  'image_url',
  'tags',
  'category',
  'duration_seconds',
  'exercise_type',
  'rep_duration_seconds',
  'is_favorite',
  'is_public',
  'is_verified',
  'rating_average',
  'rating_count',
  'copy_count',
  'difficulty_level',
  'custom_video_url',
  'has_video',
  'default_duration',
  'default_sets',
  'default_reps',
  // user_favorites fields
  'favorited_at',
  'notes',
  'item_id',
  'item_type',
  'exercise_type',
  // workouts fields
  'exercises',
  'total_duration',
  'difficulty_level',
  'tags_list',
  'is_public',
  'created_by',
  'category_name',
  // activity_logs fields
  'exercise_name',
  'workout_name',
  'duration',
  'timestamp',
  'notes',
  'sets',
  'reps',
  // workout_sessions fields
  'workout_name',
  'start_time',
  'end_time',
  'total_duration',
  'total_exercises',
  'exercises_completed',
  'is_completed',
  'started_at',
  'completed_at',
  'total_time',
  'notes_session',
  'performance_rating'
]);

serve(async (req) => {
  console.log(`Incoming ${req.method} request from ${req.headers.get('origin')}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }
  
  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Sync request started - Method: ${req.method}`);
  
  try {
    if (req.method !== 'POST') {
      console.log(`[${correlationId}] Method not allowed: ${req.method}`);
      return json({
        error: 'Method not allowed'
      }, 405, correlationId);
    }
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[${correlationId}] Missing authorization header`);
      return json({
        error: 'Missing authorization header'
      }, 401, correlationId);
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const userId = await validateJWT(jwt);
    if (!userId) {
      console.log(`[${correlationId}] Invalid token`);
      return json({
        error: 'Invalid token'
      }, 401, correlationId);
    }
    
    console.log(`[${correlationId}] Validated user: ${userId}`);
    
    const rawBody = await req.text();
    if (!rawBody) return json({
      error: 'Empty body'
    }, 400, correlationId);
    
    if (rawBody.length > 32_000) return json({
      error: 'Payload too large'
    }, 413, correlationId);
    
    let body: EdgeSyncRequestV2;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.log(`[${correlationId}] Invalid JSON:`, e.message);
      return json({
        error: 'Invalid JSON',
        message: e.message
      }, 400, correlationId);
    }
    
    // Basic shape validation
    if (!body || typeof body !== 'object' || !body.tables) return json({
      error: 'Invalid request shape'
    }, 400, correlationId);
    
    if (!body.mode || !['light', 'full', 'priority'].includes(body.mode)) return json({
      error: 'Invalid mode'
    }, 400, correlationId);
    
    console.log(`[${correlationId}] Mode: ${body.mode}, Tables: ${Object.keys(body.tables).join(', ')}`);
    
    // Enforce push batch limit
    let pushCount = 0;
    for (const [table, payload] of Object.entries(body.tables)) {
      if (!SYNC_TABLES.includes(table)) return json({
        error: `Table not allowed: ${table}`
      }, 400, correlationId);
      
      pushCount += (payload.upserts?.length || 0) + (payload.deletes?.length || 0);
      if (pushCount > PUSH_BATCH_LIMIT) return json({
        error: 'Batch too large',
        max: PUSH_BATCH_LIMIT
      }, 400, correlationId);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Required for server authoritative writes
    
    if (!supabaseUrl || !serviceKey) {
      console.error(`[${correlationId}] Missing environment variables`);
      return json({
        error: 'Server configuration error'
      }, 500, correlationId);
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const response: EdgeSyncResponseV2 = {
      correlation_id: correlationId,
      server_time: new Date().toISOString(),
      tables: {}
    };
    
    let pushErrors = 0;
    let pushSuccesses = 0;
    
    // 1. Process pushes (upserts / deletes) respecting version precedence & resurrection rules
    for (const table of Object.keys(body.tables)) {
      const { upserts = [], deletes = [] } = body.tables[table];
      
      console.log(`[${correlationId}] Processing ${table}: ${upserts.length} upserts, ${deletes.length} deletes`);
      
      // Upserts
      for (const record of upserts) {
        try {
          const id = record.id as string;
          if (!id) {
            console.log(`[${correlationId}] Skipping record without ID in ${table}`);
            continue;
          }
          
          console.log(`[${correlationId}] Processing ${table}:${id} - incoming fields:`, Object.keys(record).join(', '));
          
          // Fetch existing
          const { data: existing, error: fetchError } = await supabase
            .from(table)
            .select('id, version, owner_id, deleted, updated_at')
            .eq('id', id)
            .maybeSingle();
          
          if (fetchError) {
            console.error(`[${correlationId}] Fetch error for ${table}:${id}:`, fetchError);
            pushErrors++;
            continue;
          }
          
          const now = new Date().toISOString();
          const incomingVersion = typeof record.version === 'number' ? record.version : 1;
          
          if (!existing) {
            // Insert new
            const insertRecord = scrubIncoming(record, userId, now, incomingVersion, correlationId);
            console.log(`[${correlationId}] Inserting new record in ${table}:${id} with fields:`, Object.keys(insertRecord).join(', '));
            
            const { error: insertError } = await supabase.from(table).insert(insertRecord);
            if (insertError) {
              console.error(`[${correlationId}] Insert error for ${table}:${id}:`, insertError);
              pushErrors++;
            } else {
              console.log(`[${correlationId}] Successfully inserted ${table}:${id}`);
              pushSuccesses++;
            }
          } else {
            // Ownership check
            if (existing.owner_id && existing.owner_id !== userId) {
              console.log(`[${correlationId}] Skipping ${table}:${id} - ownership mismatch`);
              continue;
            }
            
            // Resurrection prevention: if server row is deleted and client isn't explicitly deleting, skip
            if (existing.deleted && !record.deleted) {
              console.log(`[${correlationId}] Skipping ${table}:${id} - resurrection prevention`);
              continue;
            }
            
            // If client version <= existing version, skip (server authoritative)
            if ((existing.version ?? 0) >= incomingVersion) {
              console.log(`[${correlationId}] Skipping ${table}:${id} - version conflict (existing: ${existing.version}, incoming: ${incomingVersion})`);
              continue;
            }
            
            const updateRecord = scrubIncoming(record, userId, now, incomingVersion, correlationId);
            console.log(`[${correlationId}] Updating record in ${table}:${id} with fields:`, Object.keys(updateRecord).join(', '));
            
            const { error: updateError } = await supabase
              .from(table)
              .update(updateRecord)
              .eq('id', id);
              
            if (updateError) {
              console.error(`[${correlationId}] Update error for ${table}:${id}:`, updateError);
              pushErrors++;
            } else {
              console.log(`[${correlationId}] Successfully updated ${table}:${id}`);
              pushSuccesses++;
            }
          }
        } catch (e) {
          if (pushErrors < MAX_SERVER_ERRORS_LOGGED) {
            console.error(`[${correlationId}] Upsert failed for ${table}:`, e.message);
            pushErrors++;
          }
        }
      }
      
      // Deletes -> soft delete
      for (const id of deletes) {
        try {
          const now = new Date().toISOString();
          // Only update if owned by user; version bump by incrementing (select current version first for safety)
          const { data: existing } = await supabase
            .from(table)
            .select('version, owner_id')
            .eq('id', id)
            .maybeSingle();
            
          if (!existing || existing.owner_id && existing.owner_id !== userId) {
            console.log(`[${correlationId}] Skipping delete ${table}:${id} - not found or not owned`);
            continue;
          }
          
          const newVersion = (existing.version ?? 0) + 1;
          console.log(`[${correlationId}] Soft deleting ${table}:${id}`);
          
          const { error: deleteError } = await supabase
            .from(table)
            .update({
              deleted: true,
              updated_at: now,
              version: newVersion
            })
            .eq('id', id)
            .eq('owner_id', userId);
            
          if (deleteError) {
            console.error(`[${correlationId}] Delete error for ${table}:${id}:`, deleteError);
            pushErrors++;
          } else {
            console.log(`[${correlationId}] Successfully deleted ${table}:${id}`);
            pushSuccesses++;
          }
        } catch (e) {
          if (pushErrors < MAX_SERVER_ERRORS_LOGGED) {
            console.error(`[${correlationId}] Delete failed for ${table}:`, e.message);
            pushErrors++;
          }
        }
      }
    }
    
    console.log(`[${correlationId}] Push phase completed: ${pushSuccesses} successes, ${pushErrors} errors`);
    
    // 2. Pull changes per table with pagination via composite cursor
    for (const table of SYNC_TABLES) {
      const cursor = body.since?.[table];
      console.log(`[${correlationId}] Pulling ${table} since:`, cursor);
      
      const { rows, more, nextCursor } = await pullTablePage(supabase, table, userId, cursor, PULL_PAGE_SIZE, correlationId);
      
      const upserts: Record<string, unknown>[] = [];
      const deletes: string[] = [];
      
      for (const row of rows) {
        if (row.deleted) deletes.push(row.id as string);
        else upserts.push(stripServerOnly(row));
      }
      
      console.log(`[${correlationId}] ${table} pull result: ${upserts.length} upserts, ${deletes.length} deletes, more: ${more}`);
      
      response.tables[table] = {
        upserts,
        deletes,
        nextCursor,
        more
      };
    }
    
    console.log(`[${correlationId}] Sync completed successfully`);
    return json(response, 200, correlationId);
  } catch (e) {
    console.error(`[${correlationId}] Sync failed with error:`, e.message, e.stack);
    return json({
      error: 'Internal error',
      message: e.message
    }, 500, correlationId);
  }
});

function json(body: Record<string, unknown>, status = 200, correlationId: string) {
  const payload = {
    ...body,
    correlation_id: correlationId
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId || ''
    }
  });
}

function scrubIncoming(record: Record<string, unknown>, userId: string, now: string, version: number, correlationId: string) {
  // Whitelist allowed mutable fields only
  const cleaned: Record<string, unknown> = {};
  let fieldsFiltered = 0;
  
  for (const [k, v] of Object.entries(record)) {
    if (MUTABLE_FIELD_ALLOWLIST.has(k)) {
      cleaned[k] = v;
    } else {
      fieldsFiltered++;
      console.log(`[${correlationId}] Filtered field '${k}' from record`);
    }
  }
  
  if (fieldsFiltered > 0) {
    console.log(`[${correlationId}] Filtered ${fieldsFiltered} fields from record`);
  }
  
  cleaned.id = record.id; // ensure id present
  cleaned.owner_id = userId; // All tables now use owner_id consistently
  cleaned.updated_at = now;
  cleaned.version = version;
  // Allow explicit deleted=true coming from client (late delivery); else default false
  cleaned.deleted = record.deleted === true;
  
  return cleaned;
}

function stripServerOnly(row: Record<string, unknown>) {
  // Remove owner_id for privacy; retain domain + meta fields required client-side
  const { owner_id, created_at, ...rest } = row;
  return rest;
}

async function pullTablePage(supabase: any, table: string, userId: string, cursor: TableCursor | undefined, pageSize: number, correlationId: string) {
  // Build filter for user scope (owner_id) except exercises may include shared/public in future; for now owner only or owner=null for builtin exercises
  let baseQuery = supabase
    .from(table)
    .select('*')
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true });
    
  if (table === 'exercises') {
    baseQuery = baseQuery.or(`owner_id.eq.${userId},owner_id.is.null`);
  } else {
    baseQuery = baseQuery.eq('owner_id', userId);
  }
  
  if (cursor) {
    // Composite OR filter (updated_at > lastUpdatedAt) OR (updated_at = lastUpdatedAt AND id > lastId)
    const ts = encodeURIComponent(cursor.lastUpdatedAt);
    const id = encodeURIComponent(cursor.lastId);
    baseQuery = baseQuery.or(`and(updated_at.eq.${ts},id.gt.${id}),updated_at.gt.${ts}`);
  }
  
  const { data, error } = await baseQuery.limit(pageSize + 1); // fetch one extra to detect more
  if (error) {
    console.error(`[${correlationId}] Pull failed for ${table}:`, error.message);
    return {
      rows: [],
      more: false,
      nextCursor: cursor || {
        lastUpdatedAt: '1970-01-01T00:00:00.000Z',
        lastId: '0'
      }
    };
  }
  
  const rows = data || [];
  const more = rows.length > pageSize;
  const page = more ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  
  const nextCursor = last ? {
    lastUpdatedAt: last.updated_at,
    lastId: last.id
  } : cursor || {
    lastUpdatedAt: '1970-01-01T00:00:00.000Z',
    lastId: '0'
  };
  
  return {
    rows: page,
    more,
    nextCursor
  };
}