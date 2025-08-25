# RepCue: Adding Accounts & Sync Across Devices

## Goal

-   **Keep working 100% offline** with IndexedDB/Dexie for anonymous
    users.
-   **Optional sign‑in** adds cloud backup + multi‑device sync (and
    unlocks social/gamification later).
-   **If a user signs up later**, ship all existing local data to the
    server (no progress loss).
-   **Conflicts are resolved predictably**; sync is resumable and
    efficient.
-   **EU‑friendly** (GDPR, consent, data minimization).

------------------------------------------------------------------------

## Architecture (recommendation + alternatives)

### Recommended baseline

-   **Frontend**: your current TS/React app with **Dexie** (IndexedDB).
-   **Auth**: ⚠️ **Passkeys (WebAuthn)** first *(NOT IMPLEMENTED)*; ✅ fallback **email magic
    link** *(IMPLEMENTED)*. ✅ Password auth also available.
-   **Backend**: **Supabase** (managed Postgres + Row Level Security +
    Auth + Realtime) or **PocketBase** (self‑host, single binary,
    built‑in auth, realtime).
    -   If you prefer zero‑ops now and strong SQL + policies:
        **Supabase**.
    -   If you prefer self‑hosting on your Pi easily: **PocketBase**.
-   **Sync**: "**Local‑first** with client‑generated UUIDs, `updated_at`
    clocks, tombstones, and a small **op‑log** per table". Client
    batches "dirty" rows to `POST /sync` and pulls server changes since
    `lastSyncCursor`.

### Why this works

-   Keeps Dexie as source of truth locally.
-   No hard dependency on network for core UX.
-   Simple, predictable conflict policy.
-   Easily extends to social features (friends, teams) later.

### Alternatives (if you want even faster integration)

-   **Dexie Cloud**: tight integration with Dexie and sync
    out‑of‑the‑box (proprietary/paid).
-   **PouchDB + CouchDB**: mature bidirectional sync; would mean
    migrating off Dexie.

------------------------------------------------------------------------

## Data model (minimum viable for accounts + sync)

> Use **client‑generated UUID v4** for all primary keys to avoid ID
> collisions pre‑signup.

Tables you likely already have (or similar): 
- `exercise`: id, name, ... (mostly static/reference) 
- `workout`: id, started_at, ended_at, locale, ... 
- `workout_set`: id, workout_id, exercise_id, reps, duration_sec, ... 
- `user_settings`: id, locale, units, cues, ... 
- `media_progress` (for video‑guided): id, exercise_id, last_position_ms, ...

Add columns to each *user‑owned* table: 
- `owner_id UUID NULL` (null for anonymous; set after signup) 
- `updated_at TIMESTAMPTZ NOT NULL` (server sets on write; client mirrors as ISO) 
- `deleted BOOLEAN NOT NULL DEFAULT false` (tombstones) 
- `version BIGINT NOT NULL DEFAULT 0` (or use `updated_at` only---see conflicts) 
- **Local‑only flags (Dexie only):** `dirty: boolean`, `op: 'upsert'|'delete'`, `syncedAt?: string`

New server tables: 
- `profile`: user_id (PK/FK), display_name, avatar_url, created_at, ... 
- `sync_cursor`: per user, last_ack_cursor (opaque cursor or timestamp) 
- (Later) `friendship`, `team`, `team_membership`, `streak`, `achievements`, `goals`

Indexes: 
- `(owner_id, updated_at)` 
- `(id)` unique 
- Partial index for `deleted = false` if needed

Row Level Security (if using Postgres/Supabase): 
- Policy: users can `select/insert/update/delete` rows where `owner_id = auth.uid() OR owner_id IS NULL` on **insert** to allow claiming anonymous rows during first sync; after claim, set `owner_id` to the user and **disallow NULL** for subsequent writes.

------------------------------------------------------------------------

## Sync protocol (simple & robust)

**Key ideas:** 
- **Local‑first:** all writes go to Dexie immediately. 
- **Dirty queue:** mark changed rows `dirty=true` with `op`. 
- **Batch push + pull:** one `/sync` call does both. 
- **Conflict resolution:** **last‑writer‑wins** by `updated_at` (or numeric `version`). For numeric version, client increments on every local write; server increments on acceptance. 
- **Tombstones:** never hard‑delete; set `deleted=true`. Compaction can run on server later.

### /sync request (per table, batched)

``` json
{
  "since": "2025-08-20T10:32:11.000Z",
  "tables": {
    "workout":    { "upserts": [ ... ], "deletes": [ "uuid1","uuid2" ] },
    "workout_set":{ "upserts": [ ... ], "deletes": [ ... ] },
    "user_settings":{ "upserts": [ ... ], "deletes": [] }
  },
  "clientInfo": { "appVersion": "x.y.z", "deviceId": "uuid-device" }
}
```

### /sync response

``` json
{
  "changes": {
    "workout":    { "upserts": [ ... ], "deletes": [ "uuidX" ] },
    "workout_set":{ "upserts": [ ... ], "deletes": [ ... ] },
    "user_settings":{ "upserts": [ ... ], "deletes": [] }
  },
  "cursor": "2025-08-21T11:02:55.000Z"
}
```

### Conflict policy (per record)

1.  If `server.updated_at > local.updated_at` → **apply server**.
2.  If `local.updated_at > server.updated_at` → **keep local** (include in next push).
3.  If equal and `op` differs, prefer **delete** (safety).
4.  Arrays/sets (e.g., tags) → prefer **server** unless you add CRDT later.

