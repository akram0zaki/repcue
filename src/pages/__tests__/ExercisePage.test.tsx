import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, vi, expect } from 'vitest';
import ExercisePage from '../ExercisePage';
import { INITIAL_EXERCISES } from '../../data/exercises';
import type { Exercise } from '../../types';
import { ExerciseCategory } from '../../types';

// Mock exercise with many tags for testing expandable functionality
const mockExerciseWithManyTags: Exercise = {
  id: 'test-exercise',
  name: 'Test Exercise',
  description: 'A test exercise with many tags',
  category: ExerciseCategory.CORE,
  defaultDuration: 30,
  isFavorite: false,
  tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
};

// Mock exercise with few tags
const mockExerciseWithFewTags: Exercise = {
  id: 'test-exercise-few',
  name: 'Test Exercise Few',
  description: 'A test exercise with few tags',
  category: ExerciseCategory.CARDIO,
  defaultDuration: 60,
  isFavorite: true,
  tags: ['tag1', 'tag2']
};

describe('ExercisePage', () => {
  const mockOnToggleFavorite = vi.fn();

  const renderExercisePage = (exercises: Exercise[] = INITIAL_EXERCISES) => {
    return render(
      <BrowserRouter>
        <ExercisePage 
          exercises={exercises} 
          onToggleFavorite={mockOnToggleFavorite} 
        />
      </BrowserRouter>
    );
  };

  it('should render without crashing', () => {
    renderExercisePage();
  });

  describe('Expandable Tags', () => {
    it('should show only first 2 tags initially when there are more than 2 tags', () => {
      renderExercisePage([mockExerciseWithManyTags]);
      
      // Should show first 2 tags
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      
      // Should not show additional tags initially
      expect(screen.queryByText('tag3')).not.toBeInTheDocument();
      expect(screen.queryByText('tag4')).not.toBeInTheDocument();
      expect(screen.queryByText('tag5')).not.toBeInTheDocument();
      
      // Should show +3 indicator
      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should show all tags without expand button when there are 2 or fewer tags', () => {
      renderExercisePage([mockExerciseWithFewTags]);
      
      // Should show both tags
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      
      // Should not show expand button
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('should expand to show all tags when +n button is clicked', () => {
      renderExercisePage([mockExerciseWithManyTags]);
      
      // Click the expand button
      const expandButton = screen.getByText('+3');
      fireEvent.click(expandButton);
      
      // Should now show all tags
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('tag4')).toBeInTheDocument();
      expect(screen.getByText('tag5')).toBeInTheDocument();
      
      // Should show "Show less" button
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.queryByText('+3')).not.toBeInTheDocument();
    });

    it('should collapse back to 2 tags when "Show less" is clicked', () => {
      renderExercisePage([mockExerciseWithManyTags]);
      
      // Expand first
      const expandButton = screen.getByText('+3');
      fireEvent.click(expandButton);
      
      // Then collapse
      const collapseButton = screen.getByText('Show less');
      fireEvent.click(collapseButton);
      
      // Should show only first 2 tags again
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.queryByText('tag3')).not.toBeInTheDocument();
      expect(screen.queryByText('tag4')).not.toBeInTheDocument();
      expect(screen.queryByText('tag5')).not.toBeInTheDocument();
      
      // Should show +3 indicator again
      expect(screen.getByText('+3')).toBeInTheDocument();
      expect(screen.queryByText('Show less')).not.toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      renderExercisePage([mockExerciseWithManyTags]);
      
      const expandButton = screen.getByText('+3');
      
      // Should have proper ARIA attributes
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      expect(expandButton).toHaveAttribute('aria-label', 'Show 3 more tags');
      
      // Click to expand
      fireEvent.click(expandButton);
      
      const collapseButton = screen.getByText('Show less');
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      expect(collapseButton).toHaveAttribute('aria-label', 'Show fewer tags');
    });

    it('should handle single additional tag correctly', () => {
      const exerciseWithThreeTags: Exercise = {
        ...mockExerciseWithManyTags,
        tags: ['tag1', 'tag2', 'tag3']
      };
      
      renderExercisePage([exerciseWithThreeTags]);
      
      // Should show +1 (singular)
      const expandButton = screen.getByText('+1');
      expect(expandButton).toHaveAttribute('aria-label', 'Show 1 more tag');
    });
  });
});
