import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Exercise } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';
import { createMockExercise } from '../../test/testUtils';
import { createStorageServiceModuleMock } from '../../test/storageServiceMock';

// Mock dependencies
vi.mock('../../services/storageService', () => createStorageServiceModuleMock());
vi.mock('../../services/consentService', () => ({
  ConsentService: {
    getInstance: vi.fn(() => ({
      hasConsent: vi.fn().mockReturnValue(true),
      getConsentData: vi.fn().mockReturnValue({ hasConsented: true })
    }))
  },
  consentService: {
    hasConsent: vi.fn().mockReturnValue(true),
    getConsentData: vi.fn().mockReturnValue({ hasConsented: true })
  }
}));

// Mock useExerciseFilter hook
vi.mock('../../hooks/useExerciseFilter', () => ({
  useExerciseFilter: (exercises: Exercise[]) => ({
    filteredExercises: exercises,
    filterState: {
      selectedCatalogId: 'default',
      selectedCategories: new Set(),
      searchTerm: '',
      showFavoritesOnly: false,
      exerciseFilter: 'all',
      sortBy: 'name'
    },
    updateFilter: vi.fn(),
    clearFilters: vi.fn(),
    setCatalog: vi.fn(),
    toggleCategory: vi.fn(),
    clearCategories: vi.fn()
  })
}));

// Import after mocks
import CreateWorkoutPage from '../CreateWorkoutPage';
import { storageService } from '../../services/storageService';
import { consentService } from '../../services/consentService';

const mockStorageService = storageService as any;
const mockConsentService = consentService as any;

const mockExercises: Exercise[] = [
  createMockExercise({
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60,
    is_favorite: false,
    tags: ['core', 'stability']
  }),
  createMockExercise({
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise your body using arms',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10,
    is_favorite: false,
    tags: ['strength', 'chest']
  })
];

const renderCreateWorkoutPage = () => {
  return render(
    <MemoryRouter>
      <CreateWorkoutPage />
    </MemoryRouter>
  );
};

describe('CreateWorkoutPage Exercise Type Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsentService.hasConsent.mockReturnValue(true);
    mockStorageService.getExercises.mockResolvedValue(mockExercises);
  });

  it('should show duration field for time-based exercises and hide sets/reps', async () => {
    renderCreateWorkoutPage();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText('Workout Name')).toBeInTheDocument();
    });

    // Open exercise picker (first exercise)
    const addExerciseButton = screen.getByText('Add First Exercise');
    fireEvent.click(addExerciseButton);

    // Add the Plank exercise (time-based) by clicking on its row
    await waitFor(() => {
      expect(screen.getByText('Plank')).toBeInTheDocument();
    });

    const plankRow = screen.getByText('Plank').closest('button');
    if (plankRow) {
      fireEvent.click(plankRow);
    }

    // Wait for exercise to be added and check fields are displayed correctly
    await waitFor(() => {
      expect(screen.getByText('1. Plank')).toBeInTheDocument();
    });

    // Check that Duration field is visible for time-based exercise
    expect(screen.getByText('Duration (seconds)')).toBeInTheDocument();
    
    // Check that Sets and Reps fields are NOT visible for time-based exercise
    expect(screen.queryByText('Sets')).not.toBeInTheDocument();
    expect(screen.queryByText('Reps')).not.toBeInTheDocument();

    // Rest Time should always be visible
    expect(screen.getByText('Rest Time (seconds)')).toBeInTheDocument();
  });

  it('should show sets/reps fields for repetition-based exercises and hide duration', async () => {
    renderCreateWorkoutPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Workout Name')).toBeInTheDocument();
    });

    // Open exercise picker (first exercise)
    const addExerciseButton = screen.getByText('Add First Exercise');
    fireEvent.click(addExerciseButton);

    // Add the Push-ups exercise (repetition-based) by clicking on its row
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    const pushupRow = screen.getByText('Push-ups').closest('button');
    if (pushupRow) {
      fireEvent.click(pushupRow);
    }

    // Wait for exercise to be added and check fields are displayed correctly  
    await waitFor(() => {
      expect(screen.getByText('1. Push-ups')).toBeInTheDocument();
    });

    // Check that Sets and Reps fields are visible for repetition-based exercise
    expect(screen.getByText('Sets')).toBeInTheDocument();
    expect(screen.getByText('Reps')).toBeInTheDocument();

    // Check that Duration field is NOT visible for repetition-based exercise
    expect(screen.queryByText('Duration (seconds)')).not.toBeInTheDocument();

    // Rest Time should always be visible
    expect(screen.getByText('Rest Time (seconds)')).toBeInTheDocument();
  });
});
