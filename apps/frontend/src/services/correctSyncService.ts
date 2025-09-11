import { StorageService } from './storageService';
import { AuthService } from './authService';
import { ConsentService } from './consentService';
import { SYNC_ENABLED, SYNC_DEBUG } from '../config/features';
import logger from '../utils/logger';
import type { AppSettings } from '../types';

// v2 Sync core constants
const PUSH_BATCH_SIZE = 5; // Per spec
// Pull pagination constants
const PULL_PAGE_LIMIT = 5; // max pages per table per sync cycle
const MIN_LIGHT_INTERVAL_MS = 10_000; // Passive light sync suppression window
const EDGE_TIMEOUT_MS = 15_000; // Per-request timeout
const SYNC_TIMEOUT_MS = 8_000; // Overall sync timeout per invocation (reduced to fail fast)

// Ordered tables (light/full filtering applied externally)
const SYNC_ORDER: readonly string[] = [
  'user_preferences',
  'app_settings',
  'exercises',
  'user_favorites',
  'workouts',
  'activity_logs',
  'workout_sessions'
];

// Local sync_state in-memory shape (persisted via IndexedDB generic table added later if absent)
interface TableCursor { lastUpdatedAt: string; lastId: string; }
interface LocalSyncState {
  user_id: string;
  perTable: Record<string, TableCursor>;
  lastFullSyncAt?: string;
  lastLightSyncAt?: string;
  consecutiveFailures: number;
  backoffUntil?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface CorrectSyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  tables: number;
  errors: Array<{ table?: string; message: string; type: string }>;
  correlationId?: string;
}

// Minimal shape for edge interaction (will be expanded when pull logic added)
interface EdgeSyncRequestV2 {
  mode: 'light' | 'full' | 'priority';
  since?: Record<string, TableCursor>; // per-table cursor
  tables: Record<string, { upserts: Array<Record<string, unknown>>; deletes: string[] }>; // push payload
  clientInfo: { deviceId: string; appVersion: string };
}

interface EdgeSyncResponseV2 {
  correlation_id?: string;
  server_time: string;
  tables: Record<string, { upserts: Array<Record<string, unknown>>; deletes: string[]; nextCursor?: TableCursor; more?: boolean }>;
}

export class CorrectSyncService {
  private static instance: CorrectSyncService;
  private storage: StorageService | null = null;
  private auth: AuthService | null = null;
  private consent: ConsentService | null = null;
  private state: LocalSyncState | null = null;
  private inFlight: Promise<CorrectSyncResult> | null = null;
  private isDestroyed = false;
  private readonly deviceId: string;
  private priorityTables: Set<string> | null = null;
  private servicesInitialized = false;

  private constructor() {
    this.deviceId = this.ensureDeviceId();
  }

  private async initializeServices(): Promise<void> {
    if (!this.servicesInitialized) {
      try {
        logger.debug('CorrectSyncService: Starting service initialization');
        this.storage = StorageService.getInstance();
        this.auth = AuthService.getInstance();
        this.consent = ConsentService.getInstance();
        
        // Check if storage service is available but don't wait for ready() to avoid circular dependency
        if (this.storage) {
          logger.debug('CorrectSyncService: Storage service available');
          // Note: Not waiting for storage.ready() to avoid circular dependency during app init
        }
        
        this.servicesInitialized = true;
        logger.debug('CorrectSyncService: Service initialization complete');
      } catch (error) {
        logger.warn('CorrectSyncService: Failed to initialize services:', error);
        throw error; // Re-throw to signal initialization failure
      }
    }
  }

  static getInstance(): CorrectSyncService {
    if (!this.instance) this.instance = new CorrectSyncService();
    return this.instance;
  }

