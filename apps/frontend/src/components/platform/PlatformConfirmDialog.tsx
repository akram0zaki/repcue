/**
 * Platform Confirm Dialog Component
 * 
 * A styled confirmation dialog for web that pairs with usePlatformConfirm hook.
 * On native platforms, this component is not rendered (native dialogs are used).
 * 
 * @module PlatformConfirmDialog
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface PlatformConfirmDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text (empty string hides button) */
  cancelText?: string;
  /** Whether this is a destructive action */
  destructive?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

/**
 * Confirmation dialog component for web platforms
 * 
 * @example
 * ```tsx
 * <PlatformConfirmDialog
 *   isOpen={showDialog}
 *   title="Delete Exercise"
 *   message="Are you sure you want to delete this exercise?"
 *   confirmText="Delete"
 *   destructive={true}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDialog(false)}
 * />
 * ```
 */
export const PlatformConfirmDialog: React.FC<PlatformConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    // Focus the confirm button (or dialog) when opened
    setTimeout(() => {
      if (cancelText) {
        confirmButtonRef.current?.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 50);

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel, cancelText]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const showCancelButton = cancelText !== '';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        className="
          relative w-full max-w-sm
          bg-white dark:bg-gray-800 
          rounded-xl shadow-2xl
          transform transition-all
          animate-in fade-in zoom-in-95 duration-200
        "
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
      >
        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon for destructive actions */}
          {destructive && (
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-red-600 dark:text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
          )}

          {/* Title */}
          <h2 
            id="confirm-dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p 
            id="confirm-dialog-message"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className={`
          flex border-t border-gray-200 dark:border-gray-700
          ${showCancelButton ? 'divide-x divide-gray-200 dark:divide-gray-700' : ''}
        `}>
          {showCancelButton && (
            <button
              type="button"
              className="
                flex-1 py-3 px-4
                text-base font-medium
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors
                rounded-bl-xl
              "
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            type="button"
            className={`
              flex-1 py-3 px-4
              text-base font-semibold
              transition-colors
              ${showCancelButton ? 'rounded-br-xl' : 'rounded-b-xl'}
              ${destructive 
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }
            `}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlatformConfirmDialog;
