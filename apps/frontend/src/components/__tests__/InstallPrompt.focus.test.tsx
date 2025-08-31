import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstallPrompt from '../InstallPrompt';

// Mocks
vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(() => ({
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
  })),
}));

vi.mock('../../utils/platformDetection', () => ({
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
  getOSName: vi.fn(() => 'Unknown'),
}));

describe('InstallPrompt focus management', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('does not steal focus on touch devices', () => {
    // Simulate touch device
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
      configurable: true,
    });

    // Render and advance timers to after animation
    render(<InstallPrompt />);
    vi.runAllTimers();

    // The install button exists but should not be the active element
    const installBtn = screen.getByRole('button', { name: /install|how to install/i });
    expect(installBtn).toBeInTheDocument();
    expect(document.activeElement).not.toBe(installBtn);
  });

  it('does not steal focus when a select is active', () => {
    // Reset to non-touch
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });

    // Insert a select and focus it
    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();
    expect(document.activeElement).toBe(select);

    render(<InstallPrompt />);
    vi.runAllTimers();

    const installBtn = screen.getByRole('button', { name: /install|how to install/i });
    expect(installBtn).toBeInTheDocument();
    // Focus should remain on the select
    expect(document.activeElement).toBe(select);

    // Cleanup
    select.remove();
  });
});
