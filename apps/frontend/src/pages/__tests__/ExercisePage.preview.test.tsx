import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExercisePage from '../ExercisePage';
import { SnackbarProvider } from '../../components/SnackbarProvider';

vi.mock('../../utils/loadExerciseMedia', async () => {
  return {
    loadExerciseMedia: vi.fn().mockResolvedValue({
      'bicycle-crunches': {
        id: 'bicycle-crunches',
        video: {
          square: '/videos/bicycle-crunches_v1_1080x1080.webm'
        }
      }
    }),
  };
});

describe('ExercisePage - video preview', () => {
  beforeEach(() => {
    (window as any).__VIDEO_DEMOS_DISABLED__ = true;
    // Mock HEAD precheck as success so preview opens
    const originalFetch: typeof fetch | undefined = (globalThis as any).fetch as any;
    (globalThis as any).__origFetch = originalFetch;
    (globalThis as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init && init.method === 'HEAD') {
        return new Response('', { status: 200, headers: { 'content-type': 'video/webm' } });
      }
      return new Response('', { status: 200 });
    });
  });
  afterEach(() => {
    (globalThis as any).fetch = (globalThis as any).__origFetch;
    delete (globalThis as any).__origFetch;
  });

  const baseExercise = {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to knee',
    category: 'core',
    exercise_type: 'time_based',
    default_duration: 30,
    default_sets: 1,
    default_reps: 0,
    tags: ['core'],
    has_video: true,
    is_favorite: false,
  } as any;

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

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SnackbarProvider>
          <ExercisePage
            exercises={[baseExercise]}
            appSettings={mockAppSettings}
            onToggleFavorite={vi.fn()}
          />
        </SnackbarProvider>
      </MemoryRouter>
    );

  it('shows a preview button for exercises with video and opens a modal on click', async () => {
    renderPage();
    const btn = await screen.findByRole('button', { name: /preview video/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    const dialog = await waitFor(() => screen.getByRole('dialog'));
    expect(dialog).toBeInTheDocument();

    const backdrop = screen.getByTestId('preview-backdrop');
    fireEvent.click(backdrop);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
