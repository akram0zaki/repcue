/* eslint-disable no-restricted-syntax -- i18n-exempt: page uses t() per design; remaining literals are units, icons, or technical tokens */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '../utils/localizeExercise';
import type { Exercise, AppSettings, TimerState } from '../types';
import { TIMER_PRESETS, REST_TIME_BETWEEN_SETS, type TimerPreset } from '../constants';
import { ReadyIcon, StarFilledIcon } from '../components/icons/NavigationIcons';
import { VIDEO_DEMOS_ENABLED } from '../config/features';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import type { ExerciseMediaIndex } from '../types/media';
import selectVideoVariant from '../utils/selectVideoVariant';
import { useExerciseVideo } from '../hooks/useExerciseVideo';

interface TimerPageProps {
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
}

const TimerPage: React.FC<TimerPageProps> = ({ 
  exercises, 
  appSettings,
  timerState,
  selectedExercise,
  selectedDuration,
  showExerciseSelector,
  wakeLockSupported,
  wakeLockActive,
  onSetSelectedExercise,
  onSetSelectedDuration,
  onSetShowExerciseSelector,
  onStartTimer,
  onStopTimer,
  onResetTimer
}) => {
  const { t } = useTranslation(['common', 'exercises']);
  // ---------------- Video Demo Integration (Phase 2) ----------------
  // Calculate display values
  const { currentTime, targetTime, isRunning, isCountdown, countdownTime, workoutMode, isResting, restTimeRemaining } = timerState;

  // Rep-based exercise detection (needs selectedExercise so declare early for hook deps below)
  const isRepBased = selectedExercise?.exerciseType === 'repetition-based';

  // ---------------- Video Demo Integration (Phase 2) ----------------
  const [mediaIndex, setMediaIndex] = useState<ExerciseMediaIndex | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [repPulse, setRepPulse] = useState<number>(0); // increments each video loop for visual pulse
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const videoFeatureEnabled = VIDEO_DEMOS_ENABLED && appSettings.showExerciseVideos && !prefersReducedMotion;

  useEffect(() => {
    if (!videoFeatureEnabled) return;
    loadExerciseMedia().then(setMediaIndex).catch(err => { console.warn('Failed to load exercise media', err); });
  }, [videoFeatureEnabled]);

  const restingNow = workoutMode?.isResting || isResting;

  
  const progress = targetTime ? (currentTime / targetTime) * 100 : 0;
  
  // Use workout mode rest state if available, fallback to timer state
  const actuallyResting = workoutMode?.isResting || isResting;
  
  // Countdown progress (reverse of normal progress)
  const countdownProgress = isCountdown && appSettings.preTimerCountdown > 0 
    ? ((appSettings.preTimerCountdown - countdownTime) / appSettings.preTimerCountdown) * 100 
    : 0;
  
  // Rest time calculations
  const displayTime = actuallyResting && restTimeRemaining !== undefined 
    ? restTimeRemaining 
    : (isCountdown ? countdownTime : currentTime); // Show elapsed time, not remaining time
  const displayProgress = actuallyResting && restTimeRemaining !== undefined
    ? ((REST_TIME_BETWEEN_SETS - restTimeRemaining) / REST_TIME_BETWEEN_SETS) * 100
    : (isCountdown ? countdownProgress : progress);

  // Workout mode calculations
  const isWorkoutMode = !!workoutMode;
  const workoutProgress = workoutMode ? 
    // Calculate progress based on actual completion:
    // - During exercise: completed exercises / total (don't count current until done)
    // - During rest: (completed exercises + 1) / total (count the just-completed exercise)
    // - After workout: 100% (all exercises completed)
    (() => {
      const totalExercises = workoutMode.exercises.length;
      const currentIndex = workoutMode.currentExerciseIndex;
      
      // Check if workout is actually completed (currentIndex >= totalExercises)
      if (currentIndex >= totalExercises) {
        return 100; // Workout completed
      }
      
      if (workoutMode.isResting) {
        // During rest: we've completed the exercise we just finished
        // currentIndex points to next exercise, so we've completed currentIndex exercises
        return (currentIndex / totalExercises) * 100;
      } else {
        // During exercise: we've completed the exercises before the current one
        return (currentIndex / totalExercises) * 100;
      }
    })()
    : 0;
  
  // Get current exercise info for workout mode
  const currentWorkoutExercise = workoutMode ? workoutMode.exercises[workoutMode.currentExerciseIndex] : null;
  const workoutCurrentExercise = currentWorkoutExercise ? exercises.find(ex => ex.id === currentWorkoutExercise.exerciseId) : null;
  
  // During rest periods, we want to show the previous exercise as "completed" and the next exercise as "coming up"
  const previousWorkoutExercise = workoutMode && workoutMode.currentExerciseIndex > 0 
    ? workoutMode.exercises[workoutMode.currentExerciseIndex - 1] 
    : null;
  const previousExercise = previousWorkoutExercise ? exercises.find(ex => ex.id === previousWorkoutExercise.exerciseId) : null;
  
  // Choose which exercise to display based on rest state
  const displayExercise = isWorkoutMode 
    ? (actuallyResting ? previousExercise || workoutCurrentExercise : workoutCurrentExercise || selectedExercise)
    : selectedExercise;
  
  // Define exerciseForVideo with proper workout mode support
  const exerciseForVideo = isWorkoutMode 
    ? (workoutCurrentExercise && workoutCurrentExercise.hasVideo ? workoutCurrentExercise : null)
    : (selectedExercise && selectedExercise.hasVideo ? selectedExercise : null);
    
  // Initialize video hook with the correct exercise
  const exerciseVideo = useExerciseVideo({
    exercise: exerciseForVideo,
    mediaIndex,
    enabled: !!videoFeatureEnabled,
    isRunning: timerState.isRunning,
    isActiveMovement: timerState.isRunning && !timerState.isCountdown && !restingNow,
    isPaused: !timerState.isRunning
  });
  
  // Phase 3 T-3.3: Prefetch upcoming exercise video during rest or pre-countdown
  useEffect(() => {
    if (!videoFeatureEnabled || !mediaIndex) return;
    let prefetchUrl: string | null = null;
    // During rest in workout mode: prefetch next exercise's video
    if (workoutMode?.isResting) {
      const nextWorkoutEx = workoutMode.currentExerciseIndex < workoutMode.exercises.length
        ? workoutMode.exercises[workoutMode.currentExerciseIndex]
        : null;
      const nextExercise = nextWorkoutEx ? exercises.find(e => e.id === nextWorkoutEx.exerciseId) : null;
      if (nextExercise?.hasVideo) {
        const m = mediaIndex[nextExercise.id];
        if (m) prefetchUrl = selectVideoVariant(m);
      }
    } else if (isCountdown && exerciseForVideo && exerciseVideo.media) {
      // Standalone or workout about to start: prefetch current exercise video prior to playback
      prefetchUrl = videoUrl || null;
    }
    if (prefetchUrl) {
      const existing = document.querySelector(`link[rel="prefetch"][data-ex-video="${prefetchUrl}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'video';
        link.href = prefetchUrl;
        link.dataset.exVideo = prefetchUrl;
        document.head.appendChild(link);
        return () => { if (link.parentNode) link.parentNode.removeChild(link); };
      }
    }
  }, [videoFeatureEnabled, mediaIndex, workoutMode?.isResting, workoutMode?.currentExerciseIndex, workoutMode?.exercises, isCountdown, videoUrl, exercises, exerciseForVideo, exerciseVideo.media]);

  useEffect(() => {
    if (!exerciseVideo.media) { setVideoUrl(null); return; }
    const update = () => setVideoUrl(selectVideoVariant(exerciseVideo.media));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [exerciseVideo.media]);

  useEffect(() => {
    if (!exerciseVideo || !isRepBased) return;
    exerciseVideo.onLoop(() => {
      setRepPulse(p => p + 1);
    });
  }, [exerciseVideo, isRepBased]);

  const showVideoInsideCircle = !!videoUrl && !!exerciseForVideo && videoFeatureEnabled && exerciseVideo.media && !isCountdown && !restingNow && !exerciseVideo.error;

  // Phase 3 debug aid: log reasons when an exercise marked hasVideo does not actually render
  useEffect(() => {
    if (!exerciseForVideo || !videoFeatureEnabled) return;
    if (showVideoInsideCircle) return; // already visible
    const reasons: string[] = [];
    if (!exerciseVideo.media) reasons.push('missing media metadata');
    if (!videoUrl) reasons.push('no variant chosen');
    if (isCountdown) reasons.push('during countdown');
    if (restingNow) reasons.push('rest state');
    if (exerciseVideo.error) reasons.push('error state');
    if (reasons.length) {
      // One concise debug line (no PII) to assist diagnosing missing video rendering
      console.debug('[VideoDemo] hidden', exerciseForVideo.id, '->', reasons.join(', '));
    }
  }, [exerciseForVideo, videoFeatureEnabled, showVideoInsideCircle, exerciseVideo.media, videoUrl, isCountdown, restingNow, exerciseVideo.error]);
  
  // Rep/Set progress for repetition-based exercises (both workout mode and standalone)
  
  // For workout mode, use workout mode rep/set data
  // For standalone, use timer state rep/set data
  const totalReps = workoutMode?.totalReps || (isRepBased ? timerState.totalReps : undefined);
  const currentRep = workoutMode?.currentRep !== undefined ? workoutMode.currentRep : (isRepBased ? timerState.currentRep : undefined);
  const totalSets = workoutMode?.totalSets || (isRepBased ? timerState.totalSets : undefined);
  const currentSet = workoutMode?.currentSet !== undefined ? workoutMode.currentSet : (isRepBased ? timerState.currentSet : undefined);
  
  // Rep/Set progress calculations
  // SEMANTIC CLARIFICATION:
  // - currentRep: Number of COMPLETED reps (0 = no reps completed, 8 = all 8 reps completed)
  // - currentSet: Number of COMPLETED sets when resting, or current set index when exercising
  // - Display: Shows completed counts and progress percentages
  // - Progress bars: Show completion percentage within current set/exercise
  
  // Set progress: Show progress through all sets, only 100% when exercise complete
  const setProgress = totalSets && currentSet !== undefined
    ? (isResting 
        ? ((currentSet + 1) / totalSets) * 100  // During rest, current set is completed
        : (currentRep !== undefined && currentRep >= (totalReps || 0) && currentSet === totalSets - 1)
          ? 100  // All reps done in final set = exercise complete
          : ((currentSet + (currentRep !== undefined && currentRep >= (totalReps || 0) ? 1 : 0)) / totalSets) * 100)     // Show progress including completed sets
    : 0;
  
  // Rep progress within current set: Show completed reps as percentage  
  const repProgressInSet = totalReps && currentRep !== undefined
    ? (isResting
        ? 100  // During rest, all reps in current set are completed
        : (currentRep / totalReps) * 100)  // Show completed reps in current set
    : 0;

  // For rep-based exercises, use smooth time-based progress for inner circle instead of discrete seconds
  const smoothRepProgress = isRepBased && targetTime && !isCountdown && !isResting
    ? progress  // Use normal time-based progress for smooth rep progression
    : 0;

  // Override displayProgress for rep-based exercises to show smooth progression
  const finalDisplayProgress = isResting && restTimeRemaining !== undefined
    ? ((REST_TIME_BETWEEN_SETS - restTimeRemaining) / REST_TIME_BETWEEN_SETS) * 100
    : (isCountdown ? countdownProgress : 
       isRepBased && !isResting ? smoothRepProgress :  // Use smooth rep progress for rep-based exercises
       displayProgress);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60); // Use Math.floor to remove decimal places
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter favorite exercises for quick access
  const favoriteExercises = exercises.filter(ex => ex.isFavorite).slice(0, 6);

  return (
  <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900" data-testid="timer-page">
      <div className="container mx-auto px-4 py-2 max-w-md">
        
        {/* Workout Mode Header */}
        {isWorkoutMode && (
          <div className="bg-blue-600 text-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{workoutMode.workoutName}</h2>
              <span className="text-sm bg-blue-500 px-2 py-1 rounded">
                {(() => {
                  const currentIndex = workoutMode.currentExerciseIndex;
                  const totalExercises = workoutMode.exercises.length;
                  
                  if (currentIndex >= totalExercises) {
                    // Workout completed
                    return `${totalExercises} / ${totalExercises}`;
                  }
                  
                  if (workoutMode.isResting) {
                    // During rest: show completed exercises
                    return `${currentIndex} / ${totalExercises}`;
                  } else {
                    // During exercise: show current exercise
                    return `${currentIndex + 1} / ${totalExercises}`;
                  }
                })()}
              </span>
            </div>
            
            {/* Workout Progress Bar */}
            <div className="w-full bg-blue-500 rounded-full h-2 mb-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${workoutProgress}%` }}
              />
            </div>
            
            <div className="text-sm opacity-90">
              {actuallyResting 
                ? t('timer.restNext', { next: workoutCurrentExercise?.name || t('common.loading') })
                : t('timer.exerciseWithName', { index: workoutMode.currentExerciseIndex + 1, name: displayExercise?.name || t('common.loading') })
              }
            </div>
          </div>
        )}

        {/* Current Exercise Display - More prominent in workout mode */}
        {isWorkoutMode && displayExercise && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {actuallyResting ? t('timer.restPeriod') : localizeExercise(displayExercise, t).name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {actuallyResting 
                ? t('timer.nextWithCategory', { next: workoutCurrentExercise ? localizeExercise(workoutCurrentExercise, t).name : undefined, category: workoutCurrentExercise?.category })
                : t('timer.currentWithCategory', { category: displayExercise.category })
              }
            </div>
      {localizeExercise(displayExercise, t).description && !actuallyResting && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
        {localizeExercise(displayExercise, t).description}
              </div>
            )}
            {actuallyResting && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                {t('timer.restHint')}
              </div>
            )}
          </div>
        )}

        {/* Exercise Selection - Hidden in workout mode */}
        {!isWorkoutMode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('timer.exerciseLabel')}</span>
              <button
                onClick={() => onSetShowExerciseSelector(true)}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                data-testid="open-exercise-selector"
              >
                {t('common.choose')}
              </button>
            </div>
            
            {selectedExercise ? (
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {localizeExercise(selectedExercise, t).name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {localizeExercise(selectedExercise, t).description}
                </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
              {t('timer.noExerciseSelected')}
            </p>
          )}

          {/* Favorite exercises quick access */}
          {!selectedExercise && favoriteExercises.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('timer.quickSelectFavorites')}</p>
              <div className="grid grid-cols-2 gap-2">
          {favoriteExercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => onSetSelectedExercise(exercise)}
                    className="text-xs py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors truncate"
                  >
            {localizeExercise(exercise, t).name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Timer Duration Selection - Hidden in workout mode and for rep-based exercises */}
        {!isWorkoutMode && selectedExercise?.exerciseType !== 'repetition-based' && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('timer.duration')}</p>
          <div className="grid grid-cols-3 gap-2">
            {TIMER_PRESETS.map(duration => (
              <button
                key={duration}
                onClick={() => onSetSelectedDuration(duration)}
                className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  selectedDuration === duration
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m`}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Rep Duration Display - Shown for repetition-based exercises in standalone mode */}
        {!isWorkoutMode && selectedExercise?.exerciseType === 'repetition-based' && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('timer.repDuration')}</p>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-3">
            <div className="text-center">
              <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {selectedDuration}s per rep
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(selectedExercise.defaultSets || 3)} sets × {(selectedExercise.defaultReps || 8)} reps
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Rep/Set Progress - Shown for repetition-based exercises (both workout mode and standalone) */}
        {selectedExercise?.exerciseType === 'repetition-based' && totalSets && totalReps && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{t('timer.setProgress')}</span>
                <span>{
                  isResting 
                    ? t('timer.setsCompleted', { completed: (currentSet || 0) + 1, total: totalSets, count: totalSets })
                    : (currentRep !== undefined && currentRep >= (totalReps || 0))
                      ? t('timer.setsCompleted', { completed: (currentSet || 0) + 1, total: totalSets, count: totalSets })
                      : t('timer.setsCompleted', { completed: (currentSet || 0), total: totalSets, count: totalSets })
                }</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${setProgress}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{t('timer.repProgress')}</span>
                <span>{isResting ? totalReps : (currentRep || 0)} / {totalReps}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${repProgressInSet}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Countdown Banner */}
        {isCountdown && (
          <div className="bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-3 mb-4 text-center">
            <div className="text-orange-800 dark:text-orange-300 font-medium text-sm flex items-center justify-center gap-2">
              <ReadyIcon size={16} />
              {t('timer.getReadyStartsIn', { count: countdownTime })}
            </div>
          </div>
        )}

        {/* Timer Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          {/* Circular Progress */}
      <div className={`relative w-40 h-40 mx-auto mb-4 ${repPulse ? 'transition-transform' : ''}`}
            aria-live="off"
          >
            {showVideoInsideCircle && (
              // Inset the video slightly so progress ring(s) wrap AROUND, not over, the media
        <div className="absolute inset-2 sm:inset-3 rounded-full overflow-hidden z-0" data-testid="exercise-video-wrapper">
                <video
                  ref={exerciseVideo.videoRef}
                  src={videoUrl || undefined}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  aria-label={`${selectedExercise?.name || 'Exercise'} demo video`}
          data-testid="exercise-video"
                  onLoadedData={() => {
                    // Safety: ensure play attempt if hook's effect missed due to timing
                    if (exerciseVideo.videoRef.current && exerciseVideo.videoRef.current.paused && timerState.isRunning && !timerState.isCountdown && !restingNow) {
                      exerciseVideo.videoRef.current.play().catch(() => {});
                    }
                  }}
                />
                {/* Subtle overlay to maintain ring contrast */}
                <div className="absolute inset-0 bg-black/10 dark:bg-black/20 pointer-events-none" />
              </div>
            )}
            <svg className="transform -rotate-90 w-40 h-40">
              {/* For repetition-based exercises (both workout mode and standalone): show nested circles */}
              {selectedExercise?.exerciseType === 'repetition-based' && totalReps && totalSets ? (
                <>
                  {/* Outer circle for set progress (reps within current set) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="75"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="75"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 75}`}
                    strokeDashoffset={`${2 * Math.PI * 75 * (1 - repProgressInSet / 100)}`}
                    className={`text-green-500 transition-all duration-300 ${repPulse ? 'animate-pulse' : ''}`}
                    strokeLinecap="round"
                  />
                  
                  {/* Inner circle for individual rep progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - finalDisplayProgress / 100)}`}
                    className={`transition-all duration-300 ${
                      isCountdown 
                        ? 'text-orange-500' 
                        : isResting
                          ? 'text-purple-500'  // Purple for rest progress
                          : 'text-blue-500'    // Blue for rep progress (fixed color)
                    }`}
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  {/* Standard timer display for time-based exercises - single circle only */}
                  {/* No outer circle for time-based exercises to keep UI clean */}
                  
                  {/* Inner circle for timer progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - finalDisplayProgress / 100)}`}
                    className={`transition-all duration-300 ${
                      isCountdown 
                        ? 'text-orange-500' 
                        : isResting
                          ? 'text-purple-500'  // Purple for rest progress
                          : 'text-blue-500'    // Blue for rep progress (fixed color)
                    }`}
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center z-10" data-testid="timer-display">
              <div className="text-center">
                {isCountdown ? (
                  <>
                    <div className="text-4xl font-bold text-orange-500 dark:text-orange-400">
                      {countdownTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('timer.getReadyEllipsis')}
                    </div>
                  </>
                ) : isRepBased && !actuallyResting && currentRep !== undefined && totalReps !== undefined && currentRep < totalReps ? (
                  // Rep-based exercise display: show rep progress instead of time countdown
                  // Only show when not all reps are completed
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 drop-shadow-sm">
                      Rep {(currentRep || 0) + 1}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      of {totalReps} in Set {(currentSet || 0) + 1}/{totalSets}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-3xl font-bold drop-shadow-sm ${
                      isCountdown && displayTime <= 10 && displayTime > 0 
                        ? 'text-red-500 dark:text-red-400' 
                        : actuallyResting
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {formatTime(displayTime)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {actuallyResting 
                        ? t('timer.restPeriod')
                        : isWorkoutMode 
                          ? (() => {
                              const currentIndex = workoutMode.currentExerciseIndex;
                              const totalExercises = workoutMode.exercises.length;
                              if (currentIndex >= totalExercises) {
                                return t('timer.exerciseComplete', { total: totalExercises });
                              }
                              return t('timer.exerciseIndexOf', { index: currentIndex + 1, total: totalExercises });
                            })()
                          : targetTime ? t('timer.ofDuration', { duration: formatTime(targetTime) }) : t('timer.setDuration')
                      }
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center space-x-3">
            {!isRunning ? (
              <button
                onClick={onStartTimer}
                disabled={!selectedExercise}
                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="start-timer"
              >
                {t('common.start')}
              </button>
            ) : (
              <button
                onClick={() => onStopTimer()}
                className="btn-secondary px-8"
                data-testid="stop-timer"
              >
                {isCountdown ? t('common.cancel') : t('common.stop')}
              </button>
            )}
            
            <button
              onClick={onResetTimer}
              className="btn-ghost px-6"
              data-testid="reset-timer"
            >
              {t('common.reset')}
            </button>
          </div>
        </div>

        {/* Exercise Controls - Shown for workout mode or standalone rep-based exercises */}
        {(isWorkoutMode || (selectedExercise?.exerciseType === 'repetition-based' && totalSets && totalReps)) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
              {isWorkoutMode ? t('timer.workoutControls') : t('timer.exerciseControls')}
            </h3>
            
            {selectedExercise?.exerciseType === 'repetition-based' && totalSets && totalReps && (
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      // Note: This would need state management through props
                      // For now, this is a placeholder for rep advancement
                      console.log('Next rep clicked');
                    }}
                    disabled={(currentRep || 0) >= (totalReps || 0)}
                    className="btn-secondary text-xs py-2 disabled:opacity-50"
                  >
                    {t('timer.nextRep', { current: (currentRep || 0) + 1, total: totalReps })}
                  </button>
                  
                  <button
                    onClick={() => {
                      // Complete current set or exercise
                      const currentSetNum = (currentSet || 0) + 1;
                      const totalSetNum = totalSets || 1;
                      const isLastSet = currentSetNum >= totalSetNum;
                      if (isLastSet) {
                        onStopTimer(true);
                      } else {
                        console.log('Next set clicked');
                      }
                    }}
                    className="btn-primary text-xs py-2"
                  >
                    {((currentSet || 0) + 1) >= (totalSets || 1)
                      ? t('timer.completeExercise')
                      : t('timer.nextSet', { current: (currentSet || 0) + 1, total: totalSets })}
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onStopTimer(true)}
                className="btn-secondary text-xs py-2"
              >
                {t('timer.completeExercise')}
              </button>
              
              <button
                onClick={onResetTimer}
                className="btn-ghost text-xs py-2"
              >
                {t('timer.exitWorkout')}
              </button>
            </div>
          </div>
        )}

        {/* Timer Info */}
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 text-xs" data-testid={(!timerState.isRunning && !timerState.isCountdown && timerState.currentTime === (timerState.targetTime || 0) && timerState.targetTime) ? 'timer-complete' : undefined}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('timer.beepInterval')}</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {appSettings.intervalDuration}s
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('timer.wakeLock')}</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {wakeLockSupported ? (wakeLockActive ? t('common.on') : t('common.off')) : t('common.notSupported')}
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Selector Modal */}
        {showExerciseSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-t-lg w-full max-w-md max-h-[70vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('timer.selectExercise')}
                  </h3>
                  <button
                    onClick={() => onSetShowExerciseSelector(false)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {exercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      onSetSelectedExercise(exercise);
                      onSetShowExerciseSelector(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {localizeExercise(exercise, t).name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`exercises.category.${exercise.category.replace('-', '')}`, { defaultValue: exercise.category.replace('-', ' ') })}
                        </p>
                      </div>
                      {exercise.isFavorite && (
                        <StarFilledIcon size={16} className="text-yellow-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerPage; 