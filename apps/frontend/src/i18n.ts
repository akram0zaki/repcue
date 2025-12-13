import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Phase 2: Initialization only. No user-visible changes yet.
// Security: Backend constrained to same-origin /locales path.

// Supported languages (expand locales progressively; fallback ensures safety)
const supportedLngs = ['en', 'nl', 'fy', 'ar', 'ar-EG', 'de', 'es', 'fr'] as const;
const allNamespaces = ['common', 'titles', 'a11y', 'exercises', 'auth', 'catalogs', 'legal'] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      'ar-EG': ['ar', 'en'],
      'default': ['en']
    },
    supportedLngs: Array.from(supportedLngs),
    ns: Array.from(allNamespaces),
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: { order: ['localStorage', 'navigator', 'htmlTag'], caches: ['localStorage'] },
    interpolation: {
      escapeValue: false, // React escapes by default
    },
    react: {
      useSuspense: false, // keep simple for Phase 2
    },
    // Preload all namespaces for the detected language to avoid delays on first render
    preload: ['en'],
  });

// Phase 3: Apply HTML lang/dir and toggle body.rtl for Arabic (including Egyptian)
const applyDir = (lng: string | undefined) => {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const language = (lng || i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const isRTL = language === 'ar';
  // Always use the normalized language code (ar) for Arabic variants in HTML lang attribute
  document.documentElement.lang = language;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  try {
    document.body.classList.toggle('rtl', isRTL);
  } catch {
    // no-op: body may not exist in rare early init cases
  }
};

// Ensure initial application and keep in sync on changes
applyDir(i18n.resolvedLanguage);
i18n.on('languageChanged', (lng) => applyDir(lng));

/**
 * Preload all namespaces for a language before switching.
 * This prevents the multi-second delay on iOS where each namespace
 * file is loaded sequentially over HTTP.
 * 
 * @param lng - Language code to preload
 * @returns Promise that resolves when all namespaces are loaded
 */
export const preloadLanguage = async (lng: string): Promise<void> => {
  // Load all namespaces in parallel for the target language
  await Promise.all(
    allNamespaces.map(ns => i18n.loadNamespaces(ns).catch(() => {
      // Ignore individual namespace load failures - fallback will handle it
    }))
  );
  // Also preload for the specific language if not already loaded
  await i18n.loadLanguages(lng).catch(() => {
    // Ignore - language will load on change anyway
  });
};

/**
 * Change language with preloading for instant UI update.
 * On iOS WKWebView, loading 7 namespace files sequentially can take several seconds.
 * This function loads them in parallel first, then switches.
 * 
 * @param lng - Language code to switch to
 */
export const changeLanguageWithPreload = async (lng: string): Promise<void> => {
  // Preload all resources for the target language in parallel
  await preloadLanguage(lng);
  // Now switch - should be instant since resources are cached
  await i18n.changeLanguage(lng);
};

export default i18n;
