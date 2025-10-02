import { useEffect, useState } from 'react';

export type DarkModePreference = 'light' | 'dark' | 'system';

/**
 * Enhanced dark mode hook with system preference detection,
 * smooth transitions, and proper color token switching
 */
export const useDarkMode = () => {
  const [preference, setPreference] = useState<DarkModePreference>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('darkModePreference');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system'; // Default to system preference
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize based on current preference
    if (preference === 'system') {
      try {
        const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
        return mediaQuery?.matches ?? false;
      } catch {
        return false;
      }
    }
    return preference === 'dark';
  });

  // Update dark mode state based on preference
  useEffect(() => {
    const updateDarkMode = (prefersDark?: boolean) => {
      let shouldBeDark: boolean;

      if (preference === 'system') {
        try {
          const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
          shouldBeDark = prefersDark ?? mediaQuery?.matches ?? false;
        } catch {
          shouldBeDark = prefersDark ?? false;
        }
      } else {
        shouldBeDark = preference === 'dark';
      }

      setIsDarkMode(shouldBeDark);

      // Apply to document with smooth transition
      const root = document.documentElement;

      // Add transition class for smooth color changes
      root.style.transition = 'background-color 0.3s ease, color 0.3s ease';

      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Remove transition after animation completes
      setTimeout(() => {
        root.style.transition = '';
      }, 300);

      // Update meta theme-color for browser UI (using proper dark mode color from specs)
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', shouldBeDark ? '#121212' : '#0096C7');
      }
    };

    // System preference change listener
    let mediaQuery: MediaQueryList | undefined;
    try {
      mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    } catch {
      mediaQuery = undefined;
    }

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (preference === 'system') {
        updateDarkMode(e.matches);
      }
    };

    // Initial update
    updateDarkMode();

    // Listen for system preference changes
    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleSystemChange);
    }

    // Save preference to localStorage
    localStorage.setItem('darkModePreference', preference);

    return () => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      }
    };
  }, [preference]);

  const toggleDarkMode = () => {
    setPreference(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light'; // system -> light
    });
  };

  const setDarkModePreference = (newPreference: DarkModePreference) => {
    setPreference(newPreference);
  };

  // Get current system preference
  let systemPrefersDark = false;
  try {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    systemPrefersDark = mediaQuery?.matches ?? false;
  } catch {
    systemPrefersDark = false;
  }

  return {
    isDarkMode,
    preference,
    systemPrefersDark,
    toggleDarkMode,
    setDarkModePreference,
    // Utility functions for dual-theme color system
    getColorToken: (lightColor: string, darkColor: string) => isDarkMode ? darkColor : lightColor,
    // CSS custom property helper
    cssVar: (property: string, lightValue: string, darkValue: string) =>
      `${property}: ${isDarkMode ? darkValue : lightValue};`,
    // Semantic color helpers based on design tokens
    getPrimaryColor: () => isDarkMode ? '#0096C7' : '#0096C7',
    getPrimaryHoverColor: () => isDarkMode ? '#33ADD3' : '#0077A5',
    getPrimaryFocusColor: () => isDarkMode ? '#5CC2DE' : '#005F84',
    getBackgroundPrimary: () => isDarkMode ? '#121212' : '#ffffff',
    getBackgroundSecondary: () => isDarkMode ? '#0f172a' : '#f8fafc',
    getSurfacePrimary: () => isDarkMode ? '#0f172a' : '#ffffff',
    getTextPrimary: () => isDarkMode ? '#f8fafc' : '#0f172a',
    getTextSecondary: () => isDarkMode ? '#f1f5f9' : '#334155',
    getBorderPrimary: () => isDarkMode ? '#334155' : '#e2e8f0',
    getErrorColor: () => isDarkMode ? '#FF5C66' : '#E63946',
    // Helper to generate Tailwind classes with proper dark mode variants
    generateTailwindClass: (lightClass: string, darkClass: string) =>
      `${lightClass} dark:${darkClass}`,
  };
};