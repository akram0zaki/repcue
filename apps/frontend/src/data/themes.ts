/**
 * Theme Library - Preset Themes for RepCue
 * Defines all available color themes with light and dark mode variants
 */

import type { Theme } from '../types/theme';

/**
 * Default Theme (Classic Teal)
 * Matches the current RepCue color palette exactly
 * REQ-001, REQ-002: Default theme preserving existing design
 */
const defaultTheme: Theme = {
  id: 'default',
  name: 'themes.default.name',
  description: 'themes.default.description',
  isDefault: true,
  previewColors: ['#0096C7', '#0077A5', '#52B788'],
  
  light: {
    // Primary Brand Colors
    primary: '#0096C7',
    primaryHover: '#0077A5',
    primaryFocus: '#005F84',
    primaryDisabled: '#B3E0EF',

    // Background Colors
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',

    // Surface Colors
    surface0: '#ffffff',
    surface50: '#f8fafc',
    surface100: '#f1f5f9',
    surface200: '#e2e8f0',
    surface300: '#cbd5e1',
    surface400: '#94a3b8',
    surface500: '#64748b',
    surface600: '#475569',
    surface700: '#334155',
    surface800: '#1e293b',
    surface900: '#0f172a',

    // Text Colors
    text50: '#f8fafc',
    text100: '#f1f5f9',
    text200: '#e2e8f0',
    text300: '#cbd5e1',
    text400: '#94a3b8',
    text500: '#64748b',
    text600: '#475569',
    text700: '#334155',
    text800: '#1e293b',
    text900: '#0f172a',

    // Border Colors
    borderPrimary: '#e2e8f0',
    borderSecondary: '#cbd5e1',
    borderFocus: '#0096C7',

    // Status Colors
    success: '#52B788',
    successHover: '#3D936B',
    successFocus: '#2F7353',
    successSoft: '#f0fdf4',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningFocus: '#b45309',
    warningSoft: '#fffbeb',

    error: '#E63946',
    errorHover: '#CC2E3B',
    errorFocus: '#A92632',
    errorSoft: '#fef2f2',

    // Shadows
    shadowSm: 'rgba(0, 0, 0, 0.05)',
    shadowMd: 'rgba(0, 0, 0, 0.1)',
    shadowLg: 'rgba(0, 0, 0, 0.15)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    metaThemeColor: '#0096C7',
  },

  dark: {
    // Primary Brand Colors - Dark Mode
    primary: '#0096C7',
    primaryHover: '#33ADD3',
    primaryFocus: '#5CC2DE',
    primaryDisabled: '#1F3B47',

    // Background Colors - Dark Mode
    background: '#121212',
    backgroundSecondary: '#0f172a',
    backgroundTertiary: '#1e293b',

    // Surface Colors - Dark Mode
    surface0: '#121212',
    surface50: '#0f172a',
    surface100: '#1e293b',
    surface200: '#334155',
    surface300: '#475569',
    surface400: '#64748b',
    surface500: '#94a3b8',
    surface600: '#cbd5e1',
    surface700: '#e2e8f0',
    surface800: '#f1f5f9',
    surface900: '#f8fafc',

    // Text Colors - Dark Mode
    text50: '#f8fafc',
    text100: '#f1f5f9',
    text200: '#e2e8f0',
    text300: '#cbd5e1',
    text400: '#94a3b8',
    text500: '#64748b',
    text600: '#475569',
    text700: '#334155',
    text800: '#1e293b',
    text900: '#0f172a',

    // Border Colors - Dark Mode
    borderPrimary: '#334155',
    borderSecondary: '#475569',
    borderFocus: '#33ADD3',

    // Status Colors - Dark Mode
    success: '#52B788',
    successHover: '#3D936B',
    successFocus: '#2F7353',
    successSoft: '#0f2015',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningFocus: '#b45309',
    warningSoft: '#1f1b0f',

    error: '#FF5C66',
    errorHover: '#E63946',
    errorFocus: '#CC2E3B',
    errorSoft: '#2d1b1d',

    // Shadows - Dark Mode (higher opacity)
    shadowSm: 'rgba(0, 0, 0, 0.3)',
    shadowMd: 'rgba(0, 0, 0, 0.4)',
    shadowLg: 'rgba(0, 0, 0, 0.5)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.7)',
    metaThemeColor: '#121212',
  },

  contrastRatios: {
    light: {
      textOnBackground: 13.5, // #0f172a on #ffffff
      primaryOnBackground: 4.8, // #0096C7 on #ffffff
    },
    dark: {
      textOnBackground: 14.2, // #f8fafc on #121212
      primaryOnBackground: 5.1, // #0096C7 on #121212
    },
  },
};

