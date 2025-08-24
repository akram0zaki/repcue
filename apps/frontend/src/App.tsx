import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService } from './services/storageService';
import { audioService } from './services/audioService';
import { syncService } from './services/syncService';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import ConsentBanner from './components/ConsentBanner';
import MigrationSuccessBanner from './components/MigrationSuccessBanner';
import AppShell from './components/AppShell';
import { registerServiceWorker } from './utils/serviceWorker';
import type { Exercise, AppSettings, TimerState, ActivityLog, WorkoutExercise, WorkoutSession } from './types';
import { Routes as AppRoutes } from './types';
import { DEFAULT_APP_SETTINGS, BASE_REP_TIME, REST_TIME_BETWEEN_SETS, type TimerPreset } from './constants';

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
  AuthCallbackPage,
  ChunkErrorBoundary,
} from './router/LazyRoutes';
import { preloadCriticalRoutes, createRouteLoader } from './router/routeUtils';

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
}> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { onSetSelectedExercise, onSetSelectedDuration, onStartTimer, onStartWorkoutMode, timerState } = props;
  const processedStateRef = React.useRef<string | null>(null);

  // Handle navigation state from ExercisePage or HomePage
  useEffect(() => {
    const state = location.state as { 
      selectedExercise?: Exercise; 
      selectedDuration?: number;
      workoutMode?: { workoutId: string; workoutName: string; exercises: WorkoutExercise[] };
    } | null;
    
    // Handle workout mode navigation
    if (state?.workoutMode && !timerState.isRunning && !timerState.workoutMode) {
      onStartWorkoutMode(state.workoutMode);
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
      console.log('📱 App came to foreground - triggering sync');
      syncService.sync().catch(error => {
        console.warn('Foreground sync failed:', error);
      });
    }
  };

  // Setup periodic sync (every 5 minutes when active)
  let syncInterval: NodeJS.Timeout | null = null;
  const setupPeriodicSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    syncInterval = setInterval(() => {
      if (!document.hidden) {
        console.log('⏰ Periodic sync triggered');
        syncService.sync().catch(error => {
          console.warn('Periodic sync failed:', error);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  // Setup event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  setupPeriodicSync();

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  };
};

function App() {
  const autoConsent = typeof window !== 'undefined' && (window as Window & { __AUTO_CONSENT__?: boolean }).__AUTO_CONSENT__ === true;
  const [hasConsent, setHasConsent] = useState<boolean>(autoConsent ? true : consentService.hasConsent());
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
    countdownTime: 0,
    isResting: false,
    restTimeRemaining: undefined
  });

  // Timer UI State
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<TimerPreset>(30);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  // Effect to ensure correct duration for rep-based exercises
  useEffect(() => {
    if (selectedExercise?.exerciseType === 'repetition-based' && appSettings.repSpeedFactor) {
    const baseRep = selectedExercise.repDurationSeconds || BASE_REP_TIME;
    const repDuration = Math.round(baseRep * appSettings.repSpeedFactor);
      if (selectedDuration !== repDuration) {
        setSelectedDuration(repDuration as TimerPreset);
      }
    }
  }, [selectedExercise, appSettings.repSpeedFactor, selectedDuration]);

  // Timer refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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
      if (wholeSecondsElapsed > 0 && wholeSecondsElapsed % appSettings.intervalDuration === 0) {
        if (wholeSecondsElapsed !== lastBeepIntervalRef.current) {
          if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
            audioService.playIntervalFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.beepVolume);
          }
          lastBeepIntervalRef.current = wholeSecondsElapsed;
        }
      }
    }, intervalDuration);
  }, [appSettings.intervalDuration, appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.beepVolume]);

  // Separate function for the actual timer logic
  const startActualTimer = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Play start sound and vibration
    if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
      audioService.playStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
    }

    // Announce timer start
    if (appSettings.soundEnabled) {
      const actualTargetTime = timerState.targetTime || selectedDuration;
      audioService.announceText(`Timer started! ${actualTargetTime} seconds`);
    }

    const startTime = Date.now();
    lastBeepIntervalRef.current = 0; // Reset interval counter

    // Check if this is a standalone rep-based exercise (not in workout mode)
    const isStandaloneRepBased = selectedExercise?.exerciseType === 'repetition-based' && !timerState.workoutMode;
    
    // For standalone rep-based exercises, set up rep/set tracking
    let repSetState = {};
    if (isStandaloneRepBased) {
      const defaultSets = selectedExercise.defaultSets || 3;
      const defaultReps = selectedExercise.defaultReps || 8;
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
      console.log('startActualTimer: Setting targetTime to:', actualTargetTime, 'from prev.targetTime:', prev.targetTime, 'selectedDuration:', selectedDuration);
      
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
    console.log('startActualTimer: Starting interval with targetTime:', timerState.targetTime || selectedDuration);
    
    // Use the helper function to create appropriate timer interval
    // In workout mode, check the current exercise in the workout; otherwise use selectedExercise
    let isRepBasedExercise = false;
    if (timerState.workoutMode) {
      const currentWorkoutExercise = timerState.workoutMode.exercises[timerState.workoutMode.currentExerciseIndex];
      const currentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exerciseId);
      isRepBasedExercise = currentExercise?.exerciseType === 'repetition-based';
    } else {
      isRepBasedExercise = selectedExercise?.exerciseType === 'repetition-based';
    }
    intervalRef.current = createTimerInterval(startTime, isRepBasedExercise);
  }, [selectedExercise, selectedDuration, appSettings.soundEnabled, appSettings.vibrationEnabled, timerState.workoutMode, createTimerInterval, timerState.targetTime, exercises]);

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
        currentExercise: selectedExercise || undefined,
        // Only clear workout mode for standalone exercises (preserve it for workout mode)
        workoutMode: prev.workoutMode || undefined,
        // Clear workout-specific rest state
        isResting: false,
        restTimeRemaining: undefined
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
  }, [selectedExercise, selectedDuration, appSettings.preTimerCountdown, appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.beepVolume, wakeLockSupported, requestWakeLock, startActualTimer]);

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
        duration: Math.round(currentTime), // Round to avoid floating-point precision issues
        timestamp: new Date(),
        notes: `Stopped after ${Math.round(currentTime)}s`,
        updatedAt: new Date().toISOString(),
        deleted: false,
        version: 1
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
  }, [appSettings.soundEnabled, appSettings.vibrationEnabled, wakeLockActive, releaseWakeLock, timerState]);

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
      if (selectedExercise.exerciseType === 'time-based') {
        setSelectedDuration(selectedExercise.defaultDuration as TimerPreset);
      } else if (selectedExercise.exerciseType === 'repetition-based') {
  const baseRep = selectedExercise.repDurationSeconds || BASE_REP_TIME;
  const repDuration = Math.round(baseRep * appSettings.repSpeedFactor);
        setSelectedDuration(repDuration as TimerPreset);
      }
    }
  }, [wakeLockActive, releaseWakeLock, selectedExercise, appSettings.repSpeedFactor]);

  // Start workout-guided timer mode
  const startWorkoutMode = useCallback(async (workoutData: { workoutId: string; workoutName: string; exercises: WorkoutExercise[] }) => {
    if (!workoutData.exercises || workoutData.exercises.length === 0) {
      alert('This workout has no exercises');
      return;
    }

    // Create a new workout session for logging
    const sessionId = `session-${Date.now()}`;
    
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
    const firstExercise = exercises.find(ex => ex.id === firstWorkoutExercise.exerciseId);
    
    if (firstExercise) {
      setSelectedExercise(firstExercise);
      
      // Set duration/reps based on exercise type and custom values
      if (firstExercise.exerciseType === 'time-based') {
        const duration = firstWorkoutExercise.customDuration || firstExercise.defaultDuration || 30;
        setSelectedDuration(duration as TimerPreset);
      } else if (firstExercise.exerciseType === 'repetition-based') {
        // For rep-based exercises, we'll use a timer for each repetition
        const sets = firstWorkoutExercise.customSets || firstExercise.defaultSets || 1;
        const reps = firstWorkoutExercise.customReps || firstExercise.defaultReps || 10;
        const repBase = firstExercise.repDurationSeconds || BASE_REP_TIME;
        const repDuration = Math.round(repBase * appSettings.repSpeedFactor);

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
    if (appSettings.soundEnabled) {
      audioService.announceText(`Starting workout: ${workoutData.workoutName}. ${workoutData.exercises.length} exercises planned.`);
    }
  }, [exercises, appSettings.soundEnabled, appSettings.repSpeedFactor]);

  // Advance workout to next exercise or complete workout
  const advanceWorkout = useCallback(async () => {
    const { workoutMode } = timerState;
    if (!workoutMode) return;

    const currentIndex = workoutMode.currentExerciseIndex;
    const isLastExercise = currentIndex >= workoutMode.exercises.length - 1;
    
    console.log('advanceWorkout called:', {
      currentIndex,
      totalExercises: workoutMode.exercises.length,
      isLastExercise,
      workoutName: workoutMode.workoutName
    });

    if (isLastExercise) {
      // Workout completed
      console.log('🎉 Workout completed! Logging workout session...');
      console.log('🔍 About to check consent and session for workout logging...');
      if (appSettings.soundEnabled) {
        audioService.announceText(`Workout completed! Great job on ${workoutMode.workoutName}`);
      }

      // Save workout session completion
      const hasConsent = consentService.hasConsent();
      const hasSessionId = !!workoutMode.sessionId;
      console.log('Workout completion - consent check:', {
        hasConsent,
        hasSessionId,
        sessionId: workoutMode.sessionId
      });
      
      if (hasConsent && hasSessionId) {
        console.log('✅ Creating workout session for logging...');
        const workoutSession: WorkoutSession = {
          id: workoutMode.sessionId!,
          workoutId: workoutMode.workoutId,
          workoutName: workoutMode.workoutName,
          startTime: new Date(Date.now() - (Math.round(timerState.currentTime) * 1000)), // Approximate start time
          endTime: new Date(),
          exercises: [], // TODO: Track individual exercise completion in Phase 5
          isCompleted: true,
          completionPercentage: 100,
          totalDuration: Math.round(timerState.currentTime),
          updatedAt: new Date().toISOString(),
          deleted: false,
          version: 1
        };
        
        try {
          console.log('💾 Saving workout session to storage...', workoutSession);
          await storageService.saveWorkoutSession(workoutSession);
          console.log('✅ Workout session saved successfully');
          
          // Create a single workout activity log entry for the activity log page
          console.log('📝 Creating workout activity log entry...');
          const workoutExerciseDetails = workoutMode.exercises.map((workoutExercise) => {
            const exercise = exercises.find(ex => ex.id === workoutExercise.exerciseId);
            if (!exercise) return null;
            
            let exerciseDuration: number;
            let sets: number | undefined;
            let reps: number | undefined;
            
            if (exercise.exerciseType === 'time-based') {
              exerciseDuration = workoutExercise.customDuration || exercise.defaultDuration || 30;
            } else {
              sets = workoutExercise.customSets || exercise.defaultSets || 1;
              reps = workoutExercise.customReps || exercise.defaultReps || 10;
              const baseRep = exercise.repDurationSeconds || BASE_REP_TIME;
              const repTime = Math.round(baseRep * appSettings.repSpeedFactor);
              const restTime = sets > 1 ? (sets - 1) * REST_TIME_BETWEEN_SETS : 0;
              exerciseDuration = (sets * reps * repTime) + restTime;
            }
            
            return {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              duration: exerciseDuration,
              sets,
              reps
            };
          }).filter(Boolean);
          
          const totalWorkoutDuration = Math.round(workoutExerciseDetails.reduce((total, ex) => total + (ex?.duration || 0), 0));
          
          const workoutActivityLog: ActivityLog = {
            id: `workout-${workoutMode.sessionId}`,
            exerciseId: 'workout', // Special identifier for workout entries
            exerciseName: workoutMode.workoutName,
            duration: totalWorkoutDuration,
            timestamp: new Date(),
            notes: `Workout completed with ${workoutMode.exercises.length} exercises`,
            workoutId: workoutMode.workoutId,
            isWorkout: true,
            exercises: workoutExerciseDetails as {
              exerciseId: string;
              exerciseName: string;
              duration: number;
              sets?: number;
              reps?: number;
            }[],
            updatedAt: new Date().toISOString(),
            deleted: false,
            version: 1
          };
          
          console.log(`📝 Saving workout activity log:`, workoutActivityLog);
          await storageService.saveActivityLog(workoutActivityLog);
          console.log('✅ Workout activity log saved successfully');
        } catch (error) {
          console.error('❌ Failed to save workout session or activity logs:', error);
        }
      } else {
        console.log('❌ Workout session not saved:', {
          reason: !hasConsent ? 'No consent' : 'No session ID',
          hasConsent,
          hasSessionId
        });
      }

      // Update timer state to show workout completion before resetting
      setTimerState(prev => ({
        ...prev,
        workoutMode: prev.workoutMode ? {
          ...prev.workoutMode,
          currentExerciseIndex: prev.workoutMode.exercises.length, // Set to total count to show 100%
          isResting: false
        } : prev.workoutMode,
        isRunning: false
      }));

      // Delay reset to allow UI to show completion state
      setTimeout(async () => {
        await resetTimer();
      }, 2000); // 2 second delay to show completion
    } else {
      // Move to next exercise
      const nextExerciseIndex = currentIndex + 1;
      const nextWorkoutExercise = workoutMode.exercises[nextExerciseIndex];
      const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exerciseId);

      if (nextExercise) {
        // Check if we need a rest period
        const currentWorkoutExercise = workoutMode.exercises[currentIndex];
        const restTime = currentWorkoutExercise.customRestTime || 30; // Default 30s rest

        if (restTime > 0) {
          // Start rest period
          console.log('Starting rest period, selectedExercise remains:', selectedExercise?.name);
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

          if (appSettings.soundEnabled) {
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
          if (nextExercise.exerciseType === 'time-based') {
            const duration = nextWorkoutExercise.customDuration || nextExercise.defaultDuration || 30;
            setSelectedDuration(duration as TimerPreset);
          } else if (nextExercise.exerciseType === 'repetition-based') {
            const sets = nextWorkoutExercise.customSets || nextExercise.defaultSets || 1;
            const reps = nextWorkoutExercise.customReps || nextExercise.defaultReps || 10;
            const repBase = nextExercise.repDurationSeconds || BASE_REP_TIME;
            const repDuration = Math.round(repBase * appSettings.repSpeedFactor);
            
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

          if (appSettings.soundEnabled) {
            audioService.announceText(`Next exercise: ${nextExercise.name}`);
          }
        }
      }
    }
  }, [timerState, selectedExercise?.name, exercises, appSettings.soundEnabled, appSettings.repSpeedFactor, resetTimer]);

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
      
      console.log('Timer completion useEffect triggered for:', currentExercise?.name || 'unknown exercise');
      
      if (workoutMode) {
        // Get the actual current exercise from workout mode for accurate logging
        const currentWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
        const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exerciseId);
        console.log('Actual current exercise from workout mode:', actualCurrentExercise?.name);
        console.log('Workout state:', {
          currentExerciseIndex: workoutMode.currentExerciseIndex,
          totalExercises: workoutMode.exercises.length,
          isResting: workoutMode.isResting,
          selectedExerciseName: currentExercise?.name,
          actualExerciseName: actualCurrentExercise?.name
        });
        
        if (workoutMode.isResting) {
          // Rest period completed, start next exercise automatically
          // Calculate next exercise index since currentExerciseIndex still points to completed exercise
          const nextExerciseIndex = workoutMode.currentExerciseIndex + 1;
          
          // Check if workout is complete
          if (nextExerciseIndex >= workoutMode.exercises.length) {
            console.log('🎉 Workout completed after rest period!');
            advanceWorkout();
            return;
          }
          
          const nextWorkoutExercise = workoutMode.exercises[nextExerciseIndex];
          const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exerciseId);
          
          if (nextExercise) {
            console.log('Rest completed, changing selectedExercise from', selectedExercise?.name, 'to', nextExercise.name);
            setSelectedExercise(nextExercise);

            // Set duration/reps for next exercise
            if (nextExercise.exerciseType === 'time-based') {
              const duration = nextWorkoutExercise.customDuration || nextExercise.defaultDuration || 30;
              console.log('Setting duration for', nextExercise.name, ':', {
                customDuration: nextWorkoutExercise.customDuration,
                defaultDuration: nextExercise.defaultDuration,
                finalDuration: duration
              });
              setSelectedDuration(duration as TimerPreset);
              console.log('After setSelectedDuration, selectedDuration should be:', duration);
              
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
            } else if (nextExercise.exerciseType === 'repetition-based') {
              const sets = nextWorkoutExercise.customSets || nextExercise.defaultSets || 1;
              const reps = nextWorkoutExercise.customReps || nextExercise.defaultReps || 10;
              const repBase = nextExercise.repDurationSeconds || BASE_REP_TIME;
              const repDuration = Math.round(repBase * appSettings.repSpeedFactor);
              
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

            if (appSettings.soundEnabled) {
              audioService.announceText(`Rest complete. Starting ${nextExercise.name}`);
            }

            // Auto-start the timer after a short delay to ensure state is updated
            setTimeout(() => {
              console.log('Auto-starting timer with selectedDuration:', selectedDuration, 'for exercise:', nextExercise.name);
              console.log('Calling startActualTimer directly since targetTime is already set correctly');
              startActualTimer(); // Call startActualTimer directly instead of startTimer
            }, 100);
          }
        } else {
          // Exercise completed (not in rest period)
          // Use the actual current exercise from workout mode for accurate processing
          const currentWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
          const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exerciseId);
          
          console.log('Processing exercise completion for:', actualCurrentExercise?.name);
          console.log('Exercise type:', actualCurrentExercise?.exerciseType);
          console.log('Has workout rep/set state:', !!workoutMode.totalReps, !!workoutMode.totalSets);
          
          // Check if this is a repetition-based exercise that needs rep/set advancement
          if (actualCurrentExercise?.exerciseType === 'repetition-based' && workoutMode.totalReps && workoutMode.totalSets) {
            console.log('Processing rep-based exercise completion...');
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
              if (appSettings.soundEnabled) {
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
                
                if (appSettings.soundEnabled) {
                  audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
                }
                
                // Play rest start feedback
                if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
                  audioService.playRestStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
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
                      if (appSettings.soundEnabled) {
                        audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                      }
                      
                      // Play rest end feedback
                      if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
                        audioService.playRestEndFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
                      }
                      
                      // Clear rest interval to prevent double triggers
                      clearInterval(intervalRef.current!);
                      
                      // Start new timer for next set immediately
                      const nextSetStartTime = Date.now();
                      // Use helper function - check if current exercise is rep-based
                      const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exerciseId);
                      const isRepBasedExercise = currentExercise?.exerciseType === 'repetition-based';
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
                if (appSettings.soundEnabled) {
                  audioService.announceText('Exercise completed!');
                }
                
                // Advance to next exercise in workout
                advanceWorkout();
              }
            }
          } else {
            // Time-based exercise completed, advance workout
            console.log('Time-based exercise completed in workout mode:', actualCurrentExercise?.name);
            console.log('Calling advanceWorkout to move to next exercise or complete workout...');
            advanceWorkout();
          }
        }
      } else {
        // Standard timer completion (non-workout mode)
        
        // Check if this is a standalone repetition-based exercise
        if (currentExercise?.exerciseType === 'repetition-based' && timerState.totalReps && timerState.totalSets) {
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
              if (appSettings.soundEnabled) {
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
                
                if (appSettings.soundEnabled) {
                  audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
                }
                
                // Play rest start feedback
                if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
                  audioService.playRestStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
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
                      if (appSettings.soundEnabled) {
                        audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                      }
                      
                      // Play rest end feedback
                      if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
                        audioService.playRestEndFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
                      }
                      
                      // Clear rest interval to prevent double triggers
                      clearInterval(intervalRef.current!);
                      
                      // Start new timer for next set immediately
                      const nextSetStartTime = Date.now();
                      // Use helper function - check if current exercise is rep-based
                      const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exerciseId);
                      const isRepBasedExercise = currentExercise?.exerciseType === 'repetition-based';
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
                if (appSettings.soundEnabled) {
                  audioService.announceText(`Exercise completed! Great job on ${currentExercise.name}`);
                }
                
                // Log the activity
                if (currentExercise) {
                  const activityLog: ActivityLog = {
                    id: `log-${Date.now()}`,
                    exerciseId: currentExercise.id,
                    exerciseName: currentExercise.name,
                    duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                    timestamp: new Date(),
                    notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                    updatedAt: new Date().toISOString(),
                    deleted: false,
                    version: 1
                  };

                  if (consentService.hasConsent()) {
                    storageService.saveActivityLog(activityLog);
                  }
                }
                
                // Stop the timer - exercise complete
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
            
            if (appSettings.soundEnabled) {
              audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
            }
            
            // Play rest start feedback
            if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
              audioService.playRestStartFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
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
                  if (appSettings.soundEnabled) {
                    audioService.announceText(`Rest complete! Starting set ${currentSet + 2} of ${totalSets}`);
                  }
                  
                  // Play rest end feedback
                  if (appSettings.soundEnabled || appSettings.vibrationEnabled) {
                    audioService.playRestEndFeedback(appSettings.soundEnabled, appSettings.vibrationEnabled);
                  }
                  
                  // Clear rest interval to prevent double triggers
                  clearInterval(intervalRef.current!);
                  
                  // Clear rest interval and start rep timer for next set
                  clearInterval(intervalRef.current!);
                  
                  // Start new timer for next set immediately
                  const nextSetStartTime = Date.now();
                  // Use helper function - check if current exercise is rep-based
                  const currentExercise = exercises.find(ex => ex.id === prev.workoutMode?.exercises[prev.workoutMode.currentExerciseIndex]?.exerciseId);
                  const isRepBasedExercise = currentExercise?.exerciseType === 'repetition-based';
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
                if (appSettings.soundEnabled) {
                  audioService.announceText(remaining.toString());
                }
              }
            }, 1000);
            
            return;
          } else {
            // All reps and sets completed
            if (appSettings.soundEnabled) {
              audioService.announceText(`Exercise completed! Great job on ${currentExercise.name}`);
            }
            
            // Log the activity
            if (currentExercise) {
              const activityLog: ActivityLog = {
                id: `log-${Date.now()}`,
                exerciseId: currentExercise.id,
                exerciseName: currentExercise.name,
                duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                timestamp: new Date(),
                notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                updatedAt: new Date().toISOString(),
                deleted: false,
                version: 1
              };

              if (consentService.hasConsent()) {
                storageService.saveActivityLog(activityLog);
              }
            }
            
            // Stop timer completely - all reps and sets done
            stopTimer(true);
          }
        } else {
          // Time-based exercise or rep-based without proper tracking
          if (currentExercise) {
            const activityLog: ActivityLog = {
              id: `log-${Date.now()}`,
              exerciseId: currentExercise.id,
              exerciseName: currentExercise.name,
              duration: targetTime,
              timestamp: new Date(),
              notes: `Completed ${targetTime}s interval timer`,
              updatedAt: new Date().toISOString(),
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
          if (appSettings.soundEnabled) {
            audioService.announceText(`Timer completed! Great job on ${currentExercise?.name}`);
          }
        }
      }
    }
  }, [timerState, stopTimer, advanceWorkout, exercises, appSettings.soundEnabled, appSettings.vibrationEnabled, appSettings.repSpeedFactor, selectedExercise?.name, selectedDuration, startActualTimer, createTimerInterval]);

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

    const updatedSettings = { ...appSettings, ...newSettings };
    setAppSettings(updatedSettings);

    try {
      await storageService.saveAppSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  }, [hasConsent, appSettings]);

  const handleSetSelectedExercise = React.useCallback((exercise: Exercise | null, settings?: AppSettings) => {
    setSelectedExercise(exercise);
    updateAppSettings({ lastSelectedExerciseId: exercise ? exercise.id : null });
    
    // Set appropriate duration for rep-based exercises
    if (exercise?.exerciseType === 'repetition-based') {
      const currentSettings = settings || appSettings;
      const baseRep = exercise.repDurationSeconds || BASE_REP_TIME;
      const repDuration = Math.round(baseRep * currentSettings.repSpeedFactor);
      setSelectedDuration(repDuration as TimerPreset);
    }
  }, [appSettings, updateAppSettings]);

  // Initialize app data after consent
  useEffect(() => {
    const initializeApp = async () => {
      if (hasConsent) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🚀 Initializing app with consent granted');
          }

          // Register service worker for offline functionality
          console.log('🚀 Initializing PWA capabilities...');
          const maybePromise = registerServiceWorker();
          const isPromiseLike = <T,>(val: unknown): val is PromiseLike<T> => (
            typeof val === 'object' && val !== null && 'then' in (val as Record<string, unknown>) &&
            typeof (val as { then?: unknown }).then === 'function'
          );
          if (isPromiseLike<{ updateAvailable?: boolean }>(maybePromise)) {
            maybePromise
              .then((swInfo) => {
                if (swInfo?.updateAvailable) {
                  console.log('📦 App update available - refresh to update');
                }
              })
              .catch((error) => {
                console.error('❌ Service worker registration failed:', error);
              });
          }

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
          
          if (process.env.NODE_ENV === 'development') {
            console.log('⚙️ Loaded stored settings:', storedSettings);
          }
          
          // Merge with defaults to handle new settings properties
          const settingsToSet = storedSettings ? {
            ...DEFAULT_APP_SETTINGS,
            ...storedSettings
          } : DEFAULT_APP_SETTINGS;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('⚙️ Final settings to set:', settingsToSet);
          }
          
          if (!storedSettings) {
            await storageService.saveAppSettings(DEFAULT_APP_SETTINGS);
          } else if (Object.keys(DEFAULT_APP_SETTINGS).length !== Object.keys(storedSettings).length) {
            // Update stored settings with any new defaults
            await storageService.saveAppSettings(settingsToSet);
          }
          setAppSettings(settingsToSet);

          // Set last selected exercise
          if (settingsToSet.lastSelectedExerciseId) {
            const lastExercise = allExercises.find(
              (ex: Exercise) => ex.id === settingsToSet.lastSelectedExerciseId
            );
            if (lastExercise) {
              handleSetSelectedExercise(lastExercise, settingsToSet);
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
}, [hasConsent, handleSetSelectedExercise]);

// Cleanup sync triggers on unmount
useEffect(() => {
  const cleanup = setupSyncTriggers();
  return cleanup;
}, []);

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

  

  // Early theme detection to prevent flash - check immediately
  useEffect(() => {
    // Immediate synchronous check for cached theme preference
    const cachedTheme = localStorage.getItem('repcue-theme');
    if (cachedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    // Also do async check for full settings - but handle consent properly
    const checkEarlyTheme = async () => {
      try {
        // Check if consent exists first - bypass the service layer check
        const consentStatus = consentService.hasConsent();
        if (!consentStatus) {
          // No consent, but check if we have a cached theme preference
          const cachedTheme = localStorage.getItem('repcue-theme');
          if (cachedTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return;
        }

        // We have consent, try to load full settings
        const storedSettings = await storageService.getAppSettings();
        if (storedSettings?.darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('repcue-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('repcue-theme', 'light');
        }
      } catch (error) {
        console.error('Failed to load early theme setting:', error);
        // Fallback to cached theme
        const cachedTheme = localStorage.getItem('repcue-theme');
        if (cachedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    checkEarlyTheme();
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('repcue-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('repcue-theme', 'light');
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 Theme applied:', appSettings.darkMode ? 'dark' : 'light', {
        hasConsent,
        darkMode: appSettings.darkMode,
        localStorage: localStorage.getItem('repcue-theme')
      });
    }
  }, [appSettings.darkMode, hasConsent]);

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

  // JSDOM can miss origin/href; BrowserRouter will throw. Provide minimal fallback.
  const canUseBrowserRouter = typeof window !== 'undefined' && !!(window.location && (window.location as Location).href);

  return (
    canUseBrowserRouter ? (
      <Router>
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
                      onStartWorkoutMode={startWorkoutMode}
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
              <Route 
                path={AppRoutes.AUTH_CALLBACK} 
                element={
                  <Suspense fallback={createRouteLoader('Auth Callback')}>
                    <AuthCallbackPage />
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
    )
  );
}

export default App;
