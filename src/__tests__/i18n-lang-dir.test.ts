import { describe, it, expect, beforeEach, vi } from 'vitest';

// Ensure i18n is initialized and side-effects applied
import '../i18n';
import i18n from '../i18n';

// Helper to wait a tick for languageChanged listeners
const nextTick = () => new Promise((r) => setTimeout(r, 0));

describe('i18n HTML lang/dir application', () => {
  beforeEach(() => {
    // Reset to default English
    i18n.changeLanguage('en');
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl');
    localStorage.removeItem('i18nextLng');
  });

  it('applies lang and ltr for English', async () => {
    await i18n.changeLanguage('en');
    await nextTick();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.body.classList.contains('rtl')).toBe(false);
  });

  it('applies lang and rtl for Arabic and persists', async () => {
    // Pre-seed empty bundles to prevent network fetch attempts in test env
    ['common', 'titles', 'a11y'].forEach((ns) => {
      if (!i18n.hasResourceBundle('ar', ns)) {
        i18n.addResourceBundle('ar', ns, {}, true, true);
      }
    });
    await i18n.changeLanguage('ar');
    await nextTick();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.body.classList.contains('rtl')).toBe(true);
    // detector caches in localStorage
    expect(localStorage.getItem('i18nextLng')).toMatch(/ar/);
  });

  it('normalizes regional variants and keeps dir consistent', async () => {
    ['common', 'titles', 'a11y'].forEach((ns) => {
      if (!i18n.hasResourceBundle('ar', ns)) {
        i18n.addResourceBundle('ar', ns, {}, true, true);
      }
    });
    await i18n.changeLanguage('ar-EG');
    await nextTick();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.body.classList.contains('rtl')).toBe(true);
  });
});
