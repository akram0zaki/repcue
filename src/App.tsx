import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService } from './services/storageService';
import { audioService } from './services/audioService';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import ConsentBanner from './components/ConsentBanner';
import AppShell from './components/AppShell';
import { registerServiceWorker } from './utils/serviceWorker';
import type { Exercise, AppSettings, TimerState, ActivityLog } from './types';
import { Routes as AppRoutes } from './types';
import { DEFAULT_APP_SETTINGS, type TimerPreset } from './constants';

// Enhanced lazy loading with error boundaries and preloading
import { Suspense } from 'react';
import { 
  HomePage, 
  ExercisePage, 
  TimerPage, 
  ActivityLogPage, 
  SettingsPage,
  WorkoutsPage,
  CreateWorkoutPage,
  EditWorkoutPage,
  ChunkErrorBoundary,
  preloadCriticalRoutes,
  createRouteLoader
} from './router/LazyRoutes';

// Wrapper component to handle navigation state for TimerPage
const TimerPageWrapper: React.FC<{
  exercises: Exercise[];
  appSettings: AppSettings;
  timerState: TimerState;
  selectedExercise: Exercise | null;
  selectedDuration: TimerPreset;
  showExerciseSelector: boolean;
  wakeLockSupported: boolean;
  wakeLockActive: boolean;
  onSetSelectedExercise: (exercise: Exercise | null) => void;
  onSetSelectedDuration: (duration: TimerPreset) => void;
  onSetShowExerciseSelector: (show: boolean) => void;
  onStartTimer: () => Promise<void>;
  onStopTimer: (isCompletion?: boolean) => Promise<void>;
  onResetTimer: () => Promise<void>;
}> = (props) => {
  const location = useLocation();
  const { onSetSelectedExercise, onSetSelectedDuration, onStartTimer, timerState } = props;
  const processedStateRef = React.useRef<string | null>(null);

  // Handle navigation state from ExercisePage
  useEffect(() => {
    const state = location.state as { selectedExercise?: Exercise; selectedDuration?: number } | null;
    const stateKey = state?.selectedExercise?.id || null;
    
    // Only process if we have a new exercise and haven't already processed this state
    if (state?.selectedExercise && !timerState.isRunning && processedStateRef.current !== stateKey) {
      processedStateRef.current = stateKey;
      
      // Set the exercise and duration from navigation state
      onSetSelectedExercise(state.selectedExercise);
      if (state.selectedDuration) {
        onSetSelectedDuration(state.selectedDuration as TimerPreset);
      }
      
      // Auto-start timer after a brief delay to ensure state is updated
      const timer = setTimeout(() => {
        onStartTimer();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [location.state, onSetSelectedExercise, onSetSelectedDuration, onStartTimer, timerState.isRunning]);

  return <TimerPage {...props} />;
};

function App() {
  const [hasConsent, setHasConsent] = useState(consentService.hasConsent());
  const [isLoading, setIsLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // Persistent Timer State
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    currentTime: 0,
    intervalDuration: 30,
    currentExercise: undefined,
    isCountdown: false,
    countdownTime: 0
  });

  // Timer UI State
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<TimerPreset>(30);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  // Timer refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBeepIntervalRef = useRef<number>(0);

  // Wake lock for keeping screen active
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();

  // Separate function for the actual timer logic
  const startActualTimer = useCallback(() => {
    // Play start sound and vibration
    if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
      audioService.playStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
    }

    // Announce timer start
    if (appSettings.soundEnabled) {
      audioService.announceText(`Timer started! ${selectedDuration} seconds`);
    }

    const startTime = Date.now();
    lastBeepIntervalRef.current = 0; // Reset interval counter

    // Update timer state to actual timer mode
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isCountdown: false,
      countdownTime: 0,
      currentTime: 0,
      targetTime: selectedDuration,
      startTime: new Date(),
      currentExercise: selectedExercise || undefined
    }));

    // Start the main timer interval
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      setTimerState(prev => {
        const newTime = elapsed;
        const remaining = (prev.targetTime || 0) - newTime;

        // Check if timer completed
        if (remaining <= 0) {
          // Timer finished - will be handled in useEffect
          return { ...prev, currentTime: prev.targetTime || 0 };
        }

        return { ...prev, currentTime: newTime };
      });

      // Interval beeping: beep every intervalDuration seconds
      if (elapsed > 0 && elapsed % appSettings.intervalDuration === 0) {
        if (elapsed !== lastBeepIntervalRef.current) {
          if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
            audioService.playIntervalFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.beepVolume);
          }
          lastBeepIntervalRef.current = elapsed;
        }
      }
    }, 100);
  }, [selectedExercise, selectedDuration, appSettings]);

  // Timer Functions
  const startTimer = useCallback(async () => {
    if (!selectedExercise) {
      alert('Please select an exercise first');
      return;
    }

    // Request wake lock to keep screen active at the start
    if (wakeLockSupported) {
      await requestWakeLock();
    }

    // If pre-timer countdown is enabled, start countdown phase
    if (appSettings.preTimerCountdown > 0) {
      // Start countdown phase
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        isCountdown: true,
        countdownTime: appSettings.preTimerCountdown,
        currentTime: 0,
        targetTime: selectedDuration,
        currentExercise: selectedExercise || undefined
      }));

      // Announce countdown start
      if (appSettings.soundEnabled) {
        audioService.announceText(`Get ready for ${selectedExercise.name}. Starting in ${appSettings.preTimerCountdown} seconds`);
      }

      const countdownStartTime = Date.now();

      // Countdown interval
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
        const remaining = appSettings.preTimerCountdown - elapsed;

        if (remaining <= 0) {
          // Countdown finished, start actual timer
          clearInterval(intervalRef.current!);
          startActualTimer();
        } else {
          // Update countdown display
          setTimerState(prev => ({
            ...prev,
            countdownTime: remaining
          }));

          // Beep on each countdown second
          if (remaining <= 3 && elapsed > appSettings.preTimerCountdown - remaining - 1) {
            if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
              audioService.playIntervalFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.beepVolume);
            }
            if (appSettings.soundEnabled) {
              audioService.announceText(remaining.toString());
            }
          }
        }
      }, 100);
    } else {
      // No countdown, start timer immediately
      startActualTimer();
    }
  }, [selectedExercise, selectedDuration, appSettings, wakeLockSupported, requestWakeLock, startActualTimer]);

  const stopTimer = useCallback(async (isCompletion: boolean = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Log the activity for manual stops (not for completions, which are handled separately)
    const { currentTime, currentExercise, isRunning } = timerState;
    if (!isCompletion && isRunning && currentExercise && currentTime > 0) {
      const activityLog: ActivityLog = {
        id: `log-${Date.now()}`,
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        duration: currentTime, // Use actual time completed, not target time
        timestamp: new Date(),
        notes: `Stopped after ${currentTime}s`
      };

      if (consentService.hasConsent()) {
        storageService.saveActivityLog(activityLog);
      }
    }

    // Play stop sound and vibration
    if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
      await audioService.playStopFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
    }

    // Release wake lock when timer stops
    if (wakeLockActive) {
      await releaseWakeLock();
    }

    setTimerState(prev => ({ ...prev, isRunning: false, isCountdown: false, countdownTime: 0 }));
  }, [appSettings, wakeLockActive, releaseWakeLock, timerState]);

  const resetTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Release wake lock when timer resets
    if (wakeLockActive) {
      await releaseWakeLock();
    }

    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      startTime: undefined,
      currentExercise: undefined,
      isCountdown: false,
      countdownTime: 0
    }));
  }, [wakeLockActive, releaseWakeLock]);

  // Handle timer completion
  useEffect(() => {
    const { isRunning, currentTime, targetTime, currentExercise } = timerState;
    
    if (isRunning && targetTime && currentTime >= targetTime) {
      // Timer completed - log with target time and completion note
      if (currentExercise) {
        const activityLog: ActivityLog = {
          id: `log-${Date.now()}`,
          exerciseId: currentExercise.id,
          exerciseName: currentExercise.name,
          duration: targetTime, // Use target time for completed sessions
          timestamp: new Date(),
          notes: `Completed ${targetTime}s interval timer`
        };

        if (consentService.hasConsent()) {
          storageService.saveActivityLog(activityLog);
        }
      }

      // Stop timer (pass true to indicate this is a completion, not manual stop)
      stopTimer(true);

      // Announce completion
      if (appSettings.soundEnabled) {
        audioService.announceText(`Timer completed! Great job on ${currentExercise?.name}`);
      }
    }
  }, [timerState, stopTimer, appSettings.soundEnabled]);

  // Cleanup timer interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Initialize app data after consent
  useEffect(() => {
    const initializeApp = async () => {
      if (hasConsent) {
        try {
          // Register service worker for offline functionality
          console.log('🚀 Initializing PWA capabilities...');
          registerServiceWorker().then((swInfo) => {
            if (swInfo.updateAvailable) {
              console.log('📦 App update available - refresh to update');
              // Could show a toast notification here for updates
            }
          }).catch((error) => {
            console.error('❌ Service worker registration failed:', error);
          });

          // Load exercises from storage or use initial data
          const storedExercises = await storageService.getExercises();
          let allExercises: Exercise[];
          
          if (storedExercises.length === 0) {
            // No stored exercises, use all initial exercises
            for (const exercise of INITIAL_EXERCISES) {
              await storageService.saveExercise(exercise);
            }
            allExercises = INITIAL_EXERCISES;
          } else {
            // Always use the latest exercise definitions from INITIAL_EXERCISES to ensure
            // users get updated exercise types, defaults, and any new exercises
            // This is an AUTOMATIC refresh that preserves user favorites
            const storedIds = new Set(storedExercises.map(ex => ex.id));
            const newExercises = INITIAL_EXERCISES.filter(ex => !storedIds.has(ex.id));
            
            // Update existing exercises with latest data from INITIAL_EXERCISES while preserving favorites
            // Note: This differs from manual refresh which resets ALL data including favorites
            const updatedStoredExercises = storedExercises.map(storedExercise => {
              const latestExercise = INITIAL_EXERCISES.find(ex => ex.id === storedExercise.id);
              if (latestExercise) {
                // Use latest exercise data but preserve user's favorite status (automatic refresh)
                return {
                  ...latestExercise,
                  isFavorite: storedExercise.isFavorite
                };
              }
              return storedExercise; // Keep old exercise if not found in latest data
            });
            
            // Save updated exercises back to storage
            for (const exercise of updatedStoredExercises) {
              await storageService.saveExercise(exercise);
            }
            
            // Save any new exercises to storage
            for (const exercise of newExercises) {
              await storageService.saveExercise(exercise);
            }
            
            // Combine updated and new exercises
            allExercises = [...updatedStoredExercises, ...newExercises];
          }
          setExercises(allExercises);

          // Load app settings
          const storedSettings = await storageService.getAppSettings();
          const settingsToSet = storedSettings || DEFAULT_APP_SETTINGS;
          
          if (!storedSettings) {
            await storageService.saveAppSettings(DEFAULT_APP_SETTINGS);
          }
          setAppSettings(settingsToSet);

          // Set last selected exercise
          if (settingsToSet.lastSelectedExerciseId) {
            const lastExercise = allExercises.find(
              (ex: Exercise) => ex.id === settingsToSet.lastSelectedExerciseId
            );
            if (lastExercise) {
              setSelectedExercise(lastExercise);
            }
          }
        } catch (error) {
          console.error('Failed to initialize app data:', error);
          // Fallback to initial exercises
          setExercises(INITIAL_EXERCISES);
        }
      }
      setIsLoading(false);
    };

    initializeApp();
  }, [hasConsent]);

  // Listen for consent changes
  useEffect(() => {
    const handleConsentGranted = () => {
      setHasConsent(true);
    };

    const handleConsentRevoked = () => {
      setHasConsent(false);
      setExercises([]);
      setAppSettings(DEFAULT_APP_SETTINGS);
    };

    window.addEventListener('consent-granted', handleConsentGranted);
    window.addEventListener('consent-revoked', handleConsentRevoked);

    // Preload critical routes after initial setup
    preloadCriticalRoutes();

    return () => {
      window.removeEventListener('consent-granted', handleConsentGranted);
      window.removeEventListener('consent-revoked', handleConsentRevoked);
    };
  }, []);

  // Handle consent banner
  const handleConsentGranted = () => {
    setHasConsent(true);
  };

  const handleSetSelectedExercise = (exercise: Exercise | null) => {
    setSelectedExercise(exercise);
    updateAppSettings({ lastSelectedExerciseId: exercise ? exercise.id : null });
  };

  // Update exercise favorite status
  const toggleExerciseFavorite = async (exerciseId: string) => {
    if (!hasConsent) return;

    try {
      await storageService.toggleExerciseFavorite(exerciseId);
      setExercises(prev => 
        prev.map(exercise => 
          exercise.id === exerciseId 
            ? { ...exercise, isFavorite: !exercise.isFavorite }
            : exercise
        )
      );
    } catch (error) {
      console.error('Failed to toggle exercise favorite:', error);
    }
  };

  // Update app settings
  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    if (!hasConsent) return;

    const updatedSettings = { ...appSettings, ...newSettings };
    setAppSettings(updatedSettings);

    try {
      await storageService.saveAppSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  };

  // Apply dark mode to document
  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.darkMode]);

  // Show consent banner if no consent
  if (!hasConsent) {
    return <ConsentBanner onConsentGranted={handleConsentGranted} />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading RepCue...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ChunkErrorBoundary>
        <AppShell>
          <Suspense fallback={createRouteLoader('page')}>
            <Routes>
              <Route 
                path={AppRoutes.HOME} 
                element={
                  <Suspense fallback={createRouteLoader('Home')}>
                    <HomePage 
                      exercises={exercises}
                      appSettings={appSettings}
                      onToggleFavorite={toggleExerciseFavorite}
                    />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.EXERCISES} 
                element={
                  <Suspense fallback={createRouteLoader('Exercises')}>
                    <ExercisePage 
                      exercises={exercises}
                      onToggleFavorite={toggleExerciseFavorite}
                    />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.WORKOUTS} 
                element={
                  <Suspense fallback={createRouteLoader('Workouts')}>
                    <WorkoutsPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.CREATE_WORKOUT} 
                element={
                  <Suspense fallback={createRouteLoader('Create Workout')}>
                    <CreateWorkoutPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.EDIT_WORKOUT} 
                element={
                  <Suspense fallback={createRouteLoader('Edit Workout')}>
                    <EditWorkoutPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.TIMER} 
                element={
                  <Suspense fallback={createRouteLoader('Timer')}>
                    <TimerPageWrapper 
                  exercises={exercises}
                  appSettings={appSettings}
                  timerState={timerState}
                  selectedExercise={selectedExercise}
                  selectedDuration={selectedDuration}
                  showExerciseSelector={showExerciseSelector}
                  wakeLockSupported={wakeLockSupported}
                  wakeLockActive={wakeLockActive}
                      onSetSelectedExercise={handleSetSelectedExercise}
                      onSetSelectedDuration={setSelectedDuration}
                      onSetShowExerciseSelector={setShowExerciseSelector}
                      onStartTimer={startTimer}
                      onStopTimer={stopTimer}
                      onResetTimer={resetTimer}
                    />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.ACTIVITY_LOG} 
                element={
                  <Suspense fallback={createRouteLoader('Activity Log')}>
                    <ActivityLogPage exercises={exercises} />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.SETTINGS} 
                element={
                  <Suspense fallback={createRouteLoader('Settings')}>
                    <SettingsPage 
                      appSettings={appSettings}
                      onUpdateSettings={updateAppSettings}
                    />
                  </Suspense>
                } 
              />
              {/* Redirect any unknown routes to home */}
              <Route path="*" element={<Navigate to={AppRoutes.HOME} replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </ChunkErrorBoundary>
    </Router>
  );
}

export default App;
