/**
 * User Profile Types
 * 
 * Unified user profile structure that includes:
 * - Common personal information (name, birth_year)
 * - Fitness-related data (stored in fitness object)
 * - Social-related data (stored in social object)
 * - Stored locally in IndexedDB and synced to Supabase
 */

import type { SyncMetadata } from './index';
import type { Gender, FitnessGoal, TrainingTime, TrainingStyle, Height, Weight } from './aiWorkout';

/**
 * Fitness-specific profile data
 */
export interface FitnessProfileData {
  height?: Height;
  weight?: Weight;
  primary_goals?: FitnessGoal[];
  training_frequency?: TrainingTime;
  preferred_training_style?: TrainingStyle;
  last_updated_from_wizard?: string; // ISO timestamp
}

/**
 * Social-specific profile data
 */
export interface SocialProfileData {
  bio?: string;
  location?: string;
  website?: string;
  privacy_settings?: {
    profile_visibility: 'public' | 'connections' | 'private';
    show_stats: boolean;
    show_activity: boolean;
    allow_connection_requests: boolean;
  };
  stats?: {
    total_workouts: number;
    total_exercises_created: number;
    total_workouts_created: number;
    streak_days: number;
    longest_streak: number;
  };
}

/**
 * Unified user profile
 * Stored in IndexedDB and synced to Supabase user_profiles table
 */
export interface UserProfile extends SyncMetadata {
  user_id: string; // References auth.users(id)
  
  // Common personal information
  name?: string;
  birth_year?: number; // Used to calculate age
  gender?: Gender; // User's gender
  
  // Nested profile data
  fitness?: FitnessProfileData;
  social?: SocialProfileData;
  
  // Metadata
  join_date?: string; // ISO timestamp
  last_active?: string; // ISO timestamp
}

/**
 * Mapping between UserProfile and AI Workout Builder form data
 */
export interface ProfileToFormMapping {
  // Screen 1 mappings
  gender?: Gender;
  age?: number; // Calculated from birth_year
  height?: Height;
  weight?: Weight;
  
  // Screen 2 mappings
  goals?: FitnessGoal[];
  trainingTime?: TrainingTime;
  
  // Screen 3 mappings (partial)
  trainingStyle?: TrainingStyle;
}

// Re-export types for backward compatibility
export type { Gender, FitnessGoal, TrainingTime, TrainingStyle, Height, Weight } from './aiWorkout';
