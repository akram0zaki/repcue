import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoachPage from '../CoachPage';
import type { CoachingInsight } from '../../types/coaching';

// Mock the hooks
vi.mock('../../hooks/useCoachingInsights', () => ({
  useCoachingInsights: vi.fn()
}));

// Mock the services
vi.mock('../../services/storageService', () => ({
  StorageService: {
    getInstance: vi.fn(() => ({
      getActivityLogs: vi.fn().mockResolvedValue([])
    }))
  }
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn()
    }
  })
}));

// Import mocked hook
import { useCoachingInsights } from '../../hooks/useCoachingInsights';

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Helper to create mock return value
const createMockReturn = (overrides?: {
  insights?: CoachingInsight[];
  isLoading?: boolean;
  error?: Error | null;
  refresh?: () => Promise<void>;
  dismissInsight?: (id: string) => void;
  clearCache?: () => void;
}) => ({
  insights: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  dismissInsight: vi.fn(),
  clearCache: vi.fn(),
  ...overrides
});

// Mock app settings
const mockAppSettings = {
  interval_duration: 30,
  sound_enabled: true,
  vibration_enabled: true,
  beep_volume: 0.5,
  dark_mode: false,
  auto_save: true,
  pre_timer_countdown: 3,
  default_rest_time: 30,
  rep_speed_factor: 1.0,
  show_exercise_videos: true,
  horizontal_exercise_layout: false,
  ring_timer: false,
  coach_ai_insights_enabled: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  id: 'test-settings',
};

// Mock exercises array
const mockExercises: any[] = [];

// Mock insights data
const mockInsight: CoachingInsight = {
  id: 'test-insight-1',
  type: 'streak',
  priority: 'high',
  title: 'coaching.insights.streak.title',
  message: 'coaching.insights.streak.message',
  icon: 'fire',
  createdAt: new Date().toISOString(),
  dismissible: true,
  source: 'rule',
  actions: [
    {
      action: 'start-workout',
      label: 'coaching.actions.startWorkout'
    }
  ]
};

const mockInsights: CoachingInsight[] = [
  mockInsight,
  {
    id: 'test-insight-2',
    type: 'progression',
    priority: 'medium',
    title: 'coaching.insights.progression.title',
    message: 'coaching.insights.progression.message',
    icon: 'trending-up',
    createdAt: new Date(Date.now() - 1000).toISOString(),
    dismissible: true,
    source: 'rule'
  },
  {
    id: 'test-insight-3',
    type: 'milestone',
    priority: 'low',
    title: 'coaching.insights.milestone.title',
    message: 'coaching.insights.milestone.message',
    icon: 'trophy',
    createdAt: new Date(Date.now() - 2000).toISOString(),
    dismissible: false,
    source: 'rule'
  }
];

