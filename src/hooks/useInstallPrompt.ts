/**
 * Custom React Hook for Managing PWA Install Prompts
 * 
 * This hook manages the beforeinstallprompt event and provides a clean interface
 * for handling PWA installation across different platforms.
 * 
 * Features:
 * - Captures and defers the native install prompt
 * - Exposes install availability state
 * - Handles install success/failure states
 * - Privacy-compliant analytics tracking
 * - iOS Safari detection (no beforeinstallprompt support)
 * - Platform-specific install guidance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isIOS, canInstall, getBrowserName, getOSName } from '../utils/platformDetection';

/**
 * BeforeInstallPromptEvent interface for TypeScript
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Install analytics data structure (privacy-compliant)
 */
interface InstallAnalytics {
  timestamp: string;
  platform: string;
  browser: string;
  outcome: 'prompted' | 'accepted' | 'dismissed' | 'failed' | 'not_available';
  method: 'native_prompt' | 'manual_instructions' | 'unsupported';
  error?: string;
}

/**
 * Hook return type
 */
interface UseInstallPromptReturn {
  // State
  isAvailable: boolean;
  canShowPrompt: boolean;
  isInstalling: boolean;
  isInstalled: boolean;
  installError: string | null;
  
  // Actions
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  resetError: () => void;
  
  // Analytics (privacy-compliant)
  getInstallAnalytics: () => InstallAnalytics[];
  clearAnalytics: () => void;
  
  // Platform info
  installMethod: 'native_prompt' | 'manual_instructions' | 'unsupported';
  needsManualInstructions: boolean;
}

/**
 * Storage keys for persistence
 */
const STORAGE_KEYS = {
  PROMPT_DISMISSED: 'repcue_install_prompt_dismissed',
  INSTALL_ANALYTICS: 'repcue_install_analytics',
  LAST_PROMPT_DATE: 'repcue_last_prompt_date',
} as const;

/**
 * Configuration constants
 */
const CONFIG = {
  // Don't show prompt again for 7 days after dismissal
  DISMISSAL_COOLDOWN_DAYS: 7,
  // Maximum analytics entries to store (privacy)
  MAX_ANALYTICS_ENTRIES: 50,
  // Prompt timeout in milliseconds
  PROMPT_TIMEOUT: 5000,
} as const;

/**
 * Custom hook for managing PWA install prompts
 */
