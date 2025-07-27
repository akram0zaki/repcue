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
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  return (
    /ipad|iphone|ipod/.test(userAgent) ||
    (platform === 'macintel' && navigator.maxTouchPoints > 1) ||
    platform.includes('iphone') ||
    platform.includes('ipad')
  );
};

export const isAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
};

export const isMobile = (): boolean => {
  return isIOS() || isAndroid();
};

export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /ipad/.test(userAgent) ||
    (/android/.test(userAgent) && !/mobile/.test(userAgent)) ||
    /tablet/.test(userAgent)
  );
};

export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};

export const isStandalone = (): boolean => {
  if (isIOS()) {
    return (navigator as unknown as Record<string, unknown>).standalone === true;
  }
  
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  if (isAndroid() && document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
};

export const getBrowserName = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg/')) return 'edge';
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  
  return 'unknown';
};

export const getOSName = (): string => {
  const platform = navigator.platform?.toLowerCase() || '';
  
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('linux')) return 'linux';
  
  return 'unknown';
};

export const supportsBeforeInstallPrompt = (): boolean => {
  return 'onbeforeinstallprompt' in window;
};

export const supportsWebShare = (): boolean => {
  return 'share' in navigator;
};

export const supportsFileSystemAccess = (): boolean => {
  return 'showOpenFilePicker' in window;
};

export const supportsPushNotifications = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
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
  console.log('Platform Info:', info);
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.log('Install Instructions:', getInstallInstructions());
  console.groupEnd();
};
