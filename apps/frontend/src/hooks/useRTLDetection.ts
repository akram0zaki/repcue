import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to detect RTL (Right-to-Left) language direction
 * and apply appropriate document direction settings
 *
 * This hook enhances the existing i18n RTL support by providing
 * a reactive way for components to respond to direction changes
 */
export const useRTLDetection = () => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(() => {
    // Initialize based on current language
    const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
    return ['ar', 'fa', 'he'].includes(language);
  });

  useEffect(() => {
    // Update RTL state when language changes
    const handleLanguageChange = (lng: string) => {
      const language = lng.split('-')[0];
      const newIsRTL = ['ar', 'fa', 'he'].includes(language);
      setIsRTL(newIsRTL);

      // Update document direction and data attributes for CSS targeting
      document.dir = newIsRTL ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('data-direction', newIsRTL ? 'rtl' : 'ltr');
    };

    // Set initial direction
    handleLanguageChange(i18n.resolvedLanguage || i18n.language || 'en');

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    // Utility function for conditional RTL classes
    rtlClass: (ltrClass: string, rtlClass: string) => isRTL ? rtlClass : ltrClass,
  };
};