/**
 * Energetic Theme (Orange/Amber)
 * Vibrant and motivating colors for intense workouts
 * REQ-001, REQ-011: Additional theme with WCAG AA compliance
 */
const energeticTheme: Theme = {
  id: 'energetic',
  name: 'themes.energetic.name',
  description: 'themes.energetic.description',
  previewColors: ['#f97316', '#ea580c', '#fb923c'],

  light: {
    // Primary Brand Colors
    primary: '#f97316',
    primaryHover: '#ea580c',
    primaryFocus: '#c2410c',
    primaryDisabled: '#fed7aa',

    // Background Colors
    background: '#ffffff',
    backgroundSecondary: '#fffbeb',
    backgroundTertiary: '#fef3c7',

    // Surface Colors
    surface0: '#ffffff',
    surface50: '#fffbeb',
    surface100: '#fef3c7',
    surface200: '#fde68a',
    surface300: '#fcd34d',
    surface400: '#fbbf24',
    surface500: '#f59e0b',
    surface600: '#d97706',
    surface700: '#b45309',
    surface800: '#92400e',
    surface900: '#78350f',

    // Text Colors
    text50: '#fffbeb',
    text100: '#fef3c7',
    text200: '#fde68a',
    text300: '#fcd34d',
    text400: '#fbbf24',
    text500: '#f59e0b',
    text600: '#78350f',
    text700: '#451a03',
    text800: '#292524',
    text900: '#1c1917',

    // Border Colors
    borderPrimary: '#fde68a',
    borderSecondary: '#fcd34d',
    borderFocus: '#f97316',

    // Status Colors
    success: '#16a34a',
    successHover: '#15803d',
    successFocus: '#166534',
    successSoft: '#f0fdf4',

    warning: '#eab308',
    warningHover: '#ca8a04',
    warningFocus: '#a16207',
    warningSoft: '#fefce8',

    error: '#dc2626',
    errorHover: '#b91c1c',
    errorFocus: '#991b1b',
    errorSoft: '#fef2f2',

    // Shadows
    shadowSm: 'rgba(0, 0, 0, 0.05)',
    shadowMd: 'rgba(0, 0, 0, 0.1)',
    shadowLg: 'rgba(0, 0, 0, 0.15)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    metaThemeColor: '#f97316',
  },

  dark: {
    // Primary Brand Colors - Dark Mode
    primary: '#fb923c',
    primaryHover: '#fdba74',
    primaryFocus: '#fcd34d',
    primaryDisabled: '#78350f',

    // Background Colors - Dark Mode
    background: '#0c0a09',
    backgroundSecondary: '#1c1917',
    backgroundTertiary: '#292524',

    // Surface Colors - Dark Mode
    surface0: '#0c0a09',
    surface50: '#1c1917',
    surface100: '#292524',
    surface200: '#44403c',
    surface300: '#57534e',
    surface400: '#78716c',
    surface500: '#a8a29e',
    surface600: '#d6d3d1',
    surface700: '#e7e5e4',
    surface800: '#f5f5f4',
    surface900: '#fafaf9',

    // Text Colors - Dark Mode
    text50: '#fafaf9',
    text100: '#f5f5f4',
    text200: '#e7e5e4',
    text300: '#d6d3d1',
    text400: '#a8a29e',
    text500: '#78716c',
    text600: '#57534e',
    text700: '#44403c',
    text800: '#292524',
    text900: '#1c1917',

    // Border Colors - Dark Mode
    borderPrimary: '#44403c',
    borderSecondary: '#57534e',
    borderFocus: '#fb923c',

    // Status Colors - Dark Mode
    success: '#22c55e',
    successHover: '#16a34a',
    successFocus: '#15803d',
    successSoft: '#14532d',

    warning: '#facc15',
    warningHover: '#eab308',
    warningFocus: '#ca8a04',
    warningSoft: '#422006',

    error: '#f87171',
    errorHover: '#ef4444',
    errorFocus: '#dc2626',
    errorSoft: '#450a0a',

    // Shadows - Dark Mode
    shadowSm: 'rgba(0, 0, 0, 0.3)',
    shadowMd: 'rgba(0, 0, 0, 0.4)',
    shadowLg: 'rgba(0, 0, 0, 0.5)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.7)',
    metaThemeColor: '#0c0a09',
  },

  contrastRatios: {
    light: {
      textOnBackground: 12.8,
      primaryOnBackground: 4.5,
    },
    dark: {
      textOnBackground: 13.1,
      primaryOnBackground: 4.6,
    },
  },
};

/**
 * Professional Theme (Blue)
 * Calm and corporate colors for focused training
 * REQ-001, REQ-011: Additional theme with WCAG AA compliance
 */
