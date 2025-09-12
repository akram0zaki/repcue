# Sync System Investigation and Fixes

This document chronicles the investigation and resolution of sync issues in RepCue's v2 sync system.

## Problem Summary

The sync system was partially working:
- ✅ `app_settings` synced successfully
- ❌ `user_preferences` failed to sync
- ❌ `user_favorites` failed to sync

Client changes (settings, favorites) were being stored locally but not syncing to the Supabase database.

## Root Cause Analysis

### Issue #1: Field Naming Inconsistency (RESOLVED)
**Problem**: Mixed usage of `user_id` vs `owner_id` across database schemas
- Server database used `owner_id` consistently
- Client IndexedDB schema used `user_id` for `user_favorites` table
- Other tables correctly used `owner_id`

**Impact**: Client sent `user_id` field which doesn't exist in server schema, causing database insert/update failures.

**Fix Applied**: 
- Updated IndexedDB schema to version 12 with `owner_id` for `user_favorites`
- Added migration logic to convert existing `user_id` data to `owner_id`
- Updated `UserFavorite` TypeScript interface
- Fixed all database queries to use `owner_id`

### Issue #2: Missing Fields in Edge Function Allowlist (RESOLVED)
**Problem**: Edge function's `MUTABLE_FIELD_ALLOWLIST` was missing many client fields
- Client sent valid fields that were filtered out by edge function
- Fields like `sound_enabled`, `default_interval_duration`, etc. were missing

**Fix Applied**: Added 30+ missing fields to the allowlist in `supabase/functions/sync_v2/index.ts`

### Issue #3: Silent Error Handling (RESOLVED)
**Problem**: Edge function returned HTTP 200 even when database operations failed
- Client couldn't detect sync failures
- Database errors were logged but not returned to client

**Fix Applied**: Implemented proper error handling returning 422/500 status codes for database failures

### Issue #4: Data Type Mismatches (RESOLVED)
**Problem**: Client payload data types didn't match database schema expectations
- Example: Client sent `pre_timer_countdown: 3` (integer) but DB expected boolean
- Missing database fields that client expected

**Fix Applied**: 
- Updated database schema via migration to match client expectations
- Changed `pre_timer_countdown` from boolean to integer
- Added missing fields to database tables

### Issue #5: Undefined Field Contamination (RESOLVED)
**Problem**: Client payloads contained undefined fields that caused database errors
- Fields like `dirty: undefined`, `op: undefined`, `synced_at: undefined`

**Fix Applied**: Enhanced `scrubIncoming()` function to filter out undefined values

## Investigation Methodology

When investigating sync issues, follow this systematic approach:

### 1. Check Client-Side Logs
Look for sync correlation IDs and error patterns:
```javascript
logger.ts:21 [sync:v2] callEdge error after 1078ms: edge error 422: {"error":"Push operations failed","details":"2 of 3 operations failed","successes":1,"errors":2,"correlation_id":"ec04c288-1d74-4b61-8308-426f4fdd61bc"}
```

### 2. Analyze Client Payload
Examine the actual data being sent to the edge function:
- Check for undefined fields
- Verify field names match database schema
- Confirm data types are correct

### 3. Check Edge Function Logs
Use correlation ID to trace server-side processing:
```bash
# Dev environment
supabase functions logs sync_v2 --local
# Production
supabase functions logs sync_v2
```

### 4. Verify Database Schema Consistency
Compare client and server schemas:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'user_favorites' AND table_schema = 'public';
```

### 5. Test Edge Function Allowlist
Ensure all client fields are in `MUTABLE_FIELD_ALLOWLIST`:
```typescript
const MUTABLE_FIELD_ALLOWLIST = new Set([
  'owner_id', 'item_id', 'item_type', // etc...
]);
```

## Key Files Modified

### Client-Side
- `apps/frontend/src/services/storageService.ts`: Schema version 12, owner_id migration
- `apps/frontend/src/types/index.ts`: UserFavorite interface updated
- Various service files: Updated queries to use owner_id

### Server-Side  
- `supabase/functions/sync_v2/index.ts`: Enhanced error handling, expanded allowlist, correlation ID tracing
- `supabase/migrations/`: Schema fixes for data type mismatches

## Prevention Strategies

### 1. Schema Validation
- Always validate client payloads match server expectations
- Use TypeScript interfaces that mirror database schemas exactly
- Run schema comparison tests in CI/CD

### 2. Comprehensive Logging  
- Use correlation IDs for end-to-end request tracing
- Log all database operations with detailed error information
- Implement structured logging for easier analysis

### 3. Error Handling
- Return proper HTTP status codes (422 for validation errors, 500 for server errors)
- Include detailed error messages with field-level specificity
- Never return 200 OK when database operations fail

### 4. Testing
- Test sync with realistic client payloads
- Verify error scenarios return appropriate responses
- Include field name and data type validation in tests

## Debugging Tools

### Correlation ID Tracing
Every sync request gets a unique correlation ID for end-to-end tracing:
```javascript
const correlationId = crypto.randomUUID();
console.log(`[${correlationId}] Sync request started`);
```

### Client Payload Logging
Debug mode logs full payloads being sent:
```javascript
logger.log('[sync:v2] callEdge payload:', payload);
```

### Edge Function Response Analysis
Check response status and headers:
```javascript  
logger.log('[sync:v2] callEdge response status:', response.status);
logger.log('[sync:v2] callEdge response headers:', headers);
```

## Current Status

✅ **RESOLVED**: All identified sync issues have been fixed:
1. Field naming consistency (`owner_id` everywhere)
2. Complete field allowlist in edge function
3. Proper error handling with correct HTTP status codes  
4. Data type alignment between client and server
5. Undefined field filtering

The sync system should now work reliably for all tables: `app_settings`, `user_preferences`, and `user_favorites`.

## Future Maintenance

- Monitor edge function logs for new correlation IDs with errors
- Validate any new client fields are added to server allowlist
- Ensure new database fields have matching TypeScript interfaces
- Test sync functionality after any schema changes