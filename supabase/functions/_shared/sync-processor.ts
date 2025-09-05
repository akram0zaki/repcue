import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SyncRequest {
  since?: string;
  tables: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  clientInfo?: {
    appVersion: string;
    deviceId: string;
  };
}

interface SyncResponse {
  changes: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  cursor: string;
}

// List of syncable tables in the order they should be processed
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings',
  'feature_flags',        // Feature toggles
  'exercises',            // Built-in + user-created via owner_id
  'exercise_shares',      // Sharing permissions  
  'exercise_ratings',     // Community ratings
  'exercise_videos',      // Custom videos
  'workouts',             // Built-in + user-created via owner_id
  'workout_shares',       // Workout sharing
  'workout_ratings',      // Workout ratings
  'user_favorites',       // Unified favorites
  'content_moderation',   // Moderation queue
  'activity_logs',
  'workout_sessions'
] as const;

export async function processSyncRequest(
  supabase: SupabaseClient,
  userId: string,
  request: SyncRequest
): Promise<SyncResponse> {
  const response: SyncResponse = {
    changes: {},
    cursor: new Date().toISOString()
  };

  // Initialize response structure
  for (const tableName of SYNCABLE_TABLES) {
    response.changes[tableName] = { upserts: [], deletes: [] };
  }

  try {
    // Process each table
    for (const tableName of SYNCABLE_TABLES) {
      const clientChanges = request.tables[tableName];
      if (!clientChanges) continue;

      await processSyncForTable(
        supabase,
        userId,
        tableName,
        clientChanges,
        request.since,
        response.changes[tableName]
      );
    }

    // Update sync cursor for the user
    await updateSyncCursor(supabase, userId, response.cursor);

    return response;
  } catch (error) {
    console.error('Sync processing error:', error);
    throw error;
  }
}

async function processSyncForTable(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  clientChanges: { upserts: Record<string, unknown>[]; deletes: string[] },
  since: string | undefined,
  responseChanges: { upserts: Record<string, unknown>[]; deletes: string[] }
): Promise<void> {
  try {
    // Step 1: Process client upserts
    for (const record of clientChanges.upserts) {
      await processClientUpsert(supabase, userId, tableName, record);
    }

    // Step 2: Process client deletes
    for (const recordId of clientChanges.deletes) {
      await processClientDelete(supabase, userId, tableName, recordId);
    }

    // Step 3: Get server changes since last sync
    const serverChanges = await getServerChanges(supabase, userId, tableName, since);
    responseChanges.upserts = serverChanges.upserts;
    responseChanges.deletes = serverChanges.deletes;

  } catch (error) {
    console.error(`Error processing sync for table ${tableName}:`, error);
    throw error;
  }
}

