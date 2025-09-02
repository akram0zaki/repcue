/**
 * PWA Detection and Deep Link Utilities
 */

/**
 * Detect if the app is running as a PWA
 */
export function isPWA(): boolean {
  // Check if running in standalone mode (iOS/Android)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Check Android TWA (Trusted Web Activity)
  const isAndroidTWA = document.referrer.includes('android-app://');
  
  // Check if launched from home screen
  const isLaunchedFromHomeScreen = window.location.search.includes('pwa=true');
  
  return isStandalone || isIOSStandalone || isAndroidTWA || isLaunchedFromHomeScreen;
}

/**
 * Get the appropriate redirect URL for magic links
 */
export function getMagicLinkRedirectUrl(baseUrl: string): string {
  const pwa = isPWA();
  
  if (pwa) {
    // For PWA, try to use custom protocol
    return `web+repcue://auth/callback`;
  }
  
  // For browser, use regular URL with PWA hint
  return `${baseUrl}/auth/callback?pwa=true`;
}

/**
 * Handle deep link routing in PWA
 */
export function handleDeepLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Handle custom protocol links
    if (url.startsWith('web+repcue://')) {
      const path = url.replace('web+repcue://', '/');
      window.location.href = path;
      return true;
    }
    
    // Handle universal links with auth tokens
    if (urlObj.pathname === '/auth/callback' && urlObj.hash) {
      // Extract token from hash and navigate
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      if (hashParams.get('access_token')) {
        window.location.href = urlObj.pathname + urlObj.hash;
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to handle deep link:', error);
    return false;
  }
}

/**
 * Register PWA link handlers
 */
export function registerPWALinkHandlers(): void {
  // Handle protocol handler registration
  if ('serviceWorker' in navigator && 'registerProtocolHandler' in navigator) {
    try {
      navigator.registerProtocolHandler(
        'web+repcue',
        `${window.location.origin}/auth/callback?url=%s`
      );
    } catch (error) {
      console.warn('Failed to register protocol handler:', error);
    }
  }
  
  // Listen for custom protocol messages
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'deep-link') {
      handleDeepLink(event.data.url);
    }
  });
}

/**
 * Add install prompt enhancement for better PWA adoption
 */
export function enhanceInstallPrompt(): void {
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button if needed
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
    }
  });
  
  // Handle install button click
  window.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target?.id === 'pwa-install-button' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      deferredPrompt = null;
    }
  });
}
