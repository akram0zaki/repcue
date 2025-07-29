import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { consentService } from '../../services/consentService';
import { storageService } from '../../services/storageService';
import type { AppSettings } from '../../types';

// Mock the services
vi.mock('../../services/consentService', () => ({
  consentService: {
    hasConsent: vi.fn(),
    setConsent: vi.fn(),
    getConsentData: vi.fn(),
    getConsentStatus: vi.fn(),
    resetConsent: vi.fn()
  }
}));

vi.mock('../../services/storageService', () => ({
  storageService: {
    exportAllData: vi.fn(),
    clearAllData: vi.fn()
  }
}));

const mockAppSettings: AppSettings = {
  intervalDuration: 30,
  soundEnabled: true,
  vibrationEnabled: true,
  beepVolume: 0.5,
  darkMode: false,
  autoSave: true,
  lastSelectedExerciseId: null,
  preTimerCountdown: 3,
  defaultRestTime: 60
};

const mockOnUpdateSettings = vi.fn();

const renderSettingsPage = (props = {}) => {
  const defaultProps = {
    appSettings: mockAppSettings,
    onUpdateSettings: mockOnUpdateSettings,
    ...props
  };

  return render(<SettingsPage {...defaultProps} />);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    vi.mocked(consentService.getConsentStatus).mockReturnValue({
      hasConsent: true,
      version: 2,
      isLatestVersion: true,
      data: {
        version: 2,
        timestamp: new Date().toISOString(),
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false,
        dataRetentionDays: 365
      },
      requiresUpdate: false
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders audio settings section', () => {
    renderSettingsPage();
    
    expect(screen.getByText('🔊 Audio Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/enable sound/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beep volume/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enable vibration/i)).toBeInTheDocument();
  });

  it('renders timer settings section', () => {
    renderSettingsPage();
    
    expect(screen.getByText('⏱️ Timer Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/beep interval/i)).toBeInTheDocument();
  });

  it('renders appearance settings section', () => {
    renderSettingsPage();
    
    expect(screen.getByText('🎨 Appearance')).toBeInTheDocument();
    expect(screen.getByLabelText(/dark mode/i)).toBeInTheDocument();
  });

  it('renders data settings section', () => {
    renderSettingsPage();
    
    expect(screen.getByText('💾 Data')).toBeInTheDocument();
    expect(screen.getByLabelText(/auto save/i)).toBeInTheDocument();
  });

  it('displays current settings values correctly', () => {
    renderSettingsPage();
    
    const intervalDurationSelect = screen.getByLabelText(/beep interval/i);
    expect(intervalDurationSelect).toHaveValue('30');

    const beepVolumeSlider = screen.getByLabelText(/beep volume/i);
    expect(beepVolumeSlider).toHaveValue('0.5');

    // Check that volume percentage is displayed
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onUpdateSettings when interval duration is changed', async () => {
    renderSettingsPage();
    
    const intervalDurationSelect = screen.getByLabelText(/beep interval/i);
    fireEvent.change(intervalDurationSelect, { target: { value: '60' } });

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        intervalDuration: 60
      });
    });
  });

  it('calls onUpdateSettings when sound enabled is toggled', async () => {
    renderSettingsPage();
    
    const soundEnabledButton = screen.getByLabelText(/enable sound/i);
    fireEvent.click(soundEnabledButton);

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        soundEnabled: false
      });
    });
  });

  it('calls onUpdateSettings when vibration enabled is toggled', async () => {
    renderSettingsPage();
    
    const vibrationEnabledButton = screen.getByLabelText(/enable vibration/i);
    fireEvent.click(vibrationEnabledButton);

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        vibrationEnabled: false
      });
    });
  });

  it('calls onUpdateSettings when beep volume is changed', async () => {
    renderSettingsPage();
    
    const beepVolumeSlider = screen.getByLabelText(/beep volume/i);
    fireEvent.change(beepVolumeSlider, { target: { value: '0.75' } });

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        beepVolume: 0.75
      });
    });
  });

  it('calls onUpdateSettings when dark mode is toggled', async () => {
    renderSettingsPage();
    
    const darkModeButton = screen.getByLabelText(/dark mode/i);
    fireEvent.click(darkModeButton);

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        darkMode: true
      });
    });
  });

  it('calls onUpdateSettings when auto-save is toggled', async () => {
    renderSettingsPage();
    
    const autoSaveButton = screen.getByLabelText(/auto save/i);
    fireEvent.click(autoSaveButton);

    await waitFor(() => {
      expect(mockOnUpdateSettings).toHaveBeenCalledWith({
        autoSave: false
      });
    });
  });

  it('exports data when export button is clicked', async () => {
    const mockExportData = {
      exercises: [],
      activityLogs: [],
      userPreferences: null,
      appSettings: mockAppSettings,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    vi.mocked(storageService.exportAllData).mockResolvedValue(mockExportData);

    // Mock URL.createObjectURL and revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock link element click
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: mockClick,
          style: {}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalCreateElement.call(document, tagName as any);
    });

    renderSettingsPage();
    
    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(storageService.exportAllData).toHaveBeenCalled();
    });

    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  it('clears data when clear data button is clicked and confirmed', async () => {
    vi.mocked(storageService.clearAllData).mockResolvedValue();

    renderSettingsPage();
    
    const clearDataButton = screen.getByRole('button', { name: /clear all data & reset app/i });
    fireEvent.click(clearDataButton);

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('Clear All Data & Reset App')).toHaveLength(2); // Button + dialog title
    });

    // Click confirm in the toast
    const confirmButton = screen.getByText('Clear All Data');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(storageService.clearAllData).toHaveBeenCalled();
      expect(consentService.resetConsent).toHaveBeenCalled();
    });
  });

  it('shows data section with auto save setting', () => {
    renderSettingsPage();
    
    expect(screen.getByText(/💾 data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto save/i)).toBeInTheDocument();
  });

  it('shows data storage status when consent is given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    renderSettingsPage();
    
    expect(screen.getByText(/data storage:/i)).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows data storage status when consent is not given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(false);
    renderSettingsPage();
    
    expect(screen.getByText(/data storage:/i)).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('enables export data button when consent is given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    renderSettingsPage();
    
    const exportButton = screen.getByRole('button', { name: /export data/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('disables export data button when consent is not given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(false);
    renderSettingsPage();
    
    const exportButton = screen.getByRole('button', { name: /export data/i });
    expect(exportButton).toBeDisabled();
  });

  it('enables clear data button when consent is given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    renderSettingsPage();
    
    const clearButton = screen.getByRole('button', { name: /clear all data & reset app/i });
    expect(clearButton).not.toBeDisabled();
  });

  it('disables clear data button when consent is not given', () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(false);
    renderSettingsPage();
    
    const clearButton = screen.getByRole('button', { name: /clear all data & reset app/i });
    expect(clearButton).toBeDisabled();
  });

  it('handles export data success', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    const mockExportData = {
      exercises: [],
      activityLogs: [],
      userPreferences: null,
      appSettings: null,
      exportDate: '2025-01-01',
      version: '1.0.0'
    };
    vi.mocked(storageService.exportAllData).mockResolvedValue(mockExportData);
    
    renderSettingsPage();
    
    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(storageService.exportAllData).toHaveBeenCalled();
    });
  });

  it('handles export data error gracefully', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(storageService.exportAllData).mockRejectedValue(new Error('Export failed'));

    renderSettingsPage();
    
    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('does not clear data when clear data is cancelled', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);

    renderSettingsPage();
    
    const clearButton = screen.getByRole('button', { name: /clear all data & reset app/i });
    fireEvent.click(clearButton);

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click cancel in the toast
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(storageService.clearAllData).not.toHaveBeenCalled();
    });
  });

  it('handles clear data error gracefully', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(storageService.clearAllData).mockRejectedValue(new Error('Clear failed'));

    renderSettingsPage();
    
    const clearButton = screen.getByRole('button', { name: /clear all data & reset app/i });
    fireEvent.click(clearButton);

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click confirm in the toast
    const confirmButton = screen.getByText('Clear All Data');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('toggles auto save when clicked', () => {
    const mockOnUpdateSettings = vi.fn();
    renderSettingsPage({ onUpdateSettings: mockOnUpdateSettings });
    
    const autoSaveToggle = screen.getByLabelText(/auto save/i);
    fireEvent.click(autoSaveToggle);
    
    expect(mockOnUpdateSettings).toHaveBeenCalledWith({ autoSave: false });
  });

  it('shows data section properly formatted', () => {
    renderSettingsPage();
    
    expect(screen.getByText(/💾 data/i)).toBeInTheDocument();
  });

  it('displays correct interval duration in select', () => {
    const settingsWithLongInterval = { ...mockAppSettings, intervalDuration: 60 };
    renderSettingsPage({ appSettings: settingsWithLongInterval });
    
    const select = screen.getByLabelText(/beep interval/i);
    expect(select).toHaveValue('60');
  });

  it('displays correct volume percentage', () => {
    renderSettingsPage();
    
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
