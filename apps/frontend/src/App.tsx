import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService, StorageService } from './services/storageService';
import { audioService } from './services/audioService';
import { syncService } from './services/syncService';
import { authService } from './services/authService';
import { forceUpdateService } from './services/forceUpdateService';
import { updateService } from './services/updateService';
import { AnalyticsService } from './services/analyticsService';
import { legalDocsService } from './services/legalDocsService';
import { legalUpdateService } from './services/legalUpdateService';
import { supabase, supabaseFunctionBaseUrl } from './config/supabase';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import { useAuth } from './hooks/useAuth';
import { useSharedExercises } from './hooks/useSharedExercises';
import { useSnackbar } from './components/SnackbarProvider';
import { useTranslation } from 'react-i18next';
import ConsentBanner from './components/ConsentBanner';
import { LegalGate } from './components/legal/LegalGate';
import MigrationSuccessBanner from './components/MigrationSuccessBanner';
import AppShell from './components/AppShell';
import ScrollToTop from './components/ScrollToTop';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthModal } from './components/auth/AuthModal';
import { ForceUpdateModal } from './components/ForceUpdateModal';
import { UpdateNotificationManager } from './components/UpdateNotificationManager';
import { WorkoutForceUpdateModal } from './components/WorkoutForceUpdateModal';
import { registerServiceWorker } from './utils/serviceWorker';
import { registerPWALinkHandlers } from './utils/pwaDetection';
import type { Exercise, AppSettings, TimerState, ActivityLog, WorkoutExercise, WorkoutSession } from './types';
import type { UpdateInfo, UpdateError } from './types';
import type { PersonalRecord } from './types/coaching';
import { Routes as AppRoutes } from './types';
import { DEFAULT_APP_SETTINGS, BASE_REP_TIME, REST_TIME_BETWEEN_SETS, type TimerPreset } from './constants';
import { computeWorkoutDurations } from './utils/workoutDuration';
import { getExerciseDurationFromMedia } from './utils/loadExerciseMedia';
import i18n from './i18n';
import logger from './utils/logger';
import { isCustom } from './utils/syncFilters';
import { celebrateWorkoutComplete, celebrateMilestone } from './utils/microInteractions';
import { calculateCurrentStreak } from './utils/activityCharts';

// Enhanced lazy loading with error boundaries and preloading
import { Suspense } from 'react';
import {
  HomePage,
  ExercisePage,
  CreateExercisePage,
  EditExercisePage,
  ExerciseDetailPage,
  TimerPage,
  SettingsPage,
  WorkoutsPage,
  CreateWorkoutPage,
  EditWorkoutPage,
  CommunityPage,
  CoachPage,
  PRHistoryPage,
  AuthCallbackPage,
  ProfilePage,
  AIWorkoutOnboardingPage,
  LegalCenterPage,
  ChunkErrorBoundary,
} from './router/LazyRoutes';
import DevToolsPage from './pages/DevToolsPage';
import { preloadCriticalRoutes, createRouteLoader } from './router/routeUtils';
import { PRCelebration } from './components/coaching/PRCelebration';
import { PostWorkoutSurvey } from './components/PostWorkoutSurvey';
import type { SurveyResponse } from './components/PostWorkoutSurvey';

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
  onStartWorkoutMode: (workoutData: { workoutId: string; workoutName: string; exercises: WorkoutExercise[] }) => Promise<void>;
  onUpdateSettings?: (patch: Partial<AppSettings>) => void;
}> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { onSetSelectedExercise, onSetSelectedDuration, onStartTimer, onStartWorkoutMode, timerState, exercises } = props;
  const processedStateRef = React.useRef<string | null>(null);
  const processedUrlParamsRef = React.useRef<string | null>(null);

  // Handle URL search params (from coaching recommendations)
  useEffect(() => {
    if (timerState.isRunning) return; // Don't change settings while timer is running

    const searchParams = new URLSearchParams(location.search);
    const exerciseId = searchParams.get('exerciseId');
    const sets = searchParams.get('sets');
    const reps = searchParams.get('reps');
    const duration = searchParams.get('duration');

    // Create a unique key for these params
    const paramsKey = `${exerciseId}-${sets}-${reps}-${duration}`;

    // Only process if we have an exerciseId and haven't processed these params yet
    if (exerciseId && processedUrlParamsRef.current !== paramsKey) {
      processedUrlParamsRef.current = paramsKey;

      // Find the exercise
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        logger.log('[TimerPageWrapper] Setting exercise from URL params:', {
          exerciseId,
          sets,
          reps,
          duration
        });

        // Set the exercise
        onSetSelectedExercise(exercise);

        // Set duration if provided (for time-based exercises)
        if (duration) {
          const durationNum = parseInt(duration, 10);
          if (!isNaN(durationNum)) {
            onSetSelectedDuration(durationNum as TimerPreset);
          }
        }

        // Auto-start timer after a brief delay
        const timer = setTimeout(() => {
          onStartTimer();
        }, 200);

        return () => clearTimeout(timer);
      }
    }
  }, [location.search, exercises, onSetSelectedExercise, onSetSelectedDuration, onStartTimer, timerState.isRunning]);

  // Handle navigation state from ExercisePage or HomePage
  useEffect(() => {
    const state = location.state as { 
      selectedExercise?: Exercise; 
      selectedDuration?: number;
      // Accept both naming styles for compatibility
      workoutMode?: { workoutId?: string; workoutName?: string; workout_id?: string; workout_name?: string; exercises: WorkoutExercise[] };
    } | null;
    
    // Handle workout mode navigation
    if (state?.workoutMode && !timerState.isRunning && !timerState.workoutMode) {
      const wm = state.workoutMode;
      const normalized = {
        workoutId: wm.workoutId ?? wm.workout_id!,
        workoutName: wm.workoutName ?? wm.workout_name!,
        exercises: wm.exercises
      };
      onStartWorkoutMode(normalized);
      return;
    }
    
    // Handle single exercise navigation
    const stateKey = state?.selectedExercise?.id || null;
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
  }, [location.state, onSetSelectedExercise, onSetSelectedDuration, onStartTimer, onStartWorkoutMode, timerState.isRunning, timerState.workoutMode]);

  const handleResetTimer = useCallback(async () => {
    // If we're in workout mode, navigate back to workouts page
    if (timerState.workoutMode) {
      navigate(AppRoutes.WORKOUTS, { replace: true });
    }
    
    // Call the original reset timer function
    await props.onResetTimer();
  }, [timerState.workoutMode, navigate, props]);

  return <TimerPage {...props} onResetTimer={handleResetTimer} />;
};

