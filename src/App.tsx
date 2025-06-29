import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService } from './services/storageService';
import { audioService } from './services/audioService';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import ConsentBanner from './components/ConsentBanner';
import Navigation from './components/Navigation';
import type { Exercise, AppSettings, TimerState, ActivityLog } from './types';
import { Routes as AppRoutes } from './types';
import { DEFAULT_APP_SETTINGS, type TimerPreset } from './constants';

// Lazy load components for better performance
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const ExercisePage = lazy(() => import('./pages/ExercisePage'));
const TimerPage = lazy(() => import('./pages/TimerPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

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
    currentExercise: undefined
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

  // Timer Functions
  const startTimer = useCallback(async () => {
    if (!selectedExercise) {
      alert('Please select an exercise first');
      return;
    }

    // Play start sound and vibration
    if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
      await audioService.playStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
    }

    // Announce start if sound enabled
    if (appSettings.soundEnabled) {
      audioService.announceText(`Starting ${selectedExercise.name} timer for ${selectedDuration} seconds`);
    }

    const startTime = Date.now();
    lastBeepIntervalRef.current = 0; // Reset interval counter

    // Request wake lock to keep screen active
    if (wakeLockSupported) {
      await requestWakeLock();
    }

    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      currentTime: 0,
      targetTime: selectedDuration,
      startTime: new Date(),
      currentExercise: selectedExercise
    }));

    // Start the timer interval
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
  }, [selectedExercise, selectedDuration, appSettings, wakeLockSupported, requestWakeLock]);

  const stopTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Play stop sound and vibration
    if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
      await audioService.playStopFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
    }

    // Release wake lock when timer stops
    if (wakeLockActive) {
      await releaseWakeLock();
    }

    setTimerState(prev => ({ ...prev, isRunning: false }));
  }, [appSettings, wakeLockActive, releaseWakeLock]);

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
      currentExercise: undefined
    }));
  }, [wakeLockActive, releaseWakeLock]);

  // Handle timer completion
  useEffect(() => {
    const { isRunning, currentTime, targetTime, currentExercise } = timerState;
    
    if (isRunning && targetTime && currentTime >= targetTime) {
      // Timer completed
      stopTimer();
      
      // Log the activity
      if (currentExercise) {
        const activityLog: ActivityLog = {
          id: `log-${Date.now()}`,
          exerciseId: currentExercise.id,
          exerciseName: currentExercise.name,
          duration: targetTime,
          timestamp: new Date(),
          notes: `${targetTime}s interval timer`
        };

        storageService.saveActivityLog(activityLog);
      }

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
          // Load exercises from storage or use initial data
          const storedExercises = await storageService.getExercises();
          const exercisesToSet = storedExercises.length > 0 ? storedExercises : INITIAL_EXERCISES;

          if (storedExercises.length === 0) {
            for (const exercise of INITIAL_EXERCISES) {
              await storageService.saveExercise(exercise);
            }
          }
          setExercises(exercisesToSet);

          // Load app settings
          const storedSettings = await storageService.getAppSettings();
          const settingsToSet = storedSettings || DEFAULT_APP_SETTINGS;
          
          if (!storedSettings) {
            await storageService.saveAppSettings(DEFAULT_APP_SETTINGS);
          }
          setAppSettings(settingsToSet);

          // Set last selected exercise
          if (settingsToSet.lastSelectedExerciseId) {
            const lastExercise = exercisesToSet.find(
              (ex) => ex.id === settingsToSet.lastSelectedExerciseId
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Skip link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
        >
          Skip to main content
        </a>

        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route 
              path={AppRoutes.HOME} 
              element={
                <HomePage 
                  exercises={exercises}
                  appSettings={appSettings}
                  onToggleFavorite={toggleExerciseFavorite}
                />
              } 
            />
            <Route 
              path={AppRoutes.EXERCISES} 
              element={
                <ExercisePage 
                  exercises={exercises}
                  onToggleFavorite={toggleExerciseFavorite}
                />
              } 
            />
            <Route 
              path={AppRoutes.TIMER} 
              element={
                <TimerPage 
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
              } 
            />
            <Route 
              path={AppRoutes.ACTIVITY_LOG} 
              element={<ActivityLogPage exercises={exercises} />} 
            />
            <Route 
              path={AppRoutes.SETTINGS} 
              element={
                <SettingsPage 
                  appSettings={appSettings}
                  onUpdateSettings={updateAppSettings}
                />
              } 
            />
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Navigate to={AppRoutes.HOME} replace />} />
          </Routes>
        </Suspense>
        
        {/* Bottom Navigation */}
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