------------------------------------------------------------------------

## UX flows

### 1) Anonymous (default)

-   App runs entirely from Dexie. No auth banners.
-   Small "Sign in to back up & sync" hint (non‑blocking).

### 2) Sign up / Sign in

-   ⚠️ Offer **"Sign in with Passkey"** (primary) *(NOT IMPLEMENTED)*, plus ✅ **"Continue with
    Email"** (magic link) *(IMPLEMENTED)* and ✅ optional OAuth (Apple/Google/GitHub) *(IMPLEMENTED)*.
-   On first successful auth:
    1.  **Attach/claim local data**: client sets `owner_id=user.id` on
        all local rows and pushes to server.
    2.  Server accepts inserts where `owner_id IS NULL` or `= user.id`.
    3.  Return server cursor; client stores `lastSyncCursor`.

### 3) Multi‑device

-   New device signs in → empty Dexie → `/sync` with `since=null` → full
    pull populates local DB.

### 4) Sign out

-   **Keep local data** (stays offline‑usable).
-   Clear auth tokens and `owner_id` in memory, **do not** null out
    `owner_id` in Dexie. Just stop syncing until next login.

------------------------------------------------------------------------

## Step‑by‑step implementation plan

### ✅ Phase 0 --- Prep (types & Dexie schema) [COMPLETED]

-   ✅ Introduce metadata columns (`id`, `ownerId`, `updatedAt`, `deleted`,
    `dirty`, `op`, `syncedAt`).
-   ✅ Wrap all writes in helpers (set `updatedAt`, mark dirty, tombstones
    on delete).
-   ✅ Backfill existing data.

### ✅ Phase 1 --- Auth [COMPLETED]

-   ✅ Pick provider (Supabase or PocketBase).
-   ✅ Add Auth Store + UI.
-   ✅ Persist tokens securely.
-   ✅ Email/password authentication
-   ✅ Magic link authentication  
-   ✅ OAuth providers (Google, Apple, GitHub)
-   ⚠️  **MISSING: Passkey/WebAuthn authentication** (recommended primary method)

### ✅ Phase 2 --- Sync API [COMPLETED]

-   ✅ Implement `/sync` endpoint (validate JWT, accept/push rows, build
    response).
-   ✅ Client SyncService: push dirty → pull → mark clean → update cursor.
-   ✅ Trigger on login, foreground, network regain, periodic.
-   ✅ Add sync indicator.

### ✅ Phase 3 --- Migration: Signup without losing data [COMPLETED]

-   ✅ On first login: claim local data → push → resolve conflicts →
    banner.

### ✅ Phase 4 --- Security & Privacy [COMPLETED]

-   ✅ Enhanced RLS policies with account lockout protection.
-   ✅ Comprehensive audit logging system.
-   ✅ Rate limiting for all endpoints.
-   ✅ GDPR-compliant data export functionality.
-   ✅ Secure account deletion with grace period.
-   ✅ Automated data retention and cleanup.
-   ✅ PII minimization principles.
-   ✅ Security monitoring and threat detection.

### 🔄 Phase 5 --- Social foundations [NOT STARTED]

-   ❌ Add friendship tables and relationships.
-   ❌ Add streak tracking and gamification.
-   ❌ Add team/group functionality.
-   ❌ Add achievements and goals system.
-   ❌ Gate features by auth/flags.

------------------------------------------------------------------------

## Example: Dexie helpers

``` ts
import { db } from "./db";
import { v4 as uuid } from "uuid";

function nowISO() { return new Date().toISOString(); }

export async function upsert<T extends { id?: string }>(
  table: Dexie.Table<any, string>,
  data: T & Partial<{ id: string; updatedAt: string; ownerId?: string }>,
) {
  const id = data.id ?? uuid();
  await table.put({
    ...data,
    id,
    updatedAt: nowISO(),
    deleted: false,
    dirty: true,
    op: "upsert",
  });
  return id;
}

export async function softDelete(
  table: Dexie.Table<any, string>,
  id: string
) {
  const row = await table.get(id);
  if (!row) return;
  await table.put({
    ...row,
    deleted: true,
    updatedAt: nowISO(),
    dirty: true,
    op: "delete",
  });
}
```

------------------------------------------------------------------------

## GDPR & EU compliance checklist

-   Lawful basis: contract + legitimate interest; consent only for
    non‑essential cookies.
-   Data minimization; optional profile fields.
-   Transparency: Privacy Policy (what/why/rights).
-   User rights: export + delete.
-   Security: TLS, hashed emails, RLS enforced.
-   Cookies: auth cookies exempt; analytics need opt‑in.
-   Retention: auto‑purge inactive accounts.

------------------------------------------------------------------------

## Deployment notes

-   **Supabase**: quickest path; `/sync` as Edge Function.
-   **PocketBase**: self‑hosted, single binary, REST + realtime.
-   **Custom Node + Postgres**: full control, more work.

------------------------------------------------------------------------

## First build slice

1.  Add Dexie metadata + helpers.
2.  Wire Supabase Auth (passkey + email).
3.  Minimal `/sync` for `user_settings`.
4.  Expand to workouts/sets, then media progress.
5.  Add sign‑in CTA + sync indicator.

------------------------------------------------------------------------
