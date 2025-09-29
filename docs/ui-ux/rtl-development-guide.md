# RTL Development Guide - RepCue

## Overview

This guide documents the specific patterns and solutions for handling Right-to-Left (RTL) interfaces in RepCue, particularly focusing on icon rendering issues that can occur in Arabic language mode.

## Core Problem

RTL language support can interfere with SVG icon rendering due to:
- Global CSS `direction: rtl` affecting SVG elements
- CSS transforms applied to RTL content
- Button padding rules that override navigation styles

## Icon Rendering Solutions

### 1. Navigation Icons Pattern

**Problem**: Navigation icons (More menu, scroll arrows) not rendering in Arabic mode.

**Solution**: Force LTR direction for navigation elements.

```tsx
// Component Level Protection
<button 
  className="nav-more-button flex items-center justify-center rounded-lg transition-colors"
  style={{ direction: 'ltr' }} // Forces LTR regardless of page direction
  aria-label="More options"
>
  <MoreIcon size={20} />
</button>
```

### 2. CSS Protection Rules

**Global RTL-Safe Styles** (in `index.css`):

```css
/* Exclude navigation buttons from global RTL button padding */
body.rtl .btn-primary,
body.rtl .btn-secondary,
body.rtl button:not(.nav-more-button):not(.nav-item):not([aria-label*="Scroll"]) {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

/* RTL-safe navigation buttons - override global button padding */
body.rtl .nav-more-button,
body.rtl .nav-item,
body.rtl nav button {
  padding: 4px 1px !important;
  direction: ltr !important;
}

/* RTL-safe SVG icons in navigation */
body.rtl .nav-more-button svg,
body.rtl .nav-item svg,
body.rtl .catalog-selector button svg {
  direction: ltr !important;
  transform: none !important;
}
```

### 3. Icon Component Standards

**Use Centralized Components**:
```tsx
// ✅ GOOD: Use centralized icon components
import { ChevronLeftIcon, ChevronRightIcon, MoreIcon } from './icons/NavigationIcons';

// ❌ AVOID: Inline SVG (harder to maintain and protect)
<svg className="w-5 h-5" fill="none" stroke="currentColor">
  <path d="M15 19l-7-7 7-7" />
</svg>
```

**Icon Design Principles**:
- **Filled vs Stroke**: Use `fill="currentColor"` for better RTL contrast
- **Size Consistency**: Standard sizes (16px, 20px, 24px)
- **Touch Targets**: Minimum 44px for interactive elements

### 4. Component Architecture

**Navigation Icons** (`NavigationIcons.tsx`):
```tsx
export const MoreIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"      // Better RTL visibility than stroke
    stroke="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="5" r="2" />   // Larger circles (r="2" vs r="1")
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);
```

## Testing Patterns

### Manual Testing Checklist

1. **Switch to Arabic Language**:
   - Settings → Language → العربية
   - Verify all navigation icons appear

2. **Icon Visibility Check**:
   - [ ] Bottom navigation More button (three dots)
   - [ ] Catalog selector scroll arrows (left/right)
   - [ ] Any other interactive icons

3. **Cross-Browser Testing**:
   - [ ] Chrome/Edge (Chromium)
   - [ ] Firefox
   - [ ] Safari (if available)

### Automated Testing

**Component Tests** should verify RTL mode:
```tsx
// Example test pattern
it('should render navigation icons in RTL mode', () => {
  document.body.classList.add('rtl');
  render(<Navigation />);
  
  const moreButton = screen.getByTestId('nav-more');
  const icon = moreButton.querySelector('svg');
  
  expect(icon).toBeInTheDocument();
  expect(icon).toBeVisible();
});
```

## Common Pitfalls & Solutions

### Issue: Icons disappear in Arabic mode
**Cause**: Global `body.rtl` rules affecting navigation elements
**Solution**: Add `style={{ direction: 'ltr' }}` to navigation buttons

### Issue: Inconsistent icon sizes
**Cause**: Mixing CSS sizing with component props
**Solution**: Always use `size` prop on icon components

### Issue: Poor contrast in dark mode + RTL
**Cause**: Stroke-based icons with thin lines
**Solution**: Use filled icons or increase stroke width

### Issue: Touch targets too small on mobile
**Cause**: Icon size used for button size
**Solution**: Separate icon size (20px) from touch target (44px)

## Implementation Workflow

1. **Create Icon Component** in `NavigationIcons.tsx`
2. **Add CSS Protection** in `index.css` if needed
3. **Use Component** with proper sizing and RTL protection
4. **Test in Arabic** mode to verify rendering
5. **Update Documentation** if new patterns emerge

## Future Considerations

- **Icon Libraries**: If switching to icon libraries (Heroicons, Lucide), ensure RTL compatibility
- **Custom Icons**: Follow the same filled/stroke principles for consistency
- **Performance**: Centralized components allow for better tree-shaking
- **Accessibility**: Maintain `aria-hidden="true"` for decorative icons

## Related Files

- `apps/frontend/src/components/icons/NavigationIcons.tsx` - Icon components
- `apps/frontend/src/index.css` - RTL-safe CSS rules
- `apps/frontend/src/components/Navigation.tsx` - Main navigation implementation
- `apps/frontend/src/components/CatalogSelector.tsx` - Horizontal navigation example
- `docs/ui-ux/ui-specs.md` - Full UI specification including RTL guidelines

## Resources

- [CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties) - For proper RTL layout
- [RTL Styling 101](https://rtlstyling.com/) - Comprehensive RTL development guide
- [Arabic Web Typography](https://www.w3.org/International/articles/arabic-indic-digits/) - Typography considerations