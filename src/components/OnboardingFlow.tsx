import { useEffect } from 'react';
import useOnboarding from '../hooks/useOnboarding';

interface OnboardingFlowProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

/**
 * OnboardingFlow Component
 * 
 * A comprehensive post-install onboarding experience for first-time users.
 * 
 * Features:
 * - 3-step flow: Welcome, Features, Privacy
 * - Platform-specific content adaptation
 * - Swipe gestures for mobile navigation
 * - Progress indicator with step navigation
 * - Skip option with confirmation
 * - Auto-start for standalone installations
 * - WCAG 2.1 AA accessibility compliance
 * 
 * @param onComplete - Callback when onboarding is completed
 * @param onSkip - Callback when onboarding is skipped
 * @param className - Additional CSS classes
 */
export function OnboardingFlow({ onComplete, onSkip, className = '' }: OnboardingFlowProps) {
  const {
    isOnboardingActive,
    currentStepData,
    currentStep,
    totalSteps,
    progress,
    canGoNext,
    canGoPrevious,
    isLastStep,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    goToStep
  } = useOnboarding();

  // Handle completion callback
  useEffect(() => {
    if (!isOnboardingActive && onComplete) {
      onComplete();
    }
  }, [isOnboardingActive, onComplete]);

  // Handle skip callback
  const handleSkip = () => {
    skipOnboarding();
    if (onSkip) {
      onSkip();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOnboardingActive) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          if (canGoPrevious) {
            event.preventDefault();
            previousStep();
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'Enter':
          if (canGoNext) {
            event.preventDefault();
            nextStep();
          } else if (isLastStep) {
            event.preventDefault();
            completeOnboarding();
          }
          break;
        case 'Escape':
          event.preventDefault();
          handleSkip();
          break;
      }
    };

    if (isOnboardingActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOnboardingActive, canGoNext, canGoPrevious, isLastStep, nextStep, previousStep, completeOnboarding, handleSkip]);

  // Handle swipe gestures for mobile
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipeDistance = 50;

      // Ensure horizontal swipe is more significant than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && canGoPrevious) {
          // Swipe right - go to previous step
          previousStep();
        } else if (deltaX < 0 && canGoNext) {
          // Swipe left - go to next step
          nextStep();
        } else if (deltaX < 0 && isLastStep) {
          // Swipe left on last step - complete onboarding
          completeOnboarding();
        }
      }
    };

    if (isOnboardingActive) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isOnboardingActive, canGoNext, canGoPrevious, isLastStep, nextStep, previousStep, completeOnboarding]);

  // Don't render if onboarding is not active
  if (!isOnboardingActive || !currentStepData) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

      {/* Main onboarding container */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with progress indicator */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                aria-label="Skip onboarding"
              >
                Skip
              </button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Onboarding progress: ${Math.round(progress)}%`}
              />
            </div>
          </div>

          {/* Step indicator dots */}
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentStep
                    ? 'bg-blue-600 dark:bg-blue-500 scale-125'
                    : index < currentStep
                    ? 'bg-blue-400 dark:bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === currentStep ? 'step' : undefined}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-8 text-center">
          {/* Step icon */}
          <div className="text-6xl mb-6" role="img" aria-label={`Step ${currentStep + 1} icon`}>
            {currentStepData.icon}
          </div>

          {/* Step title */}
          <h2 
            id="onboarding-title"
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            {currentStepData.title}
          </h2>

          {/* Step description */}
          <p 
            id="onboarding-description"
            className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8"
          >
            {currentStepData.description}
          </p>

          {/* Step-specific action */}
          {currentStepData.action && (
            <button
              onClick={currentStepData.action}
              className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try It
            </button>
          )}
        </div>

        {/* Navigation footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
          {/* Previous button */}
          <button
            onClick={previousStep}
            disabled={!canGoPrevious}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              canGoPrevious
                ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-600'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Go to previous step"
          >
            Previous
          </button>

          {/* Next/Complete button */}
          <button
            onClick={isLastStep ? completeOnboarding : nextStep}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            aria-label={isLastStep ? 'Complete onboarding' : 'Go to next step'}
          >
            {isLastStep ? 'Get Started!' : 'Next'}
          </button>
        </div>

        {/* Swipe hint for mobile */}
        <div className="px-6 py-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
            💡 Swipe left/right to navigate
          </p>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-600 dark:text-gray-400 hidden lg:block">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
          <div><kbd className="kbd">←→</kbd> Navigate</div>
          <div><kbd className="kbd">Enter</kbd> Next/Complete</div>
          <div><kbd className="kbd">Esc</kbd> Skip</div>
        </div>
      </div>
    </div>
  );
}

// Custom kbd styling for keyboard shortcuts
const kbdStyle = `
.kbd {
  display: inline-block;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  color: #374151;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.dark .kbd {
  color: #d1d5db;
  background-color: #374151;
  border-color: #4b5563;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('onboarding-kbd-styles')) {
  const style = document.createElement('style');
  style.id = 'onboarding-kbd-styles';
  style.textContent = kbdStyle;
  document.head.appendChild(style);
}

export default OnboardingFlow;
