# CategoryFilter Component

A reusable React component for filtering content by exercise categories. Supports both dropdown and badge display styles.

## Features

- **Two display styles**: `dropdown` (modal-based) and `badges` (inline buttons)
- **Multi-select support**: Allow selecting multiple categories or single selection mode
- **Responsive design**: Works well on mobile and desktop
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Internationalization**: Fully localized with react-i18next
- **Style-guide compliant**: Uses category-specific colors per design system

## Usage

### Dropdown Style (Exercise Page)

```tsx
import CategoryFilter from '../components/CategoryFilter';

const ExercisePage = () => {
  const [selectedCategories, setSelectedCategories] = useState<Set<ExerciseCategory>>(new Set());

  const handleCategoryToggle = (category: ExerciseCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  return (
    <CategoryFilter
      selectedCategories={selectedCategories}
      onCategoryToggle={handleCategoryToggle}
      onClearAll={handleClearCategories}
      style="dropdown"
      label="Category"
    />
  );
};
```

### Badges Style (Activity Log Page)

```tsx
import CategoryFilter from '../components/CategoryFilter';

const ActivityLogPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<Set<ExerciseCategory>>(new Set());

  // ... handlers same as above

  return (
    <CategoryFilter
      selectedCategories={selectedCategories}
      onCategoryToggle={handleCategoryToggle}
      onClearAll={handleClearCategories}
      style="badges"
      size="md"
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedCategories` | `Set<ExerciseCategory>` | - | Currently selected categories |
| `onCategoryToggle` | `(category: ExerciseCategory) => void` | - | Callback when a category is toggled |
| `onClearAll` | `() => void` | - | Callback when all categories are cleared |
| `style` | `'dropdown' \| 'badges'` | `'dropdown'` | Display style of the component |
| `label` | `string` | - | Label text (used in dropdown mode only) |
| `size` | `'sm' \| 'md'` | `'md'` | Size variant for badges |
| `allowMultiple` | `boolean` | `true` | Allow multiple category selections |

## Category Colors

The component follows the established color scheme:

- **Core**: Blue (`bg-blue-500`)
- **Strength**: Red (`bg-red-500`)
- **Cardio**: Green (`bg-green-500`)
- **Flexibility**: Purple (`bg-purple-500`)
- **Balance**: Yellow (`bg-yellow-500`)

## Migration from CategorySelector

This component replaces the old `CategorySelector` component. Key changes:

1. **Combined functionality**: Both dropdown and badge styles in one component
2. **Simplified API**: No separate overlay state management needed
3. **Better performance**: Internal state management for modal open/close
4. **Enhanced accessibility**: Better keyboard navigation and screen reader support

## Testing

The component includes comprehensive tests covering:

- Both dropdown and badge styles
- Category selection and deselection
- Clear all functionality
- Proper text rendering with i18n
- Accessibility features

Run tests with: `pnpm test CategoryFilter`