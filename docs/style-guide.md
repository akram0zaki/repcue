## RepCue Styling & UX Guide

This guide explains how styling works in RepCue, what files participate in the design system, how to choose the right style in day-to-day development, and how to extend the system safely. It is the single reference for building new components and screens that comply with RepCue’s UI specs and UX principles.

Related references:
- UI/UX specification: `docs/ui-ux/ui-specs.md`
- i18n rules: `docs/i18n-guide.md`, `docs/i18n/key-styleguide.md`
- Frontend styles: `apps/frontend/src/styles/tokens.css`
- Tailwind config: `apps/frontend/tailwind.config.js`

---

### 1) Design system at a glance

- Mobile-first PWA, WCAG 2.1 AA, reduced motion respected.
- Use semantic, tokenized classes instead of ad-hoc Tailwind colors.
- Typography, buttons, surfaces, status colors, RTL protections, accessibility utilities are centralized in `tokens.css`.
- Inline styles are not allowed, except for passing CSS variables (e.g., `--progress`) when unavoidable.

Core principles (see UI spec):
- Zero horizontal overflow on mobile (min 320px).
- Touch targets ≥ 44×44px.
- Semantic typography scale (`.text-h1 … .text-small`).
- Semantic color tokens (text/surface/border/status) that adapt to light/dark.

---

### 2) Where styles live and what they do

1) `apps/frontend/src/styles/tokens.css` (Single source of truth)
   - CSS custom properties (colors, borders, shadows) for light/dark.
   - Semantic utility classes:
     - Typography: `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-caption`, `.text-small`.
     - Buttons: `.btn-primary`, `.btn-secondary`, `.btn-neutral`, `.btn-danger`.
     - Surfaces and borders: `.bg-surface-*`, `.border-*`, shadows.
     - Status tokens: `.text-success/.bg-success-soft`, `.text-warning/.bg-warning-soft`, `.text-error/.bg-error-soft`.
     - Progress system: `.progress`, `.progress__track`, `.progress__bar` (width via `--progress`).
     - Timer utilities: `.timer-text-shadow-lg|sm`, `.timer-square-280`, `.timer-rect-560x320`, `.video-inset-10`, `.gpu-accelerated`.
     - RTL protection: `.nav-more-button`, `.catalog-selector` targeting scroll buttons.
     - Accessibility: `.sr-only-live` (offscreen live region), spacing helpers like `.chart-gap`.

2) Tailwind utility classes
   - Used for layout/spacing/structure (flex/grid/gap/padding), responsiveness (`sm:`, `lg:`), and modifiers (`hover:`, `focus:`).
   - Avoid ad-hoc color utilities (e.g., `bg-blue-600`, `text-gray-500`) for component styling. Prefer tokens from `tokens.css`.
   - Bracketed utility escape is allowed for rare vendor-specific rules, e.g., `[animation-direction:_reverse]`.

3) Component code
   - Pages/components compose token classes + Tailwind layout utilities.
   - Error/empty/loading states must also use token classes.
   - ARIA labels and user-visible strings must come from i18n.

---

### 3) Choosing the right style (decision tree)

Use this quick checklist when building a UI element:

1. Text?
   - Headline or section: `.text-h1` / `.text-h2` / `.text-h3`.
   - Body copy: `.text-body`.
   - Labels/captions/smaller text: `.text-caption` or `.text-small`.

2. Buttons?
   - Primary action: `.btn-primary`.
   - Secondary/outline: `.btn-secondary`.
   - Neutral/utility: `.btn-neutral`.
   - Destructive: `.btn-danger`.
   - Do not handcraft button colors; use the button classes and add layout utilities (e.g., `w-full`, `text-sm`).

3. Surfaces/cards?
   - Containers: `.bg-surface-0` (light) and their dark-equivalents already apply via `:root`/`.dark` tokens.
   - Add borders with `.border-*` tokens if needed; prefer tokenized text colors.

4. Status/feedback (success/warn/error)?
   - Use status tokens: example warning card: `bg-warning-soft border border-warning text-warning`.
   - Avoid raw `red-500`, `yellow-400`, etc.

5. Progress bars?
   - Use `.progress > .progress__track > .progress__bar`.
   - Set width via CSS var: `<div class="progress__bar" style={{ ['--progress']: value }} />`.

6. Timer display specifics?
   - Use `.timer-text-shadow-lg|sm` for overlayed white text legibility.
   - Fixed demo sizes: `.timer-square-280`, `.timer-rect-560x320` (prefer responsive wrappers when possible).
   - For video performance: `.gpu-accelerated`.

7. RTL-sensitive icons/buttons?
   - Apply `.nav-more-button` for the More menu; add `.catalog-selector` to scroll controls.
   - Do not use inline `style={{ direction: 'ltr' }}`.

8. Accessibility helpers?
   - Live region: `.sr-only-live` for offscreen assistive texts.
   - Respect reduced motion (`motion-reduce:*`) and avoid rapid, decorative animations.

---

### 4) Reusable UI patterns (copy & adapt)

Buttons
```tsx
<button className="btn-primary">{t('common.start')}</button>
<button className="btn-secondary">{t('common.cancel')}</button>
<button className="btn-neutral text-sm">{t('common.edit')}</button>
<button className="btn-danger">{t('common.delete')}</button>
```

