import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '../utils/platformDetection';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon?: string;
  action?: () => void;
}

export interface OnboardingState {
  isFirstTime: boolean;
  isOnboardingActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedOnboarding: boolean;
  isSkipped: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OnboardingActions {
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  goToStep: (stepIndex: number) => void;
  resetOnboarding: () => void;
}

export interface UseOnboardingReturn extends OnboardingState, OnboardingActions {
  steps: OnboardingStep[];
  currentStepData: OnboardingStep | null;
  progress: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep: boolean;
  isFirstStep: boolean;
}

const ONBOARDING_STORAGE_KEY = 'repcue-onboarding-state';
const FIRST_LAUNCH_STORAGE_KEY = 'repcue-first-launch';

// Default onboarding steps
const createOnboardingSteps = (isDesktop: boolean, isStandalone: boolean): OnboardingStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to RepCue!',
    description: isStandalone 
      ? 'Thanks for installing RepCue! Your privacy-first fitness tracking app is ready to help you stay focused on your workouts.'
      : 'Welcome to RepCue, your privacy-first fitness tracking app. Track intervals, manage exercises, and stay focused on your workouts.'
  },
  {
    id: 'features',
    title: 'Key Features',
    description: isDesktop
      ? 'Set custom interval timers, track 20+ pre-loaded exercises, manage your workout history, and keep your data private with local storage.'
      : 'Set custom interval timers with audio cues, track your favorite exercises with haptic feedback, and sync across devices while keeping your data private.'
  },
  {
    id: 'privacy',
    title: 'Privacy First',
    description: 'Your workout data stays on your device. No tracking, no data collection, no account required. Your privacy is our priority.'
  }
];

/**
 * Custom hook for managing post-install onboarding flow
 * 
 * Features:
 * - Detects first app launch vs returning user
 * - 3-step onboarding: Welcome, Features, Privacy
 * - Skip option with progress tracking
 * - Platform-specific content adaptation
 * - LocalStorage state persistence
 * - Progress indicators and navigation controls
 * 
 * @returns OnboardingState, actions, and computed properties
 */
export function useOnboarding(): UseOnboardingReturn {
  const { isDesktop, isStandalone } = usePlatform();
  
  // Generate platform-specific steps
  const steps = createOnboardingSteps(isDesktop, isStandalone);
  
  // Initialize state from localStorage or defaults
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const firstLaunchStored = localStorage.getItem(FIRST_LAUNCH_STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
          isFirstTime: firstLaunchStored === null, // First time if no record exists
          totalSteps: steps.length
        };
      }
      
      // Default state for new users
      return {
        isFirstTime: firstLaunchStored === null,
        isOnboardingActive: false,
        currentStep: 0,
        totalSteps: steps.length,
        hasCompletedOnboarding: false,
        isSkipped: false
      };
    } catch (error) {
      console.warn('Failed to load onboarding state from localStorage:', error);
      return {
        isFirstTime: true,
        isOnboardingActive: false,
        currentStep: 0,
        totalSteps: steps.length,
        hasCompletedOnboarding: false,
        isSkipped: false
      };
    }
  });

  // Persist state to localStorage
  const persistState = useCallback((newState: OnboardingState) => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newState));
      
      // Mark that the app has been launched
      if (newState.isFirstTime === false) {
        localStorage.setItem(FIRST_LAUNCH_STORAGE_KEY, new Date().toISOString());
      }
    } catch (error) {
      console.warn('Failed to persist onboarding state to localStorage:', error);
    }
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    persistState(state);
  }, [state, persistState]);

  // Auto-start onboarding for first-time users in standalone mode
  useEffect(() => {
    if (state.isFirstTime && isStandalone && !state.hasCompletedOnboarding && !state.isSkipped) {
      setState(prev => ({
        ...prev,
        isOnboardingActive: true,
        startedAt: new Date()
      }));
    }
  }, [state.isFirstTime, isStandalone, state.hasCompletedOnboarding, state.isSkipped]);

  // Computed properties
  const currentStepData = steps[state.currentStep] || null;
  const progress = state.totalSteps > 0 ? ((state.currentStep + 1) / state.totalSteps) * 100 : 0;
  const canGoNext = state.currentStep < state.totalSteps - 1;
  const canGoPrevious = state.currentStep > 0;
  const isLastStep = state.currentStep === state.totalSteps - 1;
  const isFirstStep = state.currentStep === 0;

  // Actions
  const startOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboardingActive: true,
      currentStep: 0,
      isSkipped: false,
      startedAt: new Date(),
      isFirstTime: false
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextStepIndex = prev.currentStep + 1;
      const canMoveNext = nextStepIndex < prev.totalSteps;
      const isCurrentlyLastStep = prev.currentStep === prev.totalSteps - 1;
      
      if (canMoveNext) {
        return {
          ...prev,
          currentStep: nextStepIndex
        };
      } else if (isCurrentlyLastStep) {
        // Automatically complete onboarding on last step
        return {
          ...prev,
          isOnboardingActive: false,
          hasCompletedOnboarding: true,
          isFirstTime: false,
          completedAt: new Date()
        };
      }
      
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => {
      const canMovePrevious = prev.currentStep > 0;
      
      if (canMovePrevious) {
        return {
          ...prev,
          currentStep: prev.currentStep - 1
        };
      }
      
      return prev;
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < state.totalSteps) {
      setState(prev => ({
        ...prev,
        currentStep: stepIndex
      }));
    }
  }, [state.totalSteps]);

  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboardingActive: false,
      isSkipped: true,
      isFirstTime: false,
      completedAt: new Date()
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboardingActive: false,
      hasCompletedOnboarding: true,
      isFirstTime: false,
      completedAt: new Date()
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem(FIRST_LAUNCH_STORAGE_KEY);
      
      setState({
        isFirstTime: true,
        isOnboardingActive: false,
        currentStep: 0,
        totalSteps: steps.length,
        hasCompletedOnboarding: false,
        isSkipped: false
      });
    } catch (error) {
      console.warn('Failed to reset onboarding state:', error);
    }
  }, [steps.length]);

  return {
    // State
    ...state,
    
    // Computed properties
    steps,
    currentStepData,
    progress,
    canGoNext,
    canGoPrevious,
    isLastStep,
    isFirstStep,
    
    // Actions
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    goToStep,
    resetOnboarding
  };
}

export default useOnboarding;