async function processClientUpsert(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  record: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Set ownership and server-side metadata
    const serverRecord = {
      ...record,
      owner_id: userId,
      updated_at: now,
      deleted: false
    };

    // Check if record exists
    const { data: existing, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', record.id)
      .single();

    // If table doesn't exist, skip processing
    if (selectError?.code === '42P01' || selectError?.message?.includes('does not exist')) {
      console.warn(`Table ${tableName} does not exist, skipping upsert for ${record.id}`);
      return;
    }

    if (existing) {
      // Update existing record with conflict resolution
      const resolvedRecord = resolveConflict(existing, serverRecord);
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update(resolvedRecord)
        .eq('id', record.id);
        
      if (updateError) {
        if (updateError.code === '42P01' || updateError.message?.includes('does not exist')) {
          console.warn(`Table ${tableName} does not exist, skipping update for ${record.id}`);
          return;
        } else {
          console.error(`Update error for ${tableName}:${record.id}:`, updateError);
          throw updateError;
        }
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(serverRecord);
        
      if (insertError) {
        if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
          console.warn(`Table ${tableName} does not exist, skipping insert for ${record.id}`);
          return;
        } else {
          console.error(`Insert error for ${tableName}:${record.id}:`, insertError);
          throw insertError;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing upsert for ${tableName}:${record.id}:`, error);
    // Continue processing other records
  }
}

async function processClientDelete(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  recordId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Soft delete (tombstone)
    const { error } = await supabase
      .from(tableName)
      .update({
        deleted: true,
        updated_at: now
      })
      .eq('id', recordId)
      .eq('owner_id', userId);

    // If table doesn't exist, skip processing
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      console.warn(`Table ${tableName} does not exist, skipping delete for ${recordId}`);
      return;
    }
  } catch (error) {
    console.error(`Error processing delete for ${tableName}:${recordId}:`, error);
    // Continue processing other records
  }
}

async function getServerChanges(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  since: string | undefined
): Promise<{ upserts: Record<string, unknown>[]; deletes: string[] }> {
  try {
    let records: any[] = [];

    // Handle different table types with specific sync logic
    switch (tableName) {
      case 'exercises':
        records = await getExerciseChanges(supabase, userId, since);
        break;
      case 'workouts':
        records = await getWorkoutChanges(supabase, userId, since);
        break;
      case 'exercise_shares':
      case 'workout_shares':
        records = await getShareChanges(supabase, userId, tableName, since);
        break;
      case 'feature_flags':
        records = await getFeatureFlagChanges(supabase, userId, since);
        break;
      case 'exercise_ratings':
      case 'workout_ratings':
      case 'exercise_videos':
        records = await getRatingOrVideoChanges(supabase, userId, tableName, since);
        break;
      default:
        // Standard user-scoped tables
        records = await getStandardChanges(supabase, userId, tableName, since);
        break;
    }

    const upserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];

    for (const record of records || []) {
      if (record.deleted) {
        deletes.push(record.id);
      } else {
        // Remove server-only fields but keep owner_id for client understanding
        const clientRecord = { ...record };
        upserts.push(clientRecord);
      }
    }

    return { upserts, deletes };
  } catch (error) {
    console.error(`Error getting server changes for ${tableName}:`, error);
    return { upserts: [], deletes: [] };
  }
}

async function getExerciseChanges(
  supabase: SupabaseClient,
  userId: string,
  since: string | undefined
): Promise<any[]> {
  // Get user's own exercises + shared exercises + public exercises + builtin exercises
  let ownExercisesQuery = supabase
    .from('exercises')
    .select('*')
    .eq('owner_id', userId);

  let sharedExercisesQuery = supabase
    .from('exercises')
    .select('*')
    .neq('owner_id', userId)
    .or(`id.in.(${await getSharedExerciseIds(supabase, userId)}),is_public.eq.true`);

  let builtinExercisesQuery = supabase
    .from('exercises')
    .select('*')
    .is('owner_id', null);

  if (since) {
    ownExercisesQuery = ownExercisesQuery.gt('updated_at', since);
    sharedExercisesQuery = sharedExercisesQuery.gt('updated_at', since);
    builtinExercisesQuery = builtinExercisesQuery.gt('updated_at', since);
  }

  const [ownResult, sharedResult, builtinResult] = await Promise.all([
    ownExercisesQuery,
    sharedExercisesQuery,
    builtinExercisesQuery
  ]);

  const allRecords = [
    ...(ownResult.data || []),
    ...(sharedResult.data || []),
    ...(builtinResult.data || [])
  ];

  // Deduplicate by ID
  const unique = new Map();
  allRecords.forEach(record => unique.set(record.id, record));
  return Array.from(unique.values());
}

async function getWorkoutChanges(
  supabase: SupabaseClient,
  userId: string,
  since: string | undefined
): Promise<any[]> {
  // Similar to exercises but for workouts
  let ownWorkoutsQuery = supabase
    .from('workouts')
    .select('*')
    .eq('owner_id', userId);

  let sharedWorkoutsQuery = supabase
    .from('workouts')
    .select('*')
    .neq('owner_id', userId)
    .or(`id.in.(${await getSharedWorkoutIds(supabase, userId)}),is_public.eq.true`);

  if (since) {
    ownWorkoutsQuery = ownWorkoutsQuery.gt('updated_at', since);
    sharedWorkoutsQuery = sharedWorkoutsQuery.gt('updated_at', since);
  }

  const [ownResult, sharedResult] = await Promise.all([
    ownWorkoutsQuery,
    sharedWorkoutsQuery
  ]);

  const allRecords = [
    ...(ownResult.data || []),
    ...(sharedResult.data || [])
  ];

  const unique = new Map();
  allRecords.forEach(record => unique.set(record.id, record));
  return Array.from(unique.values());
}

async function getShareChanges(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  since: string | undefined
): Promise<any[]> {
  // Shares TO this user + shares FROM this user
  let query = supabase
    .from(tableName)
    .select('*')
    .or(`shared_with_user_id.eq.${userId},owner_id.eq.${userId}`);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data } = await query;
  return data || [];
}

async function getFeatureFlagChanges(
  supabase: SupabaseClient,
  userId: string,
  since: string | undefined
): Promise<any[]> {
  // Feature flags are read-only for clients
  let query = supabase
    .from('feature_flags')
    .select('*')
    .in('target_audience', ['all', 'authenticated']);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data } = await query;
  return data || [];
}

async function getRatingOrVideoChanges(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  since: string | undefined
): Promise<any[]> {
  // User's own ratings/videos + approved public ones
  let query = supabase
    .from(tableName)
    .select('*')
    .or(`user_id.eq.${userId},is_verified.eq.true`);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data } = await query;
  return data || [];
}

async function getStandardChanges(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  since: string | undefined
): Promise<any[]> {
  let query = supabase
    .from(tableName)
    .select('*')
    .eq('owner_id', userId);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data, error } = await query;
  
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn(`Table ${tableName} does not exist, returning empty changes`);
      return [];
    }
    throw error;
  }

  return data || [];
}

async function getSharedExerciseIds(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('exercise_shares')
    .select('exercise_id')
    .eq('shared_with_user_id', userId);
  
  const ids = data?.map(share => `"${share.exercise_id}"`).join(',') || '';
  return ids || '""'; // Return empty string ID if no shares
}

async function getSharedWorkoutIds(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('workout_shares')
    .select('workout_id')
    .eq('shared_with_user_id', userId);
    
  const ids = data?.map(share => `"${share.workout_id}"`).join(',') || '';
  return ids || '""';
}

function resolveConflict(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const existingTime = new Date(existing.updated_at as string || 0);
  const incomingTime = new Date(incoming.updated_at as string || 0);
  
  // Last-writer-wins by timestamp
  if (incomingTime >= existingTime) {
    return incoming;
  } else {
    return existing;
  }
}

async function updateSyncCursor(
  supabase: SupabaseClient,
  userId: string,
  cursor: string
): Promise<void> {
  try {
    // Upsert sync cursor
    const { error } = await supabase
      .from('sync_cursors')
      .upsert({
        user_id: userId,
        last_ack_cursor: cursor,
        updated_at: new Date().toISOString()
      });

    // If sync_cursors table doesn't exist, skip
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      console.warn('sync_cursors table does not exist, skipping cursor update');
      return;
    }
  } catch (error) {
    console.error('Error updating sync cursor:', error);
    // Non-critical error, don't throw
  }
}