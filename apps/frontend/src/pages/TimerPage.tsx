/* eslint-disable no-restricted-syntax -- i18n-exempt: page uses t() per design; remaining literals are units, icons, or technical tokens */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeExercise } from '../utils/localizeExercise';
import type { Exercise, AppSettings, TimerState } from '../types';
import { TIMER_PRESETS, REST_TIME_BETWEEN_SETS, type TimerPreset } from '../constants';
import { ReadyIcon } from '../components/icons/NavigationIcons';
import { VIDEO_DEMOS_ENABLED } from '../config/features';
import { ExerciseSelectorModal } from '../components/ExerciseSelector';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import type { ExerciseMediaIndex } from '../types/media';
import selectVideoVariant from '../utils/selectVideoVariant';
import { useExerciseVideo } from '../hooks/useExerciseVideo';
import getVideoSources from '../utils/videoSources';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import logger from '../utils/logger';

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
  onUpdateSettings?: (patch: Partial<AppSettings>) => void;
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
  onResetTimer,
  onUpdateSettings
}) => {
  const { t } = useTranslation(['common', 'exercises', 'exerciseDetails']);
  
  // State for collapsible duration selector
  const [isDurationExpanded, setIsDurationExpanded] = useState(false);
  
  // ---------------- Video Demo Integration (Phase 2) ----------------
  // Calculate display values
  const { currentTime, targetTime, isRunning, isCountdown, countdownTime, workoutMode, isResting, restTimeRemaining } = timerState;

  // Format duration for display
  const formatDuration = (duration: number): string => {
    return duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m`;
  };

  // Handle duration selection (auto-collapse after selection)
  const handleDurationSelect = (duration: TimerPreset) => {
    onSetSelectedDuration(duration);
    setIsDurationExpanded(false);
  };

  // Rep-based exercise detection (needs selectedExercise so declare early for hook deps below)
  const isRepBased = selectedExercise?.exercise_type === 'repetition_based';

  // ---------------- Video Demo Integration (Phase 2) ----------------
  const [mediaIndex, setMediaIndex] = useState<ExerciseMediaIndex | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [repPulse, setRepPulse] = useState<number>(0); // increments each video loop for visual pulse
  const prefersReducedMotion = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const mediaQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      return mediaQuery ? mediaQuery.matches : false;
    } catch {
      return false;
    }
  })();
  const videoFeatureEnabled = VIDEO_DEMOS_ENABLED && (appSettings.show_exercise_videos ?? true) && !prefersReducedMotion;

  useEffect(() => {
    if (!videoFeatureEnabled) return;
    loadExerciseMedia().then(setMediaIndex).catch(err => { logger.warn('Failed to load exercise media', err); });
  }, [videoFeatureEnabled]);

  const restingNow = workoutMode?.isResting || isResting;

  
  const progress = targetTime ? (currentTime / targetTime) * 100 : 0;
  
  // Use workout mode rest state if available, fallback to timer state
  const actuallyResting = workoutMode?.isResting || isResting;
  
  // Countdown progress (reverse of normal progress)
  const countdownProgress = isCountdown && appSettings.pre_timer_countdown > 0 
    ? ((appSettings.pre_timer_countdown - countdownTime) / appSettings.pre_timer_countdown) * 100 
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
  const workoutCurrentExercise = currentWorkoutExercise ? exercises.find(ex => ex.id === currentWorkoutExercise.exercise_id) : null;
  
  
  
  // Define exerciseForVideo with proper workout mode support
  const exerciseForVideo = isWorkoutMode
    ? (
        // If workout is completed (currentExerciseIndex >= total exercises), don't show any video
        workoutMode && workoutMode.currentExerciseIndex >= workoutMode.exercises.length
          ? null
          : (
              workoutCurrentExercise && (
                // Show when a custom URL exists, or media metadata is available in the index
                !!workoutCurrentExercise.custom_video_url ||
                !!(mediaIndex && workoutCurrentExercise.id && (mediaIndex as any)[workoutCurrentExercise.id])
              )
                ? workoutCurrentExercise
                : null
            )
      )
    : (
        selectedExercise && (
          !!selectedExercise.custom_video_url ||
          !!(mediaIndex && selectedExercise.id && (mediaIndex as any)[selectedExercise.id])
        )
          ? selectedExercise
          : null
      );
    
  // Initialize video hook with the correct exercise
  const exerciseVideo = useExerciseVideo({
    exercise: exerciseForVideo,
    mediaIndex,
    enabled: !!videoFeatureEnabled,
    isRunning: timerState.isRunning,
    isActiveMovement: timerState.isRunning && !timerState.isCountdown && !restingNow,
    isPaused: !timerState.isRunning,
    repSpeedFactor: appSettings.rep_speed_factor
  });
  
  // Phase 3 T-3.3: Prefetch upcoming exercise video during rest or pre-countdown
  useEffect(() => {
    if (!videoFeatureEnabled) return;

    const prefetchVideos = async () => {
      let prefetchUrl: string | null = null;

      // During rest in workout mode: prefetch next exercise's video
      if (workoutMode?.isResting) {
        const nextWorkoutEx = workoutMode.currentExerciseIndex < workoutMode.exercises.length
          ? workoutMode.exercises[workoutMode.currentExerciseIndex]
          : null;
        const nextExercise = nextWorkoutEx ? exercises.find(e => e.id === nextWorkoutEx.exercise_id) : null;
        if (
          (nextExercise && nextExercise.custom_video_url) ||
          (nextExercise && mediaIndex && mediaIndex[nextExercise.id])
        ) {
          if (nextExercise && nextExercise.custom_video_url) {
            prefetchUrl = await resolveVideoUrl(nextExercise.custom_video_url);
          } else if (mediaIndex && nextExercise) {
            const m = mediaIndex[nextExercise.id];
            if (m) prefetchUrl = selectVideoVariant(m);
          }
        }
      } else if (isCountdown && exerciseForVideo && exerciseVideo.media) {
        // Standalone or workout about to start: prefetch current exercise video prior to playback
        prefetchUrl = videoUrl || null;
      }

      if (prefetchUrl) {
        // Skip prefetch for blob URLs as they're already in memory and don't need network prefetching
        const isBlobUrl = prefetchUrl.startsWith('blob:');
        if (!isBlobUrl) {
          const existing = document.querySelector(`link[rel="prefetch"][data-ex-video="${prefetchUrl}"]`);
          if (!existing) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'video';
            link.href = prefetchUrl;
            link.dataset.exVideo = prefetchUrl;
            document.head.appendChild(link);
            // Note: Cleanup is handled by next effect run or component unmount
          }
        }
      }
    };

    prefetchVideos().catch(error => {
      logger.warn('Failed to prefetch video:', error);
    });
  }, [videoFeatureEnabled, mediaIndex, workoutMode?.isResting, workoutMode?.currentExerciseIndex, workoutMode?.exercises, isCountdown, videoUrl, exercises, exerciseForVideo, exerciseVideo.media]);

  useEffect(() => {
    if (!exerciseVideo.media) { setVideoUrl(null); return; }
    const update = () => setVideoUrl(selectVideoVariant(exerciseVideo.media));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [exerciseVideo.media]);

  // Force reload when URL changes so new <source> children are considered by the media element
  useEffect(() => {
    const v = exerciseVideo.videoRef.current;
    if (v) {
      try { v.load(); } catch {}
    }
  }, [videoUrl, exerciseVideo.videoRef]);

  useEffect(() => {
    if (!exerciseVideo || !isRepBased) return;
    exerciseVideo.onLoop(() => {
      setRepPulse(p => p + 1);
    });
  }, [exerciseVideo, isRepBased]);

  const showVideoInsideCircle = !!videoUrl && !!exerciseForVideo && videoFeatureEnabled && exerciseVideo.media && !isCountdown && !restingNow && !exerciseVideo.error;

  // Phase 3 debug aid: log reasons when an exercise marked has_video does not actually render
  useEffect(() => {
  if (!exerciseForVideo || !videoFeatureEnabled) return;
    if (showVideoInsideCircle) return; // already visible
    const reasons: string[] = [];
  if (appSettings.show_exercise_videos === false) reasons.push('user setting off');
  if (!VIDEO_DEMOS_ENABLED) reasons.push('feature flag disabled');
    if (!exerciseVideo.media) reasons.push('missing media metadata');
    if (!videoUrl) reasons.push('no variant chosen');
    if (isCountdown) reasons.push('during countdown');
    if (restingNow) reasons.push('rest state');
    if (exerciseVideo.error) reasons.push('error state');
    if (reasons.length) {
      // One concise debug line (no PII) to assist diagnosing missing video rendering
      logger.debug('[VideoDemo] hidden', exerciseForVideo.id, '->', reasons.join(', '));
    }
  }, [exerciseForVideo, videoFeatureEnabled, showVideoInsideCircle, exerciseVideo.media, videoUrl, isCountdown, restingNow, exerciseVideo.error, appSettings.show_exercise_videos]);
  
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
  const favoriteExercises = exercises.filter(ex => ex.is_favorite).slice(0, 6);

  return (
  <div id="main-content" className="min-h-screen pt-safe pb-16 bg-gray-50 dark:bg-gray-900" data-testid="timer-page">
      <div className="container mx-auto px-3 py-1 max-w-md">
        
        {/* Compact Workout Mode Header */}
        {isWorkoutMode && (
          <div className="workout-mode-header rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold truncate">{workoutMode.workoutName}</h2>
              <span className="text-xs workout-mode-badge px-2 py-0.5 rounded">
                {(() => {
                  const currentIndex = workoutMode.currentExerciseIndex;
                  const totalExercises = workoutMode.exercises.length;

                  if (currentIndex >= totalExercises) {
                    return `${totalExercises}/${totalExercises}`;
                  }

                  if (workoutMode.isResting) {
                    return `${currentIndex}/${totalExercises}`;
                  } else {
                    return `${currentIndex + 1}/${totalExercises}`;
                  }
                })()}
              </span>
            </div>

            {/* Current Exercise Name */}
            {workoutCurrentExercise && !workoutMode.isResting && workoutMode.currentExerciseIndex < workoutMode.exercises.length && (
              <div className="text-sm opacity-90 truncate mb-1">
                {localizeExercise(workoutCurrentExercise, t).name}
              </div>
            )}
            {workoutMode.isResting && (
              <div className="text-sm opacity-90 truncate mb-1">
                {t('timer.restPeriod')}
              </div>
            )}
            
            {/* Compact Workout Progress Bar */}
            <div className="progress progress--inverse">
              <div className="progress__track">
                <div className="progress__bar" style={{ ['--progress' as unknown as string]: workoutProgress } as React.CSSProperties} />
              </div>
            </div>
          </div>
        )}


        {/* Compact Exercise Selection - Hidden in workout mode */}
        {!isWorkoutMode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('timer.exerciseLabel')}</span>
              {selectedExercise ? (
                <button
                  onClick={() => onSetShowExerciseSelector(true)}
                  className="link text-sm font-medium hover:underline truncate max-w-48"
                  data-testid="selected-exercise-button"
                >
                  {localizeExercise(selectedExercise, t).name}
                </button>
              ) : (
                <button
                  onClick={() => onSetShowExerciseSelector(true)}
                  className="link text-sm font-medium hover:underline"
                  data-testid="open-exercise-selector"
                >
                  {t('common.choose')}
                </button>
              )}
            </div>
            
            {/* Favorite exercises quick access - only shown when no exercise selected */}
            {!selectedExercise && favoriteExercises.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('timer.quickSelectFavorites')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {favoriteExercises.map(exercise => (
                    <button
                      key={exercise.id}
                      onClick={() => onSetSelectedExercise(exercise)}
                      className="text-xs py-2 px-3 workout-favorite-btn rounded-md transition-colors truncate"
                    >
                      {localizeExercise(exercise, t).name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Timer Duration Selection - Hidden in workout mode and for rep-based exercises */}
        {!isWorkoutMode && selectedExercise?.exercise_type !== 'repetition_based' && (
        <div className="mb-2">
          {/* Duration Header - Shows current selection and toggle */}
          <button
            onClick={() => setIsDurationExpanded(!isDurationExpanded)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('timer.duration')}</span>
              <span className="text-sm px-2 py-0.5 rounded font-medium duration-badge">
                {formatDuration(selectedDuration)}
              </span>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${isDurationExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Expandable Duration Options */}
          {isDurationExpanded && (
            <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-2">
                {TIMER_PRESETS.map(duration => {
                  const active = selectedDuration === duration;
                  return (
                    <button
                      key={duration}
                      onClick={() => handleDurationSelect(duration)}
                      className={`duration-option ${active ? 'duration-option-active' : ''}`}
                    >
                      {formatDuration(duration)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}


        {/* Countdown Banner */}
        {isCountdown && (
          <div className="bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-2 mb-2 text-center">
            <div className="text-orange-800 dark:text-orange-300 font-medium text-sm flex items-center justify-center gap-2">
              <ReadyIcon size={16} />
              {t('timer.getReadyStartsIn', { count: countdownTime })}
            </div>
          </div>
        )}

        {/* Enhanced Timer Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-3">
          {/* Conditional Timer Display: Circular (ring_timer: true) or Rectangular (ring_timer: false) */}
          {appSettings.ring_timer !== false ? (
            /* Circular Timer with Rings */
            <div
              className={`relative mx-auto mb-3 ${repPulse ? 'transition-transform' : ''} timer-square-280`}
              aria-live="off"
            >
            {showVideoInsideCircle && ((() => {
              logger.debug('[TimerPage] Rendering video element', { url: videoUrl, factor: appSettings.rep_speed_factor });
              return (
              <div
                className="absolute inset-4 sm:inset-6 rounded-full overflow-hidden z-[1] flex items-center justify-center"
                data-testid="exercise-video-wrapper"
              >
                {/* Inset the video slightly so progress ring(s) wrap AROUND, not over, the media */}
                <video
                  key={selectedExercise?.id || 'no-exercise'}
                  ref={exerciseVideo.videoRef}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className={`h-full w-full ${appSettings.video_fit_mode === 'fit' ? 'object-contain' : 'object-cover'} object-center mx-auto block gpu-accelerated`}
                  aria-label={`${selectedExercise?.name || 'Exercise'} demo video`}
                  data-testid="exercise-video"
                  onLoadedMetadata={(e) => {
                    // Set playback rate as soon as metadata is loaded (before autoPlay starts)
                    const video = e.currentTarget;
                    const playbackRate = 1 / appSettings.rep_speed_factor;
                    video.playbackRate = playbackRate;
                  }}
                  onPlay={(e) => {
                    // CRITICAL: Set playback rate right when video starts playing
                    const video = e.currentTarget;
                    const playbackRate = 1 / appSettings.rep_speed_factor;
                    video.playbackRate = playbackRate;
                  }}
                  onLoadedData={() => {
                    // Safety: ensure play attempt if hook's effect missed due to timing
                    if (exerciseVideo.videoRef.current && exerciseVideo.videoRef.current.paused && timerState.isRunning && !timerState.isCountdown && !restingNow) {
                      exerciseVideo.videoRef.current.play().catch(() => {});
                    }
                  }}
                >
                  {getVideoSources(videoUrl).map(s => (
                    <source key={s.src} src={s.src} type={s.type} />
                  ))}
                </video>
                {/* Subtle overlay to maintain ring contrast */}
                <div className="absolute inset-0 bg-black/10 dark:bg-black/20 pointer-events-none" />
              </div>
              );
            })())}
            {/* Show exercise description when no video is available */}
            {!showVideoInsideCircle && selectedExercise && !isCountdown && !restingNow && (
              <div
                className="absolute inset-4 sm:inset-6 rounded-full flex items-center justify-center z-[1] p-4"
                data-testid="exercise-description-wrapper"
              >
                <div className="text-center max-h-full overflow-y-auto">
                  <p className="text-sm sm:text-base text-text-700 dark:text-text-200 leading-relaxed">
                    {localizeExercise(selectedExercise, t).description || selectedExercise.name}
                  </p>
                </div>
              </div>
            )}
            <svg 
              className="transform -rotate-90 pointer-events-none relative z-0 timer-square-280" 
              viewBox="0 0 280 280"
            >
              {/* For repetition-based exercises (both workout mode and standalone): show nested circles */}
              {selectedExercise?.exercise_type === 'repetition_based' && totalReps && totalSets ? (
                <>
                  {/* Outer circle for set progress (reps within current set) */}
                  <circle
                    cx="140"
                    cy="140"
                    r="125"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="125"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 125}`}
                    strokeDashoffset={`${2 * Math.PI * 125 * (1 - repProgressInSet / 100)}`}
                    className={`text-green-500 transition-all duration-300 ${repPulse ? 'animate-pulse' : ''}`}
                    strokeLinecap="round"
                  />
                  
                  {/* Inner circle for individual rep progress */}
                  <circle
                    cx="140"
                    cy="140"
                    r="105"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="105"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 105}`}
                    strokeDashoffset={`${2 * Math.PI * 105 * (1 - finalDisplayProgress / 100)}`}
                    className={`transition-all duration-300 ${
                      isCountdown 
                        ? 'text-orange-500' 
                        : isResting
                          ? 'text-purple-500'
                          : 'timer-progress-circle'
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
                    cx="140"
                    cy="140"
                    r="115"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="115"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 115 * finalDisplayProgress / 100} ${2 * Math.PI * 115}`}
                    strokeDashoffset={`${2 * Math.PI * 115 * (1 - finalDisplayProgress / 100)}`}
                    className={`transition-all duration-300 ${
                      isCountdown 
                        ? 'text-orange-500' 
                        : isResting
                          ? 'text-purple-500'
                          : 'timer-progress-circle'
                    }`}
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
            
            {/* Time Display - Positioned at top to avoid overlapping description/video */}
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-10" data-testid="timer-display">
              <div className="text-center">
                {isCountdown ? (
                  <>
                    <div className="text-5xl font-bold text-orange-500 dark:text-orange-400 timer-text-shadow-lg">
                      {countdownTime}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 timer-text-shadow-sm">
                      {t('timer.getReadyEllipsis')}
                    </div>
                  </>
                ) : isRepBased && !actuallyResting && currentRep !== undefined && totalReps !== undefined && currentRep < totalReps ? (
                  <>
                    {/* Rep-based exercise display: show rep progress instead of time countdown (only when reps remain). */}
                    <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 timer-text-shadow-lg">
                      Rep {(currentRep || 0) + 1}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 timer-text-shadow-sm">
                      of {totalReps} in Set {(currentSet || 0) + 1}/{totalSets}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-4xl font-bold timer-text-shadow-lg ${
                      isCountdown && displayTime <= 10 && displayTime > 0 
                        ? 'text-red-500 dark:text-red-400' 
                        : actuallyResting
                        ? 'link'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {formatTime(displayTime)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 timer-text-shadow-sm">
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
          ) : (
            /* Rectangular Timer with Border Progress */
            <div
              className={`relative mb-3 mx-auto ${repPulse ? 'transition-transform' : ''} timer-rect-560x320`}
              aria-live="off"
            >
              {showVideoInsideCircle && (
                <div
                  className="absolute rounded-lg overflow-hidden z-[1] video-inset-10"
                  data-testid="exercise-video-wrapper"
                >
                  {/* Video taking maximum space with minimal border for progress */}
                  <video
                    key={selectedExercise?.id || 'no-exercise'}
                    ref={exerciseVideo.videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className={`h-full w-full ${appSettings.video_fit_mode === 'fit' ? 'object-contain' : 'object-cover'} gpu-accelerated`}
                    aria-label={`${selectedExercise?.name || 'Exercise'} demo video`}
                    data-testid="exercise-video"
                    onLoadedData={() => {
                      // Safety: ensure play attempt if hook's effect missed due to timing
                      if (exerciseVideo.videoRef.current && exerciseVideo.videoRef.current.paused && timerState.isRunning && !timerState.isCountdown && !restingNow) {
                        exerciseVideo.videoRef.current.play().catch(() => {});
                      }
                    }}
                  >
                    {getVideoSources(videoUrl).map(s => (
                      <source key={s.src} src={s.src} type={s.type} />
                    ))}
                  </video>
                  {/* Subtle overlay to maintain border contrast */}
                  <div className="absolute inset-0 bg-black/5 dark:bg-black/10 pointer-events-none" />
                </div>
              )}
              {/* Show exercise description when no video is available */}
              {!showVideoInsideCircle && selectedExercise && !isCountdown && !restingNow && (
                <div
                  className="absolute rounded-lg flex items-center justify-center z-[1] video-inset-10 px-8 py-6"
                  data-testid="exercise-description-wrapper"
                >
                  <div className="text-center max-h-full overflow-y-auto">
                    <p className="text-base sm:text-lg text-text-700 dark:text-text-200 leading-relaxed">
                      {localizeExercise(selectedExercise, t).description || selectedExercise.name}
                    </p>
                  </div>
                </div>
              )}
              <svg
                className="pointer-events-none absolute inset-0 z-0 w-full h-full"
                viewBox="0 0 480 280"
                preserveAspectRatio="none"
              >
                {/* For repetition-based exercises: show nested rectangles */}
                {selectedExercise?.exercise_type === 'repetition_based' && totalReps && totalSets ? (
                  <>
                    {/* Outer rectangle for set progress - exactly matching container */}
                    <rect
                      x="0"
                      y="0"
                      width="480"
                      height="280"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      rx="12"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Set progress border */}
                    <rect
                      x="0"
                      y="0"
                      width="480"
                      height="280"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      rx="12"
                      className={`text-green-500 transition-all duration-300 ${repPulse ? 'animate-pulse' : ''}`}
                      strokeDasharray={`${2 * (480 + 280)}`}
                      strokeDashoffset={`${2 * (480 + 280) * (1 - setProgress / 100)}`}
                    />

                    {/* Inner rectangle for individual rep progress */}
                    <rect
                      x="8"
                      y="8"
                      width="464"
                      height="264"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      rx="8"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <rect
                      x="8"
                      y="8"
                      width="464"
                      height="264"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      rx="8"
                      className={`transition-all duration-300 ${
                        isCountdown
                            ? 'text-orange-500'
                            : isResting
                              ? 'text-purple-500'
                              : 'timer-progress-circle'
                      }`}
                      strokeDasharray={`${2 * (464 + 264)}`}
                      strokeDashoffset={`${2 * (464 + 264) * (1 - finalDisplayProgress / 100)}`}
                    />
                  </>
                ) : (
                  <>
                    {/* Standard timer display for time-based exercises - single rectangle matching container */}
                    <rect
                      x="0"
                      y="0"
                      width="480"
                      height="280"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      rx="12"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <rect
                      x="0"
                      y="0"
                      width="480"
                      height="280"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      rx="12"
                      className={`transition-all duration-300 ${
                        isCountdown
                          ? 'text-orange-500'
                          : isResting
                            ? 'text-purple-500'
                            : 'timer-progress-circle'
                      }`}
                      strokeDasharray={`${2 * (480 + 280)}`}
                      strokeDashoffset={`${2 * (480 + 280) * (1 - finalDisplayProgress / 100)}`}
                    />
                  </>
                )}
              </svg>

              {/* Time Display for Rectangular Timer - Positioned at top to avoid overlapping description/video */}
              <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-10" data-testid="timer-display">
                <div className="text-center">
                  {isCountdown ? (
                    <>
                      <div className="text-4xl font-bold text-white timer-text-shadow-lg">
                        {countdownTime}
                      </div>
                      <div className="text-sm text-white mt-1 timer-text-shadow-sm">
                        {t('timer.getReadyEllipsis')}
                      </div>
                    </>
                  ) : isRepBased && !actuallyResting && currentRep !== undefined && totalReps !== undefined && currentRep < totalReps ? (
                    <>
                      {/* Rep-based exercise display: show rep progress instead of time countdown (only when reps remain). */}
                      <div className="text-3xl font-bold text-white timer-text-shadow-lg">
                        Rep {(currentRep || 0) + 1}
                      </div>
                      <div className="text-sm text-white mt-1 timer-text-shadow-sm">
                        of {totalReps} in Set {(currentSet || 0) + 1}/{totalSets}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-white timer-text-shadow-lg">
                        {formatTime(displayTime)}
                      </div>
                      <div className="text-sm text-white mt-1 timer-text-shadow-sm">
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
          )}

          {/* Timer Controls - Compact */}
          <div className="flex justify-center space-x-2 mt-2">
            {!isRunning ? (
              <button
                onClick={onStartTimer}
                disabled={!selectedExercise}
                className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="start-timer"
              >
                {t('common.start')}
              </button>
            ) : (
              <button
                onClick={() => onStopTimer()}
                className="btn-secondary px-4 py-2 text-sm"
                data-testid="stop-timer"
              >
                {isCountdown ? t('common.cancel') : t('common.stop')}
              </button>
            )}

            <button
              onClick={onResetTimer}
              className="btn-ghost"
              data-testid="reset-timer"
            >
              {t('common.reset')}
            </button>

            {/* Fit/Fill toggle */}
            {videoFeatureEnabled && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const next = (appSettings.video_fit_mode === 'fit') ? 'fill' : 'fit';
                  onUpdateSettings?.({ video_fit_mode: next });
                }}
                data-testid="toggle-video-fit"
                aria-label={appSettings.video_fit_mode === 'fit' ? t('timer.fit', 'Fit') : t('timer.fill', 'Fill')}
                title={appSettings.video_fit_mode === 'fit' ? t('timer.fit', 'Fit') : t('timer.fill', 'Fill')}
              >
                {appSettings.video_fit_mode === 'fit' ? t('timer.fit', 'Fit') : t('timer.fill', 'Fill')}
              </button>
            )}
          </div>
        </div>


        {/* Timer Info */}
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 text-xs" data-testid={(!timerState.isRunning && !timerState.isCountdown && timerState.currentTime === (timerState.targetTime || 0) && timerState.targetTime) ? 'timer-complete' : undefined}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('timer.beepInterval')}</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {appSettings.interval_duration}s
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
        <ExerciseSelectorModal
          exercises={exercises}
          selectedExercise={selectedExercise}
          onSelectExercise={(exercise) => {
            onSetSelectedExercise(exercise);
          }}
          isOpen={showExerciseSelector}
          onClose={() => onSetShowExerciseSelector(false)}
          title={t('timer.selectExercise')}
          showCatalogSelector={true}
          showBadgeFilters={true}
          showTypeFilter={true}
          showFavoritesToggle={true}
          showSearch={true}
          showSort={true}
          persistFilters={true}
          filterStorageKey="timer-exercise-selector"
        />
      </div>
    </div>
  );
};

export default TimerPage; 