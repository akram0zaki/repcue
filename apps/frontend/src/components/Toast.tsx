import React, { useEffect, useState } from 'react';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

const Toast: React.FC<ToastProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconBg: 'bg-[color:var(--color-error-background)]',
          iconColor: 'text-[color:var(--color-error)]',
          confirmButton: 'bg-[color:var(--color-error)] hover:bg-[color:var(--color-error-hover)] focus:ring-[color:var(--color-error-focus)]',
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-[color:var(--color-warning-background)]',
          iconColor: 'text-[color:var(--color-warning)]',
          confirmButton: 'bg-[color:var(--color-warning)] hover:bg-[color:var(--color-warning-hover)] focus:ring-[color:var(--color-warning-focus)]',
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconBg: 'bg-[color:var(--color-surface-100)]',
          iconColor: 'text-[color:var(--color-primary)]',
          confirmButton: 'bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] focus:ring-[color:var(--color-primary-focus)]',
        };
      default:
        return {
          icon: '⚠️',
          iconBg: 'bg-[color:var(--color-warning-background)]',
          iconColor: 'text-[color:var(--color-warning)]',
          confirmButton: 'bg-[color:var(--color-warning)] hover:bg-[color:var(--color-warning-hover)] focus:ring-[color:var(--color-warning-focus)]',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-[color:var(--color-overlay-bg)] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Toast Card */}
      <div
        className={`relative bg-[color:var(--color-surface-0)] rounded-lg shadow-xl max-w-md w-full mx-auto transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="toast-title"
        aria-describedby="toast-message"
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <span className={`text-lg ${styles.iconColor}`} aria-hidden="true">
                {styles.icon}
              </span>
            </div>
            <div className="ml-4 flex-1">
              {title && (
                <h3 
                  id="toast-title"
                  className="text-lg font-medium text-[color:var(--color-text-900)] mb-2"
                >
                  {title}
                </h3>
              )}
              <p 
                id="toast-message"
                className="text-sm text-[color:var(--color-text-700)] leading-relaxed"
              >
                {message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3 justify-end">
            {onConfirm ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-[color:var(--color-text-700)] bg-[color:var(--color-surface-100)] border border-[color:var(--color-border-primary)] rounded-lg hover:bg-[color:var(--color-surface-200)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--color-border-focus)] focus:ring-offset-[color:var(--color-surface-0)] transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium text-[color:var(--color-text-50)] rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface-0)] transition-colors ${styles.confirmButton}`}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className={`px-4 py-2 text-sm font-medium text-[color:var(--color-text-50)] rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface-0)] transition-colors ${styles.confirmButton}`}
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
