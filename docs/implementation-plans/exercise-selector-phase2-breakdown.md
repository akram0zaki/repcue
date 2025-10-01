# Exercise Selector - Phase 2: Enhanced UX Breakdown

## Executive Summary

Phase 2 focuses on **reducing exercise selection time** and **improving selection accuracy** through smart shortcuts and contextual previews. The goal is to cut selection time from 10+ seconds to <5 seconds for frequently-used exercises.

---

## Phase 2 Goals

### Primary Objective
**Reduce friction in exercise selection for repeat users while maintaining discoverability for new users.**

### User Problems Being Solved

1. **Time Waste**: Users repeatedly scroll through 70+ exercises to find their "go-to" exercises
2. **Memory Load**: Users must remember exercise details before selecting
3. **Navigation Friction**: Users can't preview exercise instructions without fully selecting and navigating away
4. **Power User Inefficiency**: Beyond favorites, there's no way to quickly access frequently-used exercises

### Expected Impact

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Selection time (repeat exercises) | 10-15s | 3-5s | **50-70% faster** |
| Wrong exercise selections | ~15% | <5% | **30% reduction** |
| Exercise discovery | Good | Excellent | **Grouped view** |
| User satisfaction | 7/10 | 9/10 | **+2 points** |

---

## Feature 1: Quick Access Section

### Overview

Display a compact horizontal section at the top of the exercise selector showing:
- **Recent Selections**: Last 5 exercises selected
- **Pinned Exercises**: User-pinned exercises (like bookmarks)
- **Smart Ordering**: Pinned first, then recent

### Why This Matters

**User Story**: "As a user who does the same 10 exercises every week, I want to see them at the top so I don't waste time scrolling."

**Analytics Insight**: Most users have a "core set" of 8-12 exercises they use 80% of the time.

---

### Task Breakdown: Recent Selections

#### Task 1.1: Recent Selections Data Layer

**File**: `apps/frontend/src/services/storageService.ts`

**What to do**:
1. Add `recent_selections` table to IndexedDB schema
   ```typescript
   recent_selections: '++id, exercise_id, timestamp'
   ```
2. Implement `addRecentSelection(exerciseId: string)` method
3. Implement `getRecentSelections(limit: number = 5)` method
4. Implement LRU (Least Recently Used) eviction logic
5. Add `clearRecentSelections()` method

**Acceptance Criteria**:
- ✅ Stores exercise ID + timestamp on each selection
- ✅ Returns last 5 selections, ordered by timestamp DESC
- ✅ Automatically removes entries older than 30 days
- ✅ Handles duplicate selections (updates timestamp)
- ✅ Works offline (IndexedDB)

**Test Cases**:
```typescript
describe('Recent Selections', () => {
  it('should store recent selection with timestamp');
  it('should return last 5 selections');
  it('should update timestamp for duplicate selection');
  it('should evict oldest when >5 selections');
  it('should clear all recent selections');
});
```

**Estimated Time**: 2 hours

---

#### Task 1.2: Recent Selections Hook

**File**: `apps/frontend/src/hooks/useRecentSelections.ts`

**What to do**:
1. Create custom hook `useRecentSelections()`
2. Fetch recent selections from StorageService
3. Provide `addRecent` and `clearRecent` functions
4. Handle loading/error states
5. Automatically refresh on selection

**API Design**:
```typescript
interface UseRecentSelectionsResult {
  recentExercises: Exercise[];
  addRecent: (exerciseId: string) => Promise<void>;
  clearRecent: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useRecentSelections(
  allExercises: Exercise[]
): UseRecentSelectionsResult
```

**Acceptance Criteria**:
- ✅ Returns Exercise objects (not just IDs)
- ✅ Updates automatically when selection added
- ✅ Handles exercises that no longer exist
- ✅ Memoized to prevent re-renders

**Estimated Time**: 1.5 hours

---

### Task Breakdown: Pinned Exercises

#### Task 1.3: Pinned Exercises Data Layer

**File**: `apps/frontend/src/services/storageService.ts`

**What to do**:
1. Add `pinned_exercises` table to IndexedDB schema
   ```typescript
   pinned_exercises: '++id, exercise_id, pinned_at'
   ```
