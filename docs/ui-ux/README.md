# UI/UX Documentation

This directory contains comprehensive design and development guidelines for RepCue's user interface and user experience.

## 📋 Documentation Index

### Core Design Guidelines

- **[ui-specs.md](./ui-specs.md)** — Complete UI/UX design specification
  - Visual identity and color palettes (light & dark mode)
  - Typography scale and font choices
  - Dark mode text color hierarchy
  - Button styling and component patterns
  - RTL (Right-to-Left) language support
  - Badge and tag styling guidelines
  - Implementation best practices

### Development Guides

- **[rtl-development-guide.md](./rtl-development-guide.md)** — Technical RTL implementation patterns
  - Icon rendering solutions for Arabic/RTL mode
  - Navigation component RTL protection
  - CSS protection rules and patterns
  - Component architecture for RTL compatibility
  - Testing strategies and checklists
  - Common pitfalls and solutions

## 🎯 Quick Start for Developers

### New to RepCue UI Development?
1. **Start with [ui-specs.md](./ui-specs.md)** for design foundations
2. **Review RTL guidelines** if working with navigation or icons
3. **Follow the text color hierarchy** for consistent dark mode support

### Working with RTL/Arabic Support?
1. **Read [rtl-development-guide.md](./rtl-development-guide.md)** first
2. **Use the testing checklist** to verify RTL compatibility
3. **Apply CSS protection patterns** for navigation icons

### Adding New UI Components?
1. **Follow color palettes** defined in ui-specs.md
2. **Use standard CSS classes** for text hierarchy
3. **Test in both light/dark modes** and RTL when applicable
4. **Maintain 44px touch targets** for mobile accessibility

## 🔗 Related Documentation

### Internationalization (i18n)
- [../i18n/README.md](../i18n/README.md) — i18n documentation index
- [../i18n/rtl.md](../i18n/rtl.md) — RTL strategy and language considerations
- [../i18n/contributing.md](../i18n/contributing.md) — Translation contribution guide

### Implementation Plans
- [../implementation-plans/](../implementation-plans/) — Detailed feature implementation guides
- PWA, i18n, and OWASP security implementation plans

### Testing
- [../testing/README.md](../testing/README.md) — Testing strategies and guidelines

## 🎨 Design Principles

RepCue follows these core UI/UX principles:

1. **UX First**: User experience is the primary directive
2. **Mobile-First**: Optimized for mobile devices with responsive design
3. **Accessibility**: WCAG 2.1 AA compliant with proper contrast and touch targets
4. **Performance**: Fast loading with efficient component patterns
5. **Consistency**: Unified design language across all interfaces
6. **Internationalization**: Full support for 8 languages including RTL

## 📱 Supported Platforms & Languages

### Platforms
- **Primary**: Mobile web (iOS Safari, Android Chrome)
- **Secondary**: Desktop web browsers
- **Format**: Progressive Web App (PWA)

### Languages (8 Total)
- **LTR Languages**: English (en), French (fr), German (de), Spanish (es), Dutch (nl), Frisian (fy)
- **RTL Languages**: Arabic (ar), Arabic Egyptian (ar-EG)

## 🛠️ Common UI Patterns

### Navigation
- Bottom navigation with 5 main tabs + More menu
- Horizontal scroll navigation for catalogs
- RTL-safe icon rendering patterns

### Forms & Settings
- Toggle switches with proper labeling
- Dropdown selects with dark mode support
- Form validation and error states

### Content Display
- Exercise cards with responsive layouts
- Progress indicators and statistics
- Modal dialogs and overlays

## 🧪 Testing Guidelines

### Visual Testing
- [ ] Light and dark mode compatibility
- [ ] RTL layout verification (Arabic)
- [ ] Mobile viewport responsiveness
- [ ] Touch target accessibility (44px minimum)

### Functional Testing
- [ ] Navigation icon visibility in all modes
- [ ] Form interactions in RTL
- [ ] Component state transitions
- [ ] Cross-browser compatibility

## 📦 Component Architecture

RepCue uses a centralized component system:

- **Icon Components**: `apps/frontend/src/components/icons/NavigationIcons.tsx`
- **CSS Classes**: Predefined classes for consistent styling
- **Design Tokens**: CSS custom properties for theming
- **Responsive Patterns**: Mobile-first with progressive enhancement

## 🚀 Contributing to UI/UX

### Making Changes
1. **Update documentation** when adding new patterns
2. **Test thoroughly** in all supported modes (light/dark/RTL)
3. **Follow existing conventions** for consistency
4. **Consider accessibility** in all design decisions

### Documentation Updates
- Keep ui-specs.md as the single source of truth for design
- Update rtl-development-guide.md for technical RTL patterns
- Cross-reference related documentation sections

---

**Need help?** Check the specific documentation files above or reach out to the development team for UI/UX guidance.