import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { consentService } from '../services/consentService';
import { legalDocsService } from '../services/legalDocsService';
import logger from '../utils/logger';

interface ConsentBannerProps {
  onConsentGranted: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentGranted }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, i18n } = useTranslation('consent');

  // Detect and set browser language on mount (only if user has no stored language preference)
  useEffect(() => {
    // Check if user already has a language preference stored
    const storedLanguage = localStorage.getItem('i18nextLng');
    
    // If user has a stored preference, respect it (don't override)
    if (storedLanguage) {
      return;
    }
    
    // No stored preference - detect browser language
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const supportedLanguages = ['en', 'fr', 'de', 'es', 'nl', 'ar', 'ar-EG', 'fy'];
    
    // Try exact match first (e.g., 'ar-EG')
    if (supportedLanguages.includes(browserLang)) {
      i18n.changeLanguage(browserLang);
      return;
    }
    
    // Try base language (e.g., 'ar-EG' -> 'ar')
    const baseLang = browserLang.split('-')[0];
    if (supportedLanguages.includes(baseLang)) {
      i18n.changeLanguage(baseLang);
      return;
    }
    
    // Fallback to English
    i18n.changeLanguage('en');
  }, [i18n]);

  /**
   * Automatically accept all required legal documents
   * This eliminates the need for a separate legal gate on first access
   */
  const acceptAllLegalDocuments = async (includeOptional: boolean = false): Promise<void> => {
    try {
      // Ensure legal docs service is initialized (critical - must complete before accepting)
      let manifest = legalDocsService.getCurrentManifest();
      if (!manifest) {
        const initSuccess = await legalDocsService.initialize();
        if (!initSuccess) {
          logger.error('[ConsentBanner] Failed to initialize LegalDocsService');
          return;
        }
        manifest = legalDocsService.getCurrentManifest();
      }
      
      if (!manifest || !manifest.documents) {
        logger.warn('[ConsentBanner] No legal manifest available for automatic acceptance');
        return;
      }

      // Get current language for localization
      const currentLanguage = document.documentElement.lang || 'en';

      // Filter documents to accept (exclude imprint which is display-only)
      const documentsToAccept = includeOptional 
        ? manifest.documents.filter(doc => doc.id !== 'imprint')
        : manifest.documents.filter(doc => doc.required);

      // Accept each document
      for (const doc of documentsToAccept) {
        try {
          const localizedDoc = legalDocsService.getDocument(doc.id, currentLanguage);
          if (!localizedDoc || !localizedDoc.locales || localizedDoc.locales.length === 0) {
            continue;
          }

          const localeData = localizedDoc.locales[0];
          const acceptance = {
            docId: doc.id,
            acceptedVersion: doc.version,
            contentHash: localeData.contentHash,
            acceptedAt: new Date().toISOString(),
            acceptedLocale: localeData.locale
          };
          
          legalDocsService.recordAcceptance(acceptance);
        } catch (docError) {
          logger.error('[ConsentBanner] Error accepting document', doc.id, ':', docError);
        }
      }
    } catch (error) {
      logger.error('Error during automatic legal document acceptance:', error);
    }
  };

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    try {
      // Grant full consent (including analytics)
      consentService.grantConsent(true);
      
      // Automatically accept all legal documents (required + optional)
      await acceptAllLegalDocuments(true);
      
      // Small delay to ensure React flushes state updates and localStorage is written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onConsentGranted();
    } catch (error) {
      logger.error('Error handling accept all:', error);
      onConsentGranted(); // Continue anyway
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptEssential = async () => {
    setIsProcessing(true);
    try {
      // Grant essential consent only (no analytics)
      consentService.grantConsent(false);
      
      // Automatically accept only mandatory legal documents
      await acceptAllLegalDocuments(false);
      
      // Small delay to ensure React flushes state updates and localStorage is written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onConsentGranted();
    } catch (error) {
      logger.error('Error handling accept essential:', error);
      onConsentGranted(); // Continue anyway
    } finally {
      setIsProcessing(false);
    }
  };

  return (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" data-testid="consent-banner">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <svg 
              className="w-6 h-6 mr-3 section-icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            <h2 id="consent-title" className="text-xl font-bold text-text-900 dark:text-text-50">
              {t('title')}
            </h2>
          </div>

          <div id="consent-description" className="text-gray-700 dark:text-gray-300 mb-6">
            <p className="mb-3">
              {t('description')}
            </p>
            
            {!showDetails ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded block"
                  aria-expanded="false"
                  aria-controls="privacy-details"
                >
                  {t('learnMore')}
                </button>
                <button
                  onClick={() => window.open('/legal', '_blank')}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded block"
                >
                  {t('viewLegalCenter')}
                </button>
              </div>
            ) : (
              <div id="privacy-details" className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {t('dataWeStore.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• {t('dataWeStore.preferences')}</li>
                    <li>• {t('dataWeStore.activityLogs')}</li>
                    <li>• {t('dataWeStore.settings')}</li>
                    <li>• {t('dataWeStore.noPersonalData')}</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {t('dataPrivacy.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• {t('dataPrivacy.localStorage')}</li>
                    <li>• {t('dataPrivacy.noExternalServers')}</li>
                    <li>• {t('dataPrivacy.exportDelete')}</li>
                    <li>• {t('dataPrivacy.gdprCompliance')}</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded"
                  aria-expanded="true"
                  aria-controls="privacy-details"
                >
                  {t('showLess')}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAcceptAll}
              disabled={isProcessing}
              className="btn-primary w-full touch-target"
              autoFocus
              data-testid="consent-accept-all"
            >
              {isProcessing ? t('processing') : t('acceptAll')}
            </button>
            
            <button
              onClick={handleAcceptEssential}
              disabled={isProcessing}
              className="btn-secondary w-full touch-target"
              data-testid="consent-accept-essential"
            >
              {isProcessing ? t('processing') : t('acceptEssential')}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner; 