2. Implement `togglePinExercise(exerciseId: string)` method
3. Implement `getPinnedExercises()` method
4. Add sync support via ConsentService

**Acceptance Criteria**:
- ✅ Stores pinned state per exercise
- ✅ Persists across sessions
- ✅ Max 10 pinned exercises (configurable)
- ✅ Syncs if user has consent

**Estimated Time**: 2 hours

---

#### Task 1.4: Pinned Exercises UI

**File**: `apps/frontend/src/components/ExerciseSelector/ExerciseSelector.tsx`

**What to do**:
1. Add pin icon button to exercise cards
2. Distinguish pin icon from favorite star
3. Add tooltip: "Pin for quick access"
4. Show visual feedback on pin/unpin
5. Handle max pinned limit (show warning)

**Design**:
- Pin icon: 📌 (or thumbtack icon from icon library)
- Location: Top-right corner of card (next to favorite star)
- Color: Neutral (not colored like favorite star)
- States: Pinned (filled), Unpinned (outline)

**Acceptance Criteria**:
- ✅ Pin/unpin toggles on click
- ✅ Visual distinction from favorite star
- ✅ Accessible (keyboard + screen reader)
- ✅ Shows toast when limit reached

**Estimated Time**: 2 hours

---

### Task Breakdown: Quick Access UI

#### Task 1.5: Quick Access Section Component

**File**: `apps/frontend/src/components/ExerciseSelector/QuickAccessSection.tsx`

**What to do**:
1. Create new component `QuickAccessSection`
2. Display horizontal scrollable row of exercise cards
3. Show pinned + recent (deduplicated)
4. Add section header with "Clear recent" link
5. Handle empty state gracefully

**Component Structure**:
```tsx
<div className="quick-access-section">
  <div className="header">
    <h4>{t('exercises.quickAccess')}</h4>
    <button onClick={clearRecent}>{t('common.clear')}</button>
  </div>
  <div className="horizontal-scroll">
    {pinnedExercises.map(ex => <ExerciseCard compact />)}
    {recentExercises.map(ex => <ExerciseCard compact />)}
  </div>
  <div className="divider" />
</div>
```

**Styling**:
- Horizontal scroll with snap points
- Compact card size (96x80px)
- Subtle background to distinguish from main list
- Mobile: swipe-friendly
- Desktop: mouse-wheel scroll

**Acceptance Criteria**:
- ✅ Shows max 8 exercises (configurable)
- ✅ Pinned exercises appear first
- ✅ Deduplicates (if exercise is both pinned and recent)
- ✅ Smooth horizontal scroll
- ✅ Empty state: "No recent selections yet"

**Estimated Time**: 3 hours

---

#### Task 1.6: Integrate Quick Access into ExerciseSelector

**File**: `apps/frontend/src/components/ExerciseSelector/ExerciseSelector.tsx`

**What to do**:
1. Import QuickAccessSection
2. Add prop `showQuickAccess?: boolean` (default: true)
3. Place section above search bar
4. Wire up selection callback
5. Test on all three pages (Timer, Create, Edit)

**Acceptance Criteria**:
- ✅ Appears on all selector instances
- ✅ Selecting from quick access closes modal
- ✅ Quick access updates immediately after selection
- ✅ Can be disabled via prop

**Estimated Time**: 1 hour

---

### Task Breakdown: Category-Grouped View

#### Task 1.7: Grouped View Toggle

**File**: `apps/frontend/src/components/ExerciseSelector/ExerciseSelector.tsx`

**What to do**:
1. Add state: `viewMode: 'list' | 'grouped'`
2. Add toggle button in header (next to sort dropdown)
3. Save preference to localStorage
4. Re-render exercise list based on view mode

**UI Design**:
- Toggle button with icons: ☰ (list) vs 📋 (grouped)
- Located near sort dropdown
- Toggle state persists across sessions

**Acceptance Criteria**:
- ✅ Toggles between list and grouped view
- ✅ Preference persists in localStorage
- ✅ Smooth transition (no jarring re-render)

**Estimated Time**: 2 hours

---

#### Task 1.8: Grouped View Rendering

**File**: `apps/frontend/src/components/ExerciseSelector/GroupedExerciseList.tsx`

**What to do**:
1. Create new component `GroupedExerciseList`
2. Group exercises by category
3. Render category headers with collapsible sections
4. Show exercise count per category
5. Handle empty categories gracefully

