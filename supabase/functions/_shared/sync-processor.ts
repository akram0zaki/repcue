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
  'exercises',
  'workouts',
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
    const { data: existing } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', record.id)
      .single();

    if (existing) {
      // Update existing record with conflict resolution
      const resolvedRecord = resolveConflict(existing, serverRecord);
      
      await supabase
        .from(tableName)
        .update(resolvedRecord)
        .eq('id', record.id);
    } else {
      // Insert new record
      await supabase
        .from(tableName)
        .insert(serverRecord);
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
    await supabase
      .from(tableName)
      .update({
        deleted: true,
        updated_at: now
      })
      .eq('id', recordId)
      .eq('owner_id', userId);
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
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('owner_id', userId);

    // Filter by timestamp if provided
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data: records, error } = await query;
    
    if (error) {
      throw error;
    }

    const upserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];

    for (const record of records || []) {
      if (record.deleted) {
        deletes.push(record.id);
      } else {
        // Remove server-only fields
        const { owner_id, ...clientRecord } = record;
        upserts.push(clientRecord);
      }
    }

    return { upserts, deletes };
  } catch (error) {
    console.error(`Error getting server changes for ${tableName}:`, error);
    return { upserts: [], deletes: [] };
  }
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
    await supabase
      .from('sync_cursors')
      .upsert({
        user_id: userId,
        last_ack_cursor: cursor,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error updating sync cursor:', error);
    // Non-critical error, don't throw
  }
}