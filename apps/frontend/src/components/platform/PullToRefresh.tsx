/**
 * PullToRefresh Component
 * 
 * Wrapper component that adds iOS-style pull-to-refresh behavior to its children.
 * Only active on iOS native app, gracefully degrades on other platforms.
 * 
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => { await fetchData(); }}>
 *   <div>Your scrollable content</div>
 * </PullToRefresh>
 * ```
 */
import React from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { usePlatform } from '../../contexts/PlatformContext';
import { IOSPullToRefresh } from '../ios/IOSSpinner';

export interface PullToRefreshProps {
  /** Callback when refresh is triggered - must return a Promise */
  onRefresh: () => Promise<void>;
  /** Content to wrap */
  children: React.ReactNode;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Minimum pull distance to trigger refresh (default: 80) */
  threshold?: number;
  /** Additional CSS class for the container */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

/**
 * Pull-to-refresh wrapper component with iOS-native styling
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  enabled = true,
  threshold = 80,
  className = '',
  testId,
}) => {
  const { isIOS, isNative } = usePlatform();
  const {
    pullDistance,
    progress,
    isRefreshing,
    isPulling,
    containerProps,
    containerRef,
  } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  // Only show pull-to-refresh UI on iOS native
  const showPullUI = isIOS && isNative && enabled;
  const isActive = isPulling || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      data-testid={testId}
      {...containerProps}
    >
      {/* Pull-to-refresh indicator */}
      {showPullUI && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out"
          style={{
            top: 0,
            height: pullDistance,
            transform: `translateY(${isActive ? 0 : -pullDistance}px)`,
            zIndex: 10,
          }}
          aria-live="polite"
          aria-busy={isRefreshing}
        >
          <IOSPullToRefresh
            isRefreshing={isRefreshing}
            progress={progress}
          />
        </div>
      )}

      {/* Content wrapper - shifts down when pulling */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: showPullUI && isActive ? `translateY(${pullDistance}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
