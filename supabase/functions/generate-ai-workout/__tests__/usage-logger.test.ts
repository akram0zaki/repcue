/**
 * Unit Tests for AI Usage Logger
 *
 * Tests cost calculation, pricing accuracy, and usage extraction
 * for all supported AI providers.
 */

import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import {
  calculateCost,
  extractMistralUsage,
  extractAnthropicUsage,
  extractOpenAIUsage,
  PRICING_TABLE,
  type TokenUsage,
} from '../usage-logger.ts';

// ============================================================================
// Cost Calculation Tests
// ============================================================================

Deno.test('calculateCost - Mistral Large pricing', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('mistral', 'mistral-large-latest', usage, 'test-correlation-id');

  // $3 per 1M input = 10000/1000000 * 3 = $0.030
  // $9 per 1M output = 500/1000000 * 9 = $0.0045
  assertEquals(cost.input_cost_usd, 0.03);
  assertEquals(cost.output_cost_usd, 0.0045);
  assertEquals(cost.total_cost_usd, 0.0345);
});

Deno.test('calculateCost - Mistral Small pricing', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('mistral', 'mistral-small-latest', usage, 'test-correlation-id');

  // $0.20 per 1M input = 10000/1000000 * 0.20 = $0.002
  // $0.60 per 1M output = 500/1000000 * 0.60 = $0.0003
  assertEquals(cost.input_cost_usd, 0.002);
  assertEquals(cost.output_cost_usd, 0.0003);
  assertEquals(cost.total_cost_usd, 0.0023);
});

Deno.test('calculateCost - Anthropic Claude Sonnet pricing', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('anthropic', 'claude-3-5-sonnet-20241022', usage, 'test-correlation-id');

  // $3 per 1M input = 10000/1000000 * 3 = $0.030
  // $15 per 1M output = 500/1000000 * 15 = $0.0075
  assertEquals(cost.input_cost_usd, 0.03);
  assertEquals(cost.output_cost_usd, 0.0075);
  assertEquals(cost.total_cost_usd, 0.0375);
});

Deno.test('calculateCost - Anthropic Claude Haiku pricing (cheapest)', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('anthropic', 'claude-3-haiku-20240307', usage, 'test-correlation-id');

  // $0.25 per 1M input = 10000/1000000 * 0.25 = $0.0025
  // $1.25 per 1M output = 500/1000000 * 1.25 = $0.000625
  assertEquals(cost.input_cost_usd, 0.0025);
  assertEquals(cost.output_cost_usd, 0.000625);
  assertEquals(cost.total_cost_usd, 0.003125);
});

Deno.test('calculateCost - OpenAI GPT-4o-mini pricing', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('openai', 'gpt-4o-mini', usage, 'test-correlation-id');

  // $0.15 per 1M input = 10000/1000000 * 0.15 = $0.0015
  // $0.60 per 1M output = 500/1000000 * 0.60 = $0.0003
  assertEquals(cost.input_cost_usd, 0.0015);
  assertEquals(cost.output_cost_usd, 0.0003);
  assertEquals(cost.total_cost_usd, 0.0018);
});

Deno.test('calculateCost - OpenAI GPT-4o pricing', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('openai', 'gpt-4o', usage, 'test-correlation-id');

  // $5 per 1M input = 10000/1000000 * 5 = $0.050
  // $15 per 1M output = 500/1000000 * 15 = $0.0075
  assertEquals(cost.input_cost_usd, 0.05);
  assertEquals(cost.output_cost_usd, 0.0075);
  assertEquals(cost.total_cost_usd, 0.0575);
});

Deno.test('calculateCost - Unknown model defaults to $0', () => {
  const usage: TokenUsage = {
    input_tokens: 10000,
    output_tokens: 500,
    total_tokens: 10500,
  };

  const cost = calculateCost('unknown-provider', 'unknown-model', usage, 'test-correlation-id');

  assertEquals(cost.input_cost_usd, 0);
  assertEquals(cost.output_cost_usd, 0);
  assertEquals(cost.total_cost_usd, 0);
});

Deno.test('calculateCost - Zero tokens', () => {
  const usage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  const cost = calculateCost('mistral', 'mistral-large-latest', usage, 'test-correlation-id');

  assertEquals(cost.input_cost_usd, 0);
  assertEquals(cost.output_cost_usd, 0);
  assertEquals(cost.total_cost_usd, 0);
});

Deno.test('calculateCost - Large token counts', () => {
  const usage: TokenUsage = {
    input_tokens: 1_000_000, // 1M tokens
    output_tokens: 100_000, // 100K tokens
    total_tokens: 1_100_000,
  };

  const cost = calculateCost('mistral', 'mistral-large-latest', usage, 'test-correlation-id');

  // $3 per 1M input = 1M/1M * 3 = $3
  // $9 per 1M output = 100K/1M * 9 = $0.90
  assertEquals(cost.input_cost_usd, 3.0);
  assertEquals(cost.output_cost_usd, 0.9);
  assertEquals(cost.total_cost_usd, 3.9);
});

// ============================================================================
// Usage Extraction Tests
// ============================================================================

