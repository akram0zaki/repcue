import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { consentService } from './services/consentService';
import { storageService } from './services/storageService';
import { audioService } from './services/audioService';
import { INITIAL_EXERCISES } from './data/exercises';
import { useWakeLock } from './hooks/useWakeLock';
import ConsentBanner from './components/ConsentBanner';
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
      const repDuration = Math.round(BASE_REP_TIME * appSettings.repSpeedFactor);
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
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isCountdown: false,
      countdownTime: 0,
      currentTime: 0,
      targetTime: selectedDuration,
      startTime: new Date(),
      currentExercise: selectedExercise || undefined,
      ...repSetState
    }));

    // Start the main timer interval
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
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

        // Only update if the elapsed time has actually changed
        if (elapsed !== prev.currentTime) {
          return { ...prev, currentTime: elapsed };
        }

        return prev;
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
    }, 1000);
  }, [selectedExercise, selectedDuration, appSettings, timerState.workoutMode]);

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
        const repDuration = Math.round(BASE_REP_TIME * appSettings.repSpeedFactor);
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
        
        // Calculate rep duration based on base time and speed factor
        const repDuration = Math.round(BASE_REP_TIME * appSettings.repSpeedFactor); // BASE_REP_TIME * speed factor
        
        // Update workout mode with rep/set info
        setTimerState(prev => ({
          ...prev,
          workoutMode: prev.workoutMode ? {
            ...prev.workoutMode,
            currentSet: 0, // Start at 0 to show 0/3 initially
            totalSets: sets,
            currentRep: 0, // Start at 0 to show 0/8 initially
            totalReps: reps
          } : prev.workoutMode
        }));
        
        // Set timer duration for individual reps
        setSelectedDuration(repDuration as TimerPreset);
      }
    }

    // Announce workout start
    if (appSettings.soundEnabled) {
      audioService.announceText(`Starting workout: ${workoutData.workoutName}. ${workoutData.exercises.length} exercises planned.`);
    }
  }, [exercises, appSettings.soundEnabled]);

  // Advance workout to next exercise or complete workout
  const advanceWorkout = useCallback(async () => {
    const { workoutMode } = timerState;
    if (!workoutMode) return;

    const currentIndex = workoutMode.currentExerciseIndex;
    const isLastExercise = currentIndex >= workoutMode.exercises.length - 1;

    if (isLastExercise) {
      // Workout completed
      if (appSettings.soundEnabled) {
        audioService.announceText(`Workout completed! Great job on ${workoutMode.workoutName}`);
      }

      // Save workout session completion
      if (consentService.hasConsent() && workoutMode.sessionId) {
        const workoutSession: WorkoutSession = {
          id: workoutMode.sessionId,
          workoutId: workoutMode.workoutId,
          workoutName: workoutMode.workoutName,
          startTime: new Date(Date.now() - (timerState.currentTime * 1000)), // Approximate start time
          endTime: new Date(),
          exercises: [], // TODO: Track individual exercise completion in Phase 5
          isCompleted: true,
          completionPercentage: 100,
          totalDuration: timerState.currentTime
        };
        
        try {
          await storageService.saveWorkoutSession(workoutSession);
        } catch (error) {
          console.error('Failed to save workout session:', error);
        }
      }

      // Reset timer state
      await resetTimer();
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
          setTimerState(prev => ({
            ...prev,
            workoutMode: prev.workoutMode ? {
              ...prev.workoutMode,
              currentExerciseIndex: nextExerciseIndex,
              isResting: true,
              restTimeRemaining: restTime
            } : prev.workoutMode,
            isRunning: true,
            currentTime: 0,
            targetTime: restTime,
            isCountdown: false,
            countdownTime: 0
          }));

          if (appSettings.soundEnabled) {
            audioService.announceText(`Rest time: ${restTime} seconds. Next exercise: ${nextExercise.name}`);
          }
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
            const repDuration = Math.round(BASE_REP_TIME * appSettings.repSpeedFactor);
            
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
  }, [timerState, exercises, appSettings.soundEnabled, resetTimer]);

  // Handle timer completion
  useEffect(() => {
    const { isRunning, currentTime, targetTime, currentExercise, workoutMode } = timerState;
    
    if (isRunning && targetTime && currentTime >= targetTime) {
      if (workoutMode) {
        if (workoutMode.isResting) {
          // Rest period completed, start next exercise
          const nextWorkoutExercise = workoutMode.exercises[workoutMode.currentExerciseIndex];
          const nextExercise = exercises.find(ex => ex.id === nextWorkoutExercise.exerciseId);
          
          if (nextExercise) {
            setSelectedExercise(nextExercise);
            setTimerState(prev => ({
              ...prev,
              workoutMode: prev.workoutMode ? {
                ...prev.workoutMode,
                isResting: false,
                restTimeRemaining: undefined
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
              const repDuration = Math.round(BASE_REP_TIME * appSettings.repSpeedFactor);
              
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

            if (appSettings.soundEnabled) {
              audioService.announceText(`Rest complete. Starting ${nextExercise.name}`);
            }
          }
        } else {
          // Check if this is a repetition-based exercise that needs rep/set advancement
          if (currentExercise?.exerciseType === 'repetition-based' && workoutMode.totalReps && workoutMode.totalSets) {
            const currentRep = workoutMode.currentRep || 0;
            const currentSet = workoutMode.currentSet || 0;
            const totalReps = workoutMode.totalReps;
            const totalSets = workoutMode.totalSets;
            
            if (currentRep < totalReps) {
              // Advance to next rep in current set (or complete current rep)
              const nextRep = currentRep + 1;
              
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentRep: nextRep
                } : prev.workoutMode,
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
                intervalRef.current = setInterval(() => {
                  const elapsed = Math.floor((Date.now() - newStartTime) / 1000);
                  
                  setTimerState(prev => {
                    if (!prev.isRunning || !prev.targetTime) {
                      return prev;
                    }

                    const remaining = prev.targetTime - elapsed;

                    if (remaining <= 0) {
                      return { ...prev, currentTime: prev.targetTime };
                    }

                    if (elapsed !== prev.currentTime) {
                      return { ...prev, currentTime: elapsed };
                    }

                    return prev;
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
                }, 1000);
              } else {
                // This was the last rep of the set, check if we need to advance to next set
                if (currentSet < totalSets - 1) {
                  // Start rest period before next set
                  if (appSettings.soundEnabled) {
                    audioService.announceText(`Set completed! Rest for ${REST_TIME_BETWEEN_SETS} seconds`);
                  }
                } else {
                  // All sets completed, exercise is done
                  if (appSettings.soundEnabled) {
                    audioService.announceText('Exercise completed!');
                  }
                }
              }
            } else if (currentSet < totalSets - 1) {
              // Advance to next set, reset reps
              setTimerState(prev => ({
                ...prev,
                workoutMode: prev.workoutMode ? {
                  ...prev.workoutMode,
                  currentSet: currentSet + 1,
                  currentRep: 0
                } : prev.workoutMode,
                currentTime: 0,
                isRunning: true,  // Keep running
                targetTime: selectedDuration
              }));
              
              if (appSettings.soundEnabled) {
                audioService.announceText(`Set ${currentSet + 2} of ${totalSets}. Rep 1 of ${totalReps}`);
              }
              
              // Restart timer interval for next set without full reset
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              
              const newStartTime = Date.now();
              intervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - newStartTime) / 1000);
                
                setTimerState(prev => {
                  if (!prev.isRunning || !prev.targetTime) {
                    return prev;
                  }

                  const remaining = prev.targetTime - elapsed;

                  if (remaining <= 0) {
                    return { ...prev, currentTime: prev.targetTime };
                  }

                  if (elapsed !== prev.currentTime) {
                    return { ...prev, currentTime: elapsed };
                  }

                  return prev;
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
              }, 1000);
            } else {
              // All reps and sets completed for this exercise, advance to next exercise
              advanceWorkout();
            }
          } else {
            // Time-based exercise completed, advance workout
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
              intervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - newStartTime) / 1000);
                
                setTimerState(prev => {
                  if (!prev.isRunning || !prev.targetTime) {
                    return prev;
                  }

                  const remaining = prev.targetTime - elapsed;

                  if (remaining <= 0) {
                    // Timer completed - clear interval immediately to prevent double triggers
                    clearInterval(intervalRef.current!);
                    return { ...prev, currentTime: prev.targetTime };
                  }

                  if (elapsed !== prev.currentTime) {
                    return { ...prev, currentTime: elapsed };
                  }

                  return prev;
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
              }, 1000);
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
                      
                      // Clear rest interval to prevent double triggers
                      clearInterval(intervalRef.current!);
                      
                      // Start new timer for next set immediately
                      const nextSetStartTime = Date.now();
                      intervalRef.current = setInterval(() => {
                        const elapsed = Math.floor((Date.now() - nextSetStartTime) / 1000);
                        
                        setTimerState(prev => {
                          if (!prev.isRunning || prev.isResting || !prev.targetTime) {
                            return prev;
                          }

                          const remaining = prev.targetTime - elapsed;

                          if (remaining <= 0) {
                            // Timer completed - clear interval immediately to prevent double triggers
                            clearInterval(intervalRef.current!);
                            return { ...prev, currentTime: prev.targetTime };
                          }

                          if (elapsed !== prev.currentTime) {
                            return { ...prev, currentTime: elapsed };
                          }

                          return prev;
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
                      }, 1000);
                      
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
                // All sets completed, exercise is done
                if (appSettings.soundEnabled) {
                  audioService.announceText('Exercise completed!');
                }
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
                  
                  // Clear rest interval to prevent double triggers
                  clearInterval(intervalRef.current!);
                  
                  // Clear rest interval and start rep timer for next set
                  clearInterval(intervalRef.current!);
                  
                  // Start new timer for next set immediately
                  const nextSetStartTime = Date.now();
                  intervalRef.current = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - nextSetStartTime) / 1000);
                    
                    setTimerState(prev => {
                      if (!prev.isRunning || prev.isResting || !prev.targetTime) {
                        return prev;
                      }

                      const remaining = prev.targetTime - elapsed;

                      if (remaining <= 0) {
                        // Timer completed - clear interval immediately to prevent double triggers
                        clearInterval(intervalRef.current!);
                        return { ...prev, currentTime: prev.targetTime };
                      }

                      if (elapsed !== prev.currentTime) {
                        return { ...prev, currentTime: elapsed };
                      }

                      return prev;
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
                  }, 1000);
                  
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
                duration: totalSets * totalReps * (targetTime || 0), // Total time for all reps/sets
                timestamp: new Date(),
                notes: `Completed ${totalSets} sets of ${totalReps} reps`
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
      }
    }
  }, [timerState, stopTimer, advanceWorkout, exercises, appSettings.soundEnabled, appSettings.repSpeedFactor]);

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
          
          // Merge with defaults to handle new settings properties
          const settingsToSet = storedSettings ? {
            ...DEFAULT_APP_SETTINGS,
            ...storedSettings
          } : DEFAULT_APP_SETTINGS;
          
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

  const handleSetSelectedExercise = (exercise: Exercise | null, settings?: AppSettings) => {
    setSelectedExercise(exercise);
    updateAppSettings({ lastSelectedExerciseId: exercise ? exercise.id : null });
    
    // Set appropriate duration for rep-based exercises
    if (exercise?.exerciseType === 'repetition-based') {
      const currentSettings = settings || appSettings;
      const repDuration = Math.round(BASE_REP_TIME * currentSettings.repSpeedFactor);
      setSelectedDuration(repDuration as TimerPreset);
    }
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