**Component Structure**:
```tsx
<div className="grouped-list">
  {categories.map(cat => (
    <details key={cat} open>
      <summary>
        <span>{localizeCategory(cat)}</span>
        <span className="count">{exercisesInCat.length}</span>
      </summary>
      <div className="exercises-grid">
        {exercisesInCat.map(ex => <ExerciseCard />)}
      </div>
    </details>
  ))}
</div>
```

**Styling**:
- Category headers: bold, colored by category
- Collapsible with smooth animation
- Grid layout for exercises (2 cols mobile, 3+ cols desktop)

**Acceptance Criteria**:
- ✅ Groups exercises by category
- ✅ Collapsible category sections
- ✅ Shows exercise count per category
- ✅ Empty categories hidden or grayed out
- ✅ Respects current filters/search

**Estimated Time**: 3 hours

---

#### Task 1.9: i18n Keys for Quick Access

**Files**: `apps/frontend/public/locales/*/common.json`

**What to do**:
1. Add new translation keys:
   ```json
   {
     "exercises": {
       "quickAccess": "Quick Access",
       "recentSelections": "Recent",
       "pinnedExercises": "Pinned",
       "pinExercise": "Pin for quick access",
       "unpinExercise": "Unpin",
       "maxPinnedReached": "Maximum 10 pinned exercises",
       "listView": "List View",
       "groupedView": "Grouped by Category",
       "noRecentSelections": "No recent selections yet"
     }
   }
   ```
2. Translate for all 6 supported languages
3. Run `pnpm i18n:scan` to verify

**Estimated Time**: 1 hour

---

## Feature 2: Exercise Preview Panel

### Overview

Allow users to **hover (desktop) or tap an info icon (mobile)** to see a preview panel showing:
- Exercise name and category
- Description/instructions
- Video demo (if available)
- Default reps/sets
- "Select" button

This reduces navigation friction and helps users make informed selections.

---

### Task Breakdown: Preview Panel Component

#### Task 2.1: Create ExercisePreviewPanel Component

**File**: `apps/frontend/src/components/ExerciseSelector/ExercisePreviewPanel.tsx`

**What to do**:
1. Create slide-in panel component
2. Design responsive layout (mobile: bottom sheet, desktop: popover)
3. Display exercise details
4. Include video thumbnail/player
5. Add "Select" and "Close" buttons

**Component API**:
```typescript
interface ExercisePreviewPanelProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  position?: 'bottom' | 'right'; // mobile vs desktop
}
```

