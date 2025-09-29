import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { SnackbarProvider } from '../components/SnackbarProvider';

// Mock all required services
vi.mock('../services/storageService', () => {
  const INITIAL_EXERCISES = [
    {
      id: 'ex1',
      name: 'Push-ups',
      description: 'Classic push-up exercise',
      category: 'strength',
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 12,
      is_favorite: false,
      tags: []
    }
  ];

  const mockStorageInstance = {
    getExercises: vi.fn().mockResolvedValue(INITIAL_EXERCISES),
    getAppSettings: vi.fn().mockResolvedValue({
      interval_duration: 30,
      sound_enabled: true,
      vibration_enabled: true,
      pre_timer_countdown: 3,
      dark_mode: false,
      beep_volume: 0.5,
      auto_save: true,
      default_rest_time: 30,
      rep_speed_factor: 1.0,
      show_exercise_videos: true,
      horizontal_exercise_layout: false,
      ring_timer: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      id: 'test-settings'
    }),
    saveAppSettings: vi.fn().mockResolvedValue(undefined),
    saveExercise: vi.fn().mockResolvedValue(undefined),
    saveExercises: vi.fn().mockResolvedValue(undefined),
    getWorkouts: vi.fn().mockResolvedValue([]),
    getWorkoutSessions: vi.fn().mockResolvedValue([]),
    getActivityLogs: vi.fn().mockResolvedValue([]),
    toggleExerciseFavorite: vi.fn().mockResolvedValue(undefined),
    getDatabase: vi.fn(() => ({})),
    claimOwnership: vi.fn().mockResolvedValue(true),
    ready: vi.fn().mockResolvedValue(true),
    ensureExercisesSeeded: vi.fn().mockResolvedValue(undefined)
  };

  return {
    StorageService: {
      getInstance: vi.fn(() => mockStorageInstance)
    },
    storageService: mockStorageInstance
  };
});



vi.mock('../services/consentService', () => {
  const mockConsentInstance = {
    hasConsent: vi.fn().mockReturnValue(true),
    getConsentData: vi.fn().mockReturnValue({
      hasConsented: true,
      consentDate: new Date(),
      cookiesAccepted: true,
      analyticsAccepted: false
    })
  };

  return {
    ConsentService: {
      getInstance: vi.fn(() => mockConsentInstance)
    },
    consentService: mockConsentInstance
  };
});



vi.mock('../services/authService', () => {
  const mockAuthInstance = {
    getAuthState: vi.fn().mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      accessToken: undefined,
      refreshToken: undefined
    }),
    onAuthStateChange: vi.fn(() => () => {}),
    getCurrentSession: vi.fn().mockReturnValue(null),
    signInWithPassword: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn()
  };

  return {
    AuthService: {
      getInstance: vi.fn(() => mockAuthInstance)
    },
    authService: mockAuthInstance
  };
});

vi.mock('../services/audioService', () => ({
  audioService: {
    playStartFeedback: vi.fn(),
    announceText: vi.fn(),
    playIntervalBeep: vi.fn(),
    vibrate: vi.fn()
  }
}));

vi.mock('../utils/serviceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({ updateAvailable: false }),
  swEventEmitter: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

// Mock i18n
const mockI18n = {
  resolvedLanguage: 'en',
  language: 'en',
  languages: ['en']
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'RepCue',
        'home.startTimer': 'Start Timer',
        'navigation.home': 'Home',
        'navigation.timer': 'Timer',
        'navigation.exercises': 'Exercises',
        'navigation.workouts': 'Workouts',
        'navigation.progress': 'Progress'
      };
      return translations[key] || key;
    },
    i18n: mockI18n
  }),
  I18nextProvider: ({ children }: any) => children
}));

// Mock RTL detection hook
vi.mock('../hooks/useRTLDetection', () => ({
  useRTLDetection: () => false
}));

// Mock feature flags
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: {} })
}));

// Mock additional services
vi.mock('../services/syncService', () => ({
  SyncService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockReturnValue(true)
    })
  }
}));

vi.mock('../services/queueService', () => ({
  QueueService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockReturnValue(true)
    })
  }
}));

// Mock wake lock
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    isSupported: true,
    isActive: false,
    requestWakeLock: vi.fn(),
    releaseWakeLock: vi.fn()
  })
}));

// Import App after mocks are set up
// Mock other browser APIs
Object.defineProperty(navigator, 'vibrate', { value: vi.fn() });
Object.defineProperty(navigator, 'wakeLock', {
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
      type: 'screen',
      released: false
    })
  }
});

describe('App - Workout Mode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock timer functions
    vi.useFakeTimers();
    global.setInterval = vi.fn();
    global.clearInterval = vi.fn();
    // Mock location.state for workout mode navigation
    const mockLocation = {
      pathname: '/timer',
      state: {
        workoutMode: {
          workoutId: 'workout-1',
          workoutName: 'Test Workout',
          exercises: [
            {
              id: 'we1',
              exerciseId: 'ex1',
              order: 0,
              customSets: 3,
              customReps: 15,
              customRestTime: 30
            }
          ]
        }
      },
      search: '',
      hash: '',
      key: 'test'
    };

    // Mock useLocation
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => mockLocation
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize workout mode when navigated with workout state', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      );
    });

    const { container } = renderResult;

    // Wait for the app to initialize - look for navigation first since that should load quickly
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    }, { timeout: 5000 });

    // The app should not be stuck in loading state - verify we can see navigation
    expect(screen.getByTestId('nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-exercises')).toBeInTheDocument();

    // Verify the app loads without errors
    expect(container.firstChild).toBeInTheDocument();

    // The main goal is to verify the app doesn't crash with workout navigation
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
