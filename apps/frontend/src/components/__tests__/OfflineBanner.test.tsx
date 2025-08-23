import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineBanner from '../OfflineBanner';

// Mock the useOfflineStatus hook
vi.mock('../../hooks/useOfflineStatus', () => ({
  useOfflineStatus: vi.fn()
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows offline message when offline', async () => {
    const { useOfflineStatus } = await import('../../hooks/useOfflineStatus');
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOffline: true,
      isOnline: false,
      hasBeenOffline: true
    });

    render(<OfflineBanner />);
    
    expect(screen.getByText('You\'re offline')).toBeInTheDocument();
    expect(screen.getByText(/All features work normally/)).toBeInTheDocument();
  });

  it('shows reconnection message when back online after being offline', async () => {
    const { useOfflineStatus } = await import('../../hooks/useOfflineStatus');
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOffline: false,
      isOnline: true,
      hasBeenOffline: true
    });

    render(<OfflineBanner />);
    
    expect(screen.getByText('Connection restored')).toBeInTheDocument();
    expect(screen.getByText(/Back online/)).toBeInTheDocument();
  });

  it('shows nothing when online and never been offline', async () => {
    const { useOfflineStatus } = await import('../../hooks/useOfflineStatus');
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOffline: false,
      isOnline: true,
      hasBeenOffline: false
    });

    const { container } = render(<OfflineBanner />);
    
    expect(container.firstChild).toBeNull();
  });

  it('has proper accessibility attributes', async () => {
    const { useOfflineStatus } = await import('../../hooks/useOfflineStatus');
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOffline: true,
      isOnline: false,
      hasBeenOffline: true
    });

    render(<OfflineBanner />);
    
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('bg-orange-100');
  });
});
