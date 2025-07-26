import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import type { Exercise, AppSettings } from '../../types';
import { ExerciseCategory } from '../../types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockExercises: Exercise[] = [
  {
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line',
    category: ExerciseCategory.CORE,
    defaultDuration: 60,
    isFavorite: true,
    tags: ['core', 'stability']
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['strength', 'arms']
  },
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Jump with legs apart and arms overhead',
    category: ExerciseCategory.CARDIO,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['cardio', 'full-body']
  }
];

const mockAppSettings: AppSettings = {
  intervalDuration: 30,
  soundEnabled: true,
  vibrationEnabled: true,
  beepVolume: 0.5,
  darkMode: false,
  autoSave: true,
  lastSelectedExerciseId: 'plank',
  preTimerCountdown: 3
};

const mockOnToggleFavorite = vi.fn();

const renderHomePage = (props = {}) => {
  const defaultProps = {
    exercises: mockExercises,
    appSettings: mockAppSettings,
    onToggleFavorite: mockOnToggleFavorite,
    ...props
  };

  return render(
    <BrowserRouter>
      <HomePage {...defaultProps} />
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title and description', () => {
    renderHomePage();
    
    expect(screen.getByText('RepCue')).toBeInTheDocument();
    expect(screen.getByText('Your personal exercise timer')).toBeInTheDocument();
  });

  it('displays the main action buttons', () => {
    renderHomePage();
    
    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse exercises/i })).toBeInTheDocument();
  });

  it('renders favorite exercises section', () => {
    renderHomePage();
    
    expect(screen.getByText('Favorite Exercises')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument(); // Should show favorite exercise
  });

  it('shows available exercises count', () => {
    renderHomePage();
    
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 exercises in mock data
    expect(screen.getByText('Available Exercises')).toBeInTheDocument();
  });

  it('navigates to timer page when start timer is clicked', async () => {
    renderHomePage();
    
    const startTimerButton = screen.getByRole('button', { name: /start timer/i });
    fireEvent.click(startTimerButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timer');
    });
  });

  it('navigates to exercises page when browse exercises is clicked', async () => {
    renderHomePage();
    
    const browseButton = screen.getByRole('button', { name: /browse exercises/i });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/exercises');
    });
  });

  it('navigates to timer when favorite exercise start button is clicked', async () => {
    renderHomePage();
    
    // Find all buttons with "Start" text and get the small one (the exercise start button)
    const allStartButtons = screen.getAllByText('Start');
    const exerciseStartButton = allStartButtons.find(button => 
      button.className.includes('text-sm')
    );
    
    expect(exerciseStartButton).toBeInTheDocument();
    fireEvent.click(exerciseStartButton!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timer', {
        state: {
          selectedExercise: expect.objectContaining({
            id: 'plank',
            name: 'Plank',
            defaultDuration: 60
          }),
          selectedDuration: 60
        }
      });
    });
  });

  it('calls onToggleFavorite when favorite star is clicked', async () => {
    renderHomePage();
    
    const favoriteButton = screen.getByLabelText(/remove plank from favorites/i);
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockOnToggleFavorite).toHaveBeenCalledWith('plank');
    });
  });

  it('shows message when no favorite exercises exist', () => {
    const exercisesWithoutFavorites = mockExercises.map(ex => ({ ...ex, isFavorite: false }));
    renderHomePage({ exercises: exercisesWithoutFavorites });
    
    expect(screen.getByText('No favorite exercises yet. Mark some exercises as favorites to see them here!')).toBeInTheDocument();
  });

  it('applies correct styling for dark mode', () => {
    const darkModeSettings = { ...mockAppSettings, darkMode: true };
    renderHomePage({ appSettings: darkModeSettings });
    
    const mainContent = document.getElementById('main-content');
    expect(mainContent).toHaveClass('dark:bg-gray-900');
  });
});
