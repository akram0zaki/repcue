# Sync Module Implementation Plan - Clean Rewrite (Pre-Launch PWA)

> Revision Date: 2025-09-09 (Incorporates architecture review, clarifications, and approved enhancements)

## Setup

This application uses supabase for storage. There are two supabase projects configured for this application, one for development environment and another for production:
- Supabase project "supabase": the development environment with project reference xwzrsfkzqxdybjrkkkvh, connected via MCP server "supabase"
- Supabase project "supabase-prod": the production environment with project reference zumzzuvfsuzvvymhpymk, connected via MCP server "supabase-prod"

## Problem Statement

The current sync implementation is overly complex, fragmented, and unreliable. Users' data (preferences, settings, favorites) are not syncing to Supabase despite appearing to sync locally. 

**Pre-Launch Advantages:**
- No real customers = can delete/reset all data without concern
- Offline-first PWA = sync is enhancement, not requirement for core functionality  
- Development phase = can break/rebuild without user impact

## Current Architecture Analysis

### Supabase Database (Server)
**Core Sync Tables:**
- `user_preferences` - Built-in exercise favorites (slug IDs), locale, units, rep_speed_factor, cues
- `app_settings` - Dark mode, vibration, sound settings, timers, auto-save
- `exercises` - User-created exercises (UUID IDs)
- `workouts` - User workouts 
- `activity_logs` - Exercise completion logs
- `workout_sessions` - Workout session tracking
- `user_favorites` - User-created exercise favorites (UUID IDs) [separate table]

**Data Types:**
- `user_preferences.id` = text
- `app_settings.id` = text  
- `exercises.id` = uuid
- `workouts.id` = uuid
- `activity_logs.id` = text
- `workout_sessions.id` = text
- `user_favorites.id` = uuid

### IndexedDB (Client)
**Tables:** 
- `user_preferences` - Snake_case naming
- `app_settings` - Snake_case naming
- `exercises` - Snake_case naming
- `workouts` - Snake_case naming
- `activity_logs` - Snake_case naming
- `workout_sessions` - Snake_case naming
- `user_favorites` - Snake_case naming

### Current Issues Identified

1. **Stub Edge Function** - The sync edge function was returning empty responses without processing data
2. **Complex Field Mapping** - Unnecessary field transformations between client and server
3. **Premature Clean Marking** - Records marked clean before server confirms successful save
4. **Two-Tier Favorites System** - Built-in (user_preferences.favorite_exercises[]) vs user-created (user_favorites table)
5. **Authentication Context Issues** - Multiple listeners causing cascading sync events (fixed)
6. **Table Name Mismatch** - Server expects snake_case, client code had inconsistent mapping

## New Simple Architecture - Offline-First PWA

### Core Principles:
1. **Offline-First**: App works 100% offline, sync enables cross-device functionality
2. **Bidirectional Sync**: Client ↔ Server sync for true multi-device experience
3. **Server as Source of Truth**: Server resolves conflicts, client accepts server state
4. **Pre-Launch Advantage**: Can reset/rebuild without customer impact for faster iteration

### Phase 1: Data Model Alignment

#### 1.1 Supabase Schema Verification
✅ **Tables exist and have correct structure:**
- user_preferences (id: text, owner_id: uuid, favorite_exercises: text[], ...)
- app_settings (id: text, owner_id: uuid, dark_mode: bool, ...)
- exercises (id: uuid, owner_id: uuid, name: text, ...)
- workouts (id: uuid, owner_id: uuid, name: text, ...)
- activity_logs (id: text, owner_id: uuid, exercise_id: text, ...)
- workout_sessions (id: text, owner_id: uuid, workout_id: text, ...)
- user_favorites (id: uuid, user_id: uuid, item_id: text, ...)

#### 1.2 IndexedDB Schema Alignment
**Verify IndexedDB tables match server exactly:**
- Same field names
- Same data types where possible
- Consistent sync metadata fields

#### 1.3 Favorites System Clarity
- **Built-in exercises** (slug IDs like 'push-ups'): Stored in `user_preferences.favorite_exercises[]`
- **User-created exercises** (UUID IDs): Stored in `user_favorites` table with foreign key

### Phase 2: Correct Bidirectional Sync

