import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService, StorageService } from './services/storageService';
import { audioService } from './services/audioService';
import { syncService } from './services/syncService';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import { useAuth } from './hooks/useAuth';
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
  
  // Authentication state
  const { isAuthenticated } = useAuth();

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
    if (selectedExercise?.exercise_type === 'repetition_based' && appSettings.rep_speed_factor) {
    const baseRep = selectedExercise.rep_duration_seconds || BASE_REP_TIME;
    const repDuration = Math.round(baseRep * appSettings.rep_speed_factor);
      if (selectedDuration !== repDuration) {
        setSelectedDuration(repDuration as TimerPreset);
      }
    }
  }, [selectedExercise, appSettings.rep_speed_factor, selectedDuration]);

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
        id: `log-${Date.now()}`,
        exercise_id: currentExercise.id,
        exercise_name: currentExercise.name,
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
      if (appSettings.sound_enabled) {
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
          workout_id: workoutMode.workoutId,
          workout_name: workoutMode.workoutName,
          start_time: new Date(Date.now() - (Math.round(timerState.currentTime) * 1000)).toISOString(), // Approximate start time
          end_time: new Date().toISOString(),
          exercises: [], // TODO: Track individual exercise completion in Phase 5
          is_completed: true,
          completion_percentage: 100,
          total_duration: Math.round(timerState.currentTime),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
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
            const exercise = exercises.find(ex => ex.id === workoutExercise.exercise_id);
            if (!exercise) return null;
            
            let exerciseDuration: number;
            let sets: number | undefined;
            let reps: number | undefined;
            
            if (exercise.exercise_type === 'time_based') {
              exerciseDuration = workoutExercise.custom_duration || exercise.default_duration || 30;
            } else {
              sets = workoutExercise.custom_sets || exercise.default_sets || 1;
              reps = workoutExercise.custom_reps || exercise.default_reps || 10;
              const baseRep = exercise.rep_duration_seconds || BASE_REP_TIME;
              const repTime = Math.round(baseRep * appSettings.rep_speed_factor);
              const restTime = sets > 1 ? (sets - 1) * REST_TIME_BETWEEN_SETS : 0;
              exerciseDuration = (sets * reps * repTime) + restTime;
            }
            
            return {
              exercise_id: exercise.id,
              exercise_name: exercise.name,
              duration: exerciseDuration,
              sets,
              reps
            };
          }).filter(Boolean);
          
          const totalWorkoutDuration = Math.round(workoutExerciseDetails.reduce((total, ex) => total + (ex?.duration || 0), 0));
          
          const workoutActivityLog: ActivityLog = {
            id: `workout-${workoutMode.sessionId}`,
            exercise_id: 'workout', // Special identifier for workout entries
            exercise_name: workoutMode.workoutName,
            duration: totalWorkoutDuration,
            timestamp: new Date().toISOString(),
            notes: `Workout completed with ${workoutMode.exercises.length} exercises`,
            workout_id: workoutMode.workoutId,
            is_workout: true,
            exercises: workoutExerciseDetails as {
              exercise_id: string;
              exercise_name: string;
              duration: number;
              sets?: number;
              reps?: number;
            }[],
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
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
      const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exercise_id);

      if (nextExercise) {
        // Check if we need a rest period
        const currentWorkoutExercise = workoutMode.exercises[currentIndex];
        const restTime = currentWorkoutExercise.custom_rest_time || 30; // Default 30s rest

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
  }, [timerState, selectedExercise?.name, exercises, appSettings.sound_enabled, appSettings.rep_speed_factor, resetTimer]);

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
        const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
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
          const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exercise_id);
          
          if (nextExercise) {
            console.log('Rest completed, changing selectedExercise from', selectedExercise?.name, 'to', nextExercise.name);
            setSelectedExercise(nextExercise);

            // Set duration/reps for next exercise
            if (nextExercise.exercise_type === 'time_based') {
              const duration = nextWorkoutExercise.custom_duration || nextExercise.default_duration || 30;
              console.log('Setting duration for', nextExercise.name, ':', {
                custom_duration: nextWorkoutExercise.custom_duration,
                default_duration: nextExercise.default_duration,
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
              console.log('Auto-starting timer with selectedDuration:', selectedDuration, 'for exercise:', nextExercise.name);
              console.log('Calling startActualTimer directly since targetTime is already set correctly');
              startActualTimer(); // Call startActualTimer directly instead of startTimer
            }, 100);
          }
        } else {
          // Exercise completed (not in rest period)
          // Use the actual current exercise from workout mode for accurate processing
          const currentWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
          const actualCurrentExercise = exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id);
          
          console.log('Processing exercise completion for:', actualCurrentExercise?.name);
          console.log('Exercise type:', actualCurrentExercise?.exercise_type);
          console.log('Has workout rep/set state:', !!workoutMode.totalReps, !!workoutMode.totalSets);
          
          // Check if this is a repetition-based exercise that needs rep/set advancement
          if (actualCurrentExercise?.exercise_type === 'repetition_based' && workoutMode.totalReps && workoutMode.totalSets) {
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
            console.log('Time-based exercise completed in workout mode:', actualCurrentExercise?.name);
            console.log('Calling advanceWorkout to move to next exercise or complete workout...');
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
                    id: `log-${Date.now()}`,
                    exercise_id: currentExercise.id,
                    exercise_name: currentExercise.name,
                    duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                    timestamp: new Date().toISOString(),
                    notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
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
                id: `log-${Date.now()}`,
                exercise_id: currentExercise.id,
                exercise_name: currentExercise.name,
                duration: Math.round(totalSets * totalReps * (targetTime || 0)), // Total time for all reps/sets, rounded
                timestamp: new Date().toISOString(),
                notes: `Completed ${totalSets} sets of ${totalReps} reps`,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
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
              exercise_id: currentExercise.id,
              exercise_name: currentExercise.name,
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

    // Update state first using functional update to avoid depending on current appSettings
    let updatedSettings: AppSettings;
    setAppSettings(current => {
      updatedSettings = { ...current, ...newSettings };
      return updatedSettings;
    });
    
    // Save to storage asynchronously, outside of setState to avoid race conditions
    try {
      await storageService.saveAppSettings(updatedSettings!);
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  }, [hasConsent]);

  const handleSetSelectedExercise = React.useCallback((exercise: Exercise | null, settings?: AppSettings) => {
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
        // Use current settings from state
        setAppSettings(current => {
          const baseRep = exercise.rep_duration_seconds || BASE_REP_TIME;
          const repDuration = Math.round(baseRep * current.rep_speed_factor);
          setSelectedDuration(repDuration as TimerPreset);
          return current; // Don't change settings, just read them
        });
      }
    }
  }, [updateAppSettings]);

  // Initialize app data after consent
  useEffect(() => {
    const initializeApp = async () => {
      if (hasConsent) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🚀 Initializing app with consent granted');
            
            // Add storage service to window for debugging
            if (typeof window !== 'undefined') {
              (window as Window & { storageService?: StorageService; resetDB?: () => Promise<void> }).storageService = storageService;
              (window as Window & { storageService?: StorageService; resetDB?: () => Promise<void> }).resetDB = () => storageService.resetDatabase();
              console.log('🔧 Debug helpers: window.storageService, window.resetDB()');
            }
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
                  is_favorite: storedExercise.is_favorite
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
          if (settingsToSet.last_selected_exercise_id) {
            const lastExercise = allExercises.find(
              (ex: Exercise) => ex.id === settingsToSet.last_selected_exercise_id
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
  const toggleExerciseFavorite = async (exercise_id: string) => {
    if (!hasConsent) return;

    try {
      await storageService.toggleExerciseFavorite(exercise_id);
      setExercises(prev => 
        prev.map(exercise => 
          exercise.id === exercise_id 
            ? { ...exercise, is_favorite: !exercise.is_favorite }
            : exercise
        )
      );
    } catch (error) {
      console.error('Failed to toggle exercise favorite:', error);
    }
  };

  

  // Trigger sync when authentication state changes and refresh app state after sync
  useEffect(() => {
    if (isAuthenticated && hasConsent) {
      console.log('🔐 User authenticated - triggering sync');
      syncService.sync().then(async (result) => {
        if (result.success && result.recordsPulled > 0) {
          console.log('🔄 Sync pulled data from server, refreshing app state...');
          
          // Refresh exercises
          const updatedExercises = await storageService.getExercises();
          if (updatedExercises.length > 0) {
            setExercises(updatedExercises);
          }
          
          // Refresh app settings
          const updatedSettings = await storageService.getAppSettings();
          if (updatedSettings) {
            setAppSettings(updatedSettings);
          }

          // Also broadcast for pages not yet mounted to refresh their own data (workouts, activity logs)
          try {
            // No app-level state for workouts/activity logs; just dispatch event for any listeners
            window.dispatchEvent(new CustomEvent('sync:applied', { detail: { result } }));
          } catch (e) {
            console.debug('Workouts refresh dispatch failed (non-fatal):', e);
          }
          
          console.log('✅ App state refreshed after sync');
        }
      }).catch(error => {
        console.error('Auth sync failed:', error);
      });
    }
  }, [isAuthenticated, hasConsent]);

  // Early theme detection to prevent flash - use system preference as fallback
  useEffect(() => {
    // Check system preference for initial theme
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
      console.log('🎨 Theme applied:', appSettings.dark_mode ? 'dark' : 'light', {
        hasConsent,
        dark_mode: appSettings.dark_mode
      });
    }
  }, [appSettings.dark_mode, hasConsent]);

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
