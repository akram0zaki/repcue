import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseSelectorModal } from '../ExerciseSelectorModal';
import type { Exercise } from '../../../types';

// Mock ExerciseSelector
vi.mock('../ExerciseSelector', () => ({
  ExerciseSelector: ({ onSelectExercise, ...props }: any) => (
    <div data-testid="exercise-selector">
      <button onClick={() => onSelectExercise({ id: 'test-exercise', name: 'Test' })}>
        Select Exercise
      </button>
    </div>
  )
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'exercise-1',
  name: 'Push-ups',
  description: 'A basic push-up exercise',
  category: 'strength',
  exercise_type: 'repetition_based',
  default_sets: 3,
  default_reps: 10,
  difficulty: 'beginner',
  catalogId: 'default-catalog',
  is_favorite: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  tags: [],
  ...overrides
});

describe('ExerciseSelectorModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectExercise = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('should not render when isOpen is false', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={false}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display custom title', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
        title="Custom Title"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should display default title when not provided', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(screen.getByText('exercises:selectExercise')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const closeButton = screen.getByLabelText('common.close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onSelectExercise and onClose when exercise is selected', () => {
    render(
      <ExerciseSelectorModal
        exercises={[createMockExercise()]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const selectButton = screen.getByText('Select Exercise');
    fireEvent.click(selectButton);

    expect(mockOnSelectExercise).toHaveBeenCalledWith({ id: 'test-exercise', name: 'Test' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA attributes', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).toHaveAttribute('aria-modal', 'true');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'exercise-selector-title');
  });

  it('should prevent body scroll when open', () => {
    const { rerender } = render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={false}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(document.body.style.overflow).toBe('');

    rerender(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body scroll when closed', () => {
    const { rerender } = render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={false}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('should pass props to ExerciseSelector', () => {
    const exercises = [createMockExercise()];

    render(
      <ExerciseSelectorModal
        exercises={exercises}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
        showCatalogSelector={true}
        showSearch={true}
        showTypeFilter={true}
      />
    );

    expect(screen.getByTestId('exercise-selector')).toBeInTheDocument();
  });

  it('should handle escape key press', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not handle escape key when closed', () => {
    render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={false}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <ExerciseSelectorModal
        exercises={[]}
        isOpen={true}
        onClose={mockOnClose}
        onSelectExercise={mockOnSelectExercise}
      />
    );

    unmount();

    // Fire escape after unmount - should not call onClose
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
