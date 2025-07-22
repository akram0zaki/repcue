import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import ExercisePage from '../ExercisePage';
import { INITIAL_EXERCISES } from '../../data/exercises';

// Simple test to verify ExercisePage renders without errors
describe('ExercisePage', () => {
  it('should render without crashing', () => {
    const mockOnToggleFavorite = vi.fn();
    
    render(
      <BrowserRouter>
        <ExercisePage 
          exercises={INITIAL_EXERCISES} 
          onToggleFavorite={mockOnToggleFavorite} 
        />
      </BrowserRouter>
    );
  });
});
