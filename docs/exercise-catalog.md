# Exercise Catalog System (Multi-Catalog)

This document explains the architecture and implementation of RepCue’s multi-catalog exercise system, and provides a concise developer guide for adding or modifying catalogs and exercises.

## Architecture Overview

The multi-catalog system consists of:

- Exercise catalogs (metadata): `apps/frontend/src/data/catalogs.ts`
- Exercise definitions per catalog: `apps/frontend/src/data/exercises/*.ts` with an aggregator at `apps/frontend/src/data/exercises.ts`
- Localization
  - Exercise texts: `apps/frontend/public/locales/*/exerciseDetails.json`
  - Catalog texts: `apps/frontend/public/locales/*/catalogs.json`
- Media
  - Media index: `apps/frontend/public/exercise_media.json`
  - Video assets: `apps/frontend/public/videos/*`

## Core Files and Data Shapes

- Types: `apps/frontend/src/types/index.ts`
  - `Exercise` includes `catalogId` and extended metadata: `benefits`, `limitations`, `best_timing`, `suggested_combinations`, `notes`, `exercise_references`.
  - `ExerciseCatalog` includes `id`, `nameKey`, `descriptionKey`, `isDefault`, `isPremium`, `displayOrder`, `icon?`, `colorTheme?`, `pictureUrl?`.

- Catalogs: `apps/frontend/src/data/catalogs.ts`
  - Exports `EXERCISE_CATALOGS` and helpers `getDefaultCatalog()`, `getCatalogById()`, `getAllCatalogs()`, `getAvailableCatalogs()`.

- Exercises: `apps/frontend/src/data/exercises/*.ts`
  - One file per catalog (e.g. `generalFitness.ts`, `womenHealth.ts`, `taiChi.ts`, `zumba.ts`). Each uses a `createExercise({...})` helper and sets `catalogId` explicitly.
  - Aggregator `apps/frontend/src/data/exercises.ts` exports `INITIAL_EXERCISES` by concatenating all catalog arrays and provides catalog-aware helpers.

## Localization

- Exercise text resolution uses `localizeExercise(ex, t)` which reads from the `exerciseDetails` namespace:
  - Keys: `exerciseDetails.{exerciseId}.name`, `exerciseDetails.{exerciseId}.description`
- Catalog titles and descriptions use the `catalogs` namespace:
  - `apps/frontend/src/data/catalogs.ts` stores keys as `nameKey` and `descriptionKey` (e.g. `general-fitness.name`).
- Supported locales: `en`, `de`, `es`, `fr`, `nl`, `ar`, `ar-EG`, `fy`.

## Media System

- Media index: `apps/frontend/public/exercise_media.json` (one record per exercise with `has_video: true`).
- Required variants per video: square 1080x1080, portrait 1080x1920, landscape 1920x1080.
- File naming: `/videos/{exercise-id}_v1_{width}x{height}.webm`.
- Variant selection uses `selectVideoVariant()`; loader pipeline is unchanged by catalogs.

## Storage, Seeding, and Sync

- IndexedDB (Dexie) schema includes an `exercise_catalogs` table for local metadata. It is seeded from `EXERCISE_CATALOGS` and not synced.
  - Seeding: `StorageService.ensureCatalogsSeeded()`; converts TS fields to DB fields and writes clean records.
  - Built-in exercises are seeded and kept clean via `StorageService.cleanBuiltInExercises()` using `INITIAL_EXERCISES`.
- Built-in vs. user-created exercises:
  - Built-in exercises use slug IDs (e.g. `plank`) and are never synced to Supabase.
  - User-created exercises use UUIDs and are synced. The `catalog_id` field is included in the sync allowlist and stored server-side.
- Sync implementation:
  - Client: `apps/frontend/src/services/correctSyncService.ts`
    - Filters built-ins out of push/pull; maps `catalogId` ⇄ `catalog_id`.
  - Edge function: `supabase/functions/sync_v2/index.ts`
    - SYNC tables exclude `exercise_catalogs` (catalog metadata is local-only).
    - `exercises` allowlist includes `catalog_id` and extended metadata.
    - `activity_logs` allowlist includes `catalog_id` (used when logging activity).

## UI Integration

