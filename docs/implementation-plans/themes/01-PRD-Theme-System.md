# Product Requirements Document (PRD)
# RepCue Theme System

**Document Version:** 1.0
**Created:** 2025-10-26
**Author:** Product Team
**Status:** Draft for Review

---

## Executive Summary

RepCue currently uses a single teal/blue color palette (#0096C7) that, while professional, may not appeal to all users. This PRD defines requirements for a theme customization system that allows users to choose from preset color palettes while maintaining the app's mobile-first, accessibility-focused design principles.

**Key Objectives:**
- Provide multiple preset themes to accommodate different user preferences
- Sync theme preferences across devices via Supabase
- Maintain WCAG 2.1 AA accessibility compliance across all themes
- Preserve existing dark mode functionality
- Ensure zero regression in app performance or UX

---

## 1. Problem Statement

**Current State:**
- RepCue uses a single color palette (teal/blue #0096C7) across all users
- Some users may find the corporate appearance uninspiring for a fitness app
- No personalization options for visual preferences beyond dark/light mode

**Desired State:**
- Users can select from multiple preset themes that reflect different visual personalities
- Theme preferences sync across devices for consistent experience
- All themes maintain professional quality and accessibility standards
- Exciting, engaging visual options for fitness-focused users

**Success Metrics:**
- 30% of users customize their theme within first week
- Theme preference syncs successfully 99.5% of the time
- Zero accessibility regressions (maintain WCAG 2.1 AA)
- No performance degradation (theme switching < 100ms)

---

## 2. Functional Requirements

### 2.1 Theme Selection & Management

**REQ-001: Preset Theme Library**
- **Priority:** P0 (Must Have)
- **Description:** System SHALL provide at least 4 preset themes with distinct visual personalities
- **Acceptance Criteria:**
  - Minimum 4 themes: Default (current teal), Energetic, Professional, Calm
  - Each theme includes complete color palette for light and dark modes
  - Themes are immutable (users cannot edit preset themes)
  - Each theme has unique ID, name, and description

**REQ-002: Default Theme Configuration**
- **Priority:** P0 (Must Have)
- **Description:** System SHALL define default theme in feature configuration
- **Acceptance Criteria:**
  - Default theme ID declared in `apps/frontend/src/config/features.ts`
  - Default theme is "default" (current teal palette)
  - New users automatically receive default theme
  - Default theme cannot be deleted or disabled

**REQ-003: Theme Selection UI**
- **Priority:** P0 (Must Have)
- **Description:** Settings page SHALL provide theme selection interface
- **Acceptance Criteria:**
  - Theme selector located in SettingsPage
  - Visual preview of each theme (color swatches)
  - Theme name and description displayed
  - Current theme clearly indicated
  - Single-tap theme activation
  - Mobile-first design (works on 320px width)

**REQ-004: Real-Time Theme Application**
- **Priority:** P0 (Must Have)
- **Description:** Theme changes SHALL apply immediately without page reload
- **Acceptance Criteria:**
  - Theme applies within 100ms of selection
  - Smooth transition animation (300ms)
  - All UI components update simultaneously
  - No flash of unstyled content (FOUC)
  - Preserves user's scroll position and form state

### 2.2 Theme Synchronization

**REQ-005: Cross-Device Sync**
- **Priority:** P0 (Must Have)
- **Description:** Theme preference SHALL sync across user's devices via Supabase
- **Acceptance Criteria:**
  - Theme ID stored in `app_settings` table
  - Bidirectional sync (device A → server → device B)
  - Sync respects existing dirty flag mechanism
  - Conflict resolution: last-write-wins by timestamp
  - Works with existing light/full/priority sync modes

**REQ-006: Offline Theme Support**
- **Priority:** P0 (Must Have)
- **Description:** Users SHALL select and apply themes while offline
- **Acceptance Criteria:**
  - Theme preferences stored in IndexedDB
  - Theme changes queued for sync when offline
  - Theme applies immediately from local storage
  - Sync occurs on next connection
  - No data loss during offline period

**REQ-007: Sync Conflict Resolution**
- **Priority:** P1 (Should Have)
- **Description:** System SHALL handle theme preference conflicts gracefully
- **Acceptance Criteria:**
  - Last-write-wins based on `updated_at` timestamp
  - User notified if theme changed on another device
  - Local theme updates immediately, server sync happens async
  - Version counter incremented on each theme change

### 2.3 Theme Architecture

**REQ-008: No Inline Styling**
- **Priority:** P0 (Must Have - Golden Rule)
- **Description:** Theme system SHALL NOT use inline styles
- **Acceptance Criteria:**
  - All theme colors defined in CSS variables
  - CSS variables injected into `:root` selector
  - Components use Tailwind classes with `dark:` variants
  - Zero inline `style=` attributes for theme colors
  - Exception: CSS variable values only (e.g., `--progress`)

**REQ-009: CSS Variable Architecture**
- **Priority:** P0 (Must Have)
- **Description:** Themes SHALL be implemented via CSS custom properties
- **Acceptance Criteria:**
  - All theme colors defined as CSS variables
  - Variables namespaced by theme ID
  - Light/dark mode support per theme
  - Variables update via root selector
  - Backward compatible with existing `tokens.css`

**REQ-010: Semantic Color Tokens**
- **Priority:** P0 (Must Have)
- **Description:** Themes SHALL maintain semantic color naming
- **Acceptance Criteria:**
  - Colors named by purpose (primary, surface, text, border)
  - Not named by color (no "blue-500", "red-600")
  - Consistent token structure across all themes
  - Same semantic tokens as current system
  - Component code unchanged (uses existing tokens)

### 2.4 Accessibility & Compatibility

**REQ-011: WCAG 2.1 AA Compliance**
- **Priority:** P0 (Must Have)
- **Description:** All themes SHALL meet WCAG 2.1 AA contrast standards
- **Acceptance Criteria:**
  - Text contrast ratio ≥ 4.5:1 (normal text)
  - Text contrast ratio ≥ 3:1 (large text 18pt+)
  - Interactive element contrast ≥ 3:1
  - Focus indicators visible in all themes
  - Automated contrast testing in CI pipeline

**REQ-012: Dark Mode Preservation**
- **Priority:** P0 (Must Have)
- **Description:** Dark mode toggle SHALL work independently of theme selection
- **Acceptance Criteria:**
  - Each theme has light and dark variants
  - Dark mode toggle preserved in Settings
  - `dark_mode` boolean remains in AppSettings
  - Dark mode state syncs independently
  - Switching themes preserves dark/light preference

**REQ-013: RTL Language Support**
- **Priority:** P0 (Must Have)
- **Description:** All themes SHALL support RTL languages (Arabic)
- **Acceptance Criteria:**
  - Colors work equally well in RTL mode
  - No visual issues with Arabic text
  - Icon rendering unaffected by theme
  - RTL-specific color tokens (if needed)
  - Tested with Cairo/Tajawal fonts

**REQ-014: Reduced Motion Support**
- **Priority:** P1 (Should Have)
- **Description:** Theme transitions SHALL respect `prefers-reduced-motion`
- **Acceptance Criteria:**
  - Instant theme switch if reduced motion enabled
  - No transition animations in reduced motion mode
  - Respects system accessibility preferences
  - Tested with screen readers

### 2.5 Performance & Data

**REQ-015: Performance Budget**
- **Priority:** P0 (Must Have)
- **Description:** Theme system SHALL NOT degrade app performance
- **Acceptance Criteria:**
  - Theme switch completes within 100ms
  - CSS variable injection < 10ms
  - No layout shift during theme change
  - Bundle size increase < 5KB (gzipped)
  - Lighthouse performance score maintained

**REQ-016: Data Privacy**
- **Priority:** P0 (Must Have)
- **Description:** Theme preference SHALL respect user consent
- **Acceptance Criteria:**
  - Theme stored even if analytics consent denied
  - Theme is non-personal UI preference
  - Syncs only for authenticated users
  - Follows GDPR compliance pattern
  - Can be erased on account deletion

**REQ-017: Backward Compatibility**
- **Priority:** P0 (Must Have)
- **Description:** Existing users SHALL see no breaking changes
- **Acceptance Criteria:**
  - Existing `dark_mode` field preserved
  - Users without theme preference get default theme
  - Migration adds theme fields without breaking data
  - Rollback possible without data loss
  - Existing CSS classes continue working

---

## 3. Non-Functional Requirements

### 3.1 Theme Quality Standards

**REQ-018: Visual Consistency**
- **Priority:** P0 (Must Have)
- **Description:** All themes SHALL maintain visual hierarchy and consistency
- **Acceptance Criteria:**
  - Consistent spacing (8pt grid) across themes
  - Consistent typography scale across themes
  - Consistent border radius across themes
  - Consistent shadow system across themes
  - Only colors vary between themes

**REQ-019: Mobile-First Design**
- **Priority:** P0 (Must Have)
- **Description:** Theme UI SHALL follow mobile-first principles
- **Acceptance Criteria:**
  - Theme selector works at 320px width
  - No horizontal overflow on theme preview
  - Touch targets ≥ 44×44px
  - Theme previews readable on small screens
  - Tested on iPhone SE, iPhone 14 Pro, Android devices

**REQ-020: Theme Naming & Branding**
- **Priority:** P1 (Should Have)
- **Description:** Themes SHALL have descriptive, user-friendly names
- **Acceptance Criteria:**
  - Names reflect theme personality (not colors)
  - Descriptions explain theme use case
  - Names localized via i18n
  - Avoid technical jargon
  - Examples: "Energetic", "Professional", "Calm", not "Blue", "Red"

### 3.2 Developer Experience

**REQ-021: Theme Creation Process**
- **Priority:** P1 (Should Have)
- **Description:** Adding new themes SHALL be straightforward for developers
- **Acceptance Criteria:**
  - Theme defined in single TypeScript object
  - Color validation enforced by types
  - Light/dark variants required
  - Automatic contrast validation
  - Documentation for theme creation

**REQ-022: Testing Infrastructure**
- **Priority:** P0 (Must Have)
- **Description:** Theme system SHALL have comprehensive test coverage
- **Acceptance Criteria:**
  - Unit tests for theme service
  - Integration tests for sync
  - Visual regression tests (Chromatic/Percy)
  - E2E tests for theme switching
  - Accessibility tests per theme

**REQ-023: Documentation**
- **Priority:** P1 (Should Have)
- **Description:** Theme system SHALL be fully documented
- **Acceptance Criteria:**
  - Architecture document complete
  - Implementation guide for new themes
  - Migration guide for existing installations
  - API documentation for theme service
  - User-facing help content

---

## 4. Out of Scope (Future Considerations)

**NOT INCLUDED in V1:**
- Custom theme creation by users (preset themes only)
- Per-component color overrides
- Theme marketplace or sharing
- Animated theme transitions (beyond simple fade)
- Automatic theme switching based on time of day
- Theme based on workout type
- AI-suggested themes based on usage patterns

These features may be considered for future releases based on user feedback.

---

## 5. User Stories

**US-001: As a fitness enthusiast, I want vibrant, energetic colors so my workout tracking feels motivating and exciting.**

**US-002: As a professional user, I want a subtle, corporate theme so I can use the app in work environments without distraction.**

**US-003: As a user with multiple devices, I want my theme preference to sync automatically so I have a consistent experience everywhere.**

**US-004: As a user sensitive to bright colors, I want calm, muted themes so the app is comfortable during long workout sessions.**

**US-005: As a developer, I want to easily add new themes so we can expand the library based on user feedback.**

---

## 6. Technical Constraints

**CONSTRAINT-001: Browser Support**
- Must support same browser matrix as current app
- Chrome/Edge 90+, Firefox 88+, Safari 14+
- CSS custom properties required (IE not supported)

**CONSTRAINT-002: Storage Limits**
- IndexedDB quota (typically 50MB+)
- Theme data < 5KB per theme
- Total theme library < 20KB

**CONSTRAINT-003: Sync Infrastructure**
- Must work with existing CorrectSyncService
- Respects 5-record batch limit
- Uses existing app_settings table
- No new Supabase tables for V1

**CONSTRAINT-004: Mobile Performance**
- Must work on iPhone SE (2016)
- CSS variable update < 10ms on low-end Android
- No janky animations on 60Hz displays

---

## 7. Dependencies

**DEP-001: Existing Systems**
- CorrectSyncService (bidirectional sync)
- StorageService (IndexedDB persistence)
- ConsentService (privacy compliance)
- Dark mode implementation (useDarkMode hook)

**DEP-002: Infrastructure**
- Supabase app_settings table
- Existing migration system
- Edge functions for sync

**DEP-003: UI Framework**
- Tailwind CSS (color system)
- React 19 (context for theme provider)
- CSS custom properties (browser support)

---

## 8. Success Criteria

**Launch Readiness:**
1. All P0 requirements implemented and tested
2. Zero accessibility regressions
3. Sync success rate > 99.5%
4. Performance budget met
5. Documentation complete

**Post-Launch (30 days):**
1. 30% of active users customize theme
2. < 5 theme-related support tickets
3. 95% user satisfaction (in-app survey)
4. Zero critical bugs
5. Positive user reviews mentioning themes

---

## 9. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Theme breaks accessibility | High | Medium | Automated contrast testing, manual QA |
| Sync conflicts lose preference | Medium | Low | Robust conflict resolution, version tracking |
| Performance regression | Medium | Medium | Performance budget, load testing |
| Inline styles creep in | High | Medium | Linting rules, code review checklist |
| Themes look bad in RTL | Medium | Medium | RTL testing for every theme |
| Users want custom colors | Low | High | Document as future enhancement |

---

## 10. Requirements Traceability Matrix

| Requirement | Priority | Component | Test Coverage |
|-------------|----------|-----------|---------------|
| REQ-001 | P0 | Theme Library | Unit, Visual |
| REQ-002 | P0 | Feature Config | Unit |
| REQ-003 | P0 | Settings UI | E2E, Visual |
| REQ-004 | P0 | Theme Service | Integration |
| REQ-005 | P0 | Sync Service | Integration, E2E |
| REQ-006 | P0 | Storage Service | Unit, Integration |
| REQ-007 | P1 | Sync Service | Integration |
| REQ-008 | P0 | Code Quality | Linting |
| REQ-009 | P0 | CSS Architecture | Unit, Visual |
| REQ-010 | P0 | Token System | Unit |
| REQ-011 | P0 | Accessibility | Automated, Manual |
| REQ-012 | P0 | Dark Mode | Integration, E2E |
| REQ-013 | P0 | RTL Support | Manual, E2E |
| REQ-014 | P1 | Accessibility | Manual |
| REQ-015 | P0 | Performance | Load Testing |
| REQ-016 | P0 | Privacy | Unit, Manual |
| REQ-017 | P0 | Migration | Integration |
| REQ-018 | P0 | Design System | Visual |
| REQ-019 | P0 | Mobile UX | E2E, Manual |
| REQ-020 | P1 | i18n | Translation Review |
| REQ-021 | P1 | Dev Experience | Documentation |
| REQ-022 | P0 | Testing | CI/CD |
| REQ-023 | P1 | Documentation | Review |

---

## Appendix A: Glossary

- **Theme:** A complete color palette defining all UI colors for light and dark modes
- **Preset Theme:** A pre-configured, immutable theme provided by the app
- **Theme ID:** Unique identifier for a theme (e.g., "default", "energetic")
- **Semantic Token:** CSS variable named by purpose (e.g., `--color-primary`, not `--color-blue`)
- **CSS Variable:** CSS custom property (e.g., `var(--color-primary)`)
- **Dirty Flag:** Sync metadata indicating record needs server sync
- **Light/Dark Mode:** Brightness preference independent of color theme

---

## Appendix B: Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | ___________ | ___________ | ______ |
| Engineering Lead | ___________ | ___________ | ______ |
| Design Lead | ___________ | ___________ | ______ |
| QA Lead | ___________ | ___________ | ______ |

---

**Document History:**
- v1.0 (2025-10-26): Initial draft
