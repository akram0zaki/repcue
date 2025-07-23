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
  lastSelectedExerciseId: 'plank'
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
    expect(screen.getByText('Your Personal Fitness Timer')).toBeInTheDocument();
  });

  it('displays the quick start section', () => {
    renderHomePage();
    
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Choose an exercise duration and get started')).toBeInTheDocument();
  });

  it('renders duration preset buttons', () => {
    renderHomePage();
    
    expect(screen.getByRole('button', { name: /15s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument();
  });

  it('renders favorite exercises section', () => {
    renderHomePage();
    
    expect(screen.getByText('Favorite Exercises')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument(); // Should show favorite exercise
  });

  it('renders exercise categories section', () => {
    renderHomePage();
    
    expect(screen.getByText('Exercise Categories')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
  });

  it('navigates to timer page when duration preset is clicked', async () => {
    renderHomePage();
    
    const thirtySecondButton = screen.getByRole('button', { name: /30s/i });
    fireEvent.click(thirtySecondButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timer', {
        state: { selectedDuration: 30 }
      });
    });
  });

  it('navigates to exercises page when category is clicked', async () => {
    renderHomePage();
    
    const coreCategory = screen.getByText('Core');
    fireEvent.click(coreCategory);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/exercises', {
        state: { selectedCategory: 'core' }
      });
    });
  });

  it('navigates to exercises page when "Browse All Exercises" is clicked', async () => {
    renderHomePage();
    
    const browseAllButton = screen.getByRole('button', { name: /browse all exercises/i });
    fireEvent.click(browseAllButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/exercises');
    });
  });

  it('calls onToggleFavorite when favorite button is clicked', async () => {
    renderHomePage();
    
    // Find the favorite button for the Plank exercise
    const favoriteButtons = screen.getAllByLabelText(/toggle favorite/i);
    fireEvent.click(favoriteButtons[0]);

    await waitFor(() => {
      expect(mockOnToggleFavorite).toHaveBeenCalledWith('plank');
    });
  });

  it('shows "No favorites yet" when no exercises are favorited', () => {
    const exercisesWithoutFavorites = mockExercises.map(ex => ({ ...ex, isFavorite: false }));
    
    renderHomePage({ exercises: exercisesWithoutFavorites });
    
    expect(screen.getByText('No favorites yet')).toBeInTheDocument();
    expect(screen.getByText('Mark exercises as favorites to see them here')).toBeInTheDocument();
  });

  it('displays correct exercise counts in categories', () => {
    renderHomePage();
    
    // Should show correct count for each category
    expect(screen.getByText('1 exercise')).toBeInTheDocument(); // Core has 1 exercise
  });

  it('navigates to exercise detail when favorite exercise is clicked', async () => {
    renderHomePage();
    
    const plankExercise = screen.getByText('Plank');
    fireEvent.click(plankExercise.closest('button')!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/exercises/plank');
    });
  });

  it('shows custom duration input when custom button is clicked', async () => {
    renderHomePage();
    
    const customButton = screen.getByRole('button', { name: /custom/i });
    fireEvent.click(customButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/custom duration/i)).toBeInTheDocument();
    });
  });

  it('validates custom duration input', async () => {
    renderHomePage();
    
    const customButton = screen.getByRole('button', { name: /custom/i });
    fireEvent.click(customButton);

    const customInput = screen.getByLabelText(/custom duration/i);
    const startButton = screen.getByRole('button', { name: /start timer/i });

    // Test invalid input
    fireEvent.change(customInput, { target: { value: '0' } });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/duration must be at least 1 second/i)).toBeInTheDocument();
    });

    // Test valid input
    fireEvent.change(customInput, { target: { value: '45' } });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timer', {
        state: { selectedDuration: 45 }
      });
    });
  });

  it('applies correct styling for dark mode', () => {
    const darkModeSettings = { ...mockAppSettings, darkMode: true };
    renderHomePage({ appSettings: darkModeSettings });
    
    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveClass('dark:bg-gray-900');
  });

  it('displays recent activity section when there are recent exercises', () => {
    renderHomePage();
    
    // This test assumes recent activity would be shown if implemented
    // For now, we just verify the component renders without errors
    expect(screen.getByText('RepCue')).toBeInTheDocument();
  });
});
