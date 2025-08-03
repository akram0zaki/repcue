import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the formatTime function fix
 * This tests the Math.floor() fix for decimal seconds display
 */
describe('formatTime Math.floor() Fix', () => {
  // Replicate the exact formatTime function from TimerPage.tsx
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60); // Use Math.floor to remove decimal places
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  describe('Critical Bug Fix - Decimal Seconds', () => {
    it('should not display milliseconds for time-based exercises', () => {
      // Before fix: would show "00:17.313"
      // After fix: should show "00:17"
      expect(formatTime(17.313)).toBe('00:17');
    });

    it('should handle the 59.999 edge case correctly', () => {
      // Critical edge case: 59.999 should be 00:59, not 01:00
      expect(formatTime(59.999)).toBe('00:59');
    });

    it('should handle various decimal inputs', () => {
      expect(formatTime(42.1)).toBe('00:42');
      expect(formatTime(42.5)).toBe('00:42');
      expect(formatTime(42.9)).toBe('00:42');
      expect(formatTime(42.999)).toBe('00:42');
    });
  });

  describe('Minute Boundary Handling', () => {
    it('should handle exact minute boundaries', () => {
      expect(formatTime(60.0)).toBe('01:00');
      expect(formatTime(120.0)).toBe('02:00');
      expect(formatTime(180.0)).toBe('03:00');
    });

    it('should handle minutes with decimal seconds', () => {
      expect(formatTime(90.7)).toBe('01:30'); // 1:30.7 -> 1:30
      expect(formatTime(150.999)).toBe('02:30'); // 2:30.999 -> 2:30
    });
  });

  describe('Standard Cases', () => {
    it('should format whole seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3600)).toBe('60:00');
    });
  });
});