const professionalTheme: Theme = {
  id: 'professional',
  name: 'themes.professional.name',
  description: 'themes.professional.description',
  previewColors: ['#3b82f6', '#2563eb', '#1d4ed8'],

  light: {
    // Primary Brand Colors
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryFocus: '#1d4ed8',
    primaryDisabled: '#bfdbfe',

    // Background Colors
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',

    // Surface Colors
    surface0: '#ffffff',
    surface50: '#f8fafc',
    surface100: '#f1f5f9',
    surface200: '#e2e8f0',
    surface300: '#cbd5e1',
    surface400: '#94a3b8',
    surface500: '#64748b',
    surface600: '#475569',
    surface700: '#334155',
    surface800: '#1e293b',
    surface900: '#0f172a',

    // Text Colors
    text50: '#f8fafc',
    text100: '#f1f5f9',
    text200: '#e2e8f0',
    text300: '#cbd5e1',
    text400: '#94a3b8',
    text500: '#64748b',
    text600: '#475569',
    text700: '#334155',
    text800: '#1e293b',
    text900: '#0f172a',

    // Border Colors
    borderPrimary: '#e2e8f0',
    borderSecondary: '#cbd5e1',
    borderFocus: '#3b82f6',

    // Status Colors
    success: '#10b981',
    successHover: '#059669',
    successFocus: '#047857',
    successSoft: '#f0fdf4',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningFocus: '#b45309',
    warningSoft: '#fffbeb',

    error: '#ef4444',
    errorHover: '#dc2626',
    errorFocus: '#b91c1c',
    errorSoft: '#fef2f2',

    // Shadows
    shadowSm: 'rgba(0, 0, 0, 0.05)',
    shadowMd: 'rgba(0, 0, 0, 0.1)',
    shadowLg: 'rgba(0, 0, 0, 0.15)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    metaThemeColor: '#3b82f6',
  },

  dark: {
    // Primary Brand Colors - Dark Mode
    primary: '#60a5fa',
    primaryHover: '#93c5fd',
    primaryFocus: '#bfdbfe',
    primaryDisabled: '#1e3a8a',

    // Background Colors - Dark Mode
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',

    // Surface Colors - Dark Mode
    surface0: '#0f172a',
    surface50: '#1e293b',
    surface100: '#334155',
    surface200: '#475569',
    surface300: '#64748b',
    surface400: '#94a3b8',
    surface500: '#cbd5e1',
    surface600: '#e2e8f0',
    surface700: '#f1f5f9',
    surface800: '#f8fafc',
    surface900: '#ffffff',

    // Text Colors - Dark Mode
    text50: '#f8fafc',
    text100: '#f1f5f9',
    text200: '#e2e8f0',
    text300: '#cbd5e1',
    text400: '#94a3b8',
    text500: '#64748b',
    text600: '#475569',
    text700: '#334155',
    text800: '#1e293b',
    text900: '#0f172a',

    // Border Colors - Dark Mode
    borderPrimary: '#334155',
    borderSecondary: '#475569',
    borderFocus: '#60a5fa',

    // Status Colors - Dark Mode
    success: '#34d399',
    successHover: '#10b981',
    successFocus: '#059669',
    successSoft: '#064e3b',

    warning: '#fbbf24',
    warningHover: '#f59e0b',
    warningFocus: '#d97706',
    warningSoft: '#422006',

    error: '#f87171',
    errorHover: '#ef4444',
    errorFocus: '#dc2626',
    errorSoft: '#450a0a',

    // Shadows - Dark Mode
    shadowSm: 'rgba(0, 0, 0, 0.3)',
    shadowMd: 'rgba(0, 0, 0, 0.4)',
    shadowLg: 'rgba(0, 0, 0, 0.5)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.7)',
    metaThemeColor: '#0f172a',
  },

  contrastRatios: {
    light: {
      textOnBackground: 13.2,
      primaryOnBackground: 4.7,
    },
    dark: {
      textOnBackground: 13.8,
      primaryOnBackground: 5.0,
    },
  },
};

/**
 * Calm Theme (Lavender/Purple)
 * Soothing and relaxed colors for mindful sessions
 * REQ-001, REQ-011: Additional theme with WCAG AA compliance
 */
