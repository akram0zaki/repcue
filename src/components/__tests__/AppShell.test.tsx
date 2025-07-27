import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from '../AppShell';

// Mock the custom hooks
vi.mock('../../utils/platformDetection', () => ({
  usePlatform: vi.fn(() => ({
    isIOS: false,
    isAndroid: false,
    isDesktop: true,
    isStandalone: false,
    isMobile: false,
    browserName: 'Chrome',
    osName: 'Windows',
    canInstall: true,
    supportsBeforeInstallPrompt: true,
    supportsWebShare: true,
    supportsFileSystemAccess: true,
    supportsPushNotifications: true,
  })),
}));

vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(() => ({
    isAvailable: true,
    canShowPrompt: false,
    isInstalling: false,
    isInstalled: false,
    installError: null,
    promptInstall: vi.fn(),
    dismissPrompt: vi.fn(),
    resetError: vi.fn(),
    getInstallAnalytics: vi.fn(() => []),
    clearAnalytics: vi.fn(),
    installMethod: 'native_prompt',
    needsManualInstructions: false,
  })),
}));

vi.mock('../../hooks/useOnboarding', () => ({
  useOnboarding: vi.fn(() => ({
    isFirstTime: false,
    isOnboardingActive: false,
    currentStep: 0,
    totalSteps: 3,
    hasCompletedOnboarding: true,
    isSkipped: false,
    steps: [],
    currentStepData: null,
    progress: 100,
    canGoNext: false,
    canGoPrevious: false,
    isLastStep: false,
    isFirstStep: false,
    startOnboarding: vi.fn(),
    nextStep: vi.fn(),
    previousStep: vi.fn(),
    skipOnboarding: vi.fn(),
    completeOnboarding: vi.fn(),
    goToStep: vi.fn(),
    resetOnboarding: vi.fn(),
  })),
}));

// Mock the components
vi.mock('../Navigation', () => ({
  default: () => <nav data-testid="navigation">Navigation</nav>,
}));

