# RepCue PWA Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [User Features](#user-features)
3. [Installation Guide](#installation-guide)
4. [PWA Functionality](#pwa-functionality)
5. [Developer Guide](#developer-guide)
6. [Technical Implementation](#technical-implementation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

RepCue is implemented as a **Progressive Web Application (PWA)** that provides a native app-like experience while being served through web browsers. Our PWA implementation focuses on:

- **🔒 Privacy-first architecture** - All data stored locally by default
- **📱 Mobile-optimized UI** - Designed for smartphones and tablets  
- **⚡ Performance** - Fast loading with intelligent caching
- **🌐 Offline functionality** - Works without internet connection
- **♿ Accessibility** - WCAG 2.1 AA compliance
- **🌍 Multi-language support** - 8 languages including Frisian

### PWA Standards Compliance

- ✅ **Web App Manifest** with comprehensive metadata
- ✅ **Service Worker** with Workbox for reliable caching
- ✅ **HTTPS** requirement for secure contexts
- ✅ **Responsive design** for all screen sizes
- ✅ **Offline functionality** with intelligent fallbacks
- ✅ **Install prompts** across all major platforms

---

## User Features

### 🏠 Home Screen Integration

**What users get:**
- App icon on home screen/desktop
- Native app launcher integration
- No browser UI (address bar, tabs)
- Full-screen experience in portrait mode

**Supported platforms:**
- **iOS Safari** - Add to Home Screen
- **Android Chrome** - Install prompt + app drawer
- **Desktop Chrome/Edge** - Install to taskbar/dock
- **Desktop Firefox** - Limited support

### 📱 App Shortcuts

Quick access actions from home screen (long-press app icon):

1. **Start Timer** - Direct access to timer page
2. **Browse Exercises** - Jump to exercise catalog

### 🎨 Adaptive UI

- **Theme color** integration with system UI
- **Splash screens** for iOS (iPhone 5 through 11 Pro Max)
- **Light/dark mode** support with smooth transitions
- **Status bar** integration for immersive experience

### 🔄 Update Management

Users can manage app updates through **Settings**:

- **Force Refresh App** - Complete cache clear + reload
- **Clear Caches Only** - Remove cached content
- **Check for Updates** - Force service worker update

---

## Installation Guide

### 📱 iOS Installation (Safari)

1. **Open RepCue** in Safari browser
2. **Tap Share button** (square with arrow up)
3. **Scroll down** and tap "Add to Home Screen"
4. **Customize name** if desired, tap "Add"
5. **App appears** on home screen

**✨ Smart Install Prompt**
RepCue automatically shows step-by-step installation instructions for iOS users with:
- Visual icons and guidance
- Progress indicators
- Platform-specific benefits

### 🤖 Android Installation (Chrome)

1. **Open RepCue** in Chrome browser
2. **Native install banner** appears automatically
3. **Tap "Install"** or use Chrome menu → "Install RepCue"
4. **App installs** to device and appears in app drawer
5. **Launch** from app drawer or home screen

### 🖥️ Desktop Installation

**Chrome/Edge:**
1. **Look for install icon** in address bar (⊕ or computer icon)
2. **Click install icon** or use menu → "Install RepCue"
3. **App installs** as desktop application
4. **Pin to taskbar** for quick access

**Firefox:**
- Partial support - bookmark to home screen/toolbar

---

## PWA Functionality

### 🌐 Offline Capabilities

RepCue works completely offline through intelligent caching:

**Cached Resources:**
- ✅ App shell (HTML, CSS, JavaScript)
- ✅ App icons and splash screens  
- ✅ Translation files (i18n)
- ✅ Exercise demo videos
- ✅ Google Fonts
- ✅ Exercise data and user preferences

**Cache Strategies:**
- **Static assets** - Cache First (1 year expiry)
- **Translation files** - Stale While Revalidate (7 days)  
- **Exercise videos** - Stale While Revalidate (30 days)
- **API calls** - Network First with offline fallback

### 💾 Data Storage

**Local Storage (IndexedDB via Dexie):**
- Exercise data and favorites
- Workout logs and statistics
- User preferences and settings
- Timer configurations
- Activity history

**Privacy Compliance:**
- Consent-based storage
- Easy data export (JSON format)
- Complete data deletion
- No tracking cookies
- GDPR compliant

### 🔄 Background Sync

When online connection returns:
- Automatic sync of local changes
- Conflict resolution for concurrent edits
- Progressive data synchronization
- User notification of sync status

### 🛠️ Advanced Features

**Wake Lock API:**
- Prevents screen dimming during workouts
- Automatic release after session
- Graceful fallback for unsupported browsers

**Vibration API:**
- Timer completion notifications
- Exercise transition alerts  
- Settings-controlled intensity

**Web Share API:**
- Share workout results
- Export data to other apps
- Social media integration

---

## Developer Guide

### 🏗️ PWA Architecture

RepCue's PWA is built with modern web standards:

```
┌─ App Shell (React 19 + TypeScript)
│  ├─ Service Worker (Workbox + VitePWA)
│  ├─ Web App Manifest
│  └─ Cache Management
│
├─ State Management (React Context)
├─ Local Storage (Dexie + IndexedDB) 
├─ Offline Sync (Custom service)
└─ Install Management (Custom hooks)
```

### 📦 Key Dependencies

```json
{
  "vite-plugin-pwa": "^0.17.0",    // PWA generation
  "workbox-window": "^7.0.0",      // Service worker client
  "dexie": "^3.2.4",               // IndexedDB wrapper
  "react": "^19.0.0",              // UI framework
  "react-i18next": "^13.5.0"       // Internationalization
}
```

### 🔧 Build Configuration

**Vite PWA Plugin Configuration:**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: [
    'favicon.ico', 
    'apple-touch-icon.png',
    'splash/**/*',
    'locales/**/*.json'
  ],
  workbox: {
    globPatterns: [
      '**/*.{js,css,html,ico,png,svg,woff2}',
      'splash/*.{png,svg}',
      'locales/**/*.json'
    ],
    runtimeCaching: [
      // Font caching
      // Translation files
      // Exercise videos
      // Splash screens
    ]
  }
})
```

### 🎯 Service Worker Features

**Custom Service Worker Utilities:**
- `forceRefreshFromServer()` - Complete cache reset
- `clearPWACaches()` - Selective cache clearing
- `forceUpdateServiceWorker()` - Manual SW updates
- `registerServiceWorker()` - SW registration with error handling
- `updateServiceWorker()` - Update management

**Cache Management:**
```typescript
// Multiple cache strategies
const cacheStrategies = {
  static: 'CacheFirst',      // App shell, fonts
  dynamic: 'StaleWhileRevalidate', // i18n, videos
  api: 'NetworkFirst'        // Data endpoints
}
```

---

## Technical Implementation

### 📄 Web App Manifest

**Core Configuration:**
```json
{
  "name": "RepCue - Fitness Timer",
  "short_name": "RepCue", 
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#2563eb",
  "background_color": "#f8fafc",
  "categories": ["health", "fitness", "sports"]
}
```

**Advanced Features:**
- **Protocol handlers** for `web+repcue://` deep links
- **URL handlers** for universal link support
- **App shortcuts** for quick actions
- **Comprehensive icon set** (16px to 512px)
- **iOS splash screens** for all device sizes

### 🔄 Install Management

**Custom React Hook (`useInstallPrompt`):**
```typescript
const {
  isAvailable,           // Install prompt available
  canShowPrompt,         // Permission to show prompt
  isInstalling,          // Installation in progress
  installError,          // Installation error state
  promptInstall,         // Trigger installation
  needsManualInstructions // iOS requires manual steps
} = useInstallPrompt();
```

**Smart Install Component:**
- Platform detection (iOS, Android, Desktop)
- Automatic prompt management
- Accessibility compliant
- Analytics tracking (privacy-compliant)
- Custom styling and animations

### 💽 Cache Structure

**Cache Naming Convention:**
```
repcue-precache-v{version}     // Static app shell
google-fonts-cache             // External fonts
exercise-videos-cache          // Demo videos  
i18n-locales-cache            // Translation files
splash-screens-cache          // iOS splash screens
```

**Storage Quotas:**
- Maximum 60 video entries (30-day TTL)
- Maximum 50 locale files (7-day TTL)
- Maximum 10 font families (1-year TTL)

### 🔒 Security Implementation

**Content Security Policy:**
- Same-origin resource loading
- No external script execution
- HTTPS-only in production
- Secure service worker scope

**Privacy Protection:**
- No third-party trackers
- Local-only data processing
- Consent-based storage
- Easy data portability

---

## Troubleshooting

### 🚨 Common Issues

**Install Prompt Not Showing:**
1. Ensure HTTPS connection
2. Check if already installed
3. Verify PWA criteria met
4. Clear browser cache
5. Use developer tools to check manifest/SW

**App Not Updating:**
1. Use "Force Refresh App" in Settings
2. Clear browser cache manually
3. Check network connection
4. Verify service worker registration

**Offline Mode Not Working:**
1. Check service worker status
2. Verify cache population
3. Test network disconnection
4. Review browser console logs

**iOS Installation Issues:**
1. Use Safari browser only
2. Ensure iOS 11.3+ version
3. Follow step-by-step instructions
4. Check available storage space

### 🔍 Developer Debugging

**Service Worker Debugging:**
```bash
# Check SW registration
chrome://serviceworker-internals/

# PWA audit
chrome://lighthouse/ (PWA category)

# Application panel
Chrome DevTools → Application tab
```

**Cache Investigation:**
```typescript
// List all caches
caches.keys().then(console.log);

// Clear specific cache
caches.delete('cache-name');

# Storage usage
navigator.storage.estimate();
```

### 📊 Performance Monitoring

**PWA Metrics to Track:**
- Time to Interactive (TTI)
- First Contentful Paint (FCP)  
- Cache hit ratio
- Service worker performance
- Install conversion rates

---

## Best Practices

### 🏆 PWA Excellence

**Performance:**
- Minimize bundle sizes with code splitting
- Optimize images and videos for mobile
- Use efficient caching strategies
- Implement lazy loading for non-critical resources

**User Experience:**
- Provide clear install benefits
- Show offline status indicators
- Handle network failures gracefully
- Maintain smooth animations and transitions

**Development:**
- Test on real devices across platforms
- Monitor service worker lifecycle
- Implement proper error boundaries
- Use Progressive Enhancement principles

### 🔄 Update Management

**Deployment Strategy:**
1. Generate new service worker with updated precache
2. Deploy new version to server
3. Service worker automatically detects updates
4. User receives update notification
5. Apply update on next app launch

**Cache Invalidation:**
- Version-based precaching automatically handles static assets
- Runtime caches use TTL for dynamic content
- Manual cache busting available through settings

### 📱 Platform Optimization

**iOS Specific:**
- Include comprehensive splash screen set
- Test Add to Home Screen flow
- Optimize for Safari performance
- Handle status bar integration

**Android Specific:**
- Implement Web App Install Banners
- Test across Chrome versions
- Optimize for various screen densities
- Handle system back button

**Desktop Specific:**
- Ensure proper window sizing
- Implement keyboard shortcuts
- Handle multiple window instances
- Test across Chromium browsers

---

## Conclusion

RepCue's PWA implementation provides a comprehensive native app experience while maintaining the accessibility and reach of web technologies. The architecture prioritizes user privacy, performance, and accessibility while delivering advanced PWA features across all major platforms.

For additional technical details, see:
- [Service Worker Implementation](../apps/frontend/src/utils/serviceWorker.ts)
- [PWA Configuration](../apps/frontend/vite.config.ts)
- [Install Management](../apps/frontend/src/hooks/useInstallPrompt.ts)
- [iOS Deep Linking Guide](./ios-pwa-magic-links.md)

**Last Updated:** 2025-09-02
**Version:** RepCue v1.0+