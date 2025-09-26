import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePreferencesPanel } from '../UpdatePreferencesPanel';
import type { UpdatePreferences, UpdateMode } from '../../types';
import { updateService } from '../../services/updateService';

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
    getUserPreferences: vi.fn(),
    setUserPreferences: vi.fn(),
    getConnectionInfo: vi.fn()
  }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('UpdatePreferencesPanel', () => {
  const defaultPreferences: UpdatePreferences = {
    updateMode: 'notify',
    allowMeteredUpdates: false,
    showChangelog: true
  };

  const mockConnectionInfo = {
    isMetered: false,
    type: 'wifi',
    effectiveType: '4g'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { updateService } = await import('../../services/updateService');
    vi.mocked(updateService.getUserPreferences).mockReturnValue(defaultPreferences);
    vi.mocked(updateService.getConnectionInfo).mockReturnValue(mockConnectionInfo);
    vi.mocked(updateService.setUserPreferences).mockResolvedValue();
  });

  describe('Component Rendering', () => {
    it('renders the update preferences panel', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('App Updates')).toBeInTheDocument();
      expect(screen.getByText('Privacy First')).toBeInTheDocument();
      expect(screen.getByText('Update Behavior')).toBeInTheDocument();
    });

    it('displays privacy notice correctly', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Update checks only send your current version number. No personal data is transmitted.')).toBeInTheDocument();
    });

    it('shows security updates note', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Critical security updates will always be applied automatically regardless of your preference.')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-test-class';
      render(<UpdatePreferencesPanel className={customClass} />);

      const panel = screen.getByText('App Updates').closest('div');
      expect(panel).toHaveClass(customClass);
    });
  });

  describe('Loading State', () => {
    it('renders content immediately', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('App Updates')).toBeInTheDocument();
      expect(screen.getByText('Privacy First')).toBeInTheDocument();
      expect(screen.getByText('Update Behavior')).toBeInTheDocument();
      // Component loads synchronously since service methods are not async in the component
    });
  });

  describe('Update Mode Selection', () => {
    it('renders all three update mode options', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByLabelText(/Automatic Updates/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notify Only/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Manual Only/)).toBeInTheDocument();
    });

    it('selects notify mode by default', () => {
      render(<UpdatePreferencesPanel />);

      const notifyRadio = screen.getByDisplayValue('notify');
      expect(notifyRadio).toBeChecked();
    });

    it('handles automatic mode selection', () => {
      render(<UpdatePreferencesPanel />);

      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledWith({
        updateMode: 'automatic'
      });
    });

    it('handles manual mode selection', () => {
      render(<UpdatePreferencesPanel />);

      const manualRadio = screen.getByDisplayValue('manual');
      fireEvent.click(manualRadio);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledWith({
        updateMode: 'manual'
      });
    });

    it('updates UI state when mode changes', () => {
      render(<UpdatePreferencesPanel />);

      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      expect(automaticRadio).toBeChecked();
      expect(screen.getByDisplayValue('notify')).not.toBeChecked();
      expect(screen.getByDisplayValue('manual')).not.toBeChecked();
    });
  });

  describe('Connection Information', () => {
    it('displays current connection status', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Current Connection:')).toBeInTheDocument();
      expect(screen.getByText('Unmetered')).toBeInTheDocument();
      expect(screen.getByText('(4g)')).toBeInTheDocument();
    });

    it('shows metered connection status', () => {
      vi.mocked(updateService.getConnectionInfo).mockReturnValue({
        ...mockConnectionInfo,
        isMetered: true,
        effectiveType: '3g'
      });

      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Metered')).toBeInTheDocument();
      expect(screen.getByText('(3g)')).toBeInTheDocument();
    });

    it('handles missing connection info gracefully', () => {
      vi.mocked(updateService.getConnectionInfo).mockReturnValue(null);

      render(<UpdatePreferencesPanel />);

      expect(screen.queryByText('Current Connection:')).not.toBeInTheDocument();
    });
  });

  describe('Metered Connection Preferences', () => {
    it('renders metered updates toggle', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Allow updates on metered connections')).toBeInTheDocument();
      expect(screen.getByText('Updates may use mobile data or count against data limits')).toBeInTheDocument();
    });

    it('shows correct initial state for metered updates', () => {
      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('handles metered updates toggle', () => {
      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      fireEvent.click(toggle);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledWith({
        allowMeteredUpdates: true
      });
    });

    it('updates toggle visual state', () => {
      vi.mocked(updateService.getUserPreferences).mockReturnValue({
        ...defaultPreferences,
        allowMeteredUpdates: true
      });

      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Changelog Preferences', () => {
    it('renders changelog toggle', () => {
      render(<UpdatePreferencesPanel />);

      expect(screen.getByText('Show what\'s new')).toBeInTheDocument();
      expect(screen.getByText('Display release notes and feature highlights after updates')).toBeInTheDocument();
    });

    it('shows correct initial state for changelog', () => {
      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Show what's new/ });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('handles changelog toggle', () => {
      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Show what's new/ });
      fireEvent.click(toggle);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledWith({
        showChangelog: false
      });
    });

    it('updates changelog toggle visual state', () => {
      vi.mocked(updateService.getUserPreferences).mockReturnValue({
        ...defaultPreferences,
        showChangelog: false
      });

      render(<UpdatePreferencesPanel />);

      const toggle = screen.getByRole('button', { name: /Show what's new/ });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Error Handling', () => {
    it('handles getUserPreferences error gracefully', () => {
      vi.mocked(updateService.getUserPreferences).mockImplementation(() => {
        throw new Error('Failed to get preferences');
      });

      render(<UpdatePreferencesPanel />);

      // Component should still render with defaults
      expect(screen.getByText('App Updates')).toBeInTheDocument();
    });

    it('handles setUserPreferences error gracefully', () => {
      vi.mocked(updateService.setUserPreferences).mockImplementation(() => {
        throw new Error('Failed to set preferences');
      });

      render(<UpdatePreferencesPanel />);

      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      // Error should be logged but component should continue working
      expect(screen.getByText('App Updates')).toBeInTheDocument();
    });

    it('handles connection info error gracefully', () => {
      updateService.getConnectionInfo.mockImplementation(() => {
        throw new Error('Failed to get connection info');
      });

      render(<UpdatePreferencesPanel />);

      // Should not show connection info section
      expect(screen.queryByText('Current Connection:')).not.toBeInTheDocument();
      // But other sections should still work
      expect(screen.getByText('App Updates')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for radio buttons', () => {
      render(<UpdatePreferencesPanel />);

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'updateMode');
      });
    });

    it('has proper labels for toggle buttons', () => {
      render(<UpdatePreferencesPanel />);

      const meteredToggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      const changelogToggle = screen.getByRole('button', { name: /Show what's new/ });

      expect(meteredToggle).toHaveAttribute('aria-pressed');
      expect(changelogToggle).toHaveAttribute('aria-pressed');
    });

    it('has proper form structure', () => {
      render(<UpdatePreferencesPanel />);

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 2, name: /App Updates/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /Update Behavior/ })).toBeInTheDocument();
    });
  });

  describe('Integration with updateService', () => {
    it('loads preferences on mount', () => {
      render(<UpdatePreferencesPanel />);

      expect(updateService.getUserPreferences).toHaveBeenCalled();
      expect(updateService.getConnectionInfo).toHaveBeenCalled();
    });

    it('persists partial preference updates', () => {
      render(<UpdatePreferencesPanel />);

      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledWith({
        updateMode: 'automatic'
      });
      expect(vi.mocked(updateService.setUserPreferences)).not.toHaveBeenCalledWith(
        expect.objectContaining({
          allowMeteredUpdates: expect.anything(),
          showChangelog: expect.anything()
        })
      );
    });

    it('maintains state consistency across updates', () => {
      render(<UpdatePreferencesPanel />);

      // Change multiple settings
      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      const meteredToggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      fireEvent.click(meteredToggle);

      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenNthCalledWith(1, {
        updateMode: 'automatic'
      });
      expect(vi.mocked(updateService.setUserPreferences)).toHaveBeenNthCalledWith(2, {
        allowMeteredUpdates: true
      });
    });
  });

  describe('Visual Indicators', () => {
    it('shows visual selection indicator for selected update mode', () => {
      render(<UpdatePreferencesPanel />);

      const notifyOption = screen.getByDisplayValue('notify').closest('label');
      expect(notifyOption?.querySelector('.border-blue-500')).toBeInTheDocument();
    });

    it('updates visual indicators when selection changes', () => {
      render(<UpdatePreferencesPanel />);

      const automaticRadio = screen.getByDisplayValue('automatic');
      fireEvent.click(automaticRadio);

      const automaticOption = automaticRadio.closest('label');
      expect(automaticOption?.querySelector('.border-blue-500')).toBeInTheDocument();
    });

    it('shows correct toggle switch positions', () => {
      vi.mocked(updateService.getUserPreferences).mockReturnValue({
        updateMode: 'notify',
        allowMeteredUpdates: true,
        showChangelog: false
      });

      render(<UpdatePreferencesPanel />);

      const meteredToggle = screen.getByRole('button', { name: /Allow updates on metered connections/ });
      const changelogToggle = screen.getByRole('button', { name: /Show what's new/ });

      expect(meteredToggle).toHaveClass('bg-blue-600');
      expect(changelogToggle).toHaveClass('bg-gray-200', 'dark:bg-gray-600');
    });
  });
});