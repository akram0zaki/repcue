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
      <ExercisePage exercises={exercises} onToggleFavorite={() => {}} />
    );

    const playButtons = await screen.findAllByRole('button', { name: /preview video/i });
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
      <ExercisePage exercises={exercises} onToggleFavorite={() => {}} />
    );

    const playButtons = await screen.findAllByRole('button', { name: /preview video/i });
    await fireEvent.click(playButtons[0]);

    // Because HEAD returns 404, we should not open the dialog; only toast appears
    await screen.findByText(/Video is not available at this time/i);
    expect(document.querySelector('[role="dialog"]')).toBeFalsy();
  });
});


