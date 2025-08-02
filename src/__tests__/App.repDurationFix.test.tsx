import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  return {
    storageService: {
      getExercises: vi.fn().mockResolvedValue(INITIAL_EXERCISES),
      getAppSettings: vi.fn().mockResolvedValue({
        ...DEFAULT_APP_SETTINGS,
        lastSelectedExerciseId: 'bicycle-crunches',
        repSpeedFactor: 1.0
      }),
      saveAppSettings: vi.fn().mockResolvedValue(undefined),
      saveExercises: vi.fn().mockResolvedValue(undefined),
      getWorkouts: vi.fn().mockResolvedValue([]),
      toggleExerciseFavorite: vi.fn().mockResolvedValue(undefined)
    }
  };
});

vi.mock('../services/consentService', () => ({
  consentService: {
    hasConsent: vi.fn().mockReturnValue(true),
    getConsentData: vi.fn().mockReturnValue({
      hasConsented: true,
      version: 2,
      isLatestVersion: true
    })
  }
}));

vi.mock('../services/audioService', () => ({
  audioService: {
    playStartFeedback: vi.fn(),
    announceText: vi.fn(),
    playIntervalBeep: vi.fn(),
    vibrate: vi.fn()
  }
}));

vi.mock('../utils/serviceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({ updateAvailable: false })
}));

// Import App after mocks are set up
import App from '../App';

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
    const { container } = render(<App />);

    // Wait for the app to initialize
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that the main app content is rendered (RepCue title)
    expect(screen.getByText('RepCue')).toBeInTheDocument();

    // Check that we have exercise-related content (timer buttons)
    expect(screen.getByText('Start Timer')).toBeInTheDocument();

    // For rep-based exercises, this validates that the app loads without errors
    // and doesn't crash when processing rep-based exercise data
    expect(container.firstChild).toBeInTheDocument();
  });
});
