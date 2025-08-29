import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../../pages/SettingsPage';
import TimerPage from '../../pages/TimerPage';
import { DEFAULT_APP_SETTINGS } from '../../constants';
import type { Exercise, AppSettings, TimerState } from '../../types';
import { ExerciseType } from '../../types';
import { createMockExercise } from '../../test/testUtils';

// Mock services
vi.mock('../../services/audioService', () => ({
  audioService: {
    playIntervalBeep: vi.fn(),
  },
}));

vi.mock('../../services/storageService', () => ({
  storageService: {
    exportAllData: vi.fn(),
    clearAllData: vi.fn()
  }
}));

vi.mock('../../services/consentService', () => ({
  consentService: {
    hasConsent: () => true,
    getConsentStatus: () => ({ hasConsented: true }),
  },
}));

const mockExercise: Exercise = createMockExercise({
  id: 'test-exercise',
  name: 'Test Exercise',
  description: 'Test description for countdown',
  category: 'core',
  exercise_type: ExerciseType.TIME_BASED,
  default_duration: 30,
  is_favorite: false,
  tags: ['test']
});

describe('Pre-Timer Countdown Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Settings Page Integration', () => {
    it('should display countdown settings in settings page', () => {
      const mockAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 3 };
      const mockOnUpdateSettings = vi.fn();

      render(
        <SettingsPage 
          appSettings={mockAppSettings} 
          onUpdateSettings={mockOnUpdateSettings} 
        />
      );

      // Check that the countdown slider is present
      expect(screen.getByText('Pre-Timer Countdown')).toBeInTheDocument();
      const countdownSlider = screen.getByLabelText('Pre-Timer Countdown');
      expect(countdownSlider).toBeInTheDocument();
      expect(countdownSlider).toHaveAttribute('type', 'range');
      expect(countdownSlider).toHaveAttribute('min', '0');
      expect(countdownSlider).toHaveAttribute('max', '10');
      expect(countdownSlider).toHaveValue('3');
    });

    it('should handle countdown value changes correctly', () => {
      const mockAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 3 };
      const mockOnUpdateSettings = vi.fn();

      render(
        <SettingsPage 
          appSettings={mockAppSettings} 
          onUpdateSettings={mockOnUpdateSettings} 
        />
      );

      // Change countdown value
      const countdownSlider = screen.getByLabelText('Pre-Timer Countdown');
      fireEvent.change(countdownSlider, { target: { value: '5' } });

      expect(mockOnUpdateSettings).toHaveBeenCalledWith({ pre_timer_countdown: 5 });
    });

    it('should show "Off" when countdown is set to 0', () => {
      const mockAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 0 };
      const mockOnUpdateSettings = vi.fn();

      render(
        <SettingsPage 
          appSettings={mockAppSettings} 
          onUpdateSettings={mockOnUpdateSettings} 
        />
      );

      // Look specifically for countdown setting "Off" text
      const countdownSettings = screen.getByText('Pre-Timer Countdown').closest('div');
      expect(countdownSettings).toBeInTheDocument();
      
      // Check that one of the "Off" texts is in the countdown section
      expect(screen.getAllByText('Off')[0]).toBeInTheDocument();
    });

    it('should show countdown duration in seconds when > 0', () => {
      const mockAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 7 };
      const mockOnUpdateSettings = vi.fn();

      render(
        <SettingsPage 
          appSettings={mockAppSettings} 
          onUpdateSettings={mockOnUpdateSettings} 
        />
      );

      expect(screen.getByText('7s')).toBeInTheDocument();
    });
  });

  describe('Timer Page Integration', () => {
    const defaultTimerProps = {
      exercises: [mockExercise],
      appSettings: { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 5 },
      timerState: {
        isRunning: false,
        currentTime: 0,
        targetTime: undefined,
        startTime: undefined,
        intervalDuration: 30,
        currentExercise: undefined,
        isCountdown: false,
        countdownTime: 0
      } as TimerState,
      selectedExercise: mockExercise,
      selectedDuration: 30 as const,
      showExerciseSelector: false,
      wakeLockSupported: false,
      wakeLockActive: false,
      onSetSelectedExercise: vi.fn(),
      onSetSelectedDuration: vi.fn(),
      onSetShowExerciseSelector: vi.fn(),
      onStartTimer: vi.fn(),
      onStopTimer: vi.fn(),
      onResetTimer: vi.fn()
    };

    it('shows "Start" button when countdown is enabled', () => {
      render(<TimerPage {...defaultTimerProps} />);
      
      const startButton = screen.getByRole('button', { name: /^start$/i });
      expect(startButton).toBeInTheDocument();
    });

    it('shows "Start" button when countdown is disabled', () => {
      const propsWithoutCountdown = {
        ...defaultTimerProps,
        appSettings: { ...DEFAULT_APP_SETTINGS, pre_timer_countdown: 0 }
      };
      
      render(<TimerPage {...propsWithoutCountdown} />);
      
      const startButton = screen.getByRole('button', { name: /^start$/i });
      expect(startButton).toBeInTheDocument();
    });

    it('displays countdown state correctly', () => {
      const countdownState = {
        ...defaultTimerProps.timerState,
        isRunning: true,
        isCountdown: true,
        countdownTime: 3
      };
      
      render(<TimerPage {...defaultTimerProps} timerState={countdownState} />);
      
      // Check countdown number is displayed
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Check "Get ready..." message
      expect(screen.getByText('Get ready...')).toBeInTheDocument();
      
      // Check countdown banner
      expect(screen.getByText(/Get Ready! Timer starts in 3 second/)).toBeInTheDocument();
    });

    it('shows "Cancel" button during countdown', () => {
      const countdownState = {
        ...defaultTimerProps.timerState,
        isRunning: true,
        isCountdown: true,
        countdownTime: 5
      };
      
      render(<TimerPage {...defaultTimerProps} timerState={countdownState} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });
});
