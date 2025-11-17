/* eslint-disable no-restricted-syntax -- i18n-exempt: consent copy pending localization; UX validated */
import { useState } from 'react';
import { consentService } from '../services/consentService';
import { legalDocsService } from '../services/legalDocsService';
import logger from '../utils/logger';

interface ConsentBannerProps {
  onConsentGranted: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentGranted }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Automatically accept all required legal documents
   * This eliminates the need for a separate legal gate
   */
  const acceptAllLegalDocuments = async (includeOptional: boolean = false): Promise<void> => {
    try {
      logger.log('[ConsentBanner] acceptAllLegalDocuments called with includeOptional:', includeOptional);
      // Ensure legal docs service is initialized (defensive in case app init hasn't completed yet)
      let manifest = legalDocsService.getCurrentManifest();
      if (!manifest) {
        logger.log('[ConsentBanner] No manifest loaded yet, initializing LegalDocsService...');
        await legalDocsService.initialize();
        manifest = legalDocsService.getCurrentManifest();
      }
      if (!manifest) {
        logger.warn('[ConsentBanner] No legal manifest available for automatic acceptance after initialize()');
        return;
      }

      // Get current language for localization
      const currentLanguage = document.documentElement.lang || 'en';
      logger.log('[ConsentBanner] currentLanguage:', currentLanguage);
      
      logger.log('[ConsentBanner] Manifest documents summary:', manifest.documents.map(doc => ({ id: doc.id, required: doc.required })));

      // Filter documents to accept
      const documentsToAccept = includeOptional 
        ? manifest.documents.filter(doc => doc.id !== 'imprint') // Exclude display-only docs
        : manifest.documents.filter(doc => doc.required);

      logger.log('[ConsentBanner] documentsToAccept:', documentsToAccept.map(doc => doc.id));

      // Accept each document
      for (const doc of documentsToAccept) {
        const localizedDoc = legalDocsService.getDocument(doc.id, currentLanguage);
        if (localizedDoc && localizedDoc.locales.length > 0) {
          const localeData = localizedDoc.locales[0];
          
          const success = legalDocsService.recordAcceptance({
            docId: doc.id,
            acceptedVersion: doc.version,
            contentHash: localeData.contentHash,
            acceptedAt: new Date().toISOString(),
            acceptedLocale: localeData.locale
          });

          logger.log('[ConsentBanner] recordAcceptance for', doc.id, 'success:', success);
          logger.log('[ConsentBanner] Current legalAcceptances:', consentService.getLegalAcceptances());
        }
      }
    } catch (error) {
      logger.error('Error during automatic legal document acceptance:', error);
    }
  };

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    try {
      logger.log('[ConsentBanner] handleAcceptAll clicked');
      // Grant full consent (including analytics)
      consentService.grantConsent(true);
      logger.log('[ConsentBanner] Consent after grantConsent(true):', consentService.getConsentData());
      
      // Automatically accept all legal documents (required + optional)
      await acceptAllLegalDocuments(true);
      logger.log('[ConsentBanner] User accepted all: consent granted + all legal documents accepted');
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
      logger.log('[ConsentBanner] handleAcceptEssential clicked');
      // Grant essential consent only (no analytics)
      consentService.grantConsent(false);
      logger.log('[ConsentBanner] Consent after grantConsent(false):', consentService.getConsentData());
      
      // Automatically accept only mandatory legal documents
      await acceptAllLegalDocuments(false);
      logger.log('[ConsentBanner] User accepted essential: consent granted + mandatory legal documents accepted');
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
              Your Privacy & Legal Consent
            </h2>
          </div>

          <div id="consent-description" className="text-gray-700 dark:text-gray-300 mb-6">
            <p className="mb-3">
              RepCue needs your permission to store exercise data and requires acceptance 
              of our terms and privacy policy to provide the best experience.
            </p>
            
            {!showDetails ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded block"
                  aria-expanded="false"
                  aria-controls="privacy-details"
                >
                  Learn more about how we protect your privacy
                </button>
                <button
                  onClick={() => window.open('/legal', '_blank')}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded block"
                >
                  View all legal documents in Legal Center
                </button>
              </div>
            ) : (
              <div id="privacy-details" className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    What data do we store?
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Your exercise preferences and favorites</li>
                    <li>• Activity logs with exercise duration and timestamps</li>
                    <li>• App settings (sound, vibration, intervals)</li>
                    <li>• No personal information or biometric data</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    Your data stays private
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• All data is stored locally on your device</li>
                    <li>• Nothing is sent to external servers without your permission</li>
                    <li>• You can export or delete your data at any time</li>
                    <li>• Full GDPR compliance with your rights</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 rounded"
                  aria-expanded="true"
                  aria-controls="privacy-details"
                >
                  Show less
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
              {isProcessing ? 'Processing...' : 'Accept All & Continue'}
            </button>
            
            <button
              onClick={handleAcceptEssential}
              disabled={isProcessing}
              className="btn-secondary w-full touch-target"
              data-testid="consent-accept-essential"
            >
              {isProcessing ? 'Processing...' : 'Essential Only'}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Both options automatically accept all required legal documents (Terms of Service, Privacy Policy, etc.). 
              You can view these documents anytime in the Legal Center and change preferences later in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner; 