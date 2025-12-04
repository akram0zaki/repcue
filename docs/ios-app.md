# RepCue iOS App Developer Guide

**Last Updated**: 2025-12-02  
**Version**: 1.0.0  
**For**: Developers building and maintaining the RepCue iOS app

---

## Table of Contents

1. [Overview](#1-overview)
2. [Approach & Architecture](#2-approach--architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Development Setup](#5-development-setup)
6. [Building the App](#6-building-the-app)
7. [Running & Debugging](#7-running--debugging)
8. [Native Capabilities](#8-native-capabilities)
9. [Video Playback](#9-video-playback)
10. [Troubleshooting](#10-troubleshooting)
11. [App Store Submission](#11-app-store-submission)
12. [Resources](#12-resources)

---

## 1. Overview

RepCue's iOS app is a **Capacitor-wrapped** version of the existing React PWA. This approach allows us to:

- **Share 99% of code** between web and iOS
- **Access native APIs** via Capacitor plugins
- **Distribute via App Store** for discoverability and trust
- **Add native features** like haptics, local notifications, and background audio

### Why Capacitor?

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| PWABuilder | Higher rejection risk, limited native access |
| React Native | Requires complete rewrite, separate codebase |
| Flutter | Different language (Dart), steep learning curve |

Capacitor provides the best balance of **code reuse**, **native capabilities**, and **App Store acceptance**.

---

## 2. Approach & Architecture

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RepCue iOS App                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Native iOS Container                 │    │
│  │  • WKWebView (renders React app)                    │    │
│  │  • Capacitor Bridge (JS ↔ Native)                   │    │
│  │  • Native Plugins (Haptics, Notifications, etc.)    │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  React PWA (same code)               │    │
│  │  • React 19 + TypeScript                            │    │
│  │  • Tailwind CSS                                     │    │
│  │  • IndexedDB (Dexie) for local storage              │    │
│  │  • Service Worker for caching                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Runtime Platform Detection**: Use `isNativePlatform()` to conditionally enable native features
2. **Same Codebase**: No separate iOS-specific code paths except for native API calls
3. **Offline-First**: IndexedDB works identically in WKWebView as in Safari
4. **Feature Flags**: Platform-aware flags disable PWA-specific features (install prompts, update banners)

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Native Container** | Capacitor | 7.4.4 |
| **iOS Platform** | @capacitor/ios | 7.4.4 |
| **Web Framework** | React | 19.1.0 |
| **Language** | TypeScript | 5.8.3 |
| **Build Tool** | Vite | 7.0.0 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Local Storage** | Dexie (IndexedDB) | 4.0.11 |
| **Backend** | Supabase | 2.56.0 |

### Capacitor Plugins (8 total)

| Plugin | Version | Purpose |
|--------|---------|---------|
| @capacitor/app | 7.1.0 | App lifecycle, back button |
| @capacitor/dialog | 7.0.2 | Native alert/confirm dialogs |
| @capacitor/haptics | 7.0.2 | Haptic feedback |
| @capacitor/keyboard | 7.0.3 | Keyboard events |
| @capacitor/local-notifications | 7.0.3 | Timer alerts |
| @capacitor/preferences | 7.0.2 | Native key-value storage |
| @capacitor/splash-screen | 7.0.3 | Launch screen |
| @capacitor/status-bar | 7.0.3 | Status bar styling |

---

## 4. Project Structure

```
apps/frontend/
├── capacitor.config.ts          # Capacitor configuration
├── ios/                         # iOS native project (auto-generated)
│   ├── App/
│   │   ├── App/
│   │   │   ├── AppDelegate.swift
│   │   │   ├── Info.plist       # iOS app configuration
│   │   │   └── PrivacyInfo.xcprivacy  # Privacy manifest
│   │   ├── App.xcodeproj/       # Xcode project
│   │   └── Resources/           # Icons, launch screens
│   ├── DerivedData/             # Xcode build cache
│   └── capacitor-cordova-ios-plugins/
├── src/
│   ├── utils/
│   │   ├── nativeCapabilities.ts  # Platform detection + native APIs
│   │   ├── nativeDialog.ts        # Native alert/confirm
│   │   ├── iosStatusBar.ts        # Status bar config
│   │   ├── iosKeyboard.ts         # Keyboard handling
│   │   └── selectVideoVariant.ts  # Video URL resolution
│   └── ...
└── dist/                        # Built web app (copied to iOS)
```

---

## 5. Development Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **macOS** | 13+ (Ventura) | Required for Xcode |
| **Xcode** | 15+ | With iOS 17+ SDK |
| **Node.js** | 18+ | For building web app |
| **pnpm** | 10+ | Package manager |
| **CocoaPods** | Latest | `sudo gem install cocoapods` |
| **Apple Developer Account** | - | For App Store submission |

### Initial Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd repcue
pnpm install

# 2. Navigate to frontend
cd apps/frontend

# 3. Ensure iOS platform is added (already done)
npx cap sync ios

# 4. Install CocoaPods dependencies
cd ios/App
pod install
cd ../..
```

---

## 6. Building the App

### Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm cap:build` | Build web + copy to iOS |
| `pnpm cap:sync` | Sync plugins + copy assets |
| `pnpm cap:open` | Open Xcode project |
| `pnpm cap:run` | Run on simulator/device |

### Full Build Process

```bash
# From apps/frontend directory

# 1. Build the production web app
pnpm build:prod

# 2. Copy to iOS project
npx cap copy ios

# 3. Sync native plugins (if plugins changed)
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

### One-Liner for Development

```bash
# Build and run on default simulator
pnpm cap:build && pnpm cap:run
```

### Build for Specific Simulator

```bash
# List available simulators
xcrun simctl list devices

# Run on specific device
npx cap run ios --target="<DEVICE_UDID>"
```

---

## 7. Running & Debugging

### Using Xcode

1. Open project: `pnpm cap:open`
2. Select target device (simulator or connected iPhone)
3. Press **⌘R** to build and run
4. Use **Safari Web Inspector** for debugging WebView

### Safari Web Inspector

1. Enable in iOS Simulator: Settings → Safari → Advanced → Web Inspector
2. Open Safari on Mac: Develop → Simulator → RepCue
3. Access Console, Network, Elements tabs

### Live Reload (Development)

For faster iteration, enable live reload:

```typescript
// capacitor.config.ts
server: {
  url: 'http://YOUR_MAC_IP:5173',  // Replace with actual IP
  cleartext: true
}
```

Then run:
```bash
pnpm dev  # Start Vite dev server
pnpm cap:run  # Run app pointing to dev server
```

> ⚠️ **Remember to disable before production build!**

### Debugging Native Issues

```bash
# View Xcode console logs
# In Xcode: View → Debug Area → Activate Console

# Check device logs
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.repcue.app"'
```

---

## 8. Native Capabilities

### Platform Detection

```typescript
import { isNativePlatform, isIOS, getPlatform } from './utils/nativeCapabilities';

if (isNativePlatform()) {
  // Running in Capacitor (iOS or Android)
}

if (isIOS()) {
  // iOS-specific code
}

console.log(getPlatform()); // 'ios' | 'android' | 'web'
```

### Haptic Feedback

```typescript
import { triggerHaptic, triggerImpactHaptic } from './utils/nativeCapabilities';

// Timer events
await triggerHaptic('success');
await triggerHaptic('warning');

// Button presses
await triggerImpactHaptic('medium');
```

### Native Dialogs

```typescript
import { showAlert, showConfirm } from './utils/nativeDialog';

// Alert
await showAlert({
  title: 'Workout Complete',
  message: 'Great job! You finished all sets.',
  buttonTitle: 'Done'
});

// Confirm
const confirmed = await showConfirm({
  title: 'Delete Workout?',
  message: 'This action cannot be undone.',
  okButtonTitle: 'Delete',
  cancelButtonTitle: 'Cancel'
});
```

### Local Notifications

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.schedule({
  notifications: [{
    id: 1,
    title: 'Set Complete!',
    body: 'Time for your rest period',
    schedule: { at: new Date(Date.now() + 30000) }
  }]
});
```

### Native Preferences

```typescript
import { saveNativePreference, getNativePreference } from './utils/nativeCapabilities';

// Save critical setting (survives cache clear)
await saveNativePreference('userId', 'abc123');

// Retrieve
const userId = await getNativePreference('userId');
```

---

## 9. Video Playback

Exercise demo videos require special handling in iOS:

### URL Normalization

Videos are served from Cloudflare R2. In the native app, relative URLs must be converted to absolute:

```typescript
// src/utils/selectVideoVariant.ts
export function normalizeVideoUrl(url: string): string {
  if (isNativePlatform() && url.startsWith('/media/')) {
    return `${VIDEO_CDN_BASE_URL}${url}`;
  }
  return url;
}
```

### CORS Configuration

The Cloudflare Pages Function (`functions/media/[[path]].ts`) includes CORS headers:

```typescript
const allowedOrigins = [
  'https://repcue.me',
  'https://dev.repcue.me',
  'capacitor://localhost',  // iOS Capacitor
  'http://localhost'        // Development
];
```

### Video Element Attributes

All video elements must include:

```tsx
<video
  crossOrigin="anonymous"  // Required for CORS
  playsInline               // iOS inline playback
  webkit-playsinline        // Safari compatibility
  preload="metadata"
/>
```

### Probe Skip for Native

WKWebView's fetch with Range headers is unreliable, so we skip probing:

```typescript
// In video probe logic
if (isNativePlatform()) {
  return true; // Trust the URL without probing
}
```

---

## 10. Troubleshooting

### Common Issues

#### Build Fails: "CocoaPods not installed"

```bash
sudo gem install cocoapods
cd apps/frontend/ios/App
pod install
```

#### Simulator Warnings (Harmless)

These warnings appear in the Xcode console but don't affect functionality:

| Warning | Cause | Action |
|---------|-------|--------|
| `RBSServiceErrorDomain` | Simulator-only entitlement issue | Ignore (works on real devices) |
| `UIScene lifecycle` | iOS deprecation notice | Apple will address in future Xcode |
| Keyboard constraint warnings | System-level issue | Ignore |

#### Videos Not Playing

1. Check CORS headers are deployed to Cloudflare
2. Verify `crossOrigin="anonymous"` on video elements
3. Ensure `capacitor://localhost` is in allowed origins
4. Check VIDEO_CDN_BASE_URL points to correct domain

#### Circular Dependency Errors

If you see "Cannot access 'X' before initialization":

1. Check import chains in `features.ts`, `nativeCapabilities.ts`, `logger.ts`
2. Import directly from source module, not through re-exports
3. Use `import.meta.env.DEV` instead of importing DEBUG flag

#### App Shows Blank Screen

1. Check `dist/` folder exists (run `pnpm build`)
2. Verify `webDir: 'dist'` in `capacitor.config.ts`
3. Run `npx cap copy ios` to copy assets

#### Haptics Not Working

1. Haptics require physical device (not simulator)
2. Check `@capacitor/haptics` is installed
3. Run `npx cap sync ios` after adding plugins

### Debug Checklist

- [ ] `pnpm build:prod` completed successfully
- [ ] `npx cap sync ios` run after plugin changes
- [ ] Xcode project builds without errors
- [ ] Safari Web Inspector shows no console errors
- [ ] Network tab shows successful API calls

---

## 11. App Store Submission

### Avoiding Guideline 4.2 Rejection

Apple rejects apps that are "merely a repackaged website." RepCue differentiates with:

| Native Feature | Implementation |
|----------------|----------------|
| **Haptic Feedback** | Timer events, button presses |
| **Local Notifications** | Set completion alerts |
| **Offline Support** | Full IndexedDB persistence |
| **Native Dialogs** | iOS-style alerts/confirms |
| **Status Bar** | Theme-matched styling |
| **Safe Areas** | Proper notch/home indicator support |

### Required Assets

| Asset | Specification |
|-------|---------------|
| **App Icon** | 1024×1024 PNG, no transparency |
| **Screenshots** | iPhone 6.7" (1290×2796), 6.5" (1284×2778), 5.5" (1242×2208) |
| **Privacy Policy** | Accessible URL (repcue.app/legal/privacy) |

### Privacy Manifest (`PrivacyInfo.xcprivacy`)

Located at `ios/App/App/PrivacyInfo.xcprivacy`. Declares:

- **No tracking** (`NSPrivacyTracking: false`)
- **Collected data**: Email, fitness data, user ID (for app functionality only)
- **API usage**: UserDefaults, file timestamps, boot time, disk space

### Review Checklist

Before submitting:

- [ ] All features work as described in metadata
- [ ] Privacy policy is accessible
- [ ] No placeholder content
- [ ] App works offline
- [ ] No crashes in common flows
- [ ] Supports latest iOS version
- [ ] Screenshots match current UI
- [ ] Keywords match app functionality

### App Store Connect Metadata

```yaml
Name: RepCue - Fitness Timer
Subtitle: Interval Training Tracker
Category: Health & Fitness
Keywords: fitness, timer, workout, interval, training, exercise, pilates, hiit, tracker

Description: |
  RepCue is a privacy-first fitness timer and workout tracker designed 
  for interval training. Whether you're doing Pilates, strength training, 
  or HIIT workouts, RepCue helps you stay on track.

  KEY FEATURES:
  • Customizable interval timer with audio and haptic feedback
  • 80+ built-in exercises across multiple categories
  • Create and save custom workouts
  • Works completely offline
  • Multi-language support (8 languages)
  • Privacy-first: your data stays on your device
```

### TestFlight Beta Testing

1. Archive app in Xcode: Product → Archive
2. Upload to App Store Connect
3. Add internal/external testers
4. Collect feedback before production release

---

## 12. Resources

### Documentation

- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### RepCue-Specific

- [Implementation Plan](implementation-plans/ios-app/ios-app-implementation-plan.md) - Detailed phases and status
- [Video System](video-system.md) - Video playback architecture

### Useful Commands

```bash
# Clean build
rm -rf ios/App/DerivedData
cd ios/App && pod install && cd ../..
pnpm cap:build

# List simulators
xcrun simctl list devices

# Reset simulator
xcrun simctl erase <DEVICE_UDID>

# Check plugin versions
npx cap doctor
```

---

**Document Status**: Complete  
**Maintainer**: Development Team  
**See Also**: [iOS Implementation Plan](implementation-plans/ios-app/ios-app-implementation-plan.md)
