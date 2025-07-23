import React from 'react';
import type { Exercise, AppSettings, TimerState } from '../types';
import { TIMER_PRESETS, type TimerPreset } from '../constants';

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
  const { currentTime, targetTime, isRunning } = timerState;
  const remainingTime = targetTime ? Math.max(0, targetTime - currentTime) : 0;
  const progress = targetTime ? (currentTime / targetTime) * 100 : 0;

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
        {/* Exercise Selection */}
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

        {/* Timer Duration Selection */}
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

        {/* Timer Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          {/* Circular Progress */}
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="transform -rotate-90 w-40 h-40">
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
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                className={`text-blue-600 transition-all duration-300 ${
                  remainingTime <= 10 && remainingTime > 0 ? 'text-red-500' : ''
                }`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  remainingTime <= 10 && remainingTime > 0 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {formatTime(remainingTime)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {targetTime ? `of ${formatTime(targetTime)}` : 'Set duration'}
                </div>
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
                Stop
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