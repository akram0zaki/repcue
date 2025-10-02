import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component automatically scrolls to the top of the page
 * whenever the route changes (navigation occurs).
 * 
 * This ensures users always start at the top of a new page,
 * preventing disorienting scroll position inheritance.
 * 
 * Usage: Place once inside Router in App.tsx
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname]); // Re-run whenever the route path changes

  return null; // This component doesn't render anything
};

export default ScrollToTop;
