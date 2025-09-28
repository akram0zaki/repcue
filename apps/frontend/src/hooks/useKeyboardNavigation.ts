import { useEffect, useCallback } from 'react';

export interface KeyboardNavigationOptions {
  /** Enable arrow key navigation between focusable elements */
  enableArrowKeyNavigation?: boolean;
  /** Enable Escape key to close/cancel */
  enableEscapeKey?: boolean;
  /** Enable Enter/Space for activation */
  enableActivationKeys?: boolean;
  /** Custom key handlers */
  customKeyHandlers?: Record<string, (event: KeyboardEvent) => void>;
  /** Selector for focusable elements */
  focusableSelector?: string;
}

/**
 * Enhanced keyboard navigation hook for improved accessibility
 * Provides arrow key navigation, focus trapping, and keyboard shortcuts
 */
export const useKeyboardNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) => {
  const {
    enableArrowKeyNavigation = false,
    enableEscapeKey = false,
    enableActivationKeys = true,
    customKeyHandlers = {},
    focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  } = options;

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ).filter((el) => {
      const element = el as HTMLElement;
      return (
        !element.hasAttribute('disabled') &&
        !element.getAttribute('aria-hidden') &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      );
    }) as HTMLElement[];
  }, [containerRef, focusableSelector]);

  const focusElement = useCallback((element: HTMLElement) => {
    element.focus();
    // Add visual focus indicator for keyboard users
    element.classList.add('keyboard-focus');

    // Remove on blur
    const handleBlur = () => {
      element.classList.remove('keyboard-focus');
      element.removeEventListener('blur', handleBlur);
    };
    element.addEventListener('blur', handleBlur);
  }, []);

  const handleArrowNavigation = useCallback(
    (event: KeyboardEvent, direction: 'up' | 'down' | 'left' | 'right') => {
      if (!enableArrowKeyNavigation) return;

      const focusableElements = getFocusableElements();
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      if (currentIndex === -1) return;

      let nextIndex: number;

      switch (direction) {
        case 'up':
        case 'left':
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
          break;
        case 'down':
        case 'right':
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
          break;
        default:
          return;
      }

      event.preventDefault();
      focusElement(focusableElements[nextIndex]);
    },
    [enableArrowKeyNavigation, getFocusableElements, focusElement]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, code } = event;

      // Handle custom key handlers first
      if (customKeyHandlers[key] || customKeyHandlers[code]) {
        (customKeyHandlers[key] || customKeyHandlers[code])(event);
        return;
      }

      switch (key) {
        case 'ArrowUp':
          handleArrowNavigation(event, 'up');
          break;
        case 'ArrowDown':
          handleArrowNavigation(event, 'down');
          break;
        case 'ArrowLeft':
          handleArrowNavigation(event, 'left');
          break;
        case 'ArrowRight':
          handleArrowNavigation(event, 'right');
          break;
        case 'Escape':
          if (enableEscapeKey && customKeyHandlers.Escape) {
            customKeyHandlers.Escape(event);
          }
          break;
        case 'Enter':
        case ' ':
          if (enableActivationKeys) {
            const target = event.target as HTMLElement;
            if (target.getAttribute('role') === 'button' || target.tagName === 'BUTTON') {
              // Let the browser handle button activation
              return;
            }
            // For other interactive elements, trigger click
            if (target.click && typeof target.click === 'function') {
              event.preventDefault();
              target.click();
            }
          }
          break;
        case 'Home':
          if (enableArrowKeyNavigation) {
            event.preventDefault();
            const focusableElements = getFocusableElements();
            if (focusableElements.length > 0) {
              focusElement(focusableElements[0]);
            }
          }
          break;
        case 'End':
          if (enableArrowKeyNavigation) {
            event.preventDefault();
            const focusableElements = getFocusableElements();
            if (focusableElements.length > 0) {
              focusElement(focusableElements[focusableElements.length - 1]);
            }
          }
          break;
      }
    },
    [
      customKeyHandlers,
      handleArrowNavigation,
      enableEscapeKey,
      enableActivationKeys,
      enableArrowKeyNavigation,
      getFocusableElements,
      focusElement,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);

  // Focus trap utilities
  const trapFocus = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          focusElement(lastElement);
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          focusElement(firstElement);
        }
      }
    };

    document.addEventListener('keydown', handleTabTrap);

    // Focus first element
    focusElement(firstElement);

    return () => {
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [getFocusableElements, focusElement]);

  return {
    getFocusableElements,
    focusElement,
    trapFocus,
    // Utility to focus first element
    focusFirst: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        focusElement(elements[0]);
      }
    },
    // Utility to focus last element
    focusLast: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        focusElement(elements[elements.length - 1]);
      }
    },
  };
};