/**
 * Component tests for BadgeFilter
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BadgeFilter from '../BadgeFilter';
import type { CatalogBadge, BadgeValue } from '../../types';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
  }),
}));

describe('BadgeFilter', () => {
  const mockValues: BadgeValue[] = [
    { id: 'strength', label: 'Strength' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'flexibility', label: 'Flexibility' },
  ];

  const mockBadge: CatalogBadge = {
    id: 'category',
    label: 'Category',
    values: mockValues,
    tagPattern: { prefix: 'category:' },
  };

  const mockOnToggleValue = vi.fn();
  const mockOnClearValues = vi.fn();

  it('should render badge label', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('should render all badge values', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.getByText('Flexibility')).toBeInTheDocument();
  });

  it('should call onToggleValue when value is clicked', async () => {
    const user = userEvent.setup();

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const strengthButton = screen.getByText('Strength');
    await user.click(strengthButton);

    expect(mockOnToggleValue).toHaveBeenCalledWith('category', 'strength');
  });

  it('should highlight selected values', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set(['strength', 'cardio'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const strengthButton = screen.getByText('Strength').closest('button');
    const cardioButton = screen.getByText('Cardio').closest('button');
    const flexibilityButton = screen.getByText('Flexibility').closest('button');

    expect(strengthButton).toHaveClass('bg-primary-500');
    expect(cardioButton).toHaveClass('bg-primary-500');
    expect(flexibilityButton).not.toHaveClass('bg-primary-500');
  });

  it('should show clear button when values are selected', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set(['strength'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.getByLabelText(/clear/i)).toBeInTheDocument();
  });

  it('should not show clear button when no values are selected', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.queryByLabelText(/clear/i)).not.toBeInTheDocument();
  });

  it('should call onClearValues when clear button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set(['strength'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const clearButton = screen.getByLabelText(/clear/i);
    await user.click(clearButton);

    expect(mockOnClearValues).toHaveBeenCalledWith('category');
  });

  it('should handle single selection mode', async () => {
    const user = userEvent.setup();
    const singleSelectBadge: CatalogBadge = {
      ...mockBadge,
      filterType: 'single',
    };

    render(
      <BadgeFilter
        badge={singleSelectBadge}
        selectedValues={new Set(['strength'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const cardioButton = screen.getByText('Cardio');
    await user.click(cardioButton);

    // In single mode, clicking should toggle the value
    expect(mockOnToggleValue).toHaveBeenCalledWith('category', 'cardio');
  });

  it('should handle multiple selection mode (default)', async () => {
    const user = userEvent.setup();

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set(['strength'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const cardioButton = screen.getByText('Cardio');
    await user.click(cardioButton);

    expect(mockOnToggleValue).toHaveBeenCalledWith('category', 'cardio');
  });

  it('should render with icons when provided', () => {
    const valuesWithIcons: BadgeValue[] = [
      { id: 'strength', label: 'Strength', icon: <>💪</> },
      { id: 'cardio', label: 'Cardio', icon: <>🏃</> },
    ];

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={valuesWithIcons}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.getByText('💪')).toBeInTheDocument();
    expect(screen.getByText('🏃')).toBeInTheDocument();
  });

  it('should handle empty values array', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={[]}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    expect(screen.getByText('Category')).toBeInTheDocument();
    // Should not render any value buttons
    expect(screen.queryByRole('button', { name: /strength/i })).not.toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const strengthButton = screen.getByText('Strength');

    // Tab to focus
    await user.tab();
    expect(strengthButton).toHaveFocus();

    // Press Enter to select
    await user.keyboard('{Enter}');
    expect(mockOnToggleValue).toHaveBeenCalledWith('category', 'strength');
  });

  it('should handle numeric badge values', () => {
    const numericValues: BadgeValue[] = [
      { id: 1, label: '1st Kyu' },
      { id: 2, label: '2nd Kyu' },
      { id: 3, label: '3rd Kyu' },
    ];

    const kyuBadge: CatalogBadge = {
      id: 'kyuLevel',
      label: 'Kyu Level',
      values: numericValues,
      tagPattern: { prefix: 'kyu:' },
    };

    render(
      <BadgeFilter
        badge={kyuBadge}
        selectedValues={new Set([1, 3])}
        availableValues={numericValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const firstKyuButton = screen.getByText('1st Kyu').closest('button');
    const secondKyuButton = screen.getByText('2nd Kyu').closest('button');
    const thirdKyuButton = screen.getByText('3rd Kyu').closest('button');

    expect(firstKyuButton).toHaveClass('bg-primary-500');
    expect(secondKyuButton).not.toHaveClass('bg-primary-500');
    expect(thirdKyuButton).toHaveClass('bg-primary-500');
  });

  it('should apply proper ARIA labels', () => {
    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set(['strength'])}
        availableValues={mockValues}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    const strengthButton = screen.getByText('Strength').closest('button');
    expect(strengthButton).toHaveAttribute('aria-pressed', 'true');

    const cardioButton = screen.getByText('Cardio').closest('button');
    expect(cardioButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('should handle fallback labels when translation is missing', () => {
    const valuesWithFallback: BadgeValue[] = [
      { id: 'custom', label: 'missing.translation.key', fallbackLabel: 'Custom Category' },
    ];

    render(
      <BadgeFilter
        badge={mockBadge}
        selectedValues={new Set()}
        availableValues={valuesWithFallback}
        onToggleValue={mockOnToggleValue}
        onClearValues={mockOnClearValues}
      />
    );

    // Should render the fallback since t() returns the key when translation missing
    expect(screen.getByText(/custom/i)).toBeInTheDocument();
  });
});
