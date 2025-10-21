import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachingCard from '../CoachingCard';
import type { CoachingInsight } from '../../types/coaching';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
    i18n: {
      language: 'en',
    },
  }),
}));

describe('CoachingCard', () => {
  const mockInsight: CoachingInsight = {
    id: 'test-insight-1',
    type: 'streak',
    priority: 'high',
    source: 'rule',
    title: 'Test Insight Title',
    message: 'Test insight message',
    icon: 'fire',
    createdAt: new Date().toISOString(),
    dismissible: true,
  };

  describe('Basic Rendering', () => {
    it('renders insight title and message', () => {
      render(<CoachingCard insight={mockInsight} />);
      
      expect(screen.getByText('Test Insight Title')).toBeInTheDocument();
      expect(screen.getByText('Test insight message')).toBeInTheDocument();
    });

    it('renders with correct priority border color', () => {
      const { container, rerender } = render(
        <CoachingCard insight={{ ...mockInsight, priority: 'high' }} />
      );
      
      const card = container.querySelector('.border-red-400');
      expect(card).toBeInTheDocument();

      rerender(<CoachingCard insight={{ ...mockInsight, priority: 'medium' }} />);
      expect(container.querySelector('.border-amber-400')).toBeInTheDocument();

      rerender(<CoachingCard insight={{ ...mockInsight, priority: 'low' }} />);
      expect(container.querySelector('.border-blue-400')).toBeInTheDocument();
    });

    it('renders dismiss button when dismissible', () => {
      render(
        <CoachingCard 
          insight={{ ...mockInsight, dismissible: true }} 
          onDismiss={vi.fn()}
        />
      );
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('does not render dismiss button when not dismissible', () => {
      render(
        <CoachingCard 
          insight={{ ...mockInsight, dismissible: false }} 
          onDismiss={vi.fn()}
        />
      );
      
      const dismissButton = screen.queryByRole('button', { name: /dismiss/i });
      expect(dismissButton).not.toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss not provided', () => {
      render(<CoachingCard insight={{ ...mockInsight, dismissible: true }} />);
      
      const dismissButton = screen.queryByRole('button', { name: /dismiss/i });
      expect(dismissButton).not.toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    const iconTypes = [
      'fire',
      'trophy',
      'target',
      'warning',
      'alert',
      'alert-circle',
      'calendar',
      'trending-up',
      'lightbulb',
      'info',
    ] as const;

    iconTypes.forEach((iconType) => {
      it(`renders ${iconType} icon`, () => {
        const { container } = render(
          <CoachingCard insight={{ ...mockInsight, icon: iconType }} />
        );
        
        // SVG icon should be present
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('defaults to info icon for unknown icon type', () => {
      const { container } = render(
        <CoachingCard insight={{ ...mockInsight, icon: undefined }} />
      );
      
      // Should still render an SVG (defaults to info icon)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Message Interpolation', () => {
    it('parses message with single parameter', () => {
      render(
        <CoachingCard
          insight={{
            ...mockInsight,
            message: 'common:greet:John',
          }}
        />
      );
      
      // i18n mock returns the key, so we should see "common"
      expect(screen.getByText(/common/)).toBeInTheDocument();
    });

    it('parses message with multiple parameters', () => {
      render(
        <CoachingCard
          insight={{
            ...mockInsight,
            message: 'common:message:param1:param2',
          }}
        />
      );
      
      // i18n mock returns the key, so we should see "common"
      expect(screen.getByText(/common/)).toBeInTheDocument();
    });

    it('displays raw message if no i18n key pattern', () => {
      render(
        <CoachingCard
          insight={{
            ...mockInsight,
            message: 'Simple message without interpolation',
          }}
        />
      );
      
      expect(screen.getByText('Simple message without interpolation')).toBeInTheDocument();
    });
  });

  describe('Action Handling', () => {
    it('renders action buttons when actions provided', () => {
      const insightWithActions: CoachingInsight = {
        ...mockInsight,
        actions: [
          { label: 'Start Workout', action: 'start-workout' },
          { label: 'View Progress', action: 'view-progress' },
        ],
      };

      render(<CoachingCard insight={insightWithActions} />);
      
      expect(screen.getByRole('button', { name: 'Start Workout' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Progress' })).toBeInTheDocument();
    });

    it('calls onAction when action button clicked', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();
      const insightWithActions: CoachingInsight = {
        ...mockInsight,
        actions: [
          { label: 'Test Action', action: 'test-action', data: { testData: 'value' } },
        ],
      };

      render(
        <CoachingCard insight={insightWithActions} onAction={mockOnAction} />
      );
      
      const actionButton = screen.getByRole('button', { name: 'Test Action' });
      await user.click(actionButton);

      expect(mockOnAction).toHaveBeenCalledWith('test-action', { testData: 'value' });
    });

    it('does not render actions section when no actions provided', () => {
      render(<CoachingCard insight={mockInsight} onDismiss={vi.fn()} />);
      
      // Should only have dismiss button, no action buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAccessibleName(/dismiss/i);
    });
  });

  describe('Dismiss Functionality', () => {
    it('calls onDismiss when dismiss button clicked', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = vi.fn();

      render(
        <CoachingCard
          insight={{ ...mockInsight, dismissible: true }}
          onDismiss={mockOnDismiss}
        />
      );
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledWith('test-insight-1');
    });

    it('dismiss button has correct accessibility attributes', () => {
      render(
        <CoachingCard 
          insight={{ ...mockInsight, dismissible: true }} 
          onDismiss={vi.fn()}
        />
      );
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toHaveAttribute('aria-label');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role for card container', () => {
      const { container } = render(<CoachingCard insight={mockInsight} />);
      
      // Card uses role="article" on a div, not an actual article element
      const article = container.querySelector('[role="article"]');
      expect(article).toBeInTheDocument();
    });

    it('all interactive elements are keyboard accessible', () => {
      const insightWithActions: CoachingInsight = {
        ...mockInsight,
        dismissible: true,
        actions: [{ label: 'Test Action', action: 'test-action' }],
      };

      render(
        <CoachingCard 
          insight={insightWithActions} 
          onDismiss={vi.fn()}
          onAction={vi.fn()}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      // Should have dismiss button + 1 action button
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('icon component renders successfully', () => {
      const { container } = render(<CoachingCard insight={mockInsight} />);
      
      // Icon should render an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Priority Styling', () => {
    it('applies high priority styles', () => {
      const { container } = render(
        <CoachingCard insight={{ ...mockInsight, priority: 'high' }} />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-red-400');
    });

    it('applies medium priority styles', () => {
      const { container } = render(
        <CoachingCard insight={{ ...mockInsight, priority: 'medium' }} />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-amber-400');
    });

    it('applies low priority styles', () => {
      const { container } = render(
        <CoachingCard insight={{ ...mockInsight, priority: 'low' }} />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-blue-400');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalInsight: CoachingInsight = {
        id: 'minimal',
        type: 'motivation',
        priority: 'low',
        source: 'rule',
        title: 'Minimal Insight',
        message: 'Basic message',
        icon: 'info',
        createdAt: new Date().toISOString(),
        dismissible: false,
      };

      expect(() => render(<CoachingCard insight={minimalInsight} />)).not.toThrow();
    });

    it('handles empty actions array', () => {
      const insightWithEmptyActions: CoachingInsight = {
        ...mockInsight,
        actions: [],
      };

      const { container } = render(<CoachingCard insight={insightWithEmptyActions} />);
      
      // Should not render actions section
      const actionButtons = container.querySelectorAll('button[type="button"]:not([aria-label*="Dismiss"])');
      expect(actionButtons).toHaveLength(0);
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(500);
      render(
        <CoachingCard
          insight={{
            ...mockInsight,
            message: longMessage,
          }}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles special characters in message', () => {
      const specialMessage = 'Message with <html> & "quotes" and \'apostrophes\'';
      render(
        <CoachingCard
          insight={{
            ...mockInsight,
            message: specialMessage,
          }}
        />
      );
      
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe('Multiple Actions', () => {
    it('renders multiple action buttons correctly', () => {
      const insightWithMultipleActions: CoachingInsight = {
        ...mockInsight,
        actions: [
          { label: 'Action 1', action: 'action-1' },
          { label: 'Action 2', action: 'action-2' },
          { label: 'Action 3', action: 'action-3' },
        ],
      };

      render(<CoachingCard insight={insightWithMultipleActions} />);
      
      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 3' })).toBeInTheDocument();
    });

    it('calls correct action handler for each button', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();
      const insightWithMultipleActions: CoachingInsight = {
        ...mockInsight,
        actions: [
          { label: 'First', action: 'first-action', data: { index: 1 } },
          { label: 'Second', action: 'second-action', data: { index: 2 } },
        ],
      };

      render(
        <CoachingCard insight={insightWithMultipleActions} onAction={mockOnAction} />
      );
      
      await user.click(screen.getByRole('button', { name: 'First' }));
      expect(mockOnAction).toHaveBeenCalledWith('first-action', { index: 1 });

      await user.click(screen.getByRole('button', { name: 'Second' }));
      expect(mockOnAction).toHaveBeenCalledWith('second-action', { index: 2 });
    });
  });
});
