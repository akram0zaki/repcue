# RepCue Styling Infrastructure Analysis

## Quick Summary

RepCue implements styling through:
1. **Semantic CSS Variables** in `src/styles/tokens.css`
2. **Tailwind CSS** with custom color extensions
3. **Dark Mode via `.dark` class** on document root
4. **AppSettings.dark_mode boolean** toggle in state

## Key Files

- `apps/frontend/src/styles/tokens.css` - CSS variables (541 lines)
- `apps/frontend/src/index.css` - Global styles (561 lines)  
- `apps/frontend/tailwind.config.js` - Tailwind extensions
- `apps/frontend/src/hooks/useDarkMode.ts` - Dark mode logic
- `apps/frontend/src/App.tsx` - Theme application to DOM
- `apps/frontend/src/types/index.ts` - AppSettings interface

## Dark Mode Architecture

### Three Layers:
1. System preference detection via `matchMedia('(prefers-color-scheme: dark)')`
2. User preference storage in `localStorage.darkModePreference` ('light'|'dark'|'system')
3. DOM application via `document.documentElement.classList.add/remove('dark')`

### State:
- `appSettings.dark_mode: boolean` - stored in IndexedDB/synced
- CSS variables automatically update via `.dark` selector
- Browser theme color updates meta tag

## Color System

### Light Mode (default):
- Primary: #0096C7
- Background: #ffffff
- Surface: #ffffff  
- Text: #0f172a (darkest)
- Borders: #e2e8f0

### Dark Mode:
- Primary: #0096C7 (same)
- Primary Hover: #33ADD3 (brighter)
- Background: #121212 (per specs)
- Surface: #0f172a
- Text: #f8fafc (lightest)
- Borders: #334155
- Error: #FF5C66 (light red)
- Shadows: Higher opacity (0.3-0.4)

## Tailwind Integration

```javascript
// tailwind.config.js
darkMode: 'class'  // Uses .dark selector
extend: {
  colors: {
    primary: { ... },
    background: { 950: '#121212' },  // dark mode
    surface: { ... },
    text: { ... }
  },
  spacing: { /* 8pt grid */ },
  fontSize: { h1, h2, h3, body, caption, small }
}
```

## Component Usage

Dark mode variant syntax:
```tsx
<div className="bg-surface-0 dark:bg-surface-800">
  <h2 className="text-text-900 dark:text-text-50">Title</h2>
</div>
```

## State Flow

1. User toggles dark mode in SettingsPage
2. `onUpdateSettings({ dark_mode: true/false })`
3. `App.tsx` updates state via `setAppSettings()`
4. Effect adds/removes `dark` class from `document.documentElement`
5. CSS variables in `:root` and `.dark` selector respond
6. Tailwind `dark:` variants apply automatically
7. Browser theme color meta tag updates
8. Synced to database if authenticated

## Accessibility Features

- High contrast mode support
- Reduced motion respects `prefers-reduced-motion`
- Safe area insets for notch support
- Semantic color tokens for WCAG AA compliance
- Multi-language font support (English + Arabic)

