/**
 * Insight Parser Module
 *
 * Parses and validates AI responses from Mistral API into structured coaching insights.
 * Handles JSON extraction, schema validation, and error recovery.
 */

import { logError, logWarn, logInfo } from './logger.ts';

/**
 * AI-generated insight structure
 */
export interface AIInsight {
  id?: string;  // Optional ID (added during transformation or from cache)
  type: 'streak' | 'balance' | 'progress' | 'suggestion' | 'celebration' | 'recovery';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionText?: string;
  data?: Record<string, any>;
  createdAt?: string;  // Optional ISO timestamp (added during transformation or from cache)
}

/**
 * Parsed AI response
 */
export interface ParsedInsights {
  insights: AIInsight[];
  overallTrend: 'improving' | 'maintaining' | 'declining';
  keyStrength: string;
  primaryRecommendation: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates a single insight object
 */
function validateInsight(insight: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate type
  const validTypes = ['streak', 'balance', 'progress', 'suggestion', 'celebration', 'recovery'];
  if (!insight.type || !validTypes.includes(insight.type)) {
    errors.push({
      field: `insights[${index}].type`,
      message: `Invalid type: "${insight.type}". Must be one of: ${validTypes.join(', ')}`
    });
  }

  // Validate title
  if (!insight.title || typeof insight.title !== 'string') {
    errors.push({
      field: `insights[${index}].title`,
      message: 'Title is required and must be a string'
    });
  } else if (insight.title.length > 100) {
    errors.push({
      field: `insights[${index}].title`,
      message: `Title too long: ${insight.title.length} characters (max 100)`
    });
  }

  // Validate message
  if (!insight.message || typeof insight.message !== 'string') {
    errors.push({
      field: `insights[${index}].message`,
      message: 'Message is required and must be a string'
    });
  } else if (insight.message.length > 300) {
    errors.push({
      field: `insights[${index}].message`,
      message: `Message too long: ${insight.message.length} characters (max 300)`
    });
  }

  // Validate priority
  const validPriorities = ['high', 'medium', 'low'];
  if (!insight.priority || !validPriorities.includes(insight.priority)) {
    errors.push({
      field: `insights[${index}].priority`,
      message: `Invalid priority: "${insight.priority}". Must be one of: ${validPriorities.join(', ')}`
    });
  }

  // Validate actionable
  if (typeof insight.actionable !== 'boolean') {
    errors.push({
      field: `insights[${index}].actionable`,
      message: 'Actionable must be a boolean'
    });
  }

  // Validate actionText (if present)
  if (insight.actionText && typeof insight.actionText !== 'string') {
    errors.push({
      field: `insights[${index}].actionText`,
      message: 'ActionText must be a string if provided'
    });
  }

  // Validate actionText presence for actionable insights
  if (insight.actionable && !insight.actionText) {
    errors.push({
      field: `insights[${index}].actionText`,
      message: 'ActionText is required when actionable is true'
    });
  }

  return errors;
}

/**
 * Validates the complete insights response
 */
function validateInsightsResponse(response: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate insights array
  if (!response.insights || !Array.isArray(response.insights)) {
    errors.push({
      field: 'insights',
      message: 'Insights must be an array'
    });
    return errors; // Cannot continue validation
  }

  // Validate insights count
  if (response.insights.length < 3) {
    errors.push({
      field: 'insights',
      message: `Insufficient insights: ${response.insights.length} (minimum 3 required)`
    });
  }

  if (response.insights.length > 5) {
    errors.push({
      field: 'insights',
      message: `Too many insights: ${response.insights.length} (maximum 5 allowed)`
    });
  }

  // Validate each insight
  response.insights.forEach((insight: any, index: number) => {
    const insightErrors = validateInsight(insight, index);
    errors.push(...insightErrors);
  });

  // Validate at least one actionable insight
  const actionableCount = response.insights.filter((i: any) => i.actionable === true).length;
  if (actionableCount === 0) {
    errors.push({
      field: 'insights',
      message: 'At least one insight must be actionable'
    });
  }

  // Validate overallTrend
  const validTrends = ['improving', 'maintaining', 'declining'];
  if (!response.overallTrend || !validTrends.includes(response.overallTrend)) {
    errors.push({
      field: 'overallTrend',
      message: `Invalid overallTrend: "${response.overallTrend}". Must be one of: ${validTrends.join(', ')}`
    });
  }

  // Validate keyStrength
  if (!response.keyStrength || typeof response.keyStrength !== 'string') {
    errors.push({
      field: 'keyStrength',
      message: 'KeyStrength is required and must be a string'
    });
  } else if (response.keyStrength.length > 150) {
    errors.push({
      field: 'keyStrength',
      message: `KeyStrength too long: ${response.keyStrength.length} characters (max 150)`
    });
  }

  // Validate primaryRecommendation
  if (!response.primaryRecommendation || typeof response.primaryRecommendation !== 'string') {
    errors.push({
      field: 'primaryRecommendation',
      message: 'PrimaryRecommendation is required and must be a string'
    });
  } else if (response.primaryRecommendation.length > 200) {
    errors.push({
      field: 'primaryRecommendation',
      message: `PrimaryRecommendation too long: ${response.primaryRecommendation.length} characters (max 200)`
    });
  }

  return errors;
}

/**
 * Extracts JSON from AI response text
 * Handles cases where AI wraps JSON in markdown code blocks
 */
function extractJSON(text: string): any {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // If no match, try parsing the entire text
  return JSON.parse(text);
}

/**
 * Parses and validates AI response into structured insights
 *
 * @param aiResponse - Raw response string from AI
 * @param correlationId - Correlation ID for logging
 * @returns Parsed and validated insights
 * @throws Error if parsing or validation fails
 */
export function parseInsights(
  aiResponse: string,
  correlationId: string
): ParsedInsights {
  try {
    logInfo(correlationId, 'Parsing AI response', {
      responseLength: aiResponse.length
    });

    // Extract and parse JSON
    let parsed: any;
    try {
      parsed = extractJSON(aiResponse);
    } catch (parseError: any) {
      logError(correlationId, 'Failed to parse AI response as JSON', {
        error: parseError.message,
        responsePreview: aiResponse.substring(0, 200)
      });
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate schema
    const validationErrors = validateInsightsResponse(parsed);
    if (validationErrors.length > 0) {
      logError(correlationId, 'AI response failed validation', {
        errorCount: validationErrors.length,
        errors: validationErrors
      });
      throw new Error(`AI response validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    }

    logInfo(correlationId, 'AI response parsed and validated successfully', {
      insightCount: parsed.insights.length,
      actionableCount: parsed.insights.filter((i: any) => i.actionable).length,
      overallTrend: parsed.overallTrend
    });

    return parsed as ParsedInsights;

  } catch (error: any) {
    logError(correlationId, 'Error in parseInsights', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Sanitizes insight content to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInsight(insight: AIInsight): AIInsight {
  const sanitizeString = (str: string): string => {
    // Remove HTML tags - this is the primary security measure
    let clean = str.replace(/<[^>]*>/g, '');
    
    // Only escape characters that are actually dangerous in HTML/XML contexts
    // Note: Apostrophes (') are safe in plain text and React handles them correctly
    // We only escape <, >, and & to prevent any potential HTML injection
    clean = clean.replace(/[<>&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;'
      };
      return entities[char] || char;
    });
    
    return clean.trim();
  };

  return {
    ...insight,
    title: sanitizeString(insight.title),
    message: sanitizeString(insight.message),
    actionText: insight.actionText ? sanitizeString(insight.actionText) : undefined
  };
}

/**
 * Sanitizes all insights in parsed response
 */
export function sanitizeParsedInsights(parsed: ParsedInsights): ParsedInsights {
  return {
    ...parsed,
    insights: parsed.insights.map(sanitizeInsight),
    keyStrength: parsed.keyStrength.replace(/<[^>]*>/g, '').trim(),
    primaryRecommendation: parsed.primaryRecommendation.replace(/<[^>]*>/g, '').trim()
  };
}
