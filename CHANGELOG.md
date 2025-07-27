# RepCue - Fitness Tracking App Changelog

## [2025-07-27] - Expandable Exercise Tags

### Added
- **Expandable Tags**: Exercise cards now show expandable tag functionality
- **Tag Management**: Click "+n" to reveal all additional tags beyond the first 2
- **Smooth Transitions**: 200ms ease-out animations for tag expansion/collapse
- **Show Less Option**: Clear "Show less" button when tags are expanded
- **Accessibility Support**: Proper ARIA attributes for screen readers
- **Responsive Design**: Consistent behavior across mobile and desktop

### Enhanced
- **User Experience**: Users can now see all exercise tags without cluttering the interface
- **Progressive Disclosure**: Tags are revealed only when needed, maintaining clean UI
- **Comprehensive Testing**: 7 new test cases covering all expandable tag scenarios

## [2025-07-26] - Pre-Timer Countdown Feature & UI Improvement

### Changed
- **Start Button Label**: Timer start button now always shows "Start" regardless of countdown setting for consistency

### Added
- **Pre-Timer Countdown**: Configurable countdown before timer starts (0-10 seconds)
- **Settings Integration**: Countdown duration slider in Timer Settings section
- **Visual Countdown Display**: Large orange countdown numbers with "Get Ready!" message
- **Audio Announcements**: Voice countdown for last 3 seconds (when sound enabled)
- **Countdown Progress**: Orange circular progress indicator during countdown phase
- **Dynamic UI**: "Cancel" button available during countdown phase
- **Countdown Banner**: Clear visual indicator showing remaining preparation time

### Enhanced
- **Timer State Management**: Extended TimerState interface with countdown properties
- **User Experience**: Helps users get into position before exercise timer begins
- **Accessibility**: Screen reader announcements and clear visual indicators
- **Settings UI**: Intuitive slider with "Off" option and second labels

### Technical
- **Type Safety**: Updated AppSettings and TimerState interfaces
- **Test Coverage**: Comprehensive tests for countdown functionality
- **Documentation**: Updated README with usage instructions

## [2025-07-25] - Complete Offline-First PWA Implementation

### Added
- **Full Offline Support**: Application now works completely offline after first load, automatically switching between online/offline modes
- **Service Worker**: Implemented comprehensive caching strategy using Vite PWA plugin with Workbox
- **Offline Detection**: Real-time online/offline status detection with user-friendly status banners
- **Cache-First Strategy**: Static assets cached for instant offline loading (HTML, CSS, JS, images, fonts)
- **PWA Installation**: Native app installation support on mobile devices and desktop browsers
- **Offline Banner**: Visual indicators for connection status with accessibility support
- **Runtime Caching**: Google Fonts and external resources cached for offline use

### Technical Infrastructure
- **Vite PWA Plugin**: Automated service worker generation with optimal caching strategies
- **Workbox Integration**: Enterprise-grade service worker management and cache strategies
- **Navigation Fallback**: Single-page app routing works offline with proper fallback handling
- **Asset Optimization**: All static assets (JS, CSS, images) cached efficiently for offline access
- **PWA Manifest**: Auto-generated with app shortcuts and proper mobile installation metadata

### Security & Performance
- **OWASP Compliance**: Secure service worker registration and cache management
- **No Data Exposure**: Offline status handling doesn't expose sensitive connection details
- **Efficient Caching**: Smart cache invalidation and update strategies
- **Background Updates**: Automatic app updates when online without interrupting user workflow

### User Experience
- **Seamless Transitions**: Automatic switching between online/offline modes without data loss
- **Visual Feedback**: Clear status indicators for connection state changes
- **Persistent Functionality**: All core features (timer, exercises, settings) work fully offline
- **Installation Prompts**: PWA installation available on supported browsers and devices

## [2025-07-25] - TypeScript Configuration & Testing Improvements

