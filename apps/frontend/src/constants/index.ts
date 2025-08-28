import type { AppSettings } from '../types';

// Application Constants
export const APP_NAME = 'RepCue';
export const APP_DESCRIPTION = 'Your personal exercise timer';
export const APP_VERSION = '0.1.0';

// Timer Constants
export const TIMER_PRESETS = [5, 15, 30, 60, 120, 180, 300] as const;
export type TimerPreset = typeof TIMER_PRESETS[number];

// Repetition timing constants
export const BASE_REP_TIME = 2; // Base time per repetition in seconds
export const REST_TIME_BETWEEN_SETS = 30; // Default rest time between sets in seconds
export const REP_SPEED_FACTORS = [0.5, 0.75, 1.0, 1.5, 2.0] as const;
export type RepSpeedFactor = typeof REP_SPEED_FACTORS[number];

// Default Settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'default-app-settings',
  interval_duration: 30, // Default 30 seconds
  sound_enabled: true,
  vibration_enabled: true,
  beep_volume: 0.5, // Default 50% volume
  dark_mode: false,
  auto_save: true,
  last_selected_exercise_id: null,
  pre_timer_countdown: 3, // Default 3 seconds countdown
  default_rest_time: 60, // Default 60 seconds rest between exercises
  rep_speed_factor: 1.0, // Default 1x speed (5 seconds per rep)
  show_exercise_videos: true, // default opt-in (feature gated)
  reduce_motion: false,
  auto_start_next: false,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  deleted: false,
  version: 1,
  dirty: 0
}; 