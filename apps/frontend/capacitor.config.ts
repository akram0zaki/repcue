import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.repcue.app',
  appName: 'RepCue',
  webDir: 'dist',
  server: {
    // For development - uncomment to use live reload
    // url: 'http://localhost:5173',
    // cleartext: true
    
    // Allow loading videos from production CDN
    // This enables cross-origin requests to repcue.me for video content
    allowNavigation: ['https://repcue.me/*', 'https://*.repcue.me/*']
  },
  ios: {
    scheme: 'RepCue',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Scroll bounce for native feel
    scrollEnabled: true,
    // WebView background - matches dark mode surface for consistent overscroll appearance
    backgroundColor: '#0f172a',
    // Enable inline video playback (required for exercise demo videos)
    allowsLinkPreview: false,
    // WKWebView configuration
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0096C7',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0096C7'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#0096C7',
      sound: 'beep.wav'
    }
  }
};

export default config;
