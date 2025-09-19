# Unified Exercise Details Display Implementation Plan

**Status**: Documented (Not Implemented)
**Created**: 2025-09-19
**Priority**: Nice to Have

## Overview

This plan outlines how to unify the exercise details display across all contexts in the RepCue application by extending the shared `ExerciseDetailContent` component to support the standalone shared exercise page (`StandaloneSharedExercise.tsx`).

## Current State

As of 2025-09-19, we have successfully created a shared `ExerciseDetailContent` component that is used by:
- ✅ `ExerciseDetailPage.tsx` (authenticated full-page view)
- ✅ `ExerciseDetailModal.tsx` (authenticated modal view)

The `StandaloneSharedExercise.tsx` component remains separate due to its unique requirements and constraints.

## Goals

1. **Code Reuse**: Share ~80% of exercise display logic across all contexts
2. **Consistency**: Ensure identical styling and structure across authenticated and standalone views
3. **Maintainability**: Single source of truth for exercise rendering reduces maintenance overhead
4. **Preserve Constraints**: Maintain all existing standalone conditions (no app init, no localStorage, no consent)

## Technical Analysis

### Current Standalone Constraints (Must Preserve)

1. **No App Initialization**: Standalone page runs outside application context to avoid triggering consent flows
2. **No Local Storage**: Cannot write to localStorage without user consent
3. **No Authentication**: Operates in unauthenticated context
4. **Unique Actions**: "Save to My Library" redirects to main app instead of in-app functionality

### Key Differences Between Contexts

| Feature | Authenticated Views | Standalone View |
|---------|-------------------|-----------------|
| Favorites Button | ✅ Available | ❌ Not available (no auth) |
| Edit Button | ✅ If owner | ❌ Not available (no auth) |
| Start Timer Button | ✅ Navigate to timer | ❌ Not available (no app context) |
| Ratings System | ✅ Full rating UI | ❌ Not available (no storage) |
| Suggested Combinations | ➡️ Internal navigation | 🔗 External links to main app |
| Share Badge | ❌ Not shown | ✅ "Shared by" badge |
| Save Action | ❌ Not needed | ✅ "Save to My Library" |
| Video Recovery Notice | ❌ Not needed | ✅ Video preparation status |
| Debug Play Button | ❌ Not needed | ✅ Video debugging |

## Implementation Plan

### Phase 1: Enhance ExerciseDetailContent Interface

**Estimated Time**: 2-3 hours

#### 1.1 Extend Component Interface

```typescript
interface ExerciseDetailContentProps {
  // Existing props
  exercise: Exercise;
  isFavorite?: boolean;
  isOwner?: boolean;
  onToggleFavorite?: () => void;
  onRatingChange?: (newRating: number, newCount: number) => void;
  onStartTimer?: () => void;
  onEdit?: () => void;
  onNavigateToExercise?: (exerciseId: string) => void;
  showActions?: boolean;
  className?: string;

  // New props for standalone mode
  isStandalone?: boolean;
  shareInfo?: ShareInfo;
  standaloneHeader?: React.ReactNode;
  standaloneActions?: React.ReactNode;
  onExternalNavigate?: (url: string) => void;
  showVideoRecoveryNotice?: boolean;
}
```

#### 1.2 Add ShareInfo Type Support

```typescript
interface ShareInfo {
  sharedBy: string;
  sharedAt: string;
  isPublic: boolean;
  permissionLevel: string;
  expiresAt?: string;
  videoRecoveryTriggered?: boolean;
}
```

### Phase 2: Implement Conditional Rendering Logic

**Estimated Time**: 4-5 hours

#### 2.1 Header Section Modifications

- **Standalone Mode**: Show custom header with "Shared by" badge
- **Authenticated Mode**: Show existing title with action buttons

#### 2.2 Action Buttons Section

```typescript
// Conditional action rendering
{showActions && !isStandalone && (
  // Existing action buttons (favorites, edit, start timer)
)}

{standaloneActions && (
  // Custom standalone actions (save to library, browse exercises)
)}
```

#### 2.3 Navigation Behavior for Suggested Combinations

```typescript
const handleSuggestedCombinationClick = (exerciseId: string) => {
  if (isStandalone && onExternalNavigate) {
    // Open in main app
    onExternalNavigate(`${window.location.origin}/exercises/${exerciseId}`);
  } else if (onNavigateToExercise) {
    // Internal navigation
    onNavigateToExercise(exerciseId);
  } else {
    // Default navigation
    navigate(`${AppRoutes.EXERCISES}/${exerciseId}`);
  }
};
```

#### 2.4 Feature Exclusions for Standalone

- Hide ratings system when `isStandalone=true`
- Hide favorites functionality
- Hide edit capabilities
- Hide start timer button

### Phase 3: Create Standalone Action Components

**Estimated Time**: 2-3 hours

#### 3.1 Shared Badge Component

