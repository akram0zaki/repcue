import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { vi, beforeEach } from 'vitest'
import ExercisePage from '../pages/ExercisePage'
import { MemoryRouter } from 'react-router-dom'
import { ExerciseCategory } from '../types'
import { SnackbarProvider } from '../components/SnackbarProvider'

// Mock utils and services
vi.mock('../utils/loadExerciseMedia', () => ({
  loadExerciseMedia: vi.fn().mockResolvedValue({})
}))

vi.mock('../utils/localizeExercise', () => ({
  localizeExercise: (exercise: any) => ({
    name: exercise.name,
    description: exercise.description
  })
}))

vi.mock('../data/catalogs', () => ({
  getDefaultCatalog: () => 'repcue',
  EXERCISE_CATALOGS: [
    {
      id: 'repcue',
      name: 'RepCue',
      exercises: ['ex-1', 'ex-2'],
      thumbnail: '/catalog-thumbnails/repcue.jpg',
      description: 'Core RepCue exercises'
    }
  ]
}))

// Mock i18n
const mockI18n = {
  resolvedLanguage: 'en',
  language: 'en',
  languages: ['en']
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:exercises.title': 'Exercises',
        'common:exercises.subtitle': 'Browse, filter, and start exercises. Mark favorites for quick access.',
        'exercises:createNew': 'Create New Exercise',
        'common.create': 'Create',
        'selectCatalog': 'Exercise Catalog',
        'selectDescription': 'Choose an exercise catalog to browse',
        'exercises.filtersAndSearch': 'Filters & Search',
        'exercises.exercises': 'Exercises',
        'exercises.browseFilter': 'Browse, filter, and start exercises. Mark favorites for quick access.',
        'exercises.createExercise': 'Create New Exercise',
        'exercises.create': 'Create',
        'exercises.exerciseCatalog': 'Exercise Catalog',
        'common:categories.core': 'Core',
        'common:exerciseTypes.time_based': 'Time-based',
        'common:exerciseTypes.repetition_based': 'Rep-based',
        'home.startTimer': 'Start Timer'
      }
      return translations[key] || key
    },
    i18n: mockI18n
  }),
  I18nextProvider: ({ children }: any) => children
}))

// Mock hooks
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true, canShareExercises: true } })
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}))

vi.mock('../hooks/useSharedExercises', () => ({
  useSharedExercises: () => ({
    sharedExercises: [],
    isLoading: false,
    error: null,
    isSharedExercise: () => false
  })
}))

vi.mock('../hooks/useRTLDetection', () => ({
  useRTLDetection: () => false
}))

// Mock storage service
vi.mock('../services/storageService', () => ({
  StorageService: {
    getInstance: () => ({
      getUserExercises: () => Promise.resolve([]),
      getFavoriteExercises: () => Promise.resolve([])
    })
  }
}))

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
