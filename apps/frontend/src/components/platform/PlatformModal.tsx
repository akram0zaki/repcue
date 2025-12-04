/**
 * Platform-Aware Modal Component
 * 
 * A modal/sheet component that adapts to the current platform:
 * - iOS: Sheet-style modal sliding up from bottom with rounded corners
 * - Android: Material Design dialog with elevation (future)
 * - Web: Centered overlay modal
 * 
 * @module PlatformModal
 */
import React, { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isIOS, isNativePlatform } from '../../utils/nativeCapabilities';
import { hideKeyboard } from '../../utils/iosKeyboard';

export interface PlatformModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Additional CSS class for the modal */
  className?: string;
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Accessible label for the modal */
  ariaLabel?: string;
  /** Modal size for web (ignored on mobile where sheets are full-width) */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Whether to show as bottom sheet on mobile (default: true) */
  sheetOnMobile?: boolean;
  /** Whether to show the drag handle on sheets */
  showHandle?: boolean;
}

/**
 * Platform-aware modal component
 * 
 * @example
 * ```tsx
 * <PlatformModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Edit Exercise"
 * >
 *   <form>...</form>
 * </PlatformModal>
 * ```
 */
export const PlatformModal: React.FC<PlatformModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  closeOnBackdrop = true,
  ariaLabel,
  size = 'medium',
  sheetOnMobile = true,
  showHandle = true,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  const isNative = isNativePlatform();
  const ios = isIOS();
  const useSheet = sheetOnMobile && isNative;

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
      if (ios) {
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
  }, [isOpen, handleKeyDown, ios]);

  if (!isOpen) {
    return null;
  }

  // Size classes for web modal
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'max-w-full mx-4',
  };

  // Sheet-style modal for iOS/Android
  if (useSheet) {
    return createPortal(
      <div
        className="fixed inset-0 z-50"
        onClick={handleBackdropClick}
        role="presentation"
      >
        {/* Backdrop */}
        <div 
          className={`
            absolute inset-0 bg-black/40 
            transition-opacity duration-300
            ${isOpen ? 'opacity-100' : 'opacity-0'}
          `}
          aria-hidden="true"
        />
        
        {/* Sheet */}
        <div
          ref={modalRef}
          className={`
            platform-sheet
            fixed bottom-0 left-0 right-0
            ${ios ? 'rounded-t-[14px]' : 'rounded-t-2xl'}
            bg-white dark:bg-gray-900
            shadow-2xl
            transform transition-transform duration-300 ease-out
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
            max-h-[90vh]
            safe-area-bottom
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          tabIndex={-1}
        >
          {/* Drag handle */}
          {showHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div 
                className={`
                  w-9 h-1 rounded-full
                  ${ios ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-400 dark:bg-gray-500'}
                `}
                aria-hidden="true"
              />
            </div>
          )}

          {/* Title */}
          {title && (
            <div className={`
              px-4 py-3 border-b border-gray-200 dark:border-gray-700
              ${ios ? 'text-center' : ''}
            `}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            </div>
          )}
          
          {/* Content */}
          <div 
            className="overflow-y-auto overscroll-contain"
            style={{ 
              maxHeight: title ? 'calc(90vh - 100px)' : 'calc(90vh - 50px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Standard centered modal for web
  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative w-full ${sizeClasses[size]}
            bg-white dark:bg-gray-800 
            rounded-lg shadow-xl
            transform transition-all duration-200
            ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          tabIndex={-1}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              <button
                type="button"
                className="
                  p-2 -m-2 rounded-lg
                  text-gray-400 hover:text-gray-500 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Platform-aware modal with header actions (iOS-style)
 */
export interface PlatformActionModalProps extends Omit<PlatformModalProps, 'title'> {
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
  /** Whether right action is primary (bold/colored) */
  rightActionPrimary?: boolean;
  /** Whether right action is disabled */
  rightActionDisabled?: boolean;
}

export const PlatformActionModal: React.FC<PlatformActionModalProps> = ({
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
  ...props
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  const ios = isIOS();
  const isNative = isNativePlatform();

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

  // Handle ESC key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      if (ios) {
        hideKeyboard();
      }

      setTimeout(() => {
        modalRef.current?.focus();
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
  }, [isOpen, handleKeyDown, ios]);

  if (!isOpen) {
    return null;
  }

  // Native sheet style
  if (isNative) {
    return createPortal(
      <div
        className="fixed inset-0 z-50"
        onClick={(e) => {
          if (props.closeOnBackdrop !== false && e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="presentation"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        
        {/* Sheet */}
        <div
          ref={modalRef}
          className={`
            fixed bottom-0 left-0 right-0
            ${ios ? 'rounded-t-[14px]' : 'rounded-t-2xl'}
            bg-white dark:bg-gray-900
            shadow-2xl
            max-h-[90vh]
            safe-area-bottom
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel || title}
          tabIndex={-1}
        >
          {/* iOS-style header */}
          <div className={`
            flex items-center justify-between
            px-4 py-3
            border-b border-gray-200 dark:border-gray-700
          `}>
            {/* Left Action */}
            <button
              type="button"
              className={`
                min-w-[60px] text-left
                ${ios ? 'text-[17px] text-blue-500' : 'text-sm text-primary-600'}
                disabled:opacity-50
              `}
              onClick={handleLeftAction}
            >
              {leftAction || t('common.buttons.cancel', 'Cancel')}
            </button>
            
            {/* Title */}
            {title && (
              <h2 className={`
                font-semibold text-gray-900 dark:text-white
                ${ios ? 'text-[17px]' : 'text-base'}
              `}>
                {title}
              </h2>
            )}
            
            {/* Right Action */}
            {rightAction ? (
              <button
                type="button"
                className={`
                  min-w-[60px] text-right
                  ${ios ? 'text-[17px]' : 'text-sm'}
                  ${rightActionPrimary 
                    ? ios ? 'text-blue-500 font-semibold' : 'text-primary-600 font-medium'
                    : 'text-gray-600 dark:text-gray-300'
                  }
                  ${rightActionDisabled ? 'opacity-50' : ''}
                `}
                onClick={handleRightAction}
                disabled={rightActionDisabled}
              >
                {rightAction}
              </button>
            ) : (
              <div className="min-w-[60px]" />
            )}
          </div>
          
          {/* Content */}
          <div 
            className="overflow-y-auto overscroll-contain"
            style={{ 
              maxHeight: 'calc(90vh - 60px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Web modal with action buttons in footer
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative w-full max-w-lg
            bg-white dark:bg-gray-800 
            rounded-lg shadow-xl
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel || title}
          tabIndex={-1}
        >
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            </div>
          )}
          
          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer with actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLeftAction}
            >
              {leftAction || t('common.buttons.cancel', 'Cancel')}
            </button>
            {rightAction && (
              <button
                type="button"
                className={rightActionPrimary ? 'btn-primary' : 'btn-secondary'}
                onClick={handleRightAction}
                disabled={rightActionDisabled}
              >
                {rightAction}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlatformModal;
