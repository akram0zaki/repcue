/**
 * Platform-Aware Confirm Dialog Hook
 * 
 * Provides a unified API for confirmation dialogs that adapts to the platform:
 * - iOS/Android: Uses native dialogs via Capacitor
 * - Web: Uses a styled React modal component
 * 
 * @module usePlatformConfirm
 */
import { useState, useCallback } from 'react';
import { isNativePlatform } from '../utils/nativeCapabilities';
import { showConfirm, showDestructiveConfirm, showAlert } from '../utils/nativeDialog';
import { triggerHaptic } from '../utils/nativeCapabilities';

/**
 * Confirmation dialog options
 */
export interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether this is a destructive action (delete, remove, etc.) */
  destructive?: boolean;
  /** Haptic feedback type on confirm (native only) */
  hapticOnConfirm?: 'success' | 'warning' | 'error' | 'medium' | 'none';
}

/**
 * Alert dialog options
 */
export interface AlertOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Button text */
  buttonText?: string;
}

/**
 * Dialog state for web fallback
 */
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const defaultDialogState: DialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  destructive: false,
  onConfirm: () => {},
  onCancel: () => {},
};

/**
 * Hook for platform-aware confirmation dialogs
 * 
 * On native platforms, uses native iOS/Android dialogs.
 * On web, returns dialog state that can be rendered with a React component.
 * 
 * @example
 * ```tsx
 * function DeleteButton({ onDelete }) {
 *   const { confirm, dialogProps, DialogComponent } = usePlatformConfirm();
 * 
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: 'Delete Exercise',
 *       message: 'This action cannot be undone.',
 *       confirmText: 'Delete',
 *       destructive: true,
 *     });
 * 
 *     if (confirmed) {
 *       onDelete();
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Delete</button>
 *       <DialogComponent {...dialogProps} />
 *     </>
 *   );
 * }
 * ```
 */
export function usePlatformConfirm() {
  const [dialogState, setDialogState] = useState<DialogState>(defaultDialogState);
  const isNative = isNativePlatform();

  /**
   * Show a confirmation dialog
   * 
   * @param options - Dialog options
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  const confirm = useCallback(async (options: ConfirmOptions): Promise<boolean> => {
    const {
      title,
      message,
      confirmText = 'OK',
      cancelText = 'Cancel',
      destructive = false,
      hapticOnConfirm = destructive ? 'warning' : 'success',
    } = options;

    // Use native dialog on iOS/Android
    if (isNative) {
      const result = destructive
        ? await showDestructiveConfirm(title, message, confirmText, cancelText)
        : await showConfirm({ title, message, okButtonTitle: confirmText, cancelButtonTitle: cancelText });

      if (result && hapticOnConfirm !== 'none') {
        await triggerHaptic(hapticOnConfirm);
      }

      return result;
    }

    // Web: Use React dialog via state
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        destructive,
        onConfirm: () => {
          setDialogState(defaultDialogState);
          resolve(true);
        },
        onCancel: () => {
          setDialogState(defaultDialogState);
          resolve(false);
        },
      });
    });
  }, [isNative]);

  /**
   * Show an alert dialog (informational, single button)
   * 
   * @param options - Alert options
   */
  const alert = useCallback(async (options: AlertOptions): Promise<void> => {
    const { title, message, buttonText = 'OK' } = options;

    if (isNative) {
      await showAlert({ title, message, buttonTitle: buttonText });
      return;
    }

    // Web: Use confirm with only OK button
    return new Promise<void>((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText: buttonText,
        cancelText: '', // No cancel button for alert
        destructive: false,
        onConfirm: () => {
          setDialogState(defaultDialogState);
          resolve();
        },
        onCancel: () => {
          setDialogState(defaultDialogState);
          resolve();
        },
      });
    });
  }, [isNative]);

  /**
   * Close the dialog (for web)
   */
  const closeDialog = useCallback(() => {
    dialogState.onCancel();
  }, [dialogState]);

  return {
    /** Show a confirmation dialog */
    confirm,
    /** Show an alert dialog */
    alert,
    /** Close the dialog (web only) */
    closeDialog,
    /** Dialog state for rendering (web only) */
    dialogState,
    /** Whether we're on a native platform (dialogs are automatic) */
    isNative,
  };
}

/**
 * Hook for simple destructive confirmation (convenience wrapper)
 * 
 * @example
 * ```tsx
 * const confirmDelete = useDestructiveConfirm();
 * 
 * const handleDelete = async () => {
 *   if (await confirmDelete('Delete Exercise', 'This cannot be undone.')) {
 *     doDelete();
 *   }
 * };
 * ```
 */
export function useDestructiveConfirm() {
  const { confirm } = usePlatformConfirm();

  return useCallback(
    async (
      title: string,
      message: string,
      confirmText: string = 'Delete'
    ): Promise<boolean> => {
      return confirm({
        title,
        message,
        confirmText,
        destructive: true,
      });
    },
    [confirm]
  );
}

export default usePlatformConfirm;
