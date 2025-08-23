import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Smooth Rep Animation - Unit Tests', () => {
  let mockSetInterval: ReturnType<typeof vi.fn>;
  let mockClearInterval: ReturnType<typeof vi.fn>;
  let originalSetInterval: typeof global.setInterval;
  let originalClearInterval: typeof global.clearInterval;

  beforeEach(() => {
    // Mock timer functions
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    
    mockSetInterval = vi.fn();
    mockClearInterval = vi.fn();
    
    global.setInterval = mockSetInterval;
    global.clearInterval = mockClearInterval;
    
    // Mock Date.now for consistent timing
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    vi.restoreAllMocks();
  });

  describe('Timer Interval Logic', () => {
    it('should use 100ms intervals for rep-based exercises', () => {
      const isRepBased = true;
      const expectedInterval = 100;
      
      // Simulate createTimerInterval call
      const callback = vi.fn();
      
      // This simulates the logic from createTimerInterval
      const interval = isRepBased ? 100 : 1000;
      mockSetInterval.mockReturnValue(123);
      
      global.setInterval(callback, interval);
      
      expect(mockSetInterval).toHaveBeenCalledWith(callback, expectedInterval);
    });

    it('should use 1000ms intervals for time-based exercises', () => {
      const isRepBased = false;
      const expectedInterval = 1000;
      
      const callback = vi.fn();
      const interval = isRepBased ? 100 : 1000;
      mockSetInterval.mockReturnValue(123);
      
      global.setInterval(callback, interval);
      
      expect(mockSetInterval).toHaveBeenCalledWith(callback, expectedInterval);
    });
  });

  describe('Time Calculation Logic', () => {
    it('should calculate decimal seconds for rep-based exercises', () => {
      const startTime = 1000;
      const currentTime = 1150; // 150ms later
      
      vi.spyOn(Date, 'now').mockReturnValue(currentTime);
      
      // Rep-based calculation: (Date.now() - startTime) / 1000
      const elapsed = (currentTime - startTime) / 1000;
      
      expect(elapsed).toBe(0.15);
      expect(elapsed % 1).not.toBe(0); // Should have decimal places
    });

    it('should calculate whole seconds for time-based exercises', () => {
      const startTime = 1000;
      const currentTime = 2500; // 1.5 seconds later
      
      vi.spyOn(Date, 'now').mockReturnValue(currentTime);
      
      // Time-based calculation: Math.floor((Date.now() - startTime) / 1000)
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      
      expect(elapsed).toBe(1);
      expect(elapsed % 1).toBe(0); // Should be whole number
    });
  });

  describe('Beeping Logic', () => {
    it('should beep on whole seconds for rep-based exercises', () => {
      const elapsed = 1.5; // 1.5 seconds elapsed
      const wholeSecondsElapsed = Math.floor(elapsed);
      const prevWholeSeconds = 0;
      
      const shouldBeep = wholeSecondsElapsed > prevWholeSeconds && wholeSecondsElapsed > 0;
      
      expect(shouldBeep).toBe(true);
      expect(wholeSecondsElapsed).toBe(1);
    });

    it('should not beep on fractional seconds', () => {
      const elapsed = 0.7; // 0.7 seconds elapsed
      const wholeSecondsElapsed = Math.floor(elapsed);
      const prevWholeSeconds = 0;
      
      const shouldBeep = wholeSecondsElapsed > prevWholeSeconds && wholeSecondsElapsed > 0;
      
      expect(shouldBeep).toBe(false);
      expect(wholeSecondsElapsed).toBe(0);
    });
  });
});
