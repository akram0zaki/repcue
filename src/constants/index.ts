// Application Constants
export const APP_NAME = 'RepCue';
export const APP_DESCRIPTION = 'Your personal exercise timer';
export const APP_VERSION = '0.1.0';

// Timer Constants
export const TIMER_PRESETS = [15, 30, 60, 120, 180, 300] as const;
export type TimerPreset = typeof TIMER_PRESETS[number];

// Default Settings
export const DEFAULT_APP_SETTINGS = {
  intervalDuration: 30, // Default 30 seconds
  soundEnabled: true,
  vibrationEnabled: true,
  beepVolume: 0.5, // Default 50% volume
  darkMode: false,
  autoSave: true,
  lastSelectedExerciseId: null,
  preTimerCountdown: 3, // Default 3 seconds countdown
}; 