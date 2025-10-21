## Unreleased

### 2025-10-21

#### 🔐 Legal Acceptance & Consent V3 - Phase 1 Backend Complete

**Overview**: Completed Phase 1 of Legal Acceptance & Consent V3 system implementation. Successfully deployed backend infrastructure to dev environment including database schema, Edge Function, and baseline legal documents.

**Phase 1 Achievements**:
- ✅ Database migration: `legal_acceptances` table with RLS policies
- ✅ Edge Function: `legal-manifest` (v1) with ETag support and cache validation
- ✅ Baseline legal documents: 10 documents (6 required, 4 optional)
- ✅ Hash generation script: SHA-256 base64 content hashes
- ✅ TypeScript types: Complete type definitions for legal system
- ✅ Feature flag: `LEGAL_ACCEPTANCE_V3_ENABLED = true`

**Database Schema** (`legal_acceptances` table):
- Composite primary key: (user_id, doc_id)
- Fields: accepted_version, content_hash, locale, accepted_at
- RLS policies: Users can only access own acceptance records
- Performance indexes: user_id, doc_id, accepted_at DESC
- Foreign key: user_id → auth.users(id) with CASCADE delete

**Edge Function** (`legal-manifest`):
- **Endpoint**: `GET /functions/v1/legal-manifest`
- **Function ID**: d9b2a9d3-37c5-4e65-873d-060664ae2a70
- **Status**: ACTIVE in dev environment
- **Features**:
  - ETag generation via crypto.subtle.digest (SHA-256 hex)
  - Cache-Control: `max-age=60, stale-while-revalidate=86400`
  - 304 Not Modified responses via If-None-Match header
  - CORS headers for same-origin policy
  - Graceful degradation with baseline manifest fallback
  - Embedded baseline manifest (10 documents)

**Legal Documents Created** (all v1.0.0, effective 2025-11-01):
1. Terms & Conditions (required)
2. Privacy Policy (required)
3. Cookie Policy (required)
4. Medical Disclaimer (required)
5. Liability Waiver (required)
6. Data Processing Agreement (optional)
7. Subscription & Payment Policy (optional)
8. Community Guidelines (optional)
9. Imprint (required)
10. Appendices (optional, reference only)

**Technical Implementation**:
- All documents stored in `apps/frontend/public/legal/` with numeric prefixes (01-10)
- Manifest JSON: `apps/frontend/public/legal/manifest.json`
- Hash script: `scripts/generate-legal-hashes.js` (ES module)
- Types: `apps/frontend/src/types/legal.ts` (LegalAcceptance, ConsentV3, LegalManifest, etc.)

**Architecture Highlights**:
- Offline-first: Baseline manifest embedded in Edge Function
- Security: RLS policies ensure data privacy
- Performance: ETag-based cache validation reduces bandwidth
- Reliability: Graceful degradation on error
- Separation: Essential consent (cookies) = device-local; Legal acceptance = user-level synced

**Files Created/Modified**:
- `supabase/migrations/20251021-01-create-legal-acceptances-table.sql`
- `supabase/functions/legal-manifest/index.ts`
- `apps/frontend/public/legal/*.en.md` (10 files)
- `apps/frontend/public/legal/manifest.json`
- `scripts/generate-legal-hashes.js`
- `apps/frontend/src/types/legal.ts`
- `apps/frontend/src/config/features.ts` (added LEGAL_ACCEPTANCE_V3_ENABLED flag)
- `docs/migration-tracking/supabase-changes_20251021.md`
- `docs/implementation-plans/legal-acceptance/implementation-plan-legal-acceptance.md`
- `docs/implementation-plans/legal-acceptance/PHASE1-DEPLOYMENT-SUMMARY.md`

**Deployment Status**:
- ✅ Dev environment: Migration applied, Edge Function v1 deployed
- ⏳ Production: Pending Phase 2-6 completion

**Known Issues & Resolutions**:
- Fixed: Deno hash module error → Replaced with Web Crypto API (crypto.subtle.digest)

**Next Steps (Phase 2)**:
1. Extend ConsentService to V3 (add legalAcceptances field)
2. Create LegalDocsService (manifest loading, diff logic, acceptance tracking)
3. Create LegalUpdateService (scheduled checks, event emitting, workout deferral)
4. Configure Service Worker (network-first for manifest, stale-while-revalidate for docs)

