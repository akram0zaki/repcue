import { StorageService } from './storageService';
import { AuthService } from './authService';
import { ConsentService } from './consentService';
import { SYNC_ENABLED } from '../config/features';
import logger from '../utils/logger';
import type { AppSettings } from '../types';

// v2 Sync core constants
const PUSH_BATCH_SIZE = 5; // Per spec
// Pull pagination constants
const PULL_PAGE_LIMIT = 5; // max pages per table per sync cycle
const MIN_LIGHT_INTERVAL_MS = 10_000; // Passive light sync suppression window

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
  tables: Record<string, { upserts: any[]; deletes: string[] }>; // push payload
  clientInfo: { deviceId: string; appVersion: string };
}

interface EdgeSyncResponseV2 {
  correlation_id?: string;
  server_time: string;
  tables: Record<string, { upserts: any[]; deletes: string[]; nextCursor?: TableCursor; more?: boolean }>;
}

export class CorrectSyncService {
  private static instance: CorrectSyncService;
  private storage = StorageService.getInstance();
  private auth = AuthService.getInstance();
  private consent = ConsentService.getInstance();
  private state: LocalSyncState | null = null;
  private inFlight: Promise<CorrectSyncResult> | null = null;
  private pending: boolean = false;
  private isDestroyed = false;
  private readonly deviceId: string;
  private priorityTables: Set<string> | null = null;

  private constructor() {
    this.deviceId = this.ensureDeviceId();
  }

  static getInstance(): CorrectSyncService {
    if (!this.instance) this.instance = new CorrectSyncService();
    return this.instance;
  }

  // Public API (temporary minimal surface)
  async sync(mode: 'light' | 'full' | 'priority' = 'light'): Promise<CorrectSyncResult> {
    if (!SYNC_ENABLED) return this.emptyResult();
    if (this.isDestroyed) return this.emptyResult();
    if (!this.consent.hasConsent()) return this.emptyResult();
    const authState = this.auth.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken) return this.emptyResult();

    // Simple concurrency guard
    if (this.inFlight) {
      this.pending = true; // queue one additional run
      return this.inFlight;
    }

    // Backoff check
    await this.loadState(authState.user!.id);
    // Passive suppression for light mode if recent successful light sync and no dirty changes
    if (mode === 'light' && this.state?.lastLightSyncAt) {
      const elapsed = Date.now() - new Date(this.state.lastLightSyncAt).getTime();
      if (elapsed < MIN_LIGHT_INTERVAL_MS) {
        const hasDirty = await this.hasAnyDirty(['user_preferences','app_settings','exercises','user_favorites'], authState.user!.id);
        if (!hasDirty) {
          return { ...this.emptyResult(), success: true }; // silently skip
        }
      }
    }
    if (mode !== 'priority' && this.state?.backoffUntil) {
      const until = new Date(this.state.backoffUntil).getTime();
      if (Date.now() < until) {
        return { ...this.emptyResult(), success: true }; // silently skip
      }
    }

