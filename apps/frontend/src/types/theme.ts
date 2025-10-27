/**
 * Theme System Type Definitions
 * Defines types for RepCue's theme customization system
 */

/**
 * Color mode: light or dark variant of a theme
 */
export type ColorMode = 'light' | 'dark';

/**
 * Complete color palette for a single mode (light or dark)
 * All colors defined as hex strings for consistency
 */
export interface ThemePalette {
  // Primary Brand Colors
  /** Main accent color (e.g., #0096C7 for default theme) */
  primary: string;
  /** Hover state for primary elements */
  primaryHover: string;
  /** Focus/active state for primary elements */
  primaryFocus: string;
  /** Disabled state for primary elements */
  primaryDisabled: string;

  // Background Colors
  /** Main background color */
  background: string;
  /** Secondary background color (slightly different shade) */
  backgroundSecondary: string;
  /** Tertiary background color (for layered depth) */
  backgroundTertiary: string;

  // Surface Colors (cards, modals, elevated elements)
  /** Base surface color */
  surface0: string;
  surface50: string;
  surface100: string;
  surface200: string;
  surface300: string;
  surface400: string;
  surface500: string;
  surface600: string;
  surface700: string;
  surface800: string;
  surface900: string;

  // Text Colors
  /** Lightest text (used in dark mode as primary text) */
  text50: string;
  text100: string;
  text200: string;
  text300: string;
  text400: string;
  text500: string;
  text600: string;
  text700: string;
  text800: string;
  /** Darkest text (used in light mode as primary text) */
  text900: string;

  // Border Colors
  /** Primary border color */
  borderPrimary: string;
  /** Secondary borders */
  borderSecondary: string;
  /** Focus indicator borders */
  borderFocus: string;

  // Status Colors
  /** Success state (e.g., #52B788) */
  success: string;
  /** Success hover state */
  successHover: string;
  /** Success focus state */
  successFocus: string;
  /** Background for success banners/alerts */
  successSoft: string;

  /** Warning state */
  warning: string;
  /** Warning hover state */
  warningHover: string;
  /** Warning focus state */
  warningFocus: string;
  /** Background for warning banners/alerts */
  warningSoft: string;

  /** Error state */
  error: string;
  /** Error hover state */
  errorHover: string;
  /** Error focus state */
  errorFocus: string;
  /** Background for error banners/alerts */
  errorSoft: string;

  // Shadow Colors (RGBA for transparency)
  /** Small shadow (subtle elevation) */
  shadowSm: string;
  /** Medium shadow (card elevation) */
  shadowMd: string;
  /** Large shadow (modal elevation) */
  shadowLg: string;

  // Special Purpose
  /** Modal/drawer overlay background (rgba) */
  overlayBg: string;
  /** Browser chrome/theme color (meta tag) */
  metaThemeColor: string;
}

/**
 * Complete theme definition with light and dark palettes
 */
export interface Theme {
  /** Unique identifier (e.g., 'default', 'energetic', 'professional', 'calm') */
  id: string;
  
  /** Display name (i18n key: 'themes.{id}.name') */
  name: string;
  
  /** Description (i18n key: 'themes.{id}.description') */
  description: string;

  /** Light mode color palette */
  light: ThemePalette;
  
  /** Dark mode color palette */
  dark: ThemePalette;

  // Metadata
  /** True for the default theme */
  isDefault?: boolean;
  
  /** Array of 3-5 representative colors for preview swatch */
  previewColors: string[];

  // Accessibility - Pre-calculated WCAG contrast ratios
  contrastRatios: {
    /** Light mode contrast ratios */
    light: {
      /** Text on background contrast (must be >= 4.5:1 for WCAG AA) */
      textOnBackground: number;
      /** Primary color on background contrast (must be >= 3:1 for UI elements) */
      primaryOnBackground: number;
    };
    /** Dark mode contrast ratios */
    dark: {
      /** Text on background contrast (must be >= 4.5:1 for WCAG AA) */
      textOnBackground: number;
      /** Primary color on background contrast (must be >= 3:1 for UI elements) */
      primaryOnBackground: number;
    };
  };
}
