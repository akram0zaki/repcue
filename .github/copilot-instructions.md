# RepCue - AI Coding Agent Instructions

RepCue is a privacy-first fitness tracking PWA for interval training, optimized for mobile devices and self-hosting on Raspberry Pi. Built with React 19, TypeScript, Vite, and Tailwind CSS.

## Architecture Overview

**Service-Oriented Design**: All business logic lives in singleton services (`src/services/`):
- `StorageService` - Dexie.js (IndexedDB) wrapper with consent-aware persistence
- `AudioService` - Web Audio API for beeps, vibrations, and accessibility announcements  
- `ConsentService` - GDPR-compliant consent management with granular permissions

**State Management**: App-level React state in `App.tsx` with services for persistence. No external state management - intentionally simple for Pi deployment.

**Data Flow**: `App.tsx` → Services → IndexedDB. Services are singletons accessed via `.getInstance()` pattern.

## Key Development Patterns

### Service Singleton Pattern
```typescript
// All services follow this singleton pattern
export class MyService {
  private static instance: MyService;
  
  private constructor() {
    // Private constructor prevents direct instantiation
  }
  
  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}

// Export singleton instance for convenience
export const myService = MyService.getInstance();
```

### Consent-Aware Storage Pattern
```typescript
// All storage operations check consent first
const consentService = ConsentService.getInstance();
if (!consentService.hasConsent()) {
  return; // Gracefully degrade without storage
}
```

### TypeScript Interface Design
Core types in `src/types/index.ts`. Key interfaces:
- `Exercise` - Core workout data with categories and tags
- `ActivityLog` - Workout session tracking with timestamp conversion
- `TimerState` - Real-time timer state with countdown support
- `AppSettings` - User preferences including pre-timer countdown

### Testing Mock Patterns
All browser APIs are mocked in `src/test/setup.ts`:
```typescript
// Web Audio API mocking
global.AudioContext = class MockAudioContext {
  createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  createGain() { return { connect: vi.fn(), gain: { value: 0 } }; }
}

// Vibration API mocking
Object.defineProperty(navigator, 'vibrate', { value: vi.fn() });
```

## Development Workflow

### Essential Commands
```bash
npm run dev          # Development server (port 5173)
npm test             # Vitest unit tests with --coverage
npm run build:serve  # Production build + Express server (port 3001)
npm run lint         # ESLint validation
npm run test:ui      # Interactive test interface
```

### Testing Strategy
- **Comprehensive Coverage**: 182/182 tests passing with >90% coverage requirement
- **Service Testing**: Every service has dedicated `__tests__/` subdirectory
- **Mock Architecture**: Browser APIs comprehensively mocked in `src/test/setup.ts`
- **Test Organization**: Separate test files for complex features (e.g., `TimerPage.countdown.test.tsx`)
- **Accessibility Testing**: Cypress e2e tests with axe-core for WCAG compliance

### Pi-Specific Optimizations
- **Memory Management**: PM2 config with 512MB memory limits (`ecosystem.config.cjs`)
- **Performance**: Compression middleware, lazy-loaded components, 1-day static asset caching
- **Production Server**: Express with security headers optimized for Cloudflare tunnel
- **Process Management**: PM2 with health checks and daily restart scheduling

## Component Architecture

### Route Structure & Lazy Loading
```
src/pages/
├── HomePage.tsx        # Exercise grid with category filtering
├── TimerPage.tsx       # Complex timer with pre-countdown, wake lock, audio
├── ExercisePage.tsx    # Exercise details and CRUD operations
├── ActivityLogPage.tsx # Workout history with export functionality
└── SettingsPage.tsx    # App preferences with granular controls
```

### Timer State Management
Complex timer implementation in `App.tsx` with multiple phases:
```typescript
interface TimerState {
  isRunning: boolean;
  currentTime: number;
  isCountdown: boolean;    // Pre-timer countdown phase
  countdownTime: number;   // Countdown seconds remaining
  // ... other timer properties
}
```

### Browser API Integration
- **Wake Lock API**: Prevents screen sleep during workouts (`useWakeLock` hook)
- **Web Audio API**: Custom beep generation with volume control and accessibility
- **Vibration API**: Haptic feedback patterns for different timer events
- **IndexedDB**: Primary storage via Dexie.js with consent management

## Data Architecture

### Exercise Data Structure
- **Seeded Data**: 20 exercises across 5 categories in `src/data/exercises.ts`
- **Categories**: Core, Cardio, Strength, Flexibility, Balance
- **Tags**: Multi-tag system for filtering and organization
- **Persistence**: IndexedDB storage with import/export functionality

### Consent-Aware Persistence
```typescript
// Storage operations respect user consent
if (consentService.hasConsent()) {
  await storageService.saveExercise(exercise);
} else {
  // Graceful degradation - app functions without persistence
}
```

## Project-Specific Conventions

### File Organization Patterns
- **Service Tests**: `src/services/__tests__/serviceName.test.ts`
- **Component Tests**: `src/components/__tests__/ComponentName.test.tsx`
- **Specialized Tests**: Separate files for complex features (countdown, offline, etc.)
- **Type Definitions**: Centralized in `src/types/index.ts`
- **Constants**: App-wide constants in `src/constants/index.ts`

### Error Handling Philosophy
- **Graceful Degradation**: App functions without browser API support
- **Consent Respect**: Features degrade gracefully without storage consent
- **No Throwing**: Service methods return booleans/nulls rather than throwing exceptions
- **Logging**: Console warnings for unsupported features, errors for failures

### Accessibility Implementation
- **WCAG 2.1 AA Compliance**: Verified through automated and manual testing
- **Screen Reader Support**: `AudioService.announceText()` creates aria-live announcements
- **Focus Management**: Proper tab order and visible focus indicators
- **High Contrast**: Support for various lighting conditions and vision needs

## Advanced Integration Patterns

### Audio Service Architecture
Multi-layered audio system in `AudioService`:
```typescript
// Different sound patterns for different events
playIntervalBeep(volume)     // Single beep for intervals
playStartSound()             // Two-tone start sequence
playStopSound()              // Three-tone finish sequence
announceText(text)           // Screen reader announcements
```

### Wake Lock Management
Screen management during workouts:
```typescript
// Prevent screen sleep during active workouts
const { requestWakeLock, releaseWakeLock, isActive } = useWakeLock();
// Automatically handles visibility changes and errors
```

### Storage Service Patterns
Dexie.js integration with consent management:
```typescript
// All storage methods are consent-aware
async saveExercise(exercise: Exercise): Promise<void>
async getExercises(): Promise<Exercise[]>
async exportAllData(): Promise<ExportData>
// Handles consent, errors, and timestamp conversion automatically
```

## Security & Privacy Implementation

### GDPR Compliance
- **Granular Consent**: Separate permissions for cookies, analytics, marketing
- **Data Minimization**: Only essential data stored locally
- **Right to Erasure**: Complete data clearing functionality
- **Consent Versioning**: Handles consent updates and migrations

### Security Headers (server.js)
```javascript
// Production security configuration
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Critical Files for Understanding

### Core Architecture
- `src/App.tsx` - Central state management, routing, and timer orchestration
- `src/services/storageService.ts` - Data persistence patterns with Dexie.js
- `src/services/audioService.ts` - Web Audio API integration and accessibility
- `src/services/consentService.ts` - GDPR compliance and consent management

### Testing & Build
- `src/test/setup.ts` - Comprehensive browser API mocking for tests
- `server.js` - Production Express server with Pi optimizations
- `ecosystem.config.cjs` - PM2 process management for Raspberry Pi deployment
- `vitest.config.ts` - Test configuration with coverage reporting

### TypeScript & Configuration
- `src/types/index.ts` - Complete type definitions for the application
- `src/constants/index.ts` - App-wide constants and default configurations
- `vite.config.ts` - Build configuration with PWA optimizations

This architecture enables a highly maintainable, accessible, and privacy-respecting fitness tracking application optimized for self-hosted deployment on resource-constrained devices.
