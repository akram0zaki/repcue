import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WorkoutsPage from '../WorkoutsPage';
import { storageService } from '../../services/storageService';
import { consentService } from '../../services/consentService';
import type { Workout } from '../../types';
import { Routes } from '../../types';

// Mock the services
vi.mock('../../services/storageService');
vi.mock('../../services/consentService');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockWorkout: Workout = {
  id: 'workout-1',
  name: 'Test Workout',
  description: 'A test workout',
  exercises: [
    {
      id: 'ex-1',
      exerciseId: 'exercise-1',
      order: 1,
      customSets: 3,
      customReps: 10,
      customDuration: 30,
      customRestTime: 60
    },
    {
      id: 'ex-2',
      exerciseId: 'exercise-2',
      order: 2,
      customSets: 3,
      customReps: 15,
      customDuration: 45,
      customRestTime: 90
    }
  ],
  isActive: true,
  scheduledDays: ['monday', 'wednesday', 'friday'],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  deleted: false,
  version: 1
};

const mockPausedWorkout: Workout = {
  ...mockWorkout,
  id: 'workout-2',
  name: 'Paused Workout',
  isActive: false
};

describe('WorkoutsPage - Start Workout Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWorkoutsPage = () => {
    return render(
      <MemoryRouter>
        <WorkoutsPage />
      </MemoryRouter>
    );
  };

  it('should display Start button for active workouts', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Workout')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle('Start workout');
    expect(startButton).toBeInTheDocument();
    expect(startButton).toHaveTextContent('Start');
    expect(startButton).not.toBeDisabled();
  });

  it('should display disabled Start button for paused workouts', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockPausedWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Paused Workout')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle('Workout is paused');
    expect(startButton).toBeInTheDocument();
    expect(startButton).toHaveTextContent('Start');
    expect(startButton).toBeDisabled();
  });

  it('should navigate to timer with workout context when Start is clicked', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Workout')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle('Start workout');
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TIMER, {
      state: {
        workoutMode: {
          workoutId: mockWorkout.id,
          workoutName: mockWorkout.name,
          exercises: mockWorkout.exercises
        }
      }
    });
  });

  it('should display Start button alongside Edit and Delete buttons', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Workout')).toBeInTheDocument();
    });

    // Check all three buttons are present
    expect(screen.getByTitle('Start workout')).toBeInTheDocument();
    expect(screen.getByTitle('Edit workout')).toBeInTheDocument();
    expect(screen.getByTitle('Delete workout')).toBeInTheDocument();

    // Check they are in the correct order (Start, Edit, Delete)
    const actionButtons = screen.getAllByRole('button');
    const startIndex = actionButtons.findIndex(btn => btn.getAttribute('title') === 'Start workout');
    const editIndex = actionButtons.findIndex(btn => btn.getAttribute('title') === 'Edit workout');
    const deleteIndex = actionButtons.findIndex(btn => btn.getAttribute('title') === 'Delete workout');

    expect(startIndex).toBeLessThan(editIndex);
    expect(editIndex).toBeLessThan(deleteIndex);
  });

  it('should handle multiple workouts with different active states', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockWorkout, mockPausedWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Workout')).toBeInTheDocument();
      expect(screen.getByText('Paused Workout')).toBeInTheDocument();
    });

    const startButtons = screen.getAllByText('Start');
    expect(startButtons).toHaveLength(2);

    // First workout (active) should have enabled button
    const activeWorkoutButton = screen.getByTitle('Start workout');
    expect(activeWorkoutButton).not.toBeDisabled();

    // Second workout (paused) should have disabled button
    const pausedWorkoutButton = screen.getByTitle('Workout is paused');
    expect(pausedWorkoutButton).toBeDisabled();
  });

  it('should not navigate when clicking disabled Start button', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockPausedWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Paused Workout')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle('Workout is paused');
    fireEvent.click(startButton);

    // Should not navigate when button is disabled
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show green Start button with play icon', async () => {
    vi.mocked(storageService.getWorkouts).mockResolvedValue([mockWorkout]);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Workout')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle('Start workout');
    expect(startButton).toHaveClass('bg-green-600', 'hover:bg-green-700');
    
    // Check for the SVG icon
    const icon = startButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should work without consent (graceful degradation)', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(false);

    renderWorkoutsPage();

    await waitFor(() => {
      expect(screen.getByText('You need to enable data storage to create and manage workouts.')).toBeInTheDocument();
    });

    // Should not call getWorkouts when consent is false
    expect(storageService.getWorkouts).not.toHaveBeenCalled();
  });
});
