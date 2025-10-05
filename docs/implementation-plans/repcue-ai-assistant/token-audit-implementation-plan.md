# Implementation Plan: AI Token Usage Tracking & Cost Monitoring

**Feature Name:** AI Token Usage Tracking
**Related Feature:** RepCue AI Assistant
**PRD Reference:** `docs/implementation-plans/repcue-ai-assistant/ai-assisted-workouts-prd.md`
**Status:** Ready for Implementation
**Created:** 2025-10-05
**Estimated Duration:** 4-6 hours

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Tasks](#implementation-tasks)
4. [Database Schema](#database-schema)
5. [Edge Function Integration](#edge-function-integration)
6. [Query Examples](#query-examples)
7. [Testing Plan](#testing-plan)
8. [Deployment Plan](#deployment-plan)
9. [Monitoring & Alerts](#monitoring--alerts)

---

## Overview

### Problem Statement
The RepCue AI Assistant uses Mistral AI API to generate personalized workout plans. Currently, there is **no visibility** into:
- Number of tokens consumed per request (input/output)
- Accumulated token usage over time
- Cost per request and total costs
- Usage patterns and trends

This makes it impossible to:
- Monitor AI API spending
- Identify cost optimization opportunities
- Detect anomalous usage
- Budget for scale

### Solution
Implement **server-side token usage tracking** by:
1. Creating a database table (`ai_usage_logs`) to store per-request token counts and costs
2. Instrumenting the Edge Function to log usage after each Mistral API call
3. Creating SQL views for aggregated insights (daily, monthly, per-user)
4. Setting up cost alerts and monitoring dashboards

### Success Criteria
- ✅ Every AI API call is logged with token counts and calculated cost
- ✅ Can query current month's total cost in real-time
- ✅ Can identify top 10 users by token consumption
- ✅ Can track daily/monthly cost trends
- ✅ Alert triggers when daily cost exceeds threshold ($10/day default)
- ✅ Zero impact on user experience (logging is non-blocking)

---

## Architecture

### Current AI Call Flow
```
User submits AI Assistant
  ↓
Edge Function: generate-ai-workout
  ↓
workout-generator.ts → generateWorkouts()
  ↓
Mistral AI API call
  ↓
Return workouts to user
```

### New Flow with Token Tracking
```
User submits AI Assistant
  ↓
Edge Function: generate-ai-workout
  ↓
workout-generator.ts → generateWorkouts()
  ↓
Mistral AI API call
  ↓
Extract token usage from API response
  ↓
Log to ai_usage_logs table (non-blocking)
  ↓
Return workouts to user
```

### Key Design Decisions

1. **Server-side only**: No client changes required
2. **Non-blocking**: Logging failures do not affect workout generation
3. **Correlation IDs**: Link usage logs to request logs for debugging
4. **Cost calculation**: Automated based on provider pricing tables
5. **Graceful degradation**: If logging fails, log error and continue

---

## Implementation Tasks

### Phase 1: Database Schema (2 hours)

#### Task 1.1: Create `ai_usage_logs` Table
**File:** `supabase/migrations/[timestamp]-create-ai-usage-logs.sql`

**Requirements:**
- Store per-request token counts (input, output, total)
- Calculate cost in USD based on provider pricing
- Link to user via `user_id` (UUID FK to `auth.users`)
- Link to request via `correlation_id` (matches Edge Function logs)
- Track provider (mistral, anthropic, openai) for multi-provider support
- Track model (mistral-large-latest, claude-3-5-sonnet-20241022, etc.)
- Store success/failure status
- Store processing time (ms)

**Indexes:**
- `user_id` (for per-user queries)
- `created_at DESC` (for time-series queries)
- `provider` (for provider comparison)
- `correlation_id` (unique, for log correlation)

**Status:** Not Started
**Estimated Time:** 1 hour

---

#### Task 1.2: Create SQL Views for Analytics
**File:** `supabase/migrations/[timestamp]-create-ai-usage-views.sql`

**Views to Create:**
1. `ai_usage_daily` - Daily aggregated usage (tokens, cost, request count)
2. `ai_usage_monthly` - Monthly aggregated usage
3. `ai_usage_per_user` - Per-user lifetime usage (for identifying heavy users)
4. `ai_usage_errors` - Error breakdown by date, provider, error code

**Status:** Not Started
**Estimated Time:** 1 hour

---

### Phase 2: Edge Function Instrumentation (2-3 hours)

#### Task 2.1: Add Token Usage Logging Function
**File:** `supabase/functions/generate-ai-workout/usage-logger.ts` (new file)

**Exports:**
- `logAIUsage()` - Logs token usage to database
- `calculateCost()` - Calculates cost based on provider/model pricing
- `PRICING_TABLE` - Pricing data for all supported models

**Requirements:**
- Accept token counts, provider, model, correlation ID, user ID
- Calculate cost automatically using pricing table
- Insert into `ai_usage_logs` table via Supabase client
- Handle errors gracefully (log but don't throw)
- Use service role key for database access

**Status:** Not Started
**Estimated Time:** 1.5 hours

---

#### Task 2.2: Integrate Usage Logging into Workout Generator
**File:** `supabase/functions/generate-ai-workout/workout-generator.ts` (modify)

**Changes:**
1. Import `logAIUsage` from usage-logger.ts
2. Extract token usage from Mistral API response
3. Call `logAIUsage()` after successful AI call
4. Call `logAIUsage()` for failed AI calls (if usage data available)

**Location:** `generateWorkouts()` function (lines 250-280)

**Status:** Not Started
**Estimated Time:** 1 hour

---

### Phase 3: Testing & Validation (1-2 hours)

#### Task 3.1: Unit Tests for Usage Logger
**File:** `supabase/functions/generate-ai-workout/__tests__/usage-logger.test.ts` (new)

**Test Cases:**
- Cost calculation accuracy (Mistral pricing)
- Cost calculation accuracy (Anthropic pricing)
- Cost calculation accuracy (OpenAI pricing)
- Fallback for unknown model (default to $0)
- Database insert success
- Database insert failure (graceful degradation)

**Status:** Not Started
**Estimated Time:** 1 hour

---

#### Task 3.2: Integration Testing
**Manual Tests:**
1. Submit AI Assistant request in dev environment
2. Verify `ai_usage_logs` record created
3. Verify token counts match Mistral API response
4. Verify cost calculation is accurate
5. Verify correlation ID matches Edge Function logs
6. Test with failed AI request (verify error logged)

**Status:** Not Started
**Estimated Time:** 30 minutes

---

#### Task 3.3: Query Validation
**Tests:**
1. Query current month total cost
2. Query daily usage for last 30 days
3. Query top 10 users by cost
4. Query error rate by provider
5. Verify all views return correct data

**Status:** Not Started
**Estimated Time:** 30 minutes

---

### Phase 4: Documentation & Deployment (30 minutes)

#### Task 4.1: Update Migration Tracking
**File:** `docs/migration-tracking/supabase-changes_20251005.md`

**Add Section:**
- Database changes (table + views)
- Edge Function changes (usage-logger.ts, workout-generator.ts)
- Query examples
- Monitoring queries

**Status:** Not Started
**Estimated Time:** 15 minutes

---

#### Task 4.2: Deploy to Development
**Steps:**
1. Apply migrations to dev database
2. Deploy updated Edge Function to dev
3. Run integration tests
4. Verify logs in Supabase dashboard

**Status:** Not Started
**Estimated Time:** 15 minutes

---

## Database Schema

### Table: `ai_usage_logs`

```sql
CREATE TABLE ai_usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Request identification
  correlation_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- AI provider info
  provider text NOT NULL, -- 'mistral', 'anthropic', 'openai'
  model text NOT NULL, -- 'mistral-large-latest', etc.

  -- Token usage (from AI API response)
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  total_tokens integer NOT NULL,

  -- Cost calculation (USD)
  input_cost_usd numeric(10, 6) NOT NULL,
  output_cost_usd numeric(10, 6) NOT NULL,
  total_cost_usd numeric(10, 6) NOT NULL,

  -- Request metadata
  request_type text DEFAULT 'workout_generation',
  success boolean NOT NULL,
  error_code text,

  -- Performance
  processing_time_ms integer NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT ai_usage_logs_correlation_id_unique UNIQUE (correlation_id)
);

-- Indexes
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_logs_success ON ai_usage_logs(success);

-- Comments
COMMENT ON TABLE ai_usage_logs IS 'Tracks token usage and costs for all AI API calls';
COMMENT ON COLUMN ai_usage_logs.correlation_id IS 'Correlation ID from Edge Function (matches logger output)';
COMMENT ON COLUMN ai_usage_logs.total_cost_usd IS 'Total cost in USD based on provider pricing';
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for Edge Function inserts)
CREATE POLICY "Service role has full access"
  ON ai_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users cannot access this table directly (admin-only via service role)
-- No user-facing policies
```

---

## Edge Function Integration

### New File: `usage-logger.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logInfo, logError, logWarn } from './logger.ts';

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface CostBreakdown {
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

// Pricing per million tokens (update as providers change pricing)
// Source: https://mistral.ai/pricing, https://anthropic.com/pricing, https://openai.com/pricing
const PRICING_TABLE: Record<string, Record<string, { input: number; output: number }>> = {
  'mistral': {
    'mistral-large-latest': { input: 3.00, output: 9.00 }, // $3/$9 per 1M tokens
    'mistral-small-latest': { input: 0.20, output: 0.60 },
    'open-mistral-7b': { input: 0.10, output: 0.10 },
  },
  'anthropic': {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  'openai': {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
  },
};

/**
 * Calculate cost based on provider, model, and token usage
 */
export function calculateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
  correlationId: string
): CostBreakdown {
  const pricing = PRICING_TABLE[provider]?.[model];

  if (!pricing) {
    logWarn(correlationId, `Unknown pricing for ${provider}/${model}, defaulting to $0`, {
      provider,
      model,
    });
    return { input_cost_usd: 0, output_cost_usd: 0, total_cost_usd: 0 };
  }

  const input_cost_usd = (usage.input_tokens / 1_000_000) * pricing.input;
  const output_cost_usd = (usage.output_tokens / 1_000_000) * pricing.output;
  const total_cost_usd = input_cost_usd + output_cost_usd;

  return {
    input_cost_usd: parseFloat(input_cost_usd.toFixed(6)),
    output_cost_usd: parseFloat(output_cost_usd.toFixed(6)),
    total_cost_usd: parseFloat(total_cost_usd.toFixed(6)),
  };
}

/**
 * Log AI usage to database
 * Non-blocking: errors are logged but not thrown
 */
export async function logAIUsage(params: {
  correlationId: string;
  userId: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  processingTimeMs: number;
  success: boolean;
  errorCode?: string;
}): Promise<void> {
  const { correlationId, userId, provider, model, usage, processingTimeMs, success, errorCode } = params;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logError(correlationId, 'Missing Supabase credentials for usage logging', {});
      return; // Fail silently
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const costs = calculateCost(provider, model, usage, correlationId);

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
      request_type: 'workout_generation',
      success,
      error_code: errorCode || null,
      processing_time_ms: processingTimeMs,
    });

    if (error) {
      logError(correlationId, 'Failed to log AI usage', { error: error.message });
      // Don't throw - usage logging should not block workout generation
    } else {
      logInfo(correlationId, 'AI usage logged successfully', {
        tokens: usage.total_tokens,
        cost_usd: costs.total_cost_usd,
        provider,
        model,
      });
    }
  } catch (e) {
    logError(correlationId, 'Exception while logging AI usage', { error: e.message });
    // Continue execution - usage logging is non-critical
  }
}
```

### Modified File: `workout-generator.ts`

**Add imports:**
```typescript
import { logAIUsage } from './usage-logger.ts';
```

**Modify `generateWorkouts()` function:**
```typescript
export async function generateWorkouts(
  request: AIWorkoutRequest,
  userId: string,
  correlationId: string
): Promise<GeneratedWorkout[]> {
  const startTime = Date.now();

  try {
    // ... existing code to build prompt ...

    // Call Mistral API
    const aiResponse = await callMistralAPI(prompt, correlationId);

    // Extract token usage from response
    const usage: TokenUsage = {
      input_tokens: aiResponse.usage?.prompt_tokens || 0,
      output_tokens: aiResponse.usage?.completion_tokens || 0,
      total_tokens: aiResponse.usage?.total_tokens || 0,
    };

    const processingTimeMs = Date.now() - startTime;

    // Log successful usage (non-blocking)
    await logAIUsage({
      correlationId,
      userId,
      provider: 'mistral',
      model: aiResponse.model || 'mistral-large-latest',
      usage,
      processingTimeMs,
      success: true,
    });

    // ... existing code to parse and return workouts ...

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    // Log failed usage if we have token counts
    if (error.usage) {
      await logAIUsage({
        correlationId,
        userId,
        provider: 'mistral',
        model: error.model || 'mistral-large-latest',
        usage: {
          input_tokens: error.usage.prompt_tokens || 0,
          output_tokens: error.usage.completion_tokens || 0,
          total_tokens: error.usage.total_tokens || 0,
        },
        processingTimeMs,
        success: false,
        errorCode: error.code || 'UNKNOWN_ERROR',
      });
    }

    throw error;
  }
}
```

---

## Query Examples

### Current Month Total Cost
```sql
SELECT SUM(total_cost_usd) AS month_to_date_cost
FROM ai_usage_logs
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND success = true;
```

### Average Tokens Per Request (Last 7 Days)
```sql
SELECT
  AVG(input_tokens) AS avg_input_tokens,
  AVG(output_tokens) AS avg_output_tokens,
  AVG(total_tokens) AS avg_total_tokens,
  AVG(total_cost_usd) AS avg_cost_per_request
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND success = true;
```

### Top 10 Costliest Users (All Time)
```sql
SELECT
  u.email,
  COUNT(*) AS total_requests,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  AVG(total_cost_usd) AS avg_cost_per_request
FROM ai_usage_logs l
LEFT JOIN auth.users u ON u.id = l.user_id
WHERE l.success = true
GROUP BY u.email
ORDER BY total_cost_usd DESC
LIMIT 10;
```

### Daily Cost Trend (Last 30 Days)
```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_requests,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost_usd
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND success = true
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Success Rate by Provider
```sql
SELECT
  provider,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_percent
FROM ai_usage_logs
GROUP BY provider;
```

### Error Breakdown (Last 7 Days)
```sql
SELECT
  DATE(created_at) AS date,
  provider,
  error_code,
  COUNT(*) AS error_count
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND success = false
GROUP BY DATE(created_at), provider, error_code
ORDER BY date DESC, error_count DESC;
```

---

## Testing Plan

### Unit Tests

**File:** `supabase/functions/generate-ai-workout/__tests__/usage-logger.test.ts`

```typescript
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { calculateCost } from '../usage-logger.ts';

Deno.test('calculateCost - Mistral Large pricing', () => {
  const usage = { input_tokens: 10000, output_tokens: 500, total_tokens: 10500 };
  const cost = calculateCost('mistral', 'mistral-large-latest', usage, 'test-correlation-id');

  // $3 per 1M input = $0.030, $9 per 1M output = $0.0045
  assertEquals(cost.input_cost_usd, 0.03);
  assertEquals(cost.output_cost_usd, 0.0045);
  assertEquals(cost.total_cost_usd, 0.0345);
});

Deno.test('calculateCost - Unknown model defaults to $0', () => {
  const usage = { input_tokens: 10000, output_tokens: 500, total_tokens: 10500 };
  const cost = calculateCost('unknown-provider', 'unknown-model', usage, 'test-correlation-id');

  assertEquals(cost.total_cost_usd, 0);
});

Deno.test('calculateCost - Anthropic Claude pricing', () => {
  const usage = { input_tokens: 10000, output_tokens: 500, total_tokens: 10500 };
  const cost = calculateCost('anthropic', 'claude-3-5-sonnet-20241022', usage, 'test-correlation-id');

  // $3 per 1M input = $0.030, $15 per 1M output = $0.0075
  assertEquals(cost.input_cost_usd, 0.03);
  assertEquals(cost.output_cost_usd, 0.0075);
  assertEquals(cost.total_cost_usd, 0.0375);
});
```

### Integration Tests

**Manual Testing Checklist:**

1. **Submit AI Assistant Request:**
   - Login as test user (akramz@gmail.com)
   - Submit AI Assistant flow (all 3 screens)
   - Verify workout generation succeeds

2. **Check `ai_usage_logs` Table:**
   ```sql
   SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 1;
   ```
   - Verify record exists
   - Verify `correlation_id` matches Edge Function logs
   - Verify `user_id` matches logged-in user
   - Verify `provider = 'mistral'`
   - Verify `success = true`
   - Verify token counts > 0
   - Verify cost > 0

3. **Test Failed Request:**
   - Force AI API error (invalid API key)
   - Verify error is logged with `success = false`

4. **Query Views:**
   ```sql
   SELECT * FROM ai_usage_daily ORDER BY date DESC LIMIT 7;
   SELECT * FROM ai_usage_monthly ORDER BY month DESC LIMIT 3;
   SELECT * FROM ai_usage_per_user LIMIT 10;
   ```
   - Verify all views return data

---

## Deployment Plan

### Phase 1: Development Environment

1. **Write Migrations to Workspace:**
   ```bash
   # Create migration files in workspace
   # File 1: supabase/migrations/[timestamp]-create-ai-usage-logs.sql
   # File 2: supabase/migrations/[timestamp]-create-ai-usage-views.sql
   ```

2. **Apply Migrations to Dev Database:**
   ```bash
   npx supabase db push
   ```

3. **Write Edge Function Changes to Workspace:**
   ```bash
   # Create usage-logger.ts
   # Modify workout-generator.ts
   ```

4. **Deploy Edge Function to Dev:**
   ```bash
   npx supabase functions deploy generate-ai-workout
   ```

5. **Run Integration Tests** (see Testing Plan above)

6. **Update Migration Tracking:**
   - Edit `docs/migration-tracking/supabase-changes_20251005.md`
   - Add section for AI Usage Tracking
   - Document table, views, Edge Function changes

### Phase 2: Production Environment

1. **Verify Dev Environment:**
   - All tests passing
   - Logging working correctly
   - No performance impact

2. **Apply Migrations to Production:**
   ```bash
   npx supabase link --project-ref zumzzuvfsuzvvymhpymk
   npx supabase db push
   ```

3. **Deploy Edge Function to Production:**
   ```bash
   npx supabase functions deploy generate-ai-workout --project-ref zumzzuvfsuzvvymhpymk
   ```

4. **Smoke Test:**
   - Submit AI Assistant request on production
   - Verify usage logged correctly
   - Monitor logs for errors

5. **Set Up Monitoring** (see next section)

---

## Monitoring & Alerts

### Daily Cost Alert

**Create SQL Function:**
```sql
CREATE OR REPLACE FUNCTION check_daily_ai_cost()
RETURNS void AS $$
DECLARE
  daily_cost numeric;
  threshold numeric := 10.00; -- $10/day threshold
BEGIN
  SELECT SUM(total_cost_usd)
  INTO daily_cost
  FROM ai_usage_logs
  WHERE created_at >= CURRENT_DATE
    AND success = true;

  IF daily_cost > threshold THEN
    RAISE WARNING 'Daily AI cost exceeded threshold: $% (threshold: $%)', daily_cost, threshold;
    -- TODO: Integrate with notification service (email, Slack)
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Schedule Daily Check (via Supabase Cron):**
```sql
-- Run daily at 23:00 UTC
SELECT cron.schedule(
  'check-daily-ai-cost',
  '0 23 * * *',
  $$SELECT check_daily_ai_cost()$$
);
```

### Grafana Dashboard (Future Enhancement)

**Metrics to Track:**
- Daily cost (line chart)
- Monthly cost (bar chart)
- Requests per day (line chart)
- Success rate (gauge)
- Top users by cost (table)
- Average tokens per request (line chart)

### Supabase Dashboard Queries

**Save as Bookmarks:**
1. Current month cost
2. Today's cost
3. Top 10 users
4. Error rate (last 7 days)
5. Daily trend (last 30 days)

---

## Cost Estimation

### Mistral Large Pricing
- Input: $3 per 1M tokens
- Output: $9 per 1M tokens

### Expected Usage per Request
- **Input tokens**: ~10,000 (prompt + exercise catalog)
- **Output tokens**: ~500 (workout JSON)
- **Cost per request**: ~$0.035

### Monthly Projections

| Daily Requests | Daily Cost | Monthly Cost (30 days) |
|----------------|------------|------------------------|
| 10             | $0.35      | $10.50                 |
| 50             | $1.75      | $52.50                 |
| 100            | $3.50      | $105.00                |
| 500            | $17.50     | $525.00                |
| 1000           | $35.00     | $1,050.00              |

### Cost Optimization Strategies
1. **Catalog Pruning**: Only send exercises relevant to user's catalog access
2. **Prompt Compression**: Reduce unnecessary prompt text
3. **Model Switching**: Use `mistral-small-latest` for simpler requests ($0.20/$0.60 per 1M)
4. **Caching**: Cache exercise catalog in prompt (Mistral supports prompt caching)

---

## Rollback Plan

### Database Rollback
```sql
-- Drop views
DROP VIEW IF EXISTS ai_usage_errors;
DROP VIEW IF EXISTS ai_usage_per_user;
DROP VIEW IF EXISTS ai_usage_monthly;
DROP VIEW IF EXISTS ai_usage_daily;

-- Drop table
DROP TABLE IF EXISTS ai_usage_logs;
```

### Edge Function Rollback
1. Remove `usage-logger.ts` file
2. Revert changes to `workout-generator.ts`
3. Redeploy Edge Function

---

## **CRITICAL: Change Management Protocol**

⚠️ **MUST FOLLOW THESE STEPS - NO EXCEPTIONS:**

1. **NEVER make changes directly in Supabase** (database or Edge Functions)
2. **ALWAYS write migrations to workspace first:**
   - File: `supabase/migrations/[timestamp]-[description].sql`
   - Test locally before applying to server
3. **ALWAYS write Edge Function changes to workspace first:**
   - Modify files in `supabase/functions/generate-ai-workout/`
   - Test locally before deploying
4. **ALWAYS track changes in migration tracker:**
   - File: `docs/migration-tracking/supabase-changes_20251005.md`
   - Document: table changes, Edge Function changes, deployment status
5. **Development → Production workflow:**
   - Apply to dev environment first
   - Test thoroughly
   - Update migration tracker with "Deployed to Dev" status
   - Apply to production
   - Update migration tracker with "Deployed to Production" status

**Violation of this protocol will result in:**
- Lost changes (not tracked in Git)
- Environment drift (dev/prod inconsistencies)
- Difficult rollbacks
- Audit trail gaps

---

## References

- **PRD:** [docs/implementation-plans/repcue-ai-assistant/ai-assisted-workouts-prd.md](./ai-assisted-workouts-prd.md)
- **Implementation Plan:** [docs/implementation-plans/repcue-ai-assistant/ai-assisted-workouts-implementation-plan.md](./ai-assisted-workouts-implementation-plan.md)
- **Migration Tracker:** [docs/migration-tracking/supabase-changes_20251005.md](../../migration-tracking/supabase-changes_20251005.md)
- **Mistral Pricing:** https://mistral.ai/pricing
- **Anthropic Pricing:** https://anthropic.com/pricing

---

## Next Steps

**Before Implementation:**
1. ✅ Review this plan
2. ✅ Confirm approach with team
3. ✅ Approve cost thresholds ($10/day alert)

**Implementation Order:**
1. Create migration files in workspace
2. Create usage-logger.ts in workspace
3. Modify workout-generator.ts in workspace
4. Update migration tracker
5. Apply to dev environment
6. Test thoroughly
7. Apply to production
8. Set up monitoring

**Estimated Total Time:** 4-6 hours

---

**Document Status:** Ready for Review & Approval
**Author:** Claude (RepCue AI Assistant)
**Created:** 2025-10-05
**Version:** 1.0
