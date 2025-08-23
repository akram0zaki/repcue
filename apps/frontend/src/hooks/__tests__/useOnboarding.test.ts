import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useOnboarding from '../useOnboarding';

// Mock the platform detection hook
vi.mock('../../utils/platformDetection', () => ({
  usePlatform: vi.fn(() => ({
    isDesktop: false,
    isStandalone: false,
    isIOS: false,
    isAndroid: true
  }))
}));

import { usePlatform } from '../../utils/platformDetection';

describe('useOnboarding', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };

  beforeEach(() => {
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Default localStorage behavior
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state for new users', () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isFirstTime).toBe(true);
      expect(result.current.isOnboardingActive).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.totalSteps).toBe(3);
      expect(result.current.hasCompletedOnboarding).toBe(false);
      expect(result.current.isSkipped).toBe(false);
      expect(result.current.steps).toHaveLength(3);
    });

    it('should load persisted state from localStorage', () => {
      const storedState = {
        isFirstTime: false,
        isOnboardingActive: false,
        currentStep: 0,
        totalSteps: 3,
        hasCompletedOnboarding: true,
        isSkipped: false,
        completedAt: '2025-01-01T00:00:00.000Z'
      };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'repcue-onboarding-state') return JSON.stringify(storedState);
        if (key === 'repcue-first-launch') return '2025-01-01T00:00:00.000Z';
        return null;
      });

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isFirstTime).toBe(false);
      expect(result.current.hasCompletedOnboarding).toBe(true);
      expect(result.current.completedAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    });

    it('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isFirstTime).toBe(true);
      expect(result.current.isOnboardingActive).toBe(false);
    });
  });

  describe('Platform-Specific Content', () => {
    it('should generate desktop-specific content', () => {
      (usePlatform as any).mockReturnValue({
        isDesktop: true,
        isStandalone: false,
        isIOS: false,
        isAndroid: false
      });

      const { result } = renderHook(() => useOnboarding());

      const featuresStep = result.current.steps.find(step => step.id === 'features');
      expect(featuresStep?.description).toContain('Set custom interval timers, track 20+ pre-loaded exercises');
    });

    it('should generate mobile-specific content', () => {
      (usePlatform as any).mockReturnValue({
        isDesktop: false,
        isStandalone: false,
        isIOS: false,
        isAndroid: true
      });

      const { result } = renderHook(() => useOnboarding());

      const featuresStep = result.current.steps.find(step => step.id === 'features');
      expect(featuresStep?.description).toContain('haptic feedback');
    });

    it('should generate standalone app welcome message', () => {
      (usePlatform as any).mockReturnValue({
        isDesktop: false,
        isStandalone: true,
        isIOS: false,
        isAndroid: true
      });

      const { result } = renderHook(() => useOnboarding());

      const welcomeStep = result.current.steps.find(step => step.id === 'welcome');
      expect(welcomeStep?.description).toContain('Thanks for installing RepCue!');
    });
  });

  describe('Computed Properties', () => {
    it('should calculate progress correctly', () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.progress).toBeCloseTo(33.33, 2); // Step 1 of 3 = 33.33%

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.progress).toBeCloseTo(66.67, 2); // Step 2 of 3 = 66.67%
    });

    it('should determine navigation capabilities correctly', () => {
      const { result } = renderHook(() => useOnboarding());

      // First step
      expect(result.current.canGoPrevious).toBe(false);
      expect(result.current.canGoNext).toBe(true);
      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(false);

      // Go to last step
      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.canGoPrevious).toBe(true);
      expect(result.current.canGoNext).toBe(false);
      expect(result.current.isFirstStep).toBe(false);
      expect(result.current.isLastStep).toBe(true);
    });

    it('should provide current step data', () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.currentStepData?.id).toBe('welcome');
      expect(result.current.currentStepData?.title).toBe('Welcome to RepCue!');
    });
  });

  describe('Navigation Actions', () => {
    it('should start onboarding correctly', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
      });

      expect(result.current.isOnboardingActive).toBe(true);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.isSkipped).toBe(false);
      expect(result.current.isFirstTime).toBe(false);
      expect(result.current.startedAt).toBeInstanceOf(Date);
    });

    it('should navigate to next step', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.nextStep(); // Go to step 1
      });

      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.previousStep(); // Go back to step 0
      });

      expect(result.current.currentStep).toBe(0);
    });

    it('should complete onboarding when on last step and calling nextStep', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.goToStep(2); // Go to last step
        result.current.nextStep(); // Should complete onboarding
      });

      expect(result.current.isOnboardingActive).toBe(false);
      expect(result.current.hasCompletedOnboarding).toBe(true);
      expect(result.current.completedAt).toBeInstanceOf(Date);
    });

    it('should go to specific step', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.goToStep(1);
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not allow invalid step indices', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.goToStep(-1); // Invalid
      });

      expect(result.current.currentStep).toBe(0);

      act(() => {
        result.current.goToStep(10); // Invalid
      });

      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('Skip and Complete Actions', () => {
    it('should skip onboarding correctly', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.skipOnboarding();
      });

      expect(result.current.isOnboardingActive).toBe(false);
      expect(result.current.isSkipped).toBe(true);
      expect(result.current.isFirstTime).toBe(false);
      expect(result.current.completedAt).toBeInstanceOf(Date);
    });

    it('should complete onboarding correctly', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.completeOnboarding();
      });

      expect(result.current.isOnboardingActive).toBe(false);
      expect(result.current.hasCompletedOnboarding).toBe(true);
      expect(result.current.isFirstTime).toBe(false);
      expect(result.current.completedAt).toBeInstanceOf(Date);
    });

    it('should reset onboarding state', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
        result.current.completeOnboarding();
        result.current.resetOnboarding();
      });

      expect(result.current.isFirstTime).toBe(true);
      expect(result.current.isOnboardingActive).toBe(false);
      expect(result.current.hasCompletedOnboarding).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('repcue-onboarding-state');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('repcue-first-launch');
    });
  });

  describe('Auto-Start Behavior', () => {
    it('should auto-start onboarding for first-time standalone users', () => {
      (usePlatform as any).mockReturnValue({
        isDesktop: false,
        isStandalone: true,
        isIOS: false,
        isAndroid: true
      });

      const { result } = renderHook(() => useOnboarding());

      // Should auto-start for first-time standalone users
      expect(result.current.isOnboardingActive).toBe(true);
      expect(result.current.startedAt).toBeInstanceOf(Date);
    });

    it('should not auto-start for non-standalone users', () => {
      (usePlatform as any).mockReturnValue({
        isDesktop: false,
        isStandalone: false,
        isIOS: false,
        isAndroid: true
      });

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isOnboardingActive).toBe(false);
    });

    it('should not auto-start if onboarding was already completed', () => {
      const storedState = {
        isFirstTime: true,
        isOnboardingActive: false,
        currentStep: 0,
        totalSteps: 3,
        hasCompletedOnboarding: true,
        isSkipped: false
      };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'repcue-onboarding-state') return JSON.stringify(storedState);
        return null;
      });

      (usePlatform as any).mockReturnValue({
        isDesktop: false,
        isStandalone: true,
        isIOS: false,
        isAndroid: true
      });

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isOnboardingActive).toBe(false);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist state changes to localStorage', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'repcue-onboarding-state',
        expect.stringContaining('"isOnboardingActive":true')
      );
    });

    it('should mark first launch completion', () => {
      const { result } = renderHook(() => useOnboarding());

      act(() => {
        result.current.startOnboarding();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'repcue-first-launch',
        expect.any(String)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const { result } = renderHook(() => useOnboarding());

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.startOnboarding();
        });
      }).not.toThrow();
    });

    it('should handle localStorage reset errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useOnboarding());

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.resetOnboarding();
        });
      }).not.toThrow();
    });
  });
});
