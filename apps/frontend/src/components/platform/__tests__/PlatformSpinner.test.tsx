/**
 * Platform Spinner Tests
 * 
 * Tests for the platform-aware spinner component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformSpinner, PlatformLoadingOverlay, PlatformInlineLoader } from '../PlatformSpinner';

// Mock nativeCapabilities
vi.mock('../../../utils/nativeCapabilities', () => ({
  isNativePlatform: vi.fn(() => false),
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
}));

import * as nativeCapabilities from '../../../utils/nativeCapabilities';

describe('PlatformSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isIOS).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(false);
  });

  describe('Web Platform', () => {
    it('renders web-style spinner by default', () => {
      render(<PlatformSpinner />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('platform-spinner--web');
    });

    it('applies correct size classes', () => {
      const { rerender } = render(<PlatformSpinner size="small" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      rerender(<PlatformSpinner size="large" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      render(<PlatformSpinner label="Loading exercises" />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveAttribute('aria-label', 'Loading exercises');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
    });

    it('applies custom className', () => {
      render(<PlatformSpinner className="custom-class" />);
      
      expect(screen.getByRole('progressbar')).toHaveClass('custom-class');
    });
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isIOS).mockReturnValue(true);
    });

    it('renders iOS-style spinner', () => {
      render(<PlatformSpinner />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('platform-spinner--ios');
    });

    it('renders SVG spinner for iOS', () => {
      render(<PlatformSpinner />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(true);
    });

    it('renders Android-style spinner', () => {
      render(<PlatformSpinner />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('platform-spinner--android');
    });
  });
});

describe('PlatformLoadingOverlay', () => {
  it('renders nothing when not loading', () => {
    render(<PlatformLoadingOverlay isLoading={false} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders overlay when loading', () => {
    render(<PlatformLoadingOverlay isLoading={true} />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays loading message', () => {
    render(<PlatformLoadingOverlay isLoading={true} message="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('applies fullScreen class when specified', () => {
    render(<PlatformLoadingOverlay isLoading={true} fullScreen />);
    
    expect(screen.getByRole('alert')).toHaveClass('fixed', 'inset-0');
  });
});

describe('PlatformInlineLoader', () => {
  it('renders with default text', () => {
    render(<PlatformInlineLoader />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<PlatformInlineLoader text="Saving..." />);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('includes spinner', () => {
    render(<PlatformInlineLoader />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
