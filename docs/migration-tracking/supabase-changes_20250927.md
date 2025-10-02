# Supabase Changes - September 27, 2025

## Database Schema Changes

### Migration: 20250927-02-add-ring-timer-setting.sql

**Purpose**: Add ring_timer setting to control timer display shape

**Changes**:
- Added `ring_timer` column to `app_settings` table
- Type: `BOOLEAN`
- Default: `true` (circular timer with rings)
- Comment: Controls timer display shape: true for circular timer with rings, false for rectangular timer with border progress

**Impact**:
- Enables users to toggle between circular and rectangular timer displays
- Maintains backward compatibility with default circular timer
- Requires TypeScript interface updates
- Requires UI implementation for both timer shapes

**Status**: ✅ Applied to Supabase successfully

---

## Application Changes Required

1. **TypeScript Types**: Update `AppSettings` interface in `src/types/index.ts`
2. **Settings UI**: Add toggle in Timer Settings section
3. **Timer Rendering**: Implement conditional rendering logic in TimerPage.tsx
4. **Storage Service**: Ensure bidirectional sync support