#### 2.1 Sync Service with Concurrency Control & Ordering
```typescript
class CorrectSyncService {
  private readonly BATCH_SIZE = 5;
  private readonly SYNC_ORDER = [
    'user_preferences', 'app_settings',     // Order 1: UI settings
    'exercises',                            // Order 2: Must be before user_favorites
    'user_favorites',                       // Order 3: Depends on exercises FK
    'workouts',                             // Order 4: Can reference exercises
    'activity_logs', 'workout_sessions'     // Order 5: Historical data
  ];
  
  private syncInProgress = false;
  private pendingSyncRequest = false;
  
  async sync(force = false): Promise<SyncResult> {
    // Concurrency control - prevent overlapping syncs
    if (this.syncInProgress) {
      this.pendingSyncRequest = true; // Queue one more sync
      return { skipped: true, reason: 'sync_in_progress' };
    }
    
    this.syncInProgress = true;
    
    try {
      let totalPushed = 0, totalPulled = 0;
      
      // 1. Push local changes in correct order with batching
      for (const tableName of this.SYNC_ORDER) {
        const dirtyRecords = await this.collectDirtyRecordsForTable(tableName)
        if (dirtyRecords.length === 0) continue;
        
        const batches = this.createBatches(dirtyRecords, this.BATCH_SIZE)
        for (const batch of batches) {
          const pushResult = await this.pushBatchToServer(tableName, batch)
          await this.markClean(pushResult.successful)
          totalPushed += pushResult.count
          
          // Small delay between batches
          await this.delay(100)
        }
      }
      
      // 2. Pull server changes (bidirectional)
      const serverChanges = await this.pullFromServer(this.lastSyncCursor)
      await this.applyServerChanges(serverChanges)
      totalPulled = serverChanges.count
      
      // 3. Update sync cursor
      this.updateSyncCursor(serverChanges.cursor)
      
      return { localPushed: totalPushed, serverPulled: totalPulled }
      
    } finally {
      this.syncInProgress = false;
      
      // If sync was requested while in progress, run one more sync
      if (this.pendingSyncRequest) {
        this.pendingSyncRequest = false;
        setTimeout(() => this.sync(), 1000); // Debounce 1 second
      }
    }
  }
}
```

#### 2.2 Cross-Device Sync Flow
1. **Device A**: User changes settings → marked dirty locally → background sync pushes to server
2. **Device B**: Background sync pulls from server → applies settings changes locally
3. **Conflict Resolution**: Server timestamp wins (last-write-wins with server authority)
4. **Offline Resilience**: Changes queue locally, sync when connection restored

#### 2.3 Sync Triggers & Throttling Strategy

**🔄 Automatic Sync Triggers:**
- **App Focus/Resume**: When user returns to app (PWA visibility change)
- **Network Reconnection**: When app comes back online after being offline
- **Background Timer**: Every 2 minutes when app is active and online
- **Authentication**: After successful login (full sync)

**👆 Manual Sync Triggers:**
- **Settings Changed**: Toggle favorites, change theme, update preferences → immediate sync attempt
- **Exercise/Workout Created**: After user creates content → immediate sync attempt  
- **Data Import**: After user imports/restores data → full sync
- **Settings Page Sync Button**: Manual sync trigger in settings → full bidirectional sync
- **Pull-to-Refresh**: User pulls down to refresh on pages with sync-able data

**⚡ Throttling & Performance:**
- **5 records max per edge function call** to avoid timeout/memory issues
- **100ms delay between batches** to prevent edge function overload
- **Exponential backoff** on sync failures (1s, 2s, 4s, 8s, max 60s)
- **Skip sync if < 10 seconds since last successful sync** (prevents spam)

**🎯 Smart Sync Priority & Ordering:**
- **Order 1**: user_preferences, app_settings (UI-impacting)
- **Order 2**: exercises (must sync BEFORE user_favorites for foreign key integrity)
- **Order 3**: user_favorites (depends on exercises existing in DB)
- **Order 4**: workouts (can reference exercises) 
- **Order 5**: activity_logs, workout_sessions (historical data)

