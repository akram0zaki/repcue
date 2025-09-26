# RepCue Sync Architecture (v2)

This document describes the new v2 sync engine (feature‑flagged via `SYNC_ENGINE`). It supersedes any legacy references to the monolithic `SyncService` and single timestamp cursor model.

## TL;DR

- Offline‑first: All state lives in IndexedDB (Dexie). Sync augments—not blocks—core UX.
- Opt‑in: Requires user consent + authentication.
- Engine: `CorrectSyncService` (client) ↔ `sync_v2` Supabase Edge Function (server).
- Cursors: Per‑table composite `(updated_at, id)` cursor enables deterministic pagination & avoids missed rows.
- Modes: `light` (fast essentials), `full` (all tables), `priority` (immediate push after user mutation).
- Batching: Push ≤5 records per request; pull pages of 50 rows (max 5 pages/table per cycle).
- Conflicts: Version wins; tie-breaker `(updated_at, id)`; server authoritative on ambiguous ties; soft deletes propagate (tombstones retained 60 days).
- Backoff: Exponential with jitter on failures (1→60s); manual/full sync bypasses backoff.
- Feature flag: Safe rollout; legacy fallback retained until validation complete.

---

## Components (v2)

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Client | `CorrectSyncService` | Concurrency, batching, pull pagination, conflict resolution, state persistence (`sync_state`) |
| Client | `StorageService` | IndexedDB CRUD, dirty marking, tombstones, version metadata |
| Client | Settings UI (Advanced) | Manual “Sync Now”, “Force Full Sync” (v2), “Reset Sync State” (v2) |
| Server | `sync_v2` Edge Function | Validate, upsert/delete (soft), per‑table paged pulls, security allow‑list, correlation logging |
| Server | RLS Policies | Enforce per‑user row isolation |
| Data | Postgres Tables | Each has `id`, `owner_id` (or `user_id`), `updated_at`, `version`, `deleted` |

---

## Data Flow Overview

1. Collect dirty records (up to 5 total across tables) in deterministic table order.
2. Send push + current per‑table cursors to `sync_v2`.
3. Server applies upserts (only if incoming `version` > existing) & soft deletes, then returns per‑table changed rows + `nextCursor` + `more` flag.
4. Client applies deletes (tombstone locally) then upserts if not superseded by a newer local dirty version.
5. If `more=true`, client paginates (additional requests) up to 5 pages.
6. Updated cursors persisted to `sync_state`.
7. Success resets failure counters; failures schedule backoff.

---

## Per‑Table Cursor Mechanics

Stored for each table: `{ lastUpdatedAt, lastId }`.
Server query predicate:
```
(updated_at > lastUpdatedAt)
OR (updated_at = lastUpdatedAt AND id > lastId)
ORDER BY updated_at ASC, id ASC LIMIT 51 (50 + lookahead)
```
Lookahead row determines `more`.

Benefits: Stable ordering, idempotent pagination, resistant to same‑millisecond collisions, no global cursor coupling.

---

## Conflict Resolution Matrix (Condensed)

| Case | Condition | Result |
|------|-----------|--------|
| New local | Not on server | Push local |
| New server | Not local | Pull server |
| Both changed | local.version > server.version | Keep local (will push later) |
| Both changed | local.version < server.version | Overwrite local |
| Versions equal | timestamp tie → compare updated_at | Newer wins |
| Server deleted | Row tombstoned remotely | Mark local deleted (clean) |
| Local delete | local deleted + version >= server.version | Push delete |
| Resurrection attempt | Server tombstoned, local edited | Keep tombstone (reject) |

---

## Sync Modes

- Light: `user_preferences`, `app_settings`, `exercises`, `user_favorites` (+ any table with local dirty records). Fast/responsive background cadence.
- Full: All tables (adds `workouts`, `activity_logs`, `workout_sessions`). Triggered on login, manual force, long interval.
- Priority: Immediate push of affected tables post mutation (skips pull unless needed soon after).

Mode timestamps (`lastLightSyncAt`, `lastFullSyncAt`) assist throttle decisions.

---

## Backoff & Throttle

| Trigger | Rule |
|---------|------|
| Passive attempt | Skip if <10s since last light sync AND no dirty priority tables |
| Failure (n) | Backoff = 1,2,4,8,16,32,60 (s) + ±20% jitter |
| Manual/Force | Always executes (ignores backoff) |

Backoff metadata persisted in `sync_state`.

---

## Security Hardening

