/**
 * Platform-Aware Confirmation Modal
 * 
 * This component is now a thin wrapper around PlatformConfirmationModal
 * for backward compatibility. It uses native dialogs on iOS/Android
 * and a styled web modal on desktop browsers.
 * 
 * @module ConfirmationModal
 */
import React from 'react';
import { PlatformConfirmationModal } from '../platform/PlatformConfirmationModal';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

/**
 * Confirmation Modal Component
 * 
 * Uses native dialogs on iOS/Android, styled web modal on desktop.
 * 
 * @example
 * ```tsx
 * <ConfirmationModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Exercise"
 *   message="Are you sure?"
 *   variant="danger"
 * />
 * ```
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'default'
}) => {
  const { t } = useTranslation('common');

  return (
    <PlatformConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmText || t('common.confirm')}
      cancelText={cancelText || t('common.cancel')}
      variant={variant}
    />
  );
};