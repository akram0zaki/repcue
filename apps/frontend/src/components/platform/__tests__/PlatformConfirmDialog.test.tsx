/**
 * Platform Confirm Dialog Tests
 * 
 * Tests for the platform-aware confirmation dialog component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlatformConfirmDialog } from '../PlatformConfirmDialog';

describe('PlatformConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders nothing when closed', () => {
      render(<PlatformConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('renders dialog when open', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays title and message', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('displays custom button text', () => {
      render(
        <PlatformConfirmDialog
          {...defaultProps}
          confirmText="Yes, delete it"
          cancelText="No, keep it"
        />
      );
      
      expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
      expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });

    it('displays default button text', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      expect(screen.getByText('OK')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Destructive variant', () => {
    it('shows warning icon when destructive', () => {
      render(<PlatformConfirmDialog {...defaultProps} destructive={true} />);
      
      // Check for the warning icon container
      const dialog = screen.getByRole('alertdialog');
      expect(dialog.querySelector('svg')).toBeInTheDocument();
    });

    it('applies destructive styling to confirm button', () => {
      render(<PlatformConfirmDialog {...defaultProps} destructive={true} />);
      
      const confirmButton = screen.getByText('OK');
      expect(confirmButton).toHaveClass('text-red-600');
    });
  });

  describe('Interactions', () => {
    it('calls onConfirm when confirm button clicked', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      fireEvent.click(screen.getByText('OK'));
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button clicked', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when ESC key pressed', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when backdrop clicked', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      // Click on the backdrop (the outer container)
      const backdrop = screen.getByRole('alertdialog').parentElement;
      fireEvent.click(backdrop!);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Alert mode (no cancel button)', () => {
    it('hides cancel button when cancelText is empty string', () => {
      render(<PlatformConfirmDialog {...defaultProps} cancelText="" />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('prevents body scroll when open', () => {
      render(<PlatformConfirmDialog {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(<PlatformConfirmDialog {...defaultProps} />);
      
      rerender(<PlatformConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('');
    });
  });
});