  // Public API (temporary minimal surface)
  async sync(mode: 'light' | 'full' | 'priority' = 'light'): Promise<CorrectSyncResult> {
    if (!SYNC_ENABLED) return this.emptyResult();
    if (this.isDestroyed) return this.emptyResult();
    
    // Initialize services lazily, but don't block if they're not ready
    try {
      // Add timeout to prevent hanging indefinitely
      await Promise.race([
        this.initializeServices(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Service initialization timeout')), 5000))
      ]);
    } catch (error) {
      logger.warn('CorrectSyncService: Services not ready, skipping sync:', error);
      return this.emptyResult();
    }
    
    if (!this.servicesInitialized || !this.storage || !this.auth || !this.consent) {
      logger.debug('CorrectSyncService: Services not initialized, skipping sync');
      return this.emptyResult();
    }
    
    // For sync during app initialization, just check that storage exists but don't wait for ready()
    // This avoids the circular dependency issue where sync waits for storage which waits for app init
    
    if (!this.consent.hasConsent()) return this.emptyResult();
    const authState = this.auth.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken) return this.emptyResult();

    // Thread-safe concurrency guard - immediately reject concurrent calls
    if (this.inFlight) {
      logger.debug(`[sync:v2] sync already in progress, rejecting concurrent call (mode=${mode})`);
      return Promise.resolve({ 
        success: true, 
        pushed: 0, 
        pulled: 0, 
        tables: 0, 
        errors: [{ type: 'info', message: 'Sync already in progress' }] 
      });
    }

    // Backoff check
    try {
      await this.loadState(authState.user!.id);
    } catch (error) {
      logger.warn('CorrectSyncService: Failed to load state, skipping sync:', error);
      return this.emptyResult();
    }
    // Passive suppression for light mode if recent successful light sync and no dirty changes
    if (mode === 'light' && this.state?.lastLightSyncAt) {
      const elapsed = Date.now() - new Date(this.state.lastLightSyncAt).getTime();
      if (elapsed < MIN_LIGHT_INTERVAL_MS) {
        try {
          const hasDirty = await this.hasAnyDirty(['user_preferences','app_settings','exercises','user_favorites'], authState.user!.id);
          if (!hasDirty) {
            return { ...this.emptyResult(), success: true }; // silently skip
          }
        } catch (error) {
          logger.warn('CorrectSyncService: Failed to check dirty records, proceeding with sync:', error);
        }
      }
    }
    if (mode !== 'priority' && this.state?.backoffUntil) {
      const until = new Date(this.state.backoffUntil).getTime();
      if (Date.now() < until) {
        return { ...this.emptyResult(), success: true }; // silently skip
      }
    }

    // Enforce an overall timeout so UI never hangs indefinitely
    const overallTimeout = new Promise<CorrectSyncResult>((_resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error('sync timeout'));
      }, SYNC_TIMEOUT_MS);
    });

  const startTs = performance.now();
  if (SYNC_DEBUG) logger.debug(`[sync:v2] enqueue mode=${mode}`);
  const exec = Promise.race([
      this.performSync(mode, authState.accessToken, authState.user!.id),
      overallTimeout
    ])
      .finally(() => {
        this.inFlight = null;
        if (SYNC_DEBUG) logger.debug(`[sync:v2] finished in ${(performance.now()-startTs).toFixed(0)}ms`);
      });
    this.inFlight = exec;
    return exec;
  }

  // Trigger an immediate priority sync for a subset of tables (phase 6 requirement)
  async priorityPush(tables: string[]): Promise<CorrectSyncResult> {
  this.priorityTables = new Set(tables.filter(t => SYNC_ORDER.includes(t)));
    return this.sync('priority');
  }

  destroy() { this.isDestroyed = true; }

  // Core implementation
  private async performSync(mode: 'light' | 'full' | 'priority', accessToken: string, userId: string): Promise<CorrectSyncResult> {
    const result: CorrectSyncResult = { success: true, pushed: 0, pulled: 0, tables: 0, errors: [] };
    const correlationId = crypto.randomUUID();
    result.correlationId = correlationId;
    logger.info(`[sync:v2] start mode=${mode} cid=${correlationId}`);

    try {
  const tStart = performance.now();
  const lightTables = SYNC_ORDER.slice(0, 4); // preferences, settings, exercises, user_favorites
      let tableList = mode === 'light' ? lightTables : SYNC_ORDER;
      if (mode === 'priority' && this.priorityTables && this.priorityTables.size) {
        tableList = tableList.filter(t => this.priorityTables!.has(t));
      }
  if (SYNC_DEBUG) logger.debug(`[sync:v2] tables=${tableList.join(',')}`);

      // 1. Collect dirty records per table (initial queue per table)
  const queues: Record<string, { upserts: Array<Record<string, unknown>>; deletes: string[] }> = {};
  const collectStart = performance.now();
      for (const table of tableList) {
        const dirty = await this.collectDirtyBatch(table, PUSH_BATCH_SIZE, userId);
        if (dirty.upserts.length || dirty.deletes.length) {
          queues[table] = { upserts: [...dirty.upserts], deletes: [...dirty.deletes] };
        }
      }
  if (SYNC_DEBUG) logger.debug(`[sync:v2] collectDirty done in ${(performance.now()-collectStart).toFixed(0)}ms queues=${Object.entries(queues).map(([k,v])=>`${k}:${(v.upserts?.length||0)+(v.deletes?.length||0)}`).join(' ')}`);

      // Helper to build a single request payload capped to 5 total records across all tables
      const buildCappedPayload = (): EdgeSyncRequestV2['tables'] => {
        let remaining = PUSH_BATCH_SIZE;
        const payload: EdgeSyncRequestV2['tables'] = {};
        for (const table of tableList) {
          if (!queues[table] || remaining <= 0) continue;
          const q = queues[table];
          if (q.deletes.length) {
            const take = Math.min(remaining, q.deletes.length);
            const picked = q.deletes.splice(0, take);
            if (!payload[table]) payload[table] = { upserts: [], deletes: [] };
            payload[table]!.deletes.push(...picked);
            remaining -= picked.length;
          }
          if (remaining <= 0) continue;
          if (q.upserts.length) {
            const take = Math.min(remaining, q.upserts.length);
            const picked = q.upserts.splice(0, take);
            if (!payload[table]) payload[table] = { upserts: [], deletes: [] };
            payload[table]!.upserts.push(...picked);
            remaining -= picked.length;
          }
        }
        return payload;
      };

      // 2. Execute one or more edge calls respecting the 5-record cap
      let sentAtLeastOnce = false;
      let batchCount = 0;
      while (true) {
        batchCount += 1;
        if (batchCount > 200) { // hard guard against infinite loops
          throw new Error('sync batch limit exceeded');
        }
        const loopTs = performance.now();
        const batchPayload = buildCappedPayload();
        const hasPush = Object.values(batchPayload).some(v => (v.upserts.length + v.deletes.length) > 0);
        if (!hasPush && sentAtLeastOnce) break; // no more to push

        const edgeReq: EdgeSyncRequestV2 = {
          mode,
          since: this.state?.perTable || {},
          tables: hasPush ? batchPayload : {},
          clientInfo: { deviceId: this.deviceId, appVersion: '1.0.0' }
        };

        if (SYNC_DEBUG) logger.debug(`[sync:v2] callEdge start batch=${batchCount} push=${hasPush ? Object.values(batchPayload).reduce((a,b)=>a+b.upserts.length+b.deletes.length,0):0}`);
        const callStart = performance.now();
        const response = await this.callEdge(edgeReq, accessToken).catch((e) => {
          if (SYNC_DEBUG) logger.debug(`[sync:v2] callEdge error after ${(performance.now()-callStart).toFixed(0)}ms: ${e instanceof Error ? e.message : String(e)}`);
          throw e;
        });
        if (SYNC_DEBUG) logger.debug(`[sync:v2] callEdge ok in ${(performance.now()-callStart).toFixed(0)}ms`);
        sentAtLeastOnce = true;
        if (response.correlation_id) result.correlationId = response.correlation_id;

        // Mark only what we sent as clean
        if (hasPush) {
          await this.markPushedClean(batchPayload);
          // Update pushed count for reporting
          for (const d of Object.values(batchPayload)) {
            result.pushed += d.upserts.length + d.deletes.length;
          }
        }

        // Apply pull changes per table (with pagination loop if server indicates more)
        const perTable = response.tables || {};
        for (const table of tableList) {
          const tableResp = perTable[table];
          if (!tableResp) continue;
          const { upserts, deletes, nextCursor, more } = tableResp;
          if (upserts.length || deletes.length) {
            if (SYNC_DEBUG) logger.debug(`[sync:v2] apply ${table} upserts=${upserts.length} deletes=${deletes.length}`);
            await this.applyServerTableChanges(table, upserts, deletes, userId);
            result.pulled += upserts.length + deletes.length;
          }
          if (nextCursor) this.setCursor(table, nextCursor, userId);
          // Pagination follow-up if more=true (loop additional pages up to limit)
          let pages = 1;
          let cursor = nextCursor;
          while (more && pages < PULL_PAGE_LIMIT && cursor) {
            pages += 1;
            const followReq: EdgeSyncRequestV2 = { mode, since: { [table]: cursor }, tables: {}, clientInfo: edgeReq.clientInfo };
            const followResp = await this.callEdge(followReq, accessToken);
            const tFollow = followResp.tables?.[table];
            if (!tFollow) break;
            if (tFollow.upserts.length || tFollow.deletes.length) {
              if (SYNC_DEBUG) logger.debug(`[sync:v2] follow ${table} upserts=${tFollow.upserts.length} deletes=${tFollow.deletes.length}`);
              await this.applyServerTableChanges(table, tFollow.upserts, tFollow.deletes, userId);
              result.pulled += tFollow.upserts.length + tFollow.deletes.length;
            }
            if (tFollow.nextCursor) { cursor = tFollow.nextCursor; this.setCursor(table, tFollow.nextCursor, userId); }
            if (!tFollow.more) break;
          }
          result.tables += 1;
        }

        // If any queues still have items, delay 100ms then continue next capped batch
        const anyLeft = Object.values(queues).some(q => (q.upserts?.length ?? 0) + (q.deletes?.length ?? 0) > 0);
        if (SYNC_DEBUG) logger.debug(`[sync:v2] batch ${batchCount} done in ${(performance.now()-loopTs).toFixed(0)}ms left=${anyLeft}`);
        if (!anyLeft) break;
        await new Promise(r => setTimeout(r, 100));
      }

      await this.markModeTimestamp(mode, userId);
      const dur = (performance.now()-tStart).toFixed(0);
      logger.info(`[sync:v2] complete cid=${correlationId} pushed=${result.pushed} pulled=${result.pulled} in ${dur}ms`);
      
      // Dispatch sync:applied event to trigger UI refresh when data was pulled
      if (result.success && result.pulled > 0 && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('sync:applied', { detail: { result } }));
          logger.debug(`[sync:v2] dispatched sync:applied event (pulled=${result.pulled})`);
        } catch (e) {
          logger.debug('sync:applied event dispatch failed (ignored):', e);
        }
      }
      
      return result;
    } catch (err) {
      logger.warn('[sync:v2] sync failed', err);
      result.success = false;
      result.errors.push({ message: err instanceof Error ? err.message : 'Unknown error', type: 'unknown' });
      await this.registerFailure(userId, err);
      return result;
    } finally {
  if (mode === 'priority') this.priorityTables = null; // reset priority selection
      await this.persistState();
    }
  }

  private async collectDirtyBatch(tableName: string, limit: number, userId: string): Promise<{ upserts: Array<Record<string, unknown>>; deletes: string[] }> {
    if (!this.storage) return { upserts: [], deletes: [] };
    const db = this.storage.getDatabase();
    const table = (db as unknown as Record<string, unknown>)[tableName] as {
      where: (field: string) => {
        equals: (value: number) => { limit: (n: number) => { toArray: () => Promise<Array<Record<string, unknown>>> } };
      };
    } | undefined;
    if (!table) return { upserts: [], deletes: [] };
    try {
      // Dexie where('dirty').equals(1).limit(limit)
      const dirty: Array<Record<string, unknown>> = await table.where('dirty').equals(1).limit(limit).toArray();
      if (SYNC_DEBUG && dirty.length > 0) logger.debug(`[sync:v2] collectDirtyBatch ${tableName} found ${dirty.length} dirty records`);
      
      const upserts: Array<Record<string, unknown>> = [];
      const deletes: string[] = [];
      for (const rec of dirty) {
        const recordOwnerId = (rec as { owner_id?: string }).owner_id;
        const shouldSkip = recordOwnerId && recordOwnerId !== userId && tableName !== 'exercises';
        
        if (SYNC_DEBUG && tableName === 'user_preferences') {
          logger.debug(`[sync:v2] collectDirtyBatch user_preferences record:`, {
            id: rec.id,
            owner_id: recordOwnerId,
            userId,
            shouldSkip,
            dirty: (rec as { dirty?: number }).dirty,
            deleted: (rec as { deleted?: boolean }).deleted,
            favorite_exercises: (rec as { favorite_exercises?: string[] }).favorite_exercises
          });
        }
        
        if (shouldSkip) continue; // skip foreign-owned
        if ((rec as { deleted?: boolean; op?: string }).deleted || (rec as { op?: string }).op === 'delete') {
          deletes.push(rec.id as string);
        } else {
          const { dirty: _d, op: _o, synced_at: _s, ...clean } = rec;
          // Apply field mapping for tables that need it
          let mappedRecord = clean;
          if (tableName === 'app_settings' && this.storage) {
            mappedRecord = this.storage.convertAppSettingsForSync(clean as unknown as AppSettings);
          }
          // Note: Other tables (activity_logs, workout_sessions) don't have field mapping methods yet
          
          if (SYNC_DEBUG && tableName === 'user_preferences') {
            logger.debug(`[sync:v2] collectDirtyBatch user_preferences adding to upserts:`, mappedRecord);
          }
          
          upserts.push(mappedRecord);
        }
      }
      return { upserts, deletes };
    } catch (e) {
      logger.error(`[sync:v2] collect dirty failed ${tableName}`, e);
      return { upserts: [], deletes: [] };
    }
  }

  // Fast dirty check across subset of tables for suppression logic
  private async hasAnyDirty(tables: string[], userId: string): Promise<boolean> {
    if (!this.storage) return false; // Guard against uninitialized storage
    try {
      const db = this.storage.getDatabase() as unknown as Record<string, unknown>;
      for (const t of tables) {
        const coll = db[t] as {
          where: (field: string) => {
            equals: (value: number) => { first: () => Promise<Record<string, unknown> | undefined> };
          };
        } | undefined;
        if (!coll) continue;
        const first = await coll.where('dirty').equals(1).first();
        if (first) {
          const ownerId = (first as { owner_id?: string }).owner_id;
          if (ownerId && ownerId !== userId && t !== 'exercises') continue;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async markPushedClean(payload: Record<string, { upserts: Array<Record<string, unknown>>; deletes: string[] }>) {
    if (!this.storage) return;
    const db = this.storage.getDatabase();
    const nowIso = new Date().toISOString();
    for (const [table, data] of Object.entries(payload)) {
      const coll = (db as unknown as Record<string, unknown>)[table] as { update: (id: string, changes: Record<string, unknown>) => Promise<number> } | undefined;
      if (!coll) continue;
      // Mark upserts
      for (const rec of data.upserts) {
        try { await coll.update(rec.id as string, { dirty: 0, op: undefined, synced_at: nowIso }); } catch {}
      }
      // Mark deletes
      for (const id of data.deletes) {
        try { await coll.update(id, { dirty: 0, op: undefined, synced_at: nowIso }); } catch {}
      }
    }
  }

  private async callEdge(reqBody: EdgeSyncRequestV2, accessToken: string): Promise<EdgeSyncResponseV2> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/sync_v2`;
    
    // Debug logging for network requests
    console.log(`[SYNC DEBUG] callEdge URL: ${functionUrl}`);
    console.log(`[SYNC DEBUG] callEdge payload:`, reqBody);
    console.log(`[SYNC DEBUG] callEdge auth token: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'}`);
    
    if (SYNC_DEBUG) {
      logger.debug(`[sync:v2] callEdge URL: ${functionUrl}`);
      logger.debug(`[sync:v2] callEdge payload:`, reqBody);
      logger.debug(`[sync:v2] callEdge auth token: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'}`);
    }
    
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort('timeout'), EDGE_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(t);
      // Enhanced error logging
      if (SYNC_DEBUG) {
        logger.debug(`[sync:v2] callEdge fetch failed:`, e);
      }
      // Normalize aborts into a friendly error
      if (e instanceof DOMException || (e as { name?: string }).name === 'AbortError') {
        throw new Error('edge request aborted (timeout)');
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
    
    // Debug response details
    if (SYNC_DEBUG) {
      logger.debug(`[sync:v2] callEdge response status: ${resp.status} ${resp.statusText}`);
      logger.debug(`[sync:v2] callEdge response headers:`, Object.fromEntries(resp.headers.entries()));
    }
    
    if (!resp.ok) {
      const t = await resp.text();
      if (SYNC_DEBUG) {
        logger.debug(`[sync:v2] callEdge error response body:`, t);
      }
      throw new Error(`edge error ${resp.status}: ${t}`);
    }
    const json = await resp.json();
    
    // Debug successful response
    console.log(`[SYNC DEBUG] callEdge success response:`, json);
    
    if (SYNC_DEBUG) {
      logger.debug(`[sync:v2] callEdge success response:`, json);
    }
    
    // Shape coercion
    return json as EdgeSyncResponseV2;
  }

  private ensureDeviceId(): string {
    try {
      let id = localStorage.getItem('repcue_device_id');
      if (!id) { id = crypto.randomUUID(); localStorage.setItem('repcue_device_id', id); }
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }

  private async loadState(userId: string) {
    if (this.state && this.state.user_id === userId) return;
    if (!this.storage) return; // Guard against uninitialized storage
    try {
      const existing = await this.storage.getSyncState(userId);
      if (existing) {
        const parsed = this.parsePersistedState(existing);
        this.state = { user_id: userId, ...parsed };
        return;
      }
    } catch (e) { logger.warn('[sync:v2] loadState failed', e); }
    this.state = { user_id: userId, perTable: {}, consecutiveFailures: 0 };
  }

  // Coerce untyped persisted JSON into LocalSyncState, with validation and safe defaults
  private parsePersistedState(raw: Record<string, unknown>): Omit<LocalSyncState, 'user_id'> {
    const perTable: Record<string, TableCursor> = {};
    const rawPer = (raw as { perTable?: unknown }).perTable;
    if (rawPer && typeof rawPer === 'object') {
      for (const [k, v] of Object.entries(rawPer as Record<string, unknown>)) {
        if (v && typeof v === 'object') {
          const lastUpdatedAt = (v as { lastUpdatedAt?: unknown }).lastUpdatedAt;
          const lastId = (v as { lastId?: unknown }).lastId;
          if (typeof lastUpdatedAt === 'string' && typeof lastId === 'string') {
            perTable[k] = { lastUpdatedAt, lastId };
          }
        }
      }
    }

    const lastFullSyncAt = typeof (raw as { lastFullSyncAt?: unknown }).lastFullSyncAt === 'string'
      ? (raw as { lastFullSyncAt?: string }).lastFullSyncAt
      : undefined;
    const lastLightSyncAt = typeof (raw as { lastLightSyncAt?: unknown }).lastLightSyncAt === 'string'
      ? (raw as { lastLightSyncAt?: string }).lastLightSyncAt
      : undefined;
    const backoffUntil = typeof (raw as { backoffUntil?: unknown }).backoffUntil === 'string'
      ? (raw as { backoffUntil?: string }).backoffUntil
      : undefined;
    const lastErrorCode = typeof (raw as { lastErrorCode?: unknown }).lastErrorCode === 'string'
      ? (raw as { lastErrorCode?: string }).lastErrorCode
      : undefined;
    const lastErrorMessage = typeof (raw as { lastErrorMessage?: unknown }).lastErrorMessage === 'string'
      ? (raw as { lastErrorMessage?: string }).lastErrorMessage
      : undefined;
  const cfRaw = (raw as { consecutiveFailures?: unknown }).consecutiveFailures;
  const consecutiveFailures: number = typeof cfRaw === 'number' ? cfRaw : 0;

    return {
      perTable,
      lastFullSyncAt,
      lastLightSyncAt,
      consecutiveFailures,
      backoffUntil,
      lastErrorCode,
      lastErrorMessage
    };
  }

  private setCursor(table: string, cursor: TableCursor, userId: string) {
    if (!this.state || this.state.user_id !== userId) return;
    if (!this.state.perTable) this.state.perTable = {};
    this.state.perTable[table] = cursor;
  }

  private async applyServerTableChanges(table: string, upserts: Array<Record<string, unknown>>, deletes: string[], userId: string) {
    if (!this.storage) return;
    const db = this.storage.getDatabase();
    const coll = (db as unknown as Record<string, unknown>)[table] as {
      get: (id: string) => Promise<Record<string, unknown> | undefined>;
      put: (row: Record<string, unknown>) => Promise<void>;
      update: (id: string, changes: Record<string, unknown>) => Promise<number>;
    } | undefined;
    if (!coll) return;
    // Apply deletions (soft delete locally)
    for (const id of deletes) {
      try {
        const existing = await coll.get(id);
        if (existing) {
          await coll.update(id, { deleted: true, dirty: 0, op: undefined, owner_id: existing.owner_id || userId, synced_at: new Date().toISOString() });
        } else {
          // Insert tombstone for unknown delete to prevent resurrection
          await coll.put({ id, deleted: true, owner_id: userId, dirty: 0, version: 0, updated_at: new Date().toISOString() });
        }
      } catch {}
    }
    // Apply upserts with conflict resolution
    for (const row of upserts) {
      try {
        const existing = await coll.get(row.id as string);
        if (!existing) {
          await coll.put({ ...row, dirty: 0, op: undefined, synced_at: new Date().toISOString() });
          continue;
        }
        // If local dirty and local version > incoming, keep local (will push later)
        if ((existing as { dirty?: number; version?: number }).dirty === 1 && ((existing as { version?: number }).version ?? 0) > ((row as { version?: number }).version ?? 0)) continue;
        // If local dirty and versions equal, prefer higher updated_at then version fallback; server is authoritative on tie
        if ((existing as { dirty?: number; version?: number }).dirty === 1 && ((existing as { version?: number }).version ?? 0) === ((row as { version?: number }).version ?? 0)) {
          const localUpdated = (existing as { updated_at?: string | number }).updated_at ?? 0;
          const incomingUpdated = (row as { updated_at?: string | number }).updated_at ?? 0;
          const localTime = new Date(localUpdated as string | number).getTime();
          const incomingTime = new Date(incomingUpdated as string | number).getTime();
          if (localTime > incomingTime) continue; // keep local newer timestamp
        }
        await coll.put({ ...existing, ...row, dirty: 0, op: undefined, synced_at: new Date().toISOString() });
      } catch (e) {
        logger.warn(`[sync:v2] apply upsert failed ${table}`, e);
      }
    }
  }

  private async markModeTimestamp(mode: 'light' | 'full' | 'priority', _userId: string) {
    if (!this.state) return;
    const nowIso = new Date().toISOString();
    if (mode === 'full') this.state.lastFullSyncAt = nowIso;
    if (mode === 'light' || mode === 'priority') this.state.lastLightSyncAt = nowIso;
    this.state.consecutiveFailures = 0;
    this.state.backoffUntil = undefined;
  }

  private async registerFailure(_userId: string, _err: unknown) {
    if (!this.state) return;
    this.state.consecutiveFailures += 1;
    const attempts = this.state.consecutiveFailures;
    const backoffBase = [1,2,4,8,16,32,60];
    const seconds = backoffBase[Math.min(backoffBase.length - 1, attempts - 1)];
    const jitter = seconds * 0.2 * (Math.random() - 0.5);
    const next = Date.now() + (seconds + jitter) * 1000;
    this.state.backoffUntil = new Date(next).toISOString();
  }

  private async persistState() {
  if (!this.state || !this.storage) return;
  try { await this.storage.upsertSyncState(this.state.user_id, this.state as unknown as Record<string, unknown>); } catch (e) { logger.warn('[sync:v2] persistState failed', e); }
  }

  private emptyResult(): CorrectSyncResult { return { success: true, pushed: 0, pulled: 0, tables: 0, errors: [] }; }

  // Developer utility (Settings > Advanced): reset sync state triggers full sync next
  async resetState(): Promise<void> {
    if (!this.auth || !this.storage) return;
    const authState = this.auth.getAuthState();
    if (!authState.isAuthenticated) return;
    await this.storage.resetSyncState(authState.user!.id);
    this.state = null;
  }
}

export const correctSyncService = CorrectSyncService.getInstance();