# RepCue iOS App Store Implementation Plan

**Created**: 2025-11-30  
**Status**: In Progress  
**Estimated Duration**: 4-6 weeks  
**Priority**: High  
**Last Updated**: 2025-12-05

---

## Implementation Progress

### Launch Phase (MVP for App Store)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Capacitor Integration | ✅ Complete | Core + iOS platform + 8 plugins installed |
| Phase 2: Native Plugin Integration | ✅ Complete | Platform detection, haptics, audio service integration |
| Phase 3: Core iOS Adjustments | ✅ Complete | Safe areas, keyboard handling, scroll behavior, status bar |
| Phase 4: Privacy Manifest & App Store Prep | ✅ Complete | PrivacyInfo.xcprivacy created |
| Phase 5: Testing & Optimization | ✅ Complete | Video playback fixed, CORS configured, scrolling working |
| Phase 6: App Store Submission | ⬜ Not Started | TestFlight beta, then production |

### Post-Launch Phase (Platform UI Polish)

| Task | Status | Notes |
|------|--------|-------|
| Platform Abstraction Layer | ✅ Complete | PlatformContext, platform detection hooks |
| Platform-Aware Dialogs | ✅ Complete | Native dialogs on iOS/Android, web modal fallback |
| Platform-Aware Spinners | ✅ Complete | iOS/Android/Web adaptive spinner |
| Platform-Aware Modals | ✅ Complete | Sheet-style on mobile, overlay on web |
| Android Support | ⬜ Planned | Add Android platform, same codebase |

> **Platform Abstraction Complete**: The platform abstraction layer is now implemented:
> - `PlatformContext` - Provides platform detection throughout the app
> - `PlatformSpinner` - Adapts to iOS (8-segment), Android (Material), or Web style
> - `PlatformModal` - Sheet on mobile, centered modal on web
> - `PlatformConfirmDialog` - Native dialogs on iOS/Android, styled web modal fallback
> - `usePlatformConfirm` hook - Unified confirmation API
> - `ConfirmationModal` now uses platform-aware components automatically

### Recent Fixes (2025-12-05)

#### Platform Abstraction Implementation
- ✅ **PlatformContext**: Context provider with `usePlatform` and `usePlatformClasses` hooks
- ✅ **PlatformSpinner**: Adaptive spinner with iOS/Android/Web variants
- ✅ **PlatformModal**: Sheet-style on mobile, centered overlay on web
- ✅ **PlatformConfirmDialog**: Web dialog component with proper accessibility
- ✅ **PlatformConfirmationModal**: Drop-in replacement for ConfirmationModal
- ✅ **usePlatformConfirm**: Hook for imperative confirmation dialogs
- ✅ **platform.css**: CSS for platform-specific animations and styles
- ✅ **Unit Tests**: 29 tests for platform components (all passing)

### Recent Fixes (2025-12-02)

#### Video Playback in iOS Simulator
- ✅ **URL Normalization**: Added `normalizeVideoUrl()` to convert relative `/media/*` paths to absolute `https://dev.repcue.me/media/*` URLs for native apps
- ✅ **CORS Support**: Added CORS headers to Cloudflare Pages Function (`functions/media/[[path]].ts`) with allowed origins including `capacitor://localhost`
- ✅ **crossOrigin Attribute**: Added `crossOrigin="anonymous"` to all video elements
- ✅ **Probe Skip**: Skip video URL probing for native apps (WKWebView fetch with Range headers is unreliable)
- ✅ **AbortError Handling**: Gracefully handle AbortError in video play (expected during navigation/re-render)

#### Circular Dependency Fix
- ✅ **Logger Independence**: Modified `logger.ts` to use `import.meta.env.DEV` instead of importing DEBUG from `features.ts` to break circular dependency chain
- ✅ **Direct Imports**: Updated `selectVideoVariant.ts` and `VideoThumbnail.tsx` to import `isNativePlatform` directly from `nativeCapabilities.ts` instead of through `features.ts`

