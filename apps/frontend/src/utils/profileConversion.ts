/**
 * Profile Conversion Utilities
 * 
 * Helpers to convert between UserProfile and AI Workout Builder form data
 */

import type { UserProfile } from '../types/userProfile';
import type { Screen1Data, Screen2Data, Screen3Data } from '../types/aiWorkout';

/**
 * Calculate age from birth year
 */
function calculateAge(birthYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

/**
 * Convert UserProfile to Screen1Data
 * Returns partial Screen1Data with only the fields that exist in profile
 */
export function profileToScreen1(profile: UserProfile | null): Partial<Screen1Data> {
  if (!profile) return {};

  const result: Partial<Screen1Data> = {};

  if (profile.gender) {
    result.gender = profile.gender;
  }

  if (profile.birth_year) {
    result.age = calculateAge(profile.birth_year);
  }

  if (profile.fitness?.height) {
    result.height = profile.fitness.height;
  }

  if (profile.fitness?.weight) {
    result.weight = profile.fitness.weight;
  }

  return result;
}

/**
 * Convert UserProfile to Screen2Data
 * Returns partial Screen2Data with only the fields that exist in profile
 */
export function profileToScreen2(profile: UserProfile | null): Partial<Screen2Data> {
  if (!profile || !profile.fitness) return {};

  const result: Partial<Screen2Data> = {};

  if (profile.fitness.primary_goals && profile.fitness.primary_goals.length > 0) {
    result.goals = profile.fitness.primary_goals;
  }

  if (profile.fitness.training_frequency) {
    result.trainingTime = profile.fitness.training_frequency;
  }

  return result;
}

/**
 * Convert UserProfile to Screen3Data
 * Returns partial Screen3Data with only the fields that exist in profile
 */
export function profileToScreen3(profile: UserProfile | null): Partial<Screen3Data> {
  if (!profile || !profile.fitness) return {};

  const result: Partial<Screen3Data> = {};

  if (profile.fitness.preferred_training_style) {
    result.trainingStyle = profile.fitness.preferred_training_style;
  }

  // Default saveToProfile to true (user can uncheck if they don't want to update)
  result.saveToProfile = true;

  return result;
}

/**
 * Convert form data to UserProfile fields
 * Extracts profile-relevant data from all screens
 */
export function formDataToProfile(
  screen1: Screen1Data,
  screen2: Screen2Data,
  screen3: Screen3Data
): Partial<UserProfile> {
  const currentYear = new Date().getFullYear();

  return {
    birth_year: currentYear - screen1.age, // Convert age back to birth year (common field)
    gender: screen1.gender, // Gender is a common field
    fitness: {
      height: screen1.height,
      weight: screen1.weight,
      primary_goals: screen2.goals,
      training_frequency: screen2.trainingTime,
      preferred_training_style: screen3.trainingStyle,
      last_updated_from_wizard: new Date().toISOString(),
    },
  };
}
