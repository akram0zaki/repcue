# Multi-Catalog Implementation Plan

## Overview

This plan outlines the implementation of a multi-catalog system for RepCue's exercise library, extending the current single "General Fitness" catalog to support multiple specialized catalogs (Tai Chi, Zumba, etc.) while maintaining the existing offline-first architecture and UX patterns.

## Current System Analysis

### Existing Architecture
- **Exercise Definitions**: TypeScript source in `src/data/exercises.ts` with English fallback text
- **Localization**: Separate JSON files per locale in `public/locales/*/exercises.json`
- **Media System**: Central `exercise_media.json` index + organized video assets
- **Resolution Flow**: `localizeExercise()` utility maps TypeScript IDs to i18n keys
- **Categories**: Flat structure with `ExerciseCategory` enum (CORE, STRENGTH, CARDIO, etc.)

### Key Constraints
1. **Offline-First**: All built-in exercises must work without network
2. **i18n Integrity**: All 8 locales must be maintained (en, de, es, fr, nl, ar, ar-EG, fy)
3. **UX Preservation**: No regression to timer feel/clarity, minimal layout impact
4. **Build System**: Existing media verification and translation scanning must continue working

## Design Decisions

### 1. Catalog Structure
```typescript
// New catalog metadata interface
export interface ExerciseCatalog {
  id: string;                    // 'general-fitness', 'tai-chi', 'zumba'
  nameKey: string;              // i18n key: 'catalogs.general-fitness.name'
  descriptionKey: string;       // i18n key: 'catalogs.general-fitness.description'
  isDefault: boolean;           // Only general-fitness = true
  isPremium: boolean;           // For future monetization
  displayOrder: number;         // UI sort order
  icon?: string;                // Optional catalog icon identifier
  colorTheme?: string;          // CSS theme identifier
}
```

### 2. Exercise Enhancement
```typescript
// Minimal change to existing Exercise interface
export interface Exercise extends SyncMetadata {
  // ... all existing fields unchanged ...
  catalogId: string;            // NEW: References ExerciseCatalog.id
}
```

### 3. File Organization Strategy

#### TypeScript Exercise Data
```
src/data/
├── catalogs.ts               # Catalog definitions
├── exercises.ts              # Re-export all exercises (maintain compatibility)
└── exercises/
    ├── generalFitness.ts     # Current INITIAL_EXERCISES
    ├── taiChi.ts            # New tai chi exercises
    └── zumba.ts             # New zumba exercises
```

#### Localization Files (No Change to Structure)
```
public/locales/*/
├── exercises.json            # Existing structure, exercises by ID
└── catalogs.json            # NEW: Catalog names/descriptions
```

#### Media Organization (Maintain Existing)
```
public/
├── exercise_media.json       # Existing format, no catalog separation needed
└── videos/                   # Existing flat structure works fine
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Type System Updates
- [ ] Add `ExerciseCatalog` interface to `src/types/index.ts`
- [ ] Add `catalogId: string` to `Exercise` interface
- [ ] Update `createExercise()` helper to require `catalogId`

#### 1.2 Catalog Definitions
- [ ] Create `src/data/catalogs.ts` with initial catalogs
- [ ] Migrate current exercises to `src/data/exercises/generalFitness.ts`
- [ ] Update `src/data/exercises.ts` to re-export from catalog files
- [ ] Add `catalogId: 'general-fitness'` to all existing exercises

#### 1.3 Service Layer Enhancement
- [ ] Add catalog-aware methods to `StorageService`:
  - `getExercisesByCatalog(catalogId: string)`
  - `getCatalogs()`
  - `getAvailableCatalogs()` (respects premium status)
- [ ] Ensure backward compatibility for existing exercise retrieval

### Phase 2: UI Implementation (Week 2)

#### 2.1 Catalog Selector Component
- [ ] Create `CatalogSelector.tsx` component
- [ ] Horizontal scrollable tabs design
- [ ] Premium lock indicators
- [ ] Smooth catalog switching with state preservation

#### 2.2 Exercise Page Integration
- [ ] Integrate catalog selector into exercise page header
- [ ] Update exercise listing to filter by selected catalog
- [ ] Preserve search/filter state across catalog switches
- [ ] Default to general-fitness catalog on load

#### 2.3 Search & Filter Adaptation
- [ ] Update search to work within selected catalog scope
- [ ] Maintain existing filter UI (categories, tags, etc.)
- [ ] Add catalog context to search results
- [ ] Ensure performance with catalog filtering

### Phase 3: Localization & Content (Week 3)

#### 3.1 Catalog Localization
- [ ] Create `catalogs.json` for all 8 supported locales:
  - `en`, `de`, `es`, `fr`, `nl`, `ar`, `ar-EG`, `fy`
- [ ] Add catalog name/description translations
- [ ] Update `localizeExercise()` to handle catalog context if needed

#### 3.2 New Catalog Content
- [ ] Research and define Tai Chi exercises
- [ ] Research and define Zumba exercises
- [ ] Add exercises to respective catalog files
- [ ] Translate all new exercises to 8 locales

#### 3.3 Localization Validation
- [ ] Update `pnpm i18n:scan` to validate catalog keys
- [ ] Ensure no missing translations across catalogs
- [ ] Verify translation consistency

### Phase 4: Testing & Polish (Week 4)

#### 4.1 Unit Testing
- [ ] Test catalog service methods
- [ ] Test exercise filtering by catalog
- [ ] Test localization with catalogs
- [ ] Test backward compatibility

#### 4.2 UI/UX Testing
- [ ] Test catalog switching performance
- [ ] Verify default catalog behavior
- [ ] Test search across catalogs
- [ ] Mobile responsiveness testing

#### 4.3 Build System Integration
- [ ] Verify `pnpm build` works with new structure
- [ ] Ensure media verification continues working
- [ ] Test translation scanning with catalogs
- [ ] Update build scripts if needed

## Database Impact

### IndexedDB (No Breaking Changes)
- Built-in exercises continue syncing normally
- `catalogId` field added to exercise records
- Catalog metadata stored locally for offline access
- Existing exercise queries remain compatible

### Supabase Migration Strategy
```sql
-- Development database migration
ALTER TABLE exercises ADD COLUMN catalog_id VARCHAR(50) DEFAULT 'general-fitness';
UPDATE exercises SET catalog_id = 'general-fitness' WHERE catalog_id IS NULL;
ALTER TABLE exercises ALTER COLUMN catalog_id SET NOT NULL;

