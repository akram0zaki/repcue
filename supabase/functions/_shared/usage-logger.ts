/**
 * AI Usage Logger - Shared Utility
 * Tracks token usage and costs for AI API calls across all edge functions
 *
 * Feature: AI Token Usage Tracking
 * Used by: generate-ai-workout, analyze-progress
 * Created: 2025-10-05
 * Moved to _shared: 2025-10-14
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface CostBreakdown {
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

export type RequestType = 'workout_generation' | 'coaching_insights' | 'exercise_generation' | 'other';

export interface LogAIUsageParams {
  correlationId: string;
  userId: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  processingTimeMs: number;
  success: boolean;
  requestType: RequestType;
  errorCode?: string;
  logInfo: (correlationId: string, message: string, metadata?: Record<string, any>) => void;
  logWarn: (correlationId: string, message: string, metadata?: Record<string, any>) => void;
  logError: (correlationId: string, message: string, metadata?: Record<string, any>) => void;
}

// ============================================================================
// Pricing Table
// ============================================================================

/**
 * Pricing per million tokens for supported AI providers
 *
 * Sources:
 * - Mistral: https://mistral.ai/pricing
 * - Anthropic: https://anthropic.com/pricing
 * - OpenAI: https://openai.com/pricing
 *
 * Last updated: 2025-10-14
 */
export const PRICING_TABLE: Record<string, Record<string, { input: number; output: number }>> = {
  'mistral': {
    'mistral-large-latest': { input: 3.00, output: 9.00 }, // $3/$9 per 1M tokens
    'mistral-large-2411': { input: 3.00, output: 9.00 },
    'mistral-medium-latest': { input: 2.50, output: 7.50 },
    'mistral-small-latest': { input: 0.20, output: 0.60 },
    'open-mistral-7b': { input: 0.10, output: 0.10 },
    'open-mixtral-8x7b': { input: 0.30, output: 0.30 },
    'open-mixtral-8x22b': { input: 1.00, output: 1.00 },
  },
  'anthropic': {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  'openai': {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  },
};

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate cost based on provider, model, and token usage
 *
 * @param provider - AI provider name (mistral, anthropic, openai)
 * @param model - Specific model identifier
 * @param usage - Token usage (input, output, total)
 * @param correlationId - For logging purposes
 * @param logWarn - Warning logger function
 * @returns Cost breakdown in USD
 */
export function calculateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
  correlationId: string,
  logWarn: (correlationId: string, message: string, metadata?: Record<string, any>) => void
): CostBreakdown {
  const pricing = PRICING_TABLE[provider]?.[model];

  if (!pricing) {
    logWarn(correlationId, `Unknown pricing for ${provider}/${model}, defaulting to $0`, {
      provider,
      model,
      availableProviders: Object.keys(PRICING_TABLE),
    });
    return { input_cost_usd: 0, output_cost_usd: 0, total_cost_usd: 0 };
  }

  // Calculate costs (pricing is per million tokens)
  const input_cost_usd = (usage.input_tokens / 1_000_000) * pricing.input;
  const output_cost_usd = (usage.output_tokens / 1_000_000) * pricing.output;
  const total_cost_usd = input_cost_usd + output_cost_usd;

  return {
    input_cost_usd: parseFloat(input_cost_usd.toFixed(6)),
    output_cost_usd: parseFloat(output_cost_usd.toFixed(6)),
    total_cost_usd: parseFloat(total_cost_usd.toFixed(6)),
  };
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log AI usage to database
 *
 * This function is non-blocking: errors are logged but not thrown.
 * Logging failures should not interrupt the AI function workflow.
 *
 * @param params - Usage logging parameters
 */
export async function logAIUsage(params: LogAIUsageParams): Promise<void> {
  const {
    correlationId,
    userId,
    provider,
    model,
    usage,
    processingTimeMs,
    success,
    requestType,
    errorCode,
    logInfo,
    logWarn,
    logError,
  } = params;

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logError(correlationId, 'Missing Supabase credentials for usage logging', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return; // Fail silently - don't block AI workflow
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cost
    const costs = calculateCost(provider, model, usage, correlationId, logWarn);

    // Validate token consistency
    if (usage.total_tokens !== usage.input_tokens + usage.output_tokens) {
      logWarn(correlationId, 'Token usage inconsistency detected', {
        input: usage.input_tokens,
        output: usage.output_tokens,
        total: usage.total_tokens,
        expected: usage.input_tokens + usage.output_tokens,
      });
    }

    // Insert into ai_usage_logs table
    const { error } = await supabase.from('ai_usage_logs').insert({
      correlation_id: correlationId,
      user_id: userId,
      provider,
      model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      input_cost_usd: costs.input_cost_usd,
      output_cost_usd: costs.output_cost_usd,
      total_cost_usd: costs.total_cost_usd,
      request_type: requestType,
      success,
      error_code: errorCode || null,
      processing_time_ms: processingTimeMs,
    });

    if (error) {
      logError(correlationId, 'Failed to log AI usage', {
        error: error.message,
        code: error.code,
      });
      // Don't throw - usage logging should not block AI workflow
    } else {
      logInfo(correlationId, 'AI usage logged successfully', {
        tokens: usage.total_tokens,
        cost_usd: costs.total_cost_usd,
        provider,
        model,
        requestType,
        success,
      });
    }
  } catch (e) {
    logError(correlationId, 'Exception while logging AI usage', {
      error: e.message,
      stack: e.stack,
    });
    // Continue execution - usage logging is non-critical
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract token usage from Mistral API response
 *
 * @param response - Mistral API response object
 * @returns Token usage object
 */
export function extractMistralUsage(response: any): TokenUsage {
  return {
    input_tokens: response.usage?.prompt_tokens || 0,
    output_tokens: response.usage?.completion_tokens || 0,
    total_tokens: response.usage?.total_tokens || 0,
  };
}

/**
 * Extract token usage from Anthropic API response
 *
 * @param response - Anthropic API response object
 * @returns Token usage object
 */
export function extractAnthropicUsage(response: any): TokenUsage {
  return {
    input_tokens: response.usage?.input_tokens || 0,
    output_tokens: response.usage?.output_tokens || 0,
    total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
  };
}

/**
 * Extract token usage from OpenAI API response
 *
 * @param response - OpenAI API response object
 * @returns Token usage object
 */
export function extractOpenAIUsage(response: any): TokenUsage {
  return {
    input_tokens: response.usage?.prompt_tokens || 0,
    output_tokens: response.usage?.completion_tokens || 0,
    total_tokens: response.usage?.total_tokens || 0,
  };
}