#### 2.4 Pre-Launch Development Strategy  
- **Fresh Start**: Can recreate server state anytime during development
- **Aggressive Testing**: Break things and rebuild without user impact
- **Rapid Iteration**: Deploy/test/fix cycle without data migration concerns

#### 2.5 Non-Intrusive UX Requirements

**🤫 Silent Sync - No User Interruption:**
- **No popup dialogs** or confirmation modals during sync
- **No blocking UI** while sync is in progress  
- **Background operation** - user can continue using app
- **No sync progress indicators** in main UI (sync is transparent)

**📱 Subtle Feedback Only:**
- **Auto-disappearing toast** for sync errors only (3-4 seconds)
- **Small sync icon** in status/header area (optional, unobtrusive)  
- **Settings page sync button** shows brief loading state when pressed
- **Success feedback**: No notification (silence = success)

**⚡ Performance Requirements:**
- **Sync never blocks UI interactions** 
- **No noticeable performance impact** during sync
- **Graceful degradation** if sync fails (app continues working)
- **Immediate UI updates** for user actions (don't wait for sync)

### Phase 3: Correct Bidirectional Edge Function

#### 3.1 Throttled Batch Processing  
```typescript
// Handle both push (client → server) and pull (server → client) with throttling
async function syncHandler(request) {
  const { tables, since, batchId } = await request.json()
  const userId = await validateJWT(request.headers.authorization)
  
  // Validate batch size (max 5 records total across all tables)
  const totalRecords = Object.values(tables).reduce((sum, changes) => 
    sum + (changes.upserts?.length || 0) + (changes.deletes?.length || 0), 0)
  
  if (totalRecords > 5) {
    return { error: 'Batch too large', maxSize: 5, received: totalRecords }
  }
  
  console.log(`📦 Processing batch ${batchId}: ${totalRecords} records for user ${userId}`)
  
  // PUSH: Save client changes to server (throttled batch)
  const pushResults = {}
  for (const [tableName, changes] of Object.entries(tables)) {
    if (changes.upserts?.length > 0 || changes.deletes?.length > 0) {
      pushResults[tableName] = await this.processPushChanges(tableName, changes, userId)
      console.log(`   ✅ ${tableName}: +${changes.upserts?.length || 0} ~${changes.deletes?.length || 0}`)
    }
  }
  
  // PULL: Get server changes since cursor (limit to 20 to avoid large responses)
  const serverChanges = {}
  const cursor = since || new Date(0).toISOString()
  for (const tableName of SYNCABLE_TABLES) {
    serverChanges[tableName] = await this.getServerChanges(tableName, cursor, userId, 20)
  }
  
  return { 
    push: pushResults,
    changes: serverChanges, 
    cursor: new Date().toISOString(),
    batchId
  }
}
```

#### 3.2 Conflict Resolution Strategy
- **Server Wins**: If client and server have different versions, server timestamp determines winner
- **Tombstone Deletes**: Deleted records remain as deleted=true for sync propagation  
- **Version Tracking**: Each record has version number, increment on every change
- **Pre-Launch Simplification**: Can reset all data if conflicts become complex

#### 3.3 Multi-Device Security
- JWT validation for user identification
- RLS policies ensure users only see their own data
- owner_id/user_id validation on all operations
- Pre-launch: comprehensive logging for debugging cross-device scenarios

### Phase 4: Simplified Storage Service

#### 4.1 Direct Operations
```typescript
// Instead of complex field mapping:
async saveAppSettings(settings: AppSettings) {
  const record = { ...settings, dirty: 1, updated_at: now() }
  await db.app_settings.put(record)
}

// Instead of two-tier favorites:
async toggleFavorite(exerciseId: string, userId: string) {
  if (isUUID(exerciseId)) {
    // User-created exercise → user_favorites table
    await this.toggleUserFavorite(exerciseId, userId)
  } else {
    // Built-in exercise → user_preferences.favorite_exercises[]
    await this.toggleBuiltinFavorite(exerciseId, userId)
  }
}
```

#### 4.2 Consistent Metadata
All records get same sync fields:
- `dirty: number` (0 = clean, 1 = needs sync)
- `updated_at: string` (ISO timestamp)
- `owner_id: string` (user UUID)
- `version: number` (increments on update)
- `deleted: boolean` (soft delete flag)

## Implementation Steps - Correct Bidirectional with Pre-Launch Speed

### Step 1: Clean Slate Start (1 hour)
1. **Backup** current sync implementation (git branch)
2. **Wipe** all Supabase data tables (no customer impact)
3. **Create** new `CorrectSyncService` class with proper bidirectional logic
4. **Remove** field mapping complexity - use direct JSON

### Step 2: Proper Bidirectional Edge Function (2 hours)
1. **Implement** full push/pull logic in edge function
2. **Add** cursor-based server change detection
3. **Implement** basic conflict resolution (server wins)
4. **Test** with two browser tabs simulating different devices

### Step 3: Storage Service Integration (1.5 hours)
1. **Ensure** all operations properly mark `dirty = 1`
2. **Verify** sync metadata is consistent across all tables
3. **Test** favorites/settings changes propagate between "devices"
4. **Handle** sync cursor persistence in IndexedDB

### Step 4: Cross-Device Testing (1 hour)
1. **Test** Device A changes → sync → Device B sees changes  
2. **Test** offline changes queue and sync when online
3. **Test** conflict scenarios (same record changed on both devices)
4. **Verify** all data types sync correctly (preferences, exercises, workouts)
5. **Test** batching with >5 records → multiple edge function calls
6. **Test** sync triggers work correctly (focus, network, manual)

### Step 5: Pre-Launch Polish (30 minutes)
1. **Add** comprehensive logging for debugging
2. **Add** sync status indicators in UI
3. **Test** complete user journey across devices
4. **Monitor** edge function logs for any issues

## Success Criteria

✅ **Functional Requirements:**
- User changes favorites → data syncs to Supabase within 10 seconds
- User changes settings → data syncs to Supabase within 10 seconds  
- User creates exercise → syncs before being available for favorites
- Offline changes → sync when connection restored
- Multiple devices → changes sync bidirectionally

✅ **Non-Functional Requirements:**
- Code is under 500 lines total (vs current ~2000+)
- No field mapping transformations
- Single responsibility classes
- Comprehensive error handling
- Detailed logging for debugging
- 100% type safety

✅ **Data Integrity:**
- No data loss during sync failures
- Consistent state between client/server
- Proper conflict resolution (last-write-wins)
- User can only access their own data

## Risk Mitigation

**Backup Current Implementation:**
- Create git branch before starting
- Keep old sync service as `syncService.old.ts`
- Feature flag to switch between implementations

**Incremental Rollout:**
- Test with single user first
- Test with small user group  
- Monitor error logs closely
- Rollback plan ready

**Data Safety:**
- Never mark records clean until server confirms success
- Log all sync operations with details
- Implement data export for users
- Test restoration from server data

## Timeline - Correct Implementation with Pre-Launch Benefits
- **Total Estimate:** 6 hours (proper bidirectional sync)
- **Clean Slate Start:** 1 hour
- **Bidirectional Edge Function:** 2 hours
- **Storage Integration:** 1.5 hours
- **Cross-Device Testing:** 1 hour
- **Polish & Monitoring:** 30 minutes
- **Pre-launch advantage:** Can reset/rebuild if issues arise

## Dependencies
- Supabase edge function deployment access
- Database schema is already correct ✅
- Authentication system working ✅
- IndexedDB tables exist ✅

This plan prioritizes simplicity, reliability, and maintainability over clever optimizations. The current sync complexity is the root cause of the issues.

---

## Added Architecture Clarifications & Enhancements (2025-09-09)

### A. Confirmed Table Schema Readiness
Verified (dev project) that all core sync tables already contain: `updated_at`, `version`, `deleted` (boolean soft delete) except no additional migration needed for these fields:
- user_preferences, app_settings, exercises, workouts, activity_logs, workout_sessions, user_favorites all have `version` + `deleted`.
- All include `owner_id` or `user_id` for RLS enforcement.
Planned (optional): create covering indexes for performance (see Section G).

### B. Cursor & Version Strategy
Goal: Avoid missed or duplicate changes; remain robust against clock skew.

Approach:
1. Use per-table incremental scan using the composite (updated_at, id) tuple as a **stable cursor anchor**. For each table we persist the last seen `{updated_at, id}` locally.
2. On pull, query rows where `(updated_at > last_updated_at) OR (updated_at = last_updated_at AND id > last_id)` ordered by `(updated_at ASC, id ASC)` limited to a page size (default 50 for pull – configurable per table).
3. Because `updated_at` is server-managed (DB default + triggers if needed), server time is authoritative; client clock is ignored for ordering.
4. Conflict resolution uses `version` primarily, falling back to `(updated_at, id)` if version unexpectedly equal.
5. A lightweight global cursor table (`sync_cursors`) already exists; we will still maintain per-table cursors client-side for paging efficiency while optionally updating `sync_cursors.last_ack_cursor` with the latest ISO timestamp the client fully applied (used for diagnostics, not ordering logic).

Rationale: Avoids introducing new sequences; deterministic ordering; resistant to same-millisecond collisions via ID tiebreak.

### C. Conflict Resolution Matrix
| Scenario | Client Dirty? | Server Has Row? | Version Comparison | Resolution | Action | Notes |
|----------|---------------|-----------------|--------------------|-----------|--------|-------|
| New local row | Yes | No | n/a | Push client | Server insert | Mark clean w/ server returned metadata |
| New server row | No (absent) | Yes | n/a | Pull server | Insert locally | |
| Both modified | Yes | Yes | client.version > server.version | Push client | Upsert server; increment version | Rare if multi-device; server accepts client since higher version |
| Both modified | Yes | Yes | client.version < server.version | Server wins | Overwrite local | Emit silent overwrite event |
| Both modified | Yes | Yes | versions equal & server.updated_at > client.updated_at | Server wins | Overwrite local | |
| Both modified | Yes | Yes | versions equal & client.updated_at > server.updated_at | Push client | Upsert server | Protection against clock skew mitigated by server-managed timestamps; rare |
| Server deleted | Yes | Yes (deleted=true) | n/a | Server wins | Mark local deleted & clean | |
| Client deleted | Yes (deleted=true) | Yes (not deleted) | client.version >= server.version | Push delete | Set deleted=true server | Soft delete propagate |
| Resurrection attempt (client edit on deleted server row) | Yes | Yes (deleted=true) | n/a | Reject resurrect | Re-mark local deleted | Explicit create required |

All soft deletes propagate; resurrection requires creating a new ID for clarity.

### D. Idempotency & Mutation Tracking
Each pushed upsert/delete batch carries `client_change_id` (UUID v4) per record. Server stores recent `client_change_id`s in a transient table or logs (optional phase) or rejects duplicates via unique constraint `(id, client_change_id)` in a staging CTE logic. Initial implementation: rely on deterministic row primary keys + content; safe to retry because operations are upserts with same data. (Enhancement path documented.)

### E. Sync State Local Table Design
New IndexedDB table: `sync_state` (single row per user):
- user_id (pk)
- perTableCursors: { [tableName: string]: { lastUpdatedAt: string; lastId: string } }
- lastFullSyncAt
- lastLightSyncAt
- consecutiveFailures
- backoffUntil (timestamp when next automatic attempt allowed)
- lastErrorCode / lastErrorMessage (for diagnostics only; not displayed unless user opens debug)

### F. Sync Modes
1. Light Sync (frequent passive triggers): tables order 1–3 only (preferences, settings, exercises, user_favorites) if they have dirty records OR server changes. Skips activity_logs & workout_sessions unless they have dirty records.
2. Full Sync (manual button, login, network rejoin, long interval): all tables in SYNC_ORDER.
3. Priority Push (user action: create exercise/workout/favorite toggle): immediate push attempt (bypass passive throttle) for affected tables only.

### G. Index & Performance Recommendations
Add (if not already present):
```
CREATE INDEX IF NOT EXISTS idx_<table>_owner_updated ON <table>(owner_id, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_<table>_owner_deleted_updated ON <table>(owner_id, deleted, updated_at DESC);
```
Tables: user_preferences, app_settings (small; optional), exercises, workouts, user_favorites, activity_logs, workout_sessions.
Benefit: Accelerated incremental pulls + soft delete filtering.

### H. Throttling & Backoff Refinement
- Passive triggers suppressed if < 10s since lastLightSyncAt AND no priority changes.
- Exponential backoff with jitter for failures: base intervals [1s, 2s, 4s, 8s, 16s, 32s, 60s capped]; jitter ±20%.
- Backoff only applies to automatic attempts; manual (user pressed sync) always executes (unless currently in-flight).

### I. Batching Policy
- Push batch size: 5 records (unchanged).
- Pull page size: 50 per table per cycle (adjustable). If exactly 50 returned, loop additional pulls for that table (max 5 pages per cycle) to prevent starvation while capping overall response size.
- Delay between push batches: 100ms.
- Delay between pull pages: none (single request per direction). Pull pagination occurs across multiple edge calls only if needed (future optimization: streaming or compression).

### J. Failure & Retry Matrix
| Failure Type | Detection | Immediate Action | Mark Dirty? | Next Attempt | User Feedback |
|--------------|----------|------------------|-------------|--------------|---------------|
| Network offline | navigator.onLine=false | Abort sync start | n/a | On online event | None |
| Edge 5xx | HTTP status | Increment failures; schedule backoff | Keep dirty | Backoff schedule | Toast (error) |
| Edge 4xx (validation) | HTTP status + body | Log & halt batch; continue other tables | Keep dirty | Manual intervention (dev) | Toast (error) |
| Partial table push failure | Row-level errors list | Only mark succeeded rows clean | Failed stay dirty | Next cycle/backoff | Toast if any row failed |
| Pull apply error (e.g., Dexie failure) | Exception | Roll back partial apply for that table (transaction) | n/a | Retry next cycle | Toast (error) |
| Conflict overwrite | Version compare | Apply server row | Local row clean | Immediate continue | (Silent) optional debug event |

### K. Security Hardening (Edge Function)
1. Validate JWT; extract user id.
2. Allow-list table names; reject unknown.
3. Verify incoming rows do not contain disallowed columns (e.g., created_at/updated_at modifications ignored, owner_id forced to auth user id).
4. Enforce batch record count <=5 and raw JSON body size < 32KB.
5. All DML executed with `owner_id = auth.uid()` guard (either via RLS or explicit check). Reject mismatched IDs.
6. Return minimal payload: only changed rows (id, domain fields, updated_at, version, deleted) — omit unchanged large arrays.
7. Structured log lines with a `correlation_id` (UUID per request) for traceability.
8. No echo of sensitive user data in logs.

### L. Logging Strategy (Client)
- One log line per sync cycle start/end (level: info).
- Per table summary: counts pushed/pulled/failed.
- Correlate with server correlation_id returned.
- Debug flag gates verbose record ID detail.

### M. Multi-Tab Strategy
Deferred (not in current phase). Potential approach: BroadcastChannel 'sync-status' to coordinate single active sync leader tab.

### N. Manual Developer Utilities
- Add Settings > Advanced > "Reset Sync State" (clears `sync_state` + forces full sync next trigger).
- Add manual "Force Full Sync" button.

### O. Soft Delete Retention
- Keep tombstones 60 days. Separate maintenance script (cron / scheduled Supabase function) to hard-delete beyond retention (future task; documented, not implemented now).

### P. Testing Matrix (to be implemented)
1. Unit: batching split logic (6 dirty records -> 2 calls).  
2. Unit: conflict resolution chooses correct winner across scenarios.  
3. Unit: cursor advancement with same timestamp different IDs.  
4. Integration (mock edge): exercise create -> favorite referencing exercise: ensure ordering (favorite deferred until exercise clean).  
5. Integration: offline mutation queue then online bulk sync (multiple tables).  
6. Integration: backoff escalation after sequential failures resets after success.  
7. Integration: soft delete propagation (create -> delete -> ensure not resurrected by stale push).  
8. Integration: pull pagination (simulate 120 server changes).  
9. Regression: no UI blocking during sync (timing assertions).  
10. Security: attempt to modify owner_id ignored.  

### Q. Feature Flag & Rollout
- Env/config: `SYNC_ENGINE` = `v2` (default off until ready).  
- Code loads `CorrectSyncService` when flag = v2 else legacy service (kept for fallback).  
- After confidence, permanently remove legacy (future task).  

### R. Implementation Phases (Refined)
<sub><em>Process Note (2025-09-09): Progress lines below are now auto‑updated by the implementation agent immediately after completing any related task (code, tests, docs, deployment hardening). No manual prompt required.</em></sub>
1. Plan Update — DONE ✅  
2. Add local `sync_state` Dexie schema + feature flag wiring — DONE ✅ (schema added, feature flags live)  
3. Implement `CorrectSyncService` (push only path) — DONE ✅ (push batching, concurrency guard, backoff, state persistence)  
4. Edge function v2 (push + pull, per-table cursors, pagination, allow‑list, security hardening) — DONE ✅ (resurrection prevention, field allow‑list, version precedence, soft delete version bump)  
5. Client pull logic + per-table cursor persistence + conflict resolution — DONE ✅ (cursors stored, pagination loop, version-first conflict logic applied)  
6. Throttling/backoff refinement + priority modes — DONE ✅ (jittered exponential backoff, passive light sync suppression <10s, priority subset push API)  
7. Settings UI controls (Force Full Sync, Reset Sync State) — DONE ✅ (advanced section gated by SYNC_ENGINE)  
8. Test matrix expansion — DONE ✅ (coverage includes batch split, backoff escalation/reset, soft delete propagation, priority sync, multi-page + boundary pagination, cursor tie, owner_id tamper prevention, concurrency non-block)  
9. Documentation updates (README link, sync.md v2 rewrite, CHANGELOG doc note) — DONE ✅ (sync.md rewritten, README linked, CHANGELOG Unreleased section updated with v2 completion)  
10. Feature flag rollout validation & optional flip to v2 default — IN PROGRESS (default flipped to v2; monitoring & rollback path documented)  
11. Remove legacy sync (POST-ROLLBACK WINDOW) — DEFERRED (after stable rollout & monitoring)  

### S. Open Items / Future Enhancements (Not Blocking v2)
- Idempotency persistent table for `client_change_id` (if duplicate replay risk observed).  
- Multi-tab leader election.  
- Normalizing `favorite_exercises` to join table if size grows.  
- Streaming/WebSocket-based push notifications for near-real-time sync.  
- Hard delete purge job for expired tombstones.  

---

## Summary of Changes vs Original Plan
- Added rigorous cursor/version strategy & conflict matrix.
- Introduced light vs full sync modes and priority push.
- Defined failure/backoff matrix with jitter.
- Enhanced security, logging, and batching policies.
- Added testing matrix, feature flag rollout, future enhancements list.
- Clarified that schema is already mostly compatible (indexes recommended, not required to start).

This revision forms the authoritative spec for implementation (v2 sync engine). Awaiting approval before code changes.

---

### T. Immediate Execution Focus (Added 2025-09-09)
The following concrete tasks were identified as the next critical focus areas and are now incorporated into phases R4–R10:

| Task | Description | Plan Mapping | Status | Notes |
|------|-------------|--------------|--------|-------|
| Edge Function v2 | `sync_v2` with per-table cursors, pagination (50/page, max 5), allow-list, batch validation, correlation_id | R4 | DONE ✅ | Implemented & security hardened (allow‑list, field scrubbing, resurrection prevention) |
| Client Pull Logic | Paginated pulls, apply changes, update per-table cursors | R5 | DONE ✅ | Implemented with pagination loop (max 5 pages) |
| Conflict Resolution | Version-first + timestamp/id tiebreak; soft delete propagation | R5 | DONE ✅ | Enforced in `applyServerTableChanges` |
| Settings UI Controls | Force Full Sync & Reset Sync State (v2 gated) | R7 | DONE ✅ | Live in Settings advanced section |
| Test Expansion | Batch split, backoff escalation, conflicts, deletes, pagination, soft deletes | R8 | DONE ✅ | Full matrix implemented (see Phase 8 summary) |
| Docs & Changelog | README link, sync.md rewrite, CHANGELOG additions | R9 | DONE ✅ | CHANGELOG updated; phase complete |
| Rollout Validation | Flag flip readiness & monitoring | R10 | PENDING | Wait for fuller test coverage & manual QA |

Progress updates will transition statuses from PENDING → IN PROGRESS → DONE as code lands; deferred post-rollout cleanup tracked separately.