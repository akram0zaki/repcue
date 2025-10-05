# Catalog Access Control Implementation Plan

**Feature:** Exercise Catalog Access Management
**Date:** 2025-10-05
**Status:** Planning
**Priority:** High (Blocker for AI Workout Generation)

---

## 1. Requirements

### 1.1 Business Requirements

**Catalog Access Model:**
- **General Fitness**: Always free for all users (no database records needed)
- **Premium Catalogs**: Require explicit access grants stored in database
  - Women's Health (`women-health`)
  - Tai Chi (`tai-chi`)
  - Zumba (`zumba`)

**Access Management:**
- Backoffice users can grant catalog access by user email address
- Access can be time-limited (expiration date) or permanent
- Audit trail for who granted access and when
- Support for promotional/trial access periods

**Initial Test Users:**
Grant all premium catalogs to:
- `akramz@gmail.com`
- `karina.zidan@gmail.com`
- `a_shafik@hotmail.com`

### 1.2 Technical Requirements

**Database:**
- New table `user_catalog_access` to track premium catalog grants
- Foreign key to `auth.users(id)` for user reference
- Unique constraint: one record per user per catalog
- Support for expiration dates (NULL = never expires)

**Edge Function:**
- AI workout generation must filter exercises by user's catalog access
- Always include `general-fitness` exercises (no database check)
- Query `user_catalog_access` for premium catalog entitlements
- Handle missing access gracefully (return only free catalog)

**Future-Proofing:**
- Designed for future premium subscription system
- Supports catalog packs/bundles
- Easy to add new catalogs without schema changes

---

## 2. Design

### 2.1 Database Schema

#### Table: `user_catalog_access`

```sql
CREATE TABLE user_catalog_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_id text NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  granted_by text, -- Email of admin who granted access
  expires_at timestamp with time zone, -- NULL = never expires
  notes text, -- Optional notes (e.g., "Beta tester", "Promotional access")
  created_at timestamp with time zone DEFAULT now(),

  -- Unique constraint: one record per user per catalog
  CONSTRAINT user_catalog_access_unique UNIQUE (owner_id, catalog_id)
);

-- Indexes for performance
CREATE INDEX idx_user_catalog_access_owner_id
  ON user_catalog_access(owner_id);

CREATE INDEX idx_user_catalog_access_catalog_id
  ON user_catalog_access(catalog_id);

-- Index for active access queries (includes expiration check)
CREATE INDEX idx_user_catalog_access_active
  ON user_catalog_access(owner_id, catalog_id)
  WHERE expires_at IS NULL OR expires_at > now();
```

#### Helper Function: `grant_catalog_access()`

```sql
CREATE OR REPLACE FUNCTION grant_catalog_access(
  user_email text,
  catalog_id text,
  granted_by_email text,
  expires_at timestamp with time zone DEFAULT NULL,
  notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Validate catalog_id
  IF catalog_id NOT IN ('women-health', 'tai-chi', 'zumba') THEN
    RAISE EXCEPTION 'Invalid catalog_id: %. Must be one of: women-health, tai-chi, zumba', catalog_id;
  END IF;

  -- Grant access (upsert)
  INSERT INTO user_catalog_access (owner_id, catalog_id, granted_by, expires_at, notes)
  VALUES (user_uuid, catalog_id, granted_by_email, expires_at, notes)
  ON CONFLICT (owner_id, catalog_id)
  DO UPDATE SET
    granted_by = EXCLUDED.granted_by,
    expires_at = EXCLUDED.expires_at,
    notes = EXCLUDED.notes,
    granted_at = now();

  RAISE NOTICE 'Granted % catalog access to %', catalog_id, user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Helper Function: `revoke_catalog_access()`

```sql
CREATE OR REPLACE FUNCTION revoke_catalog_access(
  user_email text,
  catalog_id text
) RETURNS void AS $$
DECLARE
  user_uuid uuid;
  deleted_count int;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Revoke access
  DELETE FROM user_catalog_access
  WHERE owner_id = user_uuid AND catalog_id = revoke_catalog_access.catalog_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RAISE NOTICE 'No access found for user % to catalog %', user_email, catalog_id;
  ELSE
    RAISE NOTICE 'Revoked % catalog access from %', catalog_id, user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.2 Catalog Metadata Structure

**File:** `supabase/functions/generate-ai-workout/exercises.ts`

