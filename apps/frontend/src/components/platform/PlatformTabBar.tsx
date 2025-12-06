/**
 * PlatformTabBar - Platform-aware tab bar component
 * 
 * Renders a native-looking tab bar that adapts to iOS, Android, and Web:
 * - iOS: 49px height, blur backdrop, iOS system blue accent, SF Symbol-style icons
 * - Android: 56px height, Material Design styling, ripple effects
 * - Web: Current styling with hover states
 * 
 * @see https://developer.apple.com/design/human-interface-guidelines/tab-bars
 */
import React from 'react';
import { usePlatform } from '../../contexts/PlatformContext';
import { useRTLDetection } from '../../hooks/useRTLDetection';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Icon component to render */
  icon: React.FC<{ className?: string; size?: number }>;
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Click handler */
  onClick: () => void;
  /** Optional test ID for e2e testing */
  testId?: string;
  /** Optional aria-label override */
  ariaLabel?: string;
}

export interface MoreMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.FC<{ className?: string; size?: number }>;
  /** Whether this item is active */
  isActive: boolean;
  /** Click handler */
  onClick: () => void;
  /** Test ID */
  testId?: string;
}

export interface PlatformTabBarProps {
  /** Main tab items (max 5 recommended for iOS) */
  tabs: TabItem[];
  /** Whether to show a "More" button with additional items */
  showMore?: boolean;
  /** Icon for the "More" button */
  moreIcon?: React.FC<{ className?: string; size?: number }>;
  /** Whether More menu is open */
  isMoreOpen?: boolean;
  /** Toggle More menu */
  onMoreToggle?: () => void;
  /** Items in the More menu dropdown */
  moreItems?: MoreMenuItem[];
  /** Ref for More menu container (for click outside handling) */
  moreMenuRef?: React.RefObject<HTMLDivElement | null>;
  /** Aria label for More button */
  moreLabel?: string;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * Platform-aware tab bar component that follows native design guidelines.
 */
const PlatformTabBar: React.FC<PlatformTabBarProps> = ({
  tabs,
  showMore = false,
  moreIcon: MoreIconComponent,
  isMoreOpen = false,
  onMoreToggle,
  moreItems = [],
  moreMenuRef,
  moreLabel = 'More options',
  className = '',
}) => {
  const { isIOS, isAndroid } = usePlatform();
  const { isRTL } = useRTLDetection();

  // Determine icon size based on platform
  const getIconSize = () => {
    if (isIOS) return 22; // iOS uses smaller, more refined icons
    if (isAndroid) return 24; // Material icons are 24dp
    return 24; // Web default
  };

  // Platform-specific container classes
  const getContainerClasses = () => {
    // Use z-[100] to ensure tab bar stays above all page content including parallax panels
    const baseClasses = 'fixed bottom-0 left-0 right-0 z-[100]';
    
    if (isIOS) {
      return `${baseClasses} platform-tabbar platform-tabbar--ios`;
    }
    
    if (isAndroid) {
      return `${baseClasses} platform-tabbar platform-tabbar--android`;
    }
    
    // Web fallback - maintains existing styling
    return `${baseClasses} bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`;
  };

  // Platform-specific tab item classes
  const getTabItemClasses = (isActive: boolean) => {
    const baseClasses = 'flex flex-col items-center justify-center transition-colors min-w-0';
    
    if (isIOS) {
      return `${baseClasses} platform-tabbar__item platform-tabbar__item--ios ${
        isActive ? 'platform-tabbar__item--active' : ''
      }`;
    }
    
    if (isAndroid) {
      return `${baseClasses} platform-tabbar__item platform-tabbar__item--android ${
        isActive ? 'platform-tabbar__item--active' : ''
      }`;
    }
    
    // Web styling
    return `${baseClasses} nav-item rounded-lg touch-target ${
      isActive
        ? 'nav-item-active'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    }`;
  };

  // Platform-specific More button classes
  const getMoreButtonClasses = (isActive: boolean) => {
    const baseClasses = 'flex items-center justify-center transition-colors';
    
    if (isIOS) {
      return `${baseClasses} platform-tabbar__more platform-tabbar__more--ios ${
        isActive ? 'platform-tabbar__item--active' : ''
      }`;
    }
    
    if (isAndroid) {
      return `${baseClasses} platform-tabbar__more platform-tabbar__more--android ${
        isActive ? 'platform-tabbar__item--active' : ''
      }`;
    }
    
    return `${baseClasses} nav-more-button rounded-lg ${
      isActive
        ? 'nav-item-active'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    }`;
  };

  const iconSize = getIconSize();
  const isAnyMoreItemActive = moreItems.some(item => item.isActive);

  return (
    <nav className={`${getContainerClasses()} ${className}`}>
      <div className={`platform-tabbar__container ${isIOS ? 'platform-tabbar__container--ios' : ''} ${isAndroid ? 'platform-tabbar__container--android' : 'nav-container'} flex items-center max-w-md mx-auto`}>
        {/* Main tab items */}
        <div className="flex justify-between items-center flex-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={getTabItemClasses(tab.isActive)}
                aria-label={tab.ariaLabel || tab.label}
                aria-current={tab.isActive ? 'page' : undefined}
                data-testid={tab.testId}
              >
                <IconComponent 
                  className={isIOS ? 'platform-tabbar__icon' : 'mb-1'} 
                  size={iconSize} 
                />
                <span className={`${isIOS ? 'platform-tabbar__label' : 'text-xs font-medium'} text-center leading-tight`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Separator (web only) */}
        {showMore && !isIOS && !isAndroid && (
          <div className="nav-separator w-px h-5 bg-gray-300 dark:bg-gray-500" />
        )}

        {/* More button */}
        {showMore && MoreIconComponent && onMoreToggle && (
          <div className="relative flex-shrink-0" ref={moreMenuRef}>
            <button
              onClick={onMoreToggle}
              className={getMoreButtonClasses(isAnyMoreItemActive)}
              aria-label={moreLabel}
              aria-expanded={isMoreOpen}
              aria-haspopup="true"
              data-testid="nav-more"
            >
              <MoreIconComponent size={isIOS ? 24 : 26} />
            </button>

            {/* Dropdown menu */}
            {isMoreOpen && moreItems.length > 0 && (
              <div
                className={`absolute bottom-full mb-2 ${
                  isIOS 
                    ? 'platform-tabbar__dropdown platform-tabbar__dropdown--ios' 
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg nav-dropdown'
                } ${isRTL ? 'nav-dropdown-rtl' : 'nav-dropdown-ltr'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {moreItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`${
                        isIOS 
                          ? 'platform-tabbar__dropdown-item platform-tabbar__dropdown-item--ios' 
                          : 'nav-dropdown-item w-full px-4 py-3 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg'
                      } ${isRTL ? 'flex-row-reverse justify-end' : ''} ${
                        item.isActive ? (isIOS ? 'platform-tabbar__dropdown-item--active' : 'nav-item-active') : ''
                      }`}
                      data-testid={item.testId}
                    >
                      <ItemIcon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Safe area padding */}
      <div className="pb-safe" />
    </nav>
  );
};

export default PlatformTabBar;
