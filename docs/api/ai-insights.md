# AI Insights API Documentation

**Last Updated**: January 9, 2025  
**Version**: v2 (Edge Function)  
**Function Name**: `analyze-progress`

---

## Overview

The AI Insights API analyzes user workout history using Mistral AI to generate personalized coaching insights. It combines multi-factor algorithms with Large Language Model (LLM) analysis to provide progression recommendations, recovery advice, motivation, and balance suggestions.

**Key Features**:
- JWT authentication for secure, user-specific insights
- Rate limiting (100 requests/day per user)
- Response caching (5-minute TTL client-side, 24-hour TTL server-side)
- Graceful error handling with fallback support
- Structured insight format for consistent UI rendering

---

## Endpoint

### POST `/functions/v1/analyze-progress`

**Base URL (Development)**: `https://xwzrsfkzqxdybjrkkkvh.supabase.co`  
**Base URL (Production)**: `https://zumzzuvfsuzvvymhpymk.supabase.co`

**Full URL Example**:
```
https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/analyze-progress
```

---

## Authentication

**Required**: Yes (JWT Bearer token)

**Header**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**How to Obtain JWT**:
1. User must be authenticated via Supabase Auth
2. Frontend retrieves JWT from Supabase session
3. JWT is automatically included by `insightsService.ts`

**Token Validation**:
- Server validates JWT using `supabase.auth.getUser()`
- Extracts `user.id` for rate limiting and caching
- Returns `401 Unauthorized` if token is invalid or expired

---

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (JWT from Supabase Auth) |
| `Content-Type` | Yes | Must be `application/json` |
| `x-correlation-id` | No | Optional correlation ID for request tracking |

### Request Body

**Type**: `UserAnalyticsData`

```typescript
interface UserAnalyticsData {
  userId: string;                    // User ID (extracted from JWT)
  recentWorkouts: WorkoutSession[];  // Last 30 workouts (max)
  exerciseLibrary: Exercise[];       // User's exercise catalog
  timeframe: number;                 // Analysis period in days (default: 30)
}

interface WorkoutSession {
  id: string;
  date: string;                      // ISO 8601 format
  exercises: SessionExercise[];
  duration: number;                  // Total duration in seconds
}

interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  duration?: number;                 // Duration in seconds (for timed exercises)
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

**Example Request**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "recentWorkouts": [
    {
      "id": "workout-1",
      "date": "2025-01-09T10:00:00Z",
      "exercises": [
        {
          "exerciseId": "push-ups",
          "exerciseName": "Push-ups",
          "sets": 3,
          "reps": 10,
          "completed": true
        },
        {
          "exerciseId": "squats",
          "exerciseName": "Squats",
          "sets": 3,
          "reps": 15,
          "completed": true
        }
      ],
      "duration": 900
    }
  ],
  "exerciseLibrary": [
    {
      "id": "push-ups",
      "name": "Push-ups",
      "category": "strength",
      "muscleGroups": ["chest", "triceps", "shoulders"],
      "difficulty": "intermediate"
    }
  ],
  "timeframe": 30
}
```

---

## Response

### Success Response (200 OK)

**Type**: `ParsedInsights`

```typescript
interface ParsedInsights {
  insights: AIInsight[];
  overallTrend: 'improving' | 'maintaining' | 'declining';
  keyStrength: string;
  primaryRecommendation: string;
}

interface AIInsight {
  type: 'streak' | 'balance' | 'progress' | 'suggestion' | 'celebration' | 'recovery';
  title: string;                     // Max 100 characters
  message: string;                   // Max 300 characters
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionText?: string;               // Call-to-action text (if actionable)
  data?: Record<string, any>;        // Additional structured data
}
```

**Example Response**:
```json
{
  "insights": [
    {
      "type": "progress",
      "title": "Ready for More Reps!",
      "message": "You've completed 10 push-ups consistently for 4 sessions. Try increasing to 12 reps next time.",
      "priority": "high",
      "actionable": true,
      "actionText": "Increase to 12 reps",
      "data": {
        "exerciseId": "push-ups",
        "currentReps": 10,
        "suggestedReps": 12,
        "confidence": 0.92
      }
    },
    {
      "type": "recovery",
      "title": "Rest Day Recommended",
      "message": "You've trained 7 consecutive days. Take 2 rest days to allow muscle recovery.",
      "priority": "high",
      "actionable": true,
      "actionText": "Schedule rest days",
      "data": {
        "consecutiveDays": 7,
        "fatigueScore": 7.5,
        "recommendedRestDays": 2
      }
    },
    {
      "type": "streak",
      "title": "7-Day Streak!",
      "message": "Awesome consistency! You've worked out 7 days in a row.",
      "priority": "medium",
      "actionable": false
    }
  ],
  "overallTrend": "improving",
  "keyStrength": "Exceptional consistency with daily workouts",
  "primaryRecommendation": "Consider adding rest days to prevent overtraining while maintaining your excellent routine"
}
```

### Error Responses

#### 401 Unauthorized

**Cause**: Invalid or missing JWT token

```json
{
  "error": "Authentication failed",
  "code": "UNAUTHORIZED",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 429 Too Many Requests

**Cause**: Rate limit exceeded (100 requests/day)

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "retryAfter": 3600,
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Headers**:
```http
Retry-After: 3600
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704816000
```

#### 400 Bad Request

**Cause**: Invalid request body or missing required fields

```json
{
  "error": "Invalid request body",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "recentWorkouts",
    "message": "recentWorkouts is required and must be an array"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 500 Internal Server Error

**Cause**: AI service failure or unexpected error

```json
{
  "error": "AI analysis failed",
  "code": "AI_ERROR",
  "message": "Unable to generate insights at this time",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 503 Service Unavailable

**Cause**: Mistral AI API is down or unreachable

```json
{
  "error": "AI service unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "message": "AI provider is temporarily unavailable. Please try again later.",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Rate Limiting

### Limits

| Metric | Value | Window |
|--------|-------|--------|
| **Max Requests** | 100 | Per day (24 hours) |
| **Reset Time** | Midnight UTC | Daily |
| **Enforcement** | User-based | Per `user.id` from JWT |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704816000
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Total requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### Handling Rate Limits

**Client-Side Recommendations**:
1. Check `X-RateLimit-Remaining` before making requests
2. Cache responses for 5 minutes to reduce API calls
3. Display user-friendly message when limit is reached
4. Show countdown timer until reset (using `X-RateLimit-Reset`)

**Example Code** (from `insightsService.ts`):
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const resetTime = response.headers.get('X-RateLimit-Reset');
  
  throw new InsightsServiceError(
    `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    'RATE_LIMIT',
    { retryAfter, resetTime }
  );
}
```

---

## Caching Strategy

### Server-Side Cache (Database)

**Table**: `coaching_ai_cache`

**TTL**: 24 hours

**Logic**:
1. Check cache before calling Mistral AI
2. If valid cache exists (not expired), return cached insights
3. If cache miss or expired, generate new insights
4. Store new insights with 24-hour expiration

**Schema**:
```sql
CREATE TABLE coaching_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX idx_cache_user_expiry ON coaching_ai_cache(user_id, expires_at);
```

**Benefits**:
- Reduces Mistral AI costs (24-hour window per user)
- Faster response times for repeat requests
- Persists across client sessions
- Automatically cleaned up by scheduled Edge Function

### Client-Side Cache (LocalStorage/Memory)

**TTL**: 5 minutes

**Logic** (from `insightsService.ts`):
1. Check in-memory cache before API call
2. If cache valid (<5 minutes old), return cached data
3. If cache expired or `forceRefresh=true`, fetch from API
4. Store fetched data with timestamp

**Benefits**:
- Instant load times for recent insights
- Reduces rate limit consumption
- Improves perceived performance
- User can force refresh if needed

---

## Integration Guide

### Using insightsService.ts (Recommended)

The frontend service handles all complexity:

```typescript
import { InsightsService } from '@/services/insightsService';

// Initialize service
const insightsService = InsightsService.getInstance();

// Check rate limit before fetching
const { canFetch, reason } = await insightsService.canFetchInsights();

if (!canFetch) {
  console.warn('Cannot fetch AI insights:', reason);
  // Fall back to rule-based insights
  return;
}

// Fetch insights
try {
  const insights = await insightsService.fetchAIInsights(userData, forceRefresh);
  console.log('AI Insights:', insights);
} catch (error) {
  console.error('Error fetching insights:', error);
  // Handle error gracefully (service returns user-friendly message)
}
```

### Direct API Call (Advanced)

For custom integrations:

```typescript
const response = await fetch(
  'https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/analyze-progress',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      'x-correlation-id': generateCorrelationId() // Optional
    },
    body: JSON.stringify({
      userId: 'user-id',
      recentWorkouts: [...],
      exerciseLibrary: [...],
      timeframe: 30
    })
  }
);

if (response.ok) {
  const insights = await response.json();
  console.log('Insights:', insights);
} else {
  const error = await response.json();
  console.error('Error:', error);
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description | Client Action |
|------|-------------|-------------|---------------|
| `UNAUTHORIZED` | 401 | Invalid/missing JWT | Prompt user to sign in |
| `RATE_LIMIT_EXCEEDED` | 429 | Daily limit reached | Show limit message + timer |
| `INVALID_REQUEST` | 400 | Malformed request | Log error, use fallback |
| `AI_ERROR` | 500 | AI generation failed | Use rule-based fallback |
| `SERVICE_UNAVAILABLE` | 503 | Mistral AI down | Use rule-based fallback |
| `NETWORK_ERROR` | N/A | Client network issue | Retry after delay |
| `TIMEOUT` | 504 | Request timeout (>30s) | Retry or use fallback |

### Recommended Error Handling Pattern

```typescript
try {
  const insights = await insightsService.fetchAIInsights(userData);
  return insights;
} catch (error) {
  if (error instanceof InsightsServiceError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        // Redirect to sign in
        router.push('/settings?tab=auth');
        break;
      
      case 'RATE_LIMIT':
        // Show rate limit message
        toast.error(`Rate limit exceeded. ${error.getErrorMessage()}`);
        break;
      
      case 'OFFLINE':
      case 'NETWORK_ERROR':
        // Silent fallback to rule-based
        return coachingService.getInsights();
      
      default:
        // Log error, use fallback
        logger.error('AI insights error:', error);
        return coachingService.getInsights();
    }
  }
  
  // Unexpected error - fallback
  return coachingService.getInsights();
}
```

---

## Performance

### Response Times

| Scenario | Average Time | Notes |
|----------|--------------|-------|
| **Cache Hit (Server)** | ~200-300ms | Database lookup + response serialization |
| **Cache Hit (Client)** | <100ms | In-memory cache, no network call |
| **Cache Miss (AI Generation)** | ~1-3s | Depends on Mistral API latency |
| **Network Timeout** | 30s | Edge Function timeout limit |

### Optimization Tips

1. **Client-Side Caching**: Always check client cache first
2. **Conditional Fetch**: Check `canFetchInsights()` before API calls
3. **Batch Requests**: Don't fetch on every page visit (let cache work)
4. **Fallback Strategy**: Always have rule-based insights ready
5. **User Feedback**: Show loading states during 1-3s wait

---

## Security

### Authentication

- **JWT Validation**: Server validates every request via `supabase.auth.getUser()`
- **User Isolation**: Insights scoped to `user.id` from JWT
- **Token Expiration**: Respects Supabase Auth token TTL (default: 1 hour)

### Data Protection

- **HTTPS Only**: All requests encrypted in transit
- **No PII Storage**: AI provider doesn't store user data permanently
- **Workout Data Only**: Only workout history sent (no personal info)
- **Sanitization**: All AI responses sanitized before client delivery

### Rate Limiting Security

- **Per-User Enforcement**: Prevents abuse by individual users
- **Server-Side Validation**: Cannot be bypassed by client manipulation
- **Distributed Denial Prevention**: 100 req/day limit prevents resource exhaustion

---

## Monitoring & Logging

### Correlation IDs

Every request can include a `x-correlation-id` header for tracking:

```http
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
```

**Purpose**:
- Track request flow across services
- Debug issues with specific requests
- Aggregate logs for analysis

### Logged Events

| Event | Level | Data Logged |
|-------|-------|-------------|
| Request received | INFO | `userId`, `correlationId`, `requestSize` |
| Cache hit/miss | INFO | `userId`, `cacheAge` |
| Rate limit check | INFO | `userId`, `remaining`, `resetTime` |
| AI generation start | INFO | `userId`, `workoutCount` |
| AI generation success | INFO | `userId`, `duration`, `insightCount` |
| AI generation failure | ERROR | `userId`, `error`, `duration` |
| Response sent | INFO | `userId`, `statusCode`, `duration` |

### Metrics to Track

**For Production Monitoring**:
- **Request Rate**: Requests per hour/day
- **Cache Hit Rate**: Percentage of cached responses
- **AI Success Rate**: Successful AI generations vs failures
- **Average Latency**: Response time distribution
- **Error Rate**: Percentage of 4xx/5xx responses
- **Rate Limit Triggers**: Users hitting limits

---

## Testing

### Manual Testing with cURL

```bash
# Replace JWT_TOKEN with actual token from Supabase Auth
curl -X POST 'https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/analyze-progress' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-id",
    "recentWorkouts": [
      {
        "id": "workout-1",
        "date": "2025-01-09T10:00:00Z",
        "exercises": [
          {
            "exerciseId": "push-ups",
            "exerciseName": "Push-ups",
            "sets": 3,
            "reps": 10,
            "completed": true
          }
        ],
        "duration": 900
      }
    ],
    "exerciseLibrary": [
      {
        "id": "push-ups",
        "name": "Push-ups",
        "category": "strength",
        "muscleGroups": ["chest", "triceps"],
        "difficulty": "intermediate"
      }
    ],
    "timeframe": 30
  }'
```

### Automated Testing

See test files:
- `apps/frontend/src/services/__tests__/insightsService.test.ts` (19 tests)
- `apps/frontend/src/__tests__/AICoachPhase2Integration.test.tsx` (18 tests)

---

## Changelog

### v2 (January 2025) - AI Coach Phase 2
- Initial release with Mistral AI integration
- Rate limiting (100 req/day)
- 24-hour server-side caching
- Comprehensive error handling
- Multi-factor progression and recovery algorithms

---

## Support

**Documentation**:
- [User Guide](../ai-coach-user-guide.md)
- [README.md](../../README.md)
- [CHANGELOG.md](../../CHANGELOG.md)

**Technical Support**:
- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share feedback

**Edge Function Location**:
- `supabase/functions/analyze-progress/index.ts`

---

**Last Updated**: January 9, 2025  
**API Version**: v2  
**Status**: Production Ready (Pending Deployment)