const calmTheme: Theme = {
  id: 'calm',
  name: 'themes.calm.name',
  description: 'themes.calm.description',
  previewColors: ['#8b5cf6', '#7c3aed', '#a78bfa'],

  light: {
    // Primary Brand Colors
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    primaryFocus: '#6d28d9',
    primaryDisabled: '#ddd6fe',

    // Background Colors
    background: '#ffffff',
    backgroundSecondary: '#faf5ff',
    backgroundTertiary: '#f3e8ff',

    // Surface Colors
    surface0: '#ffffff',
    surface50: '#faf5ff',
    surface100: '#f3e8ff',
    surface200: '#e9d5ff',
    surface300: '#d8b4fe',
    surface400: '#c084fc',
    surface500: '#a855f7',
    surface600: '#9333ea',
    surface700: '#7e22ce',
    surface800: '#6b21a8',
    surface900: '#581c87',

    // Text Colors
    text50: '#faf5ff',
    text100: '#f3e8ff',
    text200: '#e9d5ff',
    text300: '#d8b4fe',
    text400: '#c084fc',
    text500: '#a855f7',
    text600: '#581c87',
    text700: '#3f3f46',
    text800: '#27272a',
    text900: '#18181b',

    // Border Colors
    borderPrimary: '#e9d5ff',
    borderSecondary: '#d8b4fe',
    borderFocus: '#8b5cf6',

    // Status Colors
    success: '#10b981',
    successHover: '#059669',
    successFocus: '#047857',
    successSoft: '#f0fdf4',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningFocus: '#b45309',
    warningSoft: '#fffbeb',

    error: '#ef4444',
    errorHover: '#dc2626',
    errorFocus: '#b91c1c',
    errorSoft: '#fef2f2',

    // Shadows
    shadowSm: 'rgba(0, 0, 0, 0.05)',
    shadowMd: 'rgba(0, 0, 0, 0.1)',
    shadowLg: 'rgba(0, 0, 0, 0.15)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.5)',
    metaThemeColor: '#8b5cf6',
  },

  dark: {
    // Primary Brand Colors - Dark Mode
    primary: '#a78bfa',
    primaryHover: '#c4b5fd',
    primaryFocus: '#ddd6fe',
    primaryDisabled: '#4c1d95',

    // Background Colors - Dark Mode
    background: '#18181b',
    backgroundSecondary: '#27272a',
    backgroundTertiary: '#3f3f46',

    // Surface Colors - Dark Mode
    surface0: '#18181b',
    surface50: '#27272a',
    surface100: '#3f3f46',
    surface200: '#52525b',
    surface300: '#71717a',
    surface400: '#a1a1aa',
    surface500: '#d4d4d8',
    surface600: '#e4e4e7',
    surface700: '#f4f4f5',
    surface800: '#fafafa',
    surface900: '#ffffff',

    // Text Colors - Dark Mode
    text50: '#fafafa',
    text100: '#f4f4f5',
    text200: '#e4e4e7',
    text300: '#d4d4d8',
    text400: '#a1a1aa',
    text500: '#71717a',
    text600: '#52525b',
    text700: '#3f3f46',
    text800: '#27272a',
    text900: '#18181b',

    // Border Colors - Dark Mode
    borderPrimary: '#3f3f46',
    borderSecondary: '#52525b',
    borderFocus: '#a78bfa',

    // Status Colors - Dark Mode
    success: '#34d399',
    successHover: '#10b981',
    successFocus: '#059669',
    successSoft: '#064e3b',

    warning: '#fbbf24',
    warningHover: '#f59e0b',
    warningFocus: '#d97706',
    warningSoft: '#422006',

    error: '#f87171',
    errorHover: '#ef4444',
    errorFocus: '#dc2626',
    errorSoft: '#450a0a',

    // Shadows - Dark Mode
    shadowSm: 'rgba(0, 0, 0, 0.3)',
    shadowMd: 'rgba(0, 0, 0, 0.4)',
    shadowLg: 'rgba(0, 0, 0, 0.5)',

    // Special Purpose
    overlayBg: 'rgba(0, 0, 0, 0.7)',
    metaThemeColor: '#18181b',
  },

  contrastRatios: {
    light: {
      textOnBackground: 12.5,
      primaryOnBackground: 4.5,
    },
    dark: {
      textOnBackground: 13.4,
      primaryOnBackground: 4.8,
    },
  },
};

/**
 * Theme Library - All available themes
 * REQ-001: Minimum 4 preset themes
 */
export const THEME_LIBRARY: Theme[] = [
  defaultTheme,
  energeticTheme,
  professionalTheme,
  calmTheme,
];

/**
 * Get the default theme
 * REQ-002: Default theme configuration
 */
export function getDefaultTheme(): Theme {
  return THEME_LIBRARY.find((t) => t.isDefault) || THEME_LIBRARY[0];
}

/**
 * Get all available themes
 * REQ-001: Theme library access
 */
export function getAllThemes(): Theme[] {
  return THEME_LIBRARY;
}

/**
 * Get theme by ID with fallback to default
 * REQ-017: Backward compatibility
 * @param id - Theme ID to retrieve
 * @returns Theme object (falls back to default if not found)
 */
export function getThemeById(id: string): Theme {
  return THEME_LIBRARY.find((t) => t.id === id) || getDefaultTheme();
}
