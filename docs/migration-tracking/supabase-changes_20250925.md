# Supabase Changes - 2025-09-25

## Summary
Reference-based sharing preservation fix. Adjusted edge functions to correctly use existing `user_favorites` schema (`item_id` + `exercise_type`) instead of a non-existent `exercise_id` column that produced 500 errors on shared exercise save in recipient flows.

## Changes
- Edge Function `save-shared-exercise`:
  - Replaced incorrect lookup on `exercise_id` with `item_id` + `exercise_type='shared'`.
  - Added normalization step: if an existing favorite lacks `exercise_type='shared'`, update it in place to avoid duplicate inserts and preserve reference semantics.
- Edge Function `download-shared-video`:
  - Updated authorization check to use `item_id` + `exercise_type='shared'`.
  - Switched storage bucket from legacy `videos` to unified `exercise-videos`.

## Rationale
The project migrated from copy-based to reference-based exercise sharing. Recent code inadvertently reintroduced assumptions about a removed/never-created `exercise_id` column in `user_favorites`, causing runtime failures and risking architectural regression.

## Migrations
None required. Existing indexes cover new query pattern:
- UNIQUE (owner_id, item_id, item_type)
- Supporting single-column indexes on owner_id and item_id.

## Risk Assessment
- Low: Read/write paths aligned with actual schema.
- Normalization step is idempotent and bounded to a single row per save attempt.

## Follow-Up
- Monitor edge logs for any remaining 500 responses from `save-shared-exercise`.
- Consider adding composite partial index `(owner_id, item_id) WHERE item_type='exercise' AND deleted=false` if query volume grows.

## Verification Checklist
- [x] Recipient save call returns 201 instead of 500.
- [x] No duplicate exercise rows created.
- [x] Favorites list reflects shared reference.
- [x] Video download authorized via updated logic.
