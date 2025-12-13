/**
 * @file PlatformTabBar.test.tsx
 * @description Unit tests for the PlatformTabBar component
 * 
 * Tests verify:
 * - Platform-specific styling (iOS, Android, Web)
 * - Tab rendering and click handling
 * - More menu functionality
 * - Accessibility attributes
 * - RTL support
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlatformTabBar, { TabItem, MoreMenuItem } from '../PlatformTabBar';
import { PlatformProvider } from '../../../contexts/PlatformContext';

// Mock nativeCapabilities (same pattern as PlatformSpinner tests)
vi.mock('../../../utils/nativeCapabilities', () => ({
  isNativePlatform: vi.fn(() => false),
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
  isWeb: vi.fn(() => true),
  getPlatform: vi.fn(() => 'web'),
}));

// Mock RTL detection hook
vi.mock('../../../hooks/useRTLDetection', () => ({
  useRTLDetection: () => ({ isRTL: false }),
}));

import * as nativeCapabilities from '../../../utils/nativeCapabilities';

// Mock icons
const MockHomeIcon: React.FC<{ className?: string; size?: number }> = ({ className, size }) => (
  <svg data-testid="home-icon" className={className} width={size} height={size}>
    <circle />
  </svg>
);

const MockSettingsIcon: React.FC<{ className?: string; size?: number }> = ({ className, size }) => (
  <svg data-testid="settings-icon" className={className} width={size} height={size}>
    <rect />
  </svg>
);

const MockMoreIcon: React.FC<{ className?: string; size?: number }> = ({ className, size }) => (
  <svg data-testid="more-icon" className={className} width={size} height={size}>
    <path />
  </svg>
);

// Wrapper component for PlatformProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PlatformProvider>{children}</PlatformProvider>
);

// Custom render that includes PlatformProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Sample tabs for testing
const createMockTabs = (onClickMock: ReturnType<typeof vi.fn>): TabItem[] => [
  {
    id: 'home',
    label: 'Home',
    icon: MockHomeIcon,
    isActive: true,
    onClick: onClickMock,
    testId: 'tab-home',
    ariaLabel: 'Navigate to Home',
  },
  {
    id: 'exercises',
    label: 'Exercises',
    icon: MockHomeIcon,
    isActive: false,
    onClick: onClickMock,
    testId: 'tab-exercises',
    ariaLabel: 'Navigate to Exercises',
  },
  {
    id: 'timer',
    label: 'Timer',
    icon: MockHomeIcon,
    isActive: false,
    onClick: onClickMock,
    testId: 'tab-timer',
    ariaLabel: 'Navigate to Timer',
  },
];

const createMockMoreItems = (onClickMock: ReturnType<typeof vi.fn>): MoreMenuItem[] => [
  {
    id: 'settings',
    label: 'Settings',
    icon: MockSettingsIcon,
    isActive: false,
    onClick: onClickMock,
    testId: 'more-settings',
  },
];

describe('PlatformTabBar', () => {
  let mockTabClick: ReturnType<typeof vi.fn>;
  let mockMoreToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTabClick = vi.fn();
    mockMoreToggle = vi.fn();
    vi.clearAllMocks();
    // Default to web platform
    vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isIOS).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(false);
  });

  describe('Rendering', () => {
    it('should render all tab items', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(screen.getByTestId('tab-home')).toBeInTheDocument();
      expect(screen.getByTestId('tab-exercises')).toBeInTheDocument();
      expect(screen.getByTestId('tab-timer')).toBeInTheDocument();
    });

    it('should display tab labels', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Exercises')).toBeInTheDocument();
      expect(screen.getByText('Timer')).toBeInTheDocument();
    });

    it('should render tab icons', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      const icons = screen.getAllByTestId('home-icon');
      expect(icons.length).toBe(3);
    });

    it('should render the More button when showMore is true', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          onMoreToggle={mockMoreToggle}
        />
      );

      expect(screen.getByTestId('nav-more')).toBeInTheDocument();
    });

    it('should not render the More button when showMore is false', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} showMore={false} />);

      expect(screen.queryByTestId('nav-more')).not.toBeInTheDocument();
    });

    it('should apply custom className to container', () => {
      const tabs = createMockTabs(mockTabClick);
      
      const { container } = renderWithProvider(
        <PlatformTabBar tabs={tabs} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when a tab is clicked', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      fireEvent.click(screen.getByTestId('tab-exercises'));
      expect(mockTabClick).toHaveBeenCalledTimes(1);
    });

    it('should call onMoreToggle when More button is clicked', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          onMoreToggle={mockMoreToggle}
        />
      );

      fireEvent.click(screen.getByTestId('nav-more'));
      expect(mockMoreToggle).toHaveBeenCalledTimes(1);
    });

    it('should show dropdown when isMoreOpen is true', () => {
      const tabs = createMockTabs(mockTabClick);
      const moreItems = createMockMoreItems(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          isMoreOpen={true}
          onMoreToggle={mockMoreToggle}
          moreItems={moreItems}
        />
      );

      expect(screen.getByTestId('more-settings')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should not show dropdown when isMoreOpen is false', () => {
      const tabs = createMockTabs(mockTabClick);
      const moreItems = createMockMoreItems(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          isMoreOpen={false}
          onMoreToggle={mockMoreToggle}
          moreItems={moreItems}
        />
      );

      expect(screen.queryByTestId('more-settings')).not.toBeInTheDocument();
    });

    it('should call onClick when a dropdown item is clicked', () => {
      const tabs = createMockTabs(mockTabClick);
      const moreItems = createMockMoreItems(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          isMoreOpen={true}
          onMoreToggle={mockMoreToggle}
          moreItems={moreItems}
        />
      );

      fireEvent.click(screen.getByTestId('more-settings'));
      expect(mockTabClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label on tabs', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(screen.getByTestId('tab-home')).toHaveAttribute('aria-label', 'Navigate to Home');
    });

    it('should mark active tab with aria-current', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(screen.getByTestId('tab-home')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('tab-exercises')).not.toHaveAttribute('aria-current');
    });

    it('should have aria-expanded on More button', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          isMoreOpen={false}
          onMoreToggle={mockMoreToggle}
        />
      );

      expect(screen.getByTestId('nav-more')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-haspopup on More button', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          onMoreToggle={mockMoreToggle}
        />
      );

      expect(screen.getByTestId('nav-more')).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have correct aria-label on More button', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          onMoreToggle={mockMoreToggle}
          moreLabel="More options"
        />
      );

      expect(screen.getByTestId('nav-more')).toHaveAttribute('aria-label', 'More options');
    });
  });

  describe('Active States', () => {
    it('should apply active styles to active tab', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      const homeTab = screen.getByTestId('tab-home');
      // Web styling uses nav-item-active class
      expect(homeTab.className).toContain('nav-item-active');
    });

    it('should not apply active styles to inactive tabs', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      const exercisesTab = screen.getByTestId('tab-exercises');
      expect(exercisesTab.className).not.toContain('nav-item-active');
      expect(exercisesTab.className).not.toContain('platform-tabbar__item--active');
    });

    it('should indicate when a more menu item is active', () => {
      const tabs = createMockTabs(mockTabClick);
      const moreItems: MoreMenuItem[] = [
        {
          id: 'settings',
          label: 'Settings',
          icon: MockSettingsIcon,
          isActive: true, // Active
          onClick: mockTabClick,
          testId: 'more-settings',
        },
      ];
      
      renderWithProvider(
        <PlatformTabBar
          tabs={tabs}
          showMore={true}
          moreIcon={MockMoreIcon}
          isMoreOpen={true}
          onMoreToggle={mockMoreToggle}
          moreItems={moreItems}
        />
      );

      const settingsItem = screen.getByTestId('more-settings');
      expect(settingsItem.className).toContain('nav-item-active');
    });
  });

  describe('Safe Area', () => {
    it('should include safe area padding element', () => {
      const tabs = createMockTabs(mockTabClick);
      
      const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(container.querySelector('.pb-safe')).toBeInTheDocument();
    });
  });

  describe('Role and Semantics', () => {
    it('should be a navigation element', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render tabs as buttons', () => {
      const tabs = createMockTabs(mockTabClick);
      
      renderWithProvider(<PlatformTabBar tabs={tabs} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3); // At least 3 tab buttons
    });
  });
});

describe('PlatformTabBar CSS Classes', () => {
  let mockTabClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTabClick = vi.fn();
    vi.clearAllMocks();
    // Default to web platform
    vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isIOS).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(false);
  });

  it('should apply web styling classes by default', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

    // Web styling includes nav-container class
    expect(container.querySelector('.nav-container')).toBeInTheDocument();
  });

  it('should have z-50 for proper layering', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('z-50');
  });

  it('should have fixed bottom positioning', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('fixed');
    expect(nav?.className).toContain('bottom-0');
  });
});

describe('PlatformTabBar iOS Platform', () => {
  let mockTabClick: ReturnType<typeof vi.fn>;
  let mockMoreToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTabClick = vi.fn();
    mockMoreToggle = vi.fn();
    vi.clearAllMocks();
    // Simulate iOS platform
    vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
    vi.mocked(nativeCapabilities.isIOS).mockReturnValue(true);
    vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(false);
  });

  it('should apply iOS-specific container classes', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('platform-tabbar--ios');
  });

  it('should apply iOS-specific tab item classes', () => {
    const tabs = createMockTabs(mockTabClick);
    
    renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const homeTab = screen.getByTestId('tab-home');
    expect(homeTab.className).toContain('platform-tabbar__item--ios');
  });

  it('should apply iOS active class to active tab', () => {
    const tabs = createMockTabs(mockTabClick);
    
    renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const homeTab = screen.getByTestId('tab-home');
    expect(homeTab.className).toContain('platform-tabbar__item--active');
  });

  it('should hide separator on iOS', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(
      <PlatformTabBar 
        tabs={tabs} 
        showMore={true}
        moreIcon={MockMoreIcon}
        onMoreToggle={mockMoreToggle}
      />
    );

    // iOS should not have the nav-separator
    expect(container.querySelector('.nav-separator')).not.toBeInTheDocument();
  });

  it('should apply iOS dropdown styling when open', () => {
    const tabs = createMockTabs(mockTabClick);
    const moreItems = createMockMoreItems(mockTabClick);
    
    const { container } = renderWithProvider(
      <PlatformTabBar
        tabs={tabs}
        showMore={true}
        moreIcon={MockMoreIcon}
        isMoreOpen={true}
        onMoreToggle={mockMoreToggle}
        moreItems={moreItems}
      />
    );

    expect(container.querySelector('.platform-tabbar__dropdown--ios')).toBeInTheDocument();
  });
});

describe('PlatformTabBar Android Platform', () => {
  let mockTabClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTabClick = vi.fn();
    vi.clearAllMocks();
    // Simulate Android platform
    vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
    vi.mocked(nativeCapabilities.isIOS).mockReturnValue(false);
    vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(true);
  });

  it('should apply Android-specific container classes', () => {
    const tabs = createMockTabs(mockTabClick);
    
    const { container } = renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('platform-tabbar--android');
  });

  it('should apply Android-specific tab item classes', () => {
    const tabs = createMockTabs(mockTabClick);
    
    renderWithProvider(<PlatformTabBar tabs={tabs} />);

    const homeTab = screen.getByTestId('tab-home');
    expect(homeTab.className).toContain('platform-tabbar__item--android');
  });
});
