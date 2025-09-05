import { useState, useEffect } from 'react';
import { featureFlagService } from '../services/featureFlagService';
import { useAuth } from './useAuth';

interface FeatureFlags {
  canCreateExercises: boolean;
  canCreateWorkouts: boolean;
  canShareExercises: boolean;
  canShareWorkouts: boolean;
  canRateContent: boolean;
  canUploadVideos: boolean;
}

/**
 * Hook to check feature flags and provide UI guards
 * Automatically loads flags and updates when auth state changes
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>({
    canCreateExercises: false,
    canCreateWorkouts: false,
    canShareExercises: false,
    canShareWorkouts: false,
    canRateContent: false,
    canUploadVideos: false,
  });
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadFlags = async () => {
      try {
        setLoading(true);
        
        // Load flags from service
        await featureFlagService.loadFlags();
        
        // Get current flags state
        const flagsState = await featureFlagService.checkFlags([
          'user_created_exercises',
          'user_created_workouts', 
          'exercise_sharing',
          'workout_sharing',
          'exercise_rating',
          'custom_video_upload'
        ]);
        
        setFlags({
          canCreateExercises: flagsState.user_created_exercises || false,
          canCreateWorkouts: flagsState.user_created_workouts || false,
          canShareExercises: flagsState.exercise_sharing || false,
          canShareWorkouts: flagsState.workout_sharing || false,
          canRateContent: flagsState.exercise_rating || false,
          canUploadVideos: flagsState.custom_video_upload || false,
        });
      } catch (error) {
        console.error('Failed to load feature flags:', error);
        // Keep all flags false on error (fail safe)
      } finally {
        setLoading(false);
      }
    };
    
    loadFlags();
  }, [user]); // Reload when user authentication changes
  
  return { flags, loading };
}

/**
 * Component guard for feature-gated content
 */
interface FeatureGuardProps {
  feature: keyof FeatureFlags;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGuard({ feature, fallback = null, children }: FeatureGuardProps) {
  const { flags, loading } = useFeatureFlags();
  
  if (loading) {
    return null; // or loading spinner
  }
  
  if (!flags[feature]) {
    return fallback as React.ReactElement;
  }
  
  return children as React.ReactElement;
}

/**
 * Hook for checking individual features
 */
export function useFeatureFlag(flagName: keyof FeatureFlags): [boolean, boolean] {
  const { flags, loading } = useFeatureFlags();
  return [flags[flagName], loading];
}