```typescript
export const CATALOG_METADATA = {
  'general-fitness': {
    name: 'General Fitness',
    isPremium: false,
    description: 'Core exercises for all fitness levels',
    exercises: GENERAL_FITNESS_EXERCISES
  },
  'women-health': {
    name: "Women's Health",
    isPremium: true,
    description: 'Specialized exercises for women\'s wellness',
    exercises: WOMEN_HEALTH_EXERCISES
  },
  'tai-chi': {
    name: 'Tai Chi',
    isPremium: true,
    description: 'Traditional Chinese martial art for mind-body wellness',
    exercises: TAI_CHI_EXERCISES
  },
  'zumba': {
    name: 'Zumba',
    isPremium: true,
    description: 'Dance fitness program with Latin-inspired music',
    exercises: ZUMBA_EXERCISES
  }
} as const;

export type CatalogId = keyof typeof CATALOG_METADATA;

export const ALL_CATALOGS: CatalogId[] = Object.keys(CATALOG_METADATA) as CatalogId[];
export const FREE_CATALOGS: CatalogId[] = ['general-fitness'];
export const PREMIUM_CATALOGS: CatalogId[] = ['women-health', 'tai-chi', 'zumba'];
```

### 2.3 Access Control Logic

**File:** `supabase/functions/generate-ai-workout/exercise-catalog.ts`

```typescript
/**
 * Fetches exercises based on user's catalog access
 *
 * Access Rules:
 * - general-fitness: Always included (free for all users)
 * - Premium catalogs: Requires record in user_catalog_access table
 *
 * @param userId - User UUID from auth.users
 * @param correlationId - Request correlation ID for logging
 * @returns Array of exercises user has access to
 */
export async function fetchExerciseCatalog(
  userId: string,
  correlationId: string
): Promise<Exercise[]> {
  try {
    // Step 1: Get user's allowed catalog IDs
    const allowedCatalogIds = await getUserCatalogAccess(userId);

    logInfo(correlationId, 'User catalog access retrieved', {
      userId,
      allowedCatalogs: allowedCatalogIds,
      catalogCount: allowedCatalogIds.length
    });

    // Step 2: Filter exercises by allowed catalogs
    const allowedExercises: Exercise[] = [];

    for (const catalogId of allowedCatalogIds) {
      const catalog = CATALOG_METADATA[catalogId];
      if (catalog) {
        allowedExercises.push(...catalog.exercises);
      }
    }

    if (allowedExercises.length === 0) {
      logError(correlationId, 'No exercises available for user', {
        userId,
        allowedCatalogs: allowedCatalogIds
      });
      throw new Error('No exercises available. Please contact support.');
    }

    logInfo(correlationId, 'Exercises filtered by catalog access', {
      totalExercises: INITIAL_EXERCISES.length,
      allowedExercises: allowedExercises.length,
      catalogsUsed: allowedCatalogIds
    });

    return allowedExercises;

  } catch (error) {
    logError(correlationId, 'Failed to fetch exercise catalog', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Gets catalog IDs the user has access to
 *
 * @param userId - User UUID
 * @returns Array of catalog IDs (always includes 'general-fitness')
 */
async function getUserCatalogAccess(userId: string): Promise<CatalogId[]> {
  // Always include free catalogs
  const accessibleCatalogs: CatalogId[] = [...FREE_CATALOGS];

  // Query premium catalog access
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    // If Supabase not configured, return only free catalogs
    return accessibleCatalogs;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Query user's premium catalog access
  const { data, error } = await supabase
    .from('user_catalog_access')
    .select('catalog_id')
    .eq('owner_id', userId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  if (error) {
    // Log error but don't fail - return free catalogs as fallback
    console.error('Failed to query catalog access:', error);
    return accessibleCatalogs;
  }

  // Add premium catalogs user has access to
  if (data && data.length > 0) {
    const premiumCatalogs = data
      .map(row => row.catalog_id as CatalogId)
      .filter(catalogId => PREMIUM_CATALOGS.includes(catalogId));

    accessibleCatalogs.push(...premiumCatalogs);
  }

  return accessibleCatalogs;
}
```

### 2.4 Row-Level Security (RLS)

```sql
-- Enable RLS on user_catalog_access
ALTER TABLE user_catalog_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own catalog access
CREATE POLICY "Users can view own catalog access"
  ON user_catalog_access
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Only admins can insert/update/delete
-- (Implement when admin role system is added)
-- For now, use service role key for backoffice operations
```

---

## 3. Implementation Plan

### Phase 1: Database Setup ✅

**Deliverables:**
1. Migration file: `20251005-01-create-user-catalog-access.sql`
2. Create `user_catalog_access` table
3. Create indexes
4. Create helper functions (`grant_catalog_access`, `revoke_catalog_access`)
5. Enable RLS with user read policy

