import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from '../AppShell';

// Mock the hooks
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
    isAvailable: false,
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
    showOnboarding: false,
    completeOnboarding: vi.fn(),
    skipOnboarding: vi.fn(),
  })),
}));

vi.mock('../../hooks/useOfflineStatus', () => ({
  useOfflineStatus: vi.fn(() => ({
    isOffline: false,
    isOnline: true,
    hasBeenOffline: false,
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(() => ({ pathname: '/' })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// Mock components
vi.mock('../Navigation', () => ({
  default: () => <nav data-testid="navigation">Navigation</nav>,
}));

vi.mock('../OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner">Offline Banner</div>,
}));

vi.mock('../InstallPrompt', () => ({
  default: () => <div data-testid="install-prompt">Install Prompt</div>,
}));

vi.mock('../OnboardingFlow', () => ({
  default: ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => (
    <div data-testid="onboarding-flow">
      <button onClick={onComplete}>Complete</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

describe('AppShell Component', () => {
  const renderAppShell = (children = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <AppShell>{children}</AppShell>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Children Rendering', () => {
    it('renders children content in main section', () => {
      renderAppShell(<div data-testid="custom-content">Custom Content</div>);
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('has proper main content structure', () => {
      renderAppShell();
      
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveAttribute('aria-label', 'Main content');
    });
  });
});