// Setup sync triggers for various app lifecycle events
const setupSyncTriggers = () => {
  // Trigger sync on page visibility change (app foreground)
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      logger.log('📱 App came to foreground - triggering sync');
      syncService.sync(true).catch(error => {
        logger.warn('Foreground sync failed:', error);
      });
    }
  };

  // Setup periodic sync (every 5 minutes when active)
  const syncInterval: { current: NodeJS.Timeout | null } = { current: null };
  const setupPeriodicSync = () => {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
    }
    
    // Re-enabled periodic sync every 5 minutes when active
    syncInterval.current = setInterval(() => {
      if (!document.hidden) {
        logger.log('⏰ Periodic sync triggered');
        syncService.sync(true).catch(error => {
          logger.warn('Periodic sync failed:', error);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
    logger.log('⏰ Periodic sync re-enabled');
  };

  // Trigger sync when coming back online
  const handleOnline = () => {
    logger.log('🌐 Connection restored - triggering sync');
    syncService.sync(true).catch(error => {
      logger.warn('Online sync failed:', error);
    });
  };

  // Setup event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleOnline);
  setupPeriodicSync();

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
    }
  };
};

function App() {
  const autoConsent = typeof window !== 'undefined' && (window as Window & { __AUTO_CONSENT__?: boolean }).__AUTO_CONSENT__ === true;
  const [hasConsent, setHasConsent] = useState<boolean>(autoConsent ? true : consentService.hasConsent());
  const [isLoading, setIsLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showForceUpdateModal, setShowForceUpdateModal] = useState(false);
  const [forceUpdateData, setForceUpdateData] = useState<UpdateInfo | null>(null);
  const [showWorkoutForceUpdateModal, setShowWorkoutForceUpdateModal] = useState(false);
  const [workoutForceUpdateData, setWorkoutForceUpdateData] = useState<UpdateInfo | null>(null);
  
  // Legal documents state
  const [showLegalGate, setShowLegalGate] = useState(false);
  
  // Authentication state
  // Auth state consumed indirectly via sync:applied listener
  const { user } = useAuth();
  const { isSharedExercise } = useSharedExercises();
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation(['common', 'exercises']);
  
  // PR celebration state
  const [newPR, setNewPR] = useState<PersonalRecord | null>(null);
  const [showPRCelebration, setShowPRCelebration] = useState(false);

  // Streak milestone tracking state
  const [lastCelebratedStreak, setLastCelebratedStreak] = useState<number>(0);
  
  // Post-workout survey state
  const [showPostWorkoutSurvey, setShowPostWorkoutSurvey] = useState(false);
  const [surveyActivityLog, setSurveyActivityLog] = useState<ActivityLog | null>(null);

  // Handle pending share token after authentication
  useEffect(() => {
    const handlePendingShareToken = async () => {
      const pendingToken = sessionStorage.getItem('pendingShareToken');
      if (pendingToken && user && hasConsent && !isLoading) {
        // User is now authenticated, try to save the shared exercise
        logger.log(`[init] User authenticated, processing pending shared exercise: ${pendingToken}`);

        // Temporarily set a URL parameter to trigger the save logic
        const url = new URL(window.location.href);
        url.searchParams.set('saveSharedExercise', pendingToken);
        window.history.replaceState({}, document.title, url.toString());

        // The handleSharedExerciseSave effect will pick this up automatically
      }
    };

    handlePendingShareToken();
  }, [user, hasConsent, isLoading]);

  // Persistent Timer State
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    currentTime: 0,
    intervalDuration: 30,
    currentExercise: undefined,
    isCountdown: false,
    countdownTime: 0,
    isResting: false,
    restTimeRemaining: undefined
  });

  // Helper function to check if we're on a shared exercise route that doesn't require consent
  // Check if current route should be accessible without consent (public routes + legal center)
  const isPublicOrLegalRoute = useCallback(() => {
    if (typeof window !== 'undefined' && window.location) {
      const path = window.location.pathname;
      return path.startsWith('/share/') || path === '/legal';
    }
    return false;
  }, []);

  // Force Update Service Integration
  useEffect(() => {
    // Set timer state reference for workout interruption handling
    forceUpdateService.setTimerStateRef(timerState);
    updateService.setTimerStateRef(timerState);
  }, [timerState]);

  // Force Update Event Handlers
  useEffect(() => {
    const handleForceUpdateAvailable = (data: unknown) => {
      const updateInfo = data as UpdateInfo;
      logger.log('🚨 Force update available in App:', updateInfo);
      setShowForceUpdateModal(true);
      setForceUpdateData(updateInfo);
    };

    const handleForceUpdateCompleted = () => {
      logger.log('✅ Force update completed in App');
      setShowForceUpdateModal(false);
      setForceUpdateData(null);
      setShowWorkoutForceUpdateModal(false);
      setWorkoutForceUpdateData(null);
    };

    const handleForceUpdateFailed = (errorData: unknown) => {
      const error = errorData as UpdateError;
      logger.error('❌ Force update failed in App:', error);
      // Keep modal open to allow retry
    };

    // Handle workout-blocked force updates
    const handleUpdateBlockedWorkoutForce = (data: unknown) => {
      const updateInfo = data as UpdateInfo;
      logger.log('🚨 Force update blocked by active workout:', updateInfo);
      setShowForceUpdateModal(false); // Hide regular force update modal
      setShowWorkoutForceUpdateModal(true);
      setWorkoutForceUpdateData(updateInfo);
    };

    // Register force update event listeners
    forceUpdateService.on('force-update-available', handleForceUpdateAvailable);
    forceUpdateService.on('force-update-completed', handleForceUpdateCompleted);
    forceUpdateService.on('force-update-failed', handleForceUpdateFailed);

    // Register update service workout-aware events
    updateService.on('update-blocked-workout-force', handleUpdateBlockedWorkoutForce);

    return () => {
      forceUpdateService.off('force-update-available', handleForceUpdateAvailable);
      forceUpdateService.off('force-update-completed', handleForceUpdateCompleted);
      forceUpdateService.off('force-update-failed', handleForceUpdateFailed);
      updateService.off('update-blocked-workout-force', handleUpdateBlockedWorkoutForce);
    };
  }, []);



  // Timer UI State
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<TimerPreset>(30);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  // Prevent StrictMode dev double-run of initialization
  const initStartedRef = useRef<boolean>(false);

  // Effect to ensure correct duration for rep-based exercises
  // Reads accurate duration from exercise_media.json instead of globalExercises.ts
  useEffect(() => {
    if (!selectedExercise?.exercise_type || selectedExercise.exercise_type !== 'repetition_based' || !appSettings.rep_speed_factor) {
      return;
    }

    const updateDuration = async () => {
      // Fetch accurate duration from exercise media index
      const mediaDuration = await getExerciseDurationFromMedia(selectedExercise.id);
      const baseRep = mediaDuration ?? selectedExercise.rep_duration_seconds ?? BASE_REP_TIME;
      const repDuration = Math.round(baseRep * appSettings.rep_speed_factor);
      if (selectedDuration !== repDuration) {
        setSelectedDuration(repDuration as TimerPreset);
      }
    };

    updateDuration().catch(err => {
      logger.warn('[timer-duration] Failed to update duration from media:', err);
      // Fallback to original duration calculation
      const baseRep = selectedExercise.rep_duration_seconds ?? BASE_REP_TIME;
      const repDuration = Math.round(baseRep * appSettings.rep_speed_factor);
      if (selectedDuration !== repDuration) {
        setSelectedDuration(repDuration as TimerPreset);
      }
    });
  }, [selectedExercise, appSettings.rep_speed_factor, selectedDuration]);

  // Timer refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const lastBeepIntervalRef = useRef<number>(0);

  // Wake lock for keeping screen active
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();

  // Helper function to create timer intervals with appropriate timing for exercise type
  const createTimerInterval = useCallback((startTime: number, isForRepBasedExercise: boolean = false) => {
    // Use 100ms intervals for rep-based exercises for smooth progress, 1000ms for time-based
    const intervalDuration = isForRepBasedExercise ? 100 : 1000;
    
    return setInterval(() => {
      const elapsed = isForRepBasedExercise 
        ? (Date.now() - startTime) / 1000  // Use decimal seconds for smooth progress
        : Math.floor((Date.now() - startTime) / 1000); // Use whole seconds for time-based
      
  if (!mountedRef.current) return; // do not update after unmount
  setTimerState(prev => {
        // Don't update if timer is not running or target time is not set
        if (!prev.isRunning || !prev.targetTime) {
          return prev;
        }

        const remaining = prev.targetTime - elapsed;

        // Check if timer completed
        if (remaining <= 0) {
          // Timer finished - will be handled in useEffect
          return { ...prev, currentTime: prev.targetTime };
        }

        // Update currentTime - for rep-based exercises, use smooth decimal values
        const newCurrentTime = isForRepBasedExercise ? elapsed : Math.floor(elapsed);
        if (newCurrentTime !== prev.currentTime) {
          return { ...prev, currentTime: newCurrentTime };
        }

        return prev;
      });

      // Interval beeping: beep every intervalDuration seconds (only for whole seconds)
  const wholeSecondsElapsed = Math.floor(elapsed);
      if (wholeSecondsElapsed > 0 && wholeSecondsElapsed % appSettings.interval_duration === 0) {
        if (wholeSecondsElapsed !== lastBeepIntervalRef.current) {
          if (appSettings.sound_enabled || appSettings.vibration_enabled) {
            audioService.playIntervalFeedback(appSettings.sound_enabled, appSettings.vibration_enabled, appSettings.beep_volume);
          }
          lastBeepIntervalRef.current = wholeSecondsElapsed;
        }
      }
    }, intervalDuration);
  }, [appSettings.interval_duration, appSettings.sound_enabled, appSettings.vibration_enabled, appSettings.beep_volume]);

  // Separate function for the actual timer logic
  const startActualTimer = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Play start sound and vibration
    if (appSettings.sound_enabled || appSettings.vibration_enabled) {
      audioService.playStartFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
    }

    // Announce timer start
    if (appSettings.sound_enabled) {
      const actualTargetTime = timerState.targetTime || selectedDuration;
      audioService.announceText(`Timer started! ${actualTargetTime} seconds`);
    }

    const startTime = Date.now();
    lastBeepIntervalRef.current = 0; // Reset interval counter

    // Check if this is a standalone rep-based exercise (not in workout mode)
    const isStandaloneRepBased = selectedExercise?.exercise_type === 'repetition_based' && !timerState.workoutMode;
    
    // For standalone rep-based exercises, set up rep/set tracking
    let repSetState = {};
    if (isStandaloneRepBased) {
      const defaultSets = selectedExercise.default_sets || 3;
      const defaultReps = selectedExercise.default_reps || 8;
      repSetState = {
        currentSet: 0,
        totalSets: defaultSets,
        currentRep: 0,
        totalReps: defaultReps
      };
    }

    // Update timer state to actual timer mode
    setTimerState(prev => {
      // If targetTime is already set (e.g., from workout mode), use it; otherwise use selectedDuration
      const actualTargetTime = prev.targetTime || selectedDuration;
      // logger.log('startActualTimer: Setting targetTime to:', actualTargetTime, 'from prev.targetTime:', prev.targetTime, 'selectedDuration:', selectedDuration);
      
      return {
        ...prev,
        isRunning: true,
        isCountdown: false,
        countdownTime: 0,
        currentTime: 0,
        targetTime: actualTargetTime,
        startTime: new Date(startTime),
        currentExercise: selectedExercise || undefined,
        // Only clear workout mode for standalone exercises (preserve it for workout mode)
        workoutMode: prev.workoutMode || undefined,
        // Clear workout-specific rest state
        isResting: false,
        restTimeRemaining: undefined,
        ...repSetState
      };
    });

    // Start the main timer interval
    // logger.log('startActualTimer: Starting interval with targetTime:', timerState.targetTime || selectedDuration);
    
    // Use the helper function to create appropriate timer interval
    // In workout mode, check the current exercise in the workout; otherwise use selectedExercise
    let isRepBasedExercise = false;
    if (timerState.workoutMode) {
      const currentWorkoutExercise = timerState.workoutMode.exercises[timerState.workoutMode.currentExerciseIndex];
      const currentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
      isRepBasedExercise = currentExercise?.exercise_type === 'repetition_based';
    } else {
      isRepBasedExercise = selectedExercise?.exercise_type === 'repetition_based';
    }
    intervalRef.current = createTimerInterval(startTime, isRepBasedExercise);
  }, [selectedExercise, selectedDuration, appSettings.sound_enabled, appSettings.vibration_enabled, timerState.workoutMode, createTimerInterval, timerState.targetTime, exercises]);

  // Timer Functions
  const startTimer = useCallback(async () => {
    if (!selectedExercise) {
      alert('Please select an exercise first');
      return;
    }

    // Log the rep speed factor value (debug logger respects DEBUG flag)
    logger.log('🎬 [TIMER START] Rep Speed Factor:', appSettings.rep_speed_factor);
    logger.log('🎬 [TIMER START] Video Playback Rate should be:', 1 / appSettings.rep_speed_factor);

    // Request wake lock to keep screen active at the start
    if (wakeLockSupported) {
      await requestWakeLock();
    }

    // If pre-timer countdown is enabled, start countdown phase
    if (appSettings.pre_timer_countdown > 0) {
      // Start countdown phase
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        isCountdown: true,
        countdownTime: appSettings.pre_timer_countdown,
        currentTime: 0,
        targetTime: selectedDuration,
        currentExercise: selectedExercise || undefined,
        // Only clear workout mode for standalone exercises (preserve it for workout mode)
        workoutMode: prev.workoutMode || undefined,
        // Clear workout-specific rest state
        isResting: false,
        restTimeRemaining: undefined
      }));

      // Announce countdown start
      if (appSettings.sound_enabled) {
        audioService.announceText(`Get ready for ${selectedExercise.name}. Starting in ${appSettings.pre_timer_countdown} seconds`);
      }

      const countdownStartTime = Date.now();

      // Countdown interval
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
        const remaining = appSettings.pre_timer_countdown - elapsed;

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
          if (remaining <= 3 && elapsed > appSettings.pre_timer_countdown - remaining - 1) {
            if (appSettings.sound_enabled || appSettings.vibration_enabled) {
              audioService.playIntervalFeedback(appSettings.sound_enabled, appSettings.vibration_enabled, appSettings.beep_volume);
            }
            if (appSettings.sound_enabled) {
              audioService.announceText(remaining.toString());
            }
          }
        }
      }, 100);
    } else {
      // No countdown, start timer immediately
      startActualTimer();
    }
  }, [selectedExercise, selectedDuration, appSettings.pre_timer_countdown, appSettings.sound_enabled, appSettings.vibration_enabled, appSettings.beep_volume, wakeLockSupported, requestWakeLock, startActualTimer]);

  const stopTimer = useCallback(async (isCompletion: boolean = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Log the activity for manual stops (not for completions, which are handled separately)
    const { currentTime, currentExercise, isRunning } = timerState;
    if (!isCompletion && isRunning && currentExercise && currentTime > 0) {
      const activityLog: ActivityLog = {
        id: crypto.randomUUID(),
        exercise_id: currentExercise.id,
        exercise_name: currentExercise.name,
        catalog_id: currentExercise.catalogId,
        duration: Math.round(currentTime), // Round to avoid floating-point precision issues
        timestamp: new Date().toISOString(),
        notes: `Stopped after ${Math.round(currentTime)}s`,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        deleted: false,
        version: 1
      };

      if (consentService.hasConsent()) {
        storageService.saveActivityLog(activityLog);
      }
    }

    // Play stop sound and vibration
    if (appSettings.sound_enabled || appSettings.vibration_enabled) {
      await audioService.playStopFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
    }

    // Release wake lock when timer stops
    if (wakeLockActive) {
      await releaseWakeLock();
    }

    setTimerState(prev => ({ ...prev, isRunning: false, isCountdown: false, countdownTime: 0 }));
  }, [appSettings.sound_enabled, appSettings.vibration_enabled, wakeLockActive, releaseWakeLock, timerState]);

  const resetTimer = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset beep counter
    lastBeepIntervalRef.current = 0;

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
      countdownTime: 0,
      isResting: false,
      restTimeRemaining: undefined,
      // Reset standalone rep/set tracking
      currentSet: undefined,
      totalSets: undefined,
      currentRep: undefined,
      totalReps: undefined,
      workoutMode: undefined
    }));

    // Reset duration to default for the current exercise
    if (selectedExercise) {
      if (selectedExercise.exercise_type === 'time_based') {
        setSelectedDuration(selectedExercise.default_duration as TimerPreset);
      } else if (selectedExercise.exercise_type === 'repetition_based') {
  const baseRep = selectedExercise.rep_duration_seconds || BASE_REP_TIME;
  const repDuration = Math.round(baseRep * appSettings.rep_speed_factor);
        setSelectedDuration(repDuration as TimerPreset);
      }
    }
  }, [wakeLockActive, releaseWakeLock, selectedExercise, appSettings.rep_speed_factor]);

  // Workout Force Update Event Handlers
  useEffect(() => {
    const handleForceUpdateCompleteWorkout = async (event: Event) => {
      const customEvent = event as CustomEvent;
      logger.log('🔄 Force update requesting workout completion:', customEvent.detail);
      try {
        // If there's an active workout, save it and stop the timer
        if (timerState.workoutMode && timerState.isRunning) {
          await stopTimer(true); // true = completion
        } else if (timerState.isRunning) {
          // Single exercise timer - just stop it
          await stopTimer(true);
        }
        logger.log('✅ Workout completed for force update');
      } catch (error) {
        logger.error('❌ Failed to complete workout for force update:', error);
      }
    };

    const handleForceUpdateAbandonWorkout = async (event: Event) => {
      const customEvent = event as CustomEvent;
      logger.log('🔄 Force update requesting workout abandonment:', customEvent.detail);
      try {
        // Stop timer without saving/completion
        if (timerState.isRunning) {
          await resetTimer(); // Reset clears everything
        }
        // Clear workout mode
        setTimerState(prev => ({
          ...prev,
          workoutMode: undefined,
          isResting: false,
          restTimeRemaining: undefined,
          currentSet: undefined,
          totalSets: undefined,
          currentRep: undefined,
          totalReps: undefined
        }));
        logger.log('✅ Workout abandoned for force update');
      } catch (error) {
        logger.error('❌ Failed to abandon workout for force update:', error);
      }
    };

    // Add global event listeners for force update workout handling
    window.addEventListener('force-update-complete-workout', handleForceUpdateCompleteWorkout as EventListener);
    window.addEventListener('force-update-abandon-workout', handleForceUpdateAbandonWorkout as EventListener);

    return () => {
      window.removeEventListener('force-update-complete-workout', handleForceUpdateCompleteWorkout as EventListener);
      window.removeEventListener('force-update-abandon-workout', handleForceUpdateAbandonWorkout as EventListener);
    };
  }, [timerState, stopTimer, resetTimer]);

  // Start workout-guided timer mode
  const startWorkoutMode = useCallback(async (workoutData: { workoutId: string; workoutName: string; exercises: WorkoutExercise[] }) => {
    if (!workoutData.exercises || workoutData.exercises.length === 0) {
      alert('This workout has no exercises');
      return;
    }

    // Create a new workout session for logging
  const sessionId = crypto.randomUUID();
    
    // Initialize workout mode state
    setTimerState(prev => ({
      ...prev,
      workoutMode: {
        workoutId: workoutData.workoutId,
        workoutName: workoutData.workoutName,
        exercises: workoutData.exercises,
        currentExerciseIndex: 0,
        isResting: false,
        sessionId
      },
      isRunning: false,
      currentTime: 0,
      targetTime: undefined,
      isCountdown: false,
      countdownTime: 0
    }));

    // Find the first exercise and load it
    const firstWorkoutExercise = workoutData.exercises[0];
    const firstExercise = exercises.find(ex => ex.id === firstWorkoutExercise.exercise_id);
    
    if (firstExercise) {
      setSelectedExercise(firstExercise);
      
      // Set duration/reps based on exercise type and custom values
      if (firstExercise.exercise_type === 'time_based') {
        const duration = firstWorkoutExercise.custom_duration || firstExercise.default_duration || 30;
        setSelectedDuration(duration as TimerPreset);
      } else if (firstExercise.exercise_type === 'repetition_based') {
        // For rep-based exercises, we'll use a timer for each repetition
        const sets = firstWorkoutExercise.custom_sets || firstExercise.default_sets || 1;
        const reps = firstWorkoutExercise.custom_reps || firstExercise.default_reps || 10;
        const repBase = firstExercise.rep_duration_seconds || BASE_REP_TIME;
        const repDuration = Math.round(repBase * appSettings.rep_speed_factor);

        setTimerState(prev => ({
          ...prev,
          workoutMode: prev.workoutMode ? {
            ...prev.workoutMode,
            currentSet: 0,
            totalSets: sets,
            currentRep: 0,
            totalReps: reps
          } : prev.workoutMode
        }));

        setSelectedDuration(repDuration as TimerPreset);
      }
    }

    // Announce workout start
    if (appSettings.sound_enabled) {
      audioService.announceText(`Starting workout: ${workoutData.workoutName}. ${workoutData.exercises.length} exercises planned.`);
    }
  }, [exercises, appSettings.sound_enabled, appSettings.rep_speed_factor]);

  // Advance workout to next exercise or complete workout
  const advanceWorkout = useCallback(async () => {
    const { workoutMode } = timerState;
    if (!workoutMode) return;

    const currentIndex = workoutMode.currentExerciseIndex;
    const isLastExercise = currentIndex >= workoutMode.exercises.length - 1;
    
    // Log individual exercise completion before advancing
    const currentWorkoutExercise = workoutMode.exercises[currentIndex];
    const completedExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
    
    if (completedExercise && consentService.hasConsent()) {
      // Create individual activity log for this exercise
      const sets = currentWorkoutExercise.custom_sets || completedExercise.default_sets || 1;
      const reps = currentWorkoutExercise.custom_reps || completedExercise.default_reps || 10;
      const duration = completedExercise.exercise_type === 'time_based'
        ? (currentWorkoutExercise.custom_duration || completedExercise.default_duration || 30)
        : Math.round(sets * reps * (completedExercise.rep_duration_seconds || BASE_REP_TIME));
      
      const activityLog: ActivityLog = {
        id: crypto.randomUUID(),
        exercise_id: completedExercise.id,
        exercise_name: completedExercise.name,
        catalog_id: completedExercise.catalogId,
        duration,
        timestamp: new Date().toISOString(),
        notes: completedExercise.exercise_type === 'repetition_based'
          ? `Completed ${sets} sets of ${reps} reps in workout: ${workoutMode.workoutName}`
          : `Completed ${duration}s in workout: ${workoutMode.workoutName}`,
        workout_id: workoutMode.workoutId,
        sets_count: completedExercise.exercise_type === 'repetition_based' ? sets : undefined,
        reps_count: completedExercise.exercise_type === 'repetition_based' ? reps : undefined,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        deleted: false,
        version: 1
      };
      
      // Save activity log and check for PR (non-blocking)
      storageService.saveActivityLog(activityLog).then(() => {
        // Check for new PR only for rep-based exercises
        if (completedExercise.exercise_type === 'repetition_based') {
          const analyticsService = AnalyticsService.getInstance();
          analyticsService.checkForNewPR(
            completedExercise.id,
            reps,
            sets,
            duration
          ).then(pr => {
            if (pr) {
              setNewPR(pr);
              setShowPRCelebration(true);
            }
          }).catch(error => {
            logger.error('Failed to check for PR in workout:', error);
          });
        }
      }).catch(error => {
        logger.error('Failed to save individual exercise activity log:', error);
      });
    }
    
    // logger.log('advanceWorkout called:', {
    //   currentIndex,
    //   totalExercises: workoutMode.exercises.length,
    //   isLastExercise,
    //   workoutName: workoutMode.workoutName
    // });

    if (isLastExercise) {
      // Workout completed
      logger.log('🎉 Workout completed! Logging workout session...');
      // logger.log('🔍 About to check consent and session for workout logging...');
      if (appSettings.sound_enabled) {
        audioService.announceText(`Workout completed! Great job on ${workoutMode.workoutName}`);
      }

      // Celebrate workout completion with confetti
      celebrateWorkoutComplete(appSettings.celebration_sounds_enabled);

      // Save workout session completion
      const hasConsent = consentService.hasConsent();
      const hasSessionId = !!workoutMode.sessionId;
      // logger.log('Workout completion - consent check:', {
      //   hasConsent,
      //   hasSessionId,
      //   sessionId: workoutMode.sessionId
      // });
      
      if (hasConsent && hasSessionId) {
  logger.log('✅ Creating workout session for logging...');
  // Compute total workout duration consistent with Activity Log aggregation
  const { total: totalWorkoutDuration } = computeWorkoutDurations(workoutMode.exercises, exercises, appSettings);

        const workoutSession: WorkoutSession = {
          id: workoutMode.sessionId!,
          workout_id: workoutMode.workoutId,
          workout_name: workoutMode.workoutName,
          // Best-effort start time based on aggregated duration
          start_time: new Date(Date.now() - (totalWorkoutDuration * 1000)).toISOString(),
          end_time: new Date().toISOString(),
          exercises: [], // TODO: Track individual exercise completion in Phase 5
          is_completed: true,
          completion_percentage: 100,
          total_duration: totalWorkoutDuration,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          deleted: false,
          version: 1
        };
        
        try {
          // logger.log('💾 Saving workout session to storage...', workoutSession);
          await storageService.saveWorkoutSession(workoutSession);
          // logger.log('✅ Workout session saved successfully');
          
          // Create a single workout activity log entry for the activity log page
          // logger.log('📝 Creating workout activity log entry...');
          const { perExercise, total: totalWorkoutDuration } = computeWorkoutDurations(workoutMode.exercises, exercises, appSettings);
          const exerciseNameById = new Map(exercises.map(ex => [ex.id, ex.name]));
          
          const workoutActivityLog: ActivityLog = {
            id: crypto.randomUUID(),
            exercise_id: crypto.randomUUID(),
            exercise_name: workoutMode.workoutName,
            duration: totalWorkoutDuration,
            timestamp: new Date().toISOString(),
            notes: `Workout completed with ${workoutMode.exercises.length} exercises`,
            workout_id: workoutMode.workoutId,
            is_workout: true,
            exercises: perExercise.map(d => ({
              exercise_id: d.exercise_id,
              exercise_name: exerciseNameById.get(d.exercise_id) || 'Unknown Exercise',
              duration: d.duration,
              ...(d.sets ? { sets: d.sets } : {}),
              ...(d.reps ? { reps: d.reps } : {})
            })),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            deleted: false,
            version: 1
          };
          
          logger.log(`📝 Saving workout activity log:`, workoutActivityLog);
          await storageService.saveActivityLog(workoutActivityLog);

          // Check for streak milestones after saving activity log
          try {
            const activityLogs = await storageService.getActivityLogs();
            const currentStreak = calculateCurrentStreak(activityLogs);
            
            // Check if reached new milestone
            const MILESTONES = [3, 7, 14, 30, 60, 90, 100, 365];
            if (MILESTONES.includes(currentStreak) && currentStreak > lastCelebratedStreak) {
              logger.log(`🔥 Streak milestone reached: ${currentStreak} days!`);
              celebrateMilestone(appSettings.celebration_sounds_enabled);
              setLastCelebratedStreak(currentStreak);
              
              // Show snackbar notification
              showSnackbar(
                t('common:streakMilestone', { 
                  defaultValue: '🔥 {{days}}-day streak milestone!', 
                  days: currentStreak 
                }),
                { type: 'success' }
              );
            }
          } catch (error) {
            logger.error('Failed to check streak milestone:', error);
          }

          // Show post-workout survey if enabled
          if (appSettings.coach_post_workout_survey_enabled) {
            logger.log('📋 Showing post-workout survey');
            setSurveyActivityLog(workoutActivityLog);
            setShowPostWorkoutSurvey(true);
          }
        } catch (error) {
          logger.error('❌ Failed to save workout session or activity logs:', error);
        }
      } else {
        logger.warn('❌ Workout session not saved:', {
          reason: !hasConsent ? 'No consent' : 'No session ID',
          hasConsent,
          hasSessionId
        });
      }

      // Update timer state to show workout completion and immediately clear problematic state
      logger.debug('🔧 Setting timer state to cleared mode and clearing exercise state');
      setTimerState(prev => {
        // logger.debug('🔧 BEFORE workout completion state update:', {
        //   workoutMode: !!prev.workoutMode,
        //   workoutModeData: prev.workoutMode ? {
        //     currentExerciseIndex: prev.workoutMode.currentExerciseIndex,
        //     exercises: prev.workoutMode.exercises.length
        //   } : null
        // });
        
        const newState = {
          ...prev,
          workoutMode: undefined, // Clear workout mode completely
          isRunning: false,
          // Immediately clear ALL exercise-related state to prevent stale data when user selects new exercise
          currentSet: undefined,
          totalSets: undefined,
          currentRep: undefined,
          totalReps: undefined,
          currentTime: 0,
          targetTime: undefined,
          startTime: undefined,
          currentExercise: undefined,
          isCountdown: false,
          countdownTime: 0,
          restTimeRemaining: undefined
        };
        
        // logger.debug('🔧 AFTER workout completion state update:', {
        //   workoutMode: !!newState.workoutMode,
        //   currentExercise: 'cleared'
        // });
        
        return newState;
      });

      // Delay full reset to allow UI to show completion state, but clear selected exercise immediately
      setSelectedExercise(null);
      logger.debug('🔧 Cleared selectedExercise, scheduling full reset in 2 seconds');
      setTimeout(async () => {
        logger.debug('🔧 Executing delayed resetTimer after workout completion');
        await resetTimer();
      }, 2000); // 2 second delay to show completion
    } else {
      // Move to next exercise
      const nextExerciseIndex = currentIndex + 1;
      const nextWorkoutExercise = workoutMode.exercises[nextExerciseIndex];
      const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exercise_id);

      if (nextExercise) {
        // Check if we need a rest period
        const currentWorkoutExercise = workoutMode.exercises[currentIndex];
        const restTime = currentWorkoutExercise.custom_rest_time || 30; // Default 30s rest

        if (restTime > 0) {
          // Start rest period
          logger.log('Starting rest period, selectedExercise remains:', selectedExercise?.name);
          setTimerState(prev => ({
            ...prev,
            workoutMode: prev.workoutMode ? {
              ...prev.workoutMode,
              // Don't advance currentExerciseIndex during rest - only when exercise actually starts
              // Keep current index until we actually begin the next exercise
              isResting: true,
              restTimeRemaining: restTime
            } : prev.workoutMode,
            isRunning: true,
            currentTime: 0,
            targetTime: restTime,
            currentExercise: nextExercise, // Update currentExercise to the next exercise during rest
            isCountdown: false,
            countdownTime: 0
          }));

          if (appSettings.sound_enabled) {
            audioService.announceText(`Rest time: ${restTime} seconds. Next exercise: ${nextExercise.name}`);
          }

          // Start the rest timer
          const restStartTime = Date.now();
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          intervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
            
            setTimerState(prev => {
              if (!prev.isRunning || !prev.targetTime) {
                return prev;
              }

              const remaining = prev.targetTime - elapsed;

              if (remaining <= 0) {
                // Rest timer completed - will be handled in useEffect
                return { ...prev, currentTime: prev.targetTime };
              }

              // Update rest time remaining
              if (prev.workoutMode?.isResting) {
                return { 
                  ...prev, 
                  currentTime: elapsed,
                  workoutMode: prev.workoutMode ? {
                    ...prev.workoutMode,
                    restTimeRemaining: Math.max(0, remaining)
                  } : prev.workoutMode
                };
              }

              return prev;
            });
          }, 1000);
        } else {
          // No rest, go directly to next exercise
          setSelectedExercise(nextExercise);
          setTimerState(prev => ({
            ...prev,
            workoutMode: prev.workoutMode ? {
              ...prev.workoutMode,
              currentExerciseIndex: nextExerciseIndex,
              isResting: false
            } : prev.workoutMode,
            isRunning: false,
            currentTime: 0,
            targetTime: undefined
          }));

          // Set duration/reps for next exercise
          if (nextExercise.exercise_type === 'time_based') {
            const duration = nextWorkoutExercise.custom_duration || nextExercise.default_duration || 30;
            setSelectedDuration(duration as TimerPreset);
          } else if (nextExercise.exercise_type === 'repetition_based') {
            const sets = nextWorkoutExercise.custom_sets || nextExercise.default_sets || 1;
            const reps = nextWorkoutExercise.custom_reps || nextExercise.default_reps || 10;
            const repBase = nextExercise.rep_duration_seconds || BASE_REP_TIME;
            const repDuration = Math.round(repBase * appSettings.rep_speed_factor);
            
            setTimerState(prev => ({
              ...prev,
              workoutMode: prev.workoutMode ? {
                ...prev.workoutMode,
                currentSet: 1,
                totalSets: sets,
                currentRep: 1,
                totalReps: reps
              } : prev.workoutMode
            }));
            
            setSelectedDuration(repDuration as TimerPreset);
          }

          if (appSettings.sound_enabled) {
            audioService.announceText(`Next exercise: ${nextExercise.name}`);
          }
        }
      }
    }
  }, [timerState, selectedExercise?.name, exercises, appSettings, resetTimer]);

  // Handle timer completion
  useEffect(() => {
    const { isRunning, currentTime, targetTime, currentExercise, workoutMode } = timerState;
    
    // Only process completion when timer reaches target time exactly (not exceeded)
    if (isRunning && targetTime && currentTime === targetTime && !timerState.isCountdown) {
      // Clear the interval first to prevent further updates
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // logger.log('Timer completion useEffect triggered for:', currentExercise?.name || 'unknown exercise');
      // logger.debug('🔧 Timer completion debug state:', {
      //   currentExercise: currentExercise?.name,
      //   workoutMode: !!workoutMode,
      //   workoutModeData: workoutMode ? {
      //     currentExerciseIndex: workoutMode.currentExerciseIndex,
      //     totalExercises: workoutMode.exercises.length,
      //     isResting: workoutMode.isResting
      //   } : null,
      //   timerState: {
      //     currentSet: timerState.currentSet,
      //     totalSets: timerState.totalSets,
      //     currentRep: timerState.currentRep,
      //     totalReps: timerState.totalReps,
      //     isRunning,
      //     currentTime,
      //     targetTime
      //   }
      // });
      
      if (workoutMode) {
        // Get the actual current exercise from workout mode for accurate logging
        // const currentWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
        // const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
        // logger.log('Actual current exercise from workout mode:', actualCurrentExercise?.name);
        // logger.log('Workout state:', {
        //   currentExerciseIndex: workoutMode.currentExerciseIndex,
        //   totalExercises: workoutMode.exercises.length,
        //   isResting: workoutMode.isResting,
        //   selectedExerciseName: currentExercise?.name,
        //   actualExerciseName: actualCurrentExercise?.name
        // });
        
        if (workoutMode.isResting) {
          // Rest period completed, start next exercise automatically
          // Calculate next exercise index since currentExerciseIndex still points to completed exercise
          const nextExerciseIndex = workoutMode.currentExerciseIndex + 1;
          
          // Check if workout is complete
          if (nextExerciseIndex >= workoutMode.exercises.length) {
            logger.log('🎉 Workout completed after rest period!');
            advanceWorkout();
            return;
          }
          
          const nextWorkoutExercise = workoutMode.exercises[nextExerciseIndex];
          const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exercise_id);
          
          if (nextExercise) {
            logger.log('Rest completed, changing selectedExercise from', selectedExercise?.name, 'to', nextExercise.name);
            setSelectedExercise(nextExercise);

            // Set duration/reps for next exercise
            if (nextExercise.exercise_type === 'time_based') {
              const duration = nextWorkoutExercise.custom_duration || nextExercise.default_duration || 30;
              // logger.log('Setting duration for', nextExercise.name, ':', {
              //   custom_duration: nextWorkoutExercise.custom_duration,
              //   default_duration: nextExercise.default_duration,
              //   finalDuration: duration
              // });
              setSelectedDuration(duration as TimerPreset);
              logger.log('After setSelectedDuration, selectedDuration should be:', duration);
              
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentExerciseIndex: nextExerciseIndex, // NOW advance to next exercise
                  isResting: false,
                  restTimeRemaining: undefined
                } : prev.workoutMode,
                isRunning: false, // Will be started by auto-start logic below
                currentTime: 0,
                targetTime: duration,
                currentExercise: nextExercise, // Update to the new exercise
                isCountdown: false,
                countdownTime: 0
              }));
            } else if (nextExercise.exercise_type === 'repetition_based') {
              const sets = nextWorkoutExercise.custom_sets || nextExercise.default_sets || 1;
              const reps = nextWorkoutExercise.custom_reps || nextExercise.default_reps || 10;
              const repBase = nextExercise.rep_duration_seconds || BASE_REP_TIME;
              const repDuration = Math.round(repBase * appSettings.rep_speed_factor);
              
              setSelectedDuration(repDuration as TimerPreset);
              
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentExerciseIndex: nextExerciseIndex, // NOW advance to next exercise
                  currentSet: 0,
                  totalSets: sets,
                  currentRep: 0,
                  totalReps: reps,
                  isResting: false,
                  restTimeRemaining: undefined
                } : prev.workoutMode,
                isRunning: false, // Will be started by auto-start logic below
                currentTime: 0,
                targetTime: repDuration,
                currentExercise: nextExercise, // Update to the new exercise
                isCountdown: false,
                countdownTime: 0
              }));
            }

            if (appSettings.sound_enabled) {
              audioService.announceText(`Rest complete. Starting ${nextExercise.name}`);
            }

            // Auto-start the timer after a short delay to ensure state is updated
            setTimeout(() => {
              logger.log('Auto-starting timer with selectedDuration:', selectedDuration, 'for exercise:', nextExercise.name);
              startActualTimer(); // Call startActualTimer directly instead of startTimer
            }, 100);
          }
        } else {
          // Exercise completed (not in rest period)
          // Use the actual current exercise from workout mode for accurate processing
          const currentWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
          const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
          
          // logger.log('Processing exercise completion for:', actualCurrentExercise?.name);
          // logger.log('Exercise type:', actualCurrentExercise?.exercise_type);
          // logger.log('Has workout rep/set state:', !!workoutMode.totalReps, !!workoutMode.totalSets);
          
          // Check if this is a repetition-based exercise that needs rep/set advancement
          if (actualCurrentExercise?.exercise_type === 'repetition_based' && workoutMode.totalReps && workoutMode.totalSets) {
            logger.log('Processing rep-based exercise completion...');
            const currentRep = workoutMode.currentRep || 0;
            const currentSet = workoutMode.currentSet || 0;
            const totalReps = workoutMode.totalReps;
            const totalSets = workoutMode.totalSets;
            
            // Check if we're completing a rep (not starting a new one)
            const nextRep = currentRep + 1;
            
            if (nextRep < totalReps) {
              // More reps to go in current set, advance rep counter
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentRep: nextRep
                } : prev.workoutMode,
                currentTime: 0,
                isRunning: true,
                targetTime: selectedDuration
              }));
              
              // More reps to go, announce next rep
              if (appSettings.sound_enabled) {
                audioService.announceText(`Rep ${nextRep + 1} of ${totalReps}`);
              }
              
              // Restart timer interval for next rep without full reset
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              
              const newStartTime = Date.now();
              // Use helper function for consistent smooth timing
              intervalRef.current = createTimerInterval(newStartTime, true); // true = rep-based exercise
            } else if (nextRep === totalReps) {
              // Just completed the last rep of current set
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentRep: totalReps // Mark all reps completed for this set
                } : prev.workoutMode,
                currentTime: 0,
                isRunning: false // Stop the timer
              }));
              
              if (currentSet < totalSets - 1) {
                // More sets to go, start rest period
                setTimerState(prev => ({
                  ...prev,
                  workoutMode: prev.workoutMode ? {
                    ...prev.workoutMode,
                    currentSet: currentSet,  // Keep current set during rest
                    currentRep: totalReps    // All reps completed in current set
                  } : prev.workoutMode,
                  isRunning: true,
                  isResting: true,
                  restTimeRemaining: REST_TIME_BETWEEN_SETS,
                  currentTime: 0,
                  targetTime: REST_TIME_BETWEEN_SETS
                }));
                
                if (appSettings.sound_enabled) {
                  audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
                }
                
                // Play rest start feedback
                if (appSettings.sound_enabled || appSettings.vibration_enabled) {
                  audioService.playRestStartFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
                }
                
                // Start rest timer
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                
                const restStartTime = Date.now();
                intervalRef.current = setInterval(() => {
                  const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
                  const remaining = REST_TIME_BETWEEN_SETS - elapsed;
                  
                  setTimerState(prev => {
                    if (!prev.isRunning || !prev.isResting) {
                      return prev;
                    }

                    if (remaining <= 0) {
                      // Rest completed, transition to next set
                      if (appSettings.sound_enabled) {
                        audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                      }
                      
                      // Play rest end feedback
                      if (appSettings.sound_enabled || appSettings.vibration_enabled) {
                        audioService.playRestEndFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
                      }
                      
                      // Clear rest interval to prevent double triggers
                      clearInterval(intervalRef.current!);
                      
                      // Start new timer for next set immediately
                      const nextSetStartTime = Date.now();
                      // Use helper function - check if current exercise is rep-based
                      const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exercise_id);
                      const isRepBasedExercise = currentExercise?.exercise_type === 'repetition_based';
                      intervalRef.current = createTimerInterval(nextSetStartTime, isRepBasedExercise);
                      
                      return {
                        ...prev,
                        workoutMode: prev.workoutMode ? {
                          ...prev.workoutMode,
                          currentSet: currentSet + 1,
                          currentRep: 0
                        } : prev.workoutMode,
                        currentTime: 0,
                        isResting: false,
                        restTimeRemaining: undefined,
                        targetTime: selectedDuration
                      };
                    } else {
                      return {
                        ...prev,
                        currentTime: elapsed,
                        restTimeRemaining: remaining
                      };
                    }
                  });
                }, 1000);
              } else {
                // All sets completed for this exercise, advance to next exercise
                if (appSettings.sound_enabled) {
                  audioService.announceText('Exercise completed!');
                }
                
                // Advance to next exercise in workout
                advanceWorkout();
              }
            }
          } else {
            // Time-based exercise completed, advance workout
            logger.log('Time-based exercise completed in workout mode:', actualCurrentExercise?.name);
            advanceWorkout();
          }
        }
      } else {
        // Standard timer completion (non-workout mode)
        
        // Check if this is a standalone repetition-based exercise
        if (currentExercise?.exercise_type === 'repetition_based' && timerState.totalReps && timerState.totalSets) {
          const currentRep = timerState.currentRep || 0;
          const currentSet = timerState.currentSet || 0;
          const totalReps = timerState.totalReps;
          const totalSets = timerState.totalSets;
          
          if (currentRep < totalReps) {
            // Advance to next rep in current set (or complete current rep)
            const nextRep = currentRep + 1;
            
            setTimerState(prev => ({
              ...prev,
              currentRep: nextRep,
              currentTime: 0,
              isRunning: nextRep < totalReps,  // Stop running if this was the last rep
              targetTime: selectedDuration
            }));
            
            if (nextRep < totalReps) {
              // More reps to go, announce next rep
              if (appSettings.sound_enabled) {
                audioService.announceText(`Rep ${nextRep + 1} of ${totalReps}`);
              }
              
              // Restart timer interval for next rep without full reset
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              
              const newStartTime = Date.now();
              // Use helper function for consistent smooth timing
              intervalRef.current = createTimerInterval(newStartTime, true); // true = rep-based exercise
            } else {
              // This was the last rep of the set, check if we need to advance to next set
              if (currentSet < totalSets - 1) {
                // More sets to go, start rest period
                setTimerState(prev => ({
                  ...prev,
                  isRunning: true,
                  isResting: true,
                  restTimeRemaining: REST_TIME_BETWEEN_SETS,
                  currentTime: 0,
                  targetTime: REST_TIME_BETWEEN_SETS
                }));
                
                if (appSettings.sound_enabled) {
                  audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
                }
                
                // Play rest start feedback
                if (appSettings.sound_enabled || appSettings.vibration_enabled) {
                  audioService.playRestStartFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
                }
                
                // Start rest timer
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                
                const restStartTime = Date.now();
                intervalRef.current = setInterval(() => {
                  const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
                  const remaining = REST_TIME_BETWEEN_SETS - elapsed;
                  
                  setTimerState(prev => {
                    if (!prev.isRunning || !prev.isResting) {
                      return prev;
                    }

                    if (remaining <= 0) {
                      // Rest completed, transition to next set
                      if (appSettings.sound_enabled) {
                        audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                      }
                      
                      // Play rest end feedback
                      if (appSettings.sound_enabled || appSettings.vibration_enabled) {
                        audioService.playRestEndFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
                      }
                      
                      // Clear rest interval to prevent double triggers
                      clearInterval(intervalRef.current!);
                      
                      // Start new timer for next set immediately
                      const nextSetStartTime = Date.now();
                      // Use helper function - check if current exercise is rep-based
                      const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exercise_id);
                      const isRepBasedExercise = currentExercise?.exercise_type === 'repetition_based';
                      intervalRef.current = createTimerInterval(nextSetStartTime, isRepBasedExercise);
                      
                      return {
                        ...prev,
                        currentSet: currentSet + 1,
                        currentRep: 0,
                        currentTime: 0,
                        isResting: false,
                        restTimeRemaining: undefined,
                        targetTime: selectedDuration
                      };
                    } else {
                      return {
                        ...prev,
                        currentTime: elapsed,
                        restTimeRemaining: remaining
                      };
                    }
                  });
                }, 1000);
              } else {
                // All reps and sets completed
                if (appSettings.sound_enabled) {
                  audioService.announceText(`Exercise completed! Great job on ${currentExercise.name}`);
                }
                
                // Log the activity
                if (currentExercise) {
                  const activityLog: ActivityLog = {
                    id: crypto.randomUUID(),
                    exercise_id: currentExercise.id,
                    exercise_name: currentExercise.name,
                    catalog_id: currentExercise.catalogId,
                    duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                    timestamp: new Date().toISOString(),
                    notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                    sets_count: totalSets,
                    reps_count: totalReps,
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    deleted: false,
                    version: 1
                  };

                  if (consentService.hasConsent()) {
                    // Save activity log and check for PR
                    storageService.saveActivityLog(activityLog).then(() => {
                      // Check for new PR (non-blocking)
                      const analyticsService = AnalyticsService.getInstance();
                      analyticsService.checkForNewPR(
                        currentExercise.id,
                        totalReps,
                        totalSets,
                        Math.round(totalSets * totalReps * (targetTime || 0))
                      ).then(pr => {
                        if (pr) {
                          setNewPR(pr);
                          setShowPRCelebration(true);
                        }
                      }).catch(error => {
                        logger.error('Failed to check for PR:', error);
                        // Non-blocking - continue workout flow
                      });
                    }).catch(error => {
                      logger.error('Failed to save activity log:', error);
                    });
                  }
                }
                
                // Stop the timer - exercise complete
                // Ensure UI reflects completion (currentTime === targetTime) for rep-based standalone completion
                setTimerState(prev => ({
                  ...prev,
                  currentTime: prev.targetTime || prev.currentTime
                }));
                stopTimer(true);
              }
            }
            
            return;
          } else if (currentSet < totalSets - 1) {
            // Start rest period before next set
            setTimerState(prev => ({
              ...prev,
              isRunning: true,
              isResting: true,
              restTimeRemaining: REST_TIME_BETWEEN_SETS,
              currentTime: 0,
              targetTime: REST_TIME_BETWEEN_SETS
            }));
            
            if (appSettings.sound_enabled) {
              audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
            }
            
            // Play rest start feedback
            if (appSettings.sound_enabled || appSettings.vibration_enabled) {
              audioService.playRestStartFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
            }
            
            // Start rest timer
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            
            const restStartTime = Date.now();
            intervalRef.current = setInterval(() => {
              const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
              const remaining = REST_TIME_BETWEEN_SETS - elapsed;
              
              setTimerState(prev => {
                if (!prev.isRunning || !prev.isResting) {
                  return prev;
                }

                if (remaining <= 0) {
                  // Rest completed, transition to next set
                  if (appSettings.sound_enabled) {
                    audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                  }
                  
                  // Play rest end feedback
                  if (appSettings.sound_enabled || appSettings.vibration_enabled) {
                    audioService.playRestEndFeedback(appSettings.sound_enabled, appSettings.vibration_enabled);
                  }
                  
                  // Clear rest interval to prevent double triggers
                  clearInterval(intervalRef.current!);
                  
                  // Clear rest interval and start rep timer for next set
                  clearInterval(intervalRef.current!);
                  
                  // Start new timer for next set immediately
                  const nextSetStartTime = Date.now();
                  // Use helper function - check if current exercise is rep-based
                  const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exercise_id);
                  const isRepBasedExercise = currentExercise?.exercise_type === 'repetition_based';
                  intervalRef.current = createTimerInterval(nextSetStartTime, isRepBasedExercise);
                  
                  return { 
                    ...prev, 
                    currentTime: 0,
                    restTimeRemaining: 0,
                    isResting: false,
                    currentSet: currentSet + 1,
                    currentRep: 0,
                    targetTime: selectedDuration
                  };
                }

                return { 
                  ...prev, 
                  currentTime: elapsed,
                  restTimeRemaining: remaining 
                };
              });

              // Beep at 3, 2, 1 seconds remaining during rest
              if (remaining <= 3 && remaining > 0) {
                if (appSettings.sound_enabled) {
                  audioService.announceText(remaining.toString());
                }
              }
            }, 1000);
            
            return;
          } else {
            // All reps and sets completed
            if (appSettings.sound_enabled) {
              audioService.announceText(`Exercise completed! Great job on ${currentExercise.name}`);
            }
            
            // Log the activity
            if (currentExercise) {
              const activityLog: ActivityLog = {
                id: crypto.randomUUID(),
                exercise_id: currentExercise.id,
                exercise_name: currentExercise.name,
                catalog_id: currentExercise.catalogId,
                duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                timestamp: new Date().toISOString(),
                notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                sets_count: totalSets,
                reps_count: totalReps,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                deleted: false,
                version: 1
              };

              if (consentService.hasConsent()) {
                // Save activity log and check for PR
                storageService.saveActivityLog(activityLog).then(() => {
                  // Check for new PR (non-blocking)
                  const analyticsService = AnalyticsService.getInstance();
                  analyticsService.checkForNewPR(
                    currentExercise.id,
                    totalReps,
                    totalSets,
                    Math.round(totalSets * totalReps * (targetTime || 0))
                  ).then(pr => {
                    if (pr) {
                      setNewPR(pr);
                      setShowPRCelebration(true);
                    }
                  }).catch(error => {
                    logger.error('Failed to check for PR:', error);
                    // Non-blocking - continue workout flow
                  });
                }).catch(error => {
                  logger.error('Failed to save activity log:', error);
                });
              }
            }
            
            // Stop timer completely - all reps and sets done
            setTimerState(prev => ({
              ...prev,
              currentTime: prev.targetTime || prev.currentTime
            }));
            stopTimer(true);
          }
        } else {
          // Time-based exercise or rep-based without proper tracking
          if (currentExercise) {
            const activityLog: ActivityLog = {
              id: crypto.randomUUID(),
              exercise_id: currentExercise.id,
              exercise_name: currentExercise.name,
              catalog_id: currentExercise.catalogId,
              duration: targetTime,
              timestamp: new Date().toISOString(),
              notes: `Completed ${targetTime}s interval timer`,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              deleted: false,
              version: 1
            };

            if (consentService.hasConsent()) {
              storageService.saveActivityLog(activityLog);
            }
          }

          // Stop timer (pass true to indicate this is a completion, not manual stop)
          stopTimer(true);

          // Announce completion
          if (appSettings.sound_enabled) {
            audioService.announceText(`Timer completed! Great job on ${currentExercise?.name}`);
          }
        }
      }
    }
  }, [timerState, stopTimer, advanceWorkout, exercises, appSettings.sound_enabled, appSettings.vibration_enabled, appSettings.rep_speed_factor, selectedExercise?.name, selectedDuration, startActualTimer, createTimerInterval]);

  // Cleanup timer interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update app settings
  const updateAppSettings = React.useCallback(async (newSettings: Partial<AppSettings>) => {
    if (!hasConsent) return;

    // Use functional update to avoid stale closure issues
    setAppSettings(currentSettings => {
      const nextSettings: AppSettings = {
        ...currentSettings,
        ...newSettings,
        // Always bump version and mark dirty so sync pushes reliably
        version: (currentSettings.version || 1) + 1,
        updated_at: new Date().toISOString(),
        dirty: 1,
        op: 'upsert'
      };
      
      // Persist immediately, trigger sync in background (don't await)
      storageService.saveAppSettings(nextSettings)
        .then(() => {
          // Trigger sync immediately but don't wait (offline-first)
          logger.log('[updateAppSettings] Settings saved, triggering background sync (version:', nextSettings.version, ')');
          void syncService.sync(true);
        })
        .catch(error => {
          logger.error('Failed to save app settings:', error);
        });
      
      return nextSettings;
    });
  }, [hasConsent]);

  const handleSetSelectedExercise = React.useCallback((exercise: Exercise | null, settings?: AppSettings) => {
    logger.debug('🔧 handleSetSelectedExercise called:', {
      exerciseName: exercise?.name || 'null',
      currentWorkoutMode: !!timerState.workoutMode,
      timerStateDebug: {
        currentExercise: timerState.currentExercise?.name,
        currentSet: timerState.currentSet,
        currentRep: timerState.currentRep,
        totalSets: timerState.totalSets,
        totalReps: timerState.totalReps
      }
    });
    
    // FORCE clear workoutMode if it exists when selecting a standalone exercise
    if (timerState.workoutMode && exercise) {
      logger.debug('🔧 FORCE clearing stale workoutMode when selecting standalone exercise');
      setTimerState(prev => ({
        ...prev,
        workoutMode: undefined,
        currentSet: undefined,
        totalSets: undefined,
        currentRep: undefined,
        totalReps: undefined,
        currentExercise: undefined
      }));
    }

    // BUGFIX: Clear stale targetTime/currentTime when switching between exercise types
    // Scenario: After completing a rep-based exercise (targetTime = repDuration, e.g. 4s) with no pre-countdown,
    // startActualTimer reuses prev.targetTime because it was set and we go directly to startActualTimer.
    // Selecting a new time-based exercise then incorrectly keeps the old small targetTime.
    // Fix: When selecting a new exercise (and timer not running, not in workout mode), clear targetTime so
    // startTimer/startActualTimer uses the newly selectedDuration instead of stale previous value.
    if (!timerState.isRunning && !timerState.workoutMode) {
      setTimerState(prev => ({
        ...prev,
        targetTime: undefined,
        currentTime: 0,
        // Clear any standalone rep tracking state to avoid leaking into time-based selection
        currentSet: undefined,
        totalSets: undefined,
        currentRep: undefined,
        totalReps: undefined
      }));
    }
    
    setSelectedExercise(exercise);
    updateAppSettings({ last_selected_exercise_id: exercise ? exercise.id : null });
    
    // Set appropriate duration for rep-based exercises
    if (exercise?.exercise_type === 'repetition_based') {
      if (settings) {
        // Use provided settings
        const baseRep = exercise.rep_duration_seconds || BASE_REP_TIME;
        const repDuration = Math.round(baseRep * settings.rep_speed_factor);
        setSelectedDuration(repDuration as TimerPreset);
      } else {
        // Use current settings from state - read only, don't mutate
        const baseRep = exercise.rep_duration_seconds || BASE_REP_TIME;
        const repDuration = Math.round(baseRep * appSettings.rep_speed_factor);
        setSelectedDuration(repDuration as TimerPreset);
      }
    } else if (exercise?.exercise_type === 'time_based') {
      // Ensure selecting a new time-based exercise resets duration to its default
      // Prime directive: selecting an exercise should reflect its canonical default duration
      const defaultDuration = exercise.default_duration || 30;
      if (selectedDuration !== defaultDuration) {
        setSelectedDuration(defaultDuration as TimerPreset);
      }
    }
  }, [updateAppSettings, timerState.workoutMode, timerState.currentExercise, timerState.currentSet, timerState.currentRep, timerState.totalSets, timerState.totalReps, appSettings.rep_speed_factor]);

  // Initialize app data after consent (run once when consent is granted)
  useEffect(() => {
    // Skip initialization for public share routes and legal center - they don't need local data
    if (isPublicOrLegalRoute()) {
      logger.log('[init] Skipping initialization for public/legal route');
      setIsLoading(false);
      return;
    }

    if (!hasConsent) return;
    if (initStartedRef.current) {
      // In React StrictMode (dev), effects run twice. Skip the duplicate init.
      logger.log('[init] Skipping duplicate initialization (StrictMode dev)');
      return;
    }
    initStartedRef.current = true;

    const initializeApp = async () => {
      // Watchdog to avoid UI being stuck on splash if init takes too long
      const initStart = Date.now();
      const watchdog = setTimeout(() => {
        logger.warn('[init] Initialization taking too long (>5s). Forcing UI ready.');
        setIsLoading(false);
      }, 5000);

      if (hasConsent) {
        try {
          logger.log('[init] Starting initialization with consent');
          if (process.env.NODE_ENV === 'development') {
            // logger.log('🚀 Initializing app with consent granted');
            
            // Add storage service to window for debugging
            if (typeof window !== 'undefined') {
              const debugWindow = window as Window & {
                storageService?: StorageService;
                syncService?: unknown;
                resetDB?: () => Promise<void>;
                cleanupDeletedVideos?: () => Promise<void>;
                getVideoStats?: () => Promise<void>;
              };

              debugWindow.storageService = storageService;
              debugWindow.syncService = syncService;
              debugWindow.resetDB = () => storageService.resetDatabase();

              // Video cleanup utilities
              debugWindow.cleanupDeletedVideos = async () => {
                const stats = await storageService.getVideoFileStats();
                logger.log('💾 [DevTools] Video stats before cleanup:', stats);

                if (stats.deletedFiles === 0) {
                  logger.log('💾 [DevTools] No deleted video files to clean up');
                  return;
                }

                const result = await storageService.cleanupDeletedVideoFiles();
                logger.log('💾 [DevTools] Cleanup complete:', result);

                const newStats = await storageService.getVideoFileStats();
                logger.log('💾 [DevTools] Video stats after cleanup:', newStats);
              };

              debugWindow.getVideoStats = async (): Promise<void> => {
                const stats = await storageService.getVideoFileStats();
                logger.log('💾 [DevTools] Current video file stats:', stats);
              };

              logger.log('🔧 Debug helpers: window.storageService, window.syncService, window.resetDB(), window.cleanupDeletedVideos(), window.getVideoStats()');
            }
          }

          // Register service worker for offline functionality
          logger.log('🚀 Initializing PWA capabilities...');
          
          // Register PWA link handlers for magic link routing
          registerPWALinkHandlers();
          
          const maybePromise = registerServiceWorker();
          const isPromiseLike = <T,>(val: unknown): val is PromiseLike<T> => (
            typeof val === 'object' && val !== null && 'then' in (val as Record<string, unknown>) &&
            typeof (val as { then?: unknown }).then === 'function'
          );
          if (isPromiseLike<{ updateAvailable?: boolean }>(maybePromise)) {
            maybePromise
              .then((swInfo) => {
                if (swInfo?.updateAvailable) {
                  logger.log('📦 App update available - refresh to update');
                }
              })
              .catch((error) => {
                logger.error('❌ Service worker registration failed:', error);
              });
          }

          // Initialize legal services
          logger.log('📄 Initializing legal document services...');
          try {
            await legalDocsService.initialize();
            legalUpdateService.initialize();
            logger.log('✅ Legal services initialized');
          } catch (error) {
            logger.error('❌ Legal services initialization failed:', error);
          }

          const tSeedStart = Date.now();
          const tReady = Date.now();
          
          // Add timeout to storageService.ready() to fail fast if database is broken
          const storageReadyTimeout = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Storage ready timeout')), 3000);
          });
          
          try {
            await Promise.race([storageService.ready(), storageReadyTimeout]);
            const readyMs = Date.now() - tReady;
            if (readyMs > 800) logger.warn(`[init] storageService.ready() took ${readyMs}ms`);
            
            // Check and upgrade database if needed (e.g., for personal_records table in v23)
            await storageService.checkAndUpgradeDatabase();
          } catch (error) {
            logger.error(`[init] storageService.ready() failed or timed out after 3s:`, error);
            // Continue with fallback - try to load built-in exercises without storage
            logger.warn('[init] Falling back to in-memory exercise catalog');
            const { INITIAL_EXERCISES: builtInExercises } = await import('./data/exercises');
            setExercises(builtInExercises);
            setIsLoading(false);
            clearTimeout(watchdog);
            return; // Exit early with built-in exercises only
          }
          // Handle version initialization for new and existing users
          try {
            const currentVersion = await storageService.getCurrentAppVersion();

            if (currentVersion === null) {
              // New user - get version from server
              logger.info('[init] 🆕 New installation detected, fetching version from server...');

              const statusData = await updateService.getStatus();
              if (statusData && statusData.version) {
                await storageService.updateAppVersion(statusData.version);
                logger.info(`[init] 🚀 RepCue Application Started - Version: ${statusData.version} (from server)`);
              } else {
                logger.warn('[init] ⚠️ Could not fetch version from server, app_version remains null');
                logger.info(`[init] 🚀 RepCue Application Started - Version: unknown (server unreachable)`);
              }
            } else {
              // Existing user
              logger.info(`[init] 🚀 RepCue Application Started - Version: ${currentVersion}`);
            }
          } catch (versionError) {
            logger.warn('[init] Could not handle version initialization:', versionError);
            logger.info(`[init] 🚀 RepCue Application Started - Version: unknown`);
          }

          // Quick DB snapshot for diagnostics (counts only)
          try {
            const snap = await storageService.debugSnapshot();
            logger.log('[init] DB snapshot:', snap);
          } catch {}
          // logger.log('[init] Ensuring exercise catalogs and exercises are seeded');
          await storageService.ensureCatalogsSeeded();
          await storageService.ensureExercisesSeeded();
          // For v25+ global exercise repository, ensure catalog memberships are seeded
          try {
            await storageService.ensureCatalogMembershipsSeeded();
          } catch (e) {
            logger.warn('[init] ensureCatalogMembershipsSeeded failed:', e);
          }
          const seedMs = Date.now() - tSeedStart;
          if (seedMs > 1000) logger.warn(`[init] seeding took ${seedMs}ms`); else logger.log(`[init] seeding took ${seedMs}ms`);

          const tLoadStart = Date.now();
          // logger.log('[init] Loading exercises from storage');
          let allExercises = await storageService.getExercises();
          const loadMs = Date.now() - tLoadStart;
          if (loadMs > 1000) logger.warn(`[init] getExercises took ${loadMs}ms (n=${allExercises.length})`); else logger.log(`[init] getExercises took ${loadMs}ms (n=${allExercises.length})`);
          if (allExercises.length === 0) {
            // Defensive: if the catalog is still empty, try one more seed then fall back to in-memory list
            logger.warn('[init] Exercises list is empty after initial seed. Retrying seeding and reload…');
            try {
              // const reseeded = await storageService.ensureExercisesSeeded();
              // logger.log(`[init] Reseed attempt completed. exercises.count=${reseeded}`);
              const tReload = Date.now();
              allExercises = await storageService.getExercises();
              const reloadMs = Date.now() - tReload;
              if (reloadMs > 1000) logger.warn(`[init] getExercises (retry) took ${reloadMs}ms (n=${allExercises.length})`);
            } catch (e) {
              logger.warn('[init] Reseed attempt failed:', e);
            }
            if (allExercises.length === 0) {
              // Try a fast path without preferences merge before giving up
              const tFast = Date.now();
              const fast = await storageService.getExercisesFast().catch(() => []);
              const fastMs = Date.now() - tFast;
              if (fast.length > 0) {
                logger.warn(`[init] Fast path loaded ${fast.length} exercises in ${fastMs}ms; using fast list`);
                allExercises = fast;
              } else {
                logger.warn('[init] Exercises still empty after reseed — using built-in catalog as temporary fallback');
                allExercises = INITIAL_EXERCISES;
              }
            }
          }
          setExercises(allExercises);

          // Load app settings
          // logger.log('[init] Loading app settings');
          const tSettingsStart = Date.now();
          const storedSettings = await storageService.getAppSettings();
          const settingsMs = Date.now() - tSettingsStart;
          if (settingsMs > 800) logger.warn(`[init] getAppSettings took ${settingsMs}ms`);
          
          if (process.env.NODE_ENV === 'development') {
            logger.log('⚙️ Loaded stored settings:', storedSettings);
          }
          
          // Merge with defaults to handle new settings properties
          const settingsToSet = storedSettings ? {
            ...DEFAULT_APP_SETTINGS,
            ...storedSettings
          } : DEFAULT_APP_SETTINGS;
          
          if (process.env.NODE_ENV === 'development') {
            logger.log('⚙️ Final settings to set:', settingsToSet);
          }
          
          if (!storedSettings) {
            await storageService.saveAppSettings(DEFAULT_APP_SETTINGS);
          } else if (Object.keys(DEFAULT_APP_SETTINGS).length !== Object.keys(storedSettings).length) {
            // Update stored settings with any new defaults
            await storageService.saveAppSettings(settingsToSet);
          }
          setAppSettings(settingsToSet);

          // Load and apply user preferences (locale) for cross-device sync
          // logger.log('[init] Loading user preferences');
          try {
            const tPrefsStart = Date.now();
            const prefs = await storageService.getUserPreferences();
            const prefsMs = Date.now() - tPrefsStart;
            if (prefsMs > 800) logger.warn(`[init] getUserPreferences took ${prefsMs}ms`);
            const preferredLocale = prefs?.locale;
            if (preferredLocale && (i18n.resolvedLanguage || i18n.language) !== preferredLocale) {
              await i18n.changeLanguage(preferredLocale);
            }
          } catch {}

          // Set last selected exercise without invoking settings update callback to avoid effect churn
          if (settingsToSet.last_selected_exercise_id) {
            const lastExercise = allExercises.find(
              (ex: Exercise) => ex.id === settingsToSet.last_selected_exercise_id
            );
            if (lastExercise) {
              setSelectedExercise(lastExercise);
              // Compute initial duration if rep-based
              if (lastExercise.exercise_type === 'repetition_based') {
                const baseRep = lastExercise.rep_duration_seconds || BASE_REP_TIME;
                const repDuration = Math.round(baseRep * settingsToSet.rep_speed_factor) as TimerPreset;
                setSelectedDuration(repDuration);
              }
            }
          }
          const elapsed = Date.now() - initStart;
          if (elapsed > 2000) {
            logger.warn(`[init] Initialization finished in ${elapsed}ms (>2s)`);
          } else {
            logger.log(`[init] Initialization finished in ${elapsed}ms`);
          }
        } catch (error) {
          logger.error('Failed to initialize app data:', error);
          // Fallback to initial exercises
          setExercises(INITIAL_EXERCISES);
        } finally {
          clearTimeout(watchdog);
          setIsLoading(false);
        }
      } else {
        // No consent yet, don't block UI
        clearTimeout(watchdog);
        setIsLoading(false);
      }
  };

  initializeApp();

  // Delayed check for version recovery (edge case handling)
  setTimeout(async () => {
    try {
      await updateService.checkAndRefreshIfVersionNull();
    } catch (error) {
      logger.warn('Version recovery check failed:', error);
    }
  }, 5000); // Check after 5 seconds
  }, [hasConsent, isPublicOrLegalRoute]);

  // Handle shared exercise save from redirect
  useEffect(() => {
    const handleSharedExerciseSave = async () => {
      if (!hasConsent || isLoading) return;

      // Check URL parameters for shared exercise save
      const urlParams = new URLSearchParams(window.location.search);
      const shareTokenFromUrl = urlParams.get('saveSharedExercise');

      // Also check session storage for pending share token
      const shareTokenFromSession = sessionStorage.getItem('pendingShareToken');

      const shareToken = shareTokenFromUrl || shareTokenFromSession;

      if (!shareToken) return;

      try {
        // Clear the pending token and URL parameter
        sessionStorage.removeItem('pendingShareToken');
        if (shareTokenFromUrl) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('saveSharedExercise');
          window.history.replaceState({}, document.title, newUrl.toString());
        }

        logger.log(`[init] Processing shared exercise save: ${shareToken}`);

        // Get fresh auth session for the API call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          // User is not authenticated - store the token and prompt for login
          logger.log(`[init] User not authenticated, storing share token and prompting for login`);
          sessionStorage.setItem('pendingShareToken', shareToken);

          showSnackbar(
            t('exercises:loginRequired', 'Please sign in to save this exercise to your library'),
            { type: 'info', durationMs: 8000 }
          );

          // Trigger the auth modal to let user sign in
          setShowAuthModal(true);
          return;
        }

        // Call the save-shared-exercise function
        const response = await fetch(`${supabaseFunctionBaseUrl}/functions/v1/save-shared-exercise`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            shareToken: shareToken
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[init] Save shared exercise HTTP ${response.status}:`, errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }

          throw new Error(errorData.error || 'Failed to save exercise');
        }

        const result = await response.json();

        // If the shared exercise has a video, download it for offline access
        // For reference-based sharing, we download the video for the original exercise ID
        if (result.hasVideo && result.exerciseId) {
          try {
            // For references, exerciseId is the original exercise ID
            const originalExerciseId = result.exerciseId;

            // Query the video_files table directly to get the storage path
            // This avoids RLS issues with storage listing permissions
            const { data: videoFileRecords, error: queryError } = await supabase
              .from('video_files')
              .select('file_name, storage_path, file_size, mime_type')
              .eq('exercise_id', originalExerciseId)
              .not('storage_path', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1);

            if (queryError) {
              throw new Error(`Failed to query video files: ${queryError.message || JSON.stringify(queryError)}`);
            }

            if (!videoFileRecords || videoFileRecords.length === 0) {
              throw new Error(`No video file records found in database for exercise ${originalExerciseId}`);
            }

            // Get the most recent video file record
            const videoFileRecord = videoFileRecords[0];
            if (!videoFileRecord.storage_path) {
              throw new Error(`Video file record found but storage_path is null for exercise ${originalExerciseId}`);
            }

            // Download the video using the dedicated edge function with service role access
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              throw new Error('No valid session for video download');
            }

            // Use direct fetch to get blob response since supabase.functions.invoke()
            // doesn't handle binary responses properly (converts to string)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const functionsUrl = `${supabaseUrl}/functions/v1/download-shared-video`;
            const downloadResponse = await fetch(functionsUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey
              },
              body: JSON.stringify({
                exerciseId: originalExerciseId,
                originalExerciseId: originalExerciseId,
                originalOwnerId: result.sharedFromUserId
              })
            });

            if (!downloadResponse.ok) {
              const errorText = await downloadResponse.text();
              throw new Error(`Failed to download video via edge function: ${downloadResponse.status} ${downloadResponse.statusText}. ${errorText}`);
            }

            // Get the video as a Blob from the response
            const videoBlob = await downloadResponse.blob();

            // Convert blob to File object with proper MIME type
            // Use the MIME type from the database record, or infer from file extension
            const fileExtension = videoFileRecord.file_name.split('.').pop()?.toLowerCase();
            const mimeType = videoFileRecord.mime_type ||
                           (fileExtension === 'mp4' ? 'video/mp4' :
                            fileExtension === 'webm' ? 'video/webm' :
                            'video/mp4'); // default fallback

            const downloadedVideoFile = new File([videoBlob], videoFileRecord.file_name, {
              type: mimeType
            });

            // Save the video to User's IndexedDB using the original exercise ID
            await storageService.saveVideoFile(originalExerciseId, downloadedVideoFile);
            logger.log(`🎥 [App] Video downloaded and saved for shared exercise reference: ${originalExerciseId}`);
          } catch (videoError) {
            const errorDetails = videoError instanceof Error ? {
              message: videoError.message,
              name: videoError.name,
              stack: videoError.stack
            } : {
              message: String(videoError),
              name: 'UnknownError',
              stack: undefined
            };

            logger.error('🎥 [App] Failed to download shared video:', {
              error: videoError,
              ...errorDetails,
              exerciseId: result.exerciseId,
              originalExerciseId: result.exerciseId, // Same for references
              originalOwnerId: result.sharedFromUserId
            });
            // Don't block the save operation if video download fails
          }
        }

        // Show success message with reference-aware text
        const successMessage = result.isReference
          ? (result.message || t('exercises:exerciseReferenceAdded', 'Exercise added to your library!'))
          : (result.message || t('exercises:exerciseSaved', 'Exercise saved to your library!'));

        showSnackbar(successMessage, {
          type: 'success'
        });

        // Trigger a sync to get the newly saved reference
        logger.log('[init] Triggering sync after shared exercise reference save');
        try {
          await syncService.sync();
          logger.log('[init] Sync completed after shared exercise reference save');

          // For reference-based sharing, refresh exercise list to show the shared exercise
          if (result.isReference) {
            logger.log('[init] Reference-based save complete, refreshing exercise list');
            try {
              const updatedExercises = await storageService.getExercises();
              setExercises(updatedExercises);
              logger.log(`[init] Exercise list refreshed, now showing ${updatedExercises.length} exercises`);
            } catch (refreshError) {
              logger.warn('[init] Failed to refresh exercise list after reference save:', refreshError);
            }
          }
        } catch (syncError) {
          logger.warn('[init] Sync failed after shared exercise save:', syncError);
          // Still show success since the save itself worked
        }

      } catch (error) {
        logger.error('[init] Failed to save shared exercise:', error);
        showSnackbar(
          error instanceof Error ? error.message : t('exercises:saveFailed', 'Failed to save exercise'),
          { type: 'error' }
        );
      }
    };

    handleSharedExerciseSave();
  }, [hasConsent, isLoading, t, showSnackbar]);

// Cleanup sync triggers on unmount
useEffect(() => {
  const cleanup = setupSyncTriggers();
  return cleanup;
}, []);

  // Proactively nudge a sync only AFTER initialization finished to avoid IndexedDB contention.
  useEffect(() => {
    if (hasConsent && !isLoading) {
      logger.log('[init] Post-init sync disabled temporarily');
      // Temporarily disabled due to timeout issues
      // const t = setTimeout(() => { void syncService.sync(); }, 500);
      // return () => clearTimeout(t);
    }
  }, [hasConsent, isLoading]);


  // Safety rehydrate: if UI has zero exercises after init, but DB has data, retry-load a few times
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const delays = [250, 750, 1500, 3000]; // progressive backoff (ms)

    const tryRehydrate = async () => {
      if (isLoading || exercises.length > 0) return;
      // If consent missing, we can still safely peek built-ins to hydrate UI without storing anything
      // But skip this entirely for public share routes and legal center since they don't need local exercises
      if (!hasConsent) {
        if (isPublicOrLegalRoute()) {
          logger.log('[rehydrate] Skipping exercise rehydration for public/legal route');
          return;
        }
        try {
          const count = await storageService.peekExerciseCount().catch(() => 0);
          if (count > 0) {
            logger.warn(`[rehydrate] No consent, but DB has ${count} exercises; loading built-in catalog (read-only)`);
            const builtins = await storageService.getBuiltInExercisesFastUnsafe();
            if (!cancelled && builtins.length > 0) {
              logger.log(`[rehydrate] Loaded ${builtins.length} built-in exercises (no-consent fast path)`);
              setExercises(builtins);
            }
          }
        } catch (e) {
          logger.warn('[rehydrate] No-consent built-in peek failed:', e);
        }
        return;
      }
      while (!cancelled && attempts < delays.length && exercises.length === 0) {
        try {
          const stats = await storageService.getStorageStats().catch(() => null);
          if (cancelled) return;
          if (stats && stats.exerciseCount > 0) {
            logger.warn(`[rehydrate] UI list empty but DB has ${stats.exerciseCount} exercises; reloading from storage...`);
            const list = await storageService.getExercises();
            if (!cancelled && list.length > 0) {
              logger.log(`[rehydrate] Loaded ${list.length} exercises from storage`);
              setExercises(list);
              return;
            }
          } else {
            logger.debug('[rehydrate] Stats not ready or zero; will retry');
          }
        } catch (e) {
          logger.warn('[rehydrate] Failed to rehydrate exercises (attempt ' + (attempts + 1) + '):', e);
        }
        const wait = delays[attempts++];
        await new Promise(r => setTimeout(r, wait));
      }
    };
    void tryRehydrate();
    return () => { cancelled = true; };
  }, [hasConsent, isLoading, exercises.length, isPublicOrLegalRoute]);

  // Listen for consent changes
  useEffect(() => {
    const handleConsentGranted = () => {
      setHasConsent(true);
      // When consent is granted, close legal gate if open
      setShowLegalGate(false);
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

  // Check for legal document updates and blocking status
  useEffect(() => {
    const checkLegalDocumentStatus = async () => {
      // Only check after initial load and when user has consent
      if (isLoading || !hasConsent || isPublicOrLegalRoute()) {
        return;
      }

      try {
        // CRITICAL: Always re-initialize to ensure we have the latest manifest
        // This prevents race conditions where ConsentBanner loads fresh manifest
        // but this check uses stale cached data
        const initialized = await legalDocsService.initialize();

        if (!initialized) {
          logger.warn('Legal documents service not initialized, skipping status check');
          return;
        }

        // Get current language
        const locale = i18n.language || 'en';

        // Check if there are any blocking documents (documents with required acceptance)
        const hasBlocking = legalDocsService.hasBlockingDocuments(locale);
        const hasUnaccepted = legalDocsService.hasUnacceptedRequired(locale);

        if (hasBlocking || hasUnaccepted) {
          setShowLegalGate(true);
        }
      } catch (error) {
        logger.error('Error checking legal document status:', error);
      }
    };

    checkLegalDocumentStatus();
  }, [hasConsent, isLoading, i18n.language]); // Removed showLegalGate to prevent circular dependency

  // Handle consent banner
  const handleConsentGranted = () => {
    setHasConsent(true);
  };

  // Handle legal gate acceptance
  const handleLegalGateAccepted = () => {
    setShowLegalGate(false);
  };

  

  // Update exercise favorite status
  const toggleExerciseFavorite = async (exercise_id: string) => {
    if (!hasConsent) return;

    try {
  // Use helper: only UUIDs (custom) go to user_favorites, slugs remain in preferences
  const isUserCreated = isCustom(exercise_id);
      
      if (isUserCreated) {
        // User-created exercise: use StorageService and user_favorites table
        const userId = authService.getAuthState().user?.id;
        if (!userId) {
          logger.error('Cannot toggle favorite: user not authenticated');
          return;
        }
        await storageService.toggleUserCreatedExerciseFavorite(exercise_id, userId);
      } else {
        // Built-in exercise: use existing StorageService and user_preferences.favorite_exercises array
        await storageService.toggleExerciseFavorite(exercise_id);
      }
      
      // Promptly sync so favorites show up on other devices
      void syncService.sync(true);
      
      // Update local UI state
      setExercises(prev =>
        prev.map(exercise =>
          exercise.id === exercise_id
            ? { ...exercise, is_favorite: !exercise.is_favorite }
            : exercise
        )
      );

      // Notify other components of the favorite update
      window.dispatchEvent(new CustomEvent('exercise-favorite-updated', {
        detail: { exerciseId: exercise_id }
      }));
    } catch (error) {
      logger.error('Failed to toggle exercise favorite:', error);
    }
  };

  // Delete a user-created or shared exercise
  const deleteExercise = async (exercise_id: string) => {
    if (!hasConsent) return;

    try {
      // Find the exercise to check if it's shared
      const exercise = exercises.find(ex => ex.id === exercise_id);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      if (isSharedExercise(exercise_id)) {
        // For shared exercises, remove the reference from user_favorites
        // This preserves the original exercise but removes it from user's library
        if (user?.id) {
          await storageService.deleteSharedExerciseReference(user.id, exercise_id);
          logger.log('Removed shared exercise reference:', exercise.name);
        }
      } else {
        // For user-created exercises, delete normally
        await storageService.deleteCustomExercise(exercise_id);
        logger.log('Deleted user-created exercise:', exercise.name);
      }

      // Promptly sync so deletion reflects on other devices
      void syncService.sync(true);

      // Remove the exercise from the local state
      setExercises(prev => prev.filter(exercise => exercise.id !== exercise_id));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('exercise-deleted', { detail: exercise_id }));
    } catch (error) {
      logger.error('Failed to delete exercise:', error);
      throw error; // Re-throw to let ExercisePage handle the error display
    }
  };

  

  // Function to refresh exercises from storage
  const refreshExercises = useCallback(async () => {
    try {
      const updatedExercises = await storageService.getExercises();
      if (updatedExercises.length > 0) setExercises(updatedExercises);
    } catch (error) {
      logger.warn('Failed to refresh exercises:', error);
    }
  }, []);

  // Refresh local state when sync applies server changes
  useEffect(() => {
    const handler = async () => {
      // Refresh exercises and settings after server changes are applied
      const [updatedExercises, updatedSettings, updatedPrefs] = await Promise.all([
        storageService.getExercises(),
        storageService.getAppSettings(),
        storageService.getUserPreferences()
      ]);
      if (updatedExercises.length > 0) setExercises(updatedExercises);
      if (updatedSettings) {
        // Only update settings if they're actually newer (prevent reverting recent local changes)
        setAppSettings(prev => {
          // If updated settings are older than current, keep current
          const prevVersion = prev.version || 0;
          const updatedVersion = updatedSettings.version || 0;
          
          if (updatedVersion < prevVersion) {
            logger.log('[sync:applied] Ignoring older settings from sync (version', updatedVersion, '<', prevVersion, ')');
            return prev;
          }
          
          // If versions are equal, compare timestamps
          if (updatedVersion === prevVersion) {
            const prevTime = new Date(prev.updated_at || 0).getTime();
            const updatedTime = new Date(updatedSettings.updated_at || 0).getTime();
            
            if (updatedTime <= prevTime) {
              logger.log('[sync:applied] Ignoring equal/older settings from sync (same version, older/equal timestamp)');
              return prev;
            }
          }
          
          logger.log('[sync:applied] Applying newer settings from sync (version', updatedVersion, '>=', prevVersion, ')');
          return { ...prev, ...updatedSettings };
        });
        
        // Apply theme immediately after settings change
        if (updatedSettings.dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      // Apply locale if it changed on another device
      try {
        const preferredLocale = updatedPrefs?.locale;
        if (preferredLocale && (i18n.resolvedLanguage || i18n.language) !== preferredLocale) {
          await i18n.changeLanguage(preferredLocale);
        }
      } catch {}
    };
    window.addEventListener('sync:applied', handler as EventListener);
    return () => window.removeEventListener('sync:applied', handler as EventListener);
  }, []);

  // Listen for local exercise updates
  useEffect(() => {
    const handler = () => {
      // Refresh exercises when they're updated locally
      refreshExercises();
    };
    window.addEventListener('exercise-updated', handler);
    window.addEventListener('exercise-created', handler);
    return () => {
      window.removeEventListener('exercise-updated', handler);
      window.removeEventListener('exercise-created', handler);
    };
  }, [refreshExercises]);

  // Early theme detection to prevent flash - use system preference as fallback
  useEffect(() => {
    // Check system preference for initial theme
    let prefersDark = false;
    try {
      const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      prefersDark = mediaQuery ? mediaQuery.matches : false;
    } catch {
      prefersDark = false;
    }
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (appSettings.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      logger.log('🎨 Theme applied:', appSettings.dark_mode ? 'dark' : 'light', {
        hasConsent,
        dark_mode: appSettings.dark_mode
      });
    }
  }, [appSettings.dark_mode, hasConsent]);

  // JSDOM can miss origin/href; BrowserRouter will throw. Provide minimal fallback.
  const canUseBrowserRouter = typeof window !== 'undefined' && !!(window.location && (window.location as Location).href);

  return (
    <ThemeProvider appSettings={appSettings} onSettingsChange={updateAppSettings}>
      {/* Show consent banner if no consent (except for public share routes and legal center) */}
      {!hasConsent && !isPublicOrLegalRoute() ? (
        <ConsentBanner onConsentGranted={handleConsentGranted} />
      ) : showLegalGate && hasConsent && !isPublicOrLegalRoute() ? (
        // Show legal gate if documents need acceptance (blocking documents detected)
        <LegalGate isOpen={showLegalGate} onContinue={handleLegalGateAccepted} />
      ) : isLoading ? (
        // Show loading state
        <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-body font-medium">Loading RepCue...</p>
          </div>
        </div>
      ) : canUseBrowserRouter ? (
        <Router>
        <ScrollToTop />
        <ChunkErrorBoundary>
          <MigrationSuccessBanner />
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
                      appSettings={appSettings}
                      onToggleFavorite={toggleExerciseFavorite}
                      onDeleteExercise={deleteExercise}
                    />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.CREATE_EXERCISE} 
                element={
                  <Suspense fallback={createRouteLoader('Create Exercise')}>
                    <CreateExercisePage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.EDIT_EXERCISE} 
                element={
                  <Suspense fallback={createRouteLoader('Edit Exercise')}>
                    <EditExercisePage />
                  </Suspense>
                } 
              />
              <Route
                path={AppRoutes.EXERCISE_DETAIL}
                element={
                  <Suspense fallback={createRouteLoader('Exercise Detail')}>
                    <ExerciseDetailPage />
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
                      onStartWorkoutMode={startWorkoutMode}
                      onUpdateSettings={updateAppSettings}
                    />
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
              <Route 
                path={AppRoutes.COMMUNITY} 
                element={
                  <Suspense fallback={createRouteLoader('Community')}>
                    <CommunityPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.COACH} 
                element={
                  <Suspense fallback={createRouteLoader('Coach')}>
                    <CoachPage appSettings={appSettings} exercises={exercises} />
                  </Suspense>
                } 
              />
              <Route 
                path="/dev-tools" 
                element={<DevToolsPage />} 
              />
              <Route 
                path={AppRoutes.PR_HISTORY} 
                element={
                  <Suspense fallback={createRouteLoader('Personal Records')}>
                    <PRHistoryPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.AUTH_CALLBACK} 
                element={
                  <Suspense fallback={createRouteLoader('Auth Callback')}>
                    <AuthCallbackPage />
                  </Suspense>
                } 
              />
              <Route 
                path={AppRoutes.PROFILE} 
                element={
                  <Suspense fallback={createRouteLoader('Profile')}>
                    <ProfilePage isOwnProfile={true} />
                  </Suspense>
                } 
              />
              <Route
                path={AppRoutes.PROFILE_VIEW}
                element={
                  <Suspense fallback={createRouteLoader('Profile')}>
                    <ProfilePage isOwnProfile={false} />
                  </Suspense>
                }
              />
              <Route
                path="/ai-workout-onboarding"
                element={
                  <Suspense fallback={createRouteLoader('AI Workout Onboarding')}>
                    <AIWorkoutOnboardingPage />
                  </Suspense>
                }
              />
              <Route
                path={AppRoutes.LEGAL}
                element={
                  <Suspense fallback={createRouteLoader('Legal Documents')}>
                    <LegalCenterPage />
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
      ) : (
        // Fallback minimal shell for tests missing location; avoids Router URL creation
        <ChunkErrorBoundary>
          <AppShell>
            <div />
          </AppShell>
        </ChunkErrorBoundary>
      )}

      {/* Modals and overlays - show only when not in consent flow */}
      {hasConsent && (
        <>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode="signin"
          />

          <ForceUpdateModal
        isOpen={showForceUpdateModal}
        updateInfo={forceUpdateData || undefined}
        onApplyUpdate={async () => {
          try {
            await forceUpdateService.applyForceUpdate();
          } catch (error) {
            logger.error('Failed to apply force update from modal:', error);
            showSnackbar('Failed to apply update. Please try again.', { type: 'error' });
          }
        }}
        onRetry={async () => {
          try {
            await forceUpdateService.retryForceUpdate();
          } catch (error) {
            logger.error('Failed to retry force update:', error);
            showSnackbar('Retry failed. Please try again.', { type: 'error' });
          }
        }}
        onForceReload={() => {
          forceUpdateService.forceReload();
        }}
        blockAppUsage={true}
      />

      <UpdateNotificationManager
        isWorkoutActive={timerState.isRunning && !!timerState.workoutMode}
        onSaveWorkout={async () => {
          // Save current workout if needed - this could be extended
          if (timerState.workoutMode && timerState.isRunning) {
            await stopTimer(true); // true = completion
          }
        }}
        onAbandonWorkout={async () => {
          // Abandon current workout
          if (timerState.isRunning) {
            await resetTimer();
          }
          setTimerState(prev => ({ ...prev, workoutMode: undefined }));
        }}
      />

      <WorkoutForceUpdateModal
        isOpen={showWorkoutForceUpdateModal}
        updateInfo={workoutForceUpdateData!}
        workoutInfo={{
          isActive: timerState.isRunning,
          isRunning: timerState.isRunning,
          isWorkoutMode: !!timerState.workoutMode,
          workoutName: timerState.workoutMode?.workoutName,
          canInterrupt: true
        }}
        onClose={() => {
          setShowWorkoutForceUpdateModal(false);
          setWorkoutForceUpdateData(null);
        }}
      />

      {/* PR Celebration Modal */}
      {showPRCelebration && newPR && (
        <PRCelebration
          record={newPR}
          onDismiss={() => {
            setShowPRCelebration(false);
            setNewPR(null);
          }}
        />
      )}

      {/* Post-Workout Survey Modal */}
      {showPostWorkoutSurvey && surveyActivityLog && (
        <PostWorkoutSurvey
          activityLog={surveyActivityLog}
          onSubmit={async (response: SurveyResponse) => {
            try {
              logger.log('📋 Saving survey response:', response);
              // Update the activity log with survey metadata
              const updatedLog = {
                ...surveyActivityLog,
                metadata: response
              };
              await storageService.saveActivityLog(updatedLog);
              logger.log('✅ Survey response saved successfully');
              showSnackbar(t('common:surveyThanks', { defaultValue: 'Thank you for your feedback!' }), { type: 'success' });
            } catch (error) {
              logger.error('❌ Failed to save survey response:', error);
              showSnackbar(t('common:surveyError', { defaultValue: 'Failed to save survey response' }), { type: 'error' });
            } finally {
              setShowPostWorkoutSurvey(false);
              setSurveyActivityLog(null);
            }
          }}
          onSkip={() => {
            logger.log('⏭️ Post-workout survey skipped');
            setShowPostWorkoutSurvey(false);
            setSurveyActivityLog(null);
          }}
          isSubmitting={false}
        />
      )}
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
