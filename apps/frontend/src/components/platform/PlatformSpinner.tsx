/**
 * Platform-Aware Spinner Component
 * 
 * A loading spinner that automatically adapts to the current platform:
 * - iOS: Native-style activity indicator with SF Symbol aesthetics
 * - Android: Material Design circular progress (future)
 * - Web: Standard CSS spinner with theme colors
 * 
 * @module PlatformSpinner
 */
import React from 'react';
import { isIOS, isAndroid, isNativePlatform } from '../../utils/nativeCapabilities';

export interface PlatformSpinnerProps {
  /** Size of the spinner */
  size?: 'small' | 'medium' | 'large';
  /** Custom color (uses platform defaults if not specified) */
  color?: string;
  /** Additional CSS class */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
  /** Whether to show inline with text */
  inline?: boolean;
}

/**
 * Get size dimensions based on platform and size prop
 */
const getSizeStyles = (size: 'small' | 'medium' | 'large', isNative: boolean) => {
  // iOS uses slightly larger spinners
  const multiplier = isNative ? 1.1 : 1;
  
  switch (size) {
    case 'small':
      return {
        width: Math.round(16 * multiplier),
        height: Math.round(16 * multiplier),
        borderWidth: 2,
      };
    case 'medium':
      return {
        width: Math.round(24 * multiplier),
        height: Math.round(24 * multiplier),
        borderWidth: 2.5,
      };
    case 'large':
      return {
        width: Math.round(40 * multiplier),
        height: Math.round(40 * multiplier),
        borderWidth: 3,
      };
  }
};

/**
 * Platform-aware spinner component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <PlatformSpinner />
 * 
 * // Large spinner with custom color
 * <PlatformSpinner size="large" color="#007AFF" />
 * 
 * // Inline with text
 * <PlatformSpinner size="small" inline label="Loading..." />
 * ```
 */
export const PlatformSpinner: React.FC<PlatformSpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
  label = 'Loading',
  inline = false,
}) => {
  const isNative = isNativePlatform();
  const ios = isIOS();
  const android = isAndroid();
  const sizeStyles = getSizeStyles(size, isNative);

  // Platform-specific default colors
  const defaultColor = ios 
    ? 'var(--ios-system-gray, #8E8E93)' 
    : android 
      ? 'var(--android-primary, #6200EE)' 
      : 'currentColor';
  
  const spinnerColor = color || defaultColor;

  // iOS-style spinner (12 segments that fade)
  if (ios) {
    return (
      <div
        className={`platform-spinner platform-spinner--ios ${inline ? 'inline-flex' : 'flex'} items-center justify-center ${className}`}
        role="progressbar"
        aria-label={label}
        aria-busy="true"
        style={{
          width: sizeStyles.width,
          height: sizeStyles.height,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="ios-spinner-svg animate-spin"
          style={{ 
            width: '100%', 
            height: '100%',
          }}
        >
          {/* iOS-style spinner with 8 segments */}
          {[...Array(8)].map((_, i) => {
            const rotation = i * 45;
            const opacity = (8 - i) / 8;
            return (
              <line
                key={i}
                x1="12"
                y1="4"
                x2="12"
                y2="7"
                stroke={spinnerColor}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={opacity}
                transform={`rotate(${rotation} 12 12)`}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  // Android Material Design spinner (future enhancement)
  if (android) {
    return (
      <div
        className={`platform-spinner platform-spinner--android ${inline ? 'inline-flex' : 'flex'} items-center justify-center ${className}`}
        role="progressbar"
        aria-label={label}
        aria-busy="true"
      >
        <svg
          className="animate-spin"
          style={{
            width: sizeStyles.width,
            height: sizeStyles.height,
          }}
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke={spinnerColor}
            strokeWidth={sizeStyles.borderWidth}
            strokeDasharray="31.4 31.4"
            strokeLinecap="round"
            className="android-spinner-circle"
          />
        </svg>
      </div>
    );
  }

  // Web/default spinner (border-based)
  return (
    <div
      className={`platform-spinner platform-spinner--web ${inline ? 'inline-flex' : 'flex'} items-center justify-center ${className}`}
      role="progressbar"
      aria-label={label}
      aria-busy="true"
    >
      <div
        className="animate-spin rounded-full"
        style={{
          width: sizeStyles.width,
          height: sizeStyles.height,
          borderWidth: sizeStyles.borderWidth,
          borderStyle: 'solid',
          borderColor: `color-mix(in srgb, ${spinnerColor} 25%, transparent)`,
          borderTopColor: spinnerColor,
        }}
      />
    </div>
  );
};

/**
 * Full-screen loading overlay with spinner
 */
export interface PlatformLoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  size?: 'small' | 'medium' | 'large';
  /** Whether to cover full screen (vs parent container) */
  fullScreen?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const PlatformLoadingOverlay: React.FC<PlatformLoadingOverlayProps> = ({
  isLoading,
  message,
  size = 'large',
  fullScreen = false,
  className = '',
}) => {
  if (!isLoading) {
    return null;
  }

  const ios = isIOS();

  return (
    <div 
      className={`
        ${fullScreen ? 'fixed inset-0' : 'absolute inset-0'} 
        flex flex-col items-center justify-center 
        bg-black/50 z-50
        ${className}
      `}
      role="alert"
      aria-busy="true"
      aria-label={message || 'Loading'}
    >
      <div 
        className={`
          flex flex-col items-center gap-3 p-6
          ${ios 
            ? 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl' 
            : 'bg-white dark:bg-gray-800 rounded-lg shadow-lg'
          }
        `}
      >
        <PlatformSpinner size={size} label={message} />
        {message && (
          <p className="text-gray-700 dark:text-gray-200 text-sm text-center max-w-[200px]">
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
export interface PlatformInlineLoaderProps {
  /** Loading text */
  text?: string;
  /** Additional CSS class */
  className?: string;
}

export const PlatformInlineLoader: React.FC<PlatformInlineLoaderProps> = ({
  text = 'Loading...',
  className = '',
}) => {
  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      role="status"
      aria-label={text}
    >
      <PlatformSpinner size="small" inline />
      <span className="text-gray-500 dark:text-gray-400 text-sm">
        {text}
      </span>
    </div>
  );
};

/**
 * Button with loading state
 */
export interface PlatformLoadingButtonProps {
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
  variant?: 'primary' | 'secondary' | 'danger';
  /** Additional CSS class */
  className?: string;
}

export const PlatformLoadingButton: React.FC<PlatformLoadingButtonProps> = ({
  isLoading,
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  className = '',
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };

  return (
    <button
      type={type}
      className={`${variantClasses[variant]} flex items-center justify-center gap-2 min-w-[80px] ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <PlatformSpinner 
            size="small" 
            color={variant === 'primary' ? '#FFFFFF' : undefined}
            inline
          />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default PlatformSpinner;
