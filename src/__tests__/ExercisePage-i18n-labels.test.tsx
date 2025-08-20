import { render, screen } from '@testing-library/react'
import React from 'react'
import ExercisePage from '../pages/ExercisePage'
import { MemoryRouter } from 'react-router-dom'
import { ExerciseCategory } from '../types'

const makeExercise = (overrides: Partial<any> = {}) => ({
  id: 'ex-1',
  name: 'Plank',
  description: 'Core stability hold',
  category: ExerciseCategory.CORE,
  exerciseType: 'time-based',
  defaultDuration: 30,
  defaultSets: 1,
  defaultReps: 1,
  isFavorite: false,
  tags: ['core'],
  hasVideo: false,
  ...overrides,
})

describe('ExercisePage exercise type labels', () => {
  it('renders localized Time-based label for time-based exercises', () => {
    const exercises = [makeExercise({ exerciseType: 'time-based' })]
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <ExercisePage
          exercises={exercises as any}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByText(/Time-based/i)).toBeInTheDocument()
  })

  it('renders localized Rep-based label for repetition-based exercises', () => {
    const exercises = [makeExercise({ id: 'ex-2', name: 'Push Ups', exerciseType: 'repetition-based' })]
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <ExercisePage
          exercises={exercises as any}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByText(/Rep-based/i)).toBeInTheDocument()
  })
})