### Fixed
- **TypeScript Test Errors**: Resolved "toBeInTheDocument does not exist" errors in test files
- **Jest-DOM Types**: Added proper @testing-library/jest-dom type references to vite-env.d.ts
- **Test TypeScript Config**: Created dedicated tsconfig.test.json for proper test file type checking
- **Project References**: Updated main tsconfig.json to include test configuration references
- **Vitest Type Checking**: Enhanced vitest.config.ts with typecheck configuration for comprehensive test validation

### Technical Infrastructure
- **Comprehensive Test Setup**: All 157+ tests now pass without TypeScript errors
- **Type Safety**: Improved type checking for test files with proper jest-dom matcher support
- **Development Workflow**: Enhanced development experience with better TypeScript support in tests
- **Build Pipeline**: Maintained separation between app and test TypeScript configurations

## [2025-07-24] - Custom Branding & PWA Enhancements

### Added
- **Custom Favicon System**: Created RepCue-branded favicon with timer design in blue (#2563eb) and green (#10b981) theme
- **Multi-Format Icons**: Generated favicon in SVG, PNG (16x16, 32x32, 48x48, 192x192, 512x512), ICO, and Apple Touch Icon formats
- **PWA Manifest**: Added comprehensive manifest.json for Progressive Web App installation on mobile devices
- **Favicon Generator Script**: Automated favicon generation pipeline using Sharp library (`npm run generate-favicons`)
- **Enhanced HTML Meta**: Added theme-color, description, and proper favicon references for all browser types
- **Professional Branding**: Replaced default Vite favicon with custom RepCue timer icon design

### Technical Infrastructure
- **Sharp Integration**: Added Sharp library for high-quality image processing and favicon generation
- **ES Module Scripts**: Updated favicon generation script to use ES modules for consistency with project setup
- **PWA Ready**: Application now supports "Add to Home Screen" functionality on mobile devices
- **Multi-Device Support**: Favicon optimized for desktop browsers, mobile web, and native app installations

## [2025-07-24] - Code Quality & Exercise Selection Fix

### Fixed
- **Exercise Selection Bug**: Fixed issue where clicking a favorite exercise on HomePage didn't select that exercise in TimerPage
- **HomePage Navigation**: Favorite exercises now properly pass exercise data to TimerPage with navigation state
- **ESLint Compliance**: Fixed all 35 ESLint errors across the codebase
- **TypeScript Types**: Replaced all inappropriate `any` types with proper TypeScript types
- **Test File Types**: Improved type safety in test files with proper mock typing
- **Code Comments**: Converted `@ts-ignore` to `@ts-expect-error` where appropriate
- **Unused Variables**: Fixed unused variable issues in test files
- **Namespace Issues**: Added proper ESLint disable for Cypress namespace declaration
- **Import Optimization**: Removed unused imports across multiple files

### Added
- **Enhanced HomePage UI**: Favorite exercises now display with individual start buttons and favorite toggle stars
- **Exercise Quick Start**: Users can now start a timer directly from favorite exercises on the home page
- **Responsive Exercise Cards**: Improved layout for favorite exercise display with better mobile optimization

### Improved
- **Type Safety**: Enhanced type safety throughout the application
- **Code Quality**: Achieved clean ESLint output with strict TypeScript rules
- **Test Reliability**: Improved test file typing for better maintainability
- **Developer Experience**: Cleaner codebase with proper type annotations
- **User Experience**: More intuitive exercise selection and timer workflow

### Technical Details
- Updated HomePage to use navigation state when starting timer with specific exercise
- Added handleStartTimer function that properly passes selectedExercise and selectedDuration to TimerPage
- Enhanced favorite exercise display with individual action buttons
- Fixed consent service migration types from `any` to proper `ConsentData` interface
- Enhanced test mocks with appropriate ESLint disable comments for legitimate `any` usage
- Improved type guards in consent validation with proper unknown type handling
- Added proper type imports for test utilities and mock objects

## [2025-07-23] - Robust Consent Management & Data Reset Enhancement

### Added
- **Versioned Consent System**: Implemented comprehensive consent versioning (v1→v2) with automatic migration
- **Consent Migration**: Automatic migration from legacy consent data to current version
- **Enhanced Data Reset**: Clear data now resets consent and redirects to home with consent banner
- **Consent Status API**: New `getConsentStatus()` method provides version info and migration status
- **Future-Proof Architecture**: Extensible migration system for future consent structure changes
- **Comprehensive Documentation**: Created `consent.md` with detailed consent system documentation including lifecycle diagrams

### Removed
- **Debug Reset Consent Button**: Removed temporary debug button from Settings page as robust consent system makes it unnecessary
- **Debug Information**: Enhanced consent debugging in Settings page with version display

### Changed
- **ConsentService**: Complete rewrite with versioning, migration, and backward compatibility
- **SettingsPage**: Updated "Clear All Data" to "Clear All Data & Reset App" with enhanced behavior
- **Test Suite**: Updated all consent-related tests to work with new versioned system
- **Data Clear Workflow**: Now includes consent reset and home screen redirect for fresh app experience

### Fixed
- **Production Export Issue**: Resolved export/clear buttons not appearing in production due to legacy consent data
- **Consent Compatibility**: Fixed incompatibility between old and new consent data structures
- **Migration Reliability**: Robust error handling for consent migration with fallback to reset

## [2025-07-23] - Comprehensive Testing Infrastructure & Data Management

### Added
- **Comprehensive Testing Suite**: Complete Cypress E2E test framework with accessibility testing
- **Accessibility Compliance**: WCAG 2.1 testing with axe-core integration and keyboard navigation
- **Component Testing**: Extensive unit tests for all major components (SettingsPage, HomePage, TimerPage)
- **SettingsPage Data Management**: Export/clear data functionality with consent-aware controls
- **Wake Lock API**: Complete implementation with proper error handling for screen management
- **Testing Scripts**: Added comprehensive test automation (`test:e2e`, `test:a11y`, `test:all`)
- **Mobile Testing**: Optimized E2E tests for mobile viewport (375x667)
- **Data Export**: JSON export functionality with timestamp and comprehensive data structure
- **Express Server**: Custom Express server (`server.js`) for production deployment
- **PM2 Integration**: Complete PM2 ecosystem configuration for Raspberry Pi 5
- **Health Monitoring**: `/health` endpoint for application monitoring
- **Security Headers**: Enhanced security headers for production environment
- **Compression**: Gzip compression middleware for better performance
- **Graceful Shutdown**: Proper signal handling for clean application shutdown
- **NPM Scripts**: Added PM2 management scripts (`pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`)
- **Nginx Configuration**: Production-ready nginx configuration with proxy setup
- **Cloudflare Tunnel**: Complete setup guide for `repcue.azprojects.net` deployment
- **Performance Optimization**: Pi-specific memory limits and restart policies

### Changed
- **Package.json**: Added Cypress, axe-core, and testing dependencies
- **SettingsPage**: Enhanced with export/clear data functionality and improved UI
- **Test Infrastructure**: Complete mocking setup for Web APIs (AudioContext, IndexedDB, vibration)
- **Component Architecture**: Improved error handling and consent-aware functionality
- **Documentation**: Comprehensive testing and accessibility documentation
- **Package.json**: Added Express and compression dependencies
- **Documentation**: Comprehensive PM2 deployment section in README
- **Gitignore**: Added PM2 and coverage-related ignores

### Technical Details
- **Testing Coverage**: 29/29 SettingsPage tests passing with comprehensive coverage
- **E2E Testing**: Exercise flow, timer functionality, and accessibility compliance
- **Accessibility**: WCAG 2.1 AA compliance across all pages
- **Data Management**: Consent-aware export/clear with proper error handling
- **Wake Lock**: Screen management during workouts with graceful degradation
- Express server listens on port 3001
- Optimized for single-instance deployment on Raspberry Pi
- 512MB memory limit with automatic restart
- Daily restart at 4 AM for maintenance
- Comprehensive logging with timestamps
- Static file caching (1 day) for performance

## [2025-06-29] - Initial commit

### Fixed


### Added
- Created application skeleton and navigation logic.
- Created full implementation of the Timer and Settings pages.
- Optimized for mobile viewing.
