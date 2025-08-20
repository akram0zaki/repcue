import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Phase 2: Initialization only. No user-visible changes yet.
// Security: Backend constrained to same-origin /locales path.

// Supported languages (expand locales progressively; fallback ensures safety)
const supportedLngs = ['en', 'nl', 'ar', 'ar-EG', 'de', 'es', 'fr'] as const;

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
  ns: ['common', 'titles', 'a11y', 'exercises'],
  defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      // Phase 3: prioritize persisted choice, then system, then html tag
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React escapes by default
    },
    react: {
      useSuspense: false, // keep simple for Phase 2
    },
  });

// Phase 3: Apply HTML lang/dir and toggle body.rtl for Arabic (including Egyptian)
const applyDir = (lng: string | undefined) => {
  if (typeof document === 'undefined') return;
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

export default i18n;
