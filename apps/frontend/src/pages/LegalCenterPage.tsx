import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { legalDocsService } from '../services/legalDocsService';
import { LegalDocumentModal } from '../components/legal/LegalDocumentModal';
import type { LegalDoc, LegalAcceptanceStatus } from '../types/legal';
import { CheckCircleIcon, XCircleIcon, DocumentTextIcon, ClockIcon } from '../components/icons/NavigationIcons';
import logger from '../utils/logger';

/**
 * LegalCenterPage
 * 
 * Displays all legal documents with their acceptance status.
 * Features:
 * - List of all documents (required and optional)
 * - Version and effectiveFrom information
 * - Acceptance status indicators
 * - Locale indicators
 * - Mobile-first responsive design
 */
const LegalCenterPage: React.FC = () => {
  const { t, i18n } = useTranslation(['legal', 'common']);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [statuses, setStatuses] = useState<Map<string, LegalAcceptanceStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ doc: LegalDoc; path: string } | null>(null);
  const currentLocale = i18n.language;
  const isRTL = currentLocale.startsWith('ar');

  // Check if user can navigate back (opened from within app vs new window)
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if page was opened in a new window/tab vs navigated within app
    // If window.opener exists, this page was opened via window.open() - no back navigation context
    const isPopupWindow = window.opener !== null;
    
    // Check if history has more than the initial entry
    const hasNavigationHistory = window.history.length > 1;
    
    // Show back button only if:
    // - NOT a popup window (wasn't opened via window.open()), AND
    // - Has navigation history (can actually go back)
    setCanGoBack(!isPopupWindow && hasNavigationHistory);
  }, []);

  // Load documents and statuses
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Ensure LegalDocsService is initialized
        await legalDocsService.initialize();
        
        // Get manifest
        const manifest = legalDocsService.getCurrentManifest();
        
        if (!manifest) {
          const errorMsg = 'No legal manifest available';
          logger.error(errorMsg);
          setError(errorMsg);
          return;
        }
        
        setDocuments(manifest.documents);
        
        // Get acceptance status for all documents
        const statusMap = new Map<string, LegalAcceptanceStatus>();
        manifest.documents.forEach(doc => {
          const status = legalDocsService.getAcceptanceStatus(doc.id, currentLocale);
          statusMap.set(doc.id, status);
        });
        
        setStatuses(statusMap);
        
        logger.log(`Loaded ${manifest.documents.length} legal documents`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load legal documents';
        logger.error('Failed to load legal documents:', err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [currentLocale]);

  const handleViewDocument = (doc: LegalDoc) => {
    // Get the document with locale fallback
    const localizedDoc = legalDocsService.getDocument(doc.id, currentLocale);
    
    if (!localizedDoc || localizedDoc.locales.length === 0) {
      logger.error(`No locale available for document ${doc.id}`);
      return;
    }
    
    const localeData = localizedDoc.locales[0];
    setSelectedDoc({ doc: localizedDoc, path: localeData.path });
  };

  const handleAcceptDocument = () => {
    if (!selectedDoc) return;
    
    const { doc } = selectedDoc;
    const localeData = doc.locales[0];
    
    // Record acceptance
    const acceptance = {
      docId: doc.id,
      acceptedVersion: doc.version,
      contentHash: localeData.contentHash,
      acceptedAt: new Date().toISOString(),
      acceptedLocale: localeData.locale
    };
    
    const success = legalDocsService.recordAcceptance(acceptance);
    
    if (success) {
      // Update status
      const newStatus = legalDocsService.getAcceptanceStatus(doc.id, currentLocale);
      setStatuses(prev => new Map(prev).set(doc.id, newStatus));
      
      // Close modal
      setSelectedDoc(null);
      
      logger.log(`Accepted document ${doc.id} v${doc.version}`);
    } else {
      logger.error(`Failed to record acceptance for ${doc.id}`);
    }
  };

  const getStatusIcon = (status: LegalAcceptanceStatus) => {
    if (status.accepted) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (status.requiresAcceptance) {
      return <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    return <DocumentTextIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
  };

  const getStatusText = (status: LegalAcceptanceStatus) => {
    if (status.accepted) {
      return t('status.accepted');
    }
    if (status.requiresAcceptance) {
      return t('status.required');
    }
    return t('status.optional');
  };

  const getDaysUntilEffective = (effectiveFrom?: string): number | null => {
    return legalDocsService.getDaysUntilEffective(effectiveFrom);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Error Loading Legal Center
                </h2>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  {error}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-primary text-sm"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="btn-secondary text-sm"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Only show back button if there's history to go back to */}
            {canGoBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={t('common.back', { ns: 'common' })}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Required Documents */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('required')}
          </h2>
          <div className="space-y-3">
            {documents.filter(doc => doc.required).map(doc => {
              const status = statuses.get(doc.id);
              const daysUntilEffective = getDaysUntilEffective(doc.effectiveFrom);
              
              return (
                <button
                  key={doc.id}
                  onClick={() => handleViewDocument(doc)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
                >
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Status icon (left) and chevron (right) */}
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0">
                        {status && getStatusIcon(status)}
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Row 2: Title + Version */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white min-w-0 break-words whitespace-normal hyphens-auto">
                          {t(`documents.${doc.id}`, doc.title)}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">v{doc.version}</span>
                      </div>
                    </div>

                    {/* Row 3: Acceptance badge */}
                    <div className="text-sm">
                      {status && (
                        <span className={`px-2 py-0.5 rounded ${
                          status.accepted
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {getStatusText(status)}
                        </span>
                      )}
                    </div>

                    {/* Row 4: Effective in */}
                    {daysUntilEffective !== null && daysUntilEffective > 0 && (
                      <div className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                        <ClockIcon className="w-4 h-4" />
                        {t('effectiveIn', { days: daysUntilEffective })}
                      </div>
                    )}

                    {/* Accepted date (optional, below rows) */}
                    {status?.acceptedAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('acceptedOn', {
                          date: new Date(status.acceptedAt).toLocaleDateString()
                        })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Optional Documents */}
        {documents.some(doc => !doc.required) && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('optional')}
            </h2>
            <div className="space-y-3">
              {documents.filter(doc => !doc.required).map(doc => {
                const status = statuses.get(doc.id);
                
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleViewDocument(doc)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Row 1: Status icon (left) and chevron (right) */}
                      <div className="flex items-center justify-between">
                        <div className="flex-shrink-0">
                          {status && getStatusIcon(status)}
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Row 2: Title + Version */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white min-w-0 break-words whitespace-normal hyphens-auto">
                            {t(`documents.${doc.id}`, doc.title)}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">v{doc.version}</span>
                        </div>
                      </div>

                      {/* Row 3: Optional badge */}
                      <div className="text-sm">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {t('status.optional')}
                        </span>
                      </div>

                      {/* Row 4: Accepted date if present (acts as meta) */}
                      {status?.acceptedAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('acceptedOn', {
                            date: new Date(status.acceptedAt).toLocaleDateString()
                          })}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Document Modal */}
      {selectedDoc && (() => {
        const selectedStatus = statuses.get(selectedDoc.doc.id);
        const isAccepted = selectedStatus?.accepted || false;
        
        return (
          <LegalDocumentModal
            docId={selectedDoc.doc.id}
            title={t(`documents.${selectedDoc.doc.id}`, selectedDoc.doc.title)}
            markdownPath={selectedDoc.path}
            isRTL={isRTL}
            showAcceptButton={true}
            isAccepted={isAccepted}
            onAccept={handleAcceptDocument}
            onClose={() => setSelectedDoc(null)}
            requireScrollToBottom={true}
          />
        );
      })()}
    </div>
  );
};

export default LegalCenterPage;
