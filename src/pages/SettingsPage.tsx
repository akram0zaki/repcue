import React from 'react';
import type { AppSettings } from '../types';
import { audioService } from '../services/audioService';

interface SettingsPageProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ appSettings, onUpdateSettings }) => {
  const handleVolumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    onUpdateSettings({ beepVolume: volume });
    
    // Play a test beep at the new volume
    if (appSettings.soundEnabled) {
      await audioService.playIntervalBeep(volume);
    }
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = parseInt(event.target.value);
    onUpdateSettings({ intervalDuration: duration });
  };

  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Audio Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            🔊 Audio Settings
          </h2>
          
          {/* Sound Enable/Disable */}
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="sound-enabled" className="text-gray-700 dark:text-gray-300 font-medium">
              Enable Sound
            </label>
            <button
              id="sound-enabled"
              onClick={() => onUpdateSettings({ soundEnabled: !appSettings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.soundEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

                    {/* Volume Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="beep-volume" className="text-gray-700 dark:text-gray-300 font-medium">
                Beep Volume
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(appSettings.beepVolume * 100)}%
              </span>
            </div>
            <input
              id="beep-volume"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={appSettings.beepVolume}
              onChange={handleVolumeChange}
              disabled={!appSettings.soundEnabled}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="grid grid-cols-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-left">Low</span>
              <span className="text-center">Medium</span>
              <span className="text-right">High</span>
            </div>
          </div>

          {/* Vibration Enable/Disable */}
          <div className="flex items-center justify-between">
            <label htmlFor="vibration-enabled" className="text-gray-700 dark:text-gray-300 font-medium">
              Enable Vibration
            </label>
            <button
              id="vibration-enabled"
              onClick={() => onUpdateSettings({ vibrationEnabled: !appSettings.vibrationEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.vibrationEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Timer Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            ⏱️ Timer Settings
          </h2>
          
          {/* Interval Duration */}
          <div>
            <label htmlFor="interval-duration" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
              Beep Interval
            </label>
            <select
              id="interval-duration"
              value={appSettings.intervalDuration}
              onChange={handleIntervalChange}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>Every 15 seconds</option>
              <option value={30}>Every 30 seconds</option>
              <option value={45}>Every 45 seconds</option>
              <option value={60}>Every 60 seconds</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              How often the timer beeps during intervals
            </p>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            🎨 Appearance
          </h2>
          
          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <label htmlFor="dark-mode" className="text-gray-700 dark:text-gray-300 font-medium">
              Dark Mode
            </label>
            <button
              id="dark-mode"
              onClick={() => onUpdateSettings({ darkMode: !appSettings.darkMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.darkMode 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Data Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            💾 Data
          </h2>
          
          {/* Auto Save */}
          <div className="flex items-center justify-between">
            <label htmlFor="auto-save" className="text-gray-700 dark:text-gray-300 font-medium">
              Auto Save
            </label>
            <button
              id="auto-save"
              onClick={() => onUpdateSettings({ autoSave: !appSettings.autoSave })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                appSettings.autoSave 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  appSettings.autoSave ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 