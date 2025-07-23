import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Toast from '../Toast';

describe('Toast', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: 'Test Title',
    message: 'Test message content',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toast when isOpen is true', () => {
    render(<Toast {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Toast {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    render(<Toast {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onConfirm and onClose when confirm button is clicked', async () => {
    render(<Toast {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when backdrop is clicked', async () => {
    render(<Toast {...defaultProps} />);
    
    const backdrop = screen.getByRole('dialog').previousSibling as HTMLElement;
    fireEvent.click(backdrop);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('renders custom button text', () => {
    render(
      <Toast 
        {...defaultProps} 
        confirmText="Delete Forever" 
        cancelText="Keep Data" 
      />
    );
    
    expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    expect(screen.getByText('Keep Data')).toBeInTheDocument();
  });

  it('applies correct styling for danger type', () => {
    render(<Toast {...defaultProps} type="danger" />);
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('applies correct styling for warning type', () => {
    render(<Toast {...defaultProps} type="warning" />);
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-yellow-600');
  });

  it('applies correct styling for info type', () => {
    render(<Toast {...defaultProps} type="info" />);
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-blue-600');
  });

  it('has proper accessibility attributes', () => {
    render(<Toast {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'toast-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'toast-message');
    
    expect(screen.getByText('Test Title')).toHaveAttribute('id', 'toast-title');
    expect(screen.getByText('Test message content')).toHaveAttribute('id', 'toast-message');
  });

  it('handles keyboard navigation properly', () => {
    render(<Toast {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    const confirmButton = screen.getByText('Confirm');
    
    // Both buttons should be focusable (buttons are focusable by default)
    expect(cancelButton).toBeVisible();
    expect(confirmButton).toBeVisible();
    
    // Test that buttons can receive focus
    cancelButton.focus();
    expect(cancelButton).toHaveFocus();
    
    confirmButton.focus();
    expect(confirmButton).toHaveFocus();
  });
});
