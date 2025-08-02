import React from 'react';
import type { Exercise, AppSettings, TimerState } from '../types';
import { TIMER_PRESETS, REST_TIME_BETWEEN_SETS, type TimerPreset } from '../constants';

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
  // Calculate display values
  const { currentTime, targetTime, isRunning, isCountdown, countdownTime, workoutMode, isResting, restTimeRemaining } = timerState;
  
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
  
  // Rep/Set progress for repetition-based exercises (both workout mode and standalone)
  const isRepBased = selectedExercise?.exerciseType === 'repetition-based';
  
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
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter favorite exercises for quick access
  const favoriteExercises = exercises.filter(ex => ex.isFavorite).slice(0, 6);

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
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
                ? `Rest Period (Next: ${workoutCurrentExercise?.name || 'Loading...'})`
                : `Exercise ${workoutMode.currentExerciseIndex + 1}: ${displayExercise?.name || 'Loading...'}`
              }
            </div>
          </div>
        )}

        {/* Current Exercise Display - More prominent in workout mode */}
        {isWorkoutMode && displayExercise && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {actuallyResting ? 'Rest Period' : displayExercise.name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {actuallyResting 
                ? `Next: ${workoutCurrentExercise?.name} • ${workoutCurrentExercise?.category}`
                : `Current Exercise • ${displayExercise.category}`
              }
            </div>
            {displayExercise.description && !actuallyResting && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                {displayExercise.description}
              </div>
            )}
            {actuallyResting && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                Take a break and prepare for the next exercise
              </div>
            )}
          </div>
        )}

        {/* Exercise Selection - Hidden in workout mode */}
        {!isWorkoutMode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exercise</span>
              <button
                onClick={() => onSetShowExerciseSelector(true)}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
              >
                Choose
              </button>
            </div>
            
            {selectedExercise ? (
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedExercise.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedExercise.description}
                </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
              No exercise selected
            </p>
          )}

          {/* Favorite exercises quick access */}
          {!selectedExercise && favoriteExercises.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Select (Favorites):</p>
              <div className="grid grid-cols-2 gap-2">
                {favoriteExercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => onSetSelectedExercise(exercise)}
                    className="text-xs py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors truncate"
                  >
                    {exercise.name}
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
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</p>
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
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rep Duration</p>
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
                <span>Set Progress</span>
                <span>{
                  isResting 
                    ? `${(currentSet || 0) + 1} / ${totalSets}`  // During rest: show completed sets
                    : (currentRep !== undefined && currentRep >= (totalReps || 0))
                      ? `${(currentSet || 0) + 1} / ${totalSets}`  // Set complete but not resting yet
                      : `${(currentSet || 0) + 1} / ${totalSets}`  // Working on current set
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
                <span>Rep Progress</span>
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
            <div className="text-orange-800 dark:text-orange-300 font-medium text-sm">
              🏃‍♂️ Get Ready! Timer starts in {countdownTime} second{countdownTime !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Timer Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          {/* Circular Progress */}
          <div className="relative w-40 h-40 mx-auto mb-4">
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
                    className="text-green-500 transition-all duration-300"
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {isCountdown ? (
                  <>
                    <div className="text-4xl font-bold text-orange-500 dark:text-orange-400">
                      {countdownTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get ready...
                    </div>
                  </>
                ) : isRepBased && !actuallyResting && currentRep !== undefined && totalReps !== undefined && currentRep < totalReps ? (
                  // Rep-based exercise display: show rep progress instead of time countdown
                  // Only show when not all reps are completed
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      Rep {(currentRep || 0) + 1}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      of {totalReps} in Set {(currentSet || 0) + 1}/{totalSets}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-3xl font-bold ${
                      displayTime <= 10 && displayTime > 0 
                        ? 'text-red-500 dark:text-red-400' 
                        : actuallyResting
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {formatTime(displayTime)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {actuallyResting 
                        ? 'Rest Period'
                        : isWorkoutMode 
                          ? (() => {
                              const currentIndex = workoutMode.currentExerciseIndex;
                              const totalExercises = workoutMode.exercises.length;
                              
                              if (currentIndex >= totalExercises) {
                                return `Exercise ${totalExercises}/${totalExercises} - Complete!`;
                              }
                              
                              return `Exercise ${currentIndex + 1}/${totalExercises}`;
                            })()
                          : targetTime ? `of ${formatTime(targetTime)}` : 'Set duration'
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
              >
                Start
              </button>
            ) : (
              <button
                onClick={() => onStopTimer()}
                className="btn-secondary px-8"
              >
                {isCountdown ? 'Cancel' : 'Stop'}
              </button>
            )}
            
            <button
              onClick={onResetTimer}
              className="btn-ghost px-6"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Exercise Controls - Shown for workout mode or standalone rep-based exercises */}
        {(isWorkoutMode || (selectedExercise?.exerciseType === 'repetition-based' && totalSets && totalReps)) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
              {isWorkoutMode ? 'Workout Controls' : 'Exercise Controls'}
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
                    Next Rep ({(currentRep || 0) + 1}/{totalReps})
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
                    {((currentSet || 0) + 1) >= (totalSets || 1) ? 'Complete Exercise' : `Next Set (${(currentSet || 0) + 1}/${totalSets})`}
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onStopTimer(true)}
                className="btn-secondary text-xs py-2"
              >
                Complete Exercise
              </button>
              
              <button
                onClick={onResetTimer}
                className="btn-ghost text-xs py-2"
              >
                Exit Workout
              </button>
            </div>
          </div>
        )}

        {/* Timer Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 text-xs">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Beep Interval</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {appSettings.intervalDuration}s
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Wake Lock</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {wakeLockSupported ? (wakeLockActive ? 'On' : 'Off') : 'Not Supported'}
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
                    Select Exercise
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
                          {exercise.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {exercise.category}
                        </p>
                      </div>
                      {exercise.isFavorite && (
                        <span className="text-yellow-500">⭐</span>
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