Cards/Surfaces
```tsx
<div className="bg-surface-0 dark:bg-surface-800 rounded-lg p-4 shadow-sm">
  <h3 className="text-h3 mb-2">{title}</h3>
  <p className="text-body">{description}</p>
  <div className="mt-3"><button className="btn-primary">{cta}</button></div>
  {/* borders: add `border border-surface-200 dark:border-surface-700` if needed */}
  {/* note: use tokenized text colors, not ad-hoc grays */}
  {/* ensure responsive stacking with `flex-col sm:flex-row` as needed */}
  {/* respect 44px min touch targets for interactive elements */}
</div>
```

Status banners (warning/error)
```tsx
<div className="bg-warning-soft border border-warning rounded-lg p-4">
  <h4 className="text-caption text-warning mb-1">{t('warnings.title')}</h4>
  <p className="text-body">{t('warnings.description')}</p>
</div>

<div className="bg-error-soft border border-error rounded-lg p-4">
  <p className="text-body text-error">{t('errors.generic')}</p>
</div>
```

Progress bar
```tsx
<div className="progress">
  <div className="progress__track">
    <div className="progress__bar" style={{ ['--progress' as unknown as string]: progress }} />
  </div>
</div>
```

Timer overlay text
```tsx
<div className="text-h2 text-white timer-text-shadow-lg">{display}</div>
<div className="text-caption text-white timer-text-shadow-sm">{subtext}</div>
```

RTL-protected navigation icons
```tsx
<button className="nav-more-button" aria-label={t('a11y.moreOptions')}>
  <MoreIcon size={26} />
</button>
```

---

### 5) Tailwind usage policy

- Use Tailwind for:
  - Layout and structure: `flex`, `grid`, `gap`, `p-*`, `m-*`, `w-*`, `h-*`, `rounded-*`, etc.
  - Responsive adjustments: `sm:*`, `md:*`, `lg:*`.
  - State modifiers: `hover:*`, `focus:*`, `disabled:*`, `motion-reduce:*`.

- Avoid Tailwind for:
  - Colors for text/background/borders in components. Use tokens/utilities in `tokens.css`.
  - Typography sizing and semantic roles; use `.text-h*`, `.text-body`, `.text-caption`, `.text-small`.

---

### 6) i18n, RTL, accessibility

- i18n: never hardcode strings. All user-visible text and ARIA labels go through `t()` or `<Trans>`.
- RTL: the app will toggle `dir` and `body.rtl` automatically. Use logical utility classes and the RTL protections from tokens. Do not inline `direction`.
- Accessibility: ensure proper color contrast (tokens handle most cases), touch target sizing, focus outlines on interactive elements, and announce important updates with a live region.

---

### 7) Adding new styles & components

When a new pattern is needed (and it doesn’t already exist):

1. Check tokens and patterns first
   - If an existing tokenized class or pattern fits (e.g., `btn-*`, `text-*`, `progress`, status tokens), use it.

2. If a new utility is truly needed
   - Add it to `apps/frontend/src/styles/tokens.css` under the relevant section.
   - Keep naming semantic and short: e.g., `.badge-neutral`, `.list-divider`, not `.bg-gray-50`.
   - Provide light/dark variants via CSS variables if color-related.

3. New reusable component
   - Place in `apps/frontend/src/components/ui/` (e.g., `ProgressBar.tsx`, `Badge.tsx`, `Modal.tsx`).
   - Compose existing token classes; expose sizing/variants via props rather than new colors.
   - Add minimal stories/examples in docs or inline usage notes.

4. Don’ts
   - Don’t introduce ad-hoc color classes into components.
   - Don’t add inline styles (except CSS var `--progress` on `.progress__bar`).
   - Don’t bypass i18n for strings or ARIA.

5. Submitting changes
   - Run lint, tests, and a manual 320/375/428px sweep.
   - Validate RTL and reduced motion.
   - Update `CHANGELOG.md` for user-visible styling changes.

---

### 8) Practical examples

Replace ad-hoc colors (bad)
```tsx
// Bad
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Go</button>

// Good
<button className="btn-primary">{t('common.go')}</button>
```

Avoid inline styles (bad)
```tsx
// Bad
<div style={{ width: `${progress}%` }} />

// Good
<div className="progress__bar" style={{ ['--progress' as unknown as string]: progress }} />
```

Headings and body text (bad → good)
```tsx
// Bad
<h2 className="text-xl font-semibold">{title}</h2>
<p className="text-gray-600">{body}</p>

// Good
<h2 className="text-h2">{title}</h2>
<p className="text-body">{body}</p>
```

---

### 9) FAQ

Q: Can I use Tailwind color utilities?
- Use tokenized utilities from `tokens.css` instead. Only use raw color classes for quick prototypes (must be cleaned before merging).

Q: Can I create a new button variant?
- Discuss with the team first. If approved, add a semantic variant in `tokens.css` with design tokens (light/dark, focus states), then document it here.

Q: Are inline styles ever allowed?
- Only to pass `--progress` to `.progress__bar` (width). For performance hacks (e.g., GPU layers), a tokenized class exists: `.gpu-accelerated`.

Q: How do I ensure RTL compatibility?
- Use logical properties/classes and the provided RTL protection classes for navigation icons. Test Arabic (`ar`) mode on mobile widths.

---

By following this guide and using the centralized tokens and utilities, any new component or screen will match RepCue’s look and feel, remain accessible, and be easy to maintain and theme.


