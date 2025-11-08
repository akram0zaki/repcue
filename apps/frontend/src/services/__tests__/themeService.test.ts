import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeService } from '../themeService';
import { THEME_LIBRARY } from '../../data/themes';
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
    it('should apply light mode theme colors to CSS variables', () => {
      const defaultTheme = THEME_LIBRARY[0];
      
      themeService.applyTheme(defaultTheme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-primary')).toBe(defaultTheme.light.primary);
      expect(styles.getPropertyValue('--color-background-base')).toBe(defaultTheme.light.background.base);
      expect(styles.getPropertyValue('--color-text-base')).toBe(defaultTheme.light.text.base);
    });

    it('should apply dark mode theme colors to CSS variables', () => {
      const defaultTheme = THEME_LIBRARY[0];
      
      themeService.applyTheme(defaultTheme, 'dark');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-primary')).toBe(defaultTheme.dark.primary);
      expect(styles.getPropertyValue('--color-background-base')).toBe(defaultTheme.dark.background.base);
      expect(styles.getPropertyValue('--color-text-base')).toBe(defaultTheme.dark.text.base);
    });

    it('should apply all surface color levels', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-surface-0')).toBe(theme.light.surface[0]);
      expect(styles.getPropertyValue('--color-surface-50')).toBe(theme.light.surface[50]);
      expect(styles.getPropertyValue('--color-surface-100')).toBe(theme.light.surface[100]);
      expect(styles.getPropertyValue('--color-surface-200')).toBe(theme.light.surface[200]);
      expect(styles.getPropertyValue('--color-surface-300')).toBe(theme.light.surface[300]);
      expect(styles.getPropertyValue('--color-surface-400')).toBe(theme.light.surface[400]);
      expect(styles.getPropertyValue('--color-surface-500')).toBe(theme.light.surface[500]);
      expect(styles.getPropertyValue('--color-surface-600')).toBe(theme.light.surface[600]);
      expect(styles.getPropertyValue('--color-surface-700')).toBe(theme.light.surface[700]);
      expect(styles.getPropertyValue('--color-surface-800')).toBe(theme.light.surface[800]);
      expect(styles.getPropertyValue('--color-surface-900')).toBe(theme.light.surface[900]);
    });

    it('should apply all text color levels', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-text-50')).toBe(theme.light.text[50]);
      expect(styles.getPropertyValue('--color-text-100')).toBe(theme.light.text[100]);
      expect(styles.getPropertyValue('--color-text-200')).toBe(theme.light.text[200]);
      expect(styles.getPropertyValue('--color-text-300')).toBe(theme.light.text[300]);
      expect(styles.getPropertyValue('--color-text-400')).toBe(theme.light.text[400]);
      expect(styles.getPropertyValue('--color-text-500')).toBe(theme.light.text[500]);
      expect(styles.getPropertyValue('--color-text-600')).toBe(theme.light.text[600]);
      expect(styles.getPropertyValue('--color-text-700')).toBe(theme.light.text[700]);
      expect(styles.getPropertyValue('--color-text-800')).toBe(theme.light.text[800]);
      expect(styles.getPropertyValue('--color-text-900')).toBe(theme.light.text[900]);
    });

    it('should apply border colors', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-border-light')).toBe(theme.light.borders.light);
      expect(styles.getPropertyValue('--color-border-default')).toBe(theme.light.borders.default);
      expect(styles.getPropertyValue('--color-border-strong')).toBe(theme.light.borders.strong);
    });

    it('should apply status colors', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-success')).toBe(theme.light.status.success);
      expect(styles.getPropertyValue('--color-warning')).toBe(theme.light.status.warning);
      expect(styles.getPropertyValue('--color-error')).toBe(theme.light.status.error);
      expect(styles.getPropertyValue('--color-info')).toBe(theme.light.status.info);
    });

    it('should apply shadow colors', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-shadow-sm')).toBe(theme.light.shadows.sm);
      expect(styles.getPropertyValue('--color-shadow-md')).toBe(theme.light.shadows.md);
      expect(styles.getPropertyValue('--color-shadow-lg')).toBe(theme.light.shadows.lg);
    });

    it('should apply overlay color', () => {
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      
      const styles = rootElement.style;
      expect(styles.getPropertyValue('--color-overlay')).toBe(theme.light.overlay);
    });

    it('should update meta theme-color in light mode', () => {
      const theme = THEME_LIBRARY[0];
      const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      
      themeService.applyTheme(theme, 'light');
      
      expect(metaThemeColor?.content).toBe(theme.light.background.base);
    });

    it('should update meta theme-color in dark mode', () => {
      const theme = THEME_LIBRARY[0];
      const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      
      themeService.applyTheme(theme, 'dark');
      
      expect(metaThemeColor?.content).toBe(theme.dark.background.base);
    });
  });

  describe('validateTheme', () => {
    it('should validate a theme with sufficient contrast ratios', () => {
      const validTheme: Theme = {
        id: 'test-valid',
        name: 'Test Valid',
        description: 'A valid theme',
        light: {
          primary: '#0096C7',
          background: {
            base: '#ffffff',
            elevated: '#f8f9fa',
            overlay: '#f1f3f5'
          },
          surface: {
            0: '#ffffff', 50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef',
            300: '#dee2e6', 400: '#ced4da', 500: '#adb5bd', 600: '#6c757d',
            700: '#495057', 800: '#343a40', 900: '#212529'
          },
          text: {
            base: '#212529', secondary: '#495057', muted: '#6c757d',
            50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef', 300: '#dee2e6',
            400: '#ced4da', 500: '#adb5bd', 600: '#6c757d', 700: '#495057',
            800: '#343a40', 900: '#212529'
          },
          borders: { light: '#e9ecef', default: '#dee2e6', strong: '#adb5bd' },
          status: {
            success: '#28a745', warning: '#ffc107', error: '#dc3545', info: '#17a2b8'
          },
          shadows: {
            sm: 'rgba(0, 0, 0, 0.05)', md: 'rgba(0, 0, 0, 0.1)', lg: 'rgba(0, 0, 0, 0.15)'
          },
          overlay: 'rgba(0, 0, 0, 0.5)'
        },
        dark: {
          primary: '#0096C7',
          background: {
            base: '#121212',
            elevated: '#1e1e1e',
            overlay: '#252525'
          },
          surface: {
            0: '#121212', 50: '#1e1e1e', 100: '#252525', 200: '#2d2d2d',
            300: '#383838', 400: '#404040', 500: '#4a4a4a', 600: '#6c757d',
            700: '#8e959c', 800: '#adb5bd', 900: '#dee2e6'
          },
          text: {
            base: '#ffffff', secondary: '#e9ecef', muted: '#adb5bd',
            50: '#121212', 100: '#1e1e1e', 200: '#252525', 300: '#2d2d2d',
            400: '#383838', 500: '#4a4a4a', 600: '#6c757d', 700: '#8e959c',
            800: '#adb5bd', 900: '#ffffff'
          },
          borders: { light: '#2d2d2d', default: '#383838', strong: '#4a4a4a' },
          status: {
            success: '#28a745', warning: '#ffc107', error: '#dc3545', info: '#17a2b8'
          },
          shadows: {
            sm: 'rgba(0, 0, 0, 0.2)', md: 'rgba(0, 0, 0, 0.3)', lg: 'rgba(0, 0, 0, 0.4)'
          },
          overlay: 'rgba(0, 0, 0, 0.7)'
        },
        previewColors: {
          primary: '#0096C7',
          background: '#ffffff',
          surface: '#f1f3f5',
          text: '#212529'
        },
        contrastRatios: {
          textOnBackground: 21,
          textOnPrimary: 4.5,
          primaryOnBackground: 4.5
        }
      };

      const result = themeService.validateTheme(validTheme);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a theme with insufficient text contrast', () => {
      const invalidTheme: Theme = {
        ...THEME_LIBRARY[0],
        contrastRatios: {
          textOnBackground: 2.0, // Below WCAG AA requirement of 4.5:1
          textOnPrimary: 4.5,
          primaryOnBackground: 4.5
        }
      };

      const result = themeService.validateTheme(invalidTheme);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('textOnBackground');
    });

    it('should reject a theme with insufficient primary contrast', () => {
      const invalidTheme: Theme = {
        ...THEME_LIBRARY[0],
        contrastRatios: {
          textOnBackground: 7.0,
          textOnPrimary: 2.0, // Below requirement
          primaryOnBackground: 4.5
        }
      };

      const result = themeService.validateTheme(invalidTheme);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('textOnPrimary'))).toBe(true);
    });

    it('should validate all themes in the library', () => {
      THEME_LIBRARY.forEach(theme => {
        const result = themeService.validateTheme(theme);
        
        expect(result.isValid).toBe(true);
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

    it('should return undefined for non-existent theme id', () => {
      const result = themeService.getThemeById('non-existent-theme');
      
      expect(result).toBeUndefined();
    });

    it('should return all available themes', () => {
      const themeIds = ['default', 'energetic', 'professional', 'calm'];
      
      themeIds.forEach(id => {
        const theme = themeService.getThemeById(id);
        expect(theme).toBeDefined();
        expect(theme?.id).toBe(id);
      });
    });
  });

  describe('getAllThemes', () => {
    it('should return all themes from the library', () => {
      const themes = THEME_LIBRARY;
      
      expect(themes).toHaveLength(4);
      expect(themes.map(t => t.id)).toEqual(['default', 'energetic', 'professional', 'calm']);
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
      const theme = THEME_LIBRARY[0];
      
      themeService.applyTheme(theme, 'light');
      const bgLight = rootElement.style.getPropertyValue('--color-background-base');
      
      themeService.applyTheme(theme, 'dark');
      const bgDark = rootElement.style.getPropertyValue('--color-background-base');
      
      expect(bgLight).toBe(theme.light.background.base);
      expect(bgDark).toBe(theme.dark.background.base);
      expect(bgLight).not.toBe(bgDark);
    });
  });

  describe('WCAG Compliance', () => {
    it('should ensure all themes meet WCAG AA text contrast (4.5:1)', () => {
      THEME_LIBRARY.forEach(theme => {
        expect(theme.contrastRatios.textOnBackground).toBeGreaterThanOrEqual(4.5);
        expect(theme.contrastRatios.textOnPrimary).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should ensure all themes meet WCAG AA UI component contrast (3:1)', () => {
      THEME_LIBRARY.forEach(theme => {
        expect(theme.contrastRatios.primaryOnBackground).toBeGreaterThanOrEqual(3.0);
      });
    });
  });
});