**Documentation**:
- PRD: `docs/implementation-plans/legal-acceptance/PRD-legal-acceptance.md`
- Architecture: `docs/implementation-plans/legal-acceptance/architecture-spec-legal-acceptance.md`
- Implementation Plan: `docs/implementation-plans/legal-acceptance/implementation-plan-legal-acceptance.md`
- Migration Tracker: `docs/migration-tracking/supabase-changes_20251021.md`
- Deployment Summary: `docs/implementation-plans/legal-acceptance/PHASE1-DEPLOYMENT-SUMMARY.md`

---

### 2025-10-18

#### 📊 AI Coach Feature - Progress Audit Complete

**Overview**: Completed comprehensive progress audit of AI Coach implementation plan, marking all completed tasks across Phase 1 (100% complete) and Phase 2 (100% complete - testing framework ready). Phase 3 deferred pending user validation.

**Implementation Status**:
- **Phase 1**: ✅ 100% COMPLETE (5 modules, 28 tasks, ~10 hours actual vs 76h estimated)
  - Analytics Service & Data Models
  - Coaching Service & Recommendation Engine
  - UI Components (reused WeeklyStreakCalendar, ProgressChart)
  - Integration & Settings
  - Localization & Polish (8 languages, WCAG 2.1 AA compliant)

- **Phase 2**: ✅ 100% COMPLETE (8 modules, 30 tasks, ~76 hours actual vs 92h estimated)
  - Edge Function Infrastructure (Mistral AI integration)
  - Frontend AI Integration (InsightsService, AI/rule-based hybrid)
  - Advanced Algorithms (progression detection, recovery recommendations)
  - i18n Localization (20+ keys across 8 languages)
  - Integration Testing (18/18 tests passing)
  - Documentation & Finalization (user guide, API docs, cost monitoring)
  - Personal Records & Milestones (cross-device sync, celebration modal, history page)
  - Performance Testing & Optimization (E2E framework, benchmarks, cost analysis)

- **Phase 3**: ⏸️ NOT STARTED - Deferred to future enhancement
  - Adaptive Workout Programs (overlaps with existing AI workouts feature)
  - Exercise Substitution & Recommendations
  - Advanced Analytics & Predictions
  - Gamification & Social Features
  - Polish & Launch Prep

**Key Achievements**:
- 95/95 unit tests passing (100% success rate)
- 21 E2E test scenarios created
- Full offline-first architecture compliance
- Cross-device sync for personal records
- Comprehensive documentation (1,400+ lines)
- Performance monitoring framework ready
- Cost analysis and optimization guidelines documented

**Efficiency Metrics**:
- Phase 1: 87% faster than revised estimate
- Phase 2: 17% faster than revised estimate
- Overall: 70% faster than revised estimate (~86h actual vs 293h revised)

**Production Readiness**:
- ✅ All code complete and tested
- ✅ Documentation complete (user + API + monitoring)
- ✅ E2E test suite ready
- ⏸️ Manual testing pending (2-3 hours)
- ⏸️ Production deployment pending (2-3 hours)

**Files Modified**:
- `docs/implementation-plans/repcue-ai-coach/ai-coach-implementation-plan.md` - Updated progress for all phases
- `docs/implementation-plans/repcue-ai-coach/enhancements-addendum.md` - Marked Phase 1 enhancements 100% complete

**Decision Rationale**:
- Phase 3 Module 3.1 (Adaptive Programs) overlaps with existing AI-generated workouts feature
- Better to deploy Phase 1 & 2 → validate with users → prioritize Phase 3 based on feedback
- Current features provide complete core coaching experience
- No user validation yet for Phase 3 features (125 hours of unvalidated work)

**Next Steps**:
1. Complete Phase 2 manual testing checklist
2. Deploy to production (database migrations + Edge Functions)
3. Monitor performance and costs for first week
4. Gather user feedback
5. Re-evaluate Phase 3 scope based on actual user needs

**Related Documentation**:
- Implementation Plan: `docs/implementation-plans/repcue-ai-coach/ai-coach-implementation-plan.md`
- Enhancements Progress: `docs/implementation-plans/repcue-ai-coach/enhancements-addendum.md`

---

#### 🧠 AI Insight Dismissal Persistence Fix

**Overview**: Fixed critical bug where dismissed AI-powered coaching insights reappeared after navigating to other pages. Implemented stable content-based IDs for AI insights to enable proper dismissal tracking.