vi.mock('../InstallPrompt', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="install-prompt">
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

vi.mock('../OnboardingFlow', () => ({
  default: ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => (
    <div data-testid="onboarding-flow">
      <button onClick={onComplete}>Complete</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

vi.mock('../OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner">Offline Banner</div>,
}));

// Mock react-router-dom hooks
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

const renderAppShell = (children = <div>Test Content</div>) => {
  return render(
    <BrowserRouter>
      <AppShell>{children}</AppShell>
    </BrowserRouter>
  );
};

describe('AppShell Component', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default location mock
    mockUseLocation.mockReturnValue({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
    });
    
    // Mock document.title
    Object.defineProperty(document, 'title', {
      writable: true,
      value: 'RepCue',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders app shell with basic structure', () => {
      renderAppShell();
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders skip link for accessibility', () => {
      renderAppShell();
      
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('renders offline banner', () => {
      renderAppShell();
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    it('renders navigation by default', () => {
      renderAppShell();
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });
  });

  describe('Page Configuration', () => {
    it('shows navigation on timer page now', () => {
      mockUseLocation.mockReturnValue({ pathname: '/timer' });
      renderAppShell();
      
      // Navigation should now be visible on timer page
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });
  });

  describe('Platform-Specific Features', () => {
    it('shows PWA indicator when standalone', async () => {
      const { usePlatform } = await import('../../utils/platformDetection');
      vi.mocked(usePlatform).mockReturnValue({
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isStandalone: true,
        isMobile: false,
        browserName: 'Chrome',
        osName: 'Windows',
        canInstall: true,
        supportsBeforeInstallPrompt: true,
        supportsWebShare: true,
        supportsFileSystemAccess: true,
        supportsPushNotifications: true,
      });

      renderAppShell();
      expect(screen.getByText('PWA')).toBeInTheDocument();
      expect(screen.getByTitle('Running as installed app')).toBeInTheDocument();
    });

    it('shows desktop indicator for desktop platforms', async () => {
      const { usePlatform } = await import('../../utils/platformDetection');
      vi.mocked(usePlatform).mockReturnValue({
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isStandalone: false,
        isMobile: false,
        browserName: 'Chrome',
        osName: 'Windows',
        canInstall: true,
        supportsBeforeInstallPrompt: true,
        supportsWebShare: true,
        supportsFileSystemAccess: true,
        supportsPushNotifications: true,
      });

      renderAppShell();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByTitle('Desktop version')).toBeInTheDocument();
    });

    it('applies iOS-specific styles when on iOS standalone', async () => {
      const { usePlatform } = await import('../../utils/platformDetection');
      vi.mocked(usePlatform).mockReturnValue({
        isIOS: true,
        isAndroid: false,
        isDesktop: false,
        isStandalone: true,
        isMobile: true,
        browserName: 'Safari',
        osName: 'iOS',
        canInstall: false,
        supportsBeforeInstallPrompt: false,
        supportsWebShare: true,
        supportsFileSystemAccess: false,
        supportsPushNotifications: false,
      });

      renderAppShell();
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('pt-safe-top');
    });
  });

  describe('Install Prompt Integration', () => {
    it('shows install prompt when available and not standalone', async () => {
      const { useInstallPrompt } = vi.mocked(await import('../../hooks/useInstallPrompt'));
      useInstallPrompt.mockReturnValue({
        isAvailable: true,
        canShowPrompt: true,
        isInstalling: false,
        isInstalled: false,
        installError: null,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
        resetError: vi.fn(),
        getInstallAnalytics: vi.fn(() => []),
        clearAnalytics: vi.fn(),
        installMethod: 'native_prompt',
        needsManualInstructions: false,
      });

      renderAppShell();
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    });

    it('hides install prompt when standalone', async () => {
      const { usePlatform } = await import('../../utils/platformDetection');
      const { useInstallPrompt } = await import('../../hooks/useInstallPrompt');
      
      vi.mocked(usePlatform).mockReturnValue({
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isStandalone: true,
        isMobile: false,
        browserName: 'Chrome',
        osName: 'Windows',
        canInstall: true,
        supportsBeforeInstallPrompt: true,
        supportsWebShare: true,
        supportsFileSystemAccess: true,
        supportsPushNotifications: true,
      });

      vi.mocked(useInstallPrompt).mockReturnValue({
        isAvailable: true,
        canShowPrompt: true,
        isInstalling: false,
        isInstalled: false,
        installError: null,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
        resetError: vi.fn(),
        getInstallAnalytics: vi.fn(() => []),
        clearAnalytics: vi.fn(),
        installMethod: 'native_prompt',
        needsManualInstructions: false,
      });

      renderAppShell();
      expect(screen.queryByTestId('install-prompt')).not.toBeInTheDocument();
    });

    it('handles install prompt dismissal', async () => {
      const mockDismissPrompt = vi.fn();
      const { useInstallPrompt } = await import('../../hooks/useInstallPrompt');
      
      vi.mocked(useInstallPrompt).mockReturnValue({
        isAvailable: true,
        canShowPrompt: true,
        isInstalling: false,
        isInstalled: false,
        installError: null,
        promptInstall: vi.fn(),
        dismissPrompt: mockDismissPrompt,
        resetError: vi.fn(),
        getInstallAnalytics: vi.fn(() => []),
        clearAnalytics: vi.fn(),
        installMethod: 'native_prompt',
        needsManualInstructions: false,
      });

      renderAppShell();
      
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(mockDismissPrompt).toHaveBeenCalledOnce();
    });
  });

  describe('Onboarding Integration', () => {
    it('shows onboarding flow for first-time users', async () => {
      const { useOnboarding } = await import('../../hooks/useOnboarding');
      vi.mocked(useOnboarding).mockReturnValue({
        isFirstTime: true,
        isOnboardingActive: true,
        currentStep: 0,
        totalSteps: 3,
        hasCompletedOnboarding: false,
        isSkipped: false,
        steps: [],
        currentStepData: null,
        progress: 0,
        canGoNext: true,
        canGoPrevious: false,
        isLastStep: false,
        isFirstStep: true,
        startOnboarding: vi.fn(),
        nextStep: vi.fn(),
        previousStep: vi.fn(),
        skipOnboarding: vi.fn(),
        completeOnboarding: vi.fn(),
        goToStep: vi.fn(),
        resetOnboarding: vi.fn(),
      });

      renderAppShell();
      
      expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('handles onboarding completion', async () => {
      const mockCompleteOnboarding = vi.fn();
      const { useOnboarding } = await import('../../hooks/useOnboarding');
      
      vi.mocked(useOnboarding).mockReturnValue({
        isFirstTime: true,
        isOnboardingActive: true,
        currentStep: 0,
        totalSteps: 3,
        hasCompletedOnboarding: false,
        isSkipped: false,
        steps: [],
        currentStepData: null,
        progress: 0,
        canGoNext: true,
        canGoPrevious: false,
        isLastStep: false,
        isFirstStep: true,
        startOnboarding: vi.fn(),
        nextStep: vi.fn(),
        previousStep: vi.fn(),
        skipOnboarding: vi.fn(),
        completeOnboarding: mockCompleteOnboarding,
        goToStep: vi.fn(),
        resetOnboarding: vi.fn(),
      });

      renderAppShell();
      
      const completeButton = screen.getByText('Complete');
      fireEvent.click(completeButton);
      
      expect(mockCompleteOnboarding).toHaveBeenCalledOnce();
    });
  });

  describe('Route Transitions', () => {
    it('shows skeleton loader during transitions', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      const { rerender } = renderAppShell();
      
      // Change route
      mockUseLocation.mockReturnValue({ pathname: '/exercises' });
      rerender(
        <BrowserRouter>
          <AppShell><div>New Content</div></AppShell>
        </BrowserRouter>
      );
      
      // Should show skeleton loader briefly
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading page content...')).toBeInTheDocument();
    });

    it('updates document title on route change', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      const { rerender } = renderAppShell();
      
      expect(document.title).toBe('RepCue - Exercise Timer');
      
      // Change route
      mockUseLocation.mockReturnValue({ pathname: '/exercises' });
      rerender(
        <BrowserRouter>
          <AppShell><div>New Content</div></AppShell>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(document.title).toBe('Exercises');
      });
    });
  });

  describe('Back Button Functionality', () => {
    it('handles back button click', () => {
      const mockBack = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { back: mockBack },
        writable: true,
      });

      mockUseLocation.mockReturnValue({ pathname: '/exercise/123' });
      renderAppShell();
      
      const backButton = screen.getByLabelText('Go back');
      fireEvent.click(backButton);
      
      expect(mockBack).toHaveBeenCalledOnce();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA landmarks', () => {
      renderAppShell();
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Main content')).toBeInTheDocument();
    });

    it('has proper focus management for skip link', () => {
      renderAppShell();
      
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveClass('sr-only');
      
      // Focus should make it visible
      skipLink.focus();
      expect(skipLink).toHaveClass('focus:not-sr-only');
    });

    it('provides loading announcements', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      const { rerender } = renderAppShell();
      
      // Change route to trigger loading
      mockUseLocation.mockReturnValue({ pathname: '/exercises' });
      rerender(
        <BrowserRouter>
          <AppShell><div>New Content</div></AppShell>
        </BrowserRouter>
      );
      
      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-label', 'Loading');
      expect(screen.getByText('Loading page content...')).toBeInTheDocument();
    });
  });

  describe('Skeleton Loader', () => {
    it('shows proper skeleton structure', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });
      const { rerender } = renderAppShell();
      
      // Trigger route change
      mockUseLocation.mockReturnValue({ pathname: '/exercises' });
      rerender(
        <BrowserRouter>
          <AppShell><div>New Content</div></AppShell>
        </BrowserRouter>
      );
      
      // Check skeleton elements
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Should have header skeleton
      const skeletonElements = document.querySelectorAll('.bg-gray-200, .bg-gray-700');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });
});
