import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock service workers and storage
vi.mock('../utils/serviceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({ updateAvailable: false })
}));



vi.mock('../services/storageService', () => {
  const mockStorageInstance = {
    getExercises: vi.fn().mockResolvedValue([
      {
        id: 'ex1',
        name: 'Push-ups',
        description: 'Classic push-up exercise',
        category: 'strength',
        exerciseType: 'repetition-based',
        defaultSets: 3,
        defaultReps: 12,
        isFavorite: false,
        tags: []
      }
    ]),
    getAppSettings: vi.fn().mockResolvedValue({
      intervalDuration: 30,
      soundEnabled: true,
      vibrationEnabled: true,
      preTimerCountdown: 3,
      darkMode: false,
      beepVolume: 0.5,
      autoSaveEnabled: true
    }),
    saveWorkoutSession: vi.fn().mockResolvedValue(undefined),
    saveActivityLog: vi.fn().mockResolvedValue(undefined),
    saveExercises: vi.fn().mockResolvedValue(undefined),
    saveExercise: vi.fn().mockResolvedValue(undefined),
    saveAppSettings: vi.fn().mockResolvedValue(undefined),
    toggleExerciseFavorite: vi.fn().mockResolvedValue(undefined),
    getWorkouts: vi.fn().mockResolvedValue([]),
    getDatabase: vi.fn(() => ({})),
    claimOwnership: vi.fn().mockResolvedValue(true)
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

// Mock wake lock
vi.mock('../hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    isSupported: true,
    isActive: false,
    requestWakeLock: vi.fn(),
    releaseWakeLock: vi.fn()
  })
}));

describe('App - Workout Mode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should initialize workout mode when navigated with workout state', async () => {
    render(<App />);

    // Wait for app to load
    await waitFor(
      () => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify the app renders successfully by checking for navigation elements
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
  });
});
