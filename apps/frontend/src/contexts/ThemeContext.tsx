import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { themeService } from '../services/themeService';
import type { Theme } from '../types/theme';
import type { AppSettings } from '../types';
import { DEFAULT_THEME_ID } from '../config/features';
import logger from '../utils/logger';

/**
 * Theme Context Value Interface
 * Provides theme state and actions to consuming components
 */
interface ThemeContextValue {
  /** Currently active theme */
  currentTheme: Theme;
  /** ID of the currently active theme */
  currentThemeId: string;
  /** Current color mode (light/dark) */
  colorMode: 'light' | 'dark';
  /** All available themes */
  availableThemes: Theme[];
  /** Change the active theme */
  setTheme: (themeId: string) => Promise<void>;
  /** Whether theme is currently being applied */
  isApplying: boolean;
}

/**
 * Theme Context
 * React Context for theme state management
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * useTheme Hook
 * Custom hook to access theme context
 * 
 * @throws {Error} If used outside ThemeProvider
 * @returns {ThemeContextValue} Theme context value
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentTheme, setTheme, colorMode } = useTheme();
 *   
 *   return (
 *     <button onClick={() => setTheme('energetic')}>
 *       Switch to {currentTheme.name}
 *     </button>
 *   );
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- Hook must be exported for use in components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * ThemeProvider Props
 */
interface ThemeProviderProps {
  /** Child components to wrap */
  children: ReactNode;
  /** App settings containing theme preference and dark mode */
  appSettings: AppSettings;
  /** Callback when theme changes (for saving to storage) */
  onSettingsChange: (settings: Partial<AppSettings>) => Promise<void>;
}

/**
 * ThemeProvider Component
 * Provides theme context to the application
 * 
 * Features:
 * - Loads user's theme preference from AppSettings on mount
 * - Applies theme dynamically via ThemeService
 * - Syncs with dark mode setting
 * - Provides theme switching functionality
 * - Persists theme changes to storage
 * 
 * @component
 * @example
 * ```tsx
 * <ThemeProvider 
 *   appSettings={appSettings} 
 *   onSettingsChange={handleSettingsChange}
 * >
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, appSettings, onSettingsChange }: ThemeProviderProps): React.JSX.Element {
  // Get theme ID from settings, fallback to default
  const themeIdFromSettings = appSettings.theme_id || DEFAULT_THEME_ID;
  
  // State: Current theme ID
  const [currentThemeId, setCurrentThemeId] = useState<string>(themeIdFromSettings);
  
  // State: Is theme being applied
  const [isApplying, setIsApplying] = useState<boolean>(false);
  
  // Ref: Track the last theme ID we set locally to avoid reverting on stale appSettings
  const lastSetThemeIdRef = useRef<string>(themeIdFromSettings);

  // Memoized: Get all available themes
  const availableThemes = useMemo(() => {
    return themeService.getAllThemes();
  }, []);

  // Memoized: Get current theme object
  const currentTheme = useMemo(() => {
    return themeService.getThemeById(currentThemeId);
  }, [currentThemeId]);

  // Derive color mode from dark mode setting
  const colorMode: 'light' | 'dark' = appSettings.dark_mode ? 'dark' : 'light';

  /**
   * Apply theme to the DOM
   * Uses ThemeService to inject CSS variables
   */
  const applyThemeToDOM = useCallback((theme: Theme, mode: 'light' | 'dark') => {
    try {
      logger.log('[ThemeContext] Applying theme:', theme.id, 'mode:', mode);
      themeService.applyTheme(theme, mode);
      logger.log('[ThemeContext] Theme applied successfully');
    } catch (error) {
      logger.error('[ThemeContext] Error applying theme:', error);
    }
  }, []);

  /**
   * Change theme handler
   * Updates state, persists to storage, and applies to DOM
   */
  const setTheme = useCallback(async (themeId: string): Promise<void> => {
    if (themeId === currentThemeId) {
      logger.log('[ThemeContext] Theme already active:', themeId);
      return;
    }

    setIsApplying(true);
    
    try {
      logger.log('[ThemeContext] Changing theme to:', themeId);
      
      // Get the new theme
      const newTheme = themeService.getThemeById(themeId);
      
      // Update local state immediately
      setCurrentThemeId(themeId);
      
      // Track this as a local change to prevent reverting
      lastSetThemeIdRef.current = themeId;
      
      // Apply to DOM immediately
      applyThemeToDOM(newTheme, colorMode);
      
      // Persist to storage (async, parent will update appSettings eventually)
      await onSettingsChange({ theme_id: themeId });
      
      logger.log('[ThemeContext] Theme changed successfully to:', themeId);
    } catch (error) {
      logger.error('[ThemeContext] Error changing theme:', error);
      // Revert to previous theme on error
      setCurrentThemeId(currentThemeId);
      lastSetThemeIdRef.current = currentThemeId;
    } finally {
      setIsApplying(false);
    }
  }, [currentThemeId, colorMode, applyThemeToDOM, onSettingsChange]);

  /**
   * Effect: Apply theme when theme or color mode changes
   * This ensures theme is applied on initial mount and whenever settings change
   */
  useEffect(() => {
    logger.log('[ThemeContext] Effect: Applying theme', currentThemeId, 'with mode', colorMode);
    applyThemeToDOM(currentTheme, colorMode);
  }, [currentTheme, colorMode, applyThemeToDOM, currentThemeId]);

  /**
   * Effect: Sync with appSettings.theme_id changes
   * Handles external theme changes (e.g., from settings sync)
   * Only syncs if not currently applying a theme (avoids reverting during local changes)
   */
  useEffect(() => {
    // Don't sync if we're currently applying a theme (local change in progress)
    if (isApplying) {
      logger.log('[ThemeContext] Skipping sync - theme application in progress');
      return;
    }
    
    const settingsThemeId = appSettings.theme_id || DEFAULT_THEME_ID;
    
    // Log all theme sync attempts for debugging
    logger.log('[ThemeContext] Sync check - settings:', settingsThemeId, 'current:', currentThemeId, 'lastSet:', lastSetThemeIdRef.current);
    
    // Only sync if the incoming theme is different from both current AND last set
    // This prevents reverting to stale appSettings after a local change
    if (settingsThemeId !== currentThemeId && settingsThemeId !== lastSetThemeIdRef.current) {
      logger.warn('[ThemeContext] THEME REVERSION DETECTED! Syncing theme from external settings change:', settingsThemeId, '(was:', currentThemeId, ')');
      setCurrentThemeId(settingsThemeId);
      lastSetThemeIdRef.current = settingsThemeId;
    }
  }, [appSettings.theme_id, currentThemeId, isApplying]);

  // Memoized context value
  const contextValue = useMemo<ThemeContextValue>(() => ({
    currentTheme,
    currentThemeId,
    colorMode,
    availableThemes,
    setTheme,
    isApplying,
  }), [currentTheme, currentThemeId, colorMode, availableThemes, setTheme, isApplying]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Note: ThemeContext is not exported to comply with react-refresh/only-export-components
// If needed for testing, access it through the useTheme hook or test the ThemeProvider directly
