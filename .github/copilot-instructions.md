# RepCue - AI Coding Agent Instructions

RepCue is a privacy-first fitness tracking app for interval training, optimized for mobile devices and self-hosting on Raspberry Pi. Built with React 19, TypeScript, Vite, and Tailwind CSS.

## Architecture Overview

**Service-Oriented Design**: All business logic lives in singleton services (`src/services/`):
- `StorageService` - Dexie.js (IndexedDB) wrapper with consent-aware persistence
- `AudioService` - Web Audio API for beeps, vibrations, and accessibility announcements  
- `ConsentService` - GDPR-compliant consent management with granular permissions

**State Management**: App-level React state in `App.tsx` with services for persistence. No external state management - intentionally simple for Pi deployment.

**Data Flow**: `App.tsx` → Services → IndexedDB. Services are singletons accessed via `.getInstance()` pattern.

## Key Development Patterns

### Service Pattern
```typescript
// All services follow this singleton pattern
class MyService {
  private static instance: MyService;
  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}
```

### Consent-Aware Storage
```typescript
// All storage operations check consent first
if (!consentService.hasConsent()) {
  return; // Gracefully degrade without storage
}
```

### TypeScript Interfaces
Core types in `src/types/index.ts`. Key interfaces:
- `Exercise` - Core workout data with categories and tags
- `ActivityLog` - Workout session tracking
- `TimerState` - Real-time timer state management

## Development Workflow

### Essential Commands
```bash
npm run dev          # Development server (port 5173)
npm test             # Vitest unit tests with --coverage
npm run build:serve  # Production build + Express server (port 3001)
npm run lint         # ESLint validation
```

### Testing Strategy
- **Unit Tests**: Every service has comprehensive tests in `__tests__/` subdirectories
- **Mocking**: Web APIs mocked in `src/test/setup.ts` (AudioContext, vibration, localStorage)
- **Test Pattern**: Import service, mock dependencies, test all public methods
- **Coverage**: Run `npm test -- --coverage` to ensure >90% coverage before commits

### Pi-Specific Considerations
- **Performance**: Lazy-loaded components, compression middleware in `server.js`
- **Production**: Built app served via Express with security headers and Cloudflare tunnel support
- **Memory**: Minimal dependencies, no external state management

## Component Architecture

### Route Structure
```
src/pages/
├── HomePage.tsx        # Exercise selection grid
├── TimerPage.tsx       # Interval timer with audio feedback
├── ExercisePage.tsx    # Exercise details and management
├── ActivityLogPage.tsx # Workout history
└── SettingsPage.tsx    # App preferences
```

### Timer Implementation
Complex timer state management in `App.tsx`:
- **Wake Lock**: Prevents screen sleep during workouts
- **Audio Feedback**: Beeps, voice announcements, vibration
- **Persistence**: Auto-saves timer state and workout logs

### Data Management
- **Exercise Data**: Seeded from `src/data/exercises.ts` (20 exercises across 5 categories)
- **Activity Logs**: IndexedDB storage with timestamp conversion for serialization
- **User Preferences**: Consent-aware with localStorage fallback

## Project-Specific Conventions

### File Organization
- Services in dedicated `__tests__/` subdirectories
- Lazy-loaded pages for performance
- Single `types/index.ts` for all TypeScript interfaces
- Constants in `src/constants/index.ts`

### Error Handling
- Graceful degradation when browser APIs unavailable
- Consent-aware storage with fallbacks
- Service methods return booleans/nulls rather than throwing

### Accessibility
- WCAG 2.1 compliant components
- Screen reader announcements for timer events
- High contrast support for various lighting conditions

## Integration Points

### Browser APIs
- **Wake Lock API**: Screen management during workouts
- **Web Audio API**: Custom beep generation
- **Vibration API**: Haptic feedback
- **IndexedDB**: Primary data storage via Dexie.js

### Build/Deploy Pipeline
- **Vite**: Fast development and production builds
- **Express**: Production server with compression and security headers
- **PM2**: Process management for Pi deployment
- **Git Hooks**: Pre-commit testing and linting enforcement

## Key Files to Understand

- `src/App.tsx` - Central state management and routing
- `src/services/storageService.ts` - Data persistence patterns
- `src/services/audioService.ts` - Browser API integration examples
- `src/test/setup.ts` - Testing mocks and configuration
- `server.js` - Production deployment configuration