**Layout**:
```
┌─────────────────────────────┐
│ [X Close]                   │
│ Exercise Name               │
│ Category Badge | Type Badge │
├─────────────────────────────┤
│ [Video Thumbnail]           │
│    [▶ Play]                 │
├─────────────────────────────┤
│ Description text...         │
│ Instructions text...        │
├─────────────────────────────┤
│ Defaults: 3×12 | Rest: 30s  │
├─────────────────────────────┤
│ [Select] [Read More →]      │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Slides in from bottom (mobile) or right (desktop)
- ✅ Smooth animation (300ms ease-out)
- ✅ Backdrop blur effect
- ✅ Dismissible via backdrop click or close button
- ✅ Focus trapped within panel

**Estimated Time**: 4 hours

---

#### Task 2.2: Preview Trigger - Hover/Tap Interaction

**File**: `apps/frontend/src/components/ExerciseSelector/ExerciseCard.tsx`

**What to do**:
1. Add info icon (ℹ️) to exercise cards
2. Desktop: show preview on card hover (300ms delay)
3. Mobile: show preview on info icon tap
4. Prevent accidental selection while previewing
5. Handle touch vs mouse events

**Interaction Design**:
- **Desktop**: Hover over card for 300ms → preview appears
- **Mobile**: Tap info icon (ℹ️) → preview appears
- **Both**: Click outside or press Esc → preview closes

**Acceptance Criteria**:
- ✅ Info icon visible on all cards
- ✅ Hover delay prevents accidental previews
- ✅ Mobile: info icon large enough (44x44px)
- ✅ Prevents card selection when info icon clicked
- ✅ Smooth transition on open/close

**Estimated Time**: 3 hours

---

#### Task 2.3: Video Preview Integration

**File**: `apps/frontend/src/components/ExerciseSelector/ExercisePreviewPanel.tsx`

**What to do**:
1. Check `hasVideo` flag and `exercise_media.json`
2. Integrate `VideoThumbnail` component
3. Add inline video player in preview
4. Respect video demo feature flag
5. Handle reduced-motion preference
6. Lazy load video on preview open

**Implementation**:
```tsx
{exercise.hasVideo && (
  <VideoThumbnail
    exerciseId={exercise.id}
    exerciseName={exercise.name}
    autoPlay={false}
    controls={true}
    className="preview-video"
  />
)}
```

**Acceptance Criteria**:
- ✅ Video loads only when preview opens (lazy)
- ✅ Respects video demo settings (global + user)
- ✅ Respects reduced-motion preference
- ✅ Shows placeholder if video unavailable
- ✅ Video pauses when preview closes

**Estimated Time**: 2 hours

---

#### Task 2.4: Exercise Instructions Display

**File**: `apps/frontend/src/components/ExerciseSelector/ExercisePreviewPanel.tsx`

**What to do**:
1. Add `instructions` field to Exercise type (if missing)
2. Fetch localized instructions from i18n
3. Display with proper formatting (line breaks, lists)
4. Add "Read more" link to full exercise page
5. Handle missing instructions gracefully

**Data Structure**:
```typescript
// Add to Exercise type
interface Exercise {
  // ... existing fields
  instructions?: string; // Localized via i18n key
}
```

**i18n Structure**:
```json
// public/locales/en/exercises.json
{
  "pushups": {
    "name": "Push-ups",
    "description": "Upper body strength exercise",
    "instructions": "1. Start in plank position\n2. Lower body...\n3. Push back up"
  }
}
```

**Acceptance Criteria**:
- ✅ Shows localized instructions
- ✅ Formats multi-line text correctly
- ✅ Truncates long instructions with "Read more"
- ✅ Gracefully handles missing instructions
- ✅ Links to full exercise page (optional)

**Estimated Time**: 2 hours

---

#### Task 2.5: Preview Panel Accessibility

**File**: `apps/frontend/src/components/ExerciseSelector/ExercisePreviewPanel.tsx`

**What to do**:
1. Add ARIA attributes (`aria-expanded`, `role="dialog"`)
2. Implement focus trap in preview panel
3. Add keyboard shortcut to open preview (Space key)
4. Ensure screen reader announces preview content
5. Test with keyboard-only navigation

**ARIA Implementation**:
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="preview-title"
  aria-describedby="preview-description"
>
  <h3 id="preview-title">{exercise.name}</h3>
  <div id="preview-description">{description}</div>
</div>
```

**Keyboard Shortcuts**:
- `Space`: Open preview for focused exercise card
- `Esc`: Close preview
- `Tab`: Navigate within preview (focus trapped)
- `Enter`: Select exercise from preview

**Acceptance Criteria**:
- ✅ Screen reader announces preview open/close
- ✅ Focus trapped within preview when open
- ✅ Focus returns to trigger element on close
- ✅ All actions accessible via keyboard
- ✅ WCAG 2.1 AA compliant

**Estimated Time**: 3 hours

---

### Task Breakdown: Testing & Documentation

#### Task 2.6: Unit Tests for Phase 2

**Files**:
- `apps/frontend/src/hooks/__tests__/useRecentSelections.test.ts`
- `apps/frontend/src/components/ExerciseSelector/__tests__/QuickAccessSection.test.tsx`
- `apps/frontend/src/components/ExerciseSelector/__tests__/ExercisePreviewPanel.test.tsx`
- `apps/frontend/src/components/ExerciseSelector/__tests__/GroupedExerciseList.test.tsx`

**What to test**:

1. **Recent Selections**:
   - LRU cache eviction logic
   - Duplicate handling
   - Clear functionality
   - Timestamp updates

2. **Pinned Exercises**:
   - Pin/unpin toggle
   - Max limit enforcement
   - Persistence across sessions

3. **Quick Access UI**:
   - Rendering pinned + recent
   - Deduplication logic
   - Empty state
   - Selection callback

4. **Grouped View**:
   - Category grouping logic
   - Collapsible sections
   - Exercise count per category
   - Empty category handling

