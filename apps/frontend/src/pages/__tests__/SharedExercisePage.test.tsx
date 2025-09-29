import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SharedExercisePage from '../SharedExercisePage';
import { SnackbarProvider } from '../../components/SnackbarProvider';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ shareToken: 'test-token-123' })
  };
});

// Mock the supabase config for StandaloneSharedExercise
vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    supabaseUrl: 'https://test.supabase.co'
  },
  supabaseFunctionBaseUrl: 'https://test.supabase.co'
}));

// Mock the supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn()
  },
  supabaseUrl: 'https://test.supabase.co'
};

vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    supabaseUrl: 'https://test.supabase.co'
  }
}));

// Mock fetch with proper typing
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Test component wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/share/test-token-123']}>
    <SnackbarProvider>
      {children}
    </SnackbarProvider>
  </MemoryRouter>
);

const mockSharedExercise = {
  success: true,
  exercise: {
    id: 'shared-exercise-123',
    name: 'Shared Plank',
    description: 'A plank exercise shared by another user',
    category: 'core',
    exercise_type: 'time_based',
    default_duration: 60,
    default_sets: 1,
    default_reps: 1,
    tags: ['core', 'isometric'],
    has_video: false,
    owner_id: 'other-user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    is_favorite: false
  },
  shareInfo: {
    sharedBy: 'John Doe',
    sharedAt: new Date().toISOString(),
    isPublic: true
  }
};

describe('SharedExercisePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.pathname for share token extraction
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/share/test-token-123',
        origin: 'http://localhost:3000'
      },
      writable: true
    });

    mockUseAuth.mockReturnValue({ user: null });
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSharedExercise)
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays shared exercise data', async () => {
    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toMatch(/get-shared-exercise\?token=test-token-123/);
    });

    await waitFor(() => {
      expect(screen.getByText('Shared Plank')).toBeInTheDocument();
      expect(screen.getByText('A plank exercise shared by another user')).toBeInTheDocument();
      expect(screen.getByText(/Shared by John Doe/i)).toBeInTheDocument();
      expect(screen.getByText('Save to My Library')).toBeInTheDocument();
    });
  });

  it('displays exercise details correctly', async () => {
    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Plank')).toBeInTheDocument();
    });

    // Check exercise type badge
    expect(screen.getByText('Time-based')).toBeInTheDocument();

    // Check default duration
    expect(screen.getByText(/60s/)).toBeInTheDocument();

    // Check tags
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('isometric')).toBeInTheDocument();
  });

  it('redirects to auth when save is clicked by unauthenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Save to My Library')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save to My Library');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/',
        expect.objectContaining({
          state: expect.objectContaining({
            message: 'Please sign in to save this exercise to your library',
            redirectAfterAuth: true
          })
        })
      );
    });

    // Check that share token is stored in session storage for later use
    expect(sessionStorage.getItem('pendingShareToken')).toBe('test-token-123');
  });

  it('saves exercise when save is clicked by authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockUseAuth.mockReturnValue({ user: mockUser });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null
    });

    const mockSaveResponse = {
      success: true,
      exerciseId: 'saved-exercise-456'
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSharedExercise)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSaveResponse)
      });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Save to My Library')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save to My Library');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/save-shared-exercise',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({
            shareToken: 'test-token-123'
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Exercise saved to your library!/i)).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/exercises');
    });
  });

  it('handles invalid or expired share tokens', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Share not found' })
    });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Exercise Not Found')).toBeInTheDocument();
      expect(screen.getByText(/This share link may have expired or is invalid/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Exercise Not Found')).toBeInTheDocument();
      expect(screen.getByText(/This share link may have expired or is invalid/i)).toBeInTheDocument();
    });
  });

  it('handles save exercise errors gracefully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockUseAuth.mockReturnValue({ user: mockUser });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSharedExercise)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Failed to save' })
      });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Save to My Library')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save to My Library');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save exercise/i)).toBeInTheDocument();
    });
  });

  it('displays exercise with video correctly', async () => {
    const mockExerciseWithVideo = {
      ...mockSharedExercise,
      exercise: {
        ...mockSharedExercise.exercise,
        has_video: true
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockExerciseWithVideo)
    });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Plank')).toBeInTheDocument();
    });

    // Should show video placeholder or video element
    expect(screen.getByText(/Video demonstration available/i)).toBeInTheDocument();
  });

  it('displays custom video URL correctly', async () => {
    const mockExerciseWithCustomVideo = {
      ...mockSharedExercise,
      exercise: {
        ...mockSharedExercise.exercise,
        custom_video_url: 'https://example.com/video.mp4'
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockExerciseWithCustomVideo)
    });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Plank')).toBeInTheDocument();
    });

    // Should show video element
    expect(screen.getByText(/Video demonstration available/i)).toBeInTheDocument();
  });

  it('handles repetition-based exercises correctly', async () => {
    const mockRepExercise = {
      ...mockSharedExercise,
      exercise: {
        ...mockSharedExercise.exercise,
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        default_duration: undefined
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockRepExercise)
    });

    render(
      <TestWrapper>
        <SharedExercisePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Plank')).toBeInTheDocument();
    });

    // Check exercise type badge
    expect(screen.getByText('Rep-based')).toBeInTheDocument();

    // Check default sets and reps
    expect(screen.getByText(/3 sets/)).toBeInTheDocument();
    expect(screen.getByText(/10 reps/)).toBeInTheDocument();
  });
});