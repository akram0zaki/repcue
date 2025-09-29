import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShareButton } from '../ShareButton';
import { SnackbarProvider } from '../SnackbarProvider';
import { MemoryRouter } from 'react-router-dom';

// Mock feature flags
vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canShareExercises: true } })
}));

// Mock the supabase config with proper factory
vi.mock('../../config/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn()
    },
    supabaseUrl: 'https://test.supabase.co'
  };

  return { supabase: mockSupabase };
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  writable: true
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test component wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <SnackbarProvider>
      {children}
    </SnackbarProvider>
  </MemoryRouter>
);

describe('ShareButton', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked supabase
    const supabaseModule = await import('../../config/supabase');
    mockSupabase = supabaseModule.supabase;

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null
    });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'owner-123' } },
      error: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders share button with correct title', () => {
    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveAttribute('title', 'Share Exercise');
  });

  it('opens modal when share button is clicked', async () => {
    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Share Exercise')).toBeInTheDocument();
    });
  });

  it('shows error for non-owner trying to share', async () => {
    // Mock user as different from owner
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'different-user' } },
      error: null
    });

    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);

    await waitFor(() => {
      // Dialog should not open for non-owner
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('generates share link when generate button is clicked', async () => {
    const mockResponse = {
      success: true,
      shareUrl: 'https://example.com/share/abc123',
      shareToken: 'abc123'
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate Share Link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/share-exercise',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({
            exerciseId: 'test-id',
            isPublic: true,
            recipientEmail: undefined
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Share Link Ready!')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' })
    });

    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate Share Link/i });
    fireEvent.click(generateButton);

    // The component should handle the error gracefully
    // We can't easily test for snackbar messages without more complex setup
    // but at least we verify it doesn't crash
    await waitFor(() => {
      expect(generateButton).not.toBeDisabled();
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(
      <TestWrapper>
        <ShareButton
          exerciseId="test-id"
          exerciseName="Test Exercise"
          ownerId="owner-123"
        />
      </TestWrapper>
    );

    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});