**Testing:**
- Verify table creation
- Test helper functions with test user emails
- Verify constraints (unique, FK)

### Phase 2: Seed Test Data ✅

**Deliverables:**
1. Migration file: `20251005-02-seed-catalog-access-test-users.sql`
2. Grant all premium catalogs to test users:
   - `akramz@gmail.com` → women-health, tai-chi, zumba
   - `karina.zidan@gmail.com` → women-health, tai-chi, zumba
   - `a_shafik@hotmail.com` → women-health, tai-chi, zumba

**SQL:**
```sql
-- Grant all premium catalogs to test users
SELECT grant_catalog_access('akramz@gmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('akramz@gmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('akramz@gmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');

SELECT grant_catalog_access('karina.zidan@gmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('karina.zidan@gmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('karina.zidan@gmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');

SELECT grant_catalog_access('a_shafik@hotmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('a_shafik@hotmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('a_shafik@hotmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');
```

**Testing:**
- Query `user_catalog_access` table
- Verify 9 records (3 users × 3 catalogs)
- Verify owner_id matches user UUIDs from auth.users

### Phase 3: Copy Exercise Files to Edge Function ✅

**Deliverables:**
1. Create directory: `supabase/functions/generate-ai-workout/exercises/`
2. Copy exercise catalog files:
   - `generalFitness.ts` (59 KB)
   - `womenHealth.ts` (31 KB)
   - `taiChi.ts` (3 KB)
   - `zumba.ts` (3 KB)
3. Create aggregator: `supabase/functions/generate-ai-workout/exercises.ts`
4. Export catalog metadata with `isPremium` flags

**Note:** Exercise files are duplicated (frontend + edge function). Keep in sync when adding/modifying exercises.

### Phase 4: Update Edge Function Catalog Logic ✅

**Files Modified:**
1. `supabase/functions/generate-ai-workout/exercise-catalog.ts`
   - Remove database query for built-in exercises
   - Import from local `exercises.ts`
   - Add `getUserCatalogAccess()` function
   - Filter exercises by catalog access

2. `supabase/functions/generate-ai-workout/workout-generator.ts`
   - Pass `userId` to `fetchExerciseCatalog()`
   - Handle catalog access errors gracefully

**Testing:**
- Test with test user (should get all 4 catalogs)
- Test with regular user (should get only general-fitness)
- Verify exercise counts in logs

### Phase 5: Deploy and Test ✅

**Deployment Steps:**
1. Run migrations on development database
2. Deploy edge function to development
3. Test AI workout generation:
   - As test user → expect all catalogs
   - As regular user → expect only general-fitness
4. Verify logs show correct catalog filtering

**Rollback Plan:**
If issues occur:
```sql
-- Rollback: Drop table and functions
DROP FUNCTION IF EXISTS revoke_catalog_access(text, text);
DROP FUNCTION IF EXISTS grant_catalog_access(text, text, text, timestamp with time zone, text);
DROP TABLE IF EXISTS user_catalog_access;
```

### Phase 6: Documentation ✅

**Deliverables:**
1. Update `docs/migration-tracking/supabase-changes_20251005.md`
2. Document catalog access system
3. Add backoffice instructions for granting access
4. Update README with catalog access info

---

## 4. Testing Strategy

### 4.1 Unit Tests

**Database Functions:**
```sql
-- Test: Grant access to existing user
SELECT grant_catalog_access('akramz@gmail.com', 'women-health', 'test', NULL, 'Test grant');

-- Test: Grant access with expiration
SELECT grant_catalog_access('akramz@gmail.com', 'tai-chi', 'test', now() + interval '30 days', 'Trial access');

-- Test: Revoke access
SELECT revoke_catalog_access('akramz@gmail.com', 'women-health');

-- Test: Invalid email (should fail)
SELECT grant_catalog_access('nonexistent@example.com', 'zumba', 'test', NULL, 'Should fail');

-- Test: Invalid catalog (should fail)
SELECT grant_catalog_access('akramz@gmail.com', 'invalid-catalog', 'test', NULL, 'Should fail');
```

### 4.2 Integration Tests

**Edge Function:**
1. **Test User with All Access:**
   - User: `akramz@gmail.com`
   - Expected: All 4 catalogs (general-fitness + 3 premium)
   - Verify exercise count matches total

2. **Test Regular User:**
   - User: New user without catalog access
   - Expected: Only general-fitness catalog
   - Verify only general-fitness exercises returned

3. **Test Expired Access:**
   - Grant access with past expiration date
   - Expected: Catalog not included
   - Verify access query filters correctly

### 4.3 End-to-End Tests

