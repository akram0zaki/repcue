import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProfileSection } from '../ProfileSection';
import { useAuth } from '../../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock the AuthModal component 
vi.mock('../auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'profile.title': 'Profile',
        'profile.viewProfile': 'View Profile',
        'profile.notSignedIn': 'You are not signed in',
        'profile.signInToSync': 'Sign in to sync your data across devices',
        'signIn.button': 'Sign In',
        'signOut': 'Sign Out',
        'common:loading': 'Loading...',
        'profile.anonymous': 'Anonymous User'
      };
      return translations[key] || fallback || key;
    }
  })
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const renderProfileSection = (props = {}) => {
  return render(
    <BrowserRouter>
      <ProfileSection {...props} />
    </BrowserRouter>
  );
};

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: vi.fn(),
        loading: false
      });
    });

    it('should render not signed in message', () => {
      renderProfileSection();
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('You are not signed in')).toBeInTheDocument();
      expect(screen.getByText('Sign in to sync your data across devices')).toBeInTheDocument();
    });

    it('should show sign in button', () => {
      renderProfileSection();
      
      const signInButton = screen.getByText('Sign In');
      expect(signInButton).toBeInTheDocument();
    });

    it('should open auth modal when sign in button is clicked', () => {
      renderProfileSection();
      
      const signInButton = screen.getByText('Sign In');
      fireEvent.click(signInButton);
      
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    const mockUser = {
      id: '123',
      displayName: 'John Doe',
      email: 'john@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockSignOut = vi.fn();

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        signOut: mockSignOut,
        loading: false
      });
    });

    it('should display user information', () => {
      renderProfileSection();
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should show view profile and sign out buttons', () => {
      renderProfileSection();
      
      expect(screen.getByText('View Profile')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call onViewProfile when view profile button is clicked', () => {
      const mockOnViewProfile = vi.fn();
      renderProfileSection({ onViewProfile: mockOnViewProfile });
      
      const viewProfileButton = screen.getByText('View Profile');
      fireEvent.click(viewProfileButton);
      
      expect(mockOnViewProfile).toHaveBeenCalledOnce();
    });

    it('should call signOut when sign out button is clicked', async () => {
      renderProfileSection();
      
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);
      
      expect(mockSignOut).toHaveBeenCalledOnce();
    });

    it('should display user initials when no avatar URL is provided', () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: undefined };
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: userWithoutAvatar,
        signOut: mockSignOut,
        loading: false
      });

      renderProfileSection();
      
      // Should display initials "JD" for "John Doe"
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should show loading state when signing out', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        signOut: mockSignOut,
        loading: true
      });

      renderProfileSection();
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('with user without display name', () => {
    const mockUserNoDisplayName = {
      id: '123',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: mockUserNoDisplayName,
        signOut: vi.fn(),
        loading: false
      });
    });

    it('should use email prefix as display name', () => {
      renderProfileSection();
      
      expect(screen.getByText('john')).toBeInTheDocument();
    });

    it('should display email initial when no display name', () => {
      renderProfileSection();
      
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });
});
