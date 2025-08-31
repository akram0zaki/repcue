import logger from './logger'
/**
 * Simple Platform Detection Test
 * Simplified version to isolate the import issue
 */

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  browserName: string;
  osName: string;
  supportsBeforeInstallPrompt: boolean;
  supportsWebShare: boolean;
  supportsFileSystemAccess: boolean;
  supportsPushNotifications: boolean;
}

export const isIOS = (): boolean => {
  const ua = (globalThis?.navigator?.userAgent || '').toLowerCase();
  const platform = (globalThis?.navigator?.platform || '').toLowerCase();
  const maxTouch = (globalThis?.navigator as unknown as { maxTouchPoints?: number })?.maxTouchPoints || 0;
  return (
    /ipad|iphone|ipod/.test(ua) ||
    (platform === 'macintel' && maxTouch > 1) ||
    platform.includes('iphone') ||
    platform.includes('ipad')
  );
};

export const isAndroid = (): boolean => {
  const ua = (globalThis?.navigator?.userAgent || '').toLowerCase();
  return /android/.test(ua);
};

export const isMobile = (): boolean => {
  return isIOS() || isAndroid();
};

export const isTablet = (): boolean => {
  const ua = (globalThis?.navigator?.userAgent || '').toLowerCase();
  return (
    /ipad/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua)) ||
    /tablet/.test(ua)
  );
};

export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};

export const isStandalone = (): boolean => {
  if (isIOS()) {
    const nav = (globalThis?.navigator as unknown as { standalone?: boolean })
    return nav?.standalone === true;
  }
  const w = ((globalThis as unknown as { window?: unknown }).window ?? (globalThis as unknown)) as { matchMedia?: (q: string) => { matches: boolean } };
  const mm = w?.matchMedia as undefined | ((q: string) => { matches: boolean });
  if (typeof mm === 'function' && mm('(display-mode: standalone)').matches) {
    return true;
  }
  const ref = (globalThis?.document?.referrer || '');
  if (isAndroid() && ref.includes('android-app://')) {
    return true;
  }
  return false;
};

export const getBrowserName = (): string => {
  const ua = (globalThis?.navigator?.userAgent || '').toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  return 'unknown';
};

export const getOSName = (): string => {
  const platform = (globalThis?.navigator?.platform || '').toLowerCase();
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('linux')) return 'linux';
  return 'unknown';
};

export const supportsBeforeInstallPrompt = (): boolean => {
  const w = ((globalThis as unknown as { window?: unknown }).window ?? (globalThis as unknown)) as Record<string, unknown>;
  return !!w && 'onbeforeinstallprompt' in w;
};

export const supportsWebShare = (): boolean => {
  return typeof globalThis !== 'undefined' && 'share' in (globalThis.navigator || ({} as Navigator));
};

export const supportsFileSystemAccess = (): boolean => {
  const w = ((globalThis as unknown as { window?: unknown }).window ?? (globalThis as unknown)) as Record<string, unknown>;
  return !!w && 'showOpenFilePicker' in w;
};

export const supportsPushNotifications = (): boolean => {
  const w = ((globalThis as unknown as { window?: unknown }).window ?? (globalThis as unknown)) as Record<string, unknown>;
  const n = (globalThis?.navigator || ({} as Navigator));
  return !!w && 'Notification' in w && 'serviceWorker' in n;
};

export const canInstall = (): boolean => {
  if (isAndroid() && supportsBeforeInstallPrompt()) {
    return true;
  }
  
  if (isIOS() && !isStandalone()) {
    return true;
  }
  
  if (isDesktop() && supportsBeforeInstallPrompt()) {
    return true;
  }
  
  return false;
};

export const getPlatformInfo = (): PlatformInfo => {
  return {
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isDesktop: isDesktop(),
    isMobile: isMobile(),
    isStandalone: isStandalone(),
    canInstall: canInstall(),
    browserName: getBrowserName(),
    osName: getOSName(),
    supportsBeforeInstallPrompt: supportsBeforeInstallPrompt(),
    supportsWebShare: supportsWebShare(),
    supportsFileSystemAccess: supportsFileSystemAccess(),
    supportsPushNotifications: supportsPushNotifications(),
  };
};

export const getInstallInstructions = (): string[] => {
  if (isIOS()) {
    return [
      'Tap the Share button in Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to install RepCue as an app'
    ];
  }
  
  if (isAndroid()) {
    return [
      'Tap the menu button (three dots)',
      'Select "Add to Home screen" or "Install app"',
      'Tap "Add" to install RepCue as an app'
    ];
  }
  
  if (isDesktop()) {
    return [
      'Look for the install button in your browser\'s address bar',
      'Click the install button or use the browser menu',
      'Select "Install RepCue" to add it as a desktop app'
    ];
  }
  
  return ['RepCue can be installed as an app for a better experience'];
};

export const detectPlatform = getPlatformInfo;

export const usePlatform = (): PlatformInfo => {
  return getPlatformInfo();
};

export const logPlatformInfo = (): void => {
  const info = getPlatformInfo();
  console.group('🔍 Platform Detection');
  // Debug output gated by global flag
  logger.log('Platform Info:', info)
  logger.log('User Agent:', navigator.userAgent)
  logger.log('Platform:', navigator.platform)
  console.log('Install Instructions:', getInstallInstructions());
  console.groupEnd();
};
