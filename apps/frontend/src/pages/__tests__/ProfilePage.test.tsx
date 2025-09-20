import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProfilePage from '../ProfilePage';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profileService';

// Mock the auth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock the profile service
vi.mock('../../services/profileService', () => ({
  profileService: {
    getUserProfile: vi.fn(),
    getUserConnections: vi.fn()
  }
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockProfileService = profileService as {
  getUserProfile: ReturnType<typeof vi.fn>;
  getUserConnections: ReturnType<typeof vi.fn>;
};

const renderProfilePage = (props = {}) => {
  const defaultProps = {
    isOwnProfile: true,
    ...props
  };

  return render(
    <BrowserRouter>
      <ProfilePage {...defaultProps} />
    </BrowserRouter>
  );
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mocks
    mockProfileService.getUserProfile.mockResolvedValue(null);
    mockProfileService.getUserConnections.mockResolvedValue([]);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false
      });
    });

    it('shows sign-in required message', async () => {
      renderProfilePage();

      expect(await screen.findByText('profile.signInRequired')).toBeInTheDocument();
      expect(screen.getByText('profile.signInToViewProfile')).toBeInTheDocument();
    });

    it('renders sign-in button', async () => {
      renderProfilePage();

      const signInButton = await screen.findByText('common.signIn');
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com'
        },
        loading: false
      });
    });

    it('shows loading state initially', async () => {
      renderProfilePage();

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
      
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('renders profile header for own profile', async () => {
      renderProfilePage({ isOwnProfile: true });

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should show "Profile Not Found" when profile is null
      expect(screen.getByText('profile.notFound')).toBeInTheDocument();
    });

    it('renders profile header for other user profile', async () => {
      renderProfilePage({ isOwnProfile: false });

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should show "Profile Not Found" when profile is null
      expect(screen.getByText('profile.notFound')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false
      });
    });

    it('has proper headings structure', async () => {
      renderProfilePage();

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('has accessible button labels', async () => {
      renderProfilePage();

      const signInButton = await screen.findByText('common.signIn');
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false
      });
    });

    it('provides way to sign in when not authenticated', async () => {
      renderProfilePage();

      const signInButton = await screen.findByRole('button');
      expect(signInButton).toHaveTextContent('common.signIn');
    });
  });

  describe('error handling', () => {
    it('handles missing profile gracefully', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          displayName: 'Test User',
          email: 'test@example.com'
        },
        loading: false
      });

      renderProfilePage();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Should render profile not found message without crashing
      expect(screen.getByText('profile.notFound')).toBeInTheDocument();
    });
  });
});