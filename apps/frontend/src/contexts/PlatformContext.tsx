/**
 * Platform Context
 * 
 * Provides platform detection and capabilities throughout the app.
 * Components can use this to adapt their behavior and appearance
 * based on whether they're running on iOS, Android, or Web.
 * 
 * @module PlatformContext
 */
import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { 
  isNativePlatform, 
  isIOS, 
  isAndroid, 
  isWeb, 
  getPlatform 
} from '../utils/nativeCapabilities';

/**
 * Platform type enumeration
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * Platform context value
 */
export interface PlatformContextValue {
  /** Current platform */
  platform: Platform;
  /** Whether running in a native app (iOS or Android) */
  isNative: boolean;
  /** Whether running on iOS */
  isIOS: boolean;
  /** Whether running on Android */
  isAndroid: boolean;
  /** Whether running on web (browser/PWA) */
  isWeb: boolean;
  /** Whether the device supports haptic feedback */
  supportsHaptics: boolean;
  /** Whether native dialogs are available */
  supportsNativeDialogs: boolean;
  /** Whether safe area insets should be applied */
  hasSafeArea: boolean;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

/**
 * Platform Context Provider
 * 
 * Wraps the app to provide platform detection throughout the component tree.
 * Values are computed once at mount and memoized for performance.
 */
export const PlatformProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useMemo<PlatformContextValue>(() => {
    const native = isNativePlatform();
    const ios = isIOS();
    const android = isAndroid();
    const web = isWeb();

    return {
      platform: getPlatform(),
      isNative: native,
      isIOS: ios,
      isAndroid: android,
      isWeb: web,
      // Haptics available on native platforms
      supportsHaptics: native,
      // Native dialogs available on iOS and Android
      supportsNativeDialogs: native,
      // Safe areas needed on iOS native apps (notch, home indicator)
      hasSafeArea: ios,
    };
  }, []);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

/**
 * Hook to access platform context
 * 
 * @returns Platform context value
 * @throws Error if used outside PlatformProvider
 * 
 * @example
 * ```tsx
 * const { isIOS, isNative } = usePlatform();
 * 
 * return (
 *   <div className={isIOS ? 'ios-style' : 'default-style'}>
 *     {isNative ? <NativeComponent /> : <WebComponent />}
 *   </div>
 * );
 * ```
 */
export const usePlatform = (): PlatformContextValue => {
  const context = useContext(PlatformContext);
  
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  
  return context;
};

/**
 * Hook to get platform-specific class names
 * 
 * @returns Object with platform class helpers
 * 
 * @example
 * ```tsx
 * const { platformClass, when } = usePlatformClasses();
 * 
 * return (
 *   <div className={platformClass({
 *     base: 'rounded-lg p-4',
 *     ios: 'bg-white/80 backdrop-blur',
 *     android: 'bg-white shadow-md',
 *     web: 'bg-white border'
 *   })}>
 *     Content
 *   </div>
 * );
 * ```
 */
export const usePlatformClasses = () => {
  const { platform, isIOS, isAndroid, isWeb } = usePlatform();

  return {
    /**
     * Get platform-specific class string
     */
    platformClass: (options: {
      base?: string;
      ios?: string;
      android?: string;
      web?: string;
      native?: string;
    }): string => {
      const classes: string[] = [];
      
      if (options.base) classes.push(options.base);
      
      if (isIOS && options.ios) classes.push(options.ios);
      if (isAndroid && options.android) classes.push(options.android);
      if (isWeb && options.web) classes.push(options.web);
      if ((isIOS || isAndroid) && options.native) classes.push(options.native);
      
      return classes.join(' ');
    },

    /**
     * Conditionally apply class based on platform
     */
    when: (condition: 'ios' | 'android' | 'web' | 'native', className: string): string => {
      switch (condition) {
        case 'ios':
          return isIOS ? className : '';
        case 'android':
          return isAndroid ? className : '';
        case 'web':
          return isWeb ? className : '';
        case 'native':
          return (isIOS || isAndroid) ? className : '';
        default:
          return '';
      }
    },

    /** Current platform */
    platform,
  };
};

export default PlatformContext;
