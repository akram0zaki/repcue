import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { SnackbarProvider } from './components/SnackbarProvider'
import { isNativePlatform, isIOS, logPlatformInfo } from './utils/nativeCapabilities'
import { initializeStatusBar } from './utils/iosStatusBar'
import { initializeKeyboard } from './utils/iosKeyboard'
import logger from './utils/logger'

/**
 * Initialize iOS native app features
 * Sets up status bar, keyboard, and applies iOS-specific body class
 */
async function initializeIOSApp(): Promise<void> {
  if (!isNativePlatform() || !isIOS()) {
    logger.log('[main.tsx] Not running on iOS native, skipping iOS initialization');
    return;
  }

  logger.log('[main.tsx] Initializing iOS native app...');
  
  // Log platform info for debugging
  logPlatformInfo();
  
  // Add iOS-specific class to body for CSS targeting
  document.body.classList.add('ios-app');
  
  // Configure viewport for iOS - allow scrolling
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
  
  // CRITICAL: Apply scroll-enabling styles directly to html and body
  // This ensures WKWebView can scroll the content properly
  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');
  
  // Remove fixed heights that prevent scrolling
  html.style.height = 'auto';
  html.style.minHeight = '100%';
  html.style.overflow = 'auto';
  
  body.style.height = 'auto';
  body.style.minHeight = '100vh';
  body.style.overflow = 'auto';
  body.style.overflowX = 'hidden';
  // Use setProperty for webkit-specific property
  body.style.setProperty('-webkit-overflow-scrolling', 'touch');
  
  if (root) {
    root.style.height = 'auto';
    root.style.minHeight = '100%';
    root.style.overflow = 'visible';
  }
  
  logger.log('[main.tsx] iOS scroll styles applied to html/body/root');

  // Initialize iOS status bar
  await initializeStatusBar();
  
  // Initialize iOS keyboard handling
  await initializeKeyboard();

  logger.log('[main.tsx] iOS native app initialized successfully');
}

// Check if this is a shared exercise route
const isSharedRoute = window.location.pathname.startsWith('/share/')

// Dynamically import the appropriate component
const AppComponent = isSharedRoute
  ? import('./StandaloneSharedExercise.tsx').then(module => module.default)
  : import('./App.tsx').then(module => module.default)

// Initialize iOS features before rendering
initializeIOSApp().then(() => {
  AppComponent.then(Component => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        {isSharedRoute ? (
          <Component />
        ) : (
          <SnackbarProvider>
            <Component />
          </SnackbarProvider>
        )}
      </StrictMode>,
    )
  }).catch(error => {
    logger.error('[main.tsx] Error loading component:', error);
  })
}).catch(error => {
  logger.error('[main.tsx] Error initializing iOS app:', error);
  // Still try to render the app even if iOS init fails
  AppComponent.then(Component => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        {isSharedRoute ? (
          <Component />
        ) : (
          <SnackbarProvider>
            <Component />
          </SnackbarProvider>
        )}
      </StrictMode>,
    )
  });
})
