import { lazy } from 'react';
import React from 'react';

// Global pre-listener to catch chunk errors even before any boundary mounts
// Stores a sticky flag so boundaries can initialize to error state if needed
const __GLOBAL__: Record<string, unknown> = (globalThis as unknown as Record<string, unknown>);
if (typeof window !== 'undefined' && !__GLOBAL__.__REPCUE_CHUNK_HANDLER__) {
  __GLOBAL__.__REPCUE_CHUNK_ERROR__ = false;
  const globalChunkHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
    // Extract message/name from both error and unhandledrejection
    const anyEvent = event as unknown as { message?: string; reason?: { message?: string; name?: string } };
    const message = (anyEvent?.message || anyEvent?.reason?.message || '').toString();
    const name = (anyEvent?.reason && typeof anyEvent.reason === 'object' && 'name' in anyEvent.reason)
      ? (anyEvent.reason as { name?: string }).name || ''
      : '';
    if (message.includes('Loading chunk') || message.includes('ChunkLoadError') || name === 'ChunkLoadError') {
      __GLOBAL__.__REPCUE_CHUNK_ERROR__ = true;
      try { window.dispatchEvent(new Event('repcue:chunk-error')); } catch {}
    }
  };
  window.addEventListener('error', globalChunkHandler as EventListener);
  window.addEventListener('unhandledrejection', globalChunkHandler as EventListener);
  __GLOBAL__.__REPCUE_CHUNK_HANDLER__ = globalChunkHandler;
}

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
  const [hasError, setHasError] = React.useState<boolean>(() => {
    // Initialize from sticky global flag to handle early errors before mount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).__REPCUE_CHUNK_ERROR__ === true;
  });

  // Re-check sticky flag on next tick in case event fired between render and effect setup
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!hasError && (globalThis as any).__REPCUE_CHUNK_ERROR__ === true) {
      setHasError(true);
    }
    if (!hasError) {
      // Short-lived polling to catch late-arriving global flag flips in sequential runs
      let cancelled = false;
      const poll = (remaining: number) => {
        if (cancelled || hasError) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((globalThis as any).__REPCUE_CHUNK_ERROR__ === true) {
          setHasError(true);
          return;
        }
        if (remaining > 0) setTimeout(() => poll(remaining - 1), 10);
      };
      poll(30);
      return () => { cancelled = true; };
    }
  }, [hasError]);

  // Use layout effect so listener is attached synchronously after mount
  React.useLayoutEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message || '';
      const isChunkError = message.includes('Loading chunk') || message.includes('ChunkLoadError');
      if (isChunkError) {
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Some bundlers surface chunk load failures via unhandledrejection
      const reason = event.reason || {};
      const message = (typeof reason === 'string' ? reason : reason.message) || '';
      const name = (typeof reason === 'object' && reason && 'name' in reason) ? (reason as { name?: string }).name || '' : '';
      if (message.includes('Loading chunk') || message.includes('ChunkLoadError') || name === 'ChunkLoadError') {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleWindowError);
    // Capture-phase listener to survive interference from other listeners
    window.addEventListener('error', handleWindowError, true);
    document.addEventListener('error', handleWindowError as EventListener, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    // Also listen for a custom event to enable deterministic testing of this UI
    const handleCustomChunkError = () => setHasError(true);
    window.addEventListener('repcue:chunk-error', handleCustomChunkError as EventListener);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('error', handleWindowError, true);
      document.removeEventListener('error', handleWindowError as EventListener, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('repcue:chunk-error', handleCustomChunkError as EventListener);
    };
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
            onClick={() => {
              try {
                window.location.reload();
              } catch {
                // no-op for jsdom
              }
            }}
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

export const WorkoutsPage = lazy(() => 
  import('../pages/WorkoutsPage').catch(() => ({
    default: () => <div>Error loading Workouts page</div>
  }))
);

export const CreateWorkoutPage = lazy(() => 
  import('../pages/CreateWorkoutPage').catch(() => ({
    default: () => <div>Error loading Create Workout page</div>
  }))
);

export const EditWorkoutPage = lazy(() => 
  import('../pages/EditWorkoutPage').catch(() => ({
    default: () => <div>Error loading Edit Workout page</div>
  }))
);

export const AuthCallbackPage = lazy(() => 
  import('../pages/AuthCallbackPage').catch(() => ({
    default: () => <div>Error loading Auth Callback page</div>
  }))
);

// Preload critical routes
// Non-component exports moved to separate util to satisfy react-refresh rule
// See: src/router/routeUtils.tsx
