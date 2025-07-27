import { lazy } from 'react';
import React from 'react';

// Loading fallback component
export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Error boundary component for chunk loading failures
export const ChunkErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Loading chunk') || event.message?.includes('ChunkLoadError')) {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Loading Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Failed to load the page. Please refresh to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Lazy loaded components with preloading
export const HomePage = lazy(() => 
  import('../pages/HomePage').catch(() => ({
    default: () => <div>Error loading Home page</div>
  }))
);

export const ExercisePage = lazy(() => 
  import('../pages/ExercisePage').catch(() => ({
    default: () => <div>Error loading Exercise page</div>
  }))
);

export const TimerPage = lazy(() => 
  import('../pages/TimerPage').catch(() => ({
    default: () => <div>Error loading Timer page</div>
  }))
);

export const ActivityLogPage = lazy(() => 
  import('../pages/ActivityLogPage').catch(() => ({
    default: () => <div>Error loading Activity Log page</div>
  }))
);

export const SettingsPage = lazy(() => 
  import('../pages/SettingsPage').catch(() => ({
    default: () => <div>Error loading Settings page</div>
  }))
);

// Preload critical routes
export const preloadCriticalRoutes = () => {
  // Preload Timer and Home pages as they are most commonly used
  if (typeof window !== 'undefined') {
    const preloadTimer = () => import('../pages/TimerPage');
    const preloadHome = () => import('../pages/HomePage');
    
    // Preload after a short delay to not interfere with initial load
    setTimeout(() => {
      preloadTimer();
      preloadHome();
    }, 2000);
  }
};

// Route-specific loading fallbacks
export const createRouteLoader = (routeName: string) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading {routeName}...</p>
    </div>
  </div>
);