export const useInstallPrompt = (): UseInstallPromptReturn => {
  // State management
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [canShowPrompt, setCanShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  
  // Refs for cleanup
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyticsRef = useRef<InstallAnalytics[]>([]);

  /**
   * Load analytics from localStorage
   */
  const loadAnalytics = useCallback((): InstallAnalytics[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INSTALL_ANALYTICS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load install analytics:', error);
      return [];
    }
  }, []);

  /**
   * Save analytics to localStorage (privacy-compliant)
   */
  const saveAnalytics = useCallback((analytics: InstallAnalytics[]): void => {
    try {
      // Limit stored analytics for privacy
      const limitedAnalytics = analytics.slice(-CONFIG.MAX_ANALYTICS_ENTRIES);
      localStorage.setItem(STORAGE_KEYS.INSTALL_ANALYTICS, JSON.stringify(limitedAnalytics));
      analyticsRef.current = limitedAnalytics;
    } catch (error) {
      console.warn('Failed to save install analytics:', error);
    }
  }, []);

  /**
   * Track install event (privacy-compliant)
   */
  const trackInstallEvent = useCallback((
    outcome: InstallAnalytics['outcome'],
    method: InstallAnalytics['method'],
    error?: string
  ): void => {
    const analyticsEntry: InstallAnalytics = {
      timestamp: new Date().toISOString(),
      platform: getOSName(),
      browser: getBrowserName(),
      outcome,
      method,
      ...(error && { error }),
    };

    const currentAnalytics = analyticsRef.current;
    const updatedAnalytics = [...currentAnalytics, analyticsEntry];
    saveAnalytics(updatedAnalytics);
  }, [saveAnalytics]);

  /**
   * Check if prompt was recently dismissed
   */
  const isPromptOnCooldown = useCallback((): boolean => {
    try {
      const dismissedDate = localStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED);
      if (!dismissedDate) return false;

      const dismissalTime = new Date(dismissedDate).getTime();
      const currentTime = new Date().getTime();
      const daysSinceDismissal = (currentTime - dismissalTime) / (1000 * 60 * 60 * 24);

      return daysSinceDismissal < CONFIG.DISMISSAL_COOLDOWN_DAYS;
    } catch (error) {
      console.warn('Failed to check prompt cooldown:', error);
      return false;
    }
  }, []);

  /**
   * Check if app is already installed
   */
  const checkIfInstalled = useCallback((): boolean => {
    // Check for standalone mode (indicates installed PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check for iOS standalone
    if ('standalone' in navigator && (navigator as any).standalone) {
      return true;
    }

    // Check for Android app referrer
    if (document.referrer && document.referrer.includes('android-app://')) {
      return true;
    }

    return false;
  }, []);

  /**
   * Determine install method based on platform
   */
  const getInstallMethod = useCallback((): UseInstallPromptReturn['installMethod'] => {
    if (isIOS()) {
      // iOS Safari doesn't support beforeinstallprompt
      return 'manual_instructions';
    }

    if (canInstall() && deferredPrompt) {
      return 'native_prompt';
    }

    return 'unsupported';
  }, [deferredPrompt]);

  /**
   * Handle beforeinstallprompt event
   */
  const handleBeforeInstallPrompt = useCallback((event: Event): void => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    
    const beforeInstallPromptEvent = event as BeforeInstallPromptEvent;
    
    // Store the event for later use
    setDeferredPrompt(beforeInstallPromptEvent);
    setIsAvailable(true);

    // Check if we can show the prompt (not on cooldown)
    const canShow = !isPromptOnCooldown() && !checkIfInstalled();
    setCanShowPrompt(canShow);

    // Track that prompt is available
    trackInstallEvent('not_available', 'native_prompt');
  }, [isPromptOnCooldown, checkIfInstalled, trackInstallEvent]);

  /**
   * Handle app installed event
   */
  const handleAppInstalled = useCallback((): void => {
    setIsInstalled(true);
    setDeferredPrompt(null);
    setIsAvailable(false);
    setCanShowPrompt(false);
    
    // Track successful installation
    trackInstallEvent('accepted', deferredPrompt ? 'native_prompt' : 'manual_instructions');
  }, [deferredPrompt, trackInstallEvent]);

  /**
   * Prompt for installation
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt || isInstalling) {
      return false;
    }

    setIsInstalling(true);
    setInstallError(null);

    try {
      // Set timeout for prompt
      const timeoutPromise = new Promise<never>((_, reject) => {
        promptTimeoutRef.current = setTimeout(() => {
          reject(new Error('Install prompt timeout'));
        }, CONFIG.PROMPT_TIMEOUT);
      });

      // Show the install prompt
      const promptPromise = deferredPrompt.prompt();
      
      // Wait for either prompt or timeout
      await Promise.race([promptPromise, timeoutPromise]);

      // Clear timeout
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }

      // Track that prompt was shown
      trackInstallEvent('prompted', 'native_prompt');

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanShowPrompt(false);
        setIsAvailable(false);
        trackInstallEvent('accepted', 'native_prompt');
        return true;
      } else {
        // User dismissed the prompt
        trackInstallEvent('dismissed', 'native_prompt');
        dismissPrompt();
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setInstallError(errorMessage);
      trackInstallEvent('failed', 'native_prompt', errorMessage);
      return false;
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      
      // Clear timeout if still active
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
    }
  }, [deferredPrompt, isInstalling, trackInstallEvent]);

  /**
   * Dismiss the install prompt
   */
  const dismissPrompt = useCallback((): void => {
    setCanShowPrompt(false);
    
    // Store dismissal timestamp
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPT_DISMISSED, new Date().toISOString());
    } catch (error) {
      console.warn('Failed to store prompt dismissal:', error);
    }

    // Track dismissal
    trackInstallEvent('dismissed', deferredPrompt ? 'native_prompt' : 'manual_instructions');
  }, [deferredPrompt, trackInstallEvent]);

  /**
   * Reset install error
   */
  const resetError = useCallback((): void => {
    setInstallError(null);
  }, []);

  /**
   * Get install analytics (privacy-compliant)
   */
  const getInstallAnalytics = useCallback((): InstallAnalytics[] => {
    return [...analyticsRef.current];
  }, []);

  /**
   * Clear analytics data
   */
  const clearAnalytics = useCallback((): void => {
    analyticsRef.current = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.INSTALL_ANALYTICS);
    } catch (error) {
      console.warn('Failed to clear analytics:', error);
    }
  }, []);

  /**
   * Setup event listeners and initial state
   */
  useEffect(() => {
    // Load analytics
    analyticsRef.current = loadAnalytics();

    // Check if already installed
    const alreadyInstalled = checkIfInstalled();
    setIsInstalled(alreadyInstalled);

    // Don't set up listeners if already installed
    if (alreadyInstalled) {
      return;
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS or other platforms without beforeinstallprompt
    if (isIOS() && canInstall()) {
      setIsAvailable(true);
      setCanShowPrompt(!isPromptOnCooldown());
    }

    // Cleanup function
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
    };
  }, [
    loadAnalytics,
    checkIfInstalled,
    handleBeforeInstallPrompt,
    handleAppInstalled,
    isPromptOnCooldown,
  ]);

  // Calculate derived state
  const installMethod = getInstallMethod();
  const needsManualInstructions = installMethod === 'manual_instructions';

  return {
    // State
    isAvailable,
    canShowPrompt,
    isInstalling,
    isInstalled,
    installError,
    
    // Actions
    promptInstall,
    dismissPrompt,
    resetError,
    
    // Analytics
    getInstallAnalytics,
    clearAnalytics,
    
    // Platform info
    installMethod,
    needsManualInstructions,
  };
};

export default useInstallPrompt;
