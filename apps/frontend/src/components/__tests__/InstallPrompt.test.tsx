/**
 * Unit Tests for InstallPrompt Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock platform detection utilities
vi.mock('../../utils/platformDetection', () => ({
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
  getOSName: vi.fn(() => 'Unknown'),
  getBrowserName: vi.fn(() => 'Chrome'),
}));

// Mock useInstallPrompt hook
vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
}));

// Import after mocks
import InstallPrompt from '../InstallPrompt';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { isIOS, isAndroid, getOSName, getBrowserName } from '../../utils/platformDetection';

// Get mocked functions
const mockUseInstallPrompt = vi.mocked(useInstallPrompt);
const mockIsIOS = vi.mocked(isIOS);
const mockIsAndroid = vi.mocked(isAndroid);
const mockGetOSName = vi.mocked(getOSName);
const mockGetBrowserName = vi.mocked(getBrowserName);

describe('InstallPrompt Component', () => {
  // Default mock return values
  const defaultHookReturn = {
    isAvailable: true,
    canShowPrompt: true,
    isInstalling: false,
    isInstalled: false,
    installError: null,
    promptInstall: vi.fn().mockResolvedValue(true),
    dismissPrompt: vi.fn(),
    resetError: vi.fn(),
    getInstallAnalytics: vi.fn().mockReturnValue([]),
    clearAnalytics: vi.fn(),
    installMethod: 'native_prompt' as const,
    needsManualInstructions: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInstallPrompt.mockReturnValue(defaultHookReturn);
    mockIsIOS.mockReturnValue(false);
    mockIsAndroid.mockReturnValue(false);
    mockGetOSName.mockReturnValue('Unknown');
    mockGetBrowserName.mockReturnValue('Chrome');
  });

  describe('Basic Rendering', () => {
    it('renders the install prompt when available', () => {
      render(<InstallPrompt />);
      
      expect(screen.getByText(/Install RepCue/)).toBeInTheDocument();
    });

    it('does not render when not available', () => {
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isAvailable: false,
        canShowPrompt: false,
      });
      
      render(<InstallPrompt />);
      
      expect(screen.queryByText(/Install RepCue/)).not.toBeInTheDocument();
    });
  });

  describe('Platform-Specific Rendering', () => {
    it('renders iOS-specific content when on iOS', () => {
      mockIsIOS.mockReturnValue(true);
      mockGetOSName.mockReturnValue('iOS');
      mockGetBrowserName.mockReturnValue('Safari');
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        needsManualInstructions: true,
        installMethod: 'manual_instructions',
      });
      
      render(<InstallPrompt />);
      
      expect(screen.getByText(/Install RepCue/)).toBeInTheDocument();
    });
  });

  describe('Installation Flow', () => {
    it('calls promptInstall when install button is clicked', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue(true);
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        promptInstall: mockPromptInstall,
      });
      
      render(<InstallPrompt />);
      
      const installButton = screen.getByText('Install');
      fireEvent.click(installButton);
      
      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
    });

    it('shows installing state during installation', () => {
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        isInstalling: true,
      });
      
      render(<InstallPrompt />);
      
      expect(screen.getByText(/installing/i)).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('calls dismissPrompt when dismiss button is clicked', () => {
      const mockDismissPrompt = vi.fn();
      mockUseInstallPrompt.mockReturnValue({
        ...defaultHookReturn,
        dismissPrompt: mockDismissPrompt,
      });
      
      render(<InstallPrompt />);
      
      const dismissButton = screen.getByLabelText(/dismiss install banner/i);
      fireEvent.click(dismissButton);
      
      expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
    });
  });
});
