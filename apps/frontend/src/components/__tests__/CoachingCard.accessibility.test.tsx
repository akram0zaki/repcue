/**
 * CoachingCard Accessibility Tests
 * 
 * Tests WCAG 2.1 AA compliance for CoachingCard component:
 * - ARIA attributes (labels, describedby, live regions)
 * - Keyboard navigation
 * - Focus management
 * - Screen reader support
 * - Reduced motion support
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachingCard from '../CoachingCard';
import type { CoachingInsight } from '../../types/coaching';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'coaching:actions': 'Available actions',
        'common:dismiss': 'Dismiss',
        'coaching:insights.streak.title': 'Great Streak!',
        'coaching:insights.streak.message': 'You have worked out 5 days in a row',
        'coaching:insights.actions.startWorkout': 'Start Workout',
        'coaching:insights.actions.viewProgress': 'View Progress'
      };
      
      // Handle both string defaultValue and options object
      if (typeof options === 'string') {
        return translations[key] || options || key;
      }
      
      if (options && typeof options === 'object' && 'defaultValue' in options) {
        return translations[key] || options.defaultValue || key;
      }
      
      return translations[key] || key;
    },
    i18n: { language: 'en' }
  })
}));

describe('CoachingCard - Accessibility', () => {
  const mockInsight: CoachingInsight = {
    id: 'test-insight-1',
    type: 'streak',
    priority: 'medium',
    source: 'rule',
    title: 'coaching:insights.streak.title',
    message: 'coaching:insights.streak.message',
    icon: 'fire',
    iconColor: 'text-orange-500',
    dismissible: true,
    createdAt: new Date().toISOString(),
    actions: [
      {
        label: 'coaching:insights.actions.startWorkout',
        action: 'start-workout'
      },
      {
        label: 'coaching:insights.actions.viewProgress',
        action: 'view-progress'
      }
    ]
  };

  const mockOnAction = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Attributes', () => {
    it('should have article role', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      const titleId = `coaching-title-${mockInsight.id}`;
      
      expect(article).toHaveAttribute('aria-labelledby', titleId);
      
      // Verify title element has the correct ID
      const titleElement = document.getElementById(titleId);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement?.tagName).toBe('H4');
    });

    it('should have aria-describedby pointing to message', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      const messageId = `coaching-message-${mockInsight.id}`;
      
      expect(article).toHaveAttribute('aria-describedby', messageId);
      
      // Verify message element has the correct ID
      const messageElement = document.getElementById(messageId);
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.tagName).toBe('P');
    });

    it('should have aria-live="polite" for dynamic updates', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-atomic="true"', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-atomic', 'true');
    });

    it('should mark icon as aria-hidden', () => {
      const { container } = render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      // Find the icon container by aria-hidden attribute
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('flex-shrink-0');
    });

    it('should have group role for actions with aria-label', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const actionsGroup = screen.getByRole('group');
      expect(actionsGroup).toHaveAttribute('aria-label', 'Available actions');
    });

    it('should have descriptive aria-label on action buttons', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      // Action buttons should include context from the insight title in their aria-label
      const buttons = screen.getAllByRole('button');
      const actionButtons = buttons.filter(btn => btn.textContent === 'Start Workout' || btn.textContent === 'View Progress');
      
      expect(actionButtons).toHaveLength(2);
      actionButtons.forEach(button => {
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('-'); // Should have format "Action - Context"
      });
    });

    it('should have descriptive aria-label on dismiss button', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const buttons = screen.getAllByRole('button');
      const dismissButton = buttons.find(btn => btn.getAttribute('aria-label')?.toLowerCase().includes('dismiss'));
      
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAttribute('title', 'Dismiss');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow Tab navigation through action buttons', async () => {
      const user = userEvent.setup();
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const startButton = screen.getByRole('button', { name: /Start Workout/i });
      const viewButton = screen.getByRole('button', { name: /View Progress/i });
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      
      // Tab to first action button
      await user.tab();
      expect(startButton).toHaveFocus();
      
      // Tab to second action button
      await user.tab();
      expect(viewButton).toHaveFocus();
      
      // Tab to dismiss button
      await user.tab();
      expect(dismissButton).toHaveFocus();
    });

    it('should trigger action on Enter key', async () => {
      const user = userEvent.setup();
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const startButton = screen.getByRole('button', { name: /Start Workout/i });
      startButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnAction).toHaveBeenCalledWith('start-workout', undefined);
    });

    it('should trigger dismiss on Enter key', async () => {
      const user = userEvent.setup();
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      dismissButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnDismiss).toHaveBeenCalledWith(mockInsight.id);
    });

    it('should show focus indicators', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const startButton = screen.getByRole('button', { name: /Start Workout/i });
      expect(startButton).toHaveClass('focus:ring-2', 'focus:ring-primary-500');
      
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      expect(dismissButton).toHaveClass('focus:ring-2', 'focus:ring-gray-400');
    });
  });

  describe('Non-dismissible Insights', () => {
    it('should not render dismiss button when dismissible is false', () => {
      const nonDismissibleInsight: CoachingInsight = {
        ...mockInsight,
        dismissible: false
      };
      
      render(<CoachingCard insight={nonDismissibleInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const dismissButton = screen.queryByRole('button', { name: /Dismiss/i });
      expect(dismissButton).not.toBeInTheDocument();
    });

    it('should not render dismiss button when onDismiss is not provided', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} />);
      
      const dismissButton = screen.queryByRole('button', { name: /Dismiss/i });
      expect(dismissButton).not.toBeInTheDocument();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should include motion-reduce:transition-none classes', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveClass('motion-reduce:transition-none');
      
      const actionButton = screen.getByRole('button', { name: /Start Workout/i });
      expect(actionButton).toHaveClass('motion-reduce:transition-none');
      
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      expect(dismissButton).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('Priority-based Styling', () => {
    it('should apply high priority border color', () => {
      const highPriorityInsight: CoachingInsight = {
        ...mockInsight,
        priority: 'high'
      };
      
      render(<CoachingCard insight={highPriorityInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveClass('border-red-400', 'dark:border-red-600');
    });

    it('should apply medium priority border color', () => {
      render(<CoachingCard insight={mockInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveClass('border-amber-400', 'dark:border-amber-600');
    });

    it('should apply low priority border color', () => {
      const lowPriorityInsight: CoachingInsight = {
        ...mockInsight,
        priority: 'low'
      };
      
      render(<CoachingCard insight={lowPriorityInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveClass('border-blue-400', 'dark:border-blue-600');
    });
  });

  describe('Action Data Handling', () => {
    it('should pass action data when provided', async () => {
      const user = userEvent.setup();
      const insightWithData: CoachingInsight = {
        ...mockInsight,
        actions: [
          {
            label: 'coaching:insights.actions.startWorkout',
            action: 'start-exercise',
            data: { exerciseId: 'exercise-123' }
          }
        ]
      };
      
      render(<CoachingCard insight={insightWithData} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const actionButton = screen.getByRole('button', { name: /Start Workout/i });
      await user.click(actionButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('start-exercise', { exerciseId: 'exercise-123' });
    });
  });

  describe('Empty State', () => {
    it('should handle insight without actions', () => {
      const noActionsInsight: CoachingInsight = {
        ...mockInsight,
        actions: undefined
      };
      
      render(<CoachingCard insight={noActionsInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const actionsGroup = screen.queryByRole('group');
      expect(actionsGroup).not.toBeInTheDocument();
      
      // Should still have dismiss button
      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should handle empty actions array', () => {
      const emptyActionsInsight: CoachingInsight = {
        ...mockInsight,
        actions: []
      };
      
      render(<CoachingCard insight={emptyActionsInsight} onAction={mockOnAction} onDismiss={mockOnDismiss} />);
      
      const actionsGroup = screen.queryByRole('group');
      expect(actionsGroup).not.toBeInTheDocument();
    });
  });
});