- Allow‑list tables (reject unknown).
- Batch limit: ≤5 pushed records.
- Payload size cap: 32KB.
- Ownership: Server overwrites/sets `owner_id` = auth user; foreign-owned rows skipped on update.
- Column scrubbing: Ignore client attempts to set `updated_at`, `owner_id`, `deleted` directly.
- Correlation ID per request for log tracing.
- RLS enforces row isolation defense‑in‑depth.

---

## Local State (`sync_state`)

| Field | Purpose |
|-------|---------|
| perTable | Map of table → last cursor |
| lastFullSyncAt / lastLightSyncAt | Throttle decisions |
| consecutiveFailures | Backoff escalation |
| backoffUntil | Timestamp gating next passive attempt |
| lastErrorCode/Message | Debug diagnostics (not user visible) |

Stored in Dexie; cleared via “Reset Sync State”.

---

## Adding a New Syncable Entity (v2)

1. Schema: Add table with `version int default 0`, `deleted boolean default false`, `updated_at timestamptz default now()` + `owner_id`.
2. Indexes: `(owner_id, updated_at DESC, id)`.
3. Client: Add Dexie table + ensure CRUD sets `dirty=1`, increments `version`, updates `updated_at`.
4. Service: Append to `SYNC_ORDER` (mind dependency ordering: parent entities earlier than dependents). Current order: `user_preferences`, `app_settings`, `exercise_catalogs`, `exercises`, `user_favorites`, `workouts`, `activity_logs`, `workout_sessions`, `video_files`.
5. Edge: Add to allow‑list; implement pull query (owner scope or public logic); enforce batch limit.
6. Tests: Add unit (conflict matrix), integration (multi-page pull), soft delete propagation.
7. Docs/CHANGELOG: Note addition.

---

## Operational & UX Notes

- Advanced controls (v2): Force Full Sync (all tables) & Reset Sync State (clears cursors/backoff).
- Silent success; only errors or debug mode produce visible banners/logs.
- Priority pushes minimize latency for user‑created content.
- Feature flag allows staged rollout; legacy retained until stable.

---

## Troubleshooting (v2)

| Symptom | Likely Cause | Remedy |
|---------|--------------|--------|
| No sync activity | Backoff active | Force Full Sync or wait for backoff expiry |
| Repeated overwrite | Server version higher | Verify version increments locally; inspect mutation flow |
| Deleted keeps returning | Local resurrection attempt | Ensure new ID for recreated entity |
| Pagination stops early | Cursor mismatch | Reset Sync State to rebuild cursors |

---

## Migration from Legacy

| Aspect | Legacy | v2 |
|--------|--------|----|
| Cursor | Single timestamp | Per-table composite (updated_at,id) |
| Conflict | Timestamp LWW | Version-first + timestamp tiebreak |
| Modes | Single path | light / full / priority |
| Backoff | Basic throttle | Exponential w/ jitter + priority bypass |
| UI Controls | Sync Now | + Force Full Sync, Reset Sync State |

---

## References

- Implementation Plan: `docs/implementation-plans/sync-module-implementation-plan.md`
- CHANGELOG (Unreleased section) for latest sync changes
- Edge Function: `supabase/functions/sync_v2/index.ts`
- Client Service: `apps/frontend/src/services/correctSyncService.ts`

---

## Status

Sync Engine v2 fully implemented under feature flag (`SYNC_ENGINE = 'v2'`):

- Edge Function `sync_v2`: per-table composite cursor pagination (50/page, max 5 pages), push batching (≤5), allow‑list, field scrubbing, resurrection prevention, correlation ID logging.
- Client `CorrectSyncService`: light/full/priority modes, concurrency guard, exponential backoff with jitter, passive light sync suppression (<10s), priority push bypass, per‑table cursor persistence, conflict resolution (version-first, timestamp/id tiebreak), soft delete propagation.
- Advanced Settings UI: Force Full Sync & Reset Sync State (v2 only) live.
- Comprehensive test matrix COMPLETE: batch splitting, backoff escalation/reset, conflict winner selection, soft delete propagation & resurrection prevention, multi-page & boundary pagination, same-timestamp cursor tie ordering, owner_id tamper prevention, priority push path, concurrency non-blocking.
- Documentation Phase (9) COMPLETE: this doc rewritten, README linked, CHANGELOG updated.

Pending (Phase 10): rollout validation, extended manual QA, monitoring correlation IDs in edge logs before flipping v2 on by default and scheduling legacy removal window.