**AI Workout Generation:**
1. Submit AI workout request as test user
2. Verify generated workouts can include exercises from all catalogs
3. Submit as regular user
4. Verify generated workouts only use general-fitness exercises

---

## 5. Future Enhancements

### 5.1 Premium Subscription System (Phase 2)
- Integrate with payment provider (Stripe/PayPal)
- Automatic catalog grant on subscription purchase
- Auto-revoke on subscription cancellation
- Subscription tiers (e.g., "Women's Pack", "Complete Pack")

### 5.2 Catalog Bundles (Phase 3)
```sql
-- Example: Bundle table
CREATE TABLE catalog_bundles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  catalog_ids text[] NOT NULL,
  price_cents integer,
  description text
);

-- Bundle: Women's Pack
INSERT INTO catalog_bundles (name, catalog_ids, price_cents)
VALUES ('Women''s Pack', ARRAY['women-health', 'tai-chi'], 999);
```

### 5.3 Trial Access (Phase 4)
- Time-limited trial access (e.g., 7-day free trial)
- Automatic conversion to paid subscription
- Trial reminder emails

### 5.4 Admin Dashboard (Phase 5)
- Web UI for backoffice to manage catalog access
- Bulk grant/revoke operations
- User search by email
- Access history/audit log viewer

---

## 6. Risks and Mitigations

### Risk 1: Exercise File Duplication
**Impact:** Exercise data duplicated in frontend and edge function
**Mitigation:**
- Document sync requirement in README
- Add reminder comment in exercise files
- Future: Migrate to database as single source of truth

### Risk 2: Missing Catalog Access Records
**Impact:** Users with expired trials may lose access unexpectedly
**Mitigation:**
- Grace period before revocation
- Email notification before expiration
- Customer support can manually restore access

### Risk 3: Performance with Many Users
**Impact:** Catalog access query on every AI request
**Mitigation:**
- Indexed query (fast lookups by owner_id)
- Consider caching catalog access in user session
- Monitor query performance in production

---

## 7. Success Criteria

✅ **Database:**
- Table `user_catalog_access` created successfully
- Helper functions working correctly
- RLS policies enforced
- Test users have access to all premium catalogs

✅ **Edge Function:**
- AI workout generation filters exercises by catalog access
- Test users can generate workouts with all catalogs
- Regular users limited to general-fitness
- Proper logging of catalog access checks

✅ **Documentation:**
- Migration tracking updated
- Backoffice instructions documented
- Code comments explain access logic

✅ **Testing:**
- All database function tests passing
- Integration tests with edge function passing
- End-to-end AI workout generation working

---

## 8. Timeline

**Estimated Duration:** 2-3 hours

- **Phase 1 (Database):** 30 minutes
- **Phase 2 (Seed Data):** 15 minutes
- **Phase 3 (Copy Files):** 15 minutes
- **Phase 4 (Edge Function):** 45 minutes
- **Phase 5 (Deploy/Test):** 30 minutes
- **Phase 6 (Documentation):** 15 minutes

**Total:** ~2.5 hours

---

## 9. Appendix

### A. Catalog IDs Reference

| Catalog ID | Name | Premium | Exercise Count (approx) |
|------------|------|---------|-------------------------|
| `general-fitness` | General Fitness | No | ~120 exercises |
| `women-health` | Women's Health | Yes | ~60 exercises |
| `tai-chi` | Tai Chi | Yes | ~15 exercises |
| `zumba` | Zumba | Yes | ~15 exercises |

### B. Database Queries for Backoffice

**Grant Access:**
```sql
SELECT grant_catalog_access(
  'user@example.com',
  'women-health',
  'admin@repcue.com',
  NULL, -- No expiration
  'Purchased via Stripe'
);
```

**Revoke Access:**
```sql
SELECT revoke_catalog_access('user@example.com', 'women-health');
```

**View User's Access:**
```sql
SELECT
  u.email,
  uca.catalog_id,
  uca.granted_at,
  uca.granted_by,
  uca.expires_at,
  uca.notes
FROM user_catalog_access uca
JOIN auth.users u ON u.id = uca.owner_id
WHERE u.email = 'user@example.com'
ORDER BY uca.granted_at DESC;
```

**View All Active Access:**
```sql
SELECT
  u.email,
  uca.catalog_id,
  uca.granted_at,
  uca.expires_at
FROM user_catalog_access uca
JOIN auth.users u ON u.id = uca.owner_id
WHERE uca.expires_at IS NULL OR uca.expires_at > now()
ORDER BY u.email, uca.catalog_id;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-05
**Next Review:** After Phase 5 completion
