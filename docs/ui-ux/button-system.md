# Centralized Button System

## Overview

RepCue now uses a centralized button system in `src/styles/tokens.css` to ensure consistent styling across the entire application, as specified in `ui-specs.md`.

## Available Button Classes

### Primary Button (`.btn-primary`)
- **Usage**: Main call-to-action buttons
- **Styling**: Filled with primary color, white text, 8px rounded corners
- **Example**: "Start", "Save", "Create" buttons

```html
<button className="btn-primary">Start Timer</button>
```

### Secondary Button (`.btn-secondary`)
- **Usage**: Secondary actions, outline style
- **Styling**: Transparent background, primary color border and text, 8px rounded corners
- **Example**: "Cancel", "Learn More" buttons

```html
<button className="btn-secondary">Cancel</button>
```

### Neutral Button (`.btn-neutral`)
- **Usage**: Neutral actions that don't need emphasis
- **Styling**: Light gray background, dark text, 8px rounded corners
- **Example**: Filter buttons, utility actions

```html
<button className="btn-neutral">Filter</button>
```

## Centralized Features

All button classes include:
- ✅ **8px border-radius** (per UI specs)
- ✅ **Consistent padding** (0.5rem 1rem)
- ✅ **Smooth transitions** (0.2s ease-in-out)
- ✅ **Proper focus states** with accessible focus rings
- ✅ **Disabled states** with appropriate cursor and opacity
- ✅ **Flex alignment** for icons and text
- ✅ **Font weight** (500 - medium)

## Migration Status

### ✅ Completed
- `HomePage.tsx` - Updated to use centralized `btn-primary`
- `ChangelogModal.tsx` - Removed redundant `rounded-lg`
- `UpdateNotificationBanner.tsx` - Removed redundant `rounded-lg`

### 🔄 To Be Migrated
The following files contain manual button styling that should be migrated to centralized classes:

1. **CategorySelector.tsx** (line 82)
2. **CreateWorkoutPage.tsx** (line 434)
3. **ExercisePage.tsx** (lines 457, 799, 1056)
4. **MagicLinkForm.tsx** (line 71)
5. **WorkoutsPage.tsx** (lines 198, 219)
6. **ExerciseForm.tsx** (line 936)
7. **ExerciseDetailPage.tsx** (line 251)
8. **ExerciseDetailContent.tsx** (line 174)

## Migration Guidelines

### Replace Manual Primary Button Styling
**Before:**
```html
<button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors">
  Action
</button>
```

**After:**
```html
<button className="btn-primary px-4 py-2">
  Action
</button>
```

### Replace Manual Secondary Button Styling
**Before:**
```html
<button className="border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white px-4 py-2 rounded-lg transition-colors">
  Action
</button>
```

**After:**
```html
<button className="btn-secondary px-4 py-2">
  Action
</button>
```

## Benefits of Centralization

1. **Consistency**: All buttons follow UI specs automatically
2. **Maintainability**: Change button styling in one place
3. **Accessibility**: Built-in focus states and proper contrast
4. **Performance**: Reduced CSS bundle size
5. **Developer Experience**: Less repetitive styling code

## Size Variations

When you need different button sizes, you can still use utility classes for padding while keeping the core styling centralized:

```html
<!-- Small button -->
<button className="btn-primary px-3 py-1 text-sm">Small</button>

<!-- Large button -->
<button className="btn-primary px-6 py-3 text-lg">Large</button>
```

## Future Enhancements

Consider adding these additional centralized button variants:
- `.btn-success` - For positive actions (save, complete)
- `.btn-danger` - For destructive actions (delete, remove)
- `.btn-ghost` - For minimal prominence actions
- `.btn-icon` - For icon-only buttons

## Testing

After migration, test:
1. Button appearance in light and dark modes
2. Hover and focus states
3. Disabled states
4. Touch targets on mobile devices
5. Accessibility with screen readers