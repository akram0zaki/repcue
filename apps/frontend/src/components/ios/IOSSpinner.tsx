/**
 * iOS-style Spinner (Activity Indicator) Component
 * 
 * Follows Apple Human Interface Guidelines for loading indicators.
 * Supports both small (default) and large sizes.
 * 
 * @module IOSSpinner
 */
import React from 'react';

export interface IOSSpinnerProps {
  /** Size of the spinner */
  size?: 'small' | 'large';
  /** Custom color (uses iOS system gray by default) */
  color?: string;
  /** Additional CSS class */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * iOS-style Activity Indicator
 * 
 * @example
 * ```tsx
 * // Default small spinner
 * <IOSSpinner />
 * 
 * // Large spinner with custom color
 * <IOSSpinner size="large" color="var(--ios-system-blue)" />
 * 
 * // With loading message
 * <IOSSpinner label="Loading exercises..." />
 * ```
 */
export const IOSSpinner: React.FC<IOSSpinnerProps> = ({
  size = 'small',
  color,
  className = '',
  label = 'Loading',
}) => {
  const sizeClass = size === 'large' ? 'ios-spinner--large' : '';
  
  return (
    <div 
      className={`ios-spinner ${sizeClass} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-busy="true"
    >
      <div 
        className="ios-spinner__circle"
        style={color ? { 
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          borderTopColor: color 
        } : undefined}
      />
    </div>
  );
};

/**
 * iOS-style Loading Overlay
 * 
 * Full-screen or container overlay with spinner and optional message.
 */
export interface IOSLoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  spinnerSize?: 'small' | 'large';
  /** Whether to cover full screen (vs parent container) */
  fullScreen?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const IOSLoadingOverlay: React.FC<IOSLoadingOverlayProps> = ({
  isLoading,
  message,
  spinnerSize = 'large',
  fullScreen = false,
  className = '',
}) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div 
      className={`
        ${fullScreen ? 'fixed inset-0' : 'absolute inset-0'} 
        flex flex-col items-center justify-center 
        bg-black/60 z-50
        ${className}
      `}
      role="alert"
      aria-busy="true"
      aria-label={message || 'Loading'}
    >
      <div className="bg-[var(--ios-background-tertiary)] rounded-[var(--ios-corner-radius-large)] p-6 flex flex-col items-center gap-4 shadow-lg">
        <IOSSpinner size={spinnerSize} label={message} />
        {message && (
          <p className="text-[var(--ios-label-primary)] text-[15px] text-center max-w-[200px]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Inline loading indicator with text
 */
export interface IOSInlineLoaderProps {
  /** Loading text */
  text?: string;
  /** Additional CSS class */
  className?: string;
}

export const IOSInlineLoader: React.FC<IOSInlineLoaderProps> = ({
  text = 'Loading...',
  className = '',
}) => {
  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      role="status"
      aria-label={text}
    >
      <IOSSpinner size="small" />
      <span className="text-[var(--ios-label-secondary)] text-[15px]">
        {text}
      </span>
    </div>
  );
};

/**
 * Button with loading state
 */
export interface IOSLoadingButtonProps {
  /** Whether button is in loading state */
  isLoading: boolean;
  /** Button text */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: 'default' | 'filled' | 'destructive';
  /** Additional CSS class */
  className?: string;
}

export const IOSLoadingButton: React.FC<IOSLoadingButtonProps> = ({
  isLoading,
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'default',
  className = '',
}) => {
  const variantClass = variant === 'filled' 
    ? 'ios-button--filled' 
    : variant === 'destructive' 
      ? 'ios-button--destructive' 
      : '';

  return (
    <button
      type={type}
      className={`ios-button ${variantClass} flex items-center justify-center gap-2 min-w-[80px] ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <IOSSpinner 
            size="small" 
            color={variant === 'filled' ? '#FFFFFF' : undefined}
          />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Pull-to-refresh indicator
 */
export interface IOSPullToRefreshProps {
  /** Whether refreshing is in progress */
  isRefreshing: boolean;
  /** Pull progress (0-1) */
  progress?: number;
  /** Additional CSS class */
  className?: string;
}

export const IOSPullToRefresh: React.FC<IOSPullToRefreshProps> = ({
  isRefreshing,
  progress = 0,
  className = '',
}) => {
  // Calculate opacity based on progress
  const opacity = isRefreshing ? 1 : Math.min(progress, 1);
  // Calculate rotation based on progress
  const rotation = isRefreshing ? 0 : progress * 360;

  return (
    <div 
      className={`flex items-center justify-center py-4 ${className}`}
      style={{ opacity }}
      aria-hidden={!isRefreshing}
    >
      {isRefreshing ? (
        <IOSSpinner size="small" />
      ) : (
        <div 
          className="w-5 h-5"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg 
            viewBox="0 0 20 20" 
            fill="none" 
            className="w-full h-full text-[var(--ios-label-secondary)]"
          >
            <path 
              d="M10 3V1M10 19v-2M17 10h2M1 10h2M14.95 14.95l1.41 1.41M3.64 3.64l1.41 1.41M14.95 5.05l1.41-1.41M3.64 16.36l1.41-1.41" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default IOSSpinner;
