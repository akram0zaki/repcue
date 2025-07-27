import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlatform } from '../utils/platformDetection';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useOnboarding } from '../hooks/useOnboarding';
import Navigation from './Navigation';
import InstallPrompt from './InstallPrompt';
import OnboardingFlow from './OnboardingFlow';
import OfflineBanner from './OfflineBanner';

interface AppShellProps {
  children: React.ReactNode;
}

interface PageConfig {
  title: string;
  hasBackButton?: boolean;
  hideNavigation?: boolean;
  className?: string;
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  '/': {
    title: 'RepCue - Exercise Timer',
    className: 'pb-20', // Space for bottom navigation
  },
  '/exercises': {
    title: 'Exercises',
    className: 'pb-20',
  },
  '/exercise': {
    title: 'Exercise Details',
    hasBackButton: true,
    className: 'pb-20',
  },
  '/timer': {
    title: 'Timer',
    hideNavigation: false, // Show navigation on timer page
    className: 'pb-20', // Keep space for navigation
  },
  '/activity-log': {
    title: 'Activity Log',
    className: 'pb-20',
  },
  '/settings': {
    title: 'Settings',
    className: 'pb-20',
  },
};

/**
 * AppShell provides the persistent UI structure for the PWA including:
 * - Platform-aware header with install prompts
 * - Navigation landmarks for accessibility
 * - Route-specific configurations
 * - PWA onboarding integration
 * - Skeleton loading states
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const platform = usePlatform();
  const installPrompt = useInstallPrompt();
  const onboarding = useOnboarding();
  
  const [currentPath, setCurrentPath] = useState(location.pathname);

  // Get current page configuration
  const getPageConfig = (): PageConfig => {
    // Check for exact matches first
    if (PAGE_CONFIGS[location.pathname]) {
      return PAGE_CONFIGS[location.pathname];
    }
    
    // Check for partial matches (e.g., /exercise/123)
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 1) {
      const basePath = `/${pathSegments[1]}`;
      if (PAGE_CONFIGS[basePath]) {
        return PAGE_CONFIGS[basePath];
      }
    }
    
    // Default configuration
    return {
      title: 'RepCue',
      className: 'pb-20',
    };
  };

  const pageConfig = getPageConfig();

  // Handle route transitions with performance optimization (disabled for now to prevent flickering)
  useEffect(() => {
    if (location.pathname !== currentPath) {
      // Update document title for better UX (keep this)
      document.title = pageConfig.title;
      setCurrentPath(location.pathname);
      // Removed transition animation to prevent flickering
    }
  }, [location.pathname, currentPath, pageConfig.title]);

  // Main content styles with platform considerations
  const getMainStyles = (): string => {
    let baseStyles = `min-h-screen ${pageConfig.className || 'pb-20'}`;
    // No top padding needed since we removed the header
    return baseStyles;
  };

  // Show onboarding flow if active
  if (onboarding.isFirstTime && onboarding.isOnboardingActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <OnboardingFlow
          onComplete={onboarding.completeOnboarding}
          onSkip={onboarding.skipOnboarding}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
      >
        Skip to main content
      </a>

      {/* Network status banner */}
      <OfflineBanner />

      {/* Install prompt integration */}
      {installPrompt.canShowPrompt && !platform.isStandalone && (
        <InstallPrompt
          onDismiss={installPrompt.dismissPrompt}
        />
      )}

      {/* Main content area with navigation landmark */}
      <main 
        id="main-content"
        className={getMainStyles()}
        role="main"
        aria-label="Main content"
      >
        {/* Page content */}
        {children}
      </main>

      {/* Bottom navigation - conditional rendering */}
      {!pageConfig.hideNavigation && (
        <Navigation />
      )}
    </div>
  );
};

export default AppShell;