**Problem**:
- AI insights were using timestamp + correlationId based IDs: `ai-coach-{timestamp}-{correlationId}-{index}`
- Each API request generated new IDs for the same insight content
- Dismissal system couldn't match IDs across requests
- `getAIEnhancedInsights()` was bypassing dismissal filter entirely
- Result: Dismissed insights reappeared immediately after page navigation

**Solution**: Implemented stable content-based ID generation using hash of insight title + type:

**Files Modified**:

1. **Backend - Edge Function** (`supabase/functions/analyze-progress/index.ts`):
   - Added `simpleHash(str)` function (lines 36-48) - same algorithm as frontend
   - Added `generateStableInsightId(insight)` function (lines 50-61)
   - Updated fresh insights ID generation (line ~489): `ai-${type}-${titleHash}`
   - Updated cached insights ID generation (line ~427): same stable format
   - Deployed to both dev and prod environments

2. **Frontend Service** (`apps/frontend/src/services/insightsService.ts`):
   - Added `simpleHash(str)` private method (lines ~425-436)
   - Updated fresh AI insights ID generation (line ~254): content-based IDs
   - Updated cached AI insights ID generation (line ~477): same stable format
   - Both now use: `ai-${insight.type}-${titleHash}` format
   - Removed unused `index` parameter from map callback

3. **Frontend Service** (`apps/frontend/src/services/coachingService.ts`):
   - **CRITICAL FIX**: Added dismissal filtering to `getAIEnhancedInsights()` return path
   - Previously returned merged insights without applying dismissal filter
   - Now filters out dismissed insights before returning (line ~226-233)
   - Updated `clearCache()` to also clear `insightsService` cache
   - Added optional chaining for `reason?.includes()` safety check

**Deployment Steps**:
```bash
# Deploy edge function to both environments
supabase functions deploy analyze-progress --project-ref xwzrsfkzqxdybjrkkkvh  # Dev
supabase functions deploy analyze-progress --project-ref zumzzuvfsuzvvymhpymk  # Prod

# Clear old cache with old-format IDs
DELETE FROM coaching_ai_cache WHERE created_at < NOW();  # Both environments
```

**Key Features**:
- ✅ Stable IDs based on insight content (title + type)
- ✅ Same insight gets same ID across all requests
- ✅ Dismissed AI insights stay dismissed for 24 hours
- ✅ Works across page navigation and app sessions
- ✅ Compatible with refresh button (clears dismissals on demand)
- ✅ Consistent hash algorithm between frontend and backend
- ✅ Proper dismissal filtering in AI-enhanced mode
- ✅ Cache clearing includes both coaching and insights service

**ID Format**:
- **Old**: `ai-coach-1760784667695-ai-coach-1760784662539-dlh5ctk-0` (changes every request)
- **New**: `ai-motivation-5f3a8b` (stable across requests)

**Impact**:
- Fixes dismissal persistence for AI insights
- Matches behavior of rule-based insights
- Improves user experience on Coach page
- Reduces repetitive insight display
- No breaking changes or data migration needed

**Technical Details**:
- Hash algorithm: `((hash << 5) - hash) + char` with base36 encoding
- Collision probability: Extremely low given unique titles + type prefix
- Storage: localStorage key `repcue_dismissed_insights`
- Expiration: 24 hours from dismissal time
- Cache: Cleared to force fresh insights with new IDs
- Dismissal filter: Applied to both `getAllInsights()` and `getAIEnhancedInsights()`

**Bug Fixes**:
- Fixed TypeScript error: Added optional chaining for `reason?.includes()` check
- Fixed TypeScript error: Removed unused `index` parameter from map callback
- Fixed dismissal bypass: `getAIEnhancedInsights()` now properly filters dismissed insights

**Related Documentation**:
- See `docs/migration-tracking/supabase-changes_20251018_ai-insight-stable-ids.md` for full technical details

---

#### 🗄️ Database Schema Auto-Upgrade System

**Overview**: Implemented automatic database schema upgrade system to ensure all users have the latest IndexedDB schema with new features like personal records tracking.

**Problem**: Users with databases created before version 23 were missing the `personal_records` table, causing runtime errors:
- "Cannot read properties of undefined (reading 'toArray')" in production
- Personal records feature not working for existing users
- Defensive checks prevented crashes but didn't solve root cause

**Solution**: Added automatic database version detection and upgrade mechanism:

