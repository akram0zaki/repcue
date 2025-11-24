/**
 * Validation utilities for AI workout onboarding forms
 *
 * This module provides validation functions for each screen of the AI workout onboarding flow.
 * All validation functions return a ValidationResult with isValid flag and optional error message.
 */

import type {
  Screen1Data,
  Screen2Data,
  Screen3Data,
  Screen1ValidationErrors,
  Screen2ValidationErrors,
  Screen3ValidationErrors,
  ValidationResult,
} from '../types/aiWorkout';

/**
 * Constants for validation rules
 */
const VALIDATION_RULES = {
  AGE_MIN: 16,
  AGE_MAX: 100,
  HEIGHT_CM_MIN: 100,
  HEIGHT_CM_MAX: 250,
  HEIGHT_FT_MIN: 3,
  HEIGHT_FT_MAX: 8,
  HEIGHT_IN_MIN: 0,
  HEIGHT_IN_MAX: 11,
  WEIGHT_KG_MIN: 30,
  WEIGHT_KG_MAX: 300,
  WEIGHT_LBS_MIN: 66,
  WEIGHT_LBS_MAX: 660,
  INJURIES_MAX_LENGTH: 500,
} as const;

/**
 * Sanitizes user input by removing potentially dangerous characters
 * while preserving normal text, numbers, and common punctuation.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text safe for storage and transmission
 */
