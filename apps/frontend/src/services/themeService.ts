/**
 * Theme Service - Singleton service for theme management
 * Handles theme application, CSS variable injection, and validation
 * REQ-004, REQ-009: Dynamic theme application without inline styles
 */

import type { Theme, ColorMode, ThemePalette } from '../types/theme';
import { THEME_LIBRARY, getDefaultTheme } from '../data/themes';
import logger from '../utils/logger';

export class ThemeService {
  private static instance: ThemeService;

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Get all available themes
   * REQ-001: Theme library access
   */
  public getAllThemes(): Theme[] {
    return THEME_LIBRARY;
  }

  /**
   * Get theme by ID
   * REQ-017: Falls back to default theme if ID not found
   * @param id - Theme ID to retrieve
   * @returns Theme object
   */
  public getThemeById(id: string): Theme {
    const theme = THEME_LIBRARY.find((t) => t.id === id);
    if (!theme) {
      logger.warn(`Theme '${id}' not found, falling back to default theme`);
      return getDefaultTheme();
    }
    return theme;
  }

  /**
   * Apply theme to DOM by injecting CSS variables
   * REQ-004: Real-time theme application
   * REQ-008: No inline styles on components (only CSS variables on :root)
   * REQ-009: CSS variable architecture
   * 
   * @param theme - Theme to apply
   * @param mode - 'light' or 'dark' mode
   */
  public applyTheme(theme: Theme, mode: ColorMode): void {
    const startTime = performance.now();
    
    try {
      const palette = mode === 'dark' ? theme.dark : theme.light;
      const root = document.documentElement;

      // Inject all CSS variables into :root
      this.injectCSSVariables(root, palette);

      // Update browser chrome color (meta theme-color tag)
      this.updateMetaThemeColor(palette.metaThemeColor);

      const duration = performance.now() - startTime;
      logger.debug(`Theme '${theme.id}' applied in ${duration.toFixed(2)}ms (${mode} mode)`);
    } catch (error) {
      logger.error('Failed to apply theme:', error);
      // On error, attempt to apply default theme as fallback
      if (theme.id !== 'default') {
        logger.warn('Attempting to apply default theme as fallback');
        this.applyTheme(getDefaultTheme(), mode);
      }
    }
  }

  /**
   * Inject CSS custom properties into root element
   * Maps ThemePalette to CSS variable names
   * @private
   */
  private injectCSSVariables(root: HTMLElement, palette: ThemePalette): void {
    // Primary Brand Colors
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-primary-hover', palette.primaryHover);
    root.style.setProperty('--color-primary-focus', palette.primaryFocus);
    root.style.setProperty('--color-primary-disabled', palette.primaryDisabled);

    // Background Colors
    root.style.setProperty('--color-background-primary', palette.background);
    root.style.setProperty('--color-background-secondary', palette.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', palette.backgroundTertiary);

    // Surface Colors (all shades)
    root.style.setProperty('--color-surface-0', palette.surface0);
    root.style.setProperty('--color-surface-50', palette.surface50);
    root.style.setProperty('--color-surface-100', palette.surface100);
    root.style.setProperty('--color-surface-200', palette.surface200);
    root.style.setProperty('--color-surface-300', palette.surface300);
    root.style.setProperty('--color-surface-400', palette.surface400);
    root.style.setProperty('--color-surface-500', palette.surface500);
    root.style.setProperty('--color-surface-600', palette.surface600);
    root.style.setProperty('--color-surface-700', palette.surface700);
    root.style.setProperty('--color-surface-800', palette.surface800);
    root.style.setProperty('--color-surface-900', palette.surface900);

    // Text Colors (all shades)
    root.style.setProperty('--color-text-50', palette.text50);
    root.style.setProperty('--color-text-100', palette.text100);
    root.style.setProperty('--color-text-200', palette.text200);
    root.style.setProperty('--color-text-300', palette.text300);
    root.style.setProperty('--color-text-400', palette.text400);
    root.style.setProperty('--color-text-500', palette.text500);
    root.style.setProperty('--color-text-600', palette.text600);
    root.style.setProperty('--color-text-700', palette.text700);
    root.style.setProperty('--color-text-800', palette.text800);
    root.style.setProperty('--color-text-900', palette.text900);

    // Legacy text system mappings (for backward compatibility)
    root.style.setProperty('--color-text-primary', palette.text900); // Darkest in light mode
    root.style.setProperty('--color-text-secondary', palette.text700);
    root.style.setProperty('--color-text-tertiary', palette.text600);
    root.style.setProperty('--color-text-inverse', palette.text50); // Lightest

    // Legacy surface system mappings (for backward compatibility)
    root.style.setProperty('--color-surface-primary', palette.surface0);
    root.style.setProperty('--color-surface-secondary', palette.surface50);
    root.style.setProperty('--color-surface-hover', palette.surface100);

    // Border Colors
    root.style.setProperty('--color-border-primary', palette.borderPrimary);
    root.style.setProperty('--color-border-secondary', palette.borderSecondary);
    root.style.setProperty('--color-border-focus', palette.borderFocus);

    // Status Colors - Success
    root.style.setProperty('--color-success', palette.success);
    root.style.setProperty('--color-success-hover', palette.successHover);
    root.style.setProperty('--color-success-focus', palette.successFocus);
    root.style.setProperty('--color-success-background', palette.successSoft);

    // Status Colors - Warning
    root.style.setProperty('--color-warning', palette.warning);
    root.style.setProperty('--color-warning-hover', palette.warningHover);
    root.style.setProperty('--color-warning-focus', palette.warningFocus);
    root.style.setProperty('--color-warning-background', palette.warningSoft);

    // Status Colors - Error
    root.style.setProperty('--color-error', palette.error);
    root.style.setProperty('--color-error-hover', palette.errorHover);
    root.style.setProperty('--color-error-focus', palette.errorFocus);
    root.style.setProperty('--color-error-background', palette.errorSoft);

    // Interactive States (for backward compatibility)
    root.style.setProperty('--color-interactive-hover', palette.surface100);
    root.style.setProperty('--color-interactive-active', palette.surface200);
    root.style.setProperty('--color-interactive-disabled', palette.surface100);

    // Shadow System
    // Note: CSS box-shadow syntax requires full declaration, not just color
    // We store RGBA values and construct shadows in CSS
    root.style.setProperty('--shadow-color-sm', palette.shadowSm);
    root.style.setProperty('--shadow-color-md', palette.shadowMd);
    root.style.setProperty('--shadow-color-lg', palette.shadowLg);

    // Construct complete shadow declarations
    root.style.setProperty('--shadow-sm', `0 1px 2px 0 ${palette.shadowSm}`);
    root.style.setProperty('--shadow-md', `0 4px 6px -1px ${palette.shadowMd}, 0 2px 4px -2px ${palette.shadowMd}`);
    root.style.setProperty('--shadow-lg', `0 10px 15px -3px ${palette.shadowLg}, 0 4px 6px -4px ${palette.shadowLg}`);

    // Overlay Background
    root.style.setProperty('--color-overlay-bg', palette.overlayBg);
  }

  /**
   * Update browser chrome color (meta theme-color tag)
   * @private
   */
  private updateMetaThemeColor(color: string): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    } else {
      // Create meta tag if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = color;
      document.head.appendChild(meta);
    }
  }

  /**
   * Validate theme meets WCAG 2.1 AA accessibility standards
   * REQ-011: Accessibility compliance
   * 
   * @param theme - Theme to validate
   * @returns Validation result with any errors
   */
  public validateTheme(theme: Theme): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check light mode contrast ratios
    if (theme.contrastRatios.light.textOnBackground < 4.5) {
      errors.push(
        `Light mode text contrast ${theme.contrastRatios.light.textOnBackground.toFixed(1)} < 4.5:1 (WCAG AA minimum)`
      );
    }
    if (theme.contrastRatios.light.primaryOnBackground < 3.0) {
      errors.push(
        `Light mode primary contrast ${theme.contrastRatios.light.primaryOnBackground.toFixed(1)} < 3:1 (WCAG AA UI minimum)`
      );
    }

    // Check dark mode contrast ratios
    if (theme.contrastRatios.dark.textOnBackground < 4.5) {
      errors.push(
        `Dark mode text contrast ${theme.contrastRatios.dark.textOnBackground.toFixed(1)} < 4.5:1 (WCAG AA minimum)`
      );
    }
    if (theme.contrastRatios.dark.primaryOnBackground < 3.0) {
      errors.push(
        `Dark mode primary contrast ${theme.contrastRatios.dark.primaryOnBackground.toFixed(1)} < 3:1 (WCAG AA UI minimum)`
      );
    }

    // Validate required fields exist
    if (!theme.id || !theme.name || !theme.description) {
      errors.push('Theme missing required fields (id, name, or description)');
    }

    if (!theme.light || !theme.dark) {
      errors.push('Theme missing light or dark palette');
    }

    if (!theme.previewColors || theme.previewColors.length < 3) {
      errors.push('Theme must have at least 3 preview colors');
    }

    const valid = errors.length === 0;

    if (!valid) {
      logger.warn(`Theme '${theme.id}' validation failed:`, errors);
    }

    return { valid, errors };
  }

  /**
   * Validate all themes in library
   * Useful for CI/CD pipeline validation
   * 
   * @returns Array of validation results for all themes
   */
  public validateAllThemes(): Array<{ themeId: string; valid: boolean; errors: string[] }> {
    return THEME_LIBRARY.map((theme) => ({
      themeId: theme.id,
      ...this.validateTheme(theme),
    }));
  }
}

// Export singleton instance getter
export const themeService = ThemeService.getInstance();
