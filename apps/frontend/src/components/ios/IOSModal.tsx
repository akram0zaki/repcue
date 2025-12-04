/**
 * iOS-style Modal Component
 * 
 * A modal component that follows Apple Human Interface Guidelines
 * with proper animations, accessibility, and keyboard handling.
 * 
 * @module IOSModal
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isIOS } from '../../utils/nativeCapabilities';
import { hideKeyboard } from '../../utils/iosKeyboard';

export interface IOSModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Left action button text (e.g., "Cancel") */
  leftAction?: string;
  /** Callback for left action */
  onLeftAction?: () => void;
  /** Right action button text (e.g., "Done", "Save") */
  rightAction?: string;
  /** Callback for right action */
  onRightAction?: () => void;
  /** Whether right action is primary (bold) */
  rightActionPrimary?: boolean;
  /** Whether right action is disabled */
  rightActionDisabled?: boolean;
  /** Modal content */
  children: React.ReactNode;
  /** Additional CSS class for the modal */
  className?: string;
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Accessible label for the modal */
  ariaLabel?: string;
}

/**
 * iOS-style Modal component following Apple HIG
 */
export const IOSModal: React.FC<IOSModalProps> = ({
  isOpen,
  onClose,
  title,
  leftAction,
  onLeftAction,
  rightAction,
  onRightAction,
  rightActionPrimary = true,
  rightActionDisabled = false,
  children,
  className = '',
  closeOnBackdrop = true,
  ariaLabel,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle ESC key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Store current active element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Hide keyboard on iOS when modal opens
      if (isIOS()) {
        hideKeyboard();
      }

      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (isOpen) {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';

        // Restore focus to previous element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      }
    };
  }, [isOpen, handleKeyDown]);

  // Handle left action
  const handleLeftAction = useCallback(() => {
    if (onLeftAction) {
      onLeftAction();
    } else {
      onClose();
    }
  }, [onLeftAction, onClose]);

  // Handle right action
  const handleRightAction = useCallback(() => {
    if (onRightAction && !rightActionDisabled) {
      onRightAction();
    }
  }, [onRightAction, rightActionDisabled]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? 'ios-backdrop--visible' : ''
      }`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`ios-modal relative w-full max-w-sm transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || leftAction || rightAction) && (
          <div className="ios-modal__header">
            {/* Left Action */}
            <button
              type="button"
              className="ios-modal__action text-left"
              onClick={handleLeftAction}
              aria-label={leftAction || t('common.buttons.cancel', 'Cancel')}
            >
              {leftAction || t('common.buttons.cancel', 'Cancel')}
            </button>
            
            {/* Title */}
            {title && (
              <h2 className="ios-modal__title">
                {title}
              </h2>
            )}
            
            {/* Right Action */}
            {rightAction && (
              <button
                type="button"
                className={`ios-modal__action text-right ${
                  rightActionPrimary ? 'ios-modal__action--primary' : ''
                } ${rightActionDisabled ? 'opacity-50' : ''}`}
                onClick={handleRightAction}
                disabled={rightActionDisabled}
                aria-label={rightAction}
              >
                {rightAction}
              </button>
            )}
            
            {/* Placeholder for right side if no right action */}
            {!rightAction && <div className="min-w-[60px]" />}
          </div>
        )}
        
        {/* Content */}
        <div className="ios-modal__content">
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
};

/**
 * iOS-style Sheet (Bottom Sheet) Component
 */
export interface IOSSheetProps {
  /** Whether the sheet is visible */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Whether to show the drag handle */
  showHandle?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

export const IOSSheet: React.FC<IOSSheetProps> = ({
  isOpen,
  onClose,
  children,
  showHandle = true,
  className = '',
  ariaLabel,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle ESC key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      if (isIOS()) {
        hideKeyboard();
      }

      setTimeout(() => {
        sheetRef.current?.focus();
      }, 100);

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (isOpen) {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';

        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const sheetContent = (
    <div
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`ios-sheet ${isOpen ? 'ios-sheet--open' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {showHandle && (
          <div className="ios-sheet__handle" aria-hidden="true" />
        )}
        
        <div className="overflow-y-auto -webkit-overflow-scrolling-touch max-h-[calc(90vh-40px)]">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
};

export default IOSModal;
