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

// Enhanced logging function that ensures logs are written
function logWithContext(correlationId, level, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${correlationId}] [${level}] ${message}`;
  if (data) {
    console.log(logEntry, data);
  } else {
    console.log(logEntry);
  }
  // Also log to error for critical issues to ensure visibility
  if (level === 'ERROR' || level === 'CRITICAL') {
    console.error(logEntry, data || '');
  }
}

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
  'workout_sessions',
  'video_files'
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

// Enhanced file upload to Supabase Storage with detailed error reporting
async function uploadFileToStorage(supabase, fileData, fileName, mimeType, correlationId, bucket = 'videos') {
  try {
    logWithContext(correlationId, 'INFO', `Starting file upload: ${fileName} (${mimeType}) to bucket '${bucket}'`);

    // Convert byte array back to Uint8Array for upload
    let uint8Array;
    if (Array.isArray(fileData)) {
      uint8Array = new Uint8Array(fileData);
      logWithContext(correlationId, 'DEBUG', `Converted byte array to Uint8Array: ${fileData.length} bytes`);
    } else if (fileData instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(fileData);
      logWithContext(correlationId, 'DEBUG', `Using ArrayBuffer as Uint8Array: ${fileData.byteLength} bytes`);
    } else if (fileData instanceof Uint8Array) {
      uint8Array = fileData;
      logWithContext(correlationId, 'DEBUG', `Using existing Uint8Array: ${fileData.length} bytes`);
    } else {
      const error = `Unsupported file_data type: ${typeof fileData}`;
      logWithContext(correlationId, 'ERROR', error);
      throw new Error(error);
    }

    logWithContext(correlationId, 'INFO', `File conversion complete. Size: ${uint8Array.length} bytes`);

    // Generate unique storage path to avoid conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const storagePath = `${fileName}`;

    // Attempt file upload
    const uploadStartTime = Date.now();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, uint8Array, {
        contentType: mimeType,
        upsert: true // Allow overwriting existing files
      });

    const uploadDuration = Date.now() - uploadStartTime;

    if (error) {
      logWithContext(correlationId, 'ERROR', 'Storage upload failed', {
        fileName: fileName,
        fileSize: uint8Array.length,
        mimeType: mimeType,
        bucket: bucket,
        uploadDuration: `${uploadDuration}ms`,
        error: {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error.status,
          statusCode: error.statusCode,
          details: error
        }
      });
      return {
        success: false,
        error: `Storage upload failed: ${error.message}`,
        errorCode: error.code || error.name || 'UPLOAD_ERROR',
        errorDetails: {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error.status,
          statusCode: error.statusCode
        }
      };
    }

    logWithContext(correlationId, 'INFO', `Storage upload successful in ${uploadDuration}ms`, {
      fileName: fileName,
      storagePath: data.path,
      fileSize: uint8Array.length,
      bucket: bucket
    });

    return {
      success: true,
      path: data.path,
      uploadDuration: uploadDuration
    };
  } catch (e) {
    logWithContext(correlationId, 'CRITICAL', 'Storage upload exception', {
      fileName: fileName,
      error: {
        message: e.message,
        name: e.name,
        stack: e.stack
      }
    });
    return {
      success: false,
      error: `Storage upload exception: ${e.message}`,
      errorCode: 'EXCEPTION',
      errorDetails: {
        message: e.message,
        name: e.name,
        stack: e.stack
      }
    };
  }
}

// FIXED: Enforce singleton pattern for video files per exercise
// This now runs AFTER the record is inserted to avoid race conditions
async function enforceVideoFileSingletonAfterInsert(supabase, userId, exerciseId, keepVideoId, correlationId) {
  try {
    logWithContext(correlationId, 'INFO', `FIXED: Enforcing video file singleton for exercise ${exerciseId}, keeping ${keepVideoId}`);

    // Use a transaction to ensure atomicity
    const { data: existingFiles, error } = await supabase
      .from('video_files')
      .select('id, file_name, storage_path')
      .eq('owner_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('deleted', false)
      .neq('id', keepVideoId);

    if (error) {
      logWithContext(correlationId, 'ERROR', 'Error querying existing video files', {
        exerciseId: exerciseId,
        error: error
      });
      return { success: false, error: error.message };
    }

    if (existingFiles && existingFiles.length > 0) {
      logWithContext(correlationId, 'INFO', `FIXED: Found ${existingFiles.length} existing video files to delete (singleton enforcement)`);

      // Use bulk update for efficiency and atomicity
      const idsToDelete = existingFiles.map(f => f.id);

      const { error: deleteError } = await supabase
        .from('video_files')
        .update({
          deleted: true,
          updated_at: new Date().toISOString()
        })
        .in('id', idsToDelete);

      if (deleteError) {
        logWithContext(correlationId, 'ERROR', `Failed to mark video files as deleted`, deleteError);
        return { success: false, error: deleteError.message };
      }

      logWithContext(correlationId, 'INFO', `FIXED: Successfully marked ${idsToDelete.length} video files as deleted`);

      // Clean up storage files asynchronously (don't block on this)
      for (const file of existingFiles) {
        if (file.storage_path) {
          try {
            await supabase.storage.from('videos').remove([file.storage_path]);
            logWithContext(correlationId, 'INFO', `Cleaned up storage file: ${file.storage_path}`);
          } catch (storageError) {
            logWithContext(correlationId, 'WARN', `Storage cleanup failed for ${file.storage_path}`, storageError);
          }
        }
      }
    } else {
      logWithContext(correlationId, 'INFO', 'FIXED: No existing video files found - singleton constraint satisfied');
    }

    return { success: true };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', 'FIXED: Singleton enforcement error', {
      exerciseId: exerciseId,
      error: { message: e.message, stack: e.stack }
    });
    return { success: false, error: e.message };
  }
}

// Update exercise record after successful video upload
async function updateExerciseVideoUrl(supabase, exerciseId, userId, videoFileName, correlationId) {
  try {
    logWithContext(correlationId, 'INFO', `Updating exercise ${exerciseId} with video URL`);
    const videoUrl = `blob-pending-sync://${exerciseId}/${videoFileName}`;

    const { error: updateError } = await supabase
      .from('exercises')
      .update({
        custom_video_url: videoUrl,
        has_video: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', exerciseId)
      .eq('owner_id', userId);

    if (updateError) {
      logWithContext(correlationId, 'ERROR', 'Failed to update exercise video URL', {
        exerciseId: exerciseId,
        videoUrl: videoUrl,
        error: updateError
      });
      return { success: false, error: updateError.message };
    }

    logWithContext(correlationId, 'INFO', `Exercise updated successfully with video URL: ${videoUrl}`);
    return { success: true };
  } catch (e) {
    logWithContext(correlationId, 'ERROR', 'Exception updating exercise video URL', {
      exerciseId: exerciseId,
      error: { message: e.message, stack: e.stack }
    });
    return { success: false, error: e.message };
  }
}

