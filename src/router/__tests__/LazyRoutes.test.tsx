import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChunkErrorBoundary, PageLoader } from '../LazyRoutes';
import { createRouteLoader } from '../routeUtils';

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: mockReload,
  },
  writable: true,
});

describe('LazyRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReload.mockClear();
  });

  describe('PageLoader', () => {
    it('renders loading spinner and text', () => {
      render(<PageLoader />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<PageLoader />);
      
      const loader = screen.getByText('Loading...');
      expect(loader).toHaveClass('text-gray-600', 'dark:text-gray-400');
    });
  });

  describe('createRouteLoader', () => {
    it('renders loading state for specific route', () => {
      const loader = createRouteLoader('Timer');
      render(<div>{loader}</div>);
      
      expect(screen.getByText('Loading Timer...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('handles different route names', () => {
      const homeLoader = createRouteLoader('Home');
      const settingsLoader = createRouteLoader('Settings');
      
      const { rerender } = render(<div>{homeLoader}</div>);
      expect(screen.getByText('Loading Home...')).toBeInTheDocument();
      
      rerender(<div>{settingsLoader}</div>);
      expect(screen.getByText('Loading Settings...')).toBeInTheDocument();
    });
  });

  describe('ChunkErrorBoundary', () => {
    it('renders children when no error', () => {
      render(
        <ChunkErrorBoundary>
          <div>Test Content</div>
        </ChunkErrorBoundary>
      );
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('shows error UI when chunk loading fails', async () => {
      // Simulate chunk loading error
      const errorEvent = new ErrorEvent('error', {
        message: 'Loading chunk failed',
        filename: 'chunk.js',
        lineno: 1,
        colno: 1
      });

      render(
        <ChunkErrorBoundary>
          <div>Test Content</div>
        </ChunkErrorBoundary>
      );

      // Trigger error event
      window.dispatchEvent(errorEvent);

      await waitFor(() => {
        expect(screen.getByText('Loading Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load the page. Please refresh to try again.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument();
      });
    });

    it('handles ChunkLoadError', async () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'ChunkLoadError: Loading CSS chunk failed',
        filename: 'chunk.css',
        lineno: 1,
        colno: 1
      });

      render(
        <ChunkErrorBoundary>
          <div>Test Content</div>
        </ChunkErrorBoundary>
      );

      window.dispatchEvent(errorEvent);

      await waitFor(() => {
        expect(screen.getByText('Loading Error')).toBeInTheDocument();
      });
    });

    it('calls window.location.reload when refresh button clicked', async () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Loading chunk failed'
      });

      render(
        <ChunkErrorBoundary>
          <div>Test Content</div>
        </ChunkErrorBoundary>
      );

      window.dispatchEvent(errorEvent);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: 'Refresh Page' });
        refreshButton.click();
        expect(mockReload).toHaveBeenCalled();
      });
    });

    it('ignores non-chunk errors', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Some other error',
        filename: 'other.js',
        lineno: 1,
        colno: 1
      });

      render(
        <ChunkErrorBoundary>
          <div>Test Content</div>
        </ChunkErrorBoundary>
      );

      window.dispatchEvent(errorEvent);

      // Should still show original content
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading Error')).not.toBeInTheDocument();
    });
  });

  describe('Lazy loaded components', () => {
    it('should be defined', async () => {
      const { HomePage, ExercisePage, TimerPage, ActivityLogPage, SettingsPage } = await import('../LazyRoutes');
      
      expect(HomePage).toBeDefined();
      expect(ExercisePage).toBeDefined();
      expect(TimerPage).toBeDefined();
      expect(ActivityLogPage).toBeDefined();
      expect(SettingsPage).toBeDefined();
    });
  });
});
