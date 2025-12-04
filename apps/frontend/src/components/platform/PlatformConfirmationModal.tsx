/**
 * Platform-Aware Confirmation Modal
 * 
 * Drop-in replacement for ConfirmationModal that uses native dialogs on
 * iOS/Android and falls back to the styled web modal.
 * 
 * This component maintains backward compatibility with the existing
 * ConfirmationModal API while adding platform-native behavior.
 * 
 * @module PlatformConfirmationModal
 */
import React, { useEffect, useState } from 'react';
import { isNativePlatform } from '../../utils/nativeCapabilities';
import { showConfirm, showDestructiveConfirm } from '../../utils/nativeDialog';
import { triggerHaptic } from '../../utils/nativeCapabilities';
import { PlatformConfirmDialog } from './PlatformConfirmDialog';

interface PlatformConfirmationModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether this is a destructive action */
  variant?: 'default' | 'danger';
}

/**
 * Platform-aware confirmation modal
 * 
 * On native platforms (iOS/Android), shows native dialogs.
 * On web, shows the styled PlatformConfirmDialog component.
 * 
 * @example
 * ```tsx
 * <PlatformConfirmationModal
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Exercise"
 *   message="Are you sure? This cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 * />
 * ```
 */
export const PlatformConfirmationModal: React.FC<PlatformConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  variant = 'default',
}) => {
  const isNative = isNativePlatform();
  const isDestructive = variant === 'danger';
  const [nativeDialogShown, setNativeDialogShown] = useState(false);

  // Handle native dialog on iOS/Android
  useEffect(() => {
    if (!isNative || !isOpen || nativeDialogShown) return;

    // Mark as shown to prevent multiple dialogs
    setNativeDialogShown(true);

    const showNativeDialog = async () => {
      try {
        const result = isDestructive
          ? await showDestructiveConfirm(title, message, confirmText, cancelText)
          : await showConfirm({
              title,
              message,
              okButtonTitle: confirmText,
              cancelButtonTitle: cancelText,
            });

        if (result) {
          // User confirmed
          await triggerHaptic(isDestructive ? 'warning' : 'success');
          onConfirm();
        }
        // Always close after native dialog
        onClose();
      } catch (error) {
        // Dialog failed, close
        onClose();
      } finally {
        setNativeDialogShown(false);
      }
    };

    showNativeDialog();
  }, [isOpen, isNative, isDestructive, title, message, confirmText, cancelText, onConfirm, onClose, nativeDialogShown]);

  // Reset native dialog state when closed
  useEffect(() => {
    if (!isOpen) {
      setNativeDialogShown(false);
    }
  }, [isOpen]);

  // On native, we don't render anything (native dialog handles it)
  if (isNative) {
    return null;
  }

  // On web, render the styled dialog
  return (
    <PlatformConfirmDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      destructive={isDestructive}
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      onCancel={onClose}
    />
  );
};

export default PlatformConfirmationModal;
