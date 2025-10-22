import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { XMarkIcon } from '../icons/NavigationIcons';
import logger from '../../utils/logger';

interface LegalDocumentModalProps {
  /** Document ID to display */
  docId: string;
  
  /** Document title for header */
  title: string;
  
  /** Markdown file path to load */
  markdownPath: string;
  
  /** Whether this is an RTL language */
  isRTL: boolean;
  
  /** Whether to show the Accept button */
  showAcceptButton?: boolean;
  
  /** Callback when Accept button is clicked (only if showAcceptButton is true) */
  onAccept?: () => void;
  
  /** Callback when modal is closed */
  onClose: () => void;
  
  /** Whether Accept button should be disabled initially (until scrolled to bottom) */
  requireScrollToBottom?: boolean;
}

/**
 * LegalDocumentModal
 * 
 * Displays legal documents in a modal dialog with markdown rendering.
 * Features:
 * - RTL support for Arabic locales
 * - Scroll-to-bottom requirement before accepting
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Sanitized HTML output via rehype-sanitize
 * - Mobile-first responsive design
 */
export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  docId,
  title,
  markdownPath,
  isRTL,
  showAcceptButton = false,
  onAccept,
  onClose,
  requireScrollToBottom = true
}) => {
  const { t } = useTranslation(['legal', 'common']);
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(!requireScrollToBottom);
  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load markdown content
  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const response = await fetch(markdownPath);
        
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`);
        }
        
        const text = await response.text();
        setMarkdown(text);
        
        logger.log(`Loaded legal document: ${docId}`);
      } catch (error) {
        logger.error('Failed to load document:', error);
        setLoadError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkdown();
  }, [markdownPath, docId, t]);

  // Check if user has scrolled to bottom
  const handleScroll = () => {
    if (!contentRef.current || !requireScrollToBottom || hasScrolledToBottom) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    
    if (isAtBottom) {
      setHasScrolledToBottom(true);
      logger.log(`User scrolled to bottom of ${docId}`);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Focus trap for accessibility
  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [isLoading]);

  const handleAccept = () => {
    if (onAccept && (!requireScrollToBottom || hasScrolledToBottom)) {
      onAccept();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-doc-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="legal-doc-title"
            className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex-1 min-w-0 pe-4 break-words whitespace-normal"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close', { ns: 'common' })}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          onScroll={handleScroll}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {loadError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && markdown && (
            <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6 prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5 prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4 prose-p:mb-4 prose-p:leading-relaxed prose-ul:mb-4 prose-ul:list-disc prose-ul:ml-6 prose-ol:mb-4 prose-ol:list-decimal prose-ol:ml-6 prose-li:mb-2 prose-strong:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer with Accept button */}
        {showAcceptButton && !isLoading && !loadError && (
          <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {requireScrollToBottom && !hasScrolledToBottom && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('scrollToAccept')}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('common.cancel', { ns: 'common' })}
              </button>
              <button
                onClick={handleAccept}
                disabled={requireScrollToBottom && !hasScrolledToBottom}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
