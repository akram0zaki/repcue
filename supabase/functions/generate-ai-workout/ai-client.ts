/**
 * AI Client Module (Model-Agnostic)
 *
 * Provides abstraction layer for multiple AI providers:
 * - Anthropic Claude (primary)
 * - OpenAI GPT (fallback/alternative)
 * - Mistral AI (European option)
 *
 * Environment variables:
 * - AI_PROVIDER: 'anthropic' | 'openai' | 'mistral' (default: 'anthropic')
 * - ANTHROPIC_API_KEY: Anthropic API key
 * - OPENAI_API_KEY: OpenAI API key (optional)
 * - MISTRAL_API_KEY: Mistral API key (optional)
 */

import { logError, logInfo, logDebug, logWarn } from './logger.ts';

/**
 * AI generation options
 */
export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // milliseconds
}

/**
 * AI completion result with usage data
 */
export interface AICompletionResult {
  completion: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI provider interface
 */
export interface AIProvider {
  readonly name: string;
  generateCompletion(prompt: string, options: AIOptions, correlationId: string): Promise<AICompletionResult>;
}

/**
 * Anthropic Claude provider
 */
class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  async generateCompletion(
    prompt: string,
    options: AIOptions,
    correlationId: string
  ): Promise<AICompletionResult> {
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.7;
    const timeout = options.timeout || 60000;
    const model = 'claude-3-5-sonnet-20241022'; // Latest Sonnet model

    logDebug(correlationId, 'Calling Anthropic API', {
      provider: this.name,
      model,
      maxTokens,
      temperature,
      timeoutMs: timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logError(correlationId, 'Anthropic API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        logError(correlationId, 'Invalid response format from Anthropic', { data });
        throw new Error('Invalid response format from Anthropic API');
      }

      const completion = data.content[0].text;
      const usage = {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };

      logInfo(correlationId, 'Anthropic API call successful', {
        provider: this.name,
        model,
        responseLength: completion.length,
        usage
      });

      return {
        completion,
        model,
        usage,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        logError(correlationId, 'Anthropic API timeout', { timeoutMs: timeout });
        throw new Error(`AI request timed out after ${timeout}ms`);
      }

      logError(correlationId, 'Anthropic API request failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

/**
 * OpenAI GPT provider
 */
class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  async generateCompletion(
    prompt: string,
    options: AIOptions,
    correlationId: string
  ): Promise<AICompletionResult> {
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.7;
    const timeout = options.timeout || 60000;
    const model = 'gpt-4o-mini'; // Latest GPT-4o-mini

    logDebug(correlationId, 'Calling OpenAI API', {
      provider: this.name,
      model,
      maxTokens,
      temperature,
      timeoutMs: timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logError(correlationId, 'OpenAI API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        logError(correlationId, 'Invalid response format from OpenAI', { data });
        throw new Error('Invalid response format from OpenAI API');
      }

      const completion = data.choices[0].message.content;
      const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      };

      logInfo(correlationId, 'OpenAI API call successful', {
        provider: this.name,
        model,
        responseLength: completion.length,
        usage
      });

      return {
        completion,
        model,
        usage,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        logError(correlationId, 'OpenAI API timeout', { timeoutMs: timeout });
        throw new Error(`AI request timed out after ${timeout}ms`);
      }

      logError(correlationId, 'OpenAI API request failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

/**
 * Mistral AI provider
 */
class MistralProvider implements AIProvider {
  readonly name = 'mistral';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1/chat/completions';

  constructor() {
    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  async generateCompletion(
    prompt: string,
    options: AIOptions,
    correlationId: string
  ): Promise<AICompletionResult> {
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.7;
    const timeout = options.timeout || 60000;
    const model = 'mistral-small-latest'; // Mistral Small 3 - best value

    logDebug(correlationId, 'Calling Mistral API', {
      provider: this.name,
      model,
      maxTokens,
      temperature,
      timeoutMs: timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logError(correlationId, 'Mistral API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        logError(correlationId, 'Invalid response format from Mistral', { data });
        throw new Error('Invalid response format from Mistral API');
      }

      const completion = data.choices[0].message.content;
      const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      };

      logInfo(correlationId, 'Mistral API call successful', {
        provider: this.name,
        model: data.model || model,
        responseLength: completion.length,
        usage
      });

      return {
        completion,
        model: data.model || model,
        usage,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        logError(correlationId, 'Mistral API timeout', { timeoutMs: timeout });
        throw new Error(`AI request timed out after ${timeout}ms`);
      }

      logError(correlationId, 'Mistral API request failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

/**
 * Gets AI provider based on environment variable
 *
 * @param providerName - Name of provider ('anthropic' | 'openai' | 'mistral')
 * @returns AIProvider instance
 * @throws Error if provider is unknown or API key is missing
 */
export function getAIProvider(providerName?: string, correlationId?: string): AIProvider {
  const provider = providerName || Deno.env.get('AI_PROVIDER') || 'anthropic';

  logInfo(correlationId || 'init', 'Initializing AI provider', { provider });

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'mistral':
      return new MistralProvider();
    default:
      logError(correlationId || 'init', 'Unknown AI provider', { provider });
      throw new Error(`Unknown AI provider: ${provider}. Supported: anthropic, openai, mistral`);
  }
}

/**
 * Generates AI completion with automatic retry and fallback
 *
 * Retry strategy:
 * 1. Try primary provider (from AI_PROVIDER env var)
 * 2. If timeout or error, retry with exponential backoff (3 attempts)
 * 3. If all retries fail, try fallback provider (if available)
 *
 * @param prompt - The prompt to send to AI
 * @param options - AI generation options
 * @param correlationId - Correlation ID for logging
 * @returns AI completion result with usage data
 */
export async function generateAICompletion(
  prompt: string,
  options: AIOptions = {},
  correlationId: string
): Promise<AICompletionResult> {
  const maxRetries = 3;
  const initialBackoff = 1000; // 1 second

  // Get primary provider
  const primaryProviderName = Deno.env.get('AI_PROVIDER') || 'anthropic';
  let provider: AIProvider;

  try {
    provider = getAIProvider(primaryProviderName, correlationId);
  } catch (error) {
    logError(correlationId, 'Failed to initialize primary provider', {
      provider: primaryProviderName,
      error: error.message
    });
    throw error;
  }

  // Retry with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(correlationId, `AI generation attempt ${attempt}/${maxRetries}`, {
        provider: provider.name
      });

      const result = await provider.generateCompletion(prompt, options, correlationId);
      return result;

    } catch (error) {
      lastError = error;
      logWarn(correlationId, `AI generation attempt ${attempt} failed`, {
        provider: provider.name,
        attempt,
        maxRetries,
        error: error.message
      });

      if (attempt < maxRetries) {
        // Exponential backoff
        const backoffMs = initialBackoff * Math.pow(2, attempt - 1);
        logInfo(correlationId, `Retrying after backoff`, { backoffMs, nextAttempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries failed, try fallback provider if available
  const fallbackProvider = primaryProviderName === 'anthropic' ? 'openai' : 'anthropic';
  const fallbackKeyExists = Deno.env.get(
    fallbackProvider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
  );

  if (fallbackKeyExists) {
    logWarn(correlationId, 'Primary provider failed, trying fallback', {
      primary: primaryProviderName,
      fallback: fallbackProvider
    });

    try {
      const fallbackProviderInstance = getAIProvider(fallbackProvider, correlationId);
      const result = await fallbackProviderInstance.generateCompletion(prompt, options, correlationId);

      logInfo(correlationId, 'Fallback provider succeeded', { provider: fallbackProvider });
      return result;

    } catch (fallbackError) {
      logError(correlationId, 'Fallback provider also failed', {
        provider: fallbackProvider,
        error: fallbackError.message
      });
    }
  }

  // Everything failed
  logError(correlationId, 'All AI generation attempts failed', {
    primaryProvider: primaryProviderName,
    attempts: maxRetries,
    lastError: lastError?.message
  });

  throw new Error(`AI generation failed after ${maxRetries} attempts: ${lastError?.message}`);
}