- Catalog selector: `apps/frontend/src/components/CatalogSelector.tsx`
  - Reads `EXERCISE_CATALOGS`, uses `catalogs` namespace for labels, supports premium badges and images via `pictureUrl`.
- Exercises page: `apps/frontend/src/pages/ExercisePage.tsx`
  - Persists `selectedCatalogId` in localStorage; filters exercises by `catalogId`; displays results and supports category/search/favorites filters.

## Developer Guide

### Add a New Catalog
1. Add an entry to `apps/frontend/src/data/catalogs.ts`:
   - Unique `id` (e.g. `pilates`), `nameKey`, `descriptionKey`, `displayOrder`, optional `icon`, `colorTheme`, `pictureUrl`, and `isPremium`.
2. Add translations to `apps/frontend/public/locales/*/catalogs.json` for the new `id`:
   - `{ "pilates": { "name": "…", "description": "…" } }` (keys must match `nameKey`/`descriptionKey`).
3. Add a catalog image at the path referenced by `pictureUrl` (e.g. `public/images/catalogs/pilates-square.png`).

### Add Exercises to a Catalog
1. Create or update a catalog file under `apps/frontend/src/data/exercises/` (e.g. `pilates.ts`). Ensure every exercise has `catalogId` set to the new catalog’s `id`.
2. Update the aggregator `apps/frontend/src/data/exercises.ts` to include the new exported array in `INITIAL_EXERCISES`.
3. Add exercise translations in every locale under `apps/frontend/public/locales/*/exerciseDetails.json`:
   - `{"{exercise-id}": {"name": "…", "description": "…"}}`
4. If `has_video: true`, export the three video variants to `apps/frontend/public/videos/` and add the entry to `apps/frontend/public/exercise_media.json`.
5. Run checks:
   - `pnpm i18n:scan` (validate translations)
   - `pnpm build` (media verification and build)

Notes:
- Extended metadata (`benefits`, `limitations`, `best_timing`, `suggested_combinations`, `notes`, `exercise_references`) is supported in built-in definitions for richer content.
- Tags are used for search; ensure they’re relevant and consistent.

## Reference: Key Helpers and APIs

- Catalog helpers: `getDefaultCatalog()`, `getCatalogById()`, `getAllCatalogs()`, `getAvailableCatalogs()` (from `data/catalogs.ts`).
- Aggregator helpers: `getExercisesByCatalog()`, `getExercisesByCatalogAndCategory()`, `searchExercisesInCatalog()` (from `data/exercises.ts`).
- Storage service catalog-aware methods (IndexedDB):
  - `getExercisesByCatalog(catalogId: string)`
  - `getCatalogs()` / `getAvailableCatalogs()` / `getDefaultCatalog()` (dynamic imports of `data/catalogs.ts`).

## Video Requirements (unchanged)

- Variants: 1080x1080 (square), 1080x1920 (portrait), 1920x1080 (landscape)
- Format: WebM (VP9 recommended), seamless loop, clear form, clean background.

## Build and Validation

- Media verification occurs during build; missing variants for `has_video: true` will fail the build.
- `pnpm i18n:scan` validates presence of required localization keys across supported locales.

## Quick Checklists

### New Catalog
- [ ] `apps/frontend/src/data/catalogs.ts` updated with new catalog
- [ ] `apps/frontend/public/locales/*/catalogs.json` entries added
- [ ] `public/images/catalogs/*` picture added (if used)

### New Exercise (in a Catalog)
- [ ] `apps/frontend/src/data/exercises/<catalog>.ts` updated
- [ ] `apps/frontend/src/data/exercises.ts` aggregator updated
- [ ] `apps/frontend/public/locales/*/exerciseDetails.json` entries added
- [ ] `apps/frontend/public/exercise_media.json` (if `has_video: true`)
- [ ] Videos copied to `apps/frontend/public/videos/` (3 variants)
- [ ] `pnpm i18n:scan` and `pnpm build` pass

## Notes on Sync and Privacy

- Built-in exercises (slug IDs) never sync to Supabase; they’re seeded locally and updated via app updates.
- User-created exercises (UUID IDs) sync with `catalog_id` included. `exercise_catalogs` is local-only and not synced.
- All media is served from same-origin static assets. No third-party calls.