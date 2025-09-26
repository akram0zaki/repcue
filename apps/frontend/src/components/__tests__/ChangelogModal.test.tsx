import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangelogModal } from '../ChangelogModal';
import type { UpdateInfo, VersionChangelog } from '../../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: any) => {
      const translations: Record<string, string> = {
        'changelog.title': 'What\'s New',
        'changelog.closeButton': 'Close changelog',
        'changelog.close': 'Close',
        'changelog.done': 'Done',
        'changelog.empty.title': 'No Detailed Changes Available',
        'changelog.empty.message': 'This update includes various improvements and bug fixes.',
        'changelog.privacy.title': 'Privacy Changes Detected',
        'changelog.privacy.message': 'This update includes changes to how we handle your data.',
        'changelog.privacy.acknowledge': 'I understand and acknowledge the privacy changes',
        'changelog.categories.newFeatures': 'New Features',
        'changelog.categories.improvements': 'Improvements',
        'changelog.categories.bugFixes': 'Bug Fixes',
        'changelog.categories.securityUpdates': 'Security Updates',
        'update.version': 'Version: {{version}}',
        'update.action': 'Update',
        'update.force.action': 'Update Now'
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

describe('ChangelogModal', () => {
  const mockStructuredChangelog: VersionChangelog = {
    new_features: [
      'Added dark mode support',
      'New workout scheduling feature'
    ],
    improvements: [
      'Better performance on mobile devices',
      'Enhanced accessibility features'
    ],
    bug_fixes: [
      'Fixed timer sync issues',
      'Resolved exercise data export bug'
    ],
    security_updates: [
      'Enhanced user authentication',
      'Improved data privacy protection'
    ]
  };

  const mockUpdateInfo: UpdateInfo = {
    version: '2.1.0',
    policy: 'optional',
    changelog: mockStructuredChangelog,
    releaseDate: '2023-12-01T10:00:00Z'
  };

  const mockStringChangelog = `
Features:
- Added dark mode support
- New workout scheduling

Improvements:
- Better performance
- Enhanced accessibility

Bug Fixes:
- Fixed timer sync issues
- Resolved export bug

Security:
- Enhanced authentication
- Improved privacy protection
  `;

  const mockStringUpdateInfo: UpdateInfo = {
    version: '2.0.5',
    policy: 'critical',
    changelog: mockStringChangelog,
    releaseDate: '2023-11-15T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('What\'s New')).toBeInTheDocument();
    });

    it('should display version information', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Version: 2.1.0')).toBeInTheDocument();
    });

    it('should display structured changelog sections', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('New Features')).toBeInTheDocument();
      expect(screen.getByText('Improvements')).toBeInTheDocument();
      expect(screen.getByText('Bug Fixes')).toBeInTheDocument();
      expect(screen.getByText('Security Updates')).toBeInTheDocument();

      expect(screen.getByText('Added dark mode support')).toBeInTheDocument();
      expect(screen.getByText('Better performance on mobile devices')).toBeInTheDocument();
    });

    it('should parse and display string-based changelog', () => {
      render(
        <ChangelogModal
          updateInfo={mockStringUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Added dark mode support')).toBeInTheDocument();
      expect(screen.getByText('Enhanced authentication')).toBeInTheDocument();
    });

    it('should display empty state when no changelog is provided', () => {
      const emptyUpdateInfo: UpdateInfo = {
        version: '1.0.0',
        policy: 'optional',
        releaseDate: '2023-12-01T10:00:00Z'
      };

      render(
        <ChangelogModal
          updateInfo={emptyUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('No Detailed Changes Available')).toBeInTheDocument();
    });
  });

  describe('Privacy Changes Detection', () => {
    it('should detect privacy changes in security updates', () => {
      const privacyUpdateInfo: UpdateInfo = {
        version: '2.0.0',
        policy: 'optional',
        changelog: {
          security_updates: ['Updated privacy policy', 'Enhanced data protection']
        },
        releaseDate: '2023-12-01T10:00:00Z'
      };

      render(
        <ChangelogModal
          updateInfo={privacyUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Privacy Changes Detected')).toBeInTheDocument();
      expect(screen.getByText(/changes to how we handle your data/)).toBeInTheDocument();
    });

    it('should require acknowledgment for privacy changes', () => {
      const privacyUpdateInfo: UpdateInfo = {
        version: '2.0.0',
        policy: 'optional',
        changelog: {
          security_updates: ['Updated privacy policy']
        },
        releaseDate: '2023-12-01T10:00:00Z'
      };

      render(
        <ChangelogModal
          updateInfo={privacyUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      const updateButton = screen.getByText('Update');

      expect(checkbox).not.toBeChecked();
      expect(updateButton).toBeDisabled();

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(updateButton).not.toBeDisabled();
    });

    it('should not show privacy acknowledgment for non-privacy changes', () => {
      const normalUpdateInfo: UpdateInfo = {
        version: '1.5.0',
        policy: 'optional',
        changelog: {
          new_features: ['New timer feature'],
          bug_fixes: ['Fixed UI bug']
        },
        releaseDate: '2023-12-01T10:00:00Z'
      };

      render(
        <ChangelogModal
          updateInfo={normalUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText('Privacy Changes Detected')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = vi.fn();

      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close changelog');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onApplyUpdate when update button is clicked', () => {
      const mockOnApplyUpdate = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={mockOnClose}
          onApplyUpdate={mockOnApplyUpdate}
        />
      );

      // Check privacy acknowledgment checkbox since mockUpdateInfo has privacy changes
      const privacyCheckbox = screen.getByTestId('privacy-acknowledgment-checkbox');
      fireEvent.click(privacyCheckbox);

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      expect(mockOnApplyUpdate).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show different button text for force updates', () => {
      const forceUpdateInfo: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'force'
      };

      render(
        <ChangelogModal
          updateInfo={forceUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      expect(screen.getByText('Update Now')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      const mockOnClose = vi.fn();

      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const modal = screen.getByRole('dialog');
      fireEvent.keyDown(modal, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update Policy Styling', () => {
    it('should apply appropriate styling for force updates', () => {
      const forceUpdateInfo: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'force'
      };

      render(
        <ChangelogModal
          updateInfo={forceUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      const updateButton = screen.getByText('Update Now');
      expect(updateButton).toHaveClass('bg-red-600');
    });

    it('should apply appropriate styling for critical updates', () => {
      const criticalUpdateInfo: UpdateInfo = {
        ...mockUpdateInfo,
        policy: 'critical'
      };

      render(
        <ChangelogModal
          updateInfo={criticalUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      const updateButton = screen.getByText('Update');
      expect(updateButton).toHaveClass('bg-orange-600');
    });

    it('should apply default styling for optional updates', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      const updateButton = screen.getByText('Update');
      expect(updateButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Section Icons and Colors', () => {
    it('should display appropriate icons for each section type', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check that sections are properly rendered with icons
      const featureSection = screen.getByText('New Features').closest('div');
      const improvementSection = screen.getByText('Improvements').closest('div');
      const bugFixSection = screen.getByText('Bug Fixes').closest('div');
      const securitySection = screen.getByText('Security Updates').closest('div');

      expect(featureSection).toBeInTheDocument();
      expect(improvementSection).toBeInTheDocument();
      expect(bugFixSection).toBeInTheDocument();
      expect(securitySection).toBeInTheDocument();
    });

    it('should apply correct color schemes for different section types', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const sections = screen.getAllByRole('listitem').map(item => item.closest('div'));

      // Each section should have appropriate styling
      sections.forEach(section => {
        expect(section).toHaveClass('border');
        expect(section).toHaveClass('rounded-lg');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'changelog-title');
    });

    it('should have accessible section structure', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check that lists are properly structured
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);

      lists.forEach(list => {
        const items = within(list).getAllByRole('listitem');
        expect(items.length).toBeGreaterThan(0);
      });
    });

    it('should have proper button labeling', () => {
      render(
        <ChangelogModal
          updateInfo={mockUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
          onApplyUpdate={vi.fn()}
        />
      );

      const closeButton = screen.getByLabelText('Close changelog');
      const updateButton = screen.getByRole('button', { name: 'Update' });
      const doneButton = screen.getByRole('button', { name: 'Close' });

      expect(closeButton).toBeInTheDocument();
      expect(updateButton).toBeInTheDocument();
      expect(doneButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed changelog gracefully', () => {
      const malformedUpdateInfo: UpdateInfo = {
        version: '1.0.0',
        policy: 'optional',
        changelog: null as any, // Intentionally invalid
        releaseDate: '2023-12-01T10:00:00Z'
      };

      expect(() => {
        render(
          <ChangelogModal
            updateInfo={malformedUpdateInfo}
            isOpen={true}
            onClose={vi.fn()}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('No Detailed Changes Available')).toBeInTheDocument();
    });

    it('should handle mixed structured and string changelog', () => {
      const mixedUpdateInfo: UpdateInfo = {
        version: '1.0.0',
        policy: 'optional',
        changelog: {
          new_features: ['Feature 1'],
          // Some properties missing to test robustness
        } as VersionChangelog,
        releaseDate: '2023-12-01T10:00:00Z'
      };

      render(
        <ChangelogModal
          updateInfo={mixedUpdateInfo}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('New Features')).toBeInTheDocument();
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
    });
  });
});