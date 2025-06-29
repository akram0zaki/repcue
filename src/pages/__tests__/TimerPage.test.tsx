import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import TimerPage from '../TimerPage'
import { audioService } from '../../services/audioService'
import { storageService } from '../../services/storageService'
import type { Exercise, AppSettings } from '../../types'

// Mock services
vi.mock('../../services/audioService', () => ({
  audioService: {
    playStartFeedback: vi.fn(),
    playStopFeedback: vi.fn(),
    playIntervalFeedback: vi.fn(),
    announceText: vi.fn()
  }
}))

vi.mock('../../services/storageService', () => ({
  storageService: {
    saveActivityLog: vi.fn()
  }
}))

// Mock timers
vi.useFakeTimers()

describe('TimerPage', () => {
  let mockExercises: Exercise[]
  let mockAppSettings: AppSettings

  beforeEach(() => {
    mockExercises = [
      {
        id: 'ex1',
        name: 'Push-ups',
        description: 'Upper body exercise',
        category: 'strength',
        defaultDuration: 30,
        isFavorite: true,
        tags: ['bodyweight']
      },
      {
        id: 'ex2',
        name: 'Plank',
        description: 'Core exercise',
        category: 'core',
        defaultDuration: 60,
        isFavorite: false,
        tags: ['isometric']
      }
    ]

    mockAppSettings = {
      intervalDuration: 15,
      soundEnabled: true,
      vibrationEnabled: true,
      beepVolume: 0.5,
      darkMode: false,
      autoSave: true
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('Timer Presets (T1.2 Requirement)', () => {
    it('should display 15s, 30s, and 60s timer preset options', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      expect(screen.getByRole('button', { name: '15s' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '60s' })).toBeInTheDocument()
    })

    it('should default to 30s timer duration', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      const thirtySecondButton = screen.getByRole('button', { name: '30s' })
      expect(thirtySecondButton).toHaveClass('bg-blue-600')
    })

    it('should allow selecting different timer durations', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      const fifteenSecondButton = screen.getByRole('button', { name: '15s' })
      fireEvent.click(fifteenSecondButton)
      
      expect(fifteenSecondButton).toHaveClass('bg-blue-600')
      expect(screen.getByText('00:15')).toBeInTheDocument()
    })
  })

  describe('Exercise Selection', () => {
    it('should display favorite exercises for quick selection', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      expect(screen.getByText('Push-ups')).toBeInTheDocument()
      expect(screen.getByText('strength')).toBeInTheDocument()
    })

    it('should require exercise selection before starting timer', async () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      // Try to start without selecting exercise
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      expect(startButton).toBeDisabled()
    })

    it('should allow starting timer after exercise selection', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      // Select an exercise
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
      
      // Start button should be enabled
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      expect(startButton).not.toBeDisabled()
    })
  })

  describe('Timer Logic with Audio/Vibration (T1.2 Core)', () => {
    beforeEach(() => {
      // Select exercise first
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
    })

    it('should play start sound and vibration when timer starts', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      expect(audioService.playStartFeedback).toHaveBeenCalledWith(true, true)
      expect(audioService.announceText).toHaveBeenCalledWith('Starting Push-ups timer for 30 seconds')
    })

    it('should update timer display during countdown', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      // Timer should show running status
      expect(screen.getByText('Timer Running')).toBeInTheDocument()
      
      // Advance time by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
      
      // Should show elapsed time
      expect(screen.getByText('00:05 elapsed')).toBeInTheDocument()
      expect(screen.getByText('00:25')).toBeInTheDocument() // remaining time
    })

    it('should play interval beeps according to settings', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      // Clear the start feedback call
      vi.clearAllMocks()
      
      // Advance time by interval duration (15s)
      await act(async () => {
        vi.advanceTimersByTime(15000)
      })
      
      expect(audioService.playIntervalFeedback).toHaveBeenCalledWith(true, true, 0.5)
    })

    it('should play stop sound when timer is manually stopped', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      const stopButton = screen.getByRole('button', { name: 'Stop Timer' })
      
      await act(async () => {
        fireEvent.click(stopButton)
      })
      
      expect(audioService.playStopFeedback).toHaveBeenCalledWith(true, true)
    })

    it('should complete timer and log activity after full duration', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      // Complete the full 30-second timer
      await act(async () => {
        vi.advanceTimersByTime(30100) // Add extra 100ms to ensure completion
      })
      
      // Give React time to process the timer completion
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Timer Completed!')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      expect(audioService.playStopFeedback).toHaveBeenCalled()
      expect(audioService.announceText).toHaveBeenCalledWith('Timer completed! Great job on Push-ups')
      expect(storageService.saveActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: 'ex1',
          exerciseName: 'Push-ups',
          duration: 30,
          notes: '30s interval timer'
        })
      )
    }, 10000)
  })

  describe('Timer Controls', () => {
    beforeEach(() => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      // Select exercise
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
    })

    it('should show stop button when timer is running', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      expect(screen.getByRole('button', { name: 'Stop Timer' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Start Timer' })).not.toBeInTheDocument()
    })

    it('should show reset button when timer has run', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      // Advance time a bit
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    })

    it('should reset timer state when reset is clicked', async () => {
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })
      
      // Reset timer
      const resetButton = screen.getByRole('button', { name: 'Reset' })
      await act(async () => {
        fireEvent.click(resetButton)
      })
      
      expect(screen.getByText('Ready to Start')).toBeInTheDocument()
      expect(screen.getByText('00:30')).toBeInTheDocument() // back to selected duration
    })
  })

  describe('Progress Display', () => {
    beforeEach(() => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      // Select exercise
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
    })

    it('should display circular progress indicator', () => {
      // Check for SVG progress circle
      const progressCircle = document.querySelector('svg')
      expect(progressCircle).toBeInTheDocument()
    })

    it('should format time display correctly', () => {
      // Should show minutes:seconds format
      expect(screen.getByText('00:30')).toBeInTheDocument()
      
      // Select 60s duration
      const sixtySecondButton = screen.getByRole('button', { name: '60s' })
      fireEvent.click(sixtySecondButton)
      
      expect(screen.getByText('01:00')).toBeInTheDocument()
    })
  })

  describe('Settings Integration', () => {
    it('should respect sound settings', async () => {
      const quietSettings = { ...mockAppSettings, soundEnabled: false }
      render(<TimerPage exercises={mockExercises} appSettings={quietSettings} />)
      
      // Select exercise and start
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
      
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      expect(audioService.playStartFeedback).toHaveBeenCalledWith(false, true)
      expect(audioService.announceText).not.toHaveBeenCalled()
    })

    it('should respect vibration settings', async () => {
      const noVibrateSettings = { ...mockAppSettings, vibrationEnabled: false }
      render(<TimerPage exercises={mockExercises} appSettings={noVibrateSettings} />)
      
      // Select exercise and start
      const pushUpsButton = screen.getByRole('button', { name: /Push-ups/ })
      fireEvent.click(pushUpsButton)
      
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      await act(async () => {
        fireEvent.click(startButton)
      })
      
      expect(audioService.playStartFeedback).toHaveBeenCalledWith(true, false)
    })

    it('should display current settings in info panel', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      expect(screen.getByText(/Sound: On/)).toBeInTheDocument()
      expect(screen.getByText(/Vibration: On/)).toBeInTheDocument()
      expect(screen.getByText(/Beep every 15s/)).toBeInTheDocument()
    })
  })

  describe('Exercise Selector Modal', () => {
    it('should open exercise selector when + Select Exercise is clicked', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      const selectButton = screen.getByRole('button', { name: '+ Select Exercise' })
      fireEvent.click(selectButton)
      
      expect(screen.getByText('Choose Exercise')).toBeInTheDocument()
      expect(screen.getByText('Plank')).toBeInTheDocument()
    })

    it('should close modal and select exercise when exercise is clicked', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      const selectButton = screen.getByRole('button', { name: '+ Select Exercise' })
      fireEvent.click(selectButton)
      
      const plankButton = screen.getByText('Plank')
      fireEvent.click(plankButton)
      
      expect(screen.queryByText('Choose Exercise')).not.toBeInTheDocument()
      expect(screen.getByText('Plank')).toBeInTheDocument()
    })
  })

  describe('Accessibility (T1.2 WCAG Compliance)', () => {
    it('should have proper heading structure', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      expect(screen.getByRole('heading', { level: 1, name: 'Interval Timer' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Select Exercise' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Timer Duration' })).toBeInTheDocument()
    })

    it('should have accessible button labels', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      expect(screen.getByRole('button', { name: 'Start Timer' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '15s' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '+ Select Exercise' })).toBeInTheDocument()
    })

    it('should have touch-friendly button sizes', () => {
      render(<TimerPage exercises={mockExercises} appSettings={mockAppSettings} />)
      
      const startButton = screen.getByRole('button', { name: 'Start Timer' })
      expect(startButton).toHaveClass('touch-target')
    })
  })
}) 