// deno-lint-ignore-file no-explicit-any
// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { validateJWT } from '../_shared/auth.ts';

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

// Basic allow‑list of mutable fields (shared across tables for now). Any other incoming fields are dropped.
// This prevents clients from attempting to tamper with server managed columns or unexpected schema areas.
const MUTABLE_FIELD_ALLOWLIST = new Set<string>([
  'id', 'name', 'title', 'description', 'favorite_exercises', 'exercise_id', 'workout_id',
  'settings', 'locale', 'units', 'rep_speed_factor', 'cues', 'data', 'metadata', 'payload',
  'version', 'deleted'
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const correlationId = crypto.randomUUID();
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, correlationId);
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401, correlationId);
    const jwt = authHeader.replace('Bearer ', '');
    const userId = await validateJWT(jwt);
    if (!userId) return json({ error: 'Invalid token' }, 401, correlationId);

    const rawBody = await req.text();
    if (!rawBody) return json({ error: 'Empty body' }, 400, correlationId);
    if (rawBody.length > 32_000) return json({ error: 'Payload too large' }, 413, correlationId);
    let body: EdgeSyncRequestV2;
    try { body = JSON.parse(rawBody); } catch (e) { return json({ error: 'Invalid JSON', message: (e as Error).message }, 400, correlationId); }

    // Basic shape validation
    if (!body || typeof body !== 'object' || !body.tables) return json({ error: 'Invalid request shape' }, 400, correlationId);
    if (!body.mode || !['light','full','priority'].includes(body.mode)) return json({ error: 'Invalid mode' }, 400, correlationId);

    // Enforce push batch limit
    let pushCount = 0;
    for (const [table, payload] of Object.entries(body.tables)) {
      if (!SYNC_TABLES.includes(table)) return json({ error: `Table not allowed: ${table}` }, 400, correlationId);
      pushCount += (payload.upserts?.length || 0) + (payload.deletes?.length || 0);
      if (pushCount > PUSH_BATCH_LIMIT) return json({ error: 'Batch too large', max: PUSH_BATCH_LIMIT }, 400, correlationId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Required for server authoritative writes
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const response: EdgeSyncResponseV2 = { correlation_id: correlationId, server_time: new Date().toISOString(), tables: {} as any };

    let pushErrors = 0;
    // 1. Process pushes (upserts / deletes) respecting version precedence & resurrection rules
    for (const table of Object.keys(body.tables)) {
      const { upserts = [], deletes = [] } = body.tables[table];
      // Upserts
      for (const record of upserts) {
        try {
          const id = record.id as string | undefined;
            if (!id) continue;
            // Fetch existing
            const { data: existing } = await supabase.from(table).select('id, version, owner_id, deleted, updated_at').eq('id', id).maybeSingle();
            const now = new Date().toISOString();
            const incomingVersion = typeof record.version === 'number' ? record.version : 0;
            if (!existing) {
              // Insert new
              const insertRecord = scrubIncoming(record, userId, now, incomingVersion);
              await supabase.from(table).insert(insertRecord);
            } else {
              // Ownership check
              if (existing.owner_id && existing.owner_id !== userId) continue; // skip foreign-owned row
              // Resurrection prevention: if server row is deleted and client isn't explicitly deleting, skip
              if (existing.deleted && !record.deleted) continue;
              // If client version <= existing version, skip (server authoritative)
              if ((existing.version ?? 0) >= incomingVersion) continue;
              const updateRecord = scrubIncoming(record, userId, now, incomingVersion);
              await supabase.from(table).update(updateRecord).eq('id', id);
            }
        } catch (e) {
          if (pushErrors < MAX_SERVER_ERRORS_LOGGED) {
            console.log(JSON.stringify({ level: 'error', msg: 'upsert_failed', table, id: (record as any)?.id, correlation_id: correlationId, error: (e as Error).message }));
            pushErrors++;
          }
        }
      }
      // Deletes -> soft delete
      for (const id of deletes) {
        try {
          const now = new Date().toISOString();
          // Only update if owned by user; version bump by incrementing (select current version first for safety)
          const { data: existing } = await supabase.from(table).select('version, owner_id').eq('id', id).maybeSingle();
          if (!existing || (existing.owner_id && existing.owner_id !== userId)) continue;
          const newVersion = (existing.version ?? 0) + 1;
          await supabase.from(table).update({ deleted: true, updated_at: now, version: newVersion }).eq('id', id).eq('owner_id', userId);
        } catch (e) {
          if (pushErrors < MAX_SERVER_ERRORS_LOGGED) {
            console.log(JSON.stringify({ level: 'error', msg: 'delete_failed', table, id, correlation_id: correlationId, error: (e as Error).message }));
            pushErrors++;
          }
        }
      }
    }

    // 2. Pull changes per table with pagination via composite cursor
    for (const table of SYNC_TABLES) {
      const cursor = body.since?.[table];
      const { rows, more, nextCursor } = await pullTablePage(supabase, table, userId, cursor, PULL_PAGE_SIZE);
      const upserts: any[] = [];
      const deletes: string[] = [];
      for (const row of rows) {
        if (row.deleted) deletes.push(row.id);
        else upserts.push(stripServerOnly(row));
      }
      response.tables[table] = { upserts, deletes, nextCursor, more };
    }

    return json(response, 200, correlationId);
  } catch (e) {
    return json({ error: 'Internal error', message: (e as Error).message }, 500, correlationId);
  }
});

function json(body: unknown, status = 200, correlationId?: string): Response {
  const payload = { ...(body as any), correlation_id: correlationId };
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId || '' } });
}

function scrubIncoming(record: Record<string, unknown>, userId: string, now: string, version: number) {
  // Whitelist allowed mutable fields only
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (MUTABLE_FIELD_ALLOWLIST.has(k)) cleaned[k] = v;
  }
  cleaned.id = record.id; // ensure id present
  cleaned.owner_id = userId;
  cleaned.updated_at = now;
  cleaned.version = version;
  // Allow explicit deleted=true coming from client (late delivery); else default false
  cleaned.deleted = record.deleted === true;
  return cleaned;
}

function stripServerOnly(row: any) {
  // Remove owner_id for privacy; retain domain + meta fields required client-side
  const { owner_id, created_at, ...rest } = row;
  return rest;
}

async function pullTablePage(supabase: any, table: string, userId: string, cursor: TableCursor | undefined, pageSize: number): Promise<{ rows: any[]; more: boolean; nextCursor: TableCursor }> {
  // Build filter for user scope (owner_id) except exercises may include shared/public in future; for now owner only or owner=null for builtin exercises
  let baseQuery = supabase.from(table).select('*').order('updated_at', { ascending: true }).order('id', { ascending: true });
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
  console.log(JSON.stringify({ level: 'error', msg: 'pull_failed', table, correlation_id: correlationIdGlobal(), error: error.message }));
    return { rows: [], more: false, nextCursor: cursor || { lastUpdatedAt: '1970-01-01T00:00:00.000Z', lastId: '0' } };
  }
  const rows = data || [];
  const more = rows.length > pageSize;
  const page = more ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor: TableCursor = last ? { lastUpdatedAt: last.updated_at, lastId: last.id } : (cursor || { lastUpdatedAt: '1970-01-01T00:00:00.000Z', lastId: '0' });
  return { rows: page, more, nextCursor };
}

// Provide access to latest correlation id for logging in helpers (simple closure-less fallback)
function correlationIdGlobal(): string | undefined {
  // Deno doesn't have a built-in async local storage here; kept minimal.
  return undefined;
}
