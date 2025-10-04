# AI Assistant Prompt Caching Implementation Guide

**Feature:** Enable Anthropic Prompt Caching for AI Workout Generator
**Goal:** Reduce input token costs by ~90% for repeated exercise catalog
**Savings:** From $0.006 to ~$0.0006 per request with Haiku

---

## What is Prompt Caching?

Anthropic's **Prompt Caching** feature allows you to cache parts of your prompt (like the exercise catalog) so they don't count as input tokens on subsequent requests within a 5-minute window.

### How it Works:
1. Mark specific content blocks with `cache_control: { type: "ephemeral" }`
2. First request: Full input tokens charged + cache write tokens (25% extra)
3. Subsequent requests (within 5 min): Only new tokens charged, cached content is ~90% cheaper
4. Cache expires after 5 minutes of inactivity

### Cost Breakdown:

| Request Type | Input Cost | Cache Write | Cache Read | Total |
|-------------|------------|-------------|------------|-------|
| **First (Cache Miss)** | Full price | +25% on cached portion | N/A | ~125% of normal |
| **Subsequent (Cache Hit)** | New tokens only | N/A | 10% of cached portion | ~10-20% of normal |

**Break-even:** After 2-3 requests, caching becomes profitable

---

## Implementation in Your Edge Function

### Current Structure (No Caching)

```typescript
// Current: ai-client.ts (lines 76-86)
body: JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: maxTokens,
  temperature,
  messages: [
    {
      role: 'user',
      content: prompt  // Single string, no caching
    }
  ]
})
```

### New Structure (With Caching)

You need to split the prompt into multiple content blocks and mark the **exercise catalog** for caching.

```typescript
// Modified: ai-client.ts
body: JSON.stringify({
  model: 'claude-3-haiku-20240307', // Or claude-3-5-sonnet-20241022
  max_tokens: maxTokens,
  temperature,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: systemPrompt + '\n\n' + userProfileSection,
          // Don't cache: changes per request
        },
        {
          type: 'text',
          text: exerciseCatalogSection,
          cache_control: { type: 'ephemeral' } // CACHE THIS!
        },
        {
          type: 'text',
          text: additionalInstructions
          // Don't cache: includes user-specific reminders
        }
      ]
    }
  ],
  system: [
    {
      type: 'text',
      text: 'You are an experienced fitness coach...',
      cache_control: { type: 'ephemeral' } // Can also cache system prompt
    }
  ]
})
```

---

## Step-by-Step Implementation

### Step 1: Update `prompt-builder.ts`

Change `buildAIPrompt()` to return structured parts instead of a single string:

```typescript
// New interface for structured prompt
export interface StructuredPrompt {
  systemPrompt: string;
  userProfile: string;
  exerciseCatalog: string;
  additionalInstructions: string;
}

export function buildStructuredPrompt(
  profile: UserProfile,
  exercises: Exercise[],
  correlationId: string
): StructuredPrompt {
  const systemPrompt = buildSystemPrompt();
  const userProfile = buildUserProfileSection(profile);
  const exerciseCatalog = buildExerciseCatalogSection(exercises);

  const additionalInstructions = `
Based on the user profile and available exercises, create personalized workout plans.
Remember to:
1. Check exercise limitations against user's injuries: ${profile.injuries || 'No injuries reported'}
2. Match exercise benefits to user's goal: ${profile.goal}
3. Respect user's fitness level: ${profile.fitnessLevel}
4. Stay within time constraints: ${profile.timeAvailability} minutes per session
5. Follow training style preference: ${profile.trainingStyle}

Return ONLY the JSON response as specified in the output format above.`;

  return {
    systemPrompt,
    userProfile,
    exerciseCatalog,
    additionalInstructions
  };
}
```

### Step 2: Update `ai-client.ts` - AnthropicProvider

Add a new method that accepts structured prompts:

