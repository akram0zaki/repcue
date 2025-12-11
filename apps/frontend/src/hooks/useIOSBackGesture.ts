/**
 * iOS Back Gesture Hook
 * 
 * Implements swipe-to-go-back gesture for iOS apps.
 * Detects swipes from the left edge of the screen and triggers navigation back.
 * 
 * Only activates in iOS PWA/native environments (respects browser history).
 * Does not interfere with normal browser back button or browser swipe.
 * 
 * Usage:
 * useIOSBackGesture();
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Detects and handles iOS-style back gesture (swipe from left edge)
 */
export const useIOSBackGesture = (): void => {
  const navigate = useNavigate();
  const touchStateRef = useRef<TouchState | null>(null);
  const isProcessingRef = useRef(false);

  // Configuration for gesture detection
  const EDGE_THRESHOLD = 50; // pixels from left edge to trigger detection
  const MIN_SWIPE_DISTANCE = 100; // minimum horizontal swipe distance in pixels
  const MAX_VERTICAL_MOVEMENT = 50; // max vertical movement to be considered a horizontal swipe
  const MIN_SWIPE_VELOCITY = 300; // minimum pixels per second
  const GESTURE_TIMEOUT = 300; // max duration in milliseconds

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start tracking if touch starts near left edge
      const touch = e.touches[0];
      if (touch.clientX > EDGE_THRESHOLD) {
        return;
      }

      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };

      logger.log('[iOS Back Gesture] Touch started at left edge', {
        x: touch.clientX,
        y: touch.clientY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Ignore if no touch start recorded
      if (!touchStateRef.current || isProcessingRef.current) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStateRef.current.startX;
      const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
      const deltaTime = Date.now() - touchStateRef.current.startTime;

      // Abort if touch moved too much vertically (not a horizontal swipe)
      if (deltaY > MAX_VERTICAL_MOVEMENT) {
        touchStateRef.current = null;
        return;
      }

      // Abort if gesture takes too long
      if (deltaTime > GESTURE_TIMEOUT) {
        touchStateRef.current = null;
        return;
      }

      // Check if we've swiped far enough to the right
      if (deltaX >= MIN_SWIPE_DISTANCE) {
        const velocity = deltaX / (deltaTime / 1000); // pixels per second

        // Only trigger if velocity is sufficient
        if (velocity >= MIN_SWIPE_VELOCITY) {
          logger.log('[iOS Back Gesture] Back gesture detected', {
            distance: deltaX,
            velocity: Math.round(velocity),
            duration: deltaTime,
          });

          isProcessingRef.current = true;

          // Navigate back
          navigate(-1);

          // Reset flag after a brief delay to prevent duplicate triggers
          setTimeout(() => {
            isProcessingRef.current = false;
            touchStateRef.current = null;
          }, 300);

          return;
        }
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current = null;
    };

    // Attach event listeners
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    document.addEventListener('touchend', handleTouchEnd, false);

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);
};

export default useIOSBackGesture;
