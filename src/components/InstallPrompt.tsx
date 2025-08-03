/**
 * Smart Install Banner Component
 * 
 * Provides intelligent, platform-specific PWA installation prompts with:
 * - Android/Desktop: Native install button using BeforeInstallPromptEvent
 * - iOS Safari: Step-by-step Add to Home Screen instructions
 * - Accessibility compliant with ARIA labels and focus management
 * - Smooth animations and dismissal persistence
 * - Privacy-compliant analytics integration
 */

import React, { useState, useEffect, useRef } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { isIOS, isAndroid, getOSName } from '../utils/platformDetection';

/**
 * Install Banner Props
 */
interface InstallPromptProps {
  /** Custom className for styling */
  className?: string;
  /** Show banner only on specific pages */
  showOnPages?: string[];
  /** Custom install button text */
  customButtonText?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Auto-hide after specified time (0 = no auto-hide) */
  autoHideAfter?: number;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Callback when install is initiated */
  onInstallAttempt?: () => void;
}

/**
 * iOS Install Instructions Step
 */
interface IOSInstallStep {
  icon: string;
  text: string;
  highlight?: string;
}

/**
 * Smart Install Banner Component
 */
export const InstallPrompt: React.FC<InstallPromptProps> = ({
  className = '',
  showOnPages = [],
  customButtonText,
  animationDuration = 300,
  autoHideAfter = 0,
  onDismiss,
  onInstallAttempt,
}) => {
  const {
    isAvailable,
    canShowPrompt,
    isInstalling,
    installError,
    needsManualInstructions,
    promptInstall,
    dismissPrompt,
    resetError,
  } = useInstallPrompt();

  // Component state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Refs for accessibility
  const bannerRef = useRef<HTMLDivElement>(null);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const installButtonRef = useRef<HTMLButtonElement>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * iOS Add to Home Screen Instructions
   */
  const iosInstructions: IOSInstallStep[] = [
    {
      icon: '📱',
      text: 'Tap the Share button',
      highlight: 'Share button (square with arrow up)',
    },
    {
      icon: '🏠',
      text: 'Select "Add to Home Screen"',
      highlight: '"Add to Home Screen" option',
    },
    {
      icon: '✅',
      text: 'Tap "Add" to confirm',
      highlight: '"Add" button in the top right',
    },
  ];

  /**
   * Get platform-specific install benefits
   */
  const getInstallBenefits = (): string[] => {
    const commonBenefits = [
      'Works offline',
      'Faster loading',
      'No browser address bar',
    ];

    if (isIOS()) {
      return [
        ...commonBenefits,
        'Full screen experience',
        'Native iOS integration',
      ];
    }

    if (isAndroid()) {
      return [
        ...commonBenefits,
        'App drawer integration',
        'Background sync',
      ];
    }

    return [
      ...commonBenefits,
      'Desktop integration',
      'System notifications',
    ];
  };

  /**
   * Handle install button click
   */
  const handleInstallClick = async (): Promise<void> => {
    onInstallAttempt?.();

    if (needsManualInstructions) {
      setShowIOSInstructions(true);
      return;
    }

    try {
      const success = await promptInstall();
      if (success) {
        hideBanner();
      }
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  /**
   * Handle banner dismissal
   */
  const handleDismiss = (): void => {
    onDismiss?.();
    dismissPrompt();
    hideBanner();
  };

  /**
   * Show banner with animation
   */
  const showBanner = (): void => {
    setIsAnimating(true);
    setIsVisible(true);
    
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      // Focus the install button for accessibility
      installButtonRef.current?.focus();
    }, animationDuration);

    // Set auto-hide timer if specified
    if (autoHideAfter > 0) {
      // Clear any existing auto-hide timeout
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      autoHideTimeoutRef.current = setTimeout(() => {
        hideBanner();
      }, autoHideAfter);
    }
  };

  /**
   * Hide banner with animation
   */
  const hideBanner = (): void => {
    setIsAnimating(true);
    
    // Clear any existing hide animation timeout
    if (hideAnimationTimeoutRef.current) {
      clearTimeout(hideAnimationTimeoutRef.current);
    }
    
    hideAnimationTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      setShowIOSInstructions(false);
      setCurrentStep(0);
    }, animationDuration);

    // Clear auto-hide timer
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  };

  /**
   * Handle iOS instruction navigation
   */
  const handleIOSStepNavigation = (direction: 'next' | 'prev'): void => {
    if (direction === 'next' && currentStep < iosInstructions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (direction === 'prev' && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case 'Escape':
        handleDismiss();
        break;
      case 'Enter':
      case ' ':
        if (event.target === dismissButtonRef.current) {
          handleDismiss();
        } else if (event.target === installButtonRef.current) {
          handleInstallClick();
        }
        break;
    }
  };

  /**
   * Check if should show on current page
   */
  const shouldShowOnCurrentPage = (): boolean => {
    if (showOnPages.length === 0) return true;
    
    const currentPath = window.location.pathname;
    return showOnPages.some(page => 
      currentPath === page || currentPath.startsWith(page)
    );
  };

  /**
   * Initialize banner visibility
   */
  useEffect(() => {
    if (isAvailable && canShowPrompt && shouldShowOnCurrentPage()) {
      showBanner();
    } else {
      hideBanner();
    }
  }, [isAvailable, canShowPrompt]);

  /**
   * Clear error and timers when component unmounts
   */
  useEffect(() => {
    return () => {
      if (installError) {
        resetError();
      }
      // Clear all timeouts to prevent memory leaks and test errors
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      if (hideAnimationTimeoutRef.current) {
        clearTimeout(hideAnimationTimeoutRef.current);
        hideAnimationTimeoutRef.current = null;
      }
    };
  }, [installError, resetError]);

  // Don't render if not visible
  if (!isVisible) return null;

  /**
   * iOS Instructions Modal
   */
  const renderIOSInstructions = (): React.ReactElement => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-labelledby="ios-instructions-title"
        aria-describedby="ios-instructions-description"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="ios-instructions-title" className="text-lg font-semibold text-gray-900">
            Install RepCue
          </h3>
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
            aria-label="Close instructions"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div id="ios-instructions-description" className="mb-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">{iosInstructions[currentStep].icon}</div>
            <p className="text-gray-700 mb-2">{iosInstructions[currentStep].text}</p>
            <p className="text-sm text-gray-500">{iosInstructions[currentStep].highlight}</p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center space-x-2 mb-4">
            {iosInstructions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                aria-label={`Step ${index + 1} of ${iosInstructions.length}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => handleIOSStepNavigation('prev')}
              disabled={currentStep === 0}
              className="px-4 py-2 text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Previous
            </button>
            <span className="flex items-center text-sm text-gray-500">
              {currentStep + 1} of {iosInstructions.length}
            </span>
            <button
              onClick={() => handleIOSStepNavigation('next')}
              disabled={currentStep === iosInstructions.length - 1}
              className="px-4 py-2 text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Next
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowIOSInstructions(false)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  /**
   * Install Benefits List
   */
  const renderBenefits = (): React.ReactElement => (
    <div className="flex flex-wrap gap-2 mt-2">
      {getInstallBenefits().slice(0, 3).map((benefit, index) => (
        <span
          key={index}
          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
        >
          {benefit}
        </span>
      ))}
    </div>
  );

  return (
    <>
      {/* Main Install Banner */}
      <div
        ref={bannerRef}
        className={`
          fixed bottom-0 left-0 right-0 z-40 
          bg-gradient-to-r from-blue-600 to-blue-700 
          text-white shadow-lg border-t-2 border-blue-500
          transform transition-transform duration-${animationDuration}
          ${isAnimating ? 'translate-y-full' : 'translate-y-0'}
          ${className}
        `}
        role="banner"
        aria-labelledby="install-banner-title"
        aria-describedby="install-banner-description"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Banner Content */}
            <div className="flex-1 mr-4">
              <div className="flex items-center mb-1">
                <span className="text-lg mr-2">📱</span>
                <h3 id="install-banner-title" className="font-semibold text-sm">
                  Install RepCue
                </h3>
              </div>
              
              <p id="install-banner-description" className="text-xs text-blue-100 mb-2">
                Get the full app experience on {getOSName()}
              </p>
              
              {renderBenefits()}
              
              {installError && (
                <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-xs">
                  <strong>Install failed:</strong> {installError}
                  <button
                    onClick={resetError}
                    className="ml-2 underline hover:no-underline focus:outline-none"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                ref={installButtonRef}
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="
                  bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg
                  hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  text-sm min-w-[80px]
                "
                aria-describedby="install-button-description"
              >
                {isInstalling ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Installing...
                  </span>
                ) : (
                  customButtonText || (needsManualInstructions ? 'How to Install' : 'Install')
                )}
              </button>

              <button
                ref={dismissButtonRef}
                onClick={handleDismiss}
                className="
                  text-blue-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                  p-2 rounded-full transition-colors duration-200
                "
                aria-label="Dismiss install banner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div id="install-button-description" className="sr-only">
          {needsManualInstructions 
            ? 'Opens step-by-step installation instructions for iOS Safari'
            : `Installs RepCue as a native app on your ${getOSName()} device`
          }
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && renderIOSInstructions()}
    </>
  );
};

export default InstallPrompt;
