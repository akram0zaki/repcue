import { useEffect, useState } from 'react';

export interface AccessibilityPreferences {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersReducedData: boolean;
  prefersReducedTransparency: boolean;
}

/**
 * Hook for detecting and responding to user accessibility preferences
 * Supports WCAG 2.1 AA guidelines and system preferences
 */
export const useAccessibility = () => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => ({
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    prefersHighContrast: window.matchMedia?.('(prefers-contrast: high)').matches ?? false,
    prefersReducedData: window.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false,
    prefersReducedTransparency: window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches ?? false,
  }));

  useEffect(() => {
    // Media queries for accessibility preferences
    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia?.('(prefers-contrast: high)');
    const reducedDataQuery = window.matchMedia?.('(prefers-reduced-data: reduce)');
    const reducedTransparencyQuery = window.matchMedia?.('(prefers-reduced-transparency: reduce)');

    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: reducedMotionQuery?.matches ?? false,
        prefersHighContrast: highContrastQuery?.matches ?? false,
        prefersReducedData: reducedDataQuery?.matches ?? false,
        prefersReducedTransparency: reducedTransparencyQuery?.matches ?? false,
      });
    };

    // Event handlers
    const handleReducedMotionChange = () => updatePreferences();
    const handleHighContrastChange = () => updatePreferences();
    const handleReducedDataChange = () => updatePreferences();
    const handleReducedTransparencyChange = () => updatePreferences();

    // Add listeners
    reducedMotionQuery?.addEventListener('change', handleReducedMotionChange);
    highContrastQuery?.addEventListener('change', handleHighContrastChange);
    reducedDataQuery?.addEventListener('change', handleReducedDataChange);
    reducedTransparencyQuery?.addEventListener('change', handleReducedTransparencyChange);

    // Apply initial preferences to document
    updatePreferences();

    return () => {
      // Remove listeners
      reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery?.removeEventListener('change', handleHighContrastChange);
      reducedDataQuery?.removeEventListener('change', handleReducedDataChange);
      reducedTransparencyQuery?.removeEventListener('change', handleReducedTransparencyChange);
    };
  }, []);

  // Apply accessibility classes to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply reduced motion
    if (preferences.prefersReducedMotion) {
      root.classList.add('motion-reduce');
    } else {
      root.classList.remove('motion-reduce');
    }

    // Apply high contrast
    if (preferences.prefersHighContrast) {
      root.classList.add('contrast-high');
    } else {
      root.classList.remove('contrast-high');
    }

    // Apply reduced transparency
    if (preferences.prefersReducedTransparency) {
      root.classList.add('transparency-reduce');
    } else {
      root.classList.remove('transparency-reduce');
    }

    // Set CSS custom properties for easier styling
    root.style.setProperty('--motion-duration', preferences.prefersReducedMotion ? '0ms' : '300ms');
    root.style.setProperty('--motion-ease', preferences.prefersReducedMotion ? 'none' : 'ease');
  }, [preferences]);

  return {
    ...preferences,
    // Utility functions
    getAnimationClass: (normalClass: string, reducedClass?: string) =>
      preferences.prefersReducedMotion ? (reducedClass || '') : normalClass,

    getTransitionDuration: (normalDuration: string, reducedDuration = '0ms') =>
      preferences.prefersReducedMotion ? reducedDuration : normalDuration,

    // Focus management utilities
    focusElement: (element: HTMLElement | null) => {
      if (element) {
        element.focus();
        // Ensure focus is visible for keyboard users
        element.classList.add('focus-visible');
      }
    },

    // Announcement for screen readers
    announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;

      document.body.appendChild(announcement);

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    },
  };
};