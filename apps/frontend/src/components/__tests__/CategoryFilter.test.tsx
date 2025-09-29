import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import CategoryFilter from '../CategoryFilter';
import { ExerciseCategory } from '../../types';

// Mock the logger utility
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}));

const defaultProps = {
  selectedCategories: new Set<ExerciseCategory>(),
  onCategoryToggle: vi.fn(),
  onClearAll: vi.fn()
};

const renderComponent = (props = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <CategoryFilter {...defaultProps} {...props} />
    </I18nextProvider>
  );
};

describe('CategoryFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dropdown style', () => {
    it('renders dropdown button with correct text when no categories selected', () => {
      renderComponent({ style: 'dropdown', label: 'Category' });

      // Use getAllByText since there are responsive versions (desktop/mobile)
      expect(screen.getAllByText('Category')).toHaveLength(2);
      expect(screen.getByText('Select')).toBeInTheDocument();
    });

    it('shows selected count when categories are selected', () => {
      const selectedCategories = new Set([ExerciseCategory.CORE, ExerciseCategory.STRENGTH]);
      renderComponent({ 
        style: 'dropdown', 
        selectedCategories,
        label: 'Category' 
      });
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('shows clear button when categories are selected', () => {
      const selectedCategories = new Set([ExerciseCategory.CORE]);
      renderComponent({ 
        style: 'dropdown', 
        selectedCategories,
        label: 'Category' 
      });
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  describe('badges style', () => {
    it('renders all category badges', () => {
      renderComponent({ style: 'badges' });
      
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('core')).toBeInTheDocument();
      expect(screen.getByText('strength')).toBeInTheDocument();
      expect(screen.getByText('cardio')).toBeInTheDocument();
      expect(screen.getByText('flexibility')).toBeInTheDocument();
      expect(screen.getByText('balance')).toBeInTheDocument();
    });

    it('calls onCategoryToggle when category badge is clicked', () => {
      const onCategoryToggle = vi.fn();
      renderComponent({ 
        style: 'badges',
        onCategoryToggle 
      });
      
      fireEvent.click(screen.getByText('core'));
      
      expect(onCategoryToggle).toHaveBeenCalledWith(ExerciseCategory.CORE);
    });

    it('calls onClearAll when All badge is clicked', () => {
      const onClearAll = vi.fn();
      renderComponent({ 
        style: 'badges',
        onClearAll 
      });
      
      fireEvent.click(screen.getByText('All'));
      
      expect(onClearAll).toHaveBeenCalled();
    });
  });
});