-- Optional: Create catalogs table for future dynamic catalogs
CREATE TABLE exercise_catalogs (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## UX Design Specifications

### Catalog Selector Design
- **Position**: Top of exercise page, below search bar
- **Default State**: General Fitness selected and visible
- **Premium Catalogs**: Show with lock icon + "Upgrade" badge
- **Interaction**: Horizontal scroll on mobile, tabs on desktop
- **Visual**: Subtle pills/tabs, current catalog highlighted

### Catalog Switching Behavior
- **State Preservation**: Maintain search query when switching catalogs
- **Filter Reset**: Clear category filters when switching (they may not apply)
- **Loading**: Smooth transition, no jarring reloads
- **Fallback**: If premium catalog locked, show preview + upgrade prompt

### Search & Filter Integration
- **Scope**: Search within currently selected catalog
- **Visual Feedback**: Search results show catalog context if needed
- **Global Search**: Future feature to search across all unlocked catalogs

## Monetization Integration (Future)

### Premium Catalog Access
- Free users: Access to General Fitness only
- Premium users: Access to all catalogs
- Preview mode: Show locked catalogs with exercise count + sample names

### Upgrade Flow
- Clear value proposition for premium catalogs
- Seamless upgrade from catalog preview
- Graceful handling of subscription status changes

## Risk Mitigation

### Backward Compatibility
- All existing exercises continue working unchanged
- Exercise IDs remain stable across catalogs
- API contracts preserved for existing components

### Performance Considerations
- Lazy load catalog content on demand
- Maintain search/filter performance
- Efficient catalog switching without re-renders

### Translation Integrity
- Comprehensive translation validation pipeline
- Fallback to English for missing catalog translations
- Clear documentation for adding new locales

## Success Metrics

### Technical Success
- [ ] Zero breaking changes to existing functionality
- [ ] All existing tests continue passing
- [ ] Build system continues working correctly
- [ ] No performance degradation in exercise loading

### UX Success
- [ ] Default catalog loads immediately
- [ ] Catalog switching feels smooth and responsive
- [ ] Search/filter work intuitively within catalog scope
- [ ] Premium catalog preview drives upgrade interest

### Content Success
- [ ] All new exercises properly localized
- [ ] Video system works with new catalogs
- [ ] Exercise quality meets RepCue standards

## Timeline Summary

- **Week 1**: Core types, data structure, service layer
- **Week 2**: UI components, catalog selection, exercise filtering
- **Week 3**: New content creation, full localization
- **Week 4**: Testing, polish, deployment preparation

## Post-Implementation

### Maintenance
- Update `docs/exercise-catalog.md` with multi-catalog workflow
- Create catalog-specific exercise addition guidelines
- Document premium catalog management procedures

### Future Enhancements
- Dynamic catalog loading from server
- User-created catalogs
- Catalog-specific theming
- Cross-catalog search and favorites