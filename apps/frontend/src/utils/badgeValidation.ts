/**
 * Badge Tag Validation Utilities
 * 
 * Client-side validation for badge tags to ensure data integrity
 * before syncing to Supabase. Prevents malformed tags, XSS attempts,
 * and excessive data.
 * 
 * Tag Format: `badgeId:value` (e.g., 'category:core', 'kyu:5')
 * - badgeId: lowercase alphanumeric + hyphens
 * - value: lowercase alphanumeric + hyphens + underscores
 */

import logger from './logger';

// Validation constants
const MAX_TAG_LENGTH = 100; // Maximum characters per tag
const MAX_TAGS_PER_EXERCISE = 20; // Maximum number of tags per exercise
const MAX_TAG_VALUE_LENGTH = 50; // Maximum characters for the value part

// Regex for valid tag format: badgeId:value
// - badgeId: 1-30 chars, alphanumeric + hyphens
// - value: 1-50 chars, alphanumeric + hyphens + underscores
const TAG_FORMAT_REGEX = /^[a-z0-9-]{1,30}:[a-z0-9-_]{1,50}$/i;

// Dangerous patterns to reject (XSS, injection attempts)
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+=/i, // onclick=, onerror=, etc.
  /data:text\/html/i,
  /<iframe/i,
  /eval\(/i,
  /expression\(/i
];

/**
 * Sanitize a single tag value
 * 
 * @param value - Raw tag value from user input
 * @returns Sanitized tag value
 */
export function sanitizeTagValue(value: string): string {
  if (typeof value !== 'string') {
    logger.warn('sanitizeTagValue: Non-string value provided', { value });
    return '';
  }

  // 1. Trim whitespace
  let sanitized = value.trim();

  // 2. Limit length
  if (sanitized.length > MAX_TAG_VALUE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_TAG_VALUE_LENGTH);
    logger.warn('sanitizeTagValue: Value truncated to max length', {
      original: value,
      truncated: sanitized
    });
  }

  // 3. Lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // 4. Remove/replace invalid characters
  // Allow only: alphanumeric, hyphens, underscores, colons (for badgeId:value format)
  sanitized = sanitized.replace(/[^a-z0-9-_:]/g, '-');

  // 5. Collapse multiple hyphens/underscores
  sanitized = sanitized.replace(/[-_]{2,}/g, '-');

  // 6. Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  return sanitized;
}

/**
 * Validate an array of badge tags
 * 
 * @param tags - Array of tag strings to validate
 * @param catalogId - Catalog ID for context in error messages
 * @returns Validation result with valid tags and errors
 */
export function validateBadgeTags(
  tags: string[],
  catalogId: string
): {
  valid: string[];
  errors: string[];
  warnings: string[];
} {
  const valid: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if tags is an array
  if (!Array.isArray(tags)) {
    errors.push('Tags must be an array');
    return { valid: [], errors, warnings };
  }

  // Check tag count
  if (tags.length > MAX_TAGS_PER_EXERCISE) {
    errors.push(
      `Too many tags: ${tags.length} (max: ${MAX_TAGS_PER_EXERCISE})`
    );
    warnings.push(`Only the first ${MAX_TAGS_PER_EXERCISE} tags will be kept`);
    tags = tags.slice(0, MAX_TAGS_PER_EXERCISE);
  }

  // Validate each tag
  for (const tag of tags) {
    // Type check
    if (typeof tag !== 'string') {
      errors.push(`Invalid tag type: ${typeof tag} (expected string)`);
      continue;
    }

    // Sanitize first
    const sanitized = sanitizeTagValue(tag);

    if (!sanitized) {
      warnings.push(`Empty tag after sanitization: "${tag}"`);
      continue;
    }

    // Check length
    if (sanitized.length > MAX_TAG_LENGTH) {
      errors.push(
        `Tag too long: "${sanitized.substring(0, 20)}..." (${sanitized.length} chars, max: ${MAX_TAG_LENGTH})`
      );
      continue;
    }

    // Check format (badgeId:value)
    if (!TAG_FORMAT_REGEX.test(sanitized)) {
      errors.push(
        `Invalid tag format: "${sanitized}" (expected "badgeId:value" format)`
      );
      continue;
    }

    // Check for dangerous patterns (XSS, injection)
    let isDangerous = false;
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        errors.push(
          `Dangerous pattern detected in tag: "${sanitized.substring(0, 20)}..."`
        );
        isDangerous = true;
        break;
      }
    }

    if (isDangerous) {
      continue;
    }

    // Tag is valid
    valid.push(sanitized);
  }

  // Remove duplicates
  const uniqueValid = Array.from(new Set(valid));
  if (uniqueValid.length < valid.length) {
    warnings.push(
      `Removed ${valid.length - uniqueValid.length} duplicate tag(s)`
    );
  }

  // Log validation results for debugging
  if (errors.length > 0 || warnings.length > 0) {
    logger.warn('Badge tag validation issues', {
      catalogId,
      totalTags: tags.length,
      validTags: uniqueValid.length,
      errors: errors.length,
      warnings: warnings.length,
      errorDetails: errors,
      warningDetails: warnings
    });
  }

  return {
    valid: uniqueValid,
    errors,
    warnings
  };
}

/**
 * Validate tags before saving an exercise
 * 
 * This function is meant to be called in the exercise form submit path
 * to block invalid tags early and prevent failed syncs.
 * 
 * @param tags - Tags array from exercise form
 * @param catalogId - Catalog ID of the exercise
 * @returns True if tags are valid, false otherwise
 * @throws Error with user-friendly message if validation fails
 */
export function validateTagsBeforeSave(
  tags: string[] | undefined,
  catalogId: string
): boolean {
  // Empty/undefined tags are valid (exercise has no badges)
  if (!tags || tags.length === 0) {
    return true;
  }

  const { valid, errors } = validateBadgeTags(tags, catalogId);

  if (errors.length > 0) {
    const errorMessage = `Invalid exercise tags:\n${errors.slice(0, 3).join('\n')}${
      errors.length > 3 ? `\n...and ${errors.length - 3} more error(s)` : ''
    }`;

    logger.error('Tag validation failed before save', {
      catalogId,
      errors,
      validCount: valid.length,
      totalCount: tags.length
    });

    throw new Error(errorMessage);
  }

  return true;
}

/**
 * Extract badge ID from a tag
 * 
 * @param tag - Tag in format "badgeId:value"
 * @returns Badge ID or null if invalid format
 */
export function extractBadgeId(tag: string): string | null {
  const match = tag.match(/^([a-z0-9-]+):/i);
  return match ? match[1] : null;
}

/**
 * Extract badge value from a tag
 * 
 * @param tag - Tag in format "badgeId:value"
 * @returns Badge value or null if invalid format
 */
export function extractBadgeValue(tag: string): string | null {
  const match = tag.match(/:([a-z0-9-_]+)$/i);
  return match ? match[1] : null;
}

/**
 * Create a tag from badge ID and value
 * 
 * @param badgeId - Badge identifier
 * @param value - Badge value
 * @returns Formatted tag string
 */
export function createTag(badgeId: string, value: string | number): string {
  const sanitizedBadgeId = sanitizeTagValue(String(badgeId));
  const sanitizedValue = sanitizeTagValue(String(value));
  return `${sanitizedBadgeId}:${sanitizedValue}`;
}