#### iOS Simulator Warnings (Harmless)
- `RBSServiceErrorDomain` errors are simulator-only (real devices have proper entitlements)
- `UIScene lifecycle` warning is Apple deprecation notice
- Keyboard constraint warnings are system-level, not app issues

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Approach Options Analysis](#2-approach-options-analysis)
3. [Recommended Approach: Capacitor](#3-recommended-approach-capacitor)
4. [Prerequisites](#4-prerequisites)
5. [Implementation Phases](#5-implementation-phases)
6. [iOS-Specific Features](#6-ios-specific-features)
7. [App Store Submission Requirements](#7-app-store-submission-requirements)
8. [Risk Assessment](#8-risk-assessment)
9. [Testing Strategy](#9-testing-strategy)
10. [Cost Analysis](#10-cost-analysis)
11. [Timeline](#11-timeline)
12. [Success Criteria](#12-success-criteria)

---

## 1. Executive Summary

### Goal
Bundle RepCue as a native iOS app for distribution on the Apple App Store, leveraging the existing React PWA codebase while adding native capabilities to enhance user experience and meet Apple's App Store guidelines.

### Why Not Just PWA?
While RepCue already works as a PWA on iOS, there are significant limitations:
- **No App Store visibility** - Users can't discover RepCue through the App Store
- **Limited push notifications** - PWA push notifications on iOS are restricted
- **No background audio** - Timer sounds stop when the app is backgrounded
- **No HealthKit integration** - Cannot sync workout data with Apple Health
- **Perception** - Many users trust "real" apps over PWAs

### Key Benefits of App Store Distribution
- ✅ Discoverability through App Store search
- ✅ Native push notifications
- ✅ Background audio/timer continuation
- ✅ Potential HealthKit integration for workout tracking
- ✅ Professional credibility and user trust
- ✅ Ability to use native iOS capabilities via plugins

---

## 2. Approach Options Analysis

### Option A: Capacitor (Recommended ⭐)

**Overview**: Ionic Capacitor wraps web apps in a native container, providing access to native APIs through plugins.

| Aspect | Details |
|--------|---------|
| **Compatibility** | ✅ Excellent - designed for React + Vite apps |
| **Learning Curve** | Low - uses existing web codebase |
| **Native Access** | Good - extensive plugin ecosystem |
| **Maintenance** | Low - single codebase for web and iOS |
| **Community** | Active - backed by Ionic/OutSystems |
| **App Store Acceptance** | Good - many successful apps |

**Pros**:
- Minimal changes to existing React codebase
- Native APIs via Capacitor plugins (push notifications, filesystem, etc.)
- Can incrementally add native features
- Same codebase serves web PWA and iOS app
- Well-documented iOS deployment process

**Cons**:
- Requires Xcode and macOS for iOS builds
- Some performance overhead vs pure native
- Must ensure app provides "native-like" experience per Apple guidelines

### Option B: PWABuilder

**Overview**: Microsoft's PWABuilder generates native app wrappers from PWA manifests.

| Aspect | Details |
|--------|---------|
| **Compatibility** | ✅ Good for basic PWA wrapping |
| **Learning Curve** | Very Low |
| **Native Access** | Limited |
| **Maintenance** | Low |
| **Community** | Moderate |
| **App Store Acceptance** | Risky - minimal value-add |

**Cons**:
- Higher rejection risk from Apple (4.2 guideline - "minimum functionality")
- Limited native feature access
- May not provide enough differentiation from web version

### Option C: React Native Rewrite

**Overview**: Complete rewrite using React Native for truly native components.

| Aspect | Details |
|--------|---------|
| **Compatibility** | Requires significant rewrite |
| **Learning Curve** | High |
| **Native Access** | Excellent |
| **Maintenance** | High - separate codebase |
| **Time Investment** | 3-6 months |

**Cons**:
- Requires maintaining two codebases (or abandoning web)
- Significant time investment
- Not justified for RepCue's scope

### Recommendation: Capacitor ⭐

Capacitor is the optimal choice because:
1. Leverages existing React + Vite + TypeScript stack
2. Single codebase for web PWA and iOS app
3. Provides sufficient native capabilities (audio, notifications, HealthKit)
4. Good track record with App Store approvals
5. Active development and community support

---

## 3. Recommended Approach: Capacitor

### Why Capacitor Works for RepCue

RepCue's architecture is already well-suited for Capacitor:

```
Current Stack                 Capacitor Addition
───────────────────────────   ─────────────────────────
React 19 + TypeScript    →    Same (no changes)
Vite 7 build system      →    Same (Capacitor uses dist/)
Tailwind CSS styling     →    Same (works in WebView)
IndexedDB (Dexie)        →    Same + native storage option
Service Worker (PWA)     →    Disabled for iOS app
Supabase backend         →    Same (API calls work)
```

### Capacitor Architecture

```
┌─────────────────────────────────────────────────┐
│                   iOS App                        │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │           Native iOS Container             │  │
│  │  (Swift/Objective-C - auto-generated)     │  │
│  └───────────────────────────────────────────┘  │
│                      │                           │
│  ┌───────────────────┴───────────────────────┐  │
│  │           Capacitor Bridge                 │  │
│  │    (JavaScript ↔ Native communication)    │  │
│  └───────────────────────────────────────────┘  │
│                      │                           │
│  ┌───────────────────┴───────────────────────┐  │
│  │              WKWebView                     │  │
│  │         (RepCue React App)                │  │
│  └───────────────────────────────────────────┘  │
│                      │                           │
│  ┌───────────────────┴───────────────────────┐  │
│  │          Capacitor Plugins                 │  │
│  │  • Push Notifications                      │  │
│  │  • Background Audio                        │  │
│  │  • Haptics                                 │  │
│  │  • HealthKit (optional)                   │  │
│  │  • Status Bar                              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 4. Prerequisites

### Development Environment

| Requirement | Details | Status |
|-------------|---------|--------|
| **macOS** | Required for iOS development | ✅ Ready |
| **Xcode 15+** | Latest stable version recommended | ✅ Installed (Xcode 26.1.1) |
| **Apple Developer Account** | $99/year for App Store distribution | ⬜ Needed |
| **Node.js 18+** | Already in use | ✅ Ready |
| **pnpm** | Already in use | ✅ Ready |
| **CocoaPods** | iOS dependency manager | ✅ Installed |

### Apple Developer Program

1. **Enroll at** [developer.apple.com](https://developer.apple.com/programs/)
2. **Cost**: $99/year (individual) or $299/year (organization)
3. **Requirements**: 
   - Valid Apple ID
   - Two-factor authentication enabled
   - Accept Apple Developer Agreement

### Code Signing Requirements

| Item | Purpose |
|------|---------|
| **Development Certificate** | Sign app for development/testing |
| **Distribution Certificate** | Sign app for App Store submission |
| **App ID** | Unique identifier (e.g., `com.repcue.app`) |
| **Provisioning Profiles** | Link certificates to devices/App Store |

---

## 5. Implementation Phases

### Phase 1: Capacitor Integration (Week 1) ✅ COMPLETE

#### 1.1 Install Capacitor Core ✅

```bash
# From apps/frontend directory
pnpm add @capacitor/core @capacitor/cli @capacitor/ios
```

#### 1.2 Initialize Capacitor ✅

```bash
npx cap init "RepCue" "com.repcue.app" --web-dir dist
```

#### 1.3 Create Capacitor Configuration ✅

Create `apps/frontend/capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.repcue.app',
  appName: 'RepCue',
  webDir: 'dist',
  server: {
    // For development - remove for production
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  ios: {
    scheme: 'RepCue',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Scroll bounce for native feel
    scrollEnabled: true,
    // Status bar appearance
    backgroundColor: '#0096C7'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0096C7',
      showSpinner: false
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0096C7'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
```

#### 1.4 Add iOS Platform ✅

```bash
npx cap add ios
```

This creates `apps/frontend/ios/` directory with Xcode project.

#### 1.5 Update Build Scripts ✅

Update `apps/frontend/package.json`:

```json
{
  "scripts": {
    "cap:build": "pnpm build:prod && npx cap copy ios",
    "cap:sync": "npx cap sync ios",
    "cap:open": "npx cap open ios",
    "cap:run": "npx cap run ios"
  }
}
```

### Phase 2: Native Plugin Integration (Week 2) ✅ COMPLETE

#### 2.1 Essential Plugins ✅

```bash
# Status bar control
pnpm add @capacitor/status-bar

# Haptic feedback
pnpm add @capacitor/haptics

# Local notifications (for timer alerts)
pnpm add @capacitor/local-notifications

# Push notifications (future - cloud sync notifications)
pnpm add @capacitor/push-notifications

# App lifecycle (background handling)
pnpm add @capacitor/app

# Splash screen
pnpm add @capacitor/splash-screen

# Keyboard handling
pnpm add @capacitor/keyboard

# Preferences (native storage)
pnpm add @capacitor/preferences

# Dialog plugin for native alerts
pnpm add @capacitor/dialog

# Sync plugins to native project
npx cap sync ios
```

**Installed Plugins (8 total):**
- @capacitor/app@7.1.0
- @capacitor/dialog@7.0.2
- @capacitor/haptics@7.0.2
- @capacitor/keyboard@7.0.3
- @capacitor/local-notifications@7.0.3
- @capacitor/preferences@7.0.2
- @capacitor/splash-screen@7.0.3
- @capacitor/status-bar@7.0.3

#### 2.2 Update Audio Service for iOS ✅

Modify `apps/frontend/src/services/audioService.ts` to use native audio for background playback:

```typescript
import { Capacitor } from '@capacitor/core';

export class AudioService {
  // ... existing code ...

  /**
   * Check if running in native iOS app
   */
  private isNativeIOS(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Play interval beep - enhanced for iOS
   */
  public async playIntervalBeep(volume: number = 0.45): Promise<void> {
    if (this.isNativeIOS()) {
      // Use native haptics + audio for better background support
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.notification({ type: 'WARNING' });
    }
    
    // Continue with Web Audio for actual sound
    // (or implement native audio player for background)
    // ... existing beep code ...
  }
}
```

#### 2.3 Add Native Haptics Support ✅

Create `apps/frontend/src/utils/nativeCapabilities.ts`:

```typescript
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const triggerHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
): Promise<void> => {
  if (!isNativePlatform()) return;
  
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  
  switch (type) {
    case 'light':
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'medium':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'heavy':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      break;
    case 'success':
      await Haptics.notification({ type: NotificationType.Success });
      break;
    case 'warning':
      await Haptics.notification({ type: NotificationType.Warning });
      break;
    case 'error':
      await Haptics.notification({ type: NotificationType.Error });
      break;
  }
};
```

### Phase 3: iOS-Specific UI Adjustments (Week 2-3) ✅ COMPLETE

> **Scope Clarification**: This phase covers core layout and behavior adjustments required for 
> the app to function correctly on iOS. Visual polish (iOS-style modals, spinners, etc.) is 
> deferred to Post-Launch Platform UI Polish phase to enable a unified approach across iOS, 
> Android, and Web.

#### 3.1 Safe Area Handling ✅

Update Tailwind/CSS to respect iOS safe areas:

```css
/* apps/frontend/src/index.css */

/* iOS safe area support */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}

/* Apply to main container */
.app-container {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
}
```

#### 3.2 Platform-Aware Feature Flags ✅

Since the web PWA and iOS app share the same codebase, use runtime platform detection to conditionally enable/disable features. This ensures web users still get install prompts and update notifications while iOS app users don't.

**Update `apps/frontend/src/config/features.ts`:**

```typescript
// ============================================
// Platform Detection for Feature Flags
// ============================================

// Lazy-loaded Capacitor detection to avoid import issues in web-only builds
let _isNativePlatform: boolean | null = null;
let _nativePlatform: string | null = null;

/**
 * Check if running inside a Capacitor native app (iOS or Android)
 * Cached after first call for performance
 */
export const isNativeApp = (): boolean => {
  if (_isNativePlatform === null) {
    try {
      // Dynamic import check - Capacitor sets this on window
      const capacitor = (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor;
      _isNativePlatform = capacitor?.isNativePlatform?.() ?? false;
    } catch {
      _isNativePlatform = false;
    }
  }
  return _isNativePlatform;
};

/**
 * Get the native platform ('ios', 'android', or 'web')
 */
export const getNativePlatform = (): 'ios' | 'android' | 'web' => {
  if (_nativePlatform === null) {
    try {
      const capacitor = (window as Window & { Capacitor?: { getPlatform: () => string } }).Capacitor;
      _nativePlatform = capacitor?.getPlatform?.() ?? 'web';
    } catch {
      _nativePlatform = 'web';
    }
  }
  return _nativePlatform as 'ios' | 'android' | 'web';
};

/**
 * Check if running as iOS native app
 */
export const isIOSApp = (): boolean => isNativeApp() && getNativePlatform() === 'ios';

/**
 * Check if running as Android native app (future use)
 */
export const isAndroidApp = (): boolean => isNativeApp() && getNativePlatform() === 'android';

/**
 * Check if running as web (PWA or browser)
 */
export const isWebApp = (): boolean => !isNativeApp();

// ============================================
// Platform-Aware Feature Flags
// ============================================

// PWA Install Prompt Controls
// - Web: Show install prompts (when flashing bug is fixed)
// - Native: Never show (already installed as native app)
export const INSTALL_PROMPT_ENABLED = false; // Base flag (disabled due to flashing bug)
export const INSTALL_PROMPT_IOS_ENABLED = false; // iOS PWA specific

/**
 * Should install prompts be shown?
 * Returns false for native apps, respects feature flag for web
 */
export const shouldShowInstallPrompt = (): boolean => {
  if (isNativeApp()) return false; // Never in native apps
  return INSTALL_PROMPT_ENABLED;
};

// PWA Update Prompt Controls
// - Web: Show update prompts for service worker updates
// - Native: App updates come through App Store
export const WEB_UPDATE_PROMPT_ENABLED = true;

/**
 * Should PWA update prompts be shown?
 * Returns false for native apps (they update via App Store)
 */
export const shouldShowUpdatePrompt = (): boolean => {
  if (isNativeApp()) return false;
  return WEB_UPDATE_PROMPT_ENABLED;
};

// Service Worker Registration
// - Web: Full service worker with update handling
// - Native: Service worker for caching only, no update UI
export const SERVICE_WORKER_ENABLED = true;

/**
 * Should service worker handle update prompts?
 * Native apps use SW for caching but not update UI
 */
export const shouldServiceWorkerPromptUpdates = (): boolean => {
  if (isNativeApp()) return false;
  return SERVICE_WORKER_ENABLED;
};

// Push Notifications Strategy
// - Web: Use Web Push API (when implemented)
// - Native: Use Capacitor Push Notifications plugin
export const WEB_PUSH_ENABLED = false; // Not yet implemented
export const NATIVE_PUSH_ENABLED = true; // Enable for native apps

/**
 * Which push notification system to use
 */
export const getPushNotificationStrategy = (): 'web' | 'native' | 'none' => {
  if (isNativeApp() && NATIVE_PUSH_ENABLED) return 'native';
  if (isWebApp() && WEB_PUSH_ENABLED) return 'web';
  return 'none';
};
```

#### 3.3 Update Dependent Components ✅

**Update `apps/frontend/src/hooks/useInstallPrompt.ts`:**

```typescript
import { shouldShowInstallPrompt, isNativeApp } from '../config/features';

export const useInstallPrompt = () => {
  // Early exit for native apps - no install prompts needed
  if (isNativeApp()) {
    return {
      isAvailable: false,
      canShowPrompt: false,
      isInstalling: false,
      installError: null,
      promptInstall: async () => {},
      needsManualInstructions: false,
      dismissPrompt: () => {},
    };
  }

  // Check feature flag for web
  if (!shouldShowInstallPrompt()) {
    return {
      isAvailable: false,
      // ... same structure
    };
  }

  // ... existing web install prompt logic
};
```

**Update `apps/frontend/src/services/updateService.ts`:**

```typescript
import { shouldShowUpdatePrompt, isNativeApp } from '../config/features';

class UpdateService {
  async checkForUpdates(): Promise<UpdateCheckResult> {
    // Native apps update through App Store, not service worker
    if (isNativeApp()) {
      return {
        available: false,
        source: 'app-store', // Informational
        message: 'Updates available through App Store'
      };
    }

    if (!shouldShowUpdatePrompt()) {
      return { available: false, source: 'disabled' };
    }

    // ... existing web update logic
  }

  async promptUserForUpdate(): Promise<void> {
    // Don't show update prompts in native apps
    if (!shouldShowUpdatePrompt()) {
      return;
    }

    // ... existing prompt logic
  }
}
```

**Update `apps/frontend/src/main.tsx` (Service Worker Registration):**

```typescript
import { 
  SERVICE_WORKER_ENABLED, 
  shouldServiceWorkerPromptUpdates,
  isNativeApp 
} from './config/features';

// Register service worker for both web and native (caching benefits both)
if (SERVICE_WORKER_ENABLED && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-custom.js')
    .then((registration) => {
      console.log('SW registered:', registration.scope);
      
      // Only set up update listeners for web PWA
      if (shouldServiceWorkerPromptUpdates()) {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Trigger update prompt for web users
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      }
    })
    .catch((error) => {
      console.error('SW registration failed:', error);
    });
}
```

#### 3.4 Feature Flag Summary Table ✅

| Feature | Flag | Web PWA | iOS App | Android App |
|---------|------|---------|---------|-------------|
| Install Prompts | `shouldShowInstallPrompt()` | ✅ Enabled* | ❌ Disabled | ❌ Disabled |
| Update Prompts | `shouldShowUpdatePrompt()` | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| Service Worker | `SERVICE_WORKER_ENABLED` | ✅ Enabled | ✅ Enabled | ✅ Enabled |
| SW Update UI | `shouldServiceWorkerPromptUpdates()` | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| Web Push | `WEB_PUSH_ENABLED` | ⏳ Future | ❌ N/A | ❌ N/A |
| Native Push | `NATIVE_PUSH_ENABLED` | ❌ N/A | ✅ Enabled | ✅ Enabled |

\* Currently disabled due to flashing bug, controlled by `INSTALL_PROMPT_ENABLED`

#### 3.5 Testing Platform Detection ✅

Add a debug utility to verify platform detection:

```typescript
// apps/frontend/src/utils/debugPlatform.ts
import { 
  isNativeApp, 
  isIOSApp, 
  isAndroidApp, 
  isWebApp,
  getNativePlatform,
  shouldShowInstallPrompt,
  shouldShowUpdatePrompt
} from '../config/features';

export const logPlatformInfo = (): void => {
  console.group('🔍 Platform Detection');
  console.log('isNativeApp:', isNativeApp());
  console.log('isIOSApp:', isIOSApp());
  console.log('isAndroidApp:', isAndroidApp());
  console.log('isWebApp:', isWebApp());
  console.log('Platform:', getNativePlatform());
  console.log('---');
  console.log('shouldShowInstallPrompt:', shouldShowInstallPrompt());
  console.log('shouldShowUpdatePrompt:', shouldShowUpdatePrompt());
  console.groupEnd();
};

// Call during development to verify
if (import.meta.env.DEV) {
  logPlatformInfo();
}
```

#### 3.6 iOS-Specific UI Polish (HIG Compliance) 🔄 DEFERRED TO POST-LAUNCH

> **Status Update (2025-12-04)**: iOS-specific UI components (`IOSModal`, `IOSSpinner`, iOS tokens) 
> were created but NOT integrated into the main UI. This is intentional - integrating iOS-only 
> components would create code paths that need to be duplicated for Android.
>
> **Post-Launch Strategy**: Create **platform-abstracted components** that automatically render:
> - iOS-style UI on iOS
> - Material-style UI on Android  
> - Current web UI on browsers
>
> This approach uses a single component API with platform detection inside, keeping the codebase 
> maintainable across all three platforms.

The following sections describe the iOS tokens and components that were created (and can be 
leveraged in the platform abstraction layer later):

##### 3.6.0 Add iOS Design Tokens to tokens.css ✅ CREATED (not actively used)

All iOS-specific styles should be added to `apps/frontend/src/styles/tokens.css`. This ensures consistency with the theme system and avoids inline styles.

**Add the following section to `tokens.css`:**

```css
/* ============================================
   iOS Native App Styles
   Applied when body has 'ios-app' class
   (automatically added by Capacitor on iOS)
   ============================================ */

/* iOS Semantic Colors */
:root {
  --ios-system-blue: #007AFF;
  --ios-system-red: #FF3B30;
  --ios-system-green: #34C759;
  --ios-separator: rgba(60, 60, 67, 0.36);
  --ios-modal-bg: rgba(255, 255, 255, 0.85);
  --ios-modal-radius: 14px;
  --ios-blur-intensity: 20px;
}

.dark {
  --ios-separator: rgba(142, 142, 147, 0.32);
  --ios-modal-bg: rgba(44, 44, 46, 0.85);
}

/* iOS Keyboard-aware Layout */
:root {
  --keyboard-height: 0px;
}

.keyboard-visible .nav-bottom {
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}

.keyboard-visible input:focus,
.keyboard-visible textarea:focus {
  scroll-margin-bottom: calc(var(--keyboard-height) + 1rem);
}

/* iOS Modal Container - frosted glass effect */
.ios-app .modal-ios {
  border-radius: var(--ios-modal-radius);
  backdrop-filter: blur(var(--ios-blur-intensity));
  -webkit-backdrop-filter: blur(var(--ios-blur-intensity));
  background: var(--ios-modal-bg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* iOS Modal Actions - stacked button layout */
.ios-app .modal-actions-ios {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
  border-top: 1px solid var(--ios-separator);
}

.ios-app .modal-actions-ios button {
  border-radius: 0;
  border-bottom: 1px solid var(--ios-separator);
  padding: 1rem;
  font-size: 17px;
  font-weight: 400;
  background: transparent;
  color: var(--color-text-primary);
}

.ios-app .modal-actions-ios button:last-child {
  border-bottom: none;
}

/* iOS Action Button Variants */
.ios-app .modal-actions-ios .btn-ios-primary {
  font-weight: 600;
  color: var(--ios-system-blue);
}

.ios-app .modal-actions-ios .btn-ios-destructive {
  color: var(--ios-system-red);
}

.ios-app .modal-actions-ios .btn-ios-cancel {
  font-weight: 600;
}

/* iOS System Font (optional - applied via ios-app class) */
.ios-app {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 
               'SF Pro Display', system-ui, sans-serif;
}

/* Preserve Arabic font for RTL in iOS */
.ios-app[lang="ar"],
.ios-app[lang="ar-EG"] {
  font-family: -apple-system-arabic, 'SF Arabic', 'Cairo', 
               'Noto Sans Arabic', system-ui, sans-serif;
}

/* iOS Spinner - 12 fading segments */
.ios-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ios-spinner svg {
  color: var(--color-text-tertiary);
}

/* iOS spinner sizes */
.ios-spinner-sm { width: 1rem; height: 1rem; }
.ios-spinner-md { width: 1.5rem; height: 1.5rem; }
.ios-spinner-lg { width: 2rem; height: 2rem; }

/* iOS Activity Indicator keyframes */
@keyframes ios-spinner-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

##### 3.6.1 Status Bar Integration ✅ IMPLEMENTED

```typescript
// apps/frontend/src/utils/iosStatusBar.ts
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Configure iOS status bar to match app theme
 * Call on app init and theme changes
 */
export const configureStatusBar = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return;
  }
  
  try {
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Set text color (light text for dark backgrounds, dark text for light)
    await StatusBar.setStyle({ 
      style: isDarkMode ? Style.Dark : Style.Light 
    });
    
    // Make status bar overlay content for immersive feel
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (error) {
    console.warn('Status bar configuration failed:', error);
  }
};

/**
 * Listen for theme changes and update status bar
 */
export const initStatusBarThemeSync = (): void => {
  if (!Capacitor.isNativePlatform()) return;
  
  // Watch for dark mode class changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        configureStatusBar();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
};
```

**Integration in App.tsx:**

```typescript
import { configureStatusBar, initStatusBarThemeSync } from './utils/iosStatusBar';

// In useEffect on mount:
useEffect(() => {
  configureStatusBar();
  initStatusBarThemeSync();
}, []);
```

##### 3.6.2 Keyboard Handling ✅ IMPLEMENTED

```typescript
// apps/frontend/src/utils/iosKeyboard.ts
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Configure iOS keyboard behavior for better UX
 * Updates --keyboard-height CSS variable for layout adjustments
 */
export const configureKeyboard = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return;
  }
  
  try {
    // Resize body when keyboard shows (ensures inputs aren't hidden)
    await Keyboard.setResizeMode({ mode: 'body' });
    
    // Add keyboard event listeners to update CSS variable
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-visible');
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-visible');
    });
  } catch (error) {
    console.warn('Keyboard configuration failed:', error);
  }
};
```

> **Note:** The CSS classes `.keyboard-visible`, `.nav-bottom` are defined in tokens.css (see 3.6.0).

##### 3.6.3 iOS-Style Modal Dialogs ⬜ CREATED (not integrated)

> Component `IOSModal.tsx` exists but is not used by the app. Will be integrated via platform abstraction layer post-launch.

Use the token-based classes defined in 3.6.0 for iOS modal styling:

```tsx
// apps/frontend/src/components/ui/Modal.tsx
import { isIOSApp } from '../../config/features';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${isIOSApp() ? 'modal-ios' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
        {actions && (
          <div className={isIOSApp() ? 'modal-actions-ios' : 'modal-actions'}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Usage with iOS button variants:**

```tsx
<Modal isOpen={true} onClose={handleClose}>
  <p>Are you sure you want to delete this workout?</p>
  <div className={isIOSApp() ? 'modal-actions-ios' : 'modal-actions'}>
    <button className="btn-ios-destructive" onClick={handleDelete}>
      Delete
    </button>
    <button className="btn-ios-cancel" onClick={handleClose}>
      Cancel
    </button>
  </div>
</Modal>
```

**Apply iOS class to body (in main.tsx):**

```typescript
// apps/frontend/src/main.tsx
import { Capacitor } from '@capacitor/core';

// Add iOS class for platform-specific styles (defined in tokens.css)
if (Capacitor.getPlatform() === 'ios') {
  document.body.classList.add('ios-app');
}
```

##### 3.6.4 Native-Style Loading Indicators ⬜ CREATED (not integrated)

> Component `IOSSpinner.tsx` exists but is not used by the app. Will be integrated via platform abstraction layer post-launch.

Use the token-based spinner classes:

```tsx
// apps/frontend/src/components/ui/Spinner.tsx
import { isIOSApp } from '../../config/features';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  // Token-based size classes
  const sizeClasses = {
    sm: isIOSApp() ? 'ios-spinner-sm' : 'w-4 h-4',
    md: isIOSApp() ? 'ios-spinner-md' : 'w-6 h-6',
    lg: isIOSApp() ? 'ios-spinner-lg' : 'w-8 h-8'
  };

  // iOS-style spinner using token classes
  if (isIOSApp()) {
    return (
      <div className={`ios-spinner ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="animate-spin w-full h-full">
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="12" y1="2" x2="12" y2="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity={1 - (i * 0.08)}
              transform={`rotate(${i * 30} 12 12)`}
            />
          ))}
        </svg>
      </div>
    );
  }

  // Default circular spinner for web
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle 
          cx="12" cy="12" r="10" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeOpacity="0.25"
        />
        <path 
          d="M12 2a10 10 0 0 1 10 10" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
```

##### 3.6.5 Replace window.alert() with Native Dialogs ⬜ CREATED (not integrated)

> Utility `nativeDialog.ts` exists with `showAlert()` and `showConfirm()` but no components use it yet. Will be integrated via platform abstraction layer post-launch.

Audit and replace any `window.alert()` or `window.confirm()` calls:

```typescript
// apps/frontend/src/utils/nativeDialog.ts
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

/**
 * Show alert dialog (native on iOS, standard on web)
 */
export const showAlert = async (options: {
  title: string;
  message: string;
  buttonTitle?: string;
}): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Dialog.alert({
      title: options.title,
      message: options.message,
      buttonTitle: options.buttonTitle || 'OK'
    });
  } else {
    // Fallback - ideally use a custom modal component
    window.alert(`${options.title}\n\n${options.message}`);
  }
};

/**
 * Show confirm dialog (native on iOS, standard on web)
 */
export const showConfirm = async (options: {
  title: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Dialog.confirm({
      title: options.title,
      message: options.message,
      okButtonTitle: options.okButtonTitle || 'OK',
      cancelButtonTitle: options.cancelButtonTitle || 'Cancel'
    });
    return value;
  } else {
    return window.confirm(`${options.title}\n\n${options.message}`);
  }
};
```

##### 3.6.6 Pull-to-Refresh (If Applicable) ⬜ NOT IMPLEMENTED

> Not needed for current app functionality. Can be added post-launch if required.

If any screens need refresh functionality:

```typescript
// apps/frontend/src/hooks/usePullToRefresh.ts
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    // Native pull-to-refresh would be implemented via
    // a Capacitor plugin or custom native code
    // For now, this is a placeholder for future enhancement
  }, [onRefresh]);
};
```

##### 3.6.7 Token Classes Reference ✅ CREATED

The following classes are added to `tokens.css` for iOS native styling (available for future use):

| Class | Purpose | Applied When |
|-------|---------|--------------|
| `.ios-app` | Root class for iOS platform | Body element |
| `.modal-ios` | iOS frosted glass modal | Modal containers |
| `.modal-actions-ios` | Stacked action buttons | Modal action areas |
| `.btn-ios-primary` | Primary action (blue) | Confirm buttons |
| `.btn-ios-destructive` | Destructive action (red) | Delete buttons |
| `.btn-ios-cancel` | Cancel action (bold) | Cancel buttons |
| `.ios-spinner` | iOS-style spinner container | Loading states |
| `.ios-spinner-sm/md/lg` | Spinner sizes | Loading states |
| `.keyboard-visible` | Active keyboard state | Body when keyboard shown |

**CSS Variables for iOS:**

| Variable | Purpose | Light | Dark |
|----------|---------|-------|------|
| `--ios-system-blue` | iOS blue tint | #007AFF | #007AFF |
| `--ios-system-red` | iOS red tint | #FF3B30 | #FF3B30 |
| `--ios-separator` | Divider lines | rgba(60,60,67,0.36) | rgba(142,142,147,0.32) |
| `--ios-modal-bg` | Modal background | rgba(255,255,255,0.85) | rgba(44,44,46,0.85) |
| `--ios-modal-radius` | Modal corners | 14px | 14px |
| `--keyboard-height` | Dynamic keyboard height | 0px | 0px |

### Phase 4: Privacy Manifest & App Store Prep (Week 3) ✅ COMPLETE

#### 4.1 Create Privacy Manifest ✅

Create `apps/frontend/ios/App/Resources/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <!-- UserDefaults API (used by Capacitor Preferences plugin) -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <!-- System Boot Time API (if used for timing) -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>35F9.1</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <!-- Email for account creation -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <!-- Fitness data (workout logs) -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeFitness</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

#### 4.2 App Icons for iOS ✅

Create iOS-specific app icons (required sizes):

| Size | Use Case |
|------|----------|
| 20x20 @2x, @3x | Notification |
| 29x29 @2x, @3x | Settings |
| 40x40 @2x, @3x | Spotlight |
| 60x60 @2x, @3x | App Icon (iPhone) |
| 76x76 @1x, @2x | App Icon (iPad) |
| 83.5x83.5 @2x | App Icon (iPad Pro) |
| 1024x1024 | App Store |

Generate using `scripts/generate-ios-icons.mjs` (to be created).

#### 4.3 Launch Screen ✅

Configure launch screen in Xcode or via `LaunchScreen.storyboard`:
- Use existing splash screen assets
- Configure for all device sizes
- Support light/dark mode

### Phase 5: Testing & Optimization (Week 4) ✅ COMPLETE

#### 5.1 Local Testing ✅

```bash
# Build and sync
pnpm cap:build

# Open in Xcode
pnpm cap:open

# Or run directly on simulator
pnpm cap:run
```

#### 5.2 TestFlight Beta Testing ⬜ PENDING

1. Archive app in Xcode
2. Upload to App Store Connect
3. Invite beta testers via TestFlight
4. Collect feedback and iterate

#### 5.3 Performance Optimization ✅

- Profile WebView performance in Instruments
- Optimize bundle size (already using Vite code splitting)
- Test on older devices (iPhone SE, iPhone 8)

### Phase 6: App Store Submission (Week 5-6) ⬜ NOT STARTED

See [Section 7](#7-app-store-submission-requirements) for detailed requirements.

---

## 6. iOS-Specific Features

### 6.1 Background Audio (Timer Continuation) ⬜ PENDING

To keep timer audio playing when the app is backgrounded:

**Enable Audio Background Mode:**

In Xcode → Project → Capabilities → Background Modes:
- [x] Audio, AirPlay, and Picture in Picture

**Implement AVAudioSession:**

Create native plugin or use existing solution for background audio continuity.

### 6.2 HealthKit Integration (Optional - Phase 2) ⬜ FUTURE

If desired, integrate with Apple Health to log workouts:

```bash
pnpm add @nicknisi/capacitor-healthkit
# Or use: capacitor-healthkit
```

**Requirements:**
- Enable HealthKit capability in Xcode
- Request user permission
- Add usage description in Info.plist

### 6.3 Local Notifications for Timer ✅

Use `@capacitor/local-notifications` for:
- Timer completion alerts
- Rest period reminders
- Workout reminders (future)

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Schedule notification for timer completion
await LocalNotifications.schedule({
  notifications: [
    {
      id: 1,
      title: 'Set Complete!',
      body: 'Time for your rest period',
      sound: 'beep.wav',
      schedule: { at: new Date(Date.now() + timerDuration) }
    }
  ]
});
```

### 6.4 Native Share Sheet ✅

Already supported via Web Share API, but can enhance with:

```typescript
import { Share } from '@capacitor/share';

await Share.share({
  title: 'My Workout',
  text: 'Check out my workout on RepCue!',
  url: 'https://repcue.app/workout/123'
});
```

### 6.5 Offline-First Architecture in Capacitor ✅

RepCue's offline-first principle is **fully preserved** in the Capacitor iOS app:

#### How Offline Support Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Capacitor iOS App                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   WKWebView                          │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │            Service Worker (sw-custom.js)       │  │    │
│  │  │  • Precached app shell ✅                      │  │    │
│  │  │  • Runtime caching (fonts, videos, i18n) ✅   │  │    │
│  │  │  • Offline fallback pages ✅                   │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │                         │                            │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │              IndexedDB (Dexie)                 │  │    │
│  │  │  • Exercises, workouts, logs ✅               │  │    │
│  │  │  • User preferences ✅                         │  │    │
│  │  │  • Sync metadata ✅                            │  │    │
│  │  │  • Video cache ✅                              │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Native Storage (Optional Fallback)         │    │
│  │  • @capacitor/preferences for critical settings     │    │
│  │  • Native file system for large assets              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### Storage Comparison: Web vs Capacitor iOS

| Storage Type | Web PWA | Capacitor iOS | Notes |
|--------------|---------|---------------|-------|
| **IndexedDB** | ✅ Works | ✅ Works (same) | Primary data store |
| **Service Worker Cache** | ✅ Works | ✅ Works (same) | Asset caching |
| **localStorage** | ✅ 5-10MB | ✅ 5-10MB | Consent flags |
| **Capacitor Preferences** | ❌ N/A | ✅ Native | Optional backup |
| **Native File System** | ❌ N/A | ✅ Native | Large video files |

#### Key Points

1. **IndexedDB is your primary store** - Works identically in WKWebView as in Safari
2. **Service Worker caching works** - iOS 14+ WKWebView fully supports SW
3. **No code changes needed** for core offline logic
4. **Optional native enhancement** - Can use Capacitor Preferences as a backup for critical settings

#### Optional: Hybrid Storage Strategy

For extra reliability, you could add native storage as a fallback:

```typescript
// apps/frontend/src/utils/hybridStorage.ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const saveCriticalSetting = async (key: string, value: string): Promise<void> => {
  // Always save to IndexedDB (primary)
  await storageService.saveSetting(key, value);
  
  // Also save to native storage on iOS (backup)
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value });
  }
};

export const getCriticalSetting = async (key: string): Promise<string | null> => {
  // Try IndexedDB first
  const value = await storageService.getSetting(key);
  if (value) return value;
  
  // Fallback to native storage on iOS
  if (Capacitor.isNativePlatform()) {
    const { value: nativeValue } = await Preferences.get({ key });
    return nativeValue;
  }
  
  return null;
};
```

#### Testing Offline Mode

```bash
# On iOS Simulator
# 1. Build and run the app
pnpm cap:build && pnpm cap:run

# 2. Enable airplane mode in Simulator
# Hardware → Airplane Mode (or toggle in Control Center)

# 3. Verify:
# - App loads without network
# - Timer functions work
# - Exercise data displays
# - Workouts can be created/saved
# - Data syncs when back online
```

---

## 7. App Store Submission Requirements

### 7.1 Avoiding Guideline 4.2 Rejection

Apple's guideline 4.2 states:
> "Your app should include features, content, and UI that elevate it beyond a repackaged website."

**How RepCue Differentiates:**

| Native Feature | Implementation |
|---------------|----------------|
| **Background Timer Audio** | AVAudioSession + Background Modes |
| **Native Haptics** | Capacitor Haptics plugin |
| **Local Notifications** | Timer completion alerts |
| **HealthKit (optional)** | Workout sync with Apple Health |
| **Native Share** | System share sheet |
| **Offline Capability** | Full offline-first with IndexedDB |

### 7.2 Required Assets

| Asset | Specification |
|-------|---------------|
| **App Icon** | 1024x1024 PNG (no alpha) |
| **Screenshots** | iPhone 6.7" (1290×2796), 6.5" (1284×2778), 5.5" (1242×2208) |
| **iPad Screenshots** | 12.9" (2048×2732) - if supporting iPad |
| **Preview Video** | Optional, 15-30 seconds |

### 7.3 App Store Connect Metadata

```yaml
App Information:
  Name: RepCue - Fitness Timer
  Subtitle: Interval Training Tracker
  Category: Health & Fitness
  Secondary Category: Sports
  
Privacy Policy URL: https://repcue.app/legal/privacy
Support URL: https://repcue.app/support
Marketing URL: https://repcue.app

Description: |
  RepCue is a privacy-first fitness timer and workout tracker designed 
  for interval training. Whether you're doing Pilates, strength training, 
  or HIIT workouts, RepCue helps you stay on track with customizable 
  timers, rest periods, and workout logging.

  KEY FEATURES:
  • Customizable interval timer with audio and haptic feedback
  • 80+ built-in exercises across multiple categories
  • Create and save custom workouts
  • Track workout history and progress
  • Works completely offline
  • Multi-language support (8 languages)
  • Privacy-first: your data stays on your device
  • Optional cloud sync for backup

Keywords: fitness, timer, workout, interval, training, exercise, pilates, hiit, tracker
```

### 7.4 Privacy Information

Required for App Store Connect:

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Email Address | Yes | Yes | No |
| Fitness Data | Yes | Yes | No |
| Usage Data | No | - | No |
| Diagnostics | No | - | No |

### 7.5 Review Guidelines Checklist

- [ ] App provides native-feeling experience (not just website wrapper)
- [ ] All links work and open appropriately
- [ ] Privacy policy is accessible
- [ ] No placeholder content
- [ ] All features work as described
- [ ] App works offline where applicable
- [ ] No crashes or major bugs
- [ ] Supports latest iOS version
- [ ] Minimum iOS version: iOS 14.0 (or as appropriate)

---

## 8. Risk Assessment

### 8.1 Apple Human Interface Guidelines (HIG) Compliance

Apple's Human Interface Guidelines are critical for App Store approval. Apps that don't follow HIG face rejection or poor user experience. Here's RepCue's current compliance status:

#### ✅ **What RepCue Already Does Well**

| HIG Requirement | RepCue Implementation | Status |
|-----------------|----------------------|--------|
| **Touch Targets (44pt minimum)** | `.touch-target` class with `min-h-[2.75rem]` (44px), nav buttons 56px height | ✅ Compliant |
| **Safe Area Support** | CSS env() for safe-area-inset-*, `.pb-safe` and `.pt-safe` utilities | ✅ Compliant |
| **Dark Mode** | Full dark mode via Tailwind `dark:` classes and CSS variables | ✅ Compliant |
| **Reduced Motion** | `@media (prefers-reduced-motion)` disables animations | ✅ Compliant |
| **High Contrast** | `@media (prefers-contrast: high)` support in CSS | ✅ Compliant |
| **Accessibility Labels** | aria-label on all interactive elements | ✅ Compliant |
| **Focus States** | Visible focus rings (`:focus-visible`, ring colors) | ✅ Compliant |
| **Typography Scale** | Semantic scale (h1: 32px, h2: 24px, body: 16px) | ✅ Compliant |
| **Color Contrast** | Design tokens ensure WCAG AA contrast ratios | ✅ Compliant |
| **RTL Support** | Full RTL for Arabic (body.rtl, logical properties) | ✅ Compliant |
| **Screen Reader** | Skip links, sr-only, aria-live regions | ✅ Compliant |
| **8pt Grid System** | Spacing tokens follow 8pt grid | ✅ Compliant |
| **Haptic Feedback** | Vibration API used for timer events | ✅ Compliant |

#### ⚠️ **Areas Needing Attention for iOS Native** (Post-Launch Polish)

> **Note**: These items enhance the iOS experience but are NOT required for App Store approval.
> They are deferred to the Post-Launch Platform UI Polish phase to enable a unified approach 
> across iOS, Android, and Web.

| HIG Requirement | Current State | Post-Launch Plan |
|-----------------|---------------|------------------|
| **Navigation Bar Style** | Custom bottom tab bar | Review as part of platform abstraction |
| **Status Bar** | ✅ Capacitor Status Bar plugin integrated | Done |
| **System Fonts** | Inter font family | Optional - Inter is fine for hybrid apps |
| **Pull-to-Refresh** | Not implemented | Add if user feedback requests it |
| **Swipe Gestures** | Limited swipe support | Consider for list interactions |
| **Loading States** | Custom spinners | Platform-aware spinner component |
| **Alerts/Modals** | Custom styled modals | Platform-aware dialog component |
| **Keyboard Avoidance** | ✅ Capacitor Keyboard plugin integrated | Done |

#### 🔴 **Critical HIG Requirements for App Store Approval**

These are non-negotiable for avoiding rejection:

1. **App Must Provide Value Beyond Website**
   - ✅ RepCue has: Timer functionality, offline support, haptic feedback
   - ✅ Native notifications via Capacitor plugin
   - ⬜ Background audio (future enhancement)

2. **No Placeholder Content**
   - ✅ RepCue has: 87 real exercises, full functionality
   - ✅ All content is real, no lorem ipsum

3. **All Features Must Work**
   - ✅ Run full test suite before submission
   - ✅ Offline mode, sync, timer, all user flows tested

4. **Privacy Compliance**
   - ✅ Privacy policy exists
   - ✅ Privacy manifest (PrivacyInfo.xcprivacy) created

5. **No Web-Only Behaviors**
   - 🔧 Hide: Browser-specific UI (install prompts, etc.)
   - 🔧 Replace: `window.alert()` with native-style modals

#### iOS-Specific UI Adjustments Needed

**1. Navigation Tab Bar Styling**

```typescript
// Capacitor config for iOS-specific styling
ios: {
  // Use translucent navigation style
  backgroundColor: '#ffffff',
  contentInset: 'automatic',
  preferredContentMode: 'mobile'
}
```

**2. Status Bar Integration**

```typescript
// apps/frontend/src/utils/iosStatusBar.ts
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const configureStatusBar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  // Set status bar style based on theme
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  await StatusBar.setStyle({ 
    style: isDarkMode ? Style.Dark : Style.Light 
  });
  
  // On iOS, make status bar overlay content for immersive feel
  await StatusBar.setOverlaysWebView({ overlay: true });
};
```

**3. System Font Option (Optional Enhancement)**

For a more native iOS feel, you can use San Francisco font:

```css
/* apps/frontend/src/index.css - Add iOS system font option */
@supports (-webkit-touch-callout: none) {
  /* iOS Safari / WKWebView */
  .use-system-font {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 
                 'SF Pro Display', system-ui, sans-serif;
  }
}
```

**4. Native-Style Loading Indicators**

```tsx
// apps/frontend/src/components/ui/LoadingSpinner.tsx
import { Capacitor } from '@capacitor/core';

const LoadingSpinner: React.FC = () => {
  // Use iOS-style spinner on native
  if (Capacitor.getPlatform() === 'ios') {
    return (
      <div className="ios-spinner">
        {/* 12-segment iOS spinner */}
        <svg className="animate-spin" viewBox="0 0 24 24">
          {/* iOS-style spinner segments */}
        </svg>
      </div>
    );
  }
  
  // Default spinner for web
  return <div className="spinner-default">...</div>;
};
```

**5. Modal/Alert Styling**

Ensure modals follow iOS patterns:

```css
/* iOS-style modal adjustments */
.modal-ios {
  border-radius: 14px; /* iOS standard corner radius */
  backdrop-filter: blur(20px); /* Frosted glass effect */
  background: rgba(255, 255, 255, 0.8);
}

.dark .modal-ios {
  background: rgba(30, 30, 30, 0.8);
}

/* Modal actions should be stacked on iOS when > 2 buttons */
.modal-actions-ios {
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--color-border-primary);
}

.modal-actions-ios button {
  border-radius: 0;
  border-bottom: 1px solid var(--color-border-primary);
  padding: 1rem;
}
```

#### HIG Compliance Checklist Before Submission

```markdown
## Pre-Submission HIG Checklist

### Visual Design
- [ ] Touch targets are at least 44pt × 44pt
- [ ] Safe areas respected (notch, home indicator)
- [ ] Dark mode works correctly throughout app
- [ ] Colors meet contrast requirements
- [ ] Typography is readable and consistent
- [ ] Icons are clear and consistent style

### Interaction
- [ ] Buttons provide visual feedback on tap
- [ ] Haptic feedback on appropriate actions
- [ ] Smooth 60fps animations
- [ ] Reduced motion preference respected
- [ ] Keyboard doesn't obscure inputs
- [ ] Pull-to-refresh where appropriate

### Navigation
- [ ] Tab bar follows iOS conventions
- [ ] Back navigation works correctly
- [ ] Modal presentation matches iOS style
- [ ] Gestures don't conflict with system gestures

### Content
- [ ] All text is localized (no hardcoded English)
- [ ] No placeholder or lorem ipsum content
- [ ] Error messages are helpful and actionable
- [ ] Empty states provide guidance

### Accessibility
- [ ] VoiceOver works on all screens
- [ ] All images have alt text
- [ ] Focus order is logical
- [ ] Dynamic Type supported (text scales)

### Privacy & Security
- [ ] Privacy manifest included
- [ ] Data collection disclosed
- [ ] Permission requests explained
- [ ] Secure data handling
```

### High Risk

| Risk | Mitigation |
|------|------------|
| **Apple Rejection (4.2)** | Add clear native features (haptics, background audio, notifications) |
| **WebView Performance** | Profile and optimize; consider lazy loading |
| **Background Timer Stops** | Implement proper AVAudioSession handling |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| **Privacy Manifest Issues** | Follow Apple's guidelines carefully; test on TestFlight |
| **App Review Delays** | Submit early; use expedited review if critical |
| **Plugin Compatibility** | Use well-maintained Capacitor plugins |

### Low Risk

| Risk | Mitigation |
|------|------------|
| **IndexedDB in WebView** | Well-supported; same as Safari PWA |
| **Supabase Connectivity** | Already tested and working |
| **i18n Support** | Already implemented, works in WebView |

---

## 9. Testing Strategy

### 9.1 Unit Tests

Existing Vitest tests continue to work for web logic.

### 9.2 iOS-Specific Testing

| Test Type | Tools | Coverage |
|-----------|-------|----------|
| **Simulator Testing** | Xcode Simulator | All device sizes |
| **Device Testing** | Real iPhone/iPad | Performance, haptics, audio |
| **TestFlight Beta** | App Store Connect | Real user feedback |
| **UI Automation** | XCTest / Detox | Critical user flows |

### 9.3 Test Scenarios

- [ ] Timer starts and audio plays
- [ ] Timer continues when app backgrounded
- [ ] Haptic feedback on interval completion
- [ ] Local notification fires on timer end
- [ ] Safe area insets render correctly
- [ ] Offline mode works (airplane mode)
- [ ] Data syncs when online
- [ ] All exercises display correctly
- [ ] Video playback works
- [ ] Settings persist after app restart

---

## 10. Cost Analysis

### One-Time Costs

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| Mac for development (if needed) | $1,000-2,000 |
| App Store graphics/assets | $0-500 |

### Ongoing Costs

| Item | Cost |
|------|------|
| Apple Developer Program Renewal | $99/year |
| Infrastructure (already covered) | $0 |

### Total First Year: ~$99-2,600

---

## 11. Timeline

```
Week 1: Capacitor Setup
├── Install Capacitor and dependencies
├── Configure capacitor.config.ts
├── Add iOS platform
└── Basic build verification

Week 2: Native Features
├── Install Capacitor plugins
├── Implement haptic feedback
├── Configure status bar
├── Background audio research

Week 3: UI Polish & Privacy
├── Safe area adjustments
├── iOS-specific styling
├── Privacy manifest
├── App icons and launch screen

Week 4: Testing
├── Simulator testing
├── Device testing
├── Bug fixes
├── Performance optimization

Week 5: Beta Release
├── TestFlight setup
├── Beta tester invitations
├── Feedback collection
├── Iteration

Week 6: App Store Submission
├── Final testing
├── Metadata preparation
├── Screenshots
├── Submit for review
```

---

## 12. Success Criteria

### Launch Criteria

- [ ] App approved on App Store
- [ ] No critical bugs reported
- [ ] Timer functionality works reliably
- [ ] Background audio functions correctly
- [ ] 4+ star average rating goal

### Post-Launch Metrics

| Metric | Target |
|--------|--------|
| App Store Rating | 4.5+ stars |
| Crash-Free Sessions | 99%+ |
| Daily Active Users | Track growth |
| Retention (Day 7) | 30%+ |
| App Store Ranking | Top 200 in Health & Fitness (Free) |

---

## Appendix A: File Structure After Capacitor

```
apps/frontend/
├── ios/                          # NEW - iOS native project
│   ├── App/
│   │   ├── App/
│   │   │   ├── AppDelegate.swift
│   │   │   ├── Info.plist
│   │   │   └── capacitor.config.json
│   │   ├── App.xcodeproj/
│   │   └── Resources/
│   │       └── PrivacyInfo.xcprivacy  # NEW - Privacy manifest
│   └── Podfile
├── capacitor.config.ts           # NEW - Capacitor configuration
├── package.json                  # Updated with cap scripts
├── src/
│   ├── utils/
│   │   └── nativeCapabilities.ts # NEW - Native feature helpers
│   └── ... (existing files)
└── dist/                         # Built web app (copied to iOS)
```

---

## Appendix B: Commands Reference

```bash
# Initial setup
pnpm add @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "RepCue" "com.repcue.app" --web-dir dist
npx cap add ios

# Development workflow
pnpm build:prod          # Build web app
npx cap copy ios         # Copy web assets to iOS
npx cap sync ios         # Sync plugins and copy
npx cap open ios         # Open in Xcode
npx cap run ios          # Run on simulator/device

# Shorthand scripts (add to package.json)
pnpm cap:build           # Build + copy
pnpm cap:sync            # Sync all
pnpm cap:open            # Open Xcode
pnpm cap:run             # Run on device

# Plugin installation
pnpm add @capacitor/haptics @capacitor/status-bar
pnpm add @capacitor/local-notifications
pnpm add @capacitor/push-notifications
npx cap sync ios
```

---

## Appendix C: Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Deploying to App Store](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Privacy Manifest Guide](https://capacitorjs.com/docs/ios/privacy-manifest)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

---

**Document Status**: Ready for Review  
**Next Steps**: 
1. Confirm macOS development environment availability
2. Enroll in Apple Developer Program
3. Begin Phase 1 implementation