    const exec = this.performSync(mode, authState.accessToken, authState.user!.id)
      .finally(() => {
        this.inFlight = null;
        if (this.pending && !this.isDestroyed) {
          this.pending = false;
          // fire and forget follow-up sync (light) after 1s debounce
          setTimeout(() => this.sync('light').catch(err => logger.warn('follow-up sync failed', err)), 1000);
        }
      });
    this.inFlight = exec;
    return exec;
  }

  // Trigger an immediate priority sync for a subset of tables (phase 6 requirement)
  async priorityPush(tables: string[]): Promise<CorrectSyncResult> {
    this.priorityTables = new Set(tables.filter(t => SYNC_ORDER.includes(t as any)));
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
      const lightTables = SYNC_ORDER.slice(0, 4); // preferences, settings, exercises, user_favorites
      let tableList = mode === 'light' ? lightTables : SYNC_ORDER;
      if (mode === 'priority' && this.priorityTables && this.priorityTables.size) {
        tableList = tableList.filter(t => this.priorityTables!.has(t));
      }

      // 1. Collect dirty records per table (batch limited)
      const pushPayload: EdgeSyncRequestV2['tables'] = {};
      for (const table of tableList) {
        const dirty = await this.collectDirtyBatch(table, PUSH_BATCH_SIZE, userId);
        if (dirty.upserts.length || dirty.deletes.length) {
          pushPayload[table] = dirty;
          result.pushed += dirty.upserts.length + dirty.deletes.length;
        }
      }

      // 2. Build request with existing per-table cursors
      const edgeReq: EdgeSyncRequestV2 = {
        mode,
        since: this.state?.perTable || {},
        tables: pushPayload,
        clientInfo: { deviceId: this.deviceId, appVersion: '1.0.0' }
      };

      // 3. Call v2 edge
      const response = await this.callEdge(edgeReq, accessToken);
      if (response.correlation_id) result.correlationId = response.correlation_id;

      // 4. Mark pushed records clean
      if (Object.keys(pushPayload).length) await this.markPushedClean(pushPayload);

      // 5. Apply pull changes per table (with pagination loop if server indicates more)
      const perTable = response.tables || {};
      for (const table of tableList) {
        const tableResp = perTable[table];
        if (!tableResp) continue;
        const { upserts, deletes, nextCursor, more } = tableResp;
        if (upserts.length || deletes.length) {
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
              await this.applyServerTableChanges(table, tFollow.upserts, tFollow.deletes, userId);
              result.pulled += tFollow.upserts.length + tFollow.deletes.length;
            }
            if (tFollow.nextCursor) { cursor = tFollow.nextCursor; this.setCursor(table, tFollow.nextCursor, userId); }
            if (!tFollow.more) break;
        }
        result.tables += 1;
      }

      await this.markModeTimestamp(mode, userId);
      logger.info(`[sync:v2] complete cid=${correlationId} pushed=${result.pushed} pulled=${result.pulled}`);
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

  private async collectDirtyBatch(tableName: string, limit: number, userId: string): Promise<{ upserts: any[]; deletes: string[] }> {
    const db = this.storage.getDatabase();
    const table: any = (db as any)[tableName];
    if (!table) return { upserts: [], deletes: [] };
    try {
      // Dexie where('dirty').equals(1).limit(limit)
      const dirty: any[] = await table.where('dirty').equals(1).limit(limit).toArray();
      const upserts: any[] = [];
      const deletes: string[] = [];
      for (const rec of dirty) {
        if (rec.owner_id && rec.owner_id !== userId && tableName !== 'exercises') continue; // skip foreign-owned
        if (rec.deleted || rec.op === 'delete') {
          deletes.push(rec.id);
        } else {
          const { dirty: _d, op: _o, synced_at: _s, ...clean } = rec;
          // Apply field mapping for tables that need it
          let mappedRecord = clean;
          if (tableName === 'app_settings') {
            mappedRecord = this.storage.convertAppSettingsForSync(clean as unknown as AppSettings);
          }
          // Note: Other tables (activity_logs, workout_sessions) don't have field mapping methods yet
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
    try {
      const db = this.storage.getDatabase() as any;
      for (const t of tables) {
        const coll = db[t];
        if (!coll) continue;
        const first = await coll.where('dirty').equals(1).first();
        if (first) {
          if (first.owner_id && first.owner_id !== userId && t !== 'exercises') continue;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async markPushedClean(payload: Record<string, { upserts: any[]; deletes: string[] }>) {
    const db = this.storage.getDatabase();
    const nowIso = new Date().toISOString();
    for (const [table, data] of Object.entries(payload)) {
      const coll: any = (db as any)[table];
      if (!coll) continue;
      // Mark upserts
      for (const rec of data.upserts) {
        try { await coll.update(rec.id, { dirty: 0, op: undefined, synced_at: nowIso }); } catch {}
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
    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`edge error ${resp.status}: ${t}`);
    }
    const json = await resp.json();
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
    try {
      const existing = await this.storage.getSyncState(userId);
      if (existing) {
        this.state = {
          user_id: userId,
            perTable: existing.perTable || {},
            lastFullSyncAt: existing.lastFullSyncAt,
            lastLightSyncAt: existing.lastLightSyncAt,
            consecutiveFailures: existing.consecutiveFailures || 0,
            backoffUntil: existing.backoffUntil,
            lastErrorCode: existing.lastErrorCode,
            lastErrorMessage: existing.lastErrorMessage
        };
        return;
      }
    } catch (e) { logger.warn('[sync:v2] loadState failed', e); }
    this.state = { user_id: userId, perTable: {}, consecutiveFailures: 0 };
  }

  private setCursor(table: string, cursor: TableCursor, userId: string) {
    if (!this.state || this.state.user_id !== userId) return;
    if (!this.state.perTable) this.state.perTable = {};
    this.state.perTable[table] = cursor;
  }

  private async applyServerTableChanges(table: string, upserts: any[], deletes: string[], userId: string) {
    const db = this.storage.getDatabase();
    const coll: any = (db as any)[table];
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
        const existing = await coll.get(row.id);
        if (!existing) {
          await coll.put({ ...row, dirty: 0, op: undefined, synced_at: new Date().toISOString() });
          continue;
        }
        // If local dirty and local version > incoming, keep local (will push later)
        if (existing.dirty === 1 && (existing.version ?? 0) > (row.version ?? 0)) continue;
        // If local dirty and versions equal, prefer higher updated_at then version fallback; server is authoritative on tie
        if (existing.dirty === 1 && (existing.version ?? 0) === (row.version ?? 0)) {
          const localTime = new Date(existing.updated_at || 0).getTime();
          const incomingTime = new Date(row.updated_at || 0).getTime();
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
  if (!this.state) return;
  try { await this.storage.upsertSyncState(this.state.user_id, this.state as unknown as Record<string, unknown>); } catch (e) { logger.warn('[sync:v2] persistState failed', e); }
  }

  private emptyResult(): CorrectSyncResult { return { success: true, pushed: 0, pulled: 0, tables: 0, errors: [] }; }

  // Developer utility (Settings > Advanced): reset sync state triggers full sync next
  async resetState(): Promise<void> {
    const authState = this.auth.getAuthState();
    if (!authState.isAuthenticated) return;
    await this.storage.resetSyncState(authState.user!.id);
    this.state = null;
  }
}

export const correctSyncService = CorrectSyncService.getInstance();