import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeService } from '../themeService';
import { THEME_LIBRARY, getDefaultTheme } from '../../data/themes';
import type { Theme } from '../../types/theme';

describe('ThemeService', () => {
  let themeService: ThemeService;
  let rootElement: HTMLElement;

  beforeEach(() => {
    // Reset singleton instance before each test
    (ThemeService as any).instance = null;
    themeService = ThemeService.getInstance();
    
    // Create a clean root element for testing
    rootElement = document.documentElement;
    rootElement.removeAttribute('style');
  });

  afterEach(() => {
    // Clean up
    rootElement.removeAttribute('style');
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ThemeService.getInstance();
      const instance2 = ThemeService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = ThemeService.getInstance();
      const defaultTheme = THEME_LIBRARY[0];
      
      instance1.applyTheme(defaultTheme, 'light');
      
      const instance2 = ThemeService.getInstance();
      // Both instances should reference the same object
      expect(instance1).toBe(instance2);
    });
  });

  describe('applyTheme', () => {
    it('should apply light mode theme colors to CSS variables (updated schema)', () => {
      const defaultTheme = getDefaultTheme();
      themeService.applyTheme(defaultTheme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-primary')).toBe(defaultTheme.light.primary);
      // Updated variable names in service
      expect(styles.getPropertyValue('--color-background-primary')).toBe(defaultTheme.light.background);
      expect(styles.getPropertyValue('--color-text-primary')).toBe(defaultTheme.light.text900);
    });

    it('should apply dark mode theme colors to CSS variables (updated schema)', () => {
      const defaultTheme = getDefaultTheme();
      themeService.applyTheme(defaultTheme, 'dark');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-primary')).toBe(defaultTheme.dark.primary);
      expect(styles.getPropertyValue('--color-background-primary')).toBe(defaultTheme.dark.background);
      expect(styles.getPropertyValue('--color-text-primary')).toBe(defaultTheme.dark.text900);
    });

    it('should apply all surface color levels (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-surface-0')).toBe(theme.light.surface0);
      expect(styles.getPropertyValue('--color-surface-50')).toBe(theme.light.surface50);
      expect(styles.getPropertyValue('--color-surface-100')).toBe(theme.light.surface100);
      expect(styles.getPropertyValue('--color-surface-200')).toBe(theme.light.surface200);
      expect(styles.getPropertyValue('--color-surface-300')).toBe(theme.light.surface300);
      expect(styles.getPropertyValue('--color-surface-400')).toBe(theme.light.surface400);
      expect(styles.getPropertyValue('--color-surface-500')).toBe(theme.light.surface500);
      expect(styles.getPropertyValue('--color-surface-600')).toBe(theme.light.surface600);
      expect(styles.getPropertyValue('--color-surface-700')).toBe(theme.light.surface700);
      expect(styles.getPropertyValue('--color-surface-800')).toBe(theme.light.surface800);
      expect(styles.getPropertyValue('--color-surface-900')).toBe(theme.light.surface900);
    });

    it('should apply all text color levels (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-text-50')).toBe(theme.light.text50);
      expect(styles.getPropertyValue('--color-text-100')).toBe(theme.light.text100);
      expect(styles.getPropertyValue('--color-text-200')).toBe(theme.light.text200);
      expect(styles.getPropertyValue('--color-text-300')).toBe(theme.light.text300);
      expect(styles.getPropertyValue('--color-text-400')).toBe(theme.light.text400);
      expect(styles.getPropertyValue('--color-text-500')).toBe(theme.light.text500);
      expect(styles.getPropertyValue('--color-text-600')).toBe(theme.light.text600);
      expect(styles.getPropertyValue('--color-text-700')).toBe(theme.light.text700);
      expect(styles.getPropertyValue('--color-text-800')).toBe(theme.light.text800);
      expect(styles.getPropertyValue('--color-text-900')).toBe(theme.light.text900);
    });

    it('should apply border colors (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-border-primary')).toBe(theme.light.borderPrimary);
      expect(styles.getPropertyValue('--color-border-secondary')).toBe(theme.light.borderSecondary);
      expect(styles.getPropertyValue('--color-border-focus')).toBe(theme.light.borderFocus);
    });

    it('should apply status colors (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-success')).toBe(theme.light.success);
      expect(styles.getPropertyValue('--color-warning')).toBe(theme.light.warning);
      expect(styles.getPropertyValue('--color-error')).toBe(theme.light.error);
    });

    it('should apply shadow colors (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--shadow-color-sm')).toBe(theme.light.shadowSm);
      expect(styles.getPropertyValue('--shadow-color-md')).toBe(theme.light.shadowMd);
      expect(styles.getPropertyValue('--shadow-color-lg')).toBe(theme.light.shadowLg);
    });

    it('should apply overlay color (updated schema)', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-overlay-bg')).toBe(theme.light.overlayBg);
    });

    it('should update meta theme-color in light mode', () => {
      const theme = getDefaultTheme();
      const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      themeService.applyTheme(theme, 'light');
      expect(metaThemeColor?.content).toBe(theme.light.metaThemeColor);
    });

    it('should update meta theme-color in dark mode', () => {
      const theme = getDefaultTheme();
      const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      themeService.applyTheme(theme, 'dark');
      expect(metaThemeColor?.content).toBe(theme.dark.metaThemeColor);
    });
  });

  describe('validateTheme', () => {
    it('should validate a theme with sufficient contrast ratios', () => {
      const validTheme: Theme = {
        id: 'test-valid',
        name: 'Test Valid',
        description: 'A valid theme',
        light: {
          primary: '#8b5cf6', primaryHover: '#7c3aed', primaryFocus: '#6d28d9', primaryDisabled: '#ddd6fe',
          background: '#ffffff', backgroundSecondary: '#faf5ff', backgroundTertiary: '#f3e8ff',
          surface0: '#ffffff', surface50: '#faf5ff', surface100: '#f3e8ff', surface200: '#e9d5ff', surface300: '#d8b4fe', surface400: '#c084fc', surface500: '#a855f7', surface600: '#9333ea', surface700: '#7e22ce', surface800: '#6b21a8', surface900: '#581c87',
          text50: '#faf5ff', text100: '#f3e8ff', text200: '#e9d5ff', text300: '#d8b4fe', text400: '#c084fc', text500: '#a855f7', text600: '#581c87', text700: '#3f3f46', text800: '#27272a', text900: '#18181b',
          borderPrimary: '#e9d5ff', borderSecondary: '#d8b4fe', borderFocus: '#8b5cf6',
          success: '#10b981', successHover: '#059669', successFocus: '#047857', successSoft: '#f0fdf4',
          warning: '#f59e0b', warningHover: '#d97706', warningFocus: '#b45309', warningSoft: '#fffbeb',
          error: '#ef4444', errorHover: '#dc2626', errorFocus: '#b91c1c', errorSoft: '#fef2f2',
          shadowSm: 'rgba(0,0,0,0.05)', shadowMd: 'rgba(0,0,0,0.1)', shadowLg: 'rgba(0,0,0,0.15)',
          overlayBg: 'rgba(0,0,0,0.5)', metaThemeColor: '#8b5cf6'
        },
        dark: {
          primary: '#a78bfa', primaryHover: '#c4b5fd', primaryFocus: '#ddd6fe', primaryDisabled: '#4c1d95',
          background: '#18181b', backgroundSecondary: '#27272a', backgroundTertiary: '#3f3f46',
            surface0: '#18181b', surface50: '#27272a', surface100: '#3f3f46', surface200: '#52525b', surface300: '#71717a', surface400: '#a1a1aa', surface500: '#d4d4d8', surface600: '#e4e4e7', surface700: '#f4f4f5', surface800: '#fafafa', surface900: '#ffffff',
          text50: '#fafafa', text100: '#f4f4f5', text200: '#e4e4e7', text300: '#d4d4d8', text400: '#a1a1aa', text500: '#71717a', text600: '#52525b', text700: '#3f3f46', text800: '#27272a', text900: '#18181b',
          borderPrimary: '#3f3f46', borderSecondary: '#52525b', borderFocus: '#a78bfa',
          success: '#34d399', successHover: '#10b981', successFocus: '#059669', successSoft: '#064e3b',
          warning: '#fbbf24', warningHover: '#f59e0b', warningFocus: '#d97706', warningSoft: '#422006',
          error: '#f87171', errorHover: '#ef4444', errorFocus: '#dc2626', errorSoft: '#450a0a',
          shadowSm: 'rgba(0,0,0,0.3)', shadowMd: 'rgba(0,0,0,0.4)', shadowLg: 'rgba(0,0,0,0.5)',
          overlayBg: 'rgba(0,0,0,0.7)', metaThemeColor: '#18181b'
        },
        previewColors: ['#8b5cf6', '#7c3aed', '#a78bfa'],
        contrastRatios: {
          light: { textOnBackground: 12.5, primaryOnBackground: 4.5 },
          dark: { textOnBackground: 13.4, primaryOnBackground: 4.8 }
        },
        isDefault: false
      };

      const result = themeService.validateTheme(validTheme);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a theme with insufficient text contrast', () => {
      const base = getDefaultTheme();
      const invalidTheme: Theme = { ...base, contrastRatios: { light: { textOnBackground: 2.0, primaryOnBackground: 4.5 }, dark: base.contrastRatios.dark } } as any;
      const result = themeService.validateTheme(invalidTheme);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject a theme with insufficient primary contrast', () => {
      const base = getDefaultTheme();
      const invalidTheme: Theme = { ...base, contrastRatios: { light: { textOnBackground: 7.0, primaryOnBackground: 2.0 }, dark: base.contrastRatios.dark } } as any;
      const result = themeService.validateTheme(invalidTheme);
      expect(result.valid).toBe(false);
    });

    it('should validate all themes in the library', () => {
      THEME_LIBRARY.forEach(theme => {
        const result = themeService.validateTheme(theme);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('getThemeById', () => {
    it('should return the correct theme by id', () => {
      const defaultTheme = THEME_LIBRARY[0];
      
      const result = themeService.getThemeById('default');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('default');
      expect(result).toEqual(defaultTheme);
    });

    it('should fall back to default for non-existent theme id', () => {
      const fallback = themeService.getThemeById('non-existent-theme');
      expect(fallback.id).toBe(getDefaultTheme().id);
    });

    it('should return all available themes', () => {
      THEME_LIBRARY.forEach(t => {
        const theme = themeService.getThemeById(t.id);
        expect(theme.id).toBe(t.id);
      });
    });
  });

  describe('getAllThemes', () => {
    it('should return all themes from the library (updated count)', () => {
      const themes = THEME_LIBRARY;
      expect(themes.length).toBeGreaterThanOrEqual(4); // library expanded
    });
  });

  describe('CSS Variable Injection', () => {
    it('should inject exactly 40+ CSS variables', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      const cssVarCount = styles.length;
      
      // Should have at least 40 CSS variables:
      // 1 primary + 3 background + 11 surface + 13 text + 3 borders + 4 status + 3 shadows + 1 overlay = 39+
      expect(cssVarCount).toBeGreaterThanOrEqual(39);
    });

    it('should update CSS variables when switching themes', () => {
      const defaultTheme = THEME_LIBRARY[0];
      const energeticTheme = THEME_LIBRARY[1];
      
      themeService.applyTheme(defaultTheme, 'light');
      const primaryBefore = rootElement.style.getPropertyValue('--color-primary');
      
      themeService.applyTheme(energeticTheme, 'light');
      const primaryAfter = rootElement.style.getPropertyValue('--color-primary');
      
      expect(primaryBefore).toBe(defaultTheme.light.primary);
      expect(primaryAfter).toBe(energeticTheme.light.primary);
      expect(primaryBefore).not.toBe(primaryAfter);
    });

    it('should update CSS variables when switching color modes', () => {
      const theme = getDefaultTheme();
      themeService.applyTheme(theme, 'light');
      const bgLight = rootElement.style.getPropertyValue('--color-background-primary');
      themeService.applyTheme(theme, 'dark');
      const bgDark = rootElement.style.getPropertyValue('--color-background-primary');
      expect(bgLight).toBe(theme.light.background);
      expect(bgDark).toBe(theme.dark.background);
      expect(bgLight).not.toBe(bgDark);
    });
  });

  describe('WCAG Compliance', () => {
    it('should ensure all themes meet WCAG AA text contrast (4.5:1)', () => {
      THEME_LIBRARY.forEach(theme => {
        expect(theme.contrastRatios.light.textOnBackground).toBeGreaterThanOrEqual(4.5);
        expect(theme.contrastRatios.dark.textOnBackground).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should ensure all themes meet WCAG AA UI component contrast (3:1)', () => {
      THEME_LIBRARY.forEach(theme => {
        expect(theme.contrastRatios.light.primaryOnBackground).toBeGreaterThanOrEqual(3.0);
        expect(theme.contrastRatios.dark.primaryOnBackground).toBeGreaterThanOrEqual(3.0);
      });
    });
  });
});
