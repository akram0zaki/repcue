/**
 * Native Dialog utility
 * Provides native iOS dialogs via Capacitor Dialog plugin
 * Falls back to browser dialogs on web
 * 
 * @module nativeDialog
 */
import { Dialog } from '@capacitor/dialog';
import { isNativePlatform, isIOS } from './nativeCapabilities';
import logger from './logger';

/**
 * Alert dialog options
 */
export interface AlertOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Button text (default: "OK") */
  buttonTitle?: string;
}

/**
 * Confirm dialog options
 */
export interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** OK button text (default: "OK") */
  okButtonTitle?: string;
  /** Cancel button text (default: "Cancel") */
  cancelButtonTitle?: string;
}

/**
 * Prompt dialog options
 */
export interface PromptOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** OK button text (default: "OK") */
  okButtonTitle?: string;
  /** Cancel button text (default: "Cancel") */
  cancelButtonTitle?: string;
  /** Input placeholder text */
  inputPlaceholder?: string;
  /** Input type (text, email, etc.) */
  inputText?: string;
}

/**
 * Action sheet button
 */
export interface ActionSheetButton {
  /** Button title */
  title: string;
  /** Button style - destructive buttons appear in red */
  style?: 'default' | 'destructive' | 'cancel';
}

/**
 * Action sheet options
 */
export interface ActionSheetOptions {
  /** Sheet title */
  title?: string;
  /** Sheet message */
  message?: string;
  /** Action buttons */
  options: ActionSheetButton[];
}

/**
 * Show an alert dialog
 * Uses native iOS dialog when available, falls back to browser alert
 * 
 * @param options - Alert options
 * @returns Promise that resolves when dialog is dismissed
 */
export async function showAlert(options: AlertOptions): Promise<void> {
  const { title, message, buttonTitle = 'OK' } = options;

  if (isNativePlatform() && isIOS()) {
    try {
      await Dialog.alert({
        title,
        message,
        buttonTitle,
      });
      logger.log('[Dialog] Native alert shown:', title);
      return;
    } catch (error) {
      logger.warn('[Dialog] Native alert failed, falling back to browser:', error);
    }
  }

  // Fallback to browser alert
  window.alert(`${title}\n\n${message}`);
}

/**
 * Show a confirmation dialog
 * Uses native iOS dialog when available, falls back to browser confirm
 * 
 * @param options - Confirm options
 * @returns Promise<boolean> - true if user confirmed, false if cancelled
 */
export async function showConfirm(options: ConfirmOptions): Promise<boolean> {
  const { 
    title, 
    message, 
    okButtonTitle = 'OK', 
    cancelButtonTitle = 'Cancel' 
  } = options;

  if (isNativePlatform() && isIOS()) {
    try {
      const result = await Dialog.confirm({
        title,
        message,
        okButtonTitle,
        cancelButtonTitle,
      });
      logger.log('[Dialog] Native confirm shown:', title, 'Result:', result.value);
      return result.value;
    } catch (error) {
      logger.warn('[Dialog] Native confirm failed, falling back to browser:', error);
    }
  }

  // Fallback to browser confirm
  return window.confirm(`${title}\n\n${message}`);
}

/**
 * Show a prompt dialog
 * Uses native iOS dialog when available, falls back to browser prompt
 * 
 * @param options - Prompt options
 * @returns Promise<{value: string | null, cancelled: boolean}>
 */
export async function showPrompt(options: PromptOptions): Promise<{
  value: string | null;
  cancelled: boolean;
}> {
  const { 
    title, 
    message, 
    okButtonTitle = 'OK', 
    cancelButtonTitle = 'Cancel',
    inputPlaceholder = '',
    inputText = ''
  } = options;

  if (isNativePlatform() && isIOS()) {
    try {
      const result = await Dialog.prompt({
        title,
        message,
        okButtonTitle,
        cancelButtonTitle,
        inputPlaceholder,
        inputText,
      });
      logger.log('[Dialog] Native prompt shown:', title, 'Cancelled:', result.cancelled);
      return {
        value: result.cancelled ? null : result.value,
        cancelled: result.cancelled,
      };
    } catch (error) {
      logger.warn('[Dialog] Native prompt failed, falling back to browser:', error);
    }
  }

  // Fallback to browser prompt
  const result = window.prompt(`${title}\n\n${message}`, inputText);
  return {
    value: result,
    cancelled: result === null,
  };
}

/**
 * Show a destructive confirmation dialog
 * Styled appropriately for destructive actions (delete, remove, etc.)
 * 
 * @param title - Dialog title
 * @param message - Dialog message
 * @param destructiveButtonTitle - Text for the destructive action button (default: "Delete")
 * @param cancelButtonTitle - Text for cancel button (default: "Cancel")
 * @returns Promise<boolean> - true if user confirmed destructive action
 */
export async function showDestructiveConfirm(
  title: string,
  message: string,
  destructiveButtonTitle: string = 'Delete',
  cancelButtonTitle: string = 'Cancel'
): Promise<boolean> {
  // For native iOS, we can use confirm which shows appropriately styled buttons
  // The button order and styling follows iOS HIG
  return showConfirm({
    title,
    message,
    okButtonTitle: destructiveButtonTitle,
    cancelButtonTitle,
  });
}

/**
 * Show an error alert
 * Convenience function for showing error messages
 * 
 * @param title - Error title
 * @param message - Error message
 */
export async function showError(
  title: string = 'Error',
  message: string
): Promise<void> {
  return showAlert({
    title,
    message,
    buttonTitle: 'OK',
  });
}

/**
 * Show a success alert
 * Convenience function for showing success messages
 * 
 * @param title - Success title
 * @param message - Success message
 */
export async function showSuccess(
  title: string = 'Success',
  message: string
): Promise<void> {
  return showAlert({
    title,
    message,
    buttonTitle: 'OK',
  });
}

/**
 * Show action sheet (iOS) or simple select (web)
 * Note: Capacitor Dialog doesn't support action sheets directly,
 * so this uses a custom implementation for web
 * 
 * @param options - Action sheet options
 * @returns Promise<number | null> - Index of selected option, or null if cancelled
 */
export async function showActionSheet(
  options: ActionSheetOptions
): Promise<number | null> {
  const { title, message, options: buttons } = options;

  // For native, we'd ideally use @capacitor/action-sheet
  // Since we're using @capacitor/dialog, fall back to confirm for simple cases
  // or return null to indicate this should be handled by UI component
  
  if (buttons.length === 1) {
    // Simple alert case
    await showAlert({
      title: title || buttons[0].title,
      message: message || '',
      buttonTitle: buttons[0].title,
    });
    return 0;
  }

  if (buttons.length === 2) {
    // Confirm case
    const cancelButton = buttons.find(b => b.style === 'cancel');
    const actionButton = buttons.find(b => b.style !== 'cancel');
    
    if (cancelButton && actionButton) {
      const result = await showConfirm({
        title: title || '',
        message: message || '',
        okButtonTitle: actionButton.title,
        cancelButtonTitle: cancelButton.title,
      });
      
      return result ? buttons.indexOf(actionButton) : null;
    }
  }

  // For more complex action sheets, return null to indicate
  // the caller should use a custom UI component
  logger.log('[Dialog] Complex action sheet not supported via native dialog, use IOSSheet component');
  return null;
}

/**
 * Check if native dialogs are available
 * 
 * @returns boolean - true if native dialogs will be used
 */
export function isNativeDialogAvailable(): boolean {
  return isNativePlatform() && isIOS();
}
