import { supabase } from '../config/supabase';
import type { FeatureFlag } from '../types';
import { authService } from './authService';

/**
 * Feature Flag Service
 * Manages feature toggles and permissions for user-created content features
 */
export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();
  private loaded: boolean = false;
  private loading: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Load feature flags from the database
   */
  public async loadFlags(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = this._loadFlags();
    await this.loading;
    this.loading = null;
  }

  private async _loadFlags(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_name');

      if (error) {
        console.error('Failed to load feature flags:', error);
        
        // Fallback: Enable user-created exercises when API fails
        // This ensures the feature works even when feature_flags table is missing
        console.log('Using fallback feature flags due to API error');
        const fallbackFlags: FeatureFlag[] = [
          {
            id: 'fallback-1',
            flag_name: 'user_created_exercises',
            is_enabled: true,
            description: 'Allow users to create custom exercises (fallback)',
            target_audience: 'all',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'fallback-2', 
            flag_name: 'user_created_workouts',
            is_enabled: false,
            description: 'Allow users to create custom workouts (fallback)',
            target_audience: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'fallback-3',
            flag_name: 'custom_video_upload',
            is_enabled: true,
            description: 'Allow users to upload custom exercise videos (fallback)',
            target_audience: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        this.flags.clear();
        fallbackFlags.forEach(flag => {
          this.flags.set(flag.flag_name, flag);
        });
        this.loaded = true;
        console.log(`Loaded ${this.flags.size} fallback feature flags`);
        return;
      }

      this.flags.clear();
      data?.forEach(flag => {
        // Transform to match FeatureFlag type
        const featureFlag: FeatureFlag = {
          ...flag,
          is_enabled: flag.is_enabled || false,
          description: flag.description || undefined,
          target_audience: (flag.target_audience as 'all' | 'authenticated' | 'beta' | 'admin') || 'all',
          created_at: flag.created_at || new Date().toISOString(),
          updated_at: flag.updated_at || new Date().toISOString()
        };
        this.flags.set(flag.flag_name, featureFlag);
      });

      this.loaded = true;
      console.log(`Loaded ${this.flags.size} feature flags`);
    } catch (error) {
      console.error('Error loading feature flags:', error);
    }
  }

  /**
   * Check if a feature flag is enabled for the current user
   */
  public async isEnabled(flagName: string, userRole: string = 'authenticated'): Promise<boolean> {
    await this.loadFlags();
    
    const flag = this.flags.get(flagName);
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return false;
    }

    if (!flag.is_enabled) {
      return false;
    }

    // Check target audience
    if (flag.target_audience === 'all') {
      return true;
    }
    
    if (flag.target_audience === 'authenticated' && userRole !== 'anonymous') {
      return true;
    }
    
    if (flag.target_audience === userRole) {
      return true;
    }

    return false;
  }

  /**
   * Get current user role for feature flag checks
   */
  private getCurrentUserRole(): string {
    const authState = authService.getAuthState();
    if (!authState.isAuthenticated) {
      return 'anonymous';
    }
    
    // Future: Add role-based logic (admin, beta, etc.)
    return 'authenticated';
  }

  // Convenience methods for specific features
  
  /**
   * Check if users can create custom exercises
   */
  public async canCreateExercises(): Promise<boolean> {
    return this.isEnabled('user_created_exercises', this.getCurrentUserRole());
  }

  /**
   * Check if users can create custom workouts
   */
  public async canCreateWorkouts(): Promise<boolean> {
    return this.isEnabled('user_created_workouts', this.getCurrentUserRole());
  }

  /**
   * Check if exercise sharing is enabled
   */
  public async canShareExercises(): Promise<boolean> {
    return this.isEnabled('exercise_sharing', this.getCurrentUserRole());
  }

  /**
   * Check if workout sharing is enabled
   */
  public async canShareWorkouts(): Promise<boolean> {
    return this.isEnabled('workout_sharing', this.getCurrentUserRole());
  }

  /**
   * Check if exercise rating is enabled
   */
  public async canRateExercises(): Promise<boolean> {
    return this.isEnabled('exercise_rating', this.getCurrentUserRole());
  }

  /**
   * Check if workout rating is enabled
   */
  public async canRateWorkouts(): Promise<boolean> {
    return this.isEnabled('workout_rating', this.getCurrentUserRole());
  }

  /**
   * Check if custom video uploads are enabled
   */
  public async canUploadVideos(): Promise<boolean> {
    return this.isEnabled('custom_video_upload', this.getCurrentUserRole());
  }

  /**
   * Get all feature flags (for admin/debug purposes)
   */
  public async getAllFlags(): Promise<FeatureFlag[]> {
    await this.loadFlags();
    return Array.from(this.flags.values());
  }

  /**
   * Refresh flags from the database
   */
  public async refreshFlags(): Promise<void> {
    this.loaded = false;
    this.flags.clear();
    await this.loadFlags();
  }

  /**
   * Check multiple flags at once for performance
   */
  public async checkFlags(flagNames: string[]): Promise<Record<string, boolean>> {
    await this.loadFlags();
    const userRole = this.getCurrentUserRole();
    const results: Record<string, boolean> = {};

    for (const flagName of flagNames) {
      results[flagName] = await this.isEnabled(flagName, userRole);
    }

    return results;
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();