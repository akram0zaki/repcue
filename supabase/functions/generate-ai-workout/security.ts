/**
 * Security module for AI Workout Edge Function
 *
 * Implements:
 * - Input sanitization (XSS protection)
 * - Rate limiting (5 requests/hour per user)
 * - Request schema validation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Rate limiting configuration
const RATE_LIMIT_MAX = 5; // 5 requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory rate limiting store (for demo; production would use Redis or Supabase table)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Request validation result
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  allowed: boolean;
  limit: number;
  count?: number; // current request count
  retryAfter?: number; // seconds until next allowed request
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove special characters that could be used for injection
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitizes entire request object
 */
export function sanitizeInput(request: any): any {
  if (!request || !request.responses) {
    return request;
  }

  return {
    ...request,
    responses: {
      ...request.responses,
      injuries: sanitizeString(request.responses.injuries || ''),
      // Other fields are enums/numbers, no sanitization needed
      gender: request.responses.gender,
      age: request.responses.age,
      height: request.responses.height,
      weight: request.responses.weight,
      goal: request.responses.goal,
      fitnessLevel: request.responses.fitnessLevel,
      trainingTime: request.responses.trainingTime,
      trainingStyle: request.responses.trainingStyle,
      timeAvailability: request.responses.timeAvailability
    },
    locale: request.locale
  };
}

/**
 * Validates request schema
 */
export function validateRequest(request: any): ValidationResult {
  const errors: string[] = [];

  // Check if request exists
  if (!request) {
    errors.push('Request body is required');
    return { valid: false, errors };
  }

  // Check if responses object exists
  if (!request.responses || typeof request.responses !== 'object') {
    errors.push('responses object is required');
    return { valid: false, errors };
  }

  const { responses } = request;

  // Validate gender
  if (!responses.gender || !['male', 'female', 'other'].includes(responses.gender)) {
    errors.push('gender must be one of: male, female, other');
  }

  // Validate age
  if (typeof responses.age !== 'number' || responses.age < 13 || responses.age > 120) {
    errors.push('age must be a number between 13 and 120');
  }

  // Validate height
  if (!responses.height || typeof responses.height !== 'object') {
    errors.push('height object is required');
  } else {
    if (!['cm', 'ft'].includes(responses.height.unit)) {
      errors.push('height.unit must be "cm" or "ft"');
    }
    if (responses.height.unit === 'cm') {
      if (typeof responses.height.cm !== 'number' || responses.height.cm < 100 || responses.height.cm > 250) {
        errors.push('height.cm must be between 100 and 250');
      }
    } else if (responses.height.unit === 'ft') {
      if (typeof responses.height.feet !== 'number' || responses.height.feet < 3 || responses.height.feet > 8) {
        errors.push('height.feet must be between 3 and 8');
      }
      if (typeof responses.height.inches !== 'number' || responses.height.inches < 0 || responses.height.inches > 11) {
        errors.push('height.inches must be between 0 and 11');
      }
    }
  }

  // Validate weight
  if (!responses.weight || typeof responses.weight !== 'object') {
    errors.push('weight object is required');
  } else {
    if (!['kg', 'lbs'].includes(responses.weight.unit)) {
      errors.push('weight.unit must be "kg" or "lbs"');
    }
    const weightValue = responses.weight.unit === 'kg' ? responses.weight.kg : responses.weight.lbs;
    const minWeight = responses.weight.unit === 'kg' ? 30 : 66;
    const maxWeight = responses.weight.unit === 'kg' ? 300 : 661;

    if (typeof weightValue !== 'number' || weightValue < minWeight || weightValue > maxWeight) {
      errors.push(`weight.${responses.weight.unit} must be between ${minWeight} and ${maxWeight}`);
    }
  }

  // Validate goal
  if (!['weight_loss', 'muscle_building', 'health_maintenance', 'flexibility'].includes(responses.goal)) {
    errors.push('goal must be one of: weight_loss, muscle_building, health_maintenance, flexibility');
  }

  // Validate fitness level
  if (!['beginner', 'intermediate', 'advanced'].includes(responses.fitnessLevel)) {
    errors.push('fitnessLevel must be one of: beginner, intermediate, advanced');
  }

  // Validate training time
  if (!['3-4', '4-5', '5-6', '6+'].includes(responses.trainingTime)) {
    errors.push('trainingTime must be one of: 3-4, 4-5, 5-6, 6+');
  }

  // Validate injuries (optional)
  if (responses.injuries !== undefined && responses.injuries !== null) {
    if (typeof responses.injuries !== 'string') {
      errors.push('injuries must be a string');
    } else if (responses.injuries.length > 500) {
      errors.push('injuries must not exceed 500 characters');
    }
  }

  // Validate training style
  if (!['strength', 'cardio', 'balanced'].includes(responses.trainingStyle)) {
    errors.push('trainingStyle must be one of: strength, cardio, balanced');
  }

  // Validate time availability
  if (!['15-30', '30-45', '45-60', '60+'].includes(responses.timeAvailability)) {
    errors.push('timeAvailability must be one of: 15-30, 30-45, 45-60, 60+');
  }

  // Validate locale
  if (!request.locale || typeof request.locale !== 'string') {
    errors.push('locale is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Checks rate limiting for a user
 *
 * Uses in-memory store for development. Production should use:
 * - Redis for distributed rate limiting
 * - Supabase table with user_id, request_count, window_start
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, limit: RATE_LIMIT_MAX, count: 1 };
  }

  if (userLimit.count < RATE_LIMIT_MAX) {
    // Increment count
    userLimit.count++;
    rateLimitStore.set(userId, userLimit);
    return { allowed: true, limit: RATE_LIMIT_MAX, count: userLimit.count };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000); // seconds
  return {
    allowed: false,
    limit: RATE_LIMIT_MAX,
    count: userLimit.count,
    retryAfter
  };
}

/**
 * Clears rate limit for a user (for testing purposes)
 */
export function clearRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}
