# Platform Abstraction Architecture

**Last Updated**: 2025-12-07  
**Version**: 1.1.0

RepCue is designed as a cross-platform application that delivers native-quality experiences on iOS, Android, and Web. This document describes the platform abstraction architecture that enables a single codebase to adapt its behavior, appearance, and functionality based on the runtime platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Platform Detection](#platform-detection)
3. [Platform Context System](#platform-context-system)
4. [Platform-Abstracted Components](#platform-abstracted-components)
5. [Design Token System](#design-token-system)
6. [Deep Linking Architecture](#deep-linking-architecture)
7. [Authentication Flow Differences](#authentication-flow-differences)
8. [Navigation & Page Behavior](#navigation--page-behavior)
9. [Platform-Specific Features](#platform-specific-features)
10. [Testing Considerations](#testing-considerations)

---

## Overview

### Design Philosophy

RepCue follows a **"write once, adapt everywhere"** philosophy:

- **Single codebase**: React + TypeScript for all platforms
- **Runtime adaptation**: Platform detection at runtime, not build time
- **Native feel**: Components render differently to match platform conventions
- **Progressive enhancement**: Core functionality works everywhere; native features enhance the experience

### Platform Targets

| Platform | Runtime | Wrapper | Key Features |
|----------|---------|---------|--------------|
| **iOS** | WKWebView | Capacitor 7.4.4 | Haptics, native dialogs, Universal Links, safe areas |
| **Android** | WebView | Capacitor (future) | Material Design, App Links, ripple effects |
| **Web** | Browser | N/A | PWA, standard mouse/keyboard, responsive design |

---

## Platform Detection

### Core Utility: `nativeCapabilities.ts`

Platform detection happens at runtime using Capacitor's detection APIs:

```typescript
// apps/frontend/src/utils/nativeCapabilities.ts

import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

export const isIOS = (): boolean => {
  return isNativePlatform() && getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return isNativePlatform() && getPlatform() === 'android';
};

export const isWeb = (): boolean => {
  return !isNativePlatform();
};
```

### Key Insight: Runtime vs Build Time

Unlike traditional hybrid apps that use preprocessor flags, RepCue detects the platform at **runtime**. This means:

- The same built bundle runs on all platforms
- No separate iOS/Android/Web builds required
- Platform differences are handled through conditional rendering and CSS

---

## Platform Context System

### PlatformContext Provider

The `PlatformContext` provides platform information throughout the component tree:

```typescript
// apps/frontend/src/contexts/PlatformContext.tsx

export interface PlatformContextValue {
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  supportsHaptics: boolean;
  supportsNativeDialogs: boolean;
  hasSafeArea: boolean;
}
```

### Usage in Components

```tsx
import { usePlatform } from '../contexts/PlatformContext';

const MyComponent: React.FC = () => {
  const { isIOS, isNative, hasSafeArea } = usePlatform();

  return (
    <div className={hasSafeArea ? 'safe-area-bottom' : ''}>
      {isIOS ? <IOSStyleButton /> : <WebStyleButton />}
    </div>
  );
};
```

### Platform-Specific Class Helper

```tsx
import { usePlatformClasses } from '../contexts/PlatformContext';

const Card: React.FC = () => {
  const { platformClass } = usePlatformClasses();

  return (
    <div className={platformClass({
      base: 'rounded-lg p-4',
      ios: 'bg-white/80 backdrop-blur-xl',
      android: 'bg-white shadow-md',
      web: 'bg-white border border-gray-200'
    })}>
      Content
    </div>
  );
};
```

---

## Platform-Abstracted Components

RepCue provides a library of components that automatically adapt to the platform:

### Component Overview

| Component | iOS Behavior | Android Behavior | Web Behavior |
|-----------|--------------|------------------|--------------|
| `PlatformSpinner` | 8-segment fading lines | Material circular progress | Border-based spinner |
| `PlatformModal` | Bottom sheet with drag handle | Material dialog (future) | Centered overlay |
| `PlatformTabBar` | 49px blur backdrop, SF Symbol icons | 56dp with ripple effects | Standard buttons with hover |
| `PullToRefresh` | Native iOS refresh indicator | Material pull behavior (future) | No-op (handled by browser) |
| `PlatformConfirmDialog` | Native iOS alert | Material dialog (future) | Standard confirm modal |

### PlatformSpinner

Adapts spinner appearance to platform conventions:

```tsx
// iOS: 8-segment fading line spinner (SF Symbol style)
// Android: Material circular progress animation
// Web: CSS border-based spinner

<PlatformSpinner 
  size="medium"           // 'small' | 'medium' | 'large'
  color="#0096C7"         // Optional custom color
  label="Loading..."      // Accessibility label
/>
```

### PlatformModal

Automatically renders as a bottom sheet on iOS/Android or centered modal on web:

```tsx
<PlatformModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Edit Exercise"
  sheetOnMobile={true}    // Show as sheet on native (default: true)
  showHandle={true}       // Show drag handle on sheets
  size="medium"           // Web only: 'small' | 'medium' | 'large'
>
  <FormContent />
</PlatformModal>
```

### PlatformTabBar

Follows Apple Human Interface Guidelines on iOS, Material Design on Android:

```tsx
<PlatformTabBar
  tabs={[
    { id: 'home', label: 'Home', icon: HomeIcon, isActive: true, onClick: goHome },
    { id: 'exercises', label: 'Exercises', icon: DumbbellIcon, isActive: false, onClick: goExercises },
  ]}
  showMore={true}
  moreItems={additionalMenuItems}
/>
```

**iOS-specific styling:**
- 49px height (per HIG)
- Blur backdrop with 20px blur
- SF Symbol-style icons (1.5 stroke width)
- 10px tab labels with -0.24px letter spacing

### PullToRefresh

Only active on iOS native; gracefully degrades elsewhere:

```tsx
<PullToRefresh onRefresh={async () => await fetchData()}>
  <ScrollableContent />
</PullToRefresh>
```

**Implementation Notes:**
- Uses `usePullToRefresh` hook for touch gesture handling
- Shows `IOSPullToRefresh` indicator on iOS only
- Threshold-based triggering (default 80px pull distance)
- Content shifts down during pull (parallax effect)

---

## Design Token System

### Multi-Layer Token Architecture

RepCue uses a layered token system that integrates theme customization with platform-specific values:

```
┌─────────────────────────────────────────────┐
│  Theme Layer (Dynamic)                      │
│  Set by ThemeService, changes at runtime    │
│  --color-primary, --color-secondary, etc.   │
├─────────────────────────────────────────────┤
│  iOS Semantic Layer                         │
│  Apple HIG colors                           │
│  --ios-system-blue, --ios-label-primary     │
├─────────────────────────────────────────────┤
│  Platform Component Layer                   │
│  Platform-specific component styles         │
│  .platform-tabbar--ios, .platform-modal     │
└─────────────────────────────────────────────┘
```

### Theme Tokens (`tokens.css`)

Core semantic colors that adapt to light/dark mode:

```css
:root {
  /* Primary Brand Colors */
  --color-primary: #0096C7;
  --color-primary-hover: #0077A5;
  
  /* Background System */
  --color-background-primary: #ffffff;
  --color-surface-primary: #ffffff;
  
  /* Text System */
  --color-text-primary: #0f172a;
  --color-text-secondary: #334155;
}

.dark {
  --color-background-primary: #121212;
  --color-text-primary: #f8fafc;
}
```

### iOS Semantic Tokens

Following Apple Human Interface Guidelines:

```css
:root {
  /* iOS System Colors */
  --ios-system-blue: #007AFF;
  --ios-system-gray: #8E8E93;
  
  /* iOS Component Sizing */
  --ios-nav-bar-height: 44px;
  --ios-tab-bar-height: 49px;
  
  /* iOS Corner Radii */
  --ios-corner-radius-large: 14px;
  --ios-corner-radius-continuous: 38.5px;
  
  /* iOS Safe Areas */
  --ios-safe-area-top: env(safe-area-inset-top, 0px);
  --ios-safe-area-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Platform CSS Classes (`platform.css`)

```css
/* iOS Tab Bar */
.platform-tabbar--ios {
  height: calc(var(--ios-tab-bar-height) + env(safe-area-inset-bottom));
  background-color: rgba(249, 249, 249, 0.94);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
}

/* Android Tab Bar */
.platform-tabbar--android {
  height: calc(56px + env(safe-area-inset-bottom));
  background-color: #ffffff;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}
```

### Safe Area Utilities

```css
.safe-area-top { padding-top: env(safe-area-inset-top, 0px); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.safe-area-x {
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

### iOS App Container

Applied when running as a native iOS app:

```css
.ios-app {
  /* Safe area handling */
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(env(safe-area-inset-bottom) + 80px);
  
  /* Native scrolling behavior */
  -webkit-overflow-scrolling: touch;
  
  /* Disable text selection on interactive elements */
  -webkit-user-select: none;
  
  /* Remove tap highlight */
  -webkit-tap-highlight-color: transparent;
}
```

---

## Deep Linking Architecture

### Universal Links vs Custom URL Schemes

RepCue supports two deep linking mechanisms:

| Mechanism | URL Format | Use Case |
|-----------|------------|----------|
| **Universal Links** | `https://repcue.me/path` | Production, works with App Store apps |
| **Custom URL Scheme** | `repcue://path` | Development, simulator testing |

### Universal Links (Production)

**Configuration** (in `apple-app-site-association`):
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.me.repcue.app",
      "paths": [
        "/auth/callback",
        "/exercises/shared/*"
      ]
    }]
  }
}
```

**URL Flow:**
1. User taps `https://repcue.me/auth/callback#access_token=...`
2. iOS intercepts and opens RepCue app
3. Capacitor's `App.addListener('appUrlOpen')` fires
4. `useDeepLinks` hook navigates to `/auth/callback`

### Custom URL Scheme (Development)

**Configuration** (in Xcode/`Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>repcue</string>
    </array>
  </dict>
</array>
```

**Critical Implementation Detail:**

When parsing custom scheme URLs, the browser's URL parser treats the scheme differently:

```typescript
// URL: repcue://auth/callback
const url = new URL('repcue://auth/callback');
// url.host = 'auth'      ← NOT '/auth'
// url.pathname = '/callback'

// We need: /auth/callback
// Solution in useDeepLinks.ts:
function extractPathFromUrl(url: URL, originalUrl: string): string {
  const isCustomScheme = originalUrl.startsWith('repcue://');
  
  if (isCustomScheme && url.host) {
    // Reconstruct: /auth/callback
    return `/${url.host}${url.pathname}`;
  }
  
  return url.pathname;
}
```

### Deep Link Handler Hook

```typescript
// apps/frontend/src/hooks/useDeepLinks.ts

export const useDeepLinks = (): void => {
  const navigate = useNavigate();
  const isNative = isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    const cleanup = onDeepLink((url: URL, isLaunchUrl: boolean) => {
      // Prevent re-processing launch URLs
      if (isLaunchUrl && wasLaunchUrlHandled()) return;
      
      const pathname = extractPathFromUrl(url, url.href);
      
      // Mark launch URL as handled globally
      if (isLaunchUrl) markLaunchUrlHandled();
      
      // Navigate with hash (for auth tokens)
      const target = pathname + url.search + url.hash;
      navigate(target, { replace: true });
    });

    return cleanup;
  }, [isNative, navigate]);
};
```

### Launch URL Deduplication

Capacitor's `getLaunchUrl()` can return the same URL on every hook registration. RepCue uses a global flag to prevent re-processing:

```typescript
// Module-level state (persists across re-renders)
let launchUrlHandled = false;

export const markLaunchUrlHandled = (): void => {
  launchUrlHandled = true;
};

export const wasLaunchUrlHandled = (): boolean => {
  return launchUrlHandled;
};
```

---

## Authentication Flow Differences

RepCue supports multiple authentication methods, each with platform-specific implementations:

- **Magic Link (Email)**: Passwordless email authentication
- **OAuth Providers**: Google Sign-In, Sign in with Apple
- **Passkeys**: WebAuthn-based biometric authentication

### Magic Link Flow

#### Web Flow

1. User enters email and requests magic link
2. User clicks link in email
3. Browser navigates to `https://repcue.me/auth/callback#access_token=...`
4. `AuthCallbackPage` loads
5. Supabase client auto-parses tokens from URL hash
6. Session established via `supabase.auth.getSession()`

#### Native App Flow

The native flow requires **manual token extraction** because:
- Custom URL schemes don't trigger Supabase's automatic hash parsing
- The WebView doesn't behave exactly like a browser

```typescript
// apps/frontend/src/pages/AuthCallbackPage.tsx

const extractTokensFromHash = (hash: string) => {
  const params = new URLSearchParams(hash.substring(1));
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
};

// In useEffect:
if (isNative) {
  const hash = window.location.hash;
  if (hash) {
    const tokens = extractTokensFromHash(hash);
    if (tokens.access_token && tokens.refresh_token) {
      // Manually set the session
      await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    }
  }
}
```

### OAuth Flow (Google, Apple Sign-In)

OAuth authentication requires completely different approaches on web vs native platforms due to security restrictions and platform capabilities.

#### Web OAuth Flow

On web, OAuth uses standard browser redirects:

```typescript
// Standard redirect-based OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'apple'
  options: {
    redirectTo: 'https://repcue.me/auth/callback'
  }
});
// Browser navigates to Google/Apple, then redirects back
```

**Flow:**
1. User clicks "Sign in with Google" or "Sign in with Apple"
2. Browser navigates to provider's OAuth page
3. User authenticates with provider
4. Provider redirects to `https://repcue.me/auth/callback#access_token=...`
5. Supabase client auto-parses tokens

#### Native OAuth Flow (In-App Browser)

On native iOS, OAuth **cannot** use the WebView for security reasons:
- Google explicitly blocks sign-in from embedded WebViews
- Apple requires specific handling for Sign in with Apple
- Users should see the real browser URL bar for trust

**Solution:** Use Capacitor's `@capacitor/browser` plugin to open an in-app browser (Safari View Controller on iOS):

```typescript
// apps/frontend/src/services/authService.ts

public async signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  const isNative = isNativePlatform();
  
  if (isNative) {
    // Use custom URL scheme for redirect back to app
    const redirectTo = 'repcue://auth/callback';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.url) {
      const { Browser } = await import('@capacitor/browser');
      
      // Open OAuth URL in Safari View Controller (in-app browser)
      await Browser.open({ 
        url: data.url,
        presentationStyle: 'popover' // iOS: slide up sheet
      });
      
      // Listen for callback to close the browser
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appUrlOpen', async (event) => {
        if (event.url.startsWith('repcue://auth/callback')) {
          await Browser.close();
          await listener.remove();
        }
      });
    }

    return { success: true };
  }
  
  // Web: standard redirect flow
  // ...
}
```

**Native OAuth Flow:**
1. User taps "Sign in with Google" or "Sign in with Apple"
2. App opens Safari View Controller (in-app browser) with OAuth URL
3. User sees real Safari UI with URL bar (builds trust)
4. User authenticates with provider
5. Provider redirects to `repcue://auth/callback#access_token=...`
6. iOS intercepts custom URL scheme, opens app
7. `appUrlOpen` listener fires, closes the browser
8. Deep link handler navigates to `/auth/callback`
9. `AuthCallbackPage` extracts tokens and sets session

#### Why In-App Browser?

| Approach | Web | Native iOS |
|----------|-----|------------|
| **Standard WebView** | ✅ Works | ❌ Google blocks embedded WebViews |
| **External Safari** | ✅ Works | ⚠️ Works but poor UX (app switching) |
| **In-App Browser (SVC)** | N/A | ✅ Best: secure + seamless UX |

Safari View Controller (SVC) provides:
- **Security**: Real Safari with URL bar visible (anti-phishing)
- **Cookie Sharing**: Shares cookies with Safari (may auto-fill credentials)
- **UX**: Slides up as sheet, stays within app context
- **Trust**: Users see `accounts.google.com` in URL bar

### Key Differences Summary

| Aspect | Web | Native iOS |
|--------|-----|------------|
| **Magic Link Format** | `https://repcue.me/...` | `repcue://...` or Universal Link |
| **OAuth Browser** | Standard browser redirect | In-app browser (Safari View Controller) |
| **OAuth Redirect URL** | `https://repcue.me/auth/callback` | `repcue://auth/callback` |
| **Token Parsing** | Automatic via Supabase client | Manual extraction from hash |
| **Session Setting** | `getSession()` works | Must use `setSession()` |
| **Browser Closure** | N/A (same tab) | Must programmatically close SVC |

---

## Navigation & Page Behavior

### External Link Handling

Links behave differently based on platform:

```typescript
// Example: Opening terms of service
const handleOpenLink = (url: string) => {
  if (isNative) {
    // Open in system browser (Safari/Chrome)
    Browser.open({ url });
  } else {
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
```

### Back Navigation

```typescript
// iOS uses edge swipe for back navigation
// Web uses browser back button

// For programmatic back:
if (isNative) {
  // Use React Router's navigate
  navigate(-1);
} else {
  // Can also use window.history
  window.history.back();
}
```

### Modal Dismissal

- **iOS**: Swipe down to dismiss sheets, tap backdrop
- **Web**: Click backdrop, press Escape, click close button
- **Both**: Keyboard focus trapped within modal

---

## Platform-Specific Features

### Haptic Feedback (iOS Only)

```typescript
import { triggerHaptic, triggerNotificationHaptic } from '../utils/nativeCapabilities';

// Impact haptics for button presses
await triggerHaptic('medium');  // 'light' | 'medium' | 'heavy'

// Notification haptics for state changes
await triggerNotificationHaptic('success');  // 'success' | 'warning' | 'error'

// Selection haptics for toggles/pickers
await triggerHaptic('selection');
```

### Native Preferences Storage

For critical settings that should survive cache clears:

```typescript
import { saveNativePreference, getNativePreference } from '../utils/nativeCapabilities';

// Uses Capacitor Preferences on native, localStorage on web
await saveNativePreference('user_id', userId);
const userId = await getNativePreference('user_id');
```

### App Lifecycle Events

```typescript
import { onAppStateChange } from '../utils/nativeCapabilities';

useEffect(() => {
  const cleanup = onAppStateChange((isActive) => {
    if (isActive) {
      // App came to foreground - refresh data
      syncData();
    } else {
      // App went to background - save state
      saveProgress();
    }
  });
  
  return cleanup;
}, []);
```

### iOS Keyboard Handling

```typescript
import { hideKeyboard } from '../utils/iosKeyboard';

// Hide keyboard when modal opens
if (isIOS()) {
  hideKeyboard();
}
```

### Parallax Effects (iOS)

On exercise detail pages, RepCue uses parallax scrolling effects that feel native on iOS:

- Content shifts smoothly during pull-to-refresh
- Video backgrounds have depth layering
- Tab bar stays fixed above scrolling content (`z-index: 100`)

---

## Testing Considerations

### Platform-Specific Test Utilities

```typescript
// Mock platform detection in tests
vi.mock('../utils/nativeCapabilities', () => ({
  isNativePlatform: () => false,  // or true for native tests
  isIOS: () => false,
  isAndroid: () => false,
  isWeb: () => true,
  getPlatform: () => 'web',
}));
```

### Testing Platform Components

```typescript
// Test that PlatformSpinner renders correctly for each platform
describe('PlatformSpinner', () => {
  it('renders iOS spinner on iOS', () => {
    vi.mocked(isIOS).mockReturnValue(true);
    render(<PlatformSpinner />);
    expect(screen.getByRole('progressbar')).toHaveClass('platform-spinner--ios');
  });

  it('renders web spinner on web', () => {
    vi.mocked(isWeb).mockReturnValue(true);
    render(<PlatformSpinner />);
    expect(screen.getByRole('progressbar')).toHaveClass('platform-spinner--web');
  });
});
```

### Accessibility Testing

All platform components maintain WCAG 2.1 AA compliance:

```typescript
// All spinners have proper ARIA attributes
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Loading');
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');

// Modals have proper focus management
expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .platform-spinner--ios .ios-spinner-svg,
  .platform-spinner--android .android-spinner-circle,
  .platform-spinner--web > div {
    animation: none !important;
  }
}
```

---

## Best Practices

### 1. Always Use Platform Context

```tsx
// ✅ Good: Use context for platform checks
const { isIOS, isNative } = usePlatform();

// ❌ Bad: Call detection functions directly in render
if (isNativePlatform()) { ... }  // Re-runs on every render
```

### 2. Prefer Platform Components

```tsx
// ✅ Good: Use abstracted component
<PlatformSpinner size="large" />

// ❌ Bad: Conditional rendering with platform checks
{isIOS() ? <IOSSpinner /> : <WebSpinner />}
```

### 3. Handle Deep Links Defensively

```typescript
// ✅ Good: Check if already handled
if (isLaunchUrl && wasLaunchUrlHandled()) return;

// ❌ Bad: Process every URL unconditionally
navigate(url.pathname);
```

### 4. Use CSS Variables for Platform Styling

```css
/* ✅ Good: Use semantic tokens */
.button {
  background-color: var(--color-primary);
  border-radius: var(--ios-corner-radius-medium);
}

/* ❌ Bad: Hardcode platform values */
.button {
  background-color: #007AFF;
  border-radius: 10px;
}
```

### 5. Test on All Platforms

Before releasing, test:
- Web browser (Chrome, Safari, Firefox)
- iOS Simulator
- Physical iOS device
- PWA installed mode

---

## Future Considerations

### Android Platform Support

When Android support is added:
- `PlatformTabBar` will render Material Design navigation
- `PlatformModal` will use Material dialog styling
- App Links will replace Custom URL Schemes
- Material ripple effects will be added to interactive elements

### Platform-Specific Feature Flags

Consider adding:
```typescript
const PLATFORM_FEATURES = {
  ios: {
    haptics: true,
    pullToRefresh: true,
    nativeShare: true,
  },
  android: {
    haptics: true,
    pullToRefresh: true,
    nativeShare: true,
  },
  web: {
    haptics: false,  // Limited vibration API support
    pullToRefresh: false,  // Handled by browser
    nativeShare: true,  // Web Share API
  },
};
```

---

## Related Documentation

- [iOS App Implementation Plan](implementation-plans/ios-app/ios-app-implementation-plan.md)
- [PWA System](pwa-system.md)
- [iOS PWA Magic Links](ios-pwa-magic-links.md)
- [Style Guide](style-guide.md)

---

*This document should be updated as new platform-specific features are added or existing behavior changes.*
