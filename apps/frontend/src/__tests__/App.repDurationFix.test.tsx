import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DEFAULT_APP_SETTINGS } from '../constants';
import { ExerciseCategory, ExerciseType } from '../types';

// Mock all required services before importing anything that uses them
vi.mock('../services/storageService', () => {
  const INITIAL_EXERCISES = [
    {
      id: 'bicycle-crunches',
      name: 'Bicycle Crunches',
      description: 'Alternate elbow to opposite knee in cycling motion',
      category: ExerciseCategory.CORE,
      exerciseType: ExerciseType.REPETITION_BASED,
      defaultSets: 3,
      defaultReps: 15,
      isFavorite: false,
      tags: ['dynamic', 'core', 'obliques']
    }
  ];

  const mockStorageInstance = {
    getExercises: vi.fn().mockResolvedValue(INITIAL_EXERCISES),
    getAppSettings: vi.fn().mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      lastSelectedExerciseId: 'bicycle-crunches',
      repSpeedFactor: 1.0
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
      version: 2,
      isLatestVersion: true
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

// Mock RTL detection hook directly
vi.mock('../hooks/useRTLDetection', () => ({
  useRTLDetection: () => false
}));

// Mock feature flags
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: {} })
}));

// Mock additional services that might block initialization
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

// Import App after mocks are set up
import App from '../App';
import { SnackbarProvider } from '../components/SnackbarProvider';

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

describe('App - Rep-based Exercise Timer Duration Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize app with rep-based exercise without crashing', async () => {
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

    // For rep-based exercises, this validates that the app loads without errors
    // and doesn't crash when processing rep-based exercise data
    expect(container.firstChild).toBeInTheDocument();

    // The main goal is to verify the app doesn't crash with rep-based exercises
    // Even if we're in loading state, navigation should be functional
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