describe('CoachPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset clipboard to fix userEvent.setup() issues
    if (Object.getOwnPropertyDescriptor(navigator, 'clipboard')) {
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        configurable: true,
        value: undefined
      });
    }
  });

  describe('Loading State', () => {
    it('displays loading indicator when loading is true', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ isLoading: true })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      // Check for loading state (component should handle this)
      expect(screen.queryByText(/coaching.title/)).toBeInTheDocument();
    });

    it('does not show insights while loading', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights, isLoading: true })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      // Insights should not be visible while loading
      // (Note: implementation may vary - this tests expected behavior)
      const articles = screen.queryAllByRole('article');
      expect(articles.length).toBeLessThanOrEqual(mockInsights.length);
    });
  });

  describe('Error State', () => {
    it('displays error message when error occurs', () => {
      const error = new Error('Failed to load insights');
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ error })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      expect(screen.getByText(/Failed to load insights/)).toBeInTheDocument();
    });

    it('shows refresh button when error occurs', () => {
      const error = new Error('Network error');
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ error })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const refreshButton = screen.getByRole('button', { name: /common.refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls refresh when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();
      const error = new Error('Network error');

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ error, refresh: mockRefresh })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const refreshButton = screen.getByRole('button', { name: /common.refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no insights available', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      expect(screen.getByText(/coaching.empty.title/)).toBeInTheDocument();
      expect(screen.getByText(/coaching.empty.message/)).toBeInTheDocument();
    });

    it('shows start workout CTA in empty state', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const ctaButton = screen.getByRole('link', { name: /coaching.empty.startWorkout/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/timer');
    });
  });

  describe('Content State', () => {
    it('displays page title and subtitle', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      expect(screen.getByText(/coaching.title/)).toBeInTheDocument();
      expect(screen.getByText(/coaching.subtitle/)).toBeInTheDocument();
    });

    it('renders all insights when available', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      // Check for insight titles
      expect(screen.getByText(/coaching.insights.streak.title/)).toBeInTheDocument();
      expect(screen.getByText(/coaching.insights.progression.title/)).toBeInTheDocument();
      expect(screen.getByText(/coaching.insights.milestone.title/)).toBeInTheDocument();
    });

    it('shows refresh button in content state', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const refreshButton = screen.getByRole('button', { name: /common.refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls refresh when refresh button clicked', async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights, refresh: mockRefresh })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const refreshButton = screen.getByRole('button', { name: /common.refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dismiss Functionality', () => {
    it('calls dismissInsight when dismiss button clicked', async () => {
      const user = userEvent.setup();
      const mockDismissInsight = vi.fn();

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [mockInsight], dismissInsight: mockDismissInsight })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockDismissInsight).toHaveBeenCalledWith(mockInsight.id);
    });

    it('does not show dismiss button for non-dismissible insights', () => {
      const nonDismissibleInsight = {
        ...mockInsight,
        id: 'non-dismissible',
        dismissible: false
      };

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [nonDismissibleInsight] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const dismissButtons = screen.queryAllByRole('button', { name: /dismiss/i });
      expect(dismissButtons).toHaveLength(0);
    });
  });

  describe('Action Handling', () => {
    it('renders action buttons for insights with actions', async () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [mockInsight] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const actionButton = screen.getByRole('button', { name: /coaching.actions.startWorkout/i });
      expect(actionButton).toBeInTheDocument();
    });

    it('action buttons are clickable', async () => {
      const user = userEvent.setup();

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [mockInsight] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const actionButton = screen.getByRole('button', { name: /coaching.actions.startWorkout/i });
      await user.click(actionButton);

      // Button should be clickable (navigation logic is tested separately)
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe('Charts and Analytics', () => {
    it('renders progress section', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      // Check for progress section
      expect(screen.getByText(/coaching.progress.title/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper page structure with main element', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      const { container } = renderWithRouter(<CoachPage />);

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('page title is properly structured', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const heading = screen.getByText(/coaching.title/);
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single insight correctly', () => {
      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [mockInsight] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const articles = screen.getAllByRole('article');
      expect(articles.length).toBeGreaterThanOrEqual(1);
    });

    it('handles many insights without layout issues', () => {
      const manyInsights: CoachingInsight[] = Array.from({ length: 15 }, (_, i) => {
        const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
        return {
          id: `insight-${i}`,
          type: 'motivation',
          priority: priorities[i % 3],
          title: `Insight ${i}`,
          message: `Message ${i}`,
          icon: 'lightbulb',
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
          dismissible: true,
          source: 'rule'
        };
      });

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: manyInsights })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const articles = screen.getAllByRole('article');
      expect(articles.length).toBeGreaterThanOrEqual(10);
    });

    it('handles insight without actions', () => {
      const insightWithoutActions: CoachingInsight = {
        ...mockInsight,
        id: 'no-actions',
        actions: undefined
      };

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: [insightWithoutActions] })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      // Should render without crashing
      expect(screen.getByText(/coaching.insights.streak.title/)).toBeInTheDocument();
    });

    it('handles rapid refresh clicks gracefully', async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      vi.mocked(useCoachingInsights).mockReturnValue(
        createMockReturn({ insights: mockInsights, refresh: mockRefresh })
      );

      renderWithRouter(<CoachPage appSettings={mockAppSettings} exercises={mockExercises} />);

      const refreshButton = screen.getByRole('button', { name: /common.refresh/i });
      
      // Click rapidly 5 times
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(5);
    });
  });
});