5. **Preview Panel**:
   - Open/close behavior
   - Keyboard shortcuts
   - Focus trap
   - Video loading
   - Instructions display

**Estimated Time**: 6 hours

---

#### Task 2.7: Integration Tests

**Files**: `cypress/e2e/exercise-selector-phase2.cy.ts`

**Test Scenarios**:

1. **Quick Access Flow**:
   - Select exercise → verify appears in recent
   - Pin exercise → verify appears at top
   - Clear recent → verify cleared

2. **Preview Panel Flow**:
   - Hover exercise (desktop) → preview appears
   - Tap info icon (mobile) → preview appears
   - Click select in preview → exercise selected
   - Press Esc → preview closes

3. **Grouped View Flow**:
   - Toggle to grouped view
   - Collapse category → exercises hidden
   - Expand category → exercises shown
   - Verify preference persists

**Estimated Time**: 4 hours

---

#### Task 2.8: Documentation Updates

**Files to Update**:

1. **README.md**:
   - Add Phase 2 features to ExerciseSelector section
   - Update usage examples with new props
   - Document quick access and preview features

2. **CHANGELOG.md**:
   - Add "Phase 2: Enhanced UX" entry
   - List all new features and improvements

3. **docs/ui-ux/ui-specs.md**:
   - Document preview panel design
   - Document quick access section design
   - Add interaction patterns

4. **Implementation plan**:
   - Mark Phase 2 tasks as complete
   - Update timeline with actual completion date

**Estimated Time**: 2 hours

---

## Phase 2 Summary

### Total Tasks: 16

| Category | Tasks | Estimated Time |
|----------|-------|----------------|
| Recent Selections | 2 | 3.5 hours |
| Pinned Exercises | 2 | 4 hours |
| Quick Access UI | 3 | 6 hours |
| Category Grouped View | 3 | 7 hours |
| Preview Panel | 5 | 14 hours |
| Testing | 2 | 10 hours |
| Documentation | 1 | 2 hours |
| **TOTAL** | **16** | **46.5 hours ≈ 6 days** |

### Adjusted Timeline

**Original Estimate**: 2-3 days
**Realistic Estimate**: 5-6 days (based on detailed breakdown)

**Breakdown by Day**:
- **Day 1**: Recent selections + Pinned exercises (data layer + hooks)
- **Day 2**: Quick Access UI + integration
- **Day 3**: Category grouped view
- **Day 4**: Preview panel component + interactions
- **Day 5**: Video preview + instructions + accessibility
- **Day 6**: Testing + documentation + polish

---

## Dependencies

### External Dependencies
- None (all features use existing components)

### Internal Dependencies
- `VideoThumbnail` component (for video preview)
- `StorageService` (for recent selections + pinned state)
- `ConsentService` (for sync support)
- `CategoryFilter` component (already used in Phase 1)

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Preview panel performance on low-end devices | Medium | Medium | Lazy load video, debounce hover, test on low-end device |
| Recent selections sync conflicts | Low | Low | Use timestamps for conflict resolution |
| Grouped view breaks existing filters | High | Low | Comprehensive unit tests, maintain filter compatibility |
| Hover delay annoys users | Medium | Medium | Make delay configurable (200-500ms) |
| Too many pinned exercises clutter UI | Low | Medium | Enforce max limit (10), add management UI |

---

## Success Metrics

**Quantitative**:
- Selection time for repeat exercises: <5 seconds (target: 50% reduction)
- Preview panel usage: >40% of selections
- Quick access usage: >60% of selections
- Wrong selections: <5% (target: 30% reduction)

**Qualitative**:
- User feedback: "Much faster to find exercises"
- No complaints about UI clutter
- Positive feedback on preview feature
- Mobile users praise info icon discoverability

---

## Next Steps After Phase 2

**Phase 3 Focus**: Power user features (keyboard navigation, performance optimization)

**Potential Future Enhancements**:
- AI-suggested exercises based on workout history
- Exercise variants (show "similar exercises" in preview)
- Multi-select mode (for bulk workout creation)
- Custom exercise tags/labels

---

**Document Version**: 1.0
**Created**: 2025-10-01
**Author**: Claude Code Agent
**Status**: Ready for Implementation
