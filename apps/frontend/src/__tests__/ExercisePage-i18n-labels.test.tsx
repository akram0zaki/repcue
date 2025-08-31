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

describe('ExercisePage exercise type labels', () => {
  it('renders localized Time-based label for time-based exercises', () => {
    const exercises = [makeExercise({ exercise_type: 'time_based' })]
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <SnackbarProvider>
          <ExercisePage
            exercises={exercises as any}
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
            onToggleFavorite={() => {}}
          />
        </SnackbarProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/Rep-based/i)).toBeInTheDocument()
  })
})
