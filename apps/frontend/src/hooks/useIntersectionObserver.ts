import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Custom hook for Intersection Observer API
 * Detects when an element becomes visible in the viewport
 * 
 * @param options - IntersectionObserver configuration
 * @returns Object with ref to attach to element and visibility state
 * 
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting ? <ExpensiveComponent /> : <Placeholder />}
 *   </div>
 * );
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): {
  ref: React.RefObject<T | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const {
    threshold = 0,
    root = null,
    rootMargin = '200px', // Start loading 200px before visible
    freezeOnceVisible = false
  } = options;

  const ref = useRef<T | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const frozen = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Don't re-observe if frozen and already visible
    if (frozen.current && freezeOnceVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setEntry(entry);
        setIsIntersecting(isElementIntersecting);

        // Freeze state once visible if option enabled
        if (isElementIntersecting && freezeOnceVisible) {
          frozen.current = true;
        }
      },
      {
        threshold,
        root,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  return { ref, isIntersecting, entry };
}