export function sanitizeUserInput(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters but keep normal punctuation
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validates age field
 *
 * @param age - Age value to validate
 * @returns Validation result
 */
function validateAge(age: number | undefined): ValidationResult {
  if (age === undefined || age === null || isNaN(age)) {
    return { isValid: false, error: 'Age is required' };
  }

  if (age < VALIDATION_RULES.AGE_MIN) {
    return {
      isValid: false,
      error: `Age must be at least ${VALIDATION_RULES.AGE_MIN}`,
    };
  }

  if (age > VALIDATION_RULES.AGE_MAX) {
    return {
      isValid: false,
      error: `Age must be ${VALIDATION_RULES.AGE_MAX} or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validates height field
 *
 * @param height - Height object to validate
 * @returns Validation result
 */
function validateHeight(height: Screen1Data['height'] | undefined): ValidationResult {
  if (!height) {
    return { isValid: false, error: 'Height is required' };
  }

  if (!height.value || isNaN(height.value)) {
    return { isValid: false, error: 'Height value is required' };
  }

  if (height.unit === 'cm') {
    if (height.value < VALIDATION_RULES.HEIGHT_CM_MIN) {
      return {
        isValid: false,
        error: `Height must be at least ${VALIDATION_RULES.HEIGHT_CM_MIN}cm`,
      };
    }
    if (height.value > VALIDATION_RULES.HEIGHT_CM_MAX) {
      return {
        isValid: false,
        error: `Height must be ${VALIDATION_RULES.HEIGHT_CM_MAX}cm or less`,
      };
    }
  } else if (height.unit === 'ft-in') {
    const feet = Math.floor(height.value);
    const inches = height.inches || 0;

    if (feet < VALIDATION_RULES.HEIGHT_FT_MIN) {
      return {
        isValid: false,
        error: `Height must be at least ${VALIDATION_RULES.HEIGHT_FT_MIN}ft`,
      };
    }
    if (feet > VALIDATION_RULES.HEIGHT_FT_MAX) {
      return {
        isValid: false,
        error: `Height must be ${VALIDATION_RULES.HEIGHT_FT_MAX}ft or less`,
      };
    }
    if (inches < VALIDATION_RULES.HEIGHT_IN_MIN || inches > VALIDATION_RULES.HEIGHT_IN_MAX) {
      return {
        isValid: false,
        error: `Inches must be between ${VALIDATION_RULES.HEIGHT_IN_MIN} and ${VALIDATION_RULES.HEIGHT_IN_MAX}`,
      };
    }
  } else {
    return { isValid: false, error: 'Invalid height unit' };
  }

  return { isValid: true };
}

/**
 * Validates weight field
 *
 * @param weight - Weight object to validate
 * @returns Validation result
 */
function validateWeight(weight: Screen1Data['weight'] | undefined): ValidationResult {
  if (!weight) {
    return { isValid: false, error: 'Weight is required' };
  }

  if (!weight.value || isNaN(weight.value)) {
    return { isValid: false, error: 'Weight value is required' };
  }

  if (weight.unit === 'kg') {
    if (weight.value < VALIDATION_RULES.WEIGHT_KG_MIN) {
      return {
        isValid: false,
        error: `Weight must be at least ${VALIDATION_RULES.WEIGHT_KG_MIN}kg`,
      };
    }
    if (weight.value > VALIDATION_RULES.WEIGHT_KG_MAX) {
      return {
        isValid: false,
        error: `Weight must be ${VALIDATION_RULES.WEIGHT_KG_MAX}kg or less`,
      };
    }
  } else if (weight.unit === 'lbs') {
    if (weight.value < VALIDATION_RULES.WEIGHT_LBS_MIN) {
      return {
        isValid: false,
        error: `Weight must be at least ${VALIDATION_RULES.WEIGHT_LBS_MIN}lbs`,
      };
    }
    if (weight.value > VALIDATION_RULES.WEIGHT_LBS_MAX) {
      return {
        isValid: false,
        error: `Weight must be ${VALIDATION_RULES.WEIGHT_LBS_MAX}lbs or less`,
      };
    }
  } else {
    return { isValid: false, error: 'Invalid weight unit' };
  }

  return { isValid: true };
}

/**
 * Validates Screen 1 data (Basic Information)
 *
 * @param data - Screen 1 form data
 * @returns Object with validation errors for each field (empty if all valid)
 */
export function validateScreen1(data: Partial<Screen1Data>): Screen1ValidationErrors {
  const errors: Screen1ValidationErrors = {};

  // Validate gender
  if (!data.gender) {
    errors.gender = 'Gender is required';
  } else if (!['male', 'female', 'other'].includes(data.gender)) {
    errors.gender = 'Invalid gender selection';
  }

  // Validate age
  const ageResult = validateAge(data.age);
  if (!ageResult.isValid) {
    errors.age = ageResult.error;
  }

  // Validate height
  const heightResult = validateHeight(data.height);
  if (!heightResult.isValid) {
    errors.height = heightResult.error;
  }

  // Validate weight
  const weightResult = validateWeight(data.weight);
  if (!weightResult.isValid) {
    errors.weight = weightResult.error;
  }

  return errors;
}

/**
 * Validates Screen 2 data (Goals & Preferences)
 *
 * @param data - Screen 2 form data
 * @returns Object with validation errors for each field (empty if all valid)
 */
export function validateScreen2(data: Partial<Screen2Data>): Screen2ValidationErrors {
  const errors: Screen2ValidationErrors = {};

  const validGoals = ['weight_loss', 'muscle_building', 'health_maintenance', 'flexibility', 'marathon_des_sables'];

  // Validate goals (now an array)
  if (!data.goals || data.goals.length === 0) {
    errors.goals = 'At least one goal is required';
  } else if (!Array.isArray(data.goals)) {
    errors.goals = 'Goals must be an array';
  } else if (!data.goals.every(goal => validGoals.includes(goal))) {
    errors.goals = 'Invalid goal selection';
  }

  // Validate goal duration (optional, but if provided must be valid)
  if (data.goalDuration !== undefined && data.goalDuration !== null) {
    const duration = Number(data.goalDuration);
    if (isNaN(duration) || duration < 1 || duration > 24) {
      errors.goalDuration = 'Goal duration must be between 1 and 24 months';
    }
  }

  // Validate fitness level
  if (!data.fitnessLevel) {
    errors.fitnessLevel = 'Fitness level is required';
  } else if (!['beginner', 'intermediate', 'advanced'].includes(data.fitnessLevel)) {
    errors.fitnessLevel = 'Invalid fitness level selection';
  }

  // Validate training time
  if (!data.trainingTime) {
    errors.trainingTime = 'Preferred training time is required';
  } else if (!['morning', 'afternoon', 'evening', 'mixed'].includes(data.trainingTime)) {
    errors.trainingTime = 'Invalid training time selection';
  }

  return errors;
}

/**
 * Validates Screen 3 data (Health & Training Style)
 *
 * @param data - Screen 3 form data
 * @returns Object with validation errors for each field (empty if all valid)
 */
export function validateScreen3(data: Partial<Screen3Data>): Screen3ValidationErrors {
  const errors: Screen3ValidationErrors = {};

  // Validate injuries (optional field, but check length if provided)
  if (data.injuries !== undefined && data.injuries !== null) {
    const sanitized = sanitizeUserInput(data.injuries);
    if (sanitized.length > VALIDATION_RULES.INJURIES_MAX_LENGTH) {
      errors.injuries = `Injuries description must be ${VALIDATION_RULES.INJURIES_MAX_LENGTH} characters or less`;
    }
  }

  // Validate training style
  if (!data.trainingStyle) {
    errors.trainingStyle = 'Training style is required';
  } else if (!['strength', 'cardio', 'balanced'].includes(data.trainingStyle)) {
    errors.trainingStyle = 'Invalid training style selection';
  }

  // Validate time availability
  if (!data.timeAvailability) {
    errors.timeAvailability = 'Time availability is required';
  } else if (!['15-30', '30-45', '45-60', '60+'].includes(data.timeAvailability)) {
    errors.timeAvailability = 'Invalid time availability selection';
  }

  return errors;
}

/**
 * Checks if a validation errors object has any errors
 *
 * @param errors - Validation errors object
 * @returns True if there are any errors, false otherwise
 */
export function hasErrors(
  errors: Screen1ValidationErrors | Screen2ValidationErrors | Screen3ValidationErrors
): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Gets the first error message from a validation errors object
 *
 * @param errors - Validation errors object
 * @returns First error message, or undefined if no errors
 */
export function getFirstError(
  errors: Screen1ValidationErrors | Screen2ValidationErrors | Screen3ValidationErrors
): string | undefined {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return undefined;

  const firstKey = errorKeys[0] as keyof typeof errors;
  return errors[firstKey];
}

/**
 * Validation rules export for use in components (e.g., showing character limits)
 */
export const VALIDATION = {
  ...VALIDATION_RULES,
} as const;