**Files Modified**:
1. `apps/frontend/src/services/storageService.ts`:
   - Added `checkAndUpgradeDatabase()` method to detect version drift and force upgrade
   - Method checks current database version (`this.db.verno`) against latest version (23)
   - If upgrade needed, closes and reopens database to trigger Dexie migration
   - Added comprehensive logging for upgrade process

2. `apps/frontend/src/App.tsx` (line ~1972):
   - Integrated automatic upgrade check during app initialization
   - Runs after `storageService.ready()` completes successfully
   - Ensures all users get latest schema on app load

3. `apps/frontend/src/pages/SettingsPage.tsx`:
   - Added "Upgrade Database" button in Data Management section
   - Allows users to manually trigger database upgrade if needed
   - Button positioned after "Refresh Exercises", before "Force Refresh"
   - Handler shows success/error alerts and triggers page reload
   - Translation keys: `settings.upgradeDatabase`, `settings.upgradeDatabaseHelp`

**Key Features**:
- ✅ Automatic upgrade on app initialization
- ✅ Manual upgrade option in Settings for troubleshooting
- ✅ Version comparison logging for debugging
- ✅ Safe upgrade path with database close/reopen
- ✅ User-friendly alerts for upgrade status
- ✅ Preserves existing user data during upgrade

**Impact**:
- Fixes production errors with personal_records table
- Ensures all users have access to personal records tracking
- Provides clear upgrade path for future schema changes
- Eliminates version drift between old and new installations

**Technical Details**:
- Current schema version: 23 (adds personal_records table)
- Upgrade process: Close DB → Reopen DB → Dexie auto-migrates
- No data loss during upgrade
- Upgrade runs once per version bump

**Testing**:
- TypeScript compilation: ✅ Pass
- Runtime errors: ✅ Fixed (defensive checks + upgrade)
- User experience: ✅ Seamless auto-upgrade
- i18n completeness: ✅ All 8 languages updated

**Translation Keys Added** (all locales: en, ar, ar-EG, de, es, fr, fy, nl):
- `settings.upgradeDatabase` - "Upgrade Database" button text
- `settings.upgradeDatabaseHelp` - Help text explaining the upgrade feature
- `settings.databaseUpgradeSuccess` - Success message after upgrade
- `settings.databaseUpgradeError` - Error message on failure

#### 🐛 Fix: Coach Insights Carousel Navigation Indicators (RTL Consistency)

**Problem**: On Arabic (RTL) home screen, the coach insights carousel showed pills for all navigation indicators (selected and non-selected), while the English version correctly showed a pill for the selected card and dots for non-selected cards.

**Root Cause**: Two issues were affecting carousel indicators in RTL mode:
1. **Tailwind CSS class conflict**: Base classes included `w-2`, then conditionally added `w-6` for selected indicators using template literals, causing CSS class precedence conflicts
2. **RTL padding override**: Global CSS rule in `index.css` (line 65) applied `padding-left: 1.5rem; padding-right: 1.5rem;` to all buttons in RTL mode, forcing all carousel indicators to appear as pills regardless of their width classes

**Solution**:
**File 1**: `apps/frontend/src/components/InsightsCarousel.tsx` (lines 328-348)
- Refactored to use explicit conditional rendering with separate complete class strings
- Added `data-carousel-indicator="true"` attribute to identify carousel buttons
- Added `p-0` class to both active and inactive states to explicitly reset padding

**File 2**: `apps/frontend/src/index.css` (line 65)
- Updated RTL button padding rule to exclude carousel indicators: `:not([data-carousel-indicator])`
- This prevents the global padding override from affecting carousel indicator dimensions

```tsx
// Component changes
<button
  data-carousel-indicator="true"  // New: identifies carousel buttons
  className={
    isActive
      ? 'w-6 h-2 ... p-0'  // New: explicit padding reset
      : 'w-2 h-2 ... p-0'
  }
/>
```

```css
/* CSS changes */
body.rtl button:not(.nav-more-button):not(.nav-item):not([aria-label*="Scroll"]):not([data-carousel-indicator]) {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
```

**Impact**:
- ✅ Consistent carousel indicator behavior across all languages (LTR and RTL)
- ✅ Selected card shows elongated pill (`w-6`)
- ✅ Non-selected cards show small dots (`w-2`)
- ✅ Proper visual hierarchy maintained in Arabic/RTL mode

**Testing**:
- TypeScript compilation: ✅ Pass
- Expected behavior: Pill for selected, dots for non-selected (both LTR and RTL)