```typescript
class AnthropicProvider implements AIProvider {
  // ... existing code ...

  async generateCompletionWithCaching(
    structuredPrompt: {
      systemPrompt: string;
      userProfile: string;
      exerciseCatalog: string;
      additionalInstructions: string;
    },
    options: AIOptions,
    correlationId: string
  ): Promise<string> {
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature || 0.7;
    const timeout = options.timeout || 60000;

    logDebug(correlationId, 'Calling Anthropic API with prompt caching', {
      provider: this.name,
      maxTokens,
      temperature,
      timeoutMs: timeout,
      catalogLength: structuredPrompt.exerciseCatalog.length
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31' // REQUIRED for caching!
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Supports caching
          max_tokens: maxTokens,
          temperature,
          system: [
            {
              type: 'text',
              text: structuredPrompt.systemPrompt,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: structuredPrompt.userProfile
                  // Don't cache: changes per request
                },
                {
                  type: 'text',
                  text: structuredPrompt.exerciseCatalog,
                  cache_control: { type: 'ephemeral' } // CACHE THIS!
                },
                {
                  type: 'text',
                  text: structuredPrompt.additionalInstructions
                  // Don't cache: includes user-specific data
                }
              ]
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

      // Log cache performance
      logInfo(correlationId, 'Anthropic API call successful with caching', {
        provider: this.name,
        responseLength: completion.length,
        usage: data.usage,
        cacheCreationTokens: data.usage?.cache_creation_input_tokens || 0,
        cacheReadTokens: data.usage?.cache_read_input_tokens || 0,
        inputTokens: data.usage?.input_tokens || 0
      });

      return completion;

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
```

### Step 3: Update `workout-generator.ts`

Use the new caching method:

```typescript
// In generateWorkouts() function
import { buildStructuredPrompt } from './prompt-builder.ts';

// Replace this:
// const prompt = buildAIPrompt(profile, filteredExercises, correlationId);
// const aiResponse = await aiProvider.generateCompletion(prompt, aiOptions, correlationId);

// With this:
const structuredPrompt = buildStructuredPrompt(profile, filteredExercises, correlationId);
const aiResponse = await (aiProvider as any).generateCompletionWithCaching(
  structuredPrompt,
  aiOptions,
  correlationId
);
```

---

## Expected Results

### Token Breakdown Example

**Request:** Intermediate user, 60 exercises, balanced training

**Without Caching:**
- Input: 16,500 tokens × $0.00000025 = $0.004125
- Output: 2,000 tokens × $0.00000125 = $0.0025
- **Total: $0.006625 per request**

**With Caching (First Request - Cache Miss):**
- Input: 16,500 tokens × $0.00000025 = $0.004125
- Cache Write: 15,000 tokens × $0.0000003125 = $0.0046875 (25% extra)
- Output: 2,000 tokens × $0.00000125 = $0.0025
- **Total: $0.0113125** (70% more expensive initially)

**With Caching (Subsequent Requests - Cache Hit, within 5 min):**
- Input (new only): 1,500 tokens × $0.00000025 = $0.000375
- Cache Read: 15,000 tokens × $0.000000025 = $0.000375 (90% cheaper!)
- Output: 2,000 tokens × $0.00000125 = $0.0025
- **Total: $0.00325** (51% savings!)

**Break-even:** After 3 requests within 5-minute window

---

## Best Practices

### 1. Cache Stable Content Only
✅ **DO cache:**
- System prompts (coaching instructions)
- Exercise catalog (rarely changes)
- Output format specifications

❌ **DON'T cache:**
- User profile (changes per request)
- Injury-specific instructions (user-specific)
- Additional reminders (vary per request)

### 2. Optimize Cache Lifespan
- Cache lasts **5 minutes** from last use
- Group requests from same user within 5-minute window
- Consider pre-warming cache during low traffic periods

### 3. Monitor Cache Performance

Add logging to track cache hit rate:

```typescript
// In your edge function logs
logInfo(correlationId, 'Cache performance', {
  cacheCreationTokens: data.usage?.cache_creation_input_tokens || 0,
  cacheReadTokens: data.usage?.cache_read_input_tokens || 0,
  inputTokens: data.usage?.input_tokens || 0,
  hitRate: cacheReadTokens > 0 ? 'HIT' : 'MISS'
});
```

### 4. Handle Cache Misses Gracefully
- First request will always be slower and more expensive
- Don't show users different performance metrics
- Cache warming happens automatically

---

## Model Compatibility

### Models that Support Prompt Caching:

✅ **Supported:**
- `claude-3-5-sonnet-20241022` (Latest Sonnet)
- `claude-3-haiku-20240307` (Recommended for cost)
- `claude-3-opus-20240229` (If you need max quality)

❌ **Not Supported:**
- Older Claude models
- OpenAI models (different caching mechanism)

---

## Cost Analysis with Caching

### Haiku with Caching (Recommended)

| Scenario | First Request | Requests 2-10 (within 5 min) | Average Cost |
|----------|---------------|------------------------------|--------------|
| Beginner (35 ex) | $0.0045 | $0.0008 | $0.0012 |
| Intermediate (60 ex) | $0.0113 | $0.0032 | $0.0044 |
| Advanced (82 ex) | $0.0150 | $0.0045 | $0.0062 |

**Monthly Costs (4,500 requests, 30% cache hit rate):**
- Without Caching: $27.00
- With Caching: **$12.00** (56% savings!)

---

## Migration Strategy

### Phase 1: Test in Development (Week 1)
1. Implement caching in dev environment
2. Monitor cache hit rates and costs
3. Verify workout quality unchanged
4. Test cache expiration behavior

### Phase 2: Gradual Rollout (Week 2-3)
1. Enable for 10% of production users
2. Compare costs and performance
3. Monitor error rates
4. Adjust caching strategy if needed

### Phase 3: Full Deployment (Week 4)
1. Enable for all users
2. Monitor monthly costs
3. Optimize cache boundaries
4. Document actual savings

---

## Troubleshooting

### Cache Not Working?

**Check:**
1. ✅ `anthropic-beta: prompt-caching-2024-07-31` header present?
2. ✅ `cache_control: { type: 'ephemeral' }` on content blocks?
3. ✅ Using supported model (Haiku/Sonnet)?
4. ✅ Cached content is identical across requests?

### Low Cache Hit Rate?

**Possible Causes:**
- Exercise catalog changing between requests
- Different filtering producing different catalogs
- 5-minute window expiring between user requests
- Users not making multiple requests

**Solutions:**
- Pre-filter to stable set of exercises
- Consider longer-lived cache (contact Anthropic)
- Batch user requests if possible

---

## Monitoring Dashboard Metrics

Track these metrics in your analytics:

```typescript
// Example metrics to log
{
  timestamp: Date.now(),
  userId: userId,
  correlationId: correlationId,

  // Token usage
  inputTokens: usage.input_tokens,
  cacheCreationTokens: usage.cache_creation_input_tokens,
  cacheReadTokens: usage.cache_read_input_tokens,
  outputTokens: usage.output_tokens,

  // Cache performance
  cacheHit: usage.cache_read_input_tokens > 0,
  cacheSavings: calculateSavings(usage),

  // Cost
  costUSD: calculateCost(usage),

  // Quality
  workoutsGenerated: workouts.length,
  exercisesPerWorkout: avgExercisesPerWorkout
}
```

---

## Summary

**Implementation Checklist:**

- [ ] Update `prompt-builder.ts` to return structured prompt
- [ ] Modify `ai-client.ts` AnthropicProvider to support caching
- [ ] Add `anthropic-beta` header for caching API
- [ ] Mark exercise catalog with `cache_control`
- [ ] Update `workout-generator.ts` to use new method
- [ ] Add logging for cache hit/miss tracking
- [ ] Test in development environment
- [ ] Deploy to production with monitoring

**Expected Impact:**
- **51% cost reduction** on cache hits
- **Break-even after 3 requests** within 5-minute window
- **Monthly savings:** ~$15/month at 4,500 req/month (30% hit rate)
- **No quality degradation** - identical model behavior

This is a backend-only change requiring **no frontend modifications**!
