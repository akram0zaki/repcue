import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OnboardingFlow from '../OnboardingFlow';
import useOnboarding from '../../hooks/useOnboarding';

// Mock the useOnboarding hook
vi.mock('../../hooks/useOnboarding');

const mockUseOnboarding = vi.mocked(useOnboarding);

describe('OnboardingFlow', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const mockNextStep = vi.fn();
  const mockPreviousStep = vi.fn();
  const mockSkipOnboarding = vi.fn();
  const mockCompleteOnboarding = vi.fn();
  const mockGoToStep = vi.fn();

  const defaultOnboardingState = {
    isOnboardingActive: true,
    currentStepData: {
      id: 'welcome',
      title: 'Welcome to RepCue!',
      description: 'Your privacy-first fitness tracking app.',
      icon: '🎯'
    },
    currentStep: 0,
    totalSteps: 3,
    progress: 33.33,
    canGoNext: true,
    canGoPrevious: false,
    isLastStep: false,
    isFirstStep: true,
    nextStep: mockNextStep,
    previousStep: mockPreviousStep,
    skipOnboarding: mockSkipOnboarding,
    completeOnboarding: mockCompleteOnboarding,
    goToStep: mockGoToStep,
    // Additional properties from the hook
    steps: [],
    isFirstTime: true,
    hasCompletedOnboarding: false,
    isSkipped: false,
    startedAt: new Date(),
    startOnboarding: vi.fn(),
    resetOnboarding: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnboarding.mockReturnValue(defaultOnboardingState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render onboarding flow when active', () => {
      render(<OnboardingFlow />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome to RepCue!')).toBeInTheDocument();
      expect(screen.getByText('Your privacy-first fitness tracking app.')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('should not render when onboarding is not active', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        isOnboardingActive: false
      });

      render(<OnboardingFlow />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when currentStepData is null', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStepData: null
      });

      render(<OnboardingFlow />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<OnboardingFlow className="custom-class" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });

  describe('Progress Indicator', () => {
    it('should display correct step information', () => {
      render(<OnboardingFlow />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    it('should show progress bar with correct width', () => {
      render(<OnboardingFlow />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '33.33%' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '33');
    });

    it('should render step indicator dots', () => {
      render(<OnboardingFlow />);

      const stepButtons = screen.getAllByRole('button', { name: /Go to step \d+/ });
      expect(stepButtons).toHaveLength(3);
    });

    it('should highlight current step dot', () => {
      render(<OnboardingFlow />);

      const currentStepButton = screen.getByRole('button', { name: 'Go to step 1' });
      expect(currentStepButton).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('Navigation', () => {
    it('should show Next button when not on last step', () => {
      render(<OnboardingFlow />);

      const nextButton = screen.getByRole('button', { name: 'Go to next step' });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toHaveTextContent('Next');
    });

    it('should show Get Started button on last step', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 2,
        isLastStep: true,
        canGoPrevious: true,
        canGoNext: false
      });

      render(<OnboardingFlow />);

      const completeButton = screen.getByRole('button', { name: 'Complete onboarding' });
      expect(completeButton).toBeInTheDocument();
      expect(completeButton).toHaveTextContent('Get Started!');
    });

    it('should disable Previous button on first step', () => {
      render(<OnboardingFlow />);

      const previousButton = screen.getByRole('button', { name: 'Go to previous step' });
      expect(previousButton).toBeDisabled();
    });

    it('should enable Previous button when not on first step', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 1,
        canGoPrevious: true,
        isFirstStep: false
      });

      render(<OnboardingFlow />);

      const previousButton = screen.getByRole('button', { name: 'Go to previous step' });
      expect(previousButton).not.toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should call nextStep when Next button is clicked', () => {
      render(<OnboardingFlow />);

      const nextButton = screen.getByRole('button', { name: 'Go to next step' });
      fireEvent.click(nextButton);

      expect(mockNextStep).toHaveBeenCalledTimes(1);
    });

    it('should call previousStep when Previous button is clicked', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 1,
        canGoPrevious: true,
        isFirstStep: false
      });

      render(<OnboardingFlow />);

      const previousButton = screen.getByRole('button', { name: 'Go to previous step' });
      fireEvent.click(previousButton);

      expect(mockPreviousStep).toHaveBeenCalledTimes(1);
    });

    it('should call completeOnboarding when Get Started button is clicked', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 2,
        isLastStep: true,
        canGoPrevious: true,
        canGoNext: false
      });

      render(<OnboardingFlow />);

      const completeButton = screen.getByRole('button', { name: 'Complete onboarding' });
      fireEvent.click(completeButton);

      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should call skipOnboarding when Skip button is clicked', () => {
      render(<OnboardingFlow />);

      const skipButton = screen.getByRole('button', { name: 'Skip onboarding' });
      fireEvent.click(skipButton);

      expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should call goToStep when step indicator is clicked', () => {
      render(<OnboardingFlow />);

      const step2Button = screen.getByRole('button', { name: 'Go to step 2' });
      fireEvent.click(step2Button);

      expect(mockGoToStep).toHaveBeenCalledWith(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next step on right arrow key', () => {
      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'ArrowRight' });

      expect(mockNextStep).toHaveBeenCalledTimes(1);
    });

    it('should navigate to previous step on left arrow key', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 1,
        canGoPrevious: true,
        isFirstStep: false
      });

      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      expect(mockPreviousStep).toHaveBeenCalledTimes(1);
    });

    it('should navigate on Enter key', () => {
      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockNextStep).toHaveBeenCalledTimes(1);
    });

    it('should complete onboarding on Enter key when on last step', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 2,
        isLastStep: true,
        canGoPrevious: true,
        canGoNext: false
      });

      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should skip onboarding on Escape key', () => {
      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should not handle keyboard events when onboarding is not active', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        isOnboardingActive: false
      });

      render(<OnboardingFlow />);

      fireEvent.keyDown(document, { key: 'ArrowRight' });

      expect(mockNextStep).not.toHaveBeenCalled();
    });
  });

  describe('Touch/Swipe Navigation', () => {
    it('should navigate to next step on left swipe', () => {
      render(<OnboardingFlow />);

      // Simulate swipe left (next)
      fireEvent.touchStart(document, {
        changedTouches: [{ screenX: 100, screenY: 100 }]
      });
      fireEvent.touchEnd(document, {
        changedTouches: [{ screenX: 30, screenY: 100 }] // Swipe left
      });

      expect(mockNextStep).toHaveBeenCalledTimes(1);
    });

    it('should navigate to previous step on right swipe', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 1,
        canGoPrevious: true,
        isFirstStep: false
      });

      render(<OnboardingFlow />);

      // Simulate swipe right (previous)
      fireEvent.touchStart(document, {
        changedTouches: [{ screenX: 30, screenY: 100 }]
      });
      fireEvent.touchEnd(document, {
        changedTouches: [{ screenX: 100, screenY: 100 }] // Swipe right
      });

      expect(mockPreviousStep).toHaveBeenCalledTimes(1);
    });

    it('should complete onboarding on left swipe when on last step', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStep: 2,
        isLastStep: true,
        canGoPrevious: true,
        canGoNext: false
      });

      render(<OnboardingFlow />);

      // Simulate swipe left on last step
      fireEvent.touchStart(document, {
        changedTouches: [{ screenX: 100, screenY: 100 }]
      });
      fireEvent.touchEnd(document, {
        changedTouches: [{ screenX: 30, screenY: 100 }]
      });

      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should ignore vertical swipes', () => {
      render(<OnboardingFlow />);

      // Simulate vertical swipe
      fireEvent.touchStart(document, {
        changedTouches: [{ screenX: 100, screenY: 100 }]
      });
      fireEvent.touchEnd(document, {
        changedTouches: [{ screenX: 100, screenY: 30 }] // Vertical swipe
      });

      expect(mockNextStep).not.toHaveBeenCalled();
      expect(mockPreviousStep).not.toHaveBeenCalled();
    });

    it('should ignore short swipes', () => {
      render(<OnboardingFlow />);

      // Simulate short swipe (less than minimum distance)
      fireEvent.touchStart(document, {
        changedTouches: [{ screenX: 100, screenY: 100 }]
      });
      fireEvent.touchEnd(document, {
        changedTouches: [{ screenX: 80, screenY: 100 }] // Short swipe
      });

      expect(mockNextStep).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onComplete when onboarding becomes inactive', () => {
      const { rerender } = render(<OnboardingFlow onComplete={mockOnComplete} />);

      // Simulate onboarding becoming inactive
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        isOnboardingActive: false
      });

      rerender(<OnboardingFlow onComplete={mockOnComplete} />);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onSkip when skip button is clicked', () => {
      render(<OnboardingFlow onSkip={mockOnSkip} />);

      const skipButton = screen.getByRole('button', { name: 'Skip onboarding' });
      fireEvent.click(skipButton);

      expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should not call callbacks if not provided', () => {
      render(<OnboardingFlow />);

      const skipButton = screen.getByRole('button', { name: 'Skip onboarding' });
      fireEvent.click(skipButton);

      // Should not throw error
      expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<OnboardingFlow />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'onboarding-description');
    });

    it('should have accessible progress bar', () => {
      render(<OnboardingFlow />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Onboarding progress: 33%');
    });

    it('should have properly labeled buttons', () => {
      render(<OnboardingFlow />);

      expect(screen.getByRole('button', { name: 'Skip onboarding' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to next step' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to previous step' })).toBeInTheDocument();
    });

    it('should have accessible step indicator', () => {
      render(<OnboardingFlow />);

      const stepButtons = screen.getAllByRole('button', { name: /Go to step \d+/ });
      expect(stepButtons).toHaveLength(3);

      const currentStep = screen.getByRole('button', { name: 'Go to step 1' });
      expect(currentStep).toHaveAttribute('aria-current', 'step');
    });

    it('should have accessible step icon', () => {
      render(<OnboardingFlow />);

      const icon = screen.getByRole('img', { name: 'Step 1 icon' });
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Step-Specific Actions', () => {
    it('should render action button when currentStepData has action', () => {
      const mockAction = vi.fn();
      mockUseOnboarding.mockReturnValue({
        ...defaultOnboardingState,
        currentStepData: {
          ...defaultOnboardingState.currentStepData!,
          action: mockAction
        }
      });

      render(<OnboardingFlow />);

      const actionButton = screen.getByText('Try It');
      expect(actionButton).toBeInTheDocument();

      fireEvent.click(actionButton);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should not render action button when currentStepData has no action', () => {
      render(<OnboardingFlow />);

      expect(screen.queryByText('Try It')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Features', () => {
    it('should show swipe hint on mobile', () => {
      render(<OnboardingFlow />);

      const swipeHint = screen.getByText('💡 Swipe left/right to navigate');
      expect(swipeHint).toBeInTheDocument();
      expect(swipeHint).toHaveClass('md:hidden');
    });

    it('should show keyboard shortcuts on desktop', () => {
      render(<OnboardingFlow />);

      // Test that keyboard shortcuts section exists
      const keyboardShortcuts = screen.getByText('Navigate');
      expect(keyboardShortcuts).toBeInTheDocument();
      
      // Find the container with the responsive classes
      const shortcutsContainer = document.querySelector('.hidden.lg\\:block');
      expect(shortcutsContainer).toBeInTheDocument();
    });
  });
});