Deno.test('extractMistralUsage - Valid response', () => {
  const mockResponse = {
    usage: {
      prompt_tokens: 12345,
      completion_tokens: 678,
      total_tokens: 13023,
    },
  };

  const usage = extractMistralUsage(mockResponse);

  assertEquals(usage.input_tokens, 12345);
  assertEquals(usage.output_tokens, 678);
  assertEquals(usage.total_tokens, 13023);
});

Deno.test('extractMistralUsage - Missing usage field', () => {
  const mockResponse = {};

  const usage = extractMistralUsage(mockResponse);

  assertEquals(usage.input_tokens, 0);
  assertEquals(usage.output_tokens, 0);
  assertEquals(usage.total_tokens, 0);
});

Deno.test('extractAnthropicUsage - Valid response', () => {
  const mockResponse = {
    usage: {
      input_tokens: 12345,
      output_tokens: 678,
    },
  };

  const usage = extractAnthropicUsage(mockResponse);

  assertEquals(usage.input_tokens, 12345);
  assertEquals(usage.output_tokens, 678);
  assertEquals(usage.total_tokens, 13023); // Sum of input + output
});

Deno.test('extractAnthropicUsage - Missing usage field', () => {
  const mockResponse = {};

  const usage = extractAnthropicUsage(mockResponse);

  assertEquals(usage.input_tokens, 0);
  assertEquals(usage.output_tokens, 0);
  assertEquals(usage.total_tokens, 0);
});

Deno.test('extractOpenAIUsage - Valid response', () => {
  const mockResponse = {
    usage: {
      prompt_tokens: 12345,
      completion_tokens: 678,
      total_tokens: 13023,
    },
  };

  const usage = extractOpenAIUsage(mockResponse);

  assertEquals(usage.input_tokens, 12345);
  assertEquals(usage.output_tokens, 678);
  assertEquals(usage.total_tokens, 13023);
});

Deno.test('extractOpenAIUsage - Missing usage field', () => {
  const mockResponse = {};

  const usage = extractOpenAIUsage(mockResponse);

  assertEquals(usage.input_tokens, 0);
  assertEquals(usage.output_tokens, 0);
  assertEquals(usage.total_tokens, 0);
});

// ============================================================================
// Pricing Table Tests
// ============================================================================

Deno.test('PRICING_TABLE - Contains all required providers', () => {
  const providers = Object.keys(PRICING_TABLE);
  assertEquals(providers.includes('mistral'), true);
  assertEquals(providers.includes('anthropic'), true);
  assertEquals(providers.includes('openai'), true);
});

Deno.test('PRICING_TABLE - Mistral models have valid pricing', () => {
  const mistralModels = Object.keys(PRICING_TABLE.mistral);
  assertEquals(mistralModels.length > 0, true);

  for (const model of mistralModels) {
    const pricing = PRICING_TABLE.mistral[model];
    assertEquals(typeof pricing.input, 'number');
    assertEquals(typeof pricing.output, 'number');
    assertEquals(pricing.input >= 0, true);
    assertEquals(pricing.output >= 0, true);
  }
});

Deno.test('PRICING_TABLE - Anthropic models have valid pricing', () => {
  const anthropicModels = Object.keys(PRICING_TABLE.anthropic);
  assertEquals(anthropicModels.length > 0, true);

  for (const model of anthropicModels) {
    const pricing = PRICING_TABLE.anthropic[model];
    assertEquals(typeof pricing.input, 'number');
    assertEquals(typeof pricing.output, 'number');
    assertEquals(pricing.input >= 0, true);
    assertEquals(pricing.output >= 0, true);
  }
});

Deno.test('PRICING_TABLE - OpenAI models have valid pricing', () => {
  const openaiModels = Object.keys(PRICING_TABLE.openai);
  assertEquals(openaiModels.length > 0, true);

  for (const model of openaiModels) {
    const pricing = PRICING_TABLE.openai[model];
    assertEquals(typeof pricing.input, 'number');
    assertEquals(typeof pricing.output, 'number');
    assertEquals(pricing.input >= 0, true);
    assertEquals(pricing.output >= 0, true);
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('calculateCost - Fractional tokens', () => {
  // Some AI providers might return fractional token counts
  const usage: TokenUsage = {
    input_tokens: 100.5,
    output_tokens: 50.75,
    total_tokens: 151.25,
  };

  const cost = calculateCost('mistral', 'mistral-small-latest', usage, 'test-correlation-id');

  // Should handle fractional tokens correctly
  assertEquals(typeof cost.input_cost_usd, 'number');
  assertEquals(typeof cost.output_cost_usd, 'number');
  assertEquals(cost.total_cost_usd > 0, true);
});

Deno.test('calculateCost - Very small costs are rounded to 6 decimal places', () => {
  const usage: TokenUsage = {
    input_tokens: 1, // 1 token
    output_tokens: 1,
    total_tokens: 2,
  };

  const cost = calculateCost('mistral', 'mistral-large-latest', usage, 'test-correlation-id');

  // $3 per 1M input = 1/1000000 * 3 = $0.000003
  assertEquals(cost.input_cost_usd, 0.000003);
  assertEquals(cost.output_cost_usd, 0.000009); // 1/1M * 9
  assertEquals(cost.total_cost_usd, 0.000012);
});
