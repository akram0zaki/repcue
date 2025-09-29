import { render, screen } from '@testing-library/react'
import React from 'react'
import ExercisePage from '../pages/ExercisePage'
import { MemoryRouter } from 'react-router-dom'
import { ExerciseCategory } from '../types'
import { SnackbarProvider } from '../components/SnackbarProvider'

const makeExercise = (overrides: Partial<any> = {}) => ({
  id: 'ex-1',
  name: 'Plank',
  description: 'Core stability hold',
  category: ExerciseCategory.CORE,
  exercise_type: 'time_based',
  default_duration: 30,
  default_sets: 1,
  default_reps: 1,
  is_favorite: false,
  tags: ['core'],
  has_video: false,
  ...overrides,
})

const mockAppSettings = {
  interval_duration: 30,
  sound_enabled: true,
  vibration_enabled: true,
  beep_volume: 0.5,
  dark_mode: false,
  auto_save: true,
  pre_timer_countdown: 3,
  default_rest_time: 30,
  rep_speed_factor: 1.0,
  show_exercise_videos: true,
  horizontal_exercise_layout: false,
  ring_timer: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  id: 'test-settings',
}

describe('ExercisePage exercise type labels', () => {
  it('renders localized Time-based label for time-based exercises', () => {
    const exercises = [makeExercise({ exercise_type: 'time_based' })]
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <SnackbarProvider>
          <ExercisePage
            exercises={exercises as any}
            appSettings={mockAppSettings}
            onToggleFavorite={() => {}}
          />
        </SnackbarProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/Time-based/i)).toBeInTheDocument()
  })

  it('renders localized Rep-based label for repetition-based exercises', () => {
    const exercises = [makeExercise({ id: 'ex-2', name: 'Push Ups', exercise_type: 'repetition_based' })]
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <SnackbarProvider>
          <ExercisePage
            exercises={exercises as any}
            appSettings={mockAppSettings}
            onToggleFavorite={() => {}}
          />
        </SnackbarProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/Rep-based/i)).toBeInTheDocument()
  })
})
