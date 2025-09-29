import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExercisePage from '../pages/ExercisePage';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../utils/loadExerciseMedia', () => ({
  loadExerciseMedia: vi.fn(async () => ({
    'side-plan': {
      id: 'side-plan',
      repsPerLoop: 1,
      fps: 30,
      video: { square: '/videos/side-plan-missing.webm' }
    }
  }))
}));

// Mock feature flags
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true, canShareExercises: true } })
}));

// Mock auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}));

// Mock shared exercises hook
vi.mock('../hooks/useSharedExercises', () => ({
  useSharedExercises: () => ({
    sharedExercises: [],
    isLoading: false,
    error: null,
    isSharedExercise: () => false
  })
}));

// Mock utility functions
vi.mock('../utils/localizeExercise', () => ({
  localizeExercise: (exercise: any) => ({
    name: exercise.name,
    description: exercise.description
  })
}));

vi.mock('../data/catalogs', () => ({
  getDefaultCatalog: () => 'repcue',
  EXERCISE_CATALOGS: [
    { id: 'repcue', name: 'RepCue', exercises: [] }
  ]
}));

vi.mock('../utils/videoSources', () => ({
  default: () => []
}));
// Mock fetch HEAD precheck responses
const originalFetch: typeof fetch | undefined = (global as any).fetch as any;
beforeEach(() => {
  // Default: 404 for our missing asset
  // @ts-expect-error node types
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init && init.method === 'HEAD') {
      return new Response('', { status: 404, headers: { 'content-type': 'text/plain' } });
    }
    return new Response('', { status: 200, headers: { 'content-type': 'text/plain' } });
  });
});
afterEach(() => {
  (global as any).fetch = originalFetch as any;
});

describe('ExercisePage preview error handling', () => {
  const exercises = [
    {
      id: 'side-plan',
      name: 'Side Plan',
      description: 'Core',
      category: 'core',
      tags: [],
      exercise_type: 'time_based',
      default_duration: 30,
      has_video: true,
      is_favorite: false
    } as any
  ];

  const mockAppSettings = {
    interval_duration: 30,
    sound_enabled: true,
    vibration_enabled: true,
    beep_volume: 0.5,
    dark_mode: false,
    auto_save: true,
    pre_timer_countdown: 3,
    default_rest_time: 30,
    rep_speed_factor: 1.0,
    show_exercise_videos: true,
    horizontal_exercise_layout: false,
    ring_timer: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    id: 'test-settings',
  };

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <SnackbarProvider>
            {ui}
          </SnackbarProvider>
        </MemoryRouter>
      </I18nextProvider>
    );
  }

  const original = global.HTMLVideoElement;
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    global.HTMLVideoElement = original;
  });

  it('shows warning toast when preview video element errors', async () => {
    // Make HEAD succeed so modal opens, then simulate video element error
    (global as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init && init.method === 'HEAD') {
        return new Response('', { status: 200, headers: { 'content-type': 'video/webm' } });
      }
      return new Response('', { status: 200 });
    });

    // Stub media play in jsdom
    const originalPlay = (global as any).HTMLMediaElement?.prototype?.play;
    const originalPause = (global as any).HTMLMediaElement?.prototype?.pause;
    if ((global as any).HTMLMediaElement) {
      (global as any).HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
      (global as any).HTMLMediaElement.prototype.pause = vi.fn();
    }

    renderWithProviders(
      <ExercisePage exercises={exercises} appSettings={mockAppSettings} onToggleFavorite={() => {}} />
    );

    // Debug: Let's see what buttons are available
    await screen.findByText('Side Plan');

    // Look for any video-related button - might have different text
    const playButtons = screen.getAllByRole('button').filter(button =>
      button.textContent?.toLowerCase().includes('video') ||
      button.textContent?.toLowerCase().includes('preview') ||
      button.textContent?.toLowerCase().includes('play') ||
      button.getAttribute('aria-label')?.toLowerCase().includes('video') ||
      button.getAttribute('aria-label')?.toLowerCase().includes('preview')
    );

    expect(playButtons.length).toBeGreaterThan(0);
    fireEvent.click(playButtons[0]);

    // Modal should open and video element mounted; trigger error
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
    const vid = document.querySelector('video');
    expect(vid).toBeTruthy();
    vid?.dispatchEvent(new Event('error'));

    // Wait for bottom toast (status role) and auto-close of modal
    await screen.findByRole('status');
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeFalsy());

    // Restore stubs
    if ((global as any).HTMLMediaElement) {
      (global as any).HTMLMediaElement.prototype.play = originalPlay;
      (global as any).HTMLMediaElement.prototype.pause = originalPause;
    }
  });

  it('does not open preview modal when precheck fails', async () => {
    const listeners: Record<string, Array<(...args: unknown[]) => unknown>> = { error: [], loadeddata: [] };
    class MockVideoEl {
      addEventListener(ev: string, cb: (...args: unknown[]) => unknown) { (listeners[ev] ||= []).push(cb); }
      removeEventListener() {}
      play(): Promise<void> { return Promise.resolve(); }
    }
    (global as any).HTMLVideoElement = MockVideoEl;

    renderWithProviders(
      <ExercisePage exercises={exercises} appSettings={mockAppSettings} onToggleFavorite={() => {}} />
    );

    // Debug: Let's see what buttons are available
    await screen.findByText('Side Plan');

    // Look for any video-related button - might have different text
    const playButtons = screen.getAllByRole('button').filter(button =>
      button.textContent?.toLowerCase().includes('video') ||
      button.textContent?.toLowerCase().includes('preview') ||
      button.textContent?.toLowerCase().includes('play') ||
      button.getAttribute('aria-label')?.toLowerCase().includes('video') ||
      button.getAttribute('aria-label')?.toLowerCase().includes('preview')
    );

    expect(playButtons.length).toBeGreaterThan(0);
    await fireEvent.click(playButtons[0]);

    // Because HEAD returns 404, we should not open the dialog; only toast appears
    await screen.findByText(/Video is not available at this time/i);
    expect(document.querySelector('[role="dialog"]')).toBeFalsy();
  });
});


