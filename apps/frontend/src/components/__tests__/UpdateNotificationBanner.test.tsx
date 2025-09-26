import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateNotificationBanner } from '../UpdateNotificationBanner';
import type { UpdateInfo } from '../../types';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string, options?: any) => {
      if (options) {
        return defaultValue.replace(/\{\{(\w+)\}\}/g, (match, param) => options[param] || match);
      }
      return defaultValue;
    }
  })
}));

// Mock updateService
vi.mock('../../services/updateService', () => ({
  updateService: {
    checkMeteredConnectionPolicy: vi.fn(),
    getUpdatePolicyMessage: vi.fn(),
    isOnMeteredConnection: vi.fn(),
    getMeteredConnectionWarning: vi.fn()
  }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

describe('UpdateNotificationBanner', () => {
  const mockOnApplyUpdate = vi.fn();
  const mockOnDismiss = vi.fn();
  const mockOnShowChangelog = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked updateService
    const { updateService } = await import('../../services/updateService');
    vi.mocked(updateService.checkMeteredConnectionPolicy).mockResolvedValue({
      shouldProceed: true,
      needsUserConfirmation: false,
      warningMessage: ''
    });
    vi.mocked(updateService.getUpdatePolicyMessage).mockReturnValue('Test update message');
  });

  const createMockUpdateInfo = (policy: 'force' | 'critical' | 'optional' = 'optional'): UpdateInfo => ({
    version: '1.2.3',
    policy,
    releaseDate: '2023-01-01T00:00:00Z',
    message: 'Test update message',
    changelog: 'Test changelog'
  });

  it('renders optional update notification correctly', () => {
    const updateInfo = createMockUpdateInfo('optional');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    expect(screen.getByTestId('update-notification-banner')).toBeInTheDocument();
    expect(screen.getByText('New Version Available')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.2.3')).toBeInTheDocument();
    expect(screen.getByTestId('update-apply-button')).toBeInTheDocument();
    expect(screen.getByTestId('update-dismiss-button')).toBeInTheDocument();
  });

  it('renders critical update notification correctly', () => {
    const updateInfo = createMockUpdateInfo('critical');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    expect(screen.getByText('Important Update Available')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders force update notification correctly', () => {
    const updateInfo = createMockUpdateInfo('force');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    expect(screen.getByText('Security Update Required')).toBeInTheDocument();
    expect(screen.getByText('🔒')).toBeInTheDocument();
    expect(screen.queryByTestId('update-dismiss-button')).not.toBeInTheDocument();
  });

  it('handles apply update click', async () => {
    const updateInfo = createMockUpdateInfo('optional');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    const applyButton = screen.getByTestId('update-apply-button');
    fireEvent.click(applyButton);

    expect(mockOnApplyUpdate).toHaveBeenCalled();
  });

  it('handles dismiss click for dismissible updates', () => {
    const updateInfo = createMockUpdateInfo('optional');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    const dismissButton = screen.getByTestId('update-dismiss-button');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('handles changelog toggle', () => {
    const updateInfo = createMockUpdateInfo('optional');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    const changelogButton = screen.getByText('See what\'s new');
    fireEvent.click(changelogButton);

    expect(mockOnShowChangelog).toHaveBeenCalled();
  });

  it('displays metered connection warning when detected', async () => {
    const { updateService } = await import('../../services/updateService');
    vi.mocked(updateService.checkMeteredConnectionPolicy).mockResolvedValue({
      shouldProceed: false,
      needsUserConfirmation: true,
      warningMessage: 'You are on a metered connection'
    });

    const updateInfo = createMockUpdateInfo('optional');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    // Wait for async effect to complete
    await screen.findByText('Metered Connection Detected');
    expect(screen.getByText('You are on a metered connection')).toBeInTheDocument();
  });

  it('shows correct estimated size based on policy', () => {
    const forceUpdate = createMockUpdateInfo('force');
    const { rerender } = render(
      <UpdateNotificationBanner
        updateInfo={forceUpdate}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    expect(screen.getByText('Est. 5MB')).toBeInTheDocument();

    const optionalUpdate = createMockUpdateInfo('optional');
    rerender(
      <UpdateNotificationBanner
        updateInfo={optionalUpdate}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    expect(screen.getByText('Est. 15MB')).toBeInTheDocument();
  });

  it('uses correct ARIA attributes for accessibility', () => {
    const updateInfo = createMockUpdateInfo('force');

    render(
      <UpdateNotificationBanner
        updateInfo={updateInfo}
        onApplyUpdate={mockOnApplyUpdate}
        onDismiss={mockOnDismiss}
        onShowChangelog={mockOnShowChangelog}
      />
    );

    const banner = screen.getByTestId('update-notification-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });
});