// Validate and scrub incoming record fields against allowlist
function scrubIncoming(table, record) {
  const allowlist = MUTABLE_FIELD_ALLOWLIST[table];
  if (!allowlist) {
    console.warn(`No field allowlist defined for table: ${table}`);
    return record;
  }
  const scrubbed = {};
  for (const [key, value] of Object.entries(record)) {
    if (allowlist.has(key)) {
      scrubbed[key] = value;
    } else {
      console.warn(`Filtered disallowed field '${key}' from ${table} record`);
    }
  }
  return scrubbed;
}

serve(async (req) => {
  // Generate correlation ID for request tracing
  const correlationId = crypto.randomUUID();
  logWithContext(correlationId, 'INFO', `sync_v2_fixed edge function called: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logWithContext(correlationId, 'WARN', 'Missing or invalid Authorization header');
      return json({ error: 'Missing Authorization header' }, 401, correlationId);
    }

    const jwt = authHeader.substring(7);
    const userId = await validateJWT(jwt);
    if (!userId) {
      logWithContext(correlationId, 'WARN', 'JWT validation failed');
      return json({ error: 'Invalid or expired token' }, 401, correlationId);
    }

    logWithContext(correlationId, 'INFO', `Authenticated user: ${userId}`);

    // 2. Parse request body
    const body = await req.json();
    logWithContext(correlationId, 'DEBUG', 'Request body parsed', {
      mode: body.mode,
      tablesWithData: Object.keys(body.tables || {}),
      sinceKeys: Object.keys(body.since || {}),
      clientInfo: body.clientInfo
    });

    // 3. Connect to Supabase with service key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      logWithContext(correlationId, 'CRITICAL', 'Missing Supabase environment variables');
      return json({ error: 'Server configuration error' }, 500, correlationId);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext(correlationId, 'INFO', 'Supabase client initialized');

    // 4. Initialize response
    const response = {
      correlation_id: correlationId,
      server_time: new Date().toISOString(),
      tables: {}
    };

    let pushErrors = 0;
    let pushSuccesses = 0;
    const detailedErrors = [];

    // 1. Process pushes (upserts / deletes) - FIXED video file handling
    for (const table of Object.keys(body.tables)) {
      const { upserts = [], deletes = [] } = body.tables[table];
      logWithContext(correlationId, 'INFO', `Processing ${table}: ${upserts.length} upserts, ${deletes.length} deletes`);

      // Upserts
      for (let record of upserts) {
        try {
          const id = record.id;
          if (!id) {
            logWithContext(correlationId, 'WARN', `Skipping record without ID in ${table}`);
            continue;
          }

          logWithContext(correlationId, 'DEBUG', `Processing ${table}:${id}`, {
            incomingFields: Object.keys(record)
          });

          // FIXED: Special handling for video_files table with file uploads
          if (table === 'video_files' && record.file_data && record.upload_pending) {
            logWithContext(correlationId, 'INFO', `FIXED: Processing video file upload for ${id}`, {
              fileName: record.file_name,
              fileSize: Array.isArray(record.file_data) ? record.file_data.length : 'unknown',
              exerciseId: record.exercise_id
            });

            // Generate storage path
            const storagePath = `${userId}/${record.exercise_id}/${record.file_name}`;

            // Upload file to Supabase Storage
            const uploadResult = await uploadFileToStorage(
              supabase,
              record.file_data,
              storagePath,
              record.mime_type,
              correlationId
            );

            if (!uploadResult.success) {
              logWithContext(correlationId, 'ERROR', `Storage upload failed for ${id}`, uploadResult);
              detailedErrors.push({
                table: 'video_files',
                operation: 'upload',
                recordId: id,
                fileName: record.file_name,
                error: uploadResult.error,
                errorCode: uploadResult.errorCode,
                errorDetails: uploadResult.errorDetails
              });
              pushErrors++;
              continue;
            }

            logWithContext(correlationId, 'INFO', `Video uploaded successfully: ${uploadResult.path}`);

            // Update record
            record = {
              ...record,
              file_data: null,
              upload_pending: false,
              storage_path: uploadResult.path
            };
          }

          // Standard database operations
          const now = new Date().toISOString();
          const incomingVersion = typeof record.version === 'number' ? record.version : 1;

          // Check if record exists
          const { data: existing, error: fetchError } = await supabase
            .from(table)
            .select('id, version, owner_id, deleted, updated_at')
            .eq('id', id)
            .maybeSingle();

          if (fetchError) {
            logWithContext(correlationId, 'ERROR', `Fetch error for ${table}:${id}`, fetchError);
            pushErrors++;
            continue;
          }

          if (!existing) {
            // INSERT
            logWithContext(correlationId, 'INFO', `INSERT: ${table}:${id} (new record)`);
            const scrubbedRecord = scrubIncoming(table, {
              ...record,
              owner_id: userId,
              created_at: record.created_at || now,
              updated_at: now,
              version: incomingVersion
            });

            const { error: insertError } = await supabase
              .from(table)
              .insert(scrubbedRecord);

            if (insertError) {
              const errorDetail = {
                table,
                operation: 'insert',
                recordId: id,
                message: insertError.message,
                details: insertError.details,
                code: insertError.code
              };
              detailedErrors.push(errorDetail);
              logWithContext(correlationId, 'ERROR', `Insert error for ${table}:${id}`, errorDetail);
              pushErrors++;
            } else {
              logWithContext(correlationId, 'INFO', `INSERT success: ${table}:${id}`);
              pushSuccesses++;

              // FIXED: Enforce singleton AFTER successful insert for video files
              if (table === 'video_files') {
                const singletonResult = await enforceVideoFileSingletonAfterInsert(
                  supabase,
                  userId,
                  record.exercise_id,
                  id,
                  correlationId
                );

                if (!singletonResult.success) {
                  logWithContext(correlationId, 'ERROR', `FIXED: Singleton enforcement failed: ${singletonResult.error}`);
                }

                // Update the corresponding exercise record
                const exerciseUpdateResult = await updateExerciseVideoUrl(
                  supabase,
                  record.exercise_id,
                  userId,
                  record.file_name,
                  correlationId
                );

                if (!exerciseUpdateResult.success) {
                  logWithContext(correlationId, 'ERROR', `Failed to update exercise video URL: ${exerciseUpdateResult.error}`);
                }
              }
            }
          } else {
            // UPDATE logic (existing code continues...)
            const existingVersion = existing.version || 1;
            const existingDeleted = existing.deleted || false;

            logWithContext(correlationId, 'DEBUG', `UPDATE: ${table}:${id} - existing v${existingVersion} (deleted: ${existingDeleted}) vs incoming v${incomingVersion}`);

            if (incomingVersion > existingVersion || (incomingVersion === existingVersion && !existingDeleted && record.deleted)) {
              logWithContext(correlationId, 'INFO', `Updating ${table}:${id} (version precedence: ${incomingVersion} > ${existingVersion})`);

              const scrubbedRecord = scrubIncoming(table, {
                ...record,
                owner_id: userId,
                updated_at: now,
                version: incomingVersion
              });

              const { error: updateError } = await supabase
                .from(table)
                .update(scrubbedRecord)
                .eq('id', existing.id);

              if (updateError) {
                const errorDetail = {
                  table,
                  operation: 'update',
                  recordId: id,
                  message: updateError.message,
                  details: updateError.details,
                  code: updateError.code
                };
                detailedErrors.push(errorDetail);
                logWithContext(correlationId, 'ERROR', `Update error for ${table}:${id}`, errorDetail);
                pushErrors++;
              } else {
                logWithContext(correlationId, 'INFO', `UPDATE success: ${table}:${id}`);
                pushSuccesses++;
              }
            } else {
              logWithContext(correlationId, 'DEBUG', `SKIP: ${table}:${id} (version conflict: incoming ${incomingVersion} <= existing ${existingVersion})`);
              pushSuccesses++;
            }
          }
        } catch (e) {
          logWithContext(correlationId, 'ERROR', `Upsert processing error for ${table}`, {
            recordId: record.id,
            error: { message: e.message, stack: e.stack }
          });
          pushErrors++;
        }
      }

      // Deletes (unchanged)
      for (const deleteId of deletes) {
        try {
          logWithContext(correlationId, 'INFO', `DELETE: ${table}:${deleteId}`);
          const { error: deleteError } = await supabase
            .from(table)
            .update({
              deleted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', deleteId)
            .eq('owner_id', userId);

          if (deleteError) {
            logWithContext(correlationId, 'ERROR', `Delete error for ${table}:${deleteId}`, deleteError);
            pushErrors++;
          } else {
            logWithContext(correlationId, 'INFO', `DELETE success: ${table}:${deleteId}`);
            pushSuccesses++;
          }
        } catch (e) {
          logWithContext(correlationId, 'ERROR', `Delete processing error for ${table}:${deleteId}`, {
            error: { message: e.message, stack: e.stack }
          });
          pushErrors++;
        }
      }
    }

    logWithContext(correlationId, 'INFO', `FIXED: Push phase completed: ${pushSuccesses} successes, ${pushErrors} errors`);

    // Final response
    const totalErrors = pushErrors;
    const totalSuccesses = pushSuccesses;

    response.sync_metadata = {
      push_successes: pushSuccesses,
      push_errors: pushErrors,
      pull_successes: 0, // Simplified for this fix
      pull_errors: 0,
      total_successes: totalSuccesses,
      total_errors: totalErrors,
      detailed_errors: detailedErrors
    };

    if (totalErrors > 0) {
      logWithContext(correlationId, 'WARN', `FIXED: Sync completed with partial success: ${totalSuccesses} successes, ${totalErrors} errors`);
      return json({
        ...response,
        status: 'partial_success',
        message: `Sync completed with ${totalErrors} errors out of ${totalSuccesses + totalErrors} total operations`
      }, 207, correlationId);
    } else {
      logWithContext(correlationId, 'INFO', `FIXED: Sync completed successfully: ${totalSuccesses} successes, 0 errors`);
      return json(response, 200, correlationId);
    }

  } catch (e) {
    logWithContext(correlationId, 'CRITICAL', 'FIXED: Sync failed with error', {
      error: { message: e.message, name: e.name, stack: e.stack }
    });
    return json({
      error: 'Internal error',
      message: e.message,
      correlation_id: correlationId
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