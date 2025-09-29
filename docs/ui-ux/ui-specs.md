# RepCue App -- Full UI/UX Design Specification

## 1. Visual Identity

### Color Palette - Light Mode

- **Primary Accent**: Teal / Blue (#0096C7)
  - Hover: #0077A5
  - Focus: #005F84
  - Disabled: #B3E0EF
- **Secondary Accent**: Light Blue (#90E0EF)
  - Hover: #74D0E4
  - Focus: #5BBACD
  - Disabled: #D6F4F9
- **Background**:
  - Main: White (#FFFFFF)
  - Secondary: Light Gray (#F8F9FA)
- **Text Colors**:
  - Primary Text: Dark Gray (#212529)
  - Secondary Text: Medium Gray (#6C757D)
  - Disabled Text: #ADB5BD
- **Neutral Buttons**:
  - Default: #E9ECEF
  - Hover: #DEE2E6
  - Pressed: #CED4DA
  - Disabled: #F1F3F5
- **Success/Positive**: Green (#52B788)
  - Hover: #3D936B
  - Focus: #2F7353
- **Error/Negative**: Red (#E63946)
  - Hover: #CC2E3B
  - Focus: #A92632

---

### Color Palette - Dark Mode

- **Primary Accent**: Teal / Blue (#0096C7)
  - Hover: #33ADD3
  - Focus: #5CC2DE
  - Disabled: #1F3B47
- **Secondary Accent**: Muted Light Blue (#64B5C9)
  - Hover: #7CC9DA
  - Focus: #95D9E8
  - Disabled: #2B4C55
- **Background**:
  - Main: Near Black (#121212)
  - Secondary: Dark Gray (#1E1E1E)
- **Text Colors**:
  - **Primary Text**: Near White (#F8F9FA / #f9fafb) - Use `text-text-900 dark:text-text-50` or `text-gray-900 dark:text-gray-100`
  - **Secondary Text/Labels**: Light Gray (#d1d5db) - Use `text-text-800 dark:text-text-100` or `text-gray-800 dark:text-gray-100`
  - **Description/Help Text**: Medium Gray (#9ca3af) - Use `text-text-500 dark:text-text-400` or `text-gray-500 dark:text-gray-400`
  - **Disabled Text**: #6C757D - Use `text-text-400 dark:text-text-600`
- **Neutral Buttons**:
  - Default: #2C2C2C
  - Hover: #3A3A3A
  - Pressed: #4A4A4A
  - Disabled: #1E1E1E
- **Success/Positive**: Green (#52B788)
  - Hover: #6FC99A
  - Focus: #8AD7AD
- **Error/Negative**: Bright Red (#FF5C66)
  - Hover: #FF737A
  - Focus: #FF8A91

### Dark Mode Text Color Hierarchy

**CRITICAL**: Ensure proper contrast and readability in dark mode:

1. **Headings/Titles**: `text-text-900 dark:text-text-50` (bright white)
2. **Primary Labels/Form Labels**: `text-text-800 dark:text-text-100` (very light gray)
3. **Body Text**: `text-text-700 dark:text-text-200` (light gray)
4. **Secondary/Muted Text**: `text-text-600 dark:text-text-300` (medium gray)
5. **Help/Description Text**: `text-text-500 dark:text-text-400` (readable gray)
6. **Disabled Text**: `text-text-400 dark:text-text-600` (dim gray)

**⚠️ AVOID**: `text-text-700 dark:text-text-300` for labels - too faint and low contrast in dark mode.

### Badge and Tag Styling for Dark Mode

**CRITICAL**: Badges and tags require special attention in dark mode to ensure text visibility:

**Recommended Pattern**:
- Light Mode: `bg-gray-100 text-gray-800`
- Dark Mode: `dark:bg-gray-200 dark:text-gray-900`

**Examples**:
```css
/* Category/Tags badges */
bg-gray-100 dark:bg-gray-200 text-gray-800 dark:text-gray-900

/* Difficulty badges */
bg-green-100 dark:bg-green-200 text-green-800 dark:text-green-900
bg-yellow-100 dark:bg-yellow-200 text-yellow-800 dark:text-yellow-900
bg-red-100 dark:bg-red-200 text-red-800 dark:text-red-900

/* Status badges */
bg-primary-100 dark:bg-primary-200 text-primary-800 dark:text-primary-900
```

**⚠️ AVOID**: Semi-transparent backgrounds like `dark:bg-gray-700` or `dark:bg-green-900/30` as they often result in poor contrast with text colors.

### Standard CSS Classes for Text

To ensure consistency, use these predefined CSS classes instead of inline Tailwind classes:

#### Semantic Typography Classes (Primary)
```css
.text-h1             /* Main page titles (32px, bold) */
.text-h2             /* Section headers (24px, semi-bold) */
.text-h3             /* Card titles, subsection headers (20px, semi-bold) */
.text-body           /* Body text, descriptions (16px, regular) */
.text-caption        /* Labels, button text (14px, medium) */
.text-small          /* Helper text, badges (12px, medium) */
```

#### Utility Text Classes (Secondary)
```css
.heading-text        /* Section headers, page titles */
.label-text          /* Form labels, toggle labels */
.filter-button-text  /* Category filters, type filters */
.sort-label-text     /* Sort labels, control labels */
.duration-button-text /* Timer duration buttons */
.secondary-label-text /* Subtitles, counts */
.summary-text        /* Results count, status text */
.help-text           /* Helper text, descriptions */
```

**Benefits**: 
- **Semantic First**: Use `.text-h1` through `.text-small` for consistent typography hierarchy
- **Automatic Dark Mode**: All classes include proper dark mode color variants
- **Centralized Control**: Single point of control in `src/styles/tokens.css`
- **Consistent Styling**: Prevents arbitrary font sizes and ensures accessibility

### Typography

-   **Font Family**:
    -   **Latin text**: Inter, Roboto, or Open Sans (clean sans-serif)
    -   **Arabic text**: Cairo, Noto Sans Arabic, or Tajawal (Google Fonts, modern and legible)
-   **Semantic Typography Scale** (implemented in `src/styles/tokens.css`):
    -   **H1**: 32px, Bold (`.text-h1`) - Main page titles
    -   **H2**: 24px, Semi-bold (`.text-h2`) - Section headers, large elements  
    -   **H3**: 20px, Semi-bold (`.text-h3`) - Card titles, subsection headers
    -   **Body**: 16px, Regular (`.text-body`) - Body text, descriptions
    -   **Caption**: 14px, Medium (`.text-caption`) - Labels, button text
    -   **Small**: 12px, Medium (`.text-small`) - Helper text, badges

**Implementation**: 
- Use semantic classes instead of arbitrary Tailwind sizes
- All classes automatically adapt to light/dark modes
- Consistent line heights optimized for readability

### RTL (Right-to-Left) Language Support

**Languages**: Arabic (ar), Arabic Egyptian (ar-EG)

#### Typography for RTL Languages
-   **Font Stack**: Cairo, Tajawal, Noto Sans Arabic (loaded via Google Fonts)
-   **Line Height**: Increased to 1.6 for better Arabic text readability
-   **Font Selection**: Automatically applied via `[lang="ar"]` and `[lang="ar-EG"]` selectors
-   **Text Direction**: Handled automatically via `document.dir` and `document.documentElement.lang`

#### Layout Principles for RTL
1. **Automatic Flipping**: UI automatically mirrors for RTL languages
2. **Logical Properties**: Use CSS logical properties (`gap`, `padding-inline`) over directional ones
3. **Content Flow**: Information flows from right-to-left in Arabic layouts
4. **Icon Mirroring**: Directional icons (arrows, chevrons) should mirror horizontally

#### Icon Rendering in RTL Mode

**Critical Pattern**: Navigation and interactive icons must be protected from RTL interference to ensure proper rendering.

**Navigation Icons (More menu, scroll buttons)**:
```tsx
// ✅ CORRECT: Force LTR direction for navigation icons
<button 
  className="nav-more-button ..." 
  style={{ direction: 'ltr' }}
>
  <MoreIcon size={20} />
</button>

// ✅ CORRECT: CSS protection for navigation buttons
.nav-more-button,
.catalog-selector button[aria-label*="Scroll"] {
  direction: ltr !important;
  transform: none !important;
}
```

**Icon Components Design**:
- **Filled vs Stroke**: Use filled icons (`fill="currentColor"`) for better RTL visibility
- **Size Standards**: Minimum 20px for navigation icons, 44px touch targets
- **Contrast**: Ensure sufficient contrast in both light and dark themes

**CSS Protection Patterns**:
```css
/* Exclude navigation from global RTL button rules */
body.rtl button:not(.nav-more-button):not([aria-label*="Scroll"]) {
  /* RTL-specific button styles */
}

/* Force LTR for navigation SVGs */
body.rtl .nav-more-button svg,
body.rtl .catalog-selector button svg {
  direction: ltr !important;
  transform: none !important;
}
```

**Icon Component Standards**:
- Use centralized icon components from `NavigationIcons.tsx`
- Prefer component-based icons over inline SVG for consistency
- Set explicit `size` prop rather than CSS sizing
- Include `aria-hidden="true"` for decorative icons

#### Responsive RTL Patterns

**Information Cards** (like Upcoming Workout section):
```tsx
<div className="flex flex-col sm:flex-row sm:items-center gap-4">
  <div className="text-center sm:text-start-rtl">
    <h2 className="text-h3">{title}</h2>
    <p className="text-body">{description}</p>
  </div>
</div>
```

**Key Classes for RTL**:
- `.text-start-rtl` → `text-left rtl:text-right` (responsive text alignment)
- `.text-end-rtl` → `text-right rtl:text-left`
- Use `gap-4` instead of `space-x-4` for better RTL support
- Use `flex-col sm:flex-row` for responsive stacking

#### Typography Classes for Consistency

**Implemented Semantic Typography Scale** (defined in `src/styles/tokens.css`):
- `.text-h1` → 32px, bold, primary text color (main page titles)
- `.text-h2` → 24px, semi-bold, primary text color (section headers)
- `.text-h3` → 20px, semi-bold, primary text color (card titles, subsection headers)
- `.text-body` → 16px, regular, secondary text color (body text, descriptions)
- `.text-caption` → 14px, medium, tertiary text color (labels, button text)
- `.text-small` → 12px, medium, tertiary text color (helper text, badges)

**Usage Examples**:
```tsx
<h1 className="text-h1">Page Title</h1>
<h2 className="text-h2">Section Header</h2>
<h3 className="text-h3">Card Title</h3>
<p className="text-body">Body content goes here</p>
<span className="text-caption">Form label</span>
<small className="text-small">Helper text</small>
```

**Benefits**:
- **Automatic Dark Mode**: All classes include proper color variants
- **Semantic Color System**: Uses CSS custom properties for consistent theming
- **Accessibility**: Proper contrast ratios in both light and dark modes
- **Maintainable**: Single source of truth in tokens.css

#### Implementation Best Practices

1. **Mobile-First RTL**: Always test RTL on mobile viewports first
2. **Content Stacking**: Use vertical layouts on mobile to avoid cramping
3. **Touch Targets**: Maintain 44px minimum touch targets in both directions
4. **Spacing**: Use generous padding and margins for Arabic text readability
5. **Testing**: Verify all interactive elements work in both LTR and RTL modes
6. **Icon Testing**: Test all navigation icons in Arabic mode to ensure visibility

#### RTL Testing Checklist

**Icon Rendering Verification**:
- [ ] Navigation More button (three dots) visible in Arabic
- [ ] Catalog selector arrows (left/right) render properly
- [ ] All SVG icons maintain proper contrast and sizing
- [ ] Touch targets remain accessible (minimum 44px)
- [ ] Icons don't get distorted by RTL transforms

**Layout Testing**:
- [ ] Text flows naturally right-to-left
- [ ] Interactive elements maintain proper spacing
- [ ] No overlap or cramped layouts in Arabic
- [ ] Responsive breakpoints work in RTL mode

**Functional Testing**:
- [ ] All buttons and links work in RTL mode
- [ ] Form inputs align correctly
- [ ] Dropdown menus appear in correct position
- [ ] Modal dialogs center properly

#### Arabic-Specific Design Considerations

- **Increased Spacing**: Arabic text needs more vertical spacing than Latin text
- **Longer Text**: Arabic translations are often 20-30% longer than English
- **Cursive Script**: Avoid letter-spacing as it breaks Arabic cursive connections
- **Reading Flow**: Content should flow naturally from right to left

### Iconography

-   Style: Simple line icons with filled accent states
-   Minimum size: 24x24px (tap-friendly)
-   Consistent stroke width

------------------------------------------------------------------------

## 2. Layout & Spacing

### 8pt Grid System
-   **Base Unit**: 8px
-   **Spacing Scale**: 4px (0.5), 8px (1), 16px (2), 24px (3), 32px (4), 40px (5), 48px (6), 64px (8)
-   **Component Spacing**: All margins, paddings, and gaps should follow this scale

### Card Design Patterns
-   **Default Cards**: `rounded-lg` (8px), `p-4` (32px padding), subtle shadow
-   **Elevated Cards**: `rounded-xl` (12px), `p-5` or `p-6` (40px-48px padding), stronger shadow
-   **Compact Cards**: `rounded-md` (6px), `p-3` (24px padding), minimal shadow

### Responsive Layout Patterns

#### Information Cards (like Upcoming Workout)
```tsx
<div className="bg-surface-0 dark:bg-surface-900 rounded-lg p-5 border border-surface-200 dark:border-surface-700 shadow-sm">
  <h2 className="text-h3 font-semibold text-text-900 dark:text-text-50 mb-4">
    {title}
  </h2>
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    {/* Content with proper RTL support */}
  </div>
</div>
```

#### Touch-Friendly Interactive Elements
-   **Minimum Size**: 44px × 44px (use `.touch-target` utility)
-   **Button Padding**: `px-6 py-3` minimum for primary actions
-   **Spacing Between**: At least 8px gap between interactive elements

### RTL Layout Considerations
-   **Responsive Stacking**: Use `flex-col sm:flex-row` for cards that need to stack on mobile
-   **Content Alignment**: `text-center sm:text-left rtl:sm:text-right` for responsive text alignment
-   **Gap Spacing**: Use `gap-4` instead of `space-x-4` for better RTL support

### Centralized Button System

**CRITICAL**: Use centralized button classes from `src/styles/tokens.css` for consistency.

-   **Primary Buttons** (`.btn-primary`):
    -   Filled with accent color, white text
    -   8px rounded corners, consistent padding (0.5rem 1rem)
    -   Smooth transitions, proper focus states
    -   Usage: `<button className="btn-primary">Start</button>`

-   **Secondary Buttons** (`.btn-secondary`):
    -   Outline style with accent border
    -   Transparent background, primary color text
    -   Hover: filled with primary color
    -   Usage: `<button className="btn-secondary">Cancel</button>`

-   **Neutral Buttons** (`.btn-neutral`):
    -   Light gray background, dark text
    -   For utility actions that don't need emphasis
    -   Usage: `<button className="btn-neutral">Filter</button>`

-   **Danger Buttons** (`.btn-danger`):
    -   Red background, white text
    -   For destructive actions (delete, remove, etc.)
    -   Usage: `<button className="btn-danger">Delete</button>`

-   **Disabled State**: All buttons include proper disabled styling with reduced opacity and not-allowed cursor

**Benefits**: Single point of control for button styling, automatic UI spec compliance, reduced CSS duplication

------------------------------------------------------------------------

## 3. Navigation

### Bottom Navigation Bar (5 Buttons) - SVG Icons

-   Icons for:
    -   **Home** -- Dashboard, featured workouts, recommendations
    -   **Exercises** -- Exercise library with filters
    -   **Timer** -- Exercise timer
    -   **Workouts** -- Session builder
    -   **Progress** -- Exercise and Workout history, streaks,
        achievements
        **More (vertical three dots)** -- to open an extended menu
    -   **Settings** -- User profile, preferences, onboarding edits, app settings
-   Active icon: Highlighted in accent color + label
-   Inactive: Gray

### Top Navigation

-   Search bar with placeholder text
-   Filter icon on exercises page

------------------------------------------------------------------------
