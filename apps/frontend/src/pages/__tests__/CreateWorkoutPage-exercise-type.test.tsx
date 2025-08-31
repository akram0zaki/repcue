import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreateWorkoutPage from '../CreateWorkoutPage';
import { storageService } from '../../services/storageService';
import { consentService } from '../../services/consentService';
import type { Exercise } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';
import { createMockExercise } from '../../test/testUtils';

// Mock dependencies
vi.mock('../../services/storageService');
vi.mock('../../services/consentService');

const mockStorageService = vi.mocked(storageService);
const mockConsentService = vi.mocked(consentService);

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

describe('CreateWorkoutPage - Exercise Type Display Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsentService.hasConsent.mockReturnValue(true);
    mockStorageService.getExercises.mockResolvedValue(mockExercises);
  });

  it('should show only duration field for time-based exercises (Plank)', async () => {
    renderCreateWorkoutPage();

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByLabelText('Workout Name')).toBeInTheDocument();
    });

    // Fill workout name to enable adding exercises
    fireEvent.change(screen.getByLabelText('Workout Name'), {
      target: { value: 'Test Workout' }
    });

    // Open exercise picker
    const addButton = screen.getByText('Add First Exercise');
    fireEvent.click(addButton);

    // Wait for exercise picker to open and find Plank
    await waitFor(() => {
      expect(screen.getByText('Plank')).toBeInTheDocument();
    });

    // Click on Plank exercise to add it
    const plankElement = screen.getByText('Plank').closest('button');
    if (plankElement) {
      fireEvent.click(plankElement);
    }

    // Wait for exercise to be added to the workout
    await waitFor(() => {
      expect(screen.getByText('1. Plank')).toBeInTheDocument();
    });

    // Check that only Duration field is visible (not Sets/Reps)
    expect(screen.getByLabelText('Duration (seconds)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sets')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reps')).not.toBeInTheDocument();
    
    // Rest Time should always be visible
    expect(screen.getByLabelText('Rest Time (seconds)')).toBeInTheDocument();
  });

  it('should show only sets/reps fields for repetition-based exercises (Push-ups)', async () => {
    renderCreateWorkoutPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Workout Name')).toBeInTheDocument();
    });

    // Fill workout name
    fireEvent.change(screen.getByLabelText('Workout Name'), {
      target: { value: 'Test Workout' }
    });

    // Open exercise picker
    const addButton = screen.getByText('Add First Exercise');
    fireEvent.click(addButton);

    // Wait for exercise picker and find Push-ups
    await waitFor(() => {
      expect(screen.getByText('Push-ups')).toBeInTheDocument();
    });

    // Add Push-ups exercise
    const pushupElement = screen.getByText('Push-ups').closest('button');
    if (pushupElement) {
      fireEvent.click(pushupElement);
    }

    // Wait for exercise to be added
    await waitFor(() => {
      expect(screen.getByText('1. Push-ups')).toBeInTheDocument();
    });

    // Check that Sets and Reps fields are visible (not Duration)
    expect(screen.getByLabelText('Sets')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps')).toBeInTheDocument();
    expect(screen.queryByLabelText('Duration (seconds)')).not.toBeInTheDocument();
    
    // Rest Time should always be visible
    expect(screen.getByLabelText('Rest Time (seconds)')).toBeInTheDocument();
  });
});
