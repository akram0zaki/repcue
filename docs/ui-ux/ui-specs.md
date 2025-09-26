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
  - Primary Text: Near White (#F8F9FA)
  - Secondary Text: Medium Gray (#A0A4A8)
  - Disabled Text: #6C757D
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

### Typography

-   **Font Family**:
    -   **Latin text**: Inter, Roboto, or Open Sans (clean sans-serif).\
    -   **Arabic text**: Cairo, Noto Sans Arabic, or Tajawal (Google
        Fonts, modern and legible).\
-   **Heading Sizes**:
    -   H1: 28--32px, Bold
    -   H2: 22--24px, Semi-bold
    -   H3: 18--20px, Semi-bold
-   **Body Text**: 16px Regular, Line height 1.5
-   **Captions/Tags**: 12--14px, Medium
-   **RTL Support**: Ensure UI auto-flips for Arabic (right-to-left),
    with text alignment mirrored.

### Iconography

-   Style: Simple line icons with filled accent states
-   Minimum size: 24x24px (tap-friendly)
-   Consistent stroke width

------------------------------------------------------------------------

## 2. Layout & Spacing

-   **Grid System**: 8pt spacing system for margins, paddings, and gaps
-   **Card Design**: Rounded corners (8px), subtle shadow for elevation
-   **Buttons**:
    -   Primary: Filled with accent color, white text
    -   Secondary: Outline style with accent border
    -   Disabled: Light gray background, dark gray text at 40% opacity

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
