import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UpdateErrorRecoveryModal } from '../UpdateErrorRecoveryModal';
import type {
  UpdateError,
  UpdateRecoveryState,
  RecoveryAction
} from '../../types';
import { updateService } from '../../services/updateService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: any) => {
      const translations: Record<string, string> = {
        'updateError.types.network': 'Network Connection Error',
        'updateError.types.download': 'Download Failed',
        'updateError.types.installation': 'Installation Failed',
        'updateError.types.verification': 'Update Verification Failed',
        'updateError.types.storage': 'Storage Error',
        'updateError.types.serviceWorker': 'Service Worker Error',
        'updateError.types.timeout': 'Update Timeout',
        'updateError.types.permission': 'Permission Denied',
        'updateError.types.compatibility': 'Compatibility Error',
        'updateError.types.rollback': 'Recovery Failed',
        'updateError.types.unknown': 'Unknown Error',
        'updateError.whatHappened': 'What happened?',
        'updateError.suggestions': 'Suggestions:',
        'updateError.recoveryActions': 'Recovery Options',
        'updateError.rollbackAvailable': 'Rollback Available',
        'updateError.rollbackDescription': 'You can restore the previous version ({{version}}) if the recovery actions don\'t work.',
        'updateError.technicalDetails': 'Technical Details',
        'updateError.needHelp': 'Need help? Contact support with the technical details above.',
        'updateError.close': 'Close',
        'updateError.confirmAction': 'Are you sure you want to {{description}}? This action cannot be undone.',
        'updateError.executing': 'Executing...',
        'updateError.completed': 'Completed',
        'updateError.actionSuccess': 'Action completed successfully',
        'updateError.actionFailed': 'Action failed: {{error}}',
        'updateError.severity.Critical': 'Severity: Critical',
        'updateError.severity.High': 'Severity: High',
        'updateError.severity.Medium': 'Severity: Medium',
        'updateError.severity.Low': 'Severity: Low'
      };

      if (options && typeof options === 'object') {
        let result = translations[key] || fallback || key;
        Object.keys(options).forEach(placeholder => {
          result = result.replace(`{{${placeholder}}}`, options[placeholder]);
        });
        return result;
      }

      return translations[key] || fallback || key;
    }
  })
}));

// Mock updateService
vi.mock('../../services/updateService', () => ({
  updateService: {
    executeRecoveryAction: vi.fn()
  }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

describe('UpdateErrorRecoveryModal', () => {
  const mockNetworkError: UpdateError = {
    type: 'network_error',
    severity: 'low',
    message: 'Unable to connect to update servers. Please check your internet connection.',
    timestamp: '2023-12-01T10:00:00Z',
    retryable: true,
    userActionRequired: false,
    metadata: {
      suggestedActions: [
        'Check your internet connection',
        'Try connecting to a different network',
        'Wait and try again later'
      ]
    }
  };

  const mockCriticalError: UpdateError = {
    type: 'installation_error',
    severity: 'critical',
    message: 'The update could not be installed properly. Your app may need to be restarted.',
    timestamp: '2023-12-01T10:00:00Z',
    retryable: false,
    userActionRequired: true,
    metadata: {
      updateVersion: '2.0.0',
      suggestedActions: [
        'Restart the application',
        'Clear browser cache',
        'Try updating again'
      ]
    }
  };

  const mockRetryAction: RecoveryAction = {
    id: 'retry',
    label: 'Retry Update',
    description: 'Attempt to update again (1/3)',
    action: vi.fn()
  };

  const mockRollbackAction: RecoveryAction = {
    id: 'rollback',
    label: 'Rollback to Previous Version',
    description: 'Restore previous version 1.9.0',
    action: vi.fn(),
    dangerous: true,
    confirmationRequired: true
  };

  const mockClearCacheAction: RecoveryAction = {
    id: 'clear-cache',
    label: 'Clear Cache and Retry',
    description: 'Clear browser cache and attempt update again',
    action: vi.fn()
  };

  const mockRecoveryState: UpdateRecoveryState = {
    currentError: mockNetworkError,
    retryAttempts: 1,
    recoveryActions: [mockRetryAction],
    rollbackInProgress: false,
    previousVersion: '1.9.0',
    canRollback: false
  };

  const mockRecoveryStateWithRollback: UpdateRecoveryState = {
    currentError: mockCriticalError,
    retryAttempts: 3,
    recoveryActions: [mockRollbackAction, mockClearCacheAction],
    rollbackInProgress: false,
    previousVersion: '1.9.0',
    canRollback: true
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      value: vi.fn().mockReturnValue(true),
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={false}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when no error is provided', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={undefined}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and error is provided', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
    });

    it('should display error message and suggestions', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(mockNetworkError.message)).toBeInTheDocument();
      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    });

    it('should display appropriate severity styling for critical errors', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Installation Failed')).toBeInTheDocument();
      expect(screen.getByText('Severity: Critical')).toBeInTheDocument();
    });

    it('should display recovery actions when available', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Recovery Options')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry Update' })).toBeInTheDocument();
      expect(screen.getByText('Attempt to update again (1/3)')).toBeInTheDocument();
    });

    it('should display rollback information when available', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Rollback Available')).toBeInTheDocument();
      expect(screen.getByText(/You can restore the previous version \(1\.9\.0\)/)).toBeInTheDocument();
    });

    it('should display technical details in expandable section', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const detailsButton = screen.getByText('Technical Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('network_error')).toBeInTheDocument();
      expect(screen.getByText('Severity:')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = vi.fn();

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when footer close button is clicked', () => {
      const mockOnClose = vi.fn();

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={mockOnClose}
        />
      );

      const footerCloseButton = screen.getByTestId('error-recovery-close-footer-button');
      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should execute recovery action when button is clicked', async () => {
      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockResolvedValueOnce();

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');
      fireEvent.click(retryButton);

      expect(mockExecuteRecoveryAction).toHaveBeenCalledWith('retry');

      await waitFor(() => {
        expect(screen.getByText('Action completed successfully')).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog for dangerous actions', async () => {
      const mockConfirm = vi.mocked(window.confirm);
      mockConfirm.mockReturnValueOnce(false);

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      const rollbackButton = screen.getByTestId('recovery-action-rollback');
      fireEvent.click(rollbackButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to restore previous version 1.9.0? This action cannot be undone.'
      );

      // Should not execute if user cancels
      expect(updateService.executeRecoveryAction).not.toHaveBeenCalled();
    });

    it('should execute dangerous action after confirmation', async () => {
      const mockConfirm = vi.mocked(window.confirm);
      mockConfirm.mockReturnValueOnce(true);

      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockResolvedValueOnce();

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      const rollbackButton = screen.getByTestId('recovery-action-rollback');
      fireEvent.click(rollbackButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockExecuteRecoveryAction).toHaveBeenCalledWith('rollback');
    });

    it('should display loading state while executing action', async () => {
      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');
      fireEvent.click(retryButton);

      expect(screen.getByText('Executing...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });

    it('should handle recovery action failures', async () => {
      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockRejectedValueOnce(new Error('Recovery failed'));

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Action failed: Recovery failed')).toBeInTheDocument();
      });
    });

    it('should call onRecoveryComplete after successful action', async () => {
      const mockOnRecoveryComplete = vi.fn();
      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockResolvedValueOnce();

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
          onRecoveryComplete={mockOnRecoveryComplete}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Action completed successfully')).toBeInTheDocument();
      });

      // The onRecoveryComplete should be called after the success message is shown
      // We'll wait a bit longer to ensure the timeout has a chance to execute
      await waitFor(() => {
        expect(mockOnRecoveryComplete).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('should prevent multiple concurrent action executions', async () => {
      const mockExecuteRecoveryAction = vi.mocked(updateService.executeRecoveryAction);
      mockExecuteRecoveryAction.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');

      // Click multiple times quickly
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // Should only be called once
      expect(mockExecuteRecoveryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Type Handling', () => {
    const errorTypes = [
      { type: 'network_error', title: 'Network Connection Error' },
      { type: 'download_error', title: 'Download Failed' },
      { type: 'installation_error', title: 'Installation Failed' },
      { type: 'verification_error', title: 'Update Verification Failed' },
      { type: 'storage_error', title: 'Storage Error' },
      { type: 'service_worker_error', title: 'Service Worker Error' },
      { type: 'timeout_error', title: 'Update Timeout' },
      { type: 'permission_error', title: 'Permission Denied' },
      { type: 'compatibility_error', title: 'Compatibility Error' },
      { type: 'rollback_error', title: 'Recovery Failed' },
      { type: 'unknown_error', title: 'Unknown Error' }
    ] as const;

    errorTypes.forEach(({ type, title }) => {
      it(`should display correct title for ${type}`, () => {
        const error: UpdateError = {
          ...mockNetworkError,
          type: type as any
        };

        render(
          <UpdateErrorRecoveryModal
            isOpen={true}
            error={error}
            recoveryState={mockRecoveryState}
            onClose={vi.fn()}
          />
        );

        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });
  });

  describe('Severity Styling', () => {
    const severityConfigs = [
      { severity: 'critical', expectedIcon: '🚨' },
      { severity: 'high', expectedIcon: '⚠️' },
      { severity: 'medium', expectedIcon: '⚡' },
      { severity: 'low', expectedIcon: 'ℹ️' }
    ] as const;

    severityConfigs.forEach(({ severity, expectedIcon }) => {
      it(`should display correct styling for ${severity} severity`, () => {
        const error: UpdateError = {
          ...mockNetworkError,
          severity: severity as any
        };

        render(
          <UpdateErrorRecoveryModal
            isOpen={true}
            error={error}
            recoveryState={mockRecoveryState}
            onClose={vi.fn()}
          />
        );

        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
        expect(screen.getByText(`Severity: ${severity.charAt(0).toUpperCase() + severity.slice(1)}`)).toBeInTheDocument();
      });
    });
  });

  describe('Recovery Action Styling', () => {
    it('should apply correct styling for dangerous actions', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      const rollbackButton = screen.getByTestId('recovery-action-rollback');
      expect(rollbackButton).toHaveClass('bg-red-600');
    });

    it('should apply correct styling for retry actions', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const retryButton = screen.getByTestId('recovery-action-retry');
      expect(retryButton).toHaveClass('bg-blue-600');
    });

    it('should apply default styling for other actions', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockCriticalError}
          recoveryState={mockRecoveryStateWithRollback}
          onClose={vi.fn()}
        />
      );

      const clearCacheButton = screen.getByTestId('recovery-action-clear-cache');
      expect(clearCacheButton).toHaveClass('bg-gray-600');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'error-recovery-title');
    });

    it('should have accessible button labels', () => {
      render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry Update' })).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should reset state when modal is closed and reopened', () => {
      const { rerender } = render(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      // Execute an action to create some state
      const retryButton = screen.getByTestId('recovery-action-retry');
      fireEvent.click(retryButton);

      // Close modal
      rerender(
        <UpdateErrorRecoveryModal
          isOpen={false}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      // Reopen modal
      rerender(
        <UpdateErrorRecoveryModal
          isOpen={true}
          error={mockNetworkError}
          recoveryState={mockRecoveryState}
          onClose={vi.fn()}
        />
      );

      // State should be reset
      expect(screen.queryByText('Executing...')).not.toBeInTheDocument();
      expect(screen.queryByText('Action completed successfully')).not.toBeInTheDocument();
    });
  });
});