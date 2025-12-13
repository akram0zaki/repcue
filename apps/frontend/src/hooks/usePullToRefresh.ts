/**
 * usePullToRefresh Hook
 * 
 * Implements native iOS-style pull-to-refresh gesture handling.
 * Tracks touch events to detect pull-down gesture and trigger refresh.
 * 
 * @see https://developer.apple.com/design/human-interface-guidelines/refresh-content-controls
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlatform } from '../contexts/PlatformContext';

export interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance for visual feedback (default: 120) */
  maxPull?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Resistance factor - higher = harder to pull (default: 2.5) */
  resistance?: number;
}

/**
 * Get the current page scroll position.
 * On iOS, scroll happens on body/html, not on individual containers.
 */
function getPageScrollTop(): number {
  return Math.max(
    window.scrollY,
    document.documentElement.scrollTop,
    document.body.scrollTop
  );
}

export interface UsePullToRefreshResult {
  /** Current pull distance in pixels */
  pullDistance: number;
  /** Progress from 0 to 1 based on threshold */
  progress: number;
  /** Whether refresh is currently in progress */
  isRefreshing: boolean;
  /** Whether user is actively pulling */
  isPulling: boolean;
  /** Props to spread on the scrollable container */
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for implementing iOS-style pull-to-refresh
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
  resistance = 2.5,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const { isIOS, isNative } = usePlatform();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isScrolledToTop = useRef(true);
  const isActive = useRef(false);

  // Only enable on iOS native app
  const isEnabled = enabled && isIOS && isNative;

  // Use window-level touch events for iOS since scroll happens at body level
  useEffect(() => {
    if (!isEnabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      
      // Check if scrolled to top - use page scroll position for iOS
      const scrollTop = getPageScrollTop();
      isScrolledToTop.current = scrollTop <= 5; // Small threshold for bounce
      
      if (!isScrolledToTop.current) return;
      
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      isActive.current = true;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || !isActive.current) return;
      
      // Re-check scroll position using page scroll
      const scrollTop = getPageScrollTop();
      if (scrollTop > 5) {
        isScrolledToTop.current = false;
        isActive.current = false;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }
      
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0) {
        // Apply rubber-band resistance effect
        const resistedDiff = Math.min(diff / resistance, maxPull);
        setPullDistance(resistedDiff);
        
        // Prevent default scroll when pulling down
        if (resistedDiff > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (isRefreshing || !isActive.current) return;
      
      isActive.current = false;
      setIsPulling(false);
      
      // Get current pull distance from state via closure
      const currentPullDistance = currentY.current - startY.current;
      const resistedPull = Math.min(currentPullDistance / resistance, maxPull);
      
      if (resistedPull >= threshold) {
        // Trigger refresh
        setIsRefreshing(true);
        setPullDistance(threshold); // Hold at threshold during refresh
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Animate back to 0
        setPullDistance(0);
      }
    };

    // Add passive: false to allow preventDefault
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isEnabled, isRefreshing, onRefresh, threshold, maxPull, resistance]);

  // Reset state if disabled
  useEffect(() => {
    if (!isEnabled) {
      setPullDistance(0);
      setIsPulling(false);
      setIsRefreshing(false);
      isActive.current = false;
    }
  }, [isEnabled]);

  const progress = Math.min(pullDistance / threshold, 1);

  // Keep containerProps for backwards compatibility but they won't be the primary handlers
  const handleTouchStartReact = useCallback((_e: React.TouchEvent) => {
    // No-op - handled by window event listeners
  }, []);

  const handleTouchMoveReact = useCallback((_e: React.TouchEvent) => {
    // No-op - handled by window event listeners
  }, []);

  const handleTouchEndReact = useCallback(() => {
    // No-op - handled by window event listeners
  }, []);

  return {
    pullDistance,
    progress,
    isRefreshing,
    isPulling,
    containerProps: {
      onTouchStart: handleTouchStartReact,
      onTouchMove: handleTouchMoveReact,
      onTouchEnd: handleTouchEndReact,
    },
    containerRef,
  };
}

export default usePullToRefresh;
