# Dark Mode Text Color Standards

## Quick Reference Guide

Use this hierarchy to ensure consistent and readable text colors across the RepCue application in dark mode.

### Text Color Hierarchy (Dark Mode)

| Element Type | CSS Class | Tailwind Classes | Use For |
|--------------|-----------|------------------|---------|
| **Headings/Titles** | `.heading-text` | `text-gray-900 dark:text-gray-50` | Section headers, page titles, modal titles |
| **Primary Labels** | `.label-text` | `text-gray-800 dark:text-gray-100` | Form labels, toggle labels, primary button text |
| **Filter Button Text** | `.filter-button-text` | `text-gray-700 dark:text-gray-200` | Category filters, type filters, inactive buttons |
| **Sort/Control Labels** | `.sort-label-text` | `text-gray-700 dark:text-gray-200` | Sort labels, control labels |
| **Duration Buttons** | `.duration-button-text` | `text-gray-700 dark:text-gray-200` | Timer duration buttons, inactive states |
| **Secondary Labels** | `.secondary-label-text` | `text-gray-600 dark:text-gray-300` | Subtitles, counts, secondary information |
| **Summary Text** | `.summary-text` | `text-gray-600 dark:text-gray-300` | Results count, status text |
| **Help/Description** | `.help-text` | `text-gray-500 dark:text-gray-400` | Helper text, small descriptions, tooltips |
| **Disabled Text** | N/A | `text-gray-400 dark:text-gray-600` | Disabled buttons, inactive elements |

### ✅ Good Examples

```jsx
// Section Header
<h2 className="text-lg font-semibold heading-text">
  Appearance Settings
</h2>

// Form Label (Primary)
<label className="label-text">
  Dark Mode
</label>

// Filter Button (Category/Type filters)
<button className="px-3 py-2 filter-button-text">
  Core
</button>

// Sort Label
<label className="sort-label-text">
  Sort by:
</label>

// Summary/Results Text
<p className="summary-text">
  Showing 26 of 26 exercises
</p>

// Duration Button Text
<button className="duration-button-text">
  30s
</button>

// Help Text
<p className="help-text mt-2">
  Choose your preferred theme for the application.
</p>

// Dropdown/Select
<select className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
  <option>English</option>
</select>
```

### ❌ Avoid These Patterns

```jsx
// TOO FAINT - Don't use text-text-300 for labels in dark mode
<label className="text-text-700 dark:text-text-300">
  Setting Label
</label>

// INCONSISTENT - Mixing gray-X with text-X classes
<label className="text-gray-700 dark:text-text-300">
  Mixed Classes
</label>
```

## Implementation Guidelines

### 1. Form Labels and Control Labels
- **Always use**: `text-text-800 dark:text-text-100`
- **Examples**: Toggle switches, radio buttons, checkboxes, input labels

### 2. Section Headers
- **Always use**: `text-text-900 dark:text-text-50`
- **Examples**: "Audio Settings", "Appearance", "Data"

### 3. Helper/Description Text
- **Always use**: `text-text-500 dark:text-text-400`
- **Examples**: Explanatory text under settings, form help text

### 4. Interactive Elements (Selects, Inputs)
- **Use**: `text-gray-900 dark:text-gray-100`
- **Background**: `bg-white dark:bg-gray-800`
- **Borders**: `border-gray-300 dark:border-gray-600`

## Testing Your Implementation

### Visual Contrast Test
1. Toggle to dark mode
2. Ensure all text is easily readable
3. Labels should be bright enough to read comfortably
4. Help text should be visible but appropriately secondary

### Accessibility Check
- Primary labels should have high contrast (≥4.5:1)
- Help text should have adequate contrast (≥3:1)
- Test with different screen brightness levels

## Migration Strategy

When updating existing components:

1. **Identify the text element type** (header, label, help text, etc.)
2. **Apply the appropriate class** from the hierarchy above
3. **Test in both light and dark modes**
4. **Verify readability and contrast**

## Common Patterns by Component Type

### Settings Toggles
```jsx
<div className="flex items-center justify-between mb-4">
  <label className="text-text-800 dark:text-text-100 font-medium">
    {labelText}
  </label>
  <button className="...toggle classes...">
    {/* toggle switch */}
  </button>
</div>
<p className="text-xs text-text-500 dark:text-text-400 mt-2">
  {helpText}
</p>
```

### Form Sections
```jsx
<div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-4 mb-4">
  <h2 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-3">
    {sectionTitle}
  </h2>
  {/* section content */}
</div>
```

### Dropdowns/Selects
```jsx
<select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  <option value="option1">Option 1</option>
</select>
```

---

**Remember**: Consistency is key. Always follow this hierarchy to ensure a cohesive user experience across the entire application.