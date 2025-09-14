// React import not required with automatic JSX runtime; keep file lean.

// Preload critical routes
export const preloadCriticalRoutes = (): void => {
  if (typeof window !== 'undefined') {
    const preloadTimer = () => import('../pages/TimerPage');
    const preloadHome = () => import('../pages/HomePage');

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
      <h1 className="sr-only">Loading {routeName}</h1>
      <p className="text-gray-600 dark:text-gray-400" aria-live="polite">Loading {routeName}...</p>
    </div>
  </div>
);
