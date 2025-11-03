import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { legalDocsService } from '../../services/legalDocsService';
import { consentService } from '../../services/consentService';
import type { LegalDoc } from '../../types/legal';
import { LegalDocumentModal } from './LegalDocumentModal';
import { DocumentTextIcon } from '../icons/NavigationIcons';
import logger from '../../utils/logger';

interface LegalGateProps {
  /** Called when user accepts all required documents */
  onContinue: () => void;
  /** Whether to show the gate (controlled externally) */
  isOpen: boolean;
}

/**
 * LegalGate Component
 * 
 * Full-screen blocking modal that prevents app usage until all required
 * legal documents are accepted. Features:
 * - Checklist of required documents with "View" buttons
 * - Individual checkboxes for each document
 * - "Accept All Required" button (enabled when all viewed)
 * - "Continue" button (enabled when all required accepted)
 * - Optional documents section (non-blocking, future)
 * - Mobile-first responsive design
 * - RTL support for Arabic locales
 * - Accessibility compliant (WCAG 2.1 AA)
 * 
 * @param {LegalGateProps} props - Component props
 * @returns {JSX.Element | null} The legal gate modal or null if not open
 */
export const LegalGate: React.FC<LegalGateProps> = ({ onContinue, isOpen }) => {
  const { t, i18n } = useTranslation('legal');
  const [requiredDocs, setRequiredDocs] = useState<LegalDoc[]>([]);
  const [optionalDocs, setOptionalDocs] = useState<LegalDoc[]>([]);
  const [viewedDocs, setViewedDocs] = useState<Set<string>>(new Set());
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set()); // NEW: Track user's selection intent
  const [selectedDoc, setSelectedDoc] = useState<LegalDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRTL = i18n.dir() === 'rtl';

  useEffect(() => {
    if (!isOpen) return;

    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get manifest and extract documents
        const manifest = legalDocsService.getCurrentManifest();
        if (!manifest) {
          setError(t('errors.noManifest'));
          return;
        }
        
        // Separate documents by acceptance status
        // Get documents that are blocking (need immediate acceptance)
        const allStatuses = legalDocsService.getAllAcceptanceStatuses(i18n.language);
        const blockingDocIds = new Set(
          allStatuses.filter(s => s.isBlocking).map(s => s.docId)
        );
        
        // Filter out imprint (display-only document, shown in footer)
        const documentsForGate = manifest.documents.filter((doc: LegalDoc) => doc.id !== 'imprint');
        
        const required = documentsForGate.filter((doc: LegalDoc) => blockingDocIds.has(doc.id));
        const optional = documentsForGate.filter((doc: LegalDoc) => !blockingDocIds.has(doc.id));
        
        setRequiredDocs(required);
        setOptionalDocs(optional);
        
        logger.log('[LegalGate] Blocking documents:', Array.from(blockingDocIds));
        
        // Initialize accepted docs from consent service
        const existingAcceptances = consentService.getLegalAcceptances();
        const acceptedSet = new Set<string>();
        
        for (const doc of manifest.documents) {
          const isAccepted = existingAcceptances.some(
            (acc) => acc.docId === doc.id && acc.acceptedVersion === doc.version
          );
          if (isAccepted) {
            acceptedSet.add(doc.id);
          }
        }
        
        setAcceptedDocs(acceptedSet);
        logger.log('[LegalGate] Loaded documents:', { requiredCount: required.length, optionalCount: optional.length, acceptedCount: acceptedSet.size });
      } catch (err) {
        logger.error('[LegalGate] Failed to load documents:', err);
        setError(t('errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [isOpen, i18n.language, t]);

  // Prevent body scroll when gate is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleViewDocument = (doc: LegalDoc) => {
    // Get the localized version of the document
    logger.log('[LegalGate] handleViewDocument called - docId:', doc.id, 'current language:', i18n.language);
    logger.log('[LegalGate] Document locales available:', doc.locales.map(l => l.locale).join(', '));
    
    const localizedDoc = legalDocsService.getDocument(doc.id, i18n.language);
    
    if (localizedDoc) {
      logger.log('[LegalGate] Got localized doc with locales:', localizedDoc.locales.map(l => `${l.locale}: ${l.path}`).join(', '));
      setSelectedDoc(localizedDoc);
      setViewedDocs(prev => new Set(prev).add(doc.id));
      logger.log('[LegalGate] Selected doc set to:', localizedDoc.id, 'locale:', localizedDoc.locales[0].locale);
    } else {
      logger.error('[LegalGate] Failed to get localized document:', doc.id, 'locale:', i18n.language);
    }
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
  };

  const handleToggleSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleAcceptDocument = async (doc: LegalDoc) => {
    try {
      // Get the localized document
      const localizedDoc = legalDocsService.getDocument(doc.id, i18n.language);
      if (!localizedDoc || localizedDoc.locales.length === 0) {
        setError(t('errors.noLocale'));
        return;
      }
      
      const localeData = localizedDoc.locales[0];
      
      // Record acceptance via legalDocsService
      const success = legalDocsService.recordAcceptance({
        docId: doc.id,
        acceptedVersion: doc.version,
        contentHash: localeData.contentHash,
        acceptedAt: new Date().toISOString(),
        acceptedLocale: localeData.locale
      });

      if (success) {
        setAcceptedDocs(prev => new Set(prev).add(doc.id));
        logger.log('[LegalGate] Accepted document:', doc.id);
      } else {
        setError(t('errors.acceptFailed'));
      }
    } catch (err) {
      logger.error('[LegalGate] Error accepting document:', err);
      setError(t('errors.acceptFailed'));
    }
  };

  const handleAcceptAll = async () => {
    try {
      // Accept all selected documents that haven't been accepted yet
      for (const doc of requiredDocs) {
        if (!acceptedDocs.has(doc.id) && selectedDocs.has(doc.id)) {
          const localizedDoc = legalDocsService.getDocument(doc.id, i18n.language);
          if (!localizedDoc || localizedDoc.locales.length === 0) continue;
          
          const localeData = localizedDoc.locales[0];
          legalDocsService.recordAcceptance({
            docId: doc.id,
            acceptedVersion: doc.version,
            contentHash: localeData.contentHash,
            acceptedAt: new Date().toISOString(),
            acceptedLocale: localeData.locale
          });
          setAcceptedDocs(prev => new Set(prev).add(doc.id));
        }
      }
      // Clear selection after accepting
      setSelectedDocs(new Set());
      logger.log('[LegalGate] Accepted all selected documents');
    } catch (err) {
      logger.error('[LegalGate] Error accepting selected documents:', err);
      setError(t('errors.acceptAllFailed'));
    }
  };

  const handleContinue = () => {
    logger.log('[LegalGate] User continuing after accepting all required documents');
    onContinue();
  };

  // Only count documents that require acceptance (not already accepted)
  const documentsNeedingAcceptance = requiredDocs.filter(doc => !acceptedDocs.has(doc.id));
  const allRequiredViewed = documentsNeedingAcceptance.length === 0 || documentsNeedingAcceptance.every(doc => viewedDocs.has(doc.id));
  const allRequiredSelected = documentsNeedingAcceptance.length === 0 || documentsNeedingAcceptance.every(doc => selectedDocs.has(doc.id));
  const allRequiredAccepted = requiredDocs.every(doc => acceptedDocs.has(doc.id));

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-gate-title"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Gate content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 id="legal-gate-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {t('gate.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('gate.subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {/* Required Documents */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {t('gate.requiredSectionTitle')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('gate.requiredSectionDescription')}
                  </p>
                  
                  <div className="space-y-3">
                    {requiredDocs.map((doc) => {
                      const isViewed = viewedDocs.has(doc.id);
                      const isAccepted = acceptedDocs.has(doc.id);
                      const isSelected = selectedDocs.has(doc.id);
                      
                      return (
                        <div
                          key={doc.id}
                          className="border-2 border-surface-300 rounded-lg p-3 bg-surface-200 shadow-md"
                        >
                          {/* First Row: View button and Checkbox */}
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            {/* View button */}
                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              aria-label={t('gate.viewDocument', { title: t(`documents.${doc.id}`, doc.title) })}
                            >
                              <DocumentTextIcon size={16} />
                              <span>{t('gate.view')}</span>
                            </button>

                            {/* Spacer to push checkbox to the right on wider screens */}
                            <div className="flex-1 min-w-[8px]" />

                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => !isAccepted && isViewed && handleToggleSelection(doc.id)}
                              disabled={isAccepted || !isViewed}
                              className={`w-7 h-7 min-w-[28px] rounded border-2 flex items-center justify-center transition-colors ${
                                isAccepted
                                  ? 'bg-green-600 border-green-600'
                                  : isSelected
                                  ? 'bg-primary-500 border-primary-500'
                                  : isViewed
                                  ? 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                                  : 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                              }`}
                              aria-label={isAccepted ? t('gate.accepted') : isSelected ? t('gate.selected') : t('gate.select')}
                            >
                              {(isAccepted || isSelected) && (
                                <svg 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="3.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  className="w-4 h-4 text-white flex-shrink-0"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Second Row: Document title and version */}
                          <div className="mb-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white break-words">
                              {t(`documents.${doc.id}`, doc.title)}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {t('version')} {doc.version}
                            </p>
                          </div>
                          
                          {/* Third Row: Status indicator */}
                          <div className="flex items-center gap-2 text-xs">
                            {isAccepted ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {t('gate.acceptedStatus')}
                              </span>
                            ) : isViewed ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {t('gate.viewedStatus')}
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                {t('gate.notViewedStatus')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Documents (Future) */}
                {optionalDocs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {t('gate.optionalSectionTitle')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t('gate.optionalSectionDescription')}
                    </p>
                    
                    <div className="space-y-3">
                      {optionalDocs.map((doc) => {
                        const isViewed = viewedDocs.has(doc.id);
                        const isAccepted = acceptedDocs.has(doc.id);
                        
                        return (
                          <div
                            key={doc.id}
                            className="border-2 border-surface-300 rounded-lg p-3 bg-surface-200 shadow-md opacity-75"
                          >
                            {/* First Row: View button and Checkbox */}
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              {/* View button */}
                              <button
                                type="button"
                                onClick={() => handleViewDocument(doc)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                aria-label={t('gate.viewDocument', { title: t(`documents.${doc.id}`, doc.title) })}
                              >
                                <DocumentTextIcon size={16} />
                                <span>{t('gate.view')}</span>
                              </button>

                              {/* Spacer to push checkbox to the right on wider screens */}
                              <div className="flex-1 min-w-[8px]" />

                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => !isAccepted && isViewed && handleAcceptDocument(doc)}
                                disabled={isAccepted || !isViewed}
                                className={`w-7 h-7 min-w-[28px] rounded border-2 flex items-center justify-center transition-colors ${
                                  isAccepted
                                    ? 'bg-green-600 border-green-600'
                                    : isViewed
                                    ? 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                                    : 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                                }`}
                                aria-label={isAccepted ? t('gate.accepted') : t('gate.accept')}
                              >
                                {isAccepted && (
                                  <svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="3.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className="w-4 h-4 text-white flex-shrink-0"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* Second Row: Document title and version */}
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white break-words">
                                {t(`documents.${doc.id}`, doc.title)}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {t('version')} {doc.version} • {t('gate.optional')}
                              </p>
                            </div>
                            
                            {/* Third Row: Status indicator */}
                            <div className="flex items-center gap-2 text-xs">
                              {isAccepted ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {t('gate.acceptedStatus')}
                                </span>
                              ) : isViewed ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {t('gate.viewedStatus')}
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {t('gate.notViewedStatus')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Accept All Required button */}
              <button
                type="button"
                onClick={handleAcceptAll}
                disabled={!allRequiredViewed || !allRequiredSelected || allRequiredAccepted}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !allRequiredViewed || !allRequiredSelected || allRequiredAccepted
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                }`}
                aria-label={t('gate.acceptAllRequired')}
              >
                {t('gate.acceptAllRequired')}
              </button>

              {/* Continue button */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={!allRequiredAccepted}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !allRequiredAccepted
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                }`}
                aria-label={t('gate.continue')}
              >
                {t('gate.continue')}
              </button>
            </div>

            {/* Status text */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              {allRequiredAccepted
                ? t('gate.statusAllAccepted')
                : allRequiredViewed
                ? t('gate.statusAllViewed')
                : t('gate.statusPending', {
                    accepted: documentsNeedingAcceptance.filter(doc => acceptedDocs.has(doc.id)).length,
                    total: documentsNeedingAcceptance.length
                  })}
            </p>
          </div>
        </div>
      </div>

      {/* Document Modal */}
      {selectedDoc && selectedDoc.locales.length > 0 && (() => {
        // Find the locale that matches the current language, fallback to first locale
        logger.log('[LegalGate] Rendering modal - selectedDoc locales:', selectedDoc.locales.map(l => `${l.locale}: ${l.path}`).join(', '));
        logger.log('[LegalGate] Current i18n.language:', i18n.language);
        
        const currentLocale = selectedDoc.locales.find(loc => loc.locale === i18n.language) || selectedDoc.locales[0];
        
        logger.log('[LegalGate] Selected locale for modal:', currentLocale.locale, 'path:', currentLocale.path);
        
        return (
          <LegalDocumentModal
            docId={selectedDoc.id}
            title={t(`documents.${selectedDoc.id}`, selectedDoc.title)}
            markdownPath={currentLocale.path}
            isRTL={isRTL}
            showAcceptButton={!acceptedDocs.has(selectedDoc.id)}
            onAccept={() => {
              handleAcceptDocument(selectedDoc);
              handleCloseModal();
            }}
            onClose={handleCloseModal}
            requireScrollToBottom={true}
          />
        );
      })()}
    </>
  );
};

export default LegalGate;
