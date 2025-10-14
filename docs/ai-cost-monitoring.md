# AI Cost Analysis & Monitoring (Module 2.8.3)

**Last Updated**: October 15, 2025  
**Purpose**: Monitor, analyze, and optimize AI API costs for RepCue

---

## Cost Overview

### Current Pricing (Mistral AI)
| Model | Input | Output | Context |
|-------|-------|--------|---------|
| **mistral-large-latest** | $2 / 1M tokens | $6 / 1M tokens | 128K tokens |
| **mistral-small-latest** | $0.2 / 1M tokens | $0.6 / 1M tokens | 128K tokens |

### Estimated Usage per Feature
| Feature | Tokens/Request | Model | Cost/Request |
|---------|----------------|-------|--------------|
| AI Workout Generation | ~3,000 | Large | $0.024 |
| AI Coach Insights | ~2,500 | Large | $0.020 |
| Workout Suggestions | ~1,500 | Small | $0.0012 |

---

## Current Implementation

### 1. AI Usage Logs (Supabase)

**Table Schema** (`ai_usage_logs`):
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  feature TEXT NOT NULL, -- 'ai-workout', 'ai-coach', etc.
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cached BOOLEAN DEFAULT FALSE,
  error TEXT
);

-- Indexes for efficient queries
CREATE INDEX idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_feature_created ON ai_usage_logs(feature, created_at DESC);
CREATE INDEX idx_ai_usage_logs_created ON ai_usage_logs(created_at DESC);
```

**RLS Policies**:
- Users can view their own usage logs
- Service role can view all logs for admin dashboard

### 2. Usage Tracking in Edge Functions

**Example from `ai-workout-generator/index.ts`**:
```typescript
// Log AI usage
await supabase.from('ai_usage_logs').insert({
  user_id: user.id,
  feature: 'ai-workout',
  model: MODEL,
  prompt_tokens: usage.prompt_tokens,
  completion_tokens: usage.completion_tokens,
  total_tokens: usage.total_tokens,
  cost_usd: calculateCost(usage, MODEL),
  cached: false
});

function calculateCost(usage: any, model: string): number {
  const pricing = {
    'mistral-large-latest': { input: 0.000002, output: 0.000006 },
    'mistral-small-latest': { input: 0.0000002, output: 0.0000006 }
  };
  
  const { input, output } = pricing[model] || pricing['mistral-large-latest'];
  return (usage.prompt_tokens * input) + (usage.completion_tokens * output);
}
```

### 3. Cache Hit Rate Tracking

**Implementation**:
```typescript
// In ai-coach-insights edge function
const cacheKey = `coach-insights:${userId}:${weekStart}`;
const cached = await redis.get(cacheKey);

if (cached) {
  // Log cache hit
  await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    feature: 'ai-coach',
    model: 'cache-hit',
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    cached: true
  });
  
  return cached;
}

// If not cached, call AI and cache result
```

---

## Cost Monitoring Queries

### 1. Daily Cost Breakdown

```sql
-- Total cost per day
SELECT 
  DATE(created_at) as date,
  feature,
  COUNT(*) as requests,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(cost_usd) as avg_cost_per_request
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), feature
ORDER BY date DESC, total_cost_usd DESC;
```

### 2. User Cost Distribution

```sql
-- Top 10 users by AI usage cost
SELECT 
  user_id,
  COUNT(*) as requests,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  ROUND(AVG(cost_usd)::numeric, 6) as avg_cost_per_request
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_cost_usd DESC
LIMIT 10;
```

### 3. Cache Hit Rate

```sql
-- Cache effectiveness
SELECT 
  feature,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    (SUM(CASE WHEN cached = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100,
    2
  ) as cache_hit_rate_percent,
  SUM(CASE WHEN cached = false THEN cost_usd ELSE 0 END) as actual_cost_usd,
  SUM(cost_usd) as theoretical_cost_without_cache_usd
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature
ORDER BY cache_hit_rate_percent DESC;
```

### 4. Cost Per User Per Month

```sql
-- Average monthly cost per active user
WITH monthly_costs AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    user_id,
    SUM(cost_usd) as user_cost
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '6 months'
    AND user_id IS NOT NULL
  GROUP BY DATE_TRUNC('month', created_at), user_id
)
SELECT 
  month,
  COUNT(DISTINCT user_id) as active_users,
  SUM(user_cost) as total_cost,
  AVG(user_cost) as avg_cost_per_user,
  MAX(user_cost) as max_user_cost
FROM monthly_costs
GROUP BY month
ORDER BY month DESC;
```

### 5. Feature Usage Comparison

```sql
-- Compare AI features by usage and cost
SELECT 
  feature,
  COUNT(*) as total_requests,
  AVG(total_tokens) as avg_tokens_per_request,
  AVG(cost_usd) as avg_cost_per_request,
  SUM(cost_usd) as total_cost_usd,
  MIN(created_at) as first_used,
  MAX(created_at) as last_used
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature
ORDER BY total_cost_usd DESC;
```

### 6. Error Rate Monitoring

```sql
-- Track AI errors and their impact
SELECT 
  feature,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors,
  ROUND(
    (SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100,
    2
  ) as error_rate_percent,
  array_agg(DISTINCT error) FILTER (WHERE error IS NOT NULL) as error_types
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY error_rate_percent DESC;
```

---

## Cost Dashboards

### 1. Supabase Dashboard View

**Create View** (`ai_usage_views.sql`):
```sql
-- Daily cost summary view
CREATE OR REPLACE VIEW daily_ai_costs AS
SELECT 
  DATE(created_at) as date,
  feature,
  model,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  ROUND(SUM(cost_usd)::numeric, 4) as cost_usd,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits
FROM ai_usage_logs
GROUP BY DATE(created_at), feature, model
ORDER BY date DESC;

-- Weekly cost rollup
CREATE OR REPLACE VIEW weekly_ai_costs AS
SELECT 
  DATE_TRUNC('week', created_at) as week_start,
  feature,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  ROUND(SUM(cost_usd)::numeric, 2) as cost_usd,
  ROUND(
    (SUM(CASE WHEN cached THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100,
    2
  ) as cache_hit_rate
FROM ai_usage_logs
GROUP BY DATE_TRUNC('week', created_at), feature
ORDER BY week_start DESC;
```

### 2. Frontend Cost Dashboard (Future)

**Component Structure** (`apps/frontend/src/pages/AdminCostDashboard.tsx`):
```typescript
interface CostMetrics {
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  requestCount: number;
  cacheHitRate: number;
  avgCostPerRequest: number;
  topFeatures: Array<{
    feature: string;
    cost: number;
    requests: number;
  }>;
}

export function AdminCostDashboard() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  
  // Fetch cost metrics from Supabase
  useEffect(() => {
    async function fetchMetrics() {
      const { data } = await supabase
        .from('daily_ai_costs')
        .select('*')
        .gte('date', getStartDate(dateRange));
      
      // Aggregate and calculate metrics
      setMetrics(calculateMetrics(data));
    }
    
    fetchMetrics();
  }, [dateRange]);
  
  return (
    <div className="cost-dashboard">
      <h1>AI Cost Monitoring</h1>
      
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard 
          title="Daily Cost" 
          value={`$${metrics?.dailyCost.toFixed(2)}`}
          trend={calculateTrend(metrics?.dailyCost)}
        />
        <MetricCard 
          title="Cache Hit Rate" 
          value={`${metrics?.cacheHitRate.toFixed(1)}%`}
          target={70}
        />
        {/* More metric cards... */}
      </div>
      
      {/* Cost Chart */}
      <CostChart data={metrics} />
      
      {/* Feature Breakdown */}
      <FeatureBreakdownTable features={metrics?.topFeatures} />
    </div>
  );
}
```

---

## Cost Optimization Strategies

### 1. Caching Strategy

**Current Implementation**:
- ✅ 24-hour cache for AI coach insights
- ✅ Weekly cache for workout generation suggestions
- ⏳ Per-user cache for personalized insights

**Target**: >70% cache hit rate

**Improvements**:
```typescript
// Implement smarter cache invalidation
const CACHE_DURATION = {
  'ai-coach': 24 * 60 * 60,      // 24 hours
  'ai-workout': 7 * 24 * 60 * 60, // 7 days
  'suggestions': 12 * 60 * 60     // 12 hours
};

// Cache key should include relevant context
const cacheKey = `${feature}:${userId}:${contextHash}`;

// Implement cache warming for popular requests
async function warmCache() {
  // Pre-generate insights for active users
  const activeUsers = await getActiveUsers();
  for (const user of activeUsers) {
    await generateInsights(user.id); // Will be cached
  }
}
```

### 2. Model Selection

**Strategy**:
- Use `mistral-small-latest` for simple tasks (10x cheaper)
- Use `mistral-large-latest` only for complex reasoning

**Implementation**:
```typescript
function selectModel(task: string): string {
  const complexTasks = [
    'workout-generation',
    'detailed-coaching',
    'progression-analysis'
  ];
  
  return complexTasks.includes(task)
    ? 'mistral-large-latest'
    : 'mistral-small-latest';
}
```

### 3. Prompt Optimization

**Techniques**:
- ✅ Remove unnecessary context from prompts
- ✅ Use structured output format to reduce tokens
- ⏳ Implement prompt templates for common queries

**Example**:
```typescript
// BEFORE (inefficient)
const prompt = `You are a fitness coach. Given the following user data:
${JSON.stringify(userData, null, 2)}

And the following workout history:
${JSON.stringify(workoutHistory, null, 2)}

Please provide insights about their progress.`;

// AFTER (optimized)
const prompt = `Analyze fitness data:
User: ${user.id}, Goal: ${user.goal}
Workouts (7d): ${workoutHistory.length}
Top exercises: ${topExercises.join(', ')}
Provide 3 key insights.`;
```

### 4. Rate Limiting

**Implementation**:
```typescript
// Per-user rate limits
const RATE_LIMITS = {
  'ai-workout': { max: 10, window: 24 * 60 * 60 },   // 10/day
  'ai-coach': { max: 5, window: 24 * 60 * 60 },      // 5/day
  'suggestions': { max: 20, window: 24 * 60 * 60 }   // 20/day
};

async function checkRateLimit(userId: string, feature: string): Promise<boolean> {
  const limit = RATE_LIMITS[feature];
  const windowStart = new Date(Date.now() - limit.window * 1000);
  
  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', windowStart.toISOString());
  
  return (count || 0) < limit.max;
}
```

### 5. Batch Processing

**Strategy**: Process multiple requests in a single AI call when possible

```typescript
// Instead of 3 separate calls
const workout1 = await generateWorkout(user, 'chest');
const workout2 = await generateWorkout(user, 'back');
const workout3 = await generateWorkout(user, 'legs');

// Single batch call
const workouts = await generateWorkoutBatch(user, ['chest', 'back', 'legs']);
```

---

## Cost Alerts & Thresholds

### Alert Configuration

```typescript
interface CostAlert {
  name: string;
  threshold: number;
  window: string; // '1h', '24h', '7d', '30d'
  action: 'email' | 'slack' | 'disable';
}

const COST_ALERTS: CostAlert[] = [
  {
    name: 'High Daily Spend',
    threshold: 50, // $50/day
    window: '24h',
    action: 'email'
  },
  {
    name: 'Unusual Spike',
    threshold: 200, // 200% of avg
    window: '1h',
    action: 'slack'
  },
  {
    name: 'Monthly Budget',
    threshold: 1000, // $1000/month
    window: '30d',
    action: 'email'
  },
  {
    name: 'Critical Overspend',
    threshold: 2000, // $2000/month
    window: '30d',
    action: 'disable' // Disable AI features
  }
];
```

### Monitoring Script

```sql
-- Create function to check cost thresholds
CREATE OR REPLACE FUNCTION check_cost_alerts()
RETURNS TABLE (
  alert_name TEXT,
  current_cost NUMERIC,
  threshold NUMERIC,
  exceeded BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Daily Cost' as alert_name,
    SUM(cost_usd) as current_cost,
    50::numeric as threshold,
    SUM(cost_usd) > 50 as exceeded
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'Monthly Cost' as alert_name,
    SUM(cost_usd) as current_cost,
    1000::numeric as threshold,
    SUM(cost_usd) > 1000 as exceeded
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## Budget Planning

### Estimated Costs (Monthly)

**Assumptions**:
- 1,000 active users
- 20% use AI features regularly
- Average 5 AI requests per active AI user per month

**Calculation**:
```
Active AI Users: 1,000 × 20% = 200 users
Total Requests: 200 users × 5 requests = 1,000 requests/month

Feature Breakdown:
- AI Workouts (40%): 400 requests × $0.024 = $9.60
- AI Coach (40%): 400 requests × $0.020 = $8.00
- Suggestions (20%): 200 requests × $0.0012 = $0.24

Total Monthly Cost: $17.84
Cost per Active AI User: $0.089
Cost per Total User: $0.018

With 70% cache hit rate:
Actual Cost: $17.84 × 30% = $5.35/month
```

**Projected Costs by User Base**:
| Users | Active AI Users | Monthly Cost (no cache) | Monthly Cost (70% cache) |
|-------|----------------|------------------------|-------------------------|
| 100 | 20 | $1.78 | $0.54 |
| 1,000 | 200 | $17.84 | $5.35 |
| 10,000 | 2,000 | $178.40 | $53.52 |
| 100,000 | 20,000 | $1,784.00 | $535.20 |

---

## Reporting & Analytics

### Weekly Report (Automated Email)

**Template**:
```
AI Cost Weekly Summary
Period: Oct 8-14, 2025

💰 Cost Overview:
- Total Spend: $12.50 (-15% vs last week)
- Daily Average: $1.79
- Requests: 625 (-8% vs last week)
- Average Cost/Request: $0.020

📊 Feature Breakdown:
1. AI Workouts: $7.20 (58%), 300 requests
2. AI Coach: $4.80 (38%), 240 requests
3. Suggestions: $0.50 (4%), 85 requests

🎯 Performance:
- Cache Hit Rate: 72% (target: 70%) ✅
- Error Rate: 2.1% (target: <5%) ✅
- Avg Response Time: 1.2s

🔝 Top Users (by cost):
1. User ABC: $0.45 (18 requests)
2. User XYZ: $0.38 (15 requests)
3. User DEF: $0.35 (14 requests)

⚠️ Alerts: None

Next Steps: Continue monitoring cache effectiveness
```

### Monthly Business Review

**Key Metrics**:
1. Total AI cost trend
2. Cost per active user trend
3. Cache hit rate optimization progress
4. ROI analysis (user retention impact)
5. Feature usage patterns

---

## Next Steps

### Immediate (Module 2.8.3 Completion)
- [x] Document existing usage logging system
- [x] Create cost analysis queries
- [x] Define optimization strategies
- [ ] Run baseline cost analysis on production data
- [ ] Set up cost alert thresholds

### Short Term (1-2 weeks)
- [ ] Implement automated weekly cost reports
- [ ] Create admin cost dashboard UI
- [ ] Set up Slack/email alerts for cost thresholds
- [ ] Test and optimize cache hit rate

### Long Term (1-3 months)
- [ ] Implement model selection based on task complexity
- [ ] Add prompt optimization for token reduction
- [ ] Build cost forecasting model
- [ ] Explore alternative AI providers for cost comparison

---

**Note**: Update this document monthly with actual cost data and optimization results.
