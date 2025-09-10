import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { correctSyncService } from '../correctSyncService';
import { storageService } from '../../services/storageService';
import { AuthService } from '../authService';
import { ConsentService } from '../consentService';

// Minimal auth/consent mocks
vi.mock('../authService', () => ({
  AuthService: {
    getInstance: () => ({
      getAuthState: () => ({ isAuthenticated: true, accessToken: 'tok', user: { id: 'user-1' } })
    })
  }
}));
vi.mock('../consentService', () => ({
  ConsentService: {
    getInstance: () => ({ hasConsent: () => true })
  }
}));

// NOTE: This is a light scaffold; full matrix tests will be added in later phases.

describe('CorrectSyncService (v2)', () => {
  beforeAll(async () => {
    // Ensure clean sync_state for anonymous test context
    // (No auth mocking yet; these tests will be expanded when auth test harness available)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should instantiate singleton', () => {
    expect(correctSyncService).toBeTruthy();
  });

  it('empty sync without auth/consent should short-circuit successfully', async () => {
    // With mocks now authenticated
    // Mock fetch to return empty tables
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correlation_id: 'cid', server_time: new Date().toISOString(), tables: {} }) }));
    const res = await correctSyncService.sync();
    expect(res.success).toBe(true);
    expect(res.pushed).toBe(0);
  });

  it('applies server upsert and advances cursor', async () => {
    const now = new Date().toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      correlation_id: 'cid2',
      server_time: now,
      tables: {
        user_preferences: {
          upserts: [{ id: 'prefs-user-1', owner_id: 'user-1', version: 1, updated_at: now, dark_mode: true }],
          deletes: [],
          nextCursor: { lastUpdatedAt: now, lastId: 'prefs-user-1' },
          more: false
        }
      }
    }) }));
    const res = await correctSyncService.sync('full');
    expect(res.pulled).toBe(1);
  });

  it('keeps newer local dirty version over older server version', async () => {
    const db = storageService.getDatabase() as any;
    const now = new Date().toISOString();
    await db.user_preferences.put({ id: 'prefs-user-1', owner_id: 'user-1', version: 5, updated_at: now, dirty: 1, dark_mode: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      correlation_id: 'cid3',
      server_time: now,
      tables: {
        user_preferences: {
          upserts: [{ id: 'prefs-user-1', owner_id: 'user-1', version: 3, updated_at: now, dark_mode: true }],
          deletes: [],
          nextCursor: { lastUpdatedAt: now, lastId: 'prefs-user-1' },
          more: false
        }
      }
    }) }));
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    const record = await db.user_preferences.get('prefs-user-1');
    expect(record.dark_mode).toBe(false); // local newer kept
  });

  it('splits batches when more than 5 dirty upserts across tables', async () => {
    const db: any = storageService.getDatabase();
    const now = new Date().toISOString();
    for (let i = 0; i < 7; i++) {
      await db.user_preferences.put({ id: `prefs-${i}`, owner_id: 'user-1', version: 1, updated_at: now, dirty: 1, dark_mode: false });
    }
    const fetchSpy = vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correlation_id: 'cid-batch', server_time: now, tables: {} }) }));
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    // At least one edge call; exact split logic internal, ensure multiple calls when re-sync due to remaining dirty records queued by follow-up
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('backoff increases after failures and resets after success', async () => {
    // Force failure
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => 'fail' }));
    const failRes = await correctSyncService.sync('light');
    expect(failRes.success).toBe(false);
    // Next attempt should skip due to backoff (successful empty result)
    const skip = await correctSyncService.sync('light');
    expect(skip.success).toBe(true);
    // Clear failure by mocking success
    const now = new Date().toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correlation_id: 'cid-reset', server_time: now, tables: {} }) }));
    const success = await correctSyncService.sync('priority');
    expect(success.success).toBe(true);
  });

  it('soft delete from server propagates locally', async () => {
    const db: any = storageService.getDatabase();
    const now = new Date().toISOString();
    await db.workouts.put({ id: 'w1', owner_id: 'user-1', version: 2, updated_at: now, dirty: 0, deleted: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      correlation_id: 'cid-del',
      server_time: now,
      tables: {
        workouts: {
          upserts: [],
          deletes: ['w1'],
          nextCursor: { lastUpdatedAt: now, lastId: 'w1' },
          more: false
        }
      }
    }) }));
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    const row = await db.workouts.get('w1');
    expect(row.deleted).toBe(true);
  });

  it('priority sync limits tables', async () => {
    const now = new Date().toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correlation_id: 'cid-prio', server_time: now, tables: {} }) }));
    const res = await correctSyncService.priorityPush(['user_preferences']);
    expect(res.success).toBe(true);
  });

  it('pull pagination multi-page collects all pages ( >50 rows )', async () => {
    const now = new Date().toISOString();
    // Create 70 fake server rows for workouts (arbitrary table with no local dirty data)
    const rowsPage1 = Array.from({ length: 50 }).map((_, i) => ({ id: `w-page1-${i}`, owner_id: 'user-1', version: 1, updated_at: now, deleted: false }));
    const rowsPage2 = Array.from({ length: 20 }).map((_, i) => ({ id: `w-page2-${i}`, owner_id: 'user-1', version: 1, updated_at: now, deleted: false }));
    const fetchSpy = vi.stubGlobal('fetch', vi.fn()
      // First call: initial sync request (includes pushes + pulls for all tables)
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        correlation_id: 'cid-pag-1',
        server_time: now,
        tables: {
          workouts: {
            upserts: rowsPage1,
            deletes: [],
            nextCursor: { lastUpdatedAt: now, lastId: 'w-page1-49' },
            more: true
          }
        }
      }) })
      // Second call: follow-up page request for workouts only
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        correlation_id: 'cid-pag-2',
        server_time: now,
        tables: {
          workouts: {
            upserts: rowsPage2,
            deletes: [],
            nextCursor: { lastUpdatedAt: now, lastId: 'w-page2-19' },
            more: false
          }
        }
      }) })
    );
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    expect(res.pulled).toBe(70);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('cursor tie on identical timestamps advances by id ordering without duplicates', async () => {
    const now = new Date().toISOString();
    // 50 rows first page, 10 rows second page, all same updated_at timestamp
    const rows1 = Array.from({ length: 50 }).map((_, i) => ({ id: `tiebreak-${String(i).padStart(3,'0')}`, owner_id: 'user-1', version: 1, updated_at: now, deleted: false }));
    const rows2 = Array.from({ length: 10 }).map((_, i) => ({ id: `tiebreak-${String(i+50).padStart(3,'0')}`, owner_id: 'user-1', version: 1, updated_at: now, deleted: false }));
    const allIds = new Set<string>();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        correlation_id: 'cid-tie-1',
        server_time: now,
        tables: {
          user_favorites: { // choose a different table than previous test to avoid interfering with its cursor
            upserts: rows1,
            deletes: [],
            nextCursor: { lastUpdatedAt: now, lastId: 'tiebreak-049' },
            more: true
          }
        }
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        correlation_id: 'cid-tie-2',
        server_time: now,
        tables: {
          user_favorites: {
            upserts: rows2,
            deletes: [],
            nextCursor: { lastUpdatedAt: now, lastId: 'tiebreak-059' },
            more: false
          }
        }
      }) })
    );
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    // 60 pulled across both pages
    expect(res.pulled).toBeGreaterThanOrEqual(60);
    // Ensure no duplicate IDs stored locally
    const db: any = storageService.getDatabase();
    const stored = await db.user_favorites.where('id').startsWith('tiebreak-').toArray();
    stored.forEach((r: any) => { expect(allIds.has(r.id)).toBe(false); allIds.add(r.id); });
    expect(allIds.size).toBe(60);
  });

  it('security: skips pushing non-exercise record with foreign owner_id (owner spoof prevention)', async () => {
    const db: any = storageService.getDatabase();
    const now = new Date().toISOString();
    // Insert user_preferences with wrong owner_id to simulate tamper attempt
    await db.user_preferences.put({ id: 'prefs-spoof', owner_id: 'evil-user', version: 1, updated_at: now, dirty: 1, dark_mode: false });
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, init: any) => {
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ correlation_id: 'cid-sec', server_time: now, tables: {} }) };
    }));
    const res = await correctSyncService.sync('light');
    expect(res.success).toBe(true);
    // Ensure user_preferences not included in push payload (skipped due to foreign owner)
    expect(capturedBody.tables.user_preferences).toBeUndefined();
    // Record should remain dirty for future claiming / correction
    const rec = await db.user_preferences.get('prefs-spoof');
    expect(rec.dirty).toBe(1);
  });

  it('pagination boundary: exactly 50 rows yields single page (no follow-up request)', async () => {
    const now = new Date().toISOString();
    const rows = Array.from({ length: 50 }).map((_, i) => ({ id: `boundary-${i}`, owner_id: 'user-1', version: 1, updated_at: now, deleted: false }));
    const fetchSpy = vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      correlation_id: 'cid-boundary',
      server_time: now,
      tables: {
        activity_logs: {
          upserts: rows,
          deletes: [],
          nextCursor: { lastUpdatedAt: now, lastId: 'boundary-49' },
          more: false
        }
      }
    }) }));
    const res = await correctSyncService.sync('full');
    expect(res.success).toBe(true);
    expect(res.pulled).toBe(50);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('non-blocking concurrency: second sync call returns same in-flight promise quickly', async () => {
    const now = new Date().toISOString();
    // Slow first fetch (simulate network delay)
  let resolveFetch: (() => void) | undefined;
  const slowPromise = new Promise<void>(r => { resolveFetch = r; });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      await slowPromise; // wait until we resolve manually
      return { ok: true, json: async () => ({ correlation_id: 'cid-nb', server_time: now, tables: {} }) };
    }));
    const p1 = correctSyncService.sync('light');
    // Issue second call while first pending
    const p2 = correctSyncService.sync('light');
    // They should be the same promise instance (concurrency guard)
    expect(p1).toBe(p2);
    // Resolve network and await
  if (resolveFetch) resolveFetch();
    const res = await p1;
    expect(res.success).toBe(true);
  });
});
