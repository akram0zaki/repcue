import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InstallPrompt from '../InstallPrompt';
import { pwaService } from '../../services/pwaService';

// Mock the PWA service
vi.mock('../../services/pwaService', () => ({
  pwaService: {
    addUpdateListener: vi.fn(() => vi.fn()), // Returns cleanup function
    promptInstall: vi.fn(),
    updateServiceWorker: vi.fn(),
  },
}));

// Mock platform detection
vi.mock('../../utils/platformDetection', () => ({
  usePlatform: () => ({
    isIOS: false,
    isAndroid: false,
    isDesktop: true,
    isStandalone: false,
    canInstall: true,
    browser: 'chrome',
    browserVersion: '91.0.4472.124',
    orientation: 'landscape',
    displayMode: 'browser',
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
  Share: () => <span data-testid="share-icon">Share</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
}));

describe('InstallPrompt', () => {
  const defaultProps = {
    isVisible: true,
    onClose: vi.fn(),
    onInstalled: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when visible', () => {
    render(<InstallPrompt {...defaultProps} />);
    
    expect(screen.getByText('Install RepCue')).toBeInTheDocument();
    expect(screen.getByText(/Install RepCue for the best experience/)).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<InstallPrompt {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText('Install RepCue')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<InstallPrompt {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close install prompt');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls promptInstall when install button is clicked', async () => {
    const mockPromptInstall = vi.mocked(pwaService.promptInstall);
    mockPromptInstall.mockResolvedValue(true);
    
    render(<InstallPrompt {...defaultProps} />);
    
    const installButton = screen.getByText('Install Now');
    fireEvent.click(installButton);
    
    expect(mockPromptInstall).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during installation', async () => {
    const mockPromptInstall = vi.mocked(pwaService.promptInstall);
    mockPromptInstall.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve(true), 100);
    }));
    
    render(<InstallPrompt {...defaultProps} />);
    
    const installButton = screen.getByText('Install Now');
    fireEvent.click(installButton);
    
    expect(screen.getByText('Installing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Installing...')).not.toBeInTheDocument();
    });
  });

  it('calls onInstalled when installation succeeds', async () => {
    const mockPromptInstall = vi.mocked(pwaService.promptInstall);
    mockPromptInstall.mockResolvedValue(true);
    const onInstalled = vi.fn();
    const onClose = vi.fn();
    
    render(<InstallPrompt {...defaultProps} onInstalled={onInstalled} onClose={onClose} />);
    
    const installButton = screen.getByText('Install Now');
    fireEvent.click(installButton);
    
    await waitFor(() => {
      expect(onInstalled).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('handles installation failure gracefully', async () => {
    const mockPromptInstall = vi.mocked(pwaService.promptInstall);
    mockPromptInstall.mockRejectedValue(new Error('Installation failed'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<InstallPrompt {...defaultProps} />);
    
    const installButton = screen.getByText('Install Now');
    fireEvent.click(installButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Installation failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('shows update prompt when update is available', () => {
    const mockAddUpdateListener = vi.mocked(pwaService.addUpdateListener);
    
    // Mock update listener to immediately call with update info
    mockAddUpdateListener.mockImplementation((callback) => {
      setTimeout(() => {
        callback({
          updateAvailable: true,
          registration: { waiting: { postMessage: vi.fn() } } as any,
        });
      }, 0);
      return vi.fn(); // cleanup function
    });
    
    render(<InstallPrompt {...defaultProps} />);
    
    // Update prompt should appear
    waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });
  });

  it('handles service worker update', async () => {
    const mockUpdateServiceWorker = vi.mocked(pwaService.updateServiceWorker);
    mockUpdateServiceWorker.mockResolvedValue();
    
    const mockAddUpdateListener = vi.mocked(pwaService.addUpdateListener);
    const mockRegistration = { waiting: { postMessage: vi.fn() } } as any;
    
    // Setup update listener
    let updateCallback: (info: any) => void;
    mockAddUpdateListener.mockImplementation((callback) => {
      updateCallback = callback;
      return vi.fn();
    });
    
    render(<InstallPrompt {...defaultProps} />);
    
    // Trigger update availability
    updateCallback!({
      updateAvailable: true,
      registration: mockRegistration,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });
    
    // Mock window.location.reload
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    
    const updateButton = screen.getByText('Update Now');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mockUpdateServiceWorker).toHaveBeenCalledWith(mockRegistration);
    });
    
    // Restore spy
    reloadSpy.mockRestore();
  });

  it('shows different content for iOS', () => {
    // Mock platform detection for iOS
    vi.resetModules();
    vi.doMock('../../utils/platformDetection', () => ({
      usePlatform: () => ({
        isIOS: true,
        isAndroid: false,
        isDesktop: false,
        isStandalone: false,
        canInstall: true,
        browser: 'safari',
        browserVersion: '14.0',
        orientation: 'portrait',
        displayMode: 'browser',
      }),
    }));
    
    render(<InstallPrompt {...defaultProps} />);
    
    expect(screen.getByText('Install RepCue on iOS')).toBeInTheDocument();
  });

  it('shows standalone mode message when already installed', () => {
    // Mock platform detection for standalone
    vi.resetModules();
    vi.doMock('../../utils/platformDetection', () => ({
      usePlatform: () => ({
        isIOS: false,
        isAndroid: false,
        isDesktop: true,
        isStandalone: true,
        canInstall: false,
        browser: 'chrome',
        browserVersion: '91.0.4472.124',
        orientation: 'landscape',
        displayMode: 'standalone',
      }),
    }));
    
    render(<InstallPrompt {...defaultProps} />);
    
    expect(screen.getByText(/RepCue is already installed and running as an app/)).toBeInTheDocument();
  });

  it('handles dismissal of update prompt', async () => {
    const mockAddUpdateListener = vi.mocked(pwaService.addUpdateListener);
    
    let updateCallback: (info: any) => void;
    mockAddUpdateListener.mockImplementation((callback) => {
      updateCallback = callback;
      return vi.fn();
    });
    
    render(<InstallPrompt {...defaultProps} />);
    
    // Trigger update availability
    updateCallback!({
      updateAvailable: true,
      registration: { waiting: { postMessage: vi.fn() } } as any,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });
    
    const laterButton = screen.getByText('Later');
    fireEvent.click(laterButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });
  });
});