```typescript
const SharedByBadge: React.FC<{ shareInfo: ShareInfo }> = ({ shareInfo }) => (
  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
    <ShareIcon className="w-4 h-4 mr-1" />
    {t('exercises.sharedBy', { name: shareInfo.sharedBy })}
  </span>
);
```

#### 3.2 Video Recovery Notification Component

```typescript
const VideoRecoveryNotice: React.FC = () => (
  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
    <div className="flex items-center gap-2">
      <WarningIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      <div className="text-sm text-yellow-800 dark:text-yellow-200">
        {t('exercises.videoRecovering')}
      </div>
    </div>
  </div>
);
```

#### 3.3 Standalone Action Buttons

```typescript
const StandaloneActions: React.FC<{
  onSaveToLibrary: () => void;
  onBrowseExercises: () => void;
}> = ({ onSaveToLibrary, onBrowseExercises }) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <button
      onClick={onSaveToLibrary}
      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
    >
      <HeartIcon className="w-5 h-5 mr-2" />
      {t('exercises.saveToLibrary')}
    </button>
    <button
      onClick={onBrowseExercises}
      className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
    >
      {t('common.browseExercises')}
    </button>
  </div>
);
```

### Phase 4: Refactor StandaloneSharedExercise

**Estimated Time**: 3-4 hours

#### 4.1 Replace Existing Exercise Display

Remove the large exercise display section and replace with:

```typescript
<ExerciseDetailContent
  exercise={exercise}
  isStandalone={true}
  shareInfo={shareInfo}
  standaloneHeader={
    <SharedByBadge shareInfo={shareInfo} />
  }
  standaloneActions={
    <StandaloneActions
      onSaveToLibrary={handleSaveExercise}
      onBrowseExercises={goToMainApp}
    />
  }
  onExternalNavigate={(url) => window.open(url, '_blank')}
  showVideoRecoveryNotice={shareInfo?.videoRecoveryTriggered}
  showActions={false}
  className="p-6"
/>
```

#### 4.2 Preserve Standalone-Specific Features

- Video modal functionality
- Snackbar context
- Share token extraction
- Error handling

### Phase 5: Testing and Validation

**Estimated Time**: 2-3 hours

#### 5.1 Unit Tests

- Test ExerciseDetailContent with `isStandalone=true`
- Test conditional rendering of all features
- Test external navigation for suggested combinations
- Verify no localStorage access in standalone mode

#### 5.2 Integration Tests

- Test standalone page functionality
- Verify authenticated pages remain unchanged
- Test suggested combination navigation in both modes
- Validate share badge display

#### 5.3 Manual Testing

- Test shared exercise links
- Verify "Save to My Library" functionality
- Test video recovery notifications
- Validate responsive design across contexts

## Implementation Considerations

### Bundle Size Impact

- **Risk**: Standalone bundle might include unused authentication code
- **Mitigation**: Use dynamic imports and code splitting for auth-specific features

### Complexity Management

- **Risk**: Added conditional logic increases component complexity
- **Mitigation**: Extract standalone-specific logic to separate hooks/utilities

### Backward Compatibility

- **Risk**: Changes might break existing authenticated views
- **Mitigation**: Extensive testing and gradual rollout

## Alternative Approaches Considered

### Option 1: Separate Standalone Component (Current State)
- **Pros**: Simple, isolated, no risk to existing functionality
- **Cons**: Code duplication, maintenance overhead

### Option 2: Shared Base Component with Specialized Wrappers
- **Pros**: Reduced complexity in main component
- **Cons**: Still requires significant refactoring

### Option 3: Full Unification (This Plan)
- **Pros**: Maximum code reuse, single source of truth
- **Cons**: Increased complexity, testing overhead

## Success Metrics

1. **Code Reduction**: Eliminate ~300 lines of duplicated display logic
2. **Consistency**: Identical styling and behavior across all contexts
3. **Performance**: No regression in bundle size or load times
4. **Functionality**: All existing features work unchanged
5. **Maintainability**: Single component to update for display changes

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Bundle size increase | Medium | Low | Dynamic imports, code splitting |
| Authentication leaks | Low | High | Strict prop validation, testing |
| Regression in existing features | Low | High | Comprehensive testing |
| Increased complexity | High | Medium | Extract utilities, good documentation |

## Timeline

**Total Estimated Time**: 13-18 hours

1. **Phase 1**: 2-3 hours
2. **Phase 2**: 4-5 hours
3. **Phase 3**: 2-3 hours
4. **Phase 4**: 3-4 hours
5. **Phase 5**: 2-3 hours

## Decision Factors

**Implement if**:
- Exercise display logic changes frequently
- Consistency across contexts is high priority
- Team has bandwidth for testing and maintenance

**Skip if**:
- Current standalone implementation is stable
- Limited development resources
- Risk tolerance for auth-related bugs is low

## Conclusion

This implementation would provide excellent code reuse and consistency benefits while preserving all existing constraints. However, given the complexity and current stability of the standalone component, this should be considered a **nice-to-have enhancement** rather than a critical requirement.

The plan provides a clear roadmap if the decision is made to implement this unification in the future.