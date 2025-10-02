/**
 * Design Token Constants for RepCue UI System
 *
 * Centralized design system tokens following 8pt grid and teal-based color system
 * Provides consistent styling across the application
 */

export const COLORS = {
  light: {
    // Primary teal-based colors
    primary: '#0096C7',
    primaryHover: '#0077A5',
    primaryFocus: '#005F84',
    primaryDisabled: '#B3E0EF',
    primary50: '#E6F7FF',
    primary100: '#B3E0EF',
    primary500: '#0096C7',
    primary600: '#0077A5',
    primary700: '#005F84',

    // Secondary colors
    secondary: '#90E0EF',
    secondaryHover: '#74D0E4',
    secondaryFocus: '#5BBACD',
    secondaryDisabled: '#D6F4F9',
    secondary100: '#D6F4F9',
    secondary300: '#90E0EF',
    secondary400: '#74D0E4',
    secondary500: '#5BBACD',

    // Success colors (updated to match specs)
    success: '#52B788',
    successHover: '#3D936B',
    successFocus: '#2F7353',
    success50: '#f0fdf4',
    success500: '#52B788',
    success600: '#3D936B',
    success700: '#2F7353',

    // Error colors (updated to match specs)
    error: '#E63946',
    errorHover: '#CC2E3B',
    errorFocus: '#A92632',
    error50: '#fef2f2',
    error500: '#E63946',
    error600: '#CC2E3B',
    error700: '#A92632',

    // Warning colors
    warning: '#f59e0b',
    warningHover: '#d97706',
    warning50: '#fffbeb',
    warning500: '#f59e0b',
    warning600: '#d97706',

    // Neutral colors
    background: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
  },

  dark: {
    // Primary teal-based colors for dark mode
    primary: '#0096C7',
    primaryHover: '#33ADD3',
    primaryFocus: '#5CC2DE',
    primaryDisabled: '#1F3B47',
    primary50: '#0F1A1C',
    primary100: '#1F3B47',
    primary500: '#0096C7',
    primary600: '#33ADD3',
    primary700: '#5CC2DE',

    // Secondary colors for dark mode
    secondary: '#90E0EF',
    secondaryHover: '#74D0E4',
    secondaryFocus: '#5BBACD',
    secondaryDisabled: '#1F3B47',
    secondary100: '#1F3B47',
    secondary300: '#90E0EF',
    secondary400: '#74D0E4',
    secondary500: '#5BBACD',

    // Success colors for dark mode
    success: '#52B788',
    successHover: '#3D936B',
    successFocus: '#2F7353',
    success50: '#0f1b0f',
    success500: '#52B788',
    success600: '#3D936B',
    success700: '#2F7353',

    // Error colors for dark mode
    error: '#E63946',
    errorHover: '#CC2E3B',
    errorFocus: '#A92632',
    error50: '#1f0f0f',
    error500: '#E63946',
    error600: '#CC2E3B',
    error700: '#A92632',

    // Warning colors for dark mode
    warning: '#f59e0b',
    warningHover: '#d97706',
    warning50: '#1f1a0f',
    warning500: '#f59e0b',
    warning600: '#d97706',

    // Neutral colors for dark mode
    background: '#111827',
    surface: '#1f2937',
    border: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
  }
} as const;

export const SPACING = {
  // 8pt grid system values
  xs: '8px',    // 8pt
  sm: '16px',   // 16pt
  md: '24px',   // 24pt
  lg: '32px',   // 32pt
  xl: '40px',   // 40pt
  xxl: '48px',  // 48pt

  // Additional spacing values
  '0.5': '4px',   // 4pt
  '1': '8px',     // 8pt
  '1.5': '12px',  // 12pt
  '2': '16px',    // 16pt
  '3': '24px',    // 24pt
  '4': '32px',    // 32pt
  '5': '40px',    // 40pt
  '6': '48px',    // 48pt
} as const;

export const TYPOGRAPHY = {
  // Typography classes mapped to Tailwind custom sizes
  h1: 'text-h1',        // 32px, line-height 1.25, font-weight 700
  h2: 'text-h2',        // 24px, line-height 1.3, font-weight 600
  h3: 'text-h3',        // 20px, line-height 1.4, font-weight 600
  body: 'text-body',    // 16px, line-height 1.5, font-weight 400
  caption: 'text-caption', // 14px, line-height 1.4, font-weight 500
  small: 'text-small',  // 12px, line-height 1.3, font-weight 500

  // Font family utilities
  fontSans: 'font-sans',       // Inter for LTR languages
  fontSansAr: 'font-sans-ar',  // Cairo for Arabic languages
} as const;

export const SHADOWS = {
  // Shadow system for depth
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

export const BORDERS = {
  // Border radius system
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',

  // Border widths
  thin: '1px',
  medium: '2px',
  thick: '4px',
} as const;

export const BREAKPOINTS = {
  // Responsive breakpoints (matching Tailwind defaults)
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const COMPONENT_SIZES = {
  // Standard component sizes
  touchTarget: '44px',     // Minimum touch target size
  buttonHeight: '44px',    // Standard button height
  inputHeight: '44px',     // Standard input height
  navHeight: '64px',       // Navigation bar height
  iconSize: '24px',        // Standard icon size
  iconSizeSm: '20px',      // Small icon size
  iconSizeLg: '32px',      // Large icon size
} as const;

// Utility functions for working with design tokens
export const getColorToken = (token: keyof typeof COLORS.light, theme: 'light' | 'dark' = 'light') => {
  return COLORS[theme][token];
};

export const getSpacingToken = (token: keyof typeof SPACING) => {
  return SPACING[token];
};

// CSS custom properties for dynamic theming
export const CSS_VARIABLES = {
  '--color-primary': 'var(--color-primary, #0096C7)',
  '--color-primary-hover': 'var(--color-primary-hover, #0077A5)',
  '--color-primary-focus': 'var(--color-primary-focus, #005F84)',
  '--spacing-xs': 'var(--spacing-xs, 8px)',
  '--spacing-sm': 'var(--spacing-sm, 16px)',
  '--spacing-md': 'var(--spacing-md, 24px)',
  '--spacing-lg': 'var(--spacing-lg, 32px)',
} as const;

// Export default design tokens for easy importing
export default {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
  BORDERS,
  BREAKPOINTS,
  COMPONENT_SIZES,
  getColorToken,
  getSpacingToken,
  CSS_VARIABLES,
};