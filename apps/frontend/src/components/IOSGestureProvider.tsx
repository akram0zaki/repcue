import React, { type ReactNode } from 'react';
import { useIOSBackGesture } from '../hooks/useIOSBackGesture';

/**
 * iOS Gesture Provider
 * Provides iOS back swipe gesture functionality to child components
 * Must be used inside a Router context
 */
export const IOSGestureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Hook activates iOS back gesture when called
  useIOSBackGesture();

  return <>{children}</>;
};

export default IOSGestureProvider;
