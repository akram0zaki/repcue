import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExercisePage from '../ExercisePage';

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
  });

  const baseExercise = {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to knee',
    category: 'core',
    exerciseType: 'time-based',
    defaultDuration: 30,
    defaultSets: 1,
    defaultReps: 0,
    tags: ['core'],
    hasVideo: true,
    isFavorite: false,
  } as any;

  const renderPage = () =>
    render(
      <MemoryRouter>
        <ExercisePage
          exercises={[baseExercise]}
          onToggleFavorite={vi.fn()}
        />
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
