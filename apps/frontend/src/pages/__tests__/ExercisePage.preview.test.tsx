import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// Mock i18n
const mockI18n = {
  resolvedLanguage: 'en',
  language: 'en',
  languages: ['en'],
  t: (key: string, options?: any) => {
    const translations: Record<string, string> = {
      'common.playVideo': 'Play video',
      'common.pauseVideo': 'Pause video',
      'common:exercises.title': 'Exercises',
      'common:exercises.subtitle': 'Browse, filter, and start exercises. Mark favorites for quick access.',
      'exercises:createNew': 'Create New Exercise',
      'common.create': 'Create',
      'selectCatalog': 'Exercise Catalog',
      'selectDescription': 'Choose an exercise catalog to browse',
      'exercises.filtersAndSearch': 'Filters & Search',
      'exercises.exercises': 'Exercises',
      'exercises.browseFilter': 'Browse, filter, and start exercises. Mark favorites for quick access.',
      'exercises.createExercise': 'Create New Exercise',
      'exercises.create': 'Create',
      'exercises.exerciseCatalog': 'Exercise Catalog'
    };
    return translations[key] || key;
  }
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockI18n.t,
    i18n: mockI18n
  }),
  I18nextProvider: ({ children }: any) => children
}));

// Mock feature flags and auth
vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true, canShareExercises: true } })
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}));

vi.mock('../../hooks/useSharedExercises', () => ({
  useSharedExercises: () => ({
    sharedExercises: [],
    isLoading: false,
    error: null,
    isSharedExercise: () => false
  })
}));

// Mock storage service
vi.mock('../../services/storageService', () => ({
  StorageService: {
    getInstance: () => ({
      getUserExercises: () => Promise.resolve([]),
      getFavoriteExercises: () => Promise.resolve([])
    })
  }
}));

// Mock additional utility functions
vi.mock('../../utils/localizeExercise', () => ({
  localizeExercise: (exercise: any) => ({
    name: exercise.name,
    description: exercise.description
  })
}));

vi.mock('../../data/catalogs', () => ({
  getDefaultCatalog: () => 'repcue',
  EXERCISE_CATALOGS: [
    {
      id: 'repcue',
      name: 'RepCue',
      exercises: ['bicycle-crunches'],
      thumbnail: '/catalog-thumbnails/repcue.jpg',
      description: 'Core RepCue exercises'
    }
  ]
}));

// Mock RTL detection hook
vi.mock('../../hooks/useRTLDetection', () => ({
  useRTLDetection: () => false
}));

describe('ExercisePage - video preview', () => {
  beforeEach(() => {
    // Enable video demos for this test
    (window as any).__VIDEO_DEMOS_DISABLED__ = false;

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
    vi.restoreAllMocks();
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

  it('displays exercise with video placeholder when video is not available', async () => {
    let renderResult;
    await act(async () => {
      renderResult = renderPage();
    });

    // Verify the exercise is displayed
    const exerciseElement = await screen.findByText('Bicycle Crunches');
    expect(exerciseElement).toBeInTheDocument();

    // Verify that a video placeholder is shown (since the video file doesn't actually exist)
    const noVideoElement = await screen.findByText('common.noVideo');
    expect(noVideoElement).toBeInTheDocument();

    // Verify exercise details are present
    const coreCategory = screen.getByText('common:categories.core');
    expect(coreCategory).toBeInTheDocument();

    // Verify the start timer button is present
    const startTimerButton = screen.getByText('home.startTimer');
    expect(startTimerButton).toBeInTheDocument();
  });
});
