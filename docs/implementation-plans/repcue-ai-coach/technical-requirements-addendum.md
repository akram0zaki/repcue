# RepCue AI Coach - Technical Requirements Addendum

**Date**: 2025-10-13
**Version**: 1.0
**Status**: Mandatory Technical Requirements
**Parent Documents**:
- [AI Coach Implementation Plan](ai-coach-implementation-plan.md)
- [Enhancements Addendum](enhancements-addendum.md)

---

## Overview

This addendum specifies **mandatory technical requirements** for the AI Coach implementation, focusing on:
1. **Shared utility modules** for edge functions (AI usage logging, error handling)
2. **Comprehensive logging and error handling** throughout the stack
3. **Frontend-backend communication patterns** for status transparency

These requirements ensure operational excellence, cost control, and excellent user experience.

---

## Requirement 1: Shared Edge Function Utilities

### Problem Statement
The existing `usage-logger.ts` is embedded in `generate-ai-workout` edge function. Creating a new `analyze-progress` edge function requires reusing this logging utility **without code duplication**.

### Solution: Supabase Shared Functions Directory

Supabase supports a `_shared` directory for reusable modules across edge functions.

**Structure**:
```
supabase/functions/
├── _shared/                          # Shared utilities (all functions)
│   ├── usage-logger.ts               # AI usage tracking (MOVED from generate-ai-workout)
│   ├── logger.ts                     # General logging (MOVED from generate-ai-workout)
│   ├── security.ts                   # Auth validation, rate limiting
│   ├── error-handler.ts              # Standardized error responses
│   └── types.ts                      # Shared TypeScript types
├── generate-ai-workout/
│   ├── index.ts                      # Imports from _shared
│   ├── workout-generator.ts
│   └── prompt-builder.ts
├── analyze-progress/                 # NEW
│   ├── index.ts                      # Imports from _shared
│   ├── insight-generator.ts
│   └── prompt-builder.ts
└── chat-with-coach/                  # FUTURE
    ├── index.ts                      # Imports from _shared
    └── conversation-handler.ts
```

### Implementation Tasks

#### **Task TR1.1: Create Shared Utilities Directory**
- **Location**: `supabase/functions/_shared/`
- **Description**: Establish shared module directory structure
- **Details**:
  - Create `_shared` directory at root of `functions/`
  - Move `usage-logger.ts` from `generate-ai-workout/` to `_shared/`
  - Move `logger.ts` from `generate-ai-workout/` to `_shared/`
  - Update import paths in `generate-ai-workout/index.ts`:
    ```typescript
    // Before
    import { logAIUsage } from './usage-logger.ts';
    import { logInfo, logError } from './logger.ts';

    // After
    import { logAIUsage } from '../_shared/usage-logger.ts';
    import { logInfo, logError } from '../_shared/logger.ts';
    ```
  - Test `generate-ai-workout` function after refactor (ensure no regressions)
- **Estimated Time**: 1 hour
- **Phase**: Phase 2 (before Task 2.1.1)
- **Priority**: **CRITICAL** - Blocks all edge function development

---

#### **Task TR1.2: Extend usage-logger.ts for Multiple Request Types**
- **File**: `supabase/functions/_shared/usage-logger.ts`
- **Description**: Support different AI request types beyond workout generation
- **Details**:
  - Update `request_type` enum to support:
    ```typescript
    type RequestType =
      | 'workout_generation'   // Existing
      | 'progress_analysis'    // NEW - AI Coach
      | 'chat_message'         // FUTURE - Chat mode
      | 'exercise_substitution'; // FUTURE - Phase 3
    ```
  - Update `logAIUsage()` function signature:
    ```typescript
    export interface LogAIUsageParams {
      correlationId: string;
      userId: string;
      provider: string;
      model: string;
      usage: TokenUsage;
      processingTimeMs: number;
      success: boolean;
      errorCode?: string;
      requestType: RequestType; // NEW - was hardcoded to 'workout_generation'
    }
    ```
  - Update insert statement:
    ```typescript
    const { error } = await supabase.from('ai_usage_logs').insert({
      // ... existing fields
      request_type: requestType, // Use parameter instead of hardcoded value
    });
    ```
- **Estimated Time**: 1 hour
- **Phase**: Phase 2 (with Task TR1.1)
- **Priority**: **CRITICAL**

---

#### **Task TR1.3: Create Shared Error Handler Module**
- **File**: `supabase/functions/_shared/error-handler.ts`
- **Description**: Standardized error responses for all edge functions
- **Details**:
  ```typescript
  /**
   * Shared Error Handler for Edge Functions
   * Provides consistent error response format and logging
   */

  import { logError, logWarn } from './logger.ts';

  // ============================================================================
  // Error Types
  // ============================================================================

  export enum ErrorCode {
    // Auth Errors (400-403)
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Validation Errors (400)
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // AI Provider Errors (500-503)
    AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
    AI_TIMEOUT = 'AI_TIMEOUT',
    AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',

    // Internal Errors (500)
    DATABASE_ERROR = 'DATABASE_ERROR',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

    // Not Found (404)
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  }

  export interface ErrorResponse {
    success: false;
    error: {
      code: ErrorCode;
      message: string;
      details?: Record<string, any>;
      correlationId: string;
      timestamp: string;
    };
  }

  // ============================================================================
  // Error Response Builder
  // ============================================================================

  /**
   * Build standardized error response
   */
  export function buildErrorResponse(
    correlationId: string,
    errorCode: ErrorCode,
    message: string,
    details?: Record<string, any>
  ): ErrorResponse {
    logError(correlationId, message, { errorCode, ...details });

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Convert error response to HTTP Response
   */
  export function toHttpResponse(errorResponse: ErrorResponse, status: number): Response {
    return new Response(
      JSON.stringify(errorResponse),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': errorResponse.error.correlationId,
        },
      }
    );
  }

  // ============================================================================
  // Common Error Handlers
  // ============================================================================

  /**
   * Handle auth errors
   */
  export function handleAuthError(correlationId: string, message: string): Response {
    const errorResponse = buildErrorResponse(
      correlationId,
      ErrorCode.UNAUTHORIZED,
      message
    );
    return toHttpResponse(errorResponse, 401);
  }

  /**
   * Handle validation errors
   */
  export function handleValidationError(
    correlationId: string,
    message: string,
    details?: Record<string, any>
  ): Response {
    const errorResponse = buildErrorResponse(
      correlationId,
      ErrorCode.INVALID_INPUT,
      message,
      details
    );
    return toHttpResponse(errorResponse, 400);
  }

  /**
   * Handle AI provider errors
   */
  export function handleAIProviderError(
    correlationId: string,
    providerError: any
  ): Response {
    const isTimeout = providerError.message?.includes('timeout');
    const isQuotaExceeded = providerError.message?.includes('quota');

    const errorCode = isTimeout
      ? ErrorCode.AI_TIMEOUT
      : isQuotaExceeded
        ? ErrorCode.AI_QUOTA_EXCEEDED
        : ErrorCode.AI_PROVIDER_ERROR;

    const errorResponse = buildErrorResponse(
      correlationId,
      errorCode,
      'AI service temporarily unavailable. Please try again.',
      {
        providerMessage: providerError.message,
        providerCode: providerError.code,
      }
    );

    return toHttpResponse(errorResponse, 503);
  }

  /**
   * Handle internal server errors
   */
  export function handleInternalError(
    correlationId: string,
    error: any
  ): Response {
    const errorResponse = buildErrorResponse(
      correlationId,
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred. Our team has been notified.',
      {
        error: error.message,
        stack: error.stack,
      }
    );
    return toHttpResponse(errorResponse, 500);
  }

  /**
   * Handle rate limit errors
   */
  export function handleRateLimitError(
    correlationId: string,
    retryAfterSeconds: number
  ): Response {
    const errorResponse = buildErrorResponse(
      correlationId,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      { retryAfterSeconds }
    );

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
          'Retry-After': retryAfterSeconds.toString(),
        },
      }
    );
  }
  ```
- **Estimated Time**: 3 hours
- **Phase**: Phase 2 (with Task TR1.1)
- **Priority**: **HIGH**

---

#### **Task TR1.4: Create Shared Security Module**
- **File**: `supabase/functions/_shared/security.ts`
- **Description**: Reusable auth validation and rate limiting
- **Details**:
  - Extract security logic from `generate-ai-workout` function
  - JWT validation:
    ```typescript
    export async function validateAuth(
      request: Request,
      correlationId: string
    ): Promise<{ userId: string } | Response> {
      // Extract JWT from Authorization header
      // Validate with Supabase auth
      // Return userId or error Response
    }
    ```
  - Rate limiting:
    ```typescript
    export async function checkRateLimit(
      userId: string,
      requestType: string,
      correlationId: string
    ): Promise<boolean | Response> {
      // Check Supabase table for recent requests
      // Return true if allowed, error Response if exceeded
    }
    ```
  - Reuse in both `generate-ai-workout` and `analyze-progress`
- **Estimated Time**: 4 hours
- **Phase**: Phase 2 (with Task TR1.1)
- **Priority**: **HIGH**

---

### Updated Task 2.1.1 (analyze-progress Edge Function)

**REVISED Task 2.1.1**: Create analyze-progress Edge Function
- **Dependencies**: **Task TR1.1, TR1.2, TR1.3, TR1.4** (shared utilities)
- **Description**: Edge function for AI-powered progress analysis
- **Details**:
  - **Imports from `_shared/`**:
    ```typescript
    import { logAIUsage, extractMistralUsage } from '../_shared/usage-logger.ts';
    import { logInfo, logError } from '../_shared/logger.ts';
    import {
      buildErrorResponse,
      handleAuthError,
      handleAIProviderError,
      handleInternalError
    } from '../_shared/error-handler.ts';
    import { validateAuth, checkRateLimit } from '../_shared/security.ts';
    ```
  - **Usage Logging**:
    ```typescript
    // After successful AI call
    await logAIUsage({
      correlationId,
      userId,
      provider: 'mistral',
      model: 'mistral-small-latest',
      usage: extractMistralUsage(aiResponse),
      processingTimeMs: Date.now() - startTime,
      success: true,
      requestType: 'progress_analysis', // NEW
    });

    // After failed AI call
    await logAIUsage({
      correlationId,
      userId,
      provider: 'mistral',
      model: 'mistral-small-latest',
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      processingTimeMs: Date.now() - startTime,
      success: false,
      errorCode: error.code,
      requestType: 'progress_analysis',
    });
    ```
  - **Error Handling Pattern**:
    ```typescript
    try {
      // Auth validation
      const authResult = await validateAuth(req, correlationId);
      if (authResult instanceof Response) return authResult;
      const { userId } = authResult;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, 'progress_analysis', correlationId);
      if (rateLimitResult instanceof Response) return rateLimitResult;

      // AI call
      const aiResponse = await callMistralAPI(/* ... */);

      // Usage logging
      await logAIUsage(/* ... success: true */);

      // Success response
      return new Response(JSON.stringify({ success: true, insights: /* ... */ }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
      });

    } catch (error) {
      // Usage logging (failure)
      await logAIUsage(/* ... success: false */);

      // Determine error type and return appropriate response
      if (error.name === 'MistralAPIError') {
        return handleAIProviderError(correlationId, error);
      }
      return handleInternalError(correlationId, error);
    }
    ```
- **Estimated Time**: ~~5 hours~~ **4 hours** (1 hour saved via shared utilities)

---

## Requirement 2: Comprehensive Frontend Error Handling

### Problem Statement
Frontend must be informed of all backend request statuses and provide clear, actionable feedback to users.

### Solution: Typed Error Responses & User-Friendly Messages

#### **Task TR2.1: Create Frontend Error Handler Service**
- **File**: `apps/frontend/src/services/errorHandlerService.ts`
- **Description**: Centralized error handling for all API calls
- **Details**:
  ```typescript
  /**
   * Error Handler Service
   * Provides user-friendly error messages and logging for API errors
   */

  import logger from '../utils/logger';

  // ============================================================================
  // Error Types (matches backend)
  // ============================================================================

  export enum ErrorCode {
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INVALID_INPUT = 'INVALID_INPUT',
    AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
    AI_TIMEOUT = 'AI_TIMEOUT',
    AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
    DATABASE_ERROR = 'DATABASE_ERROR',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  }

  export interface APIError {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    correlationId: string;
    timestamp: string;
  }

  export interface APIErrorResponse {
    success: false;
    error: APIError;
  }

  // ============================================================================
  // User-Friendly Error Messages (i18n-ready)
  // ============================================================================

  const ERROR_MESSAGES: Record<ErrorCode, { titleKey: string; messageKey: string; actionKey?: string }> = {
    [ErrorCode.UNAUTHORIZED]: {
      titleKey: 'errors.unauthorized.title',
      messageKey: 'errors.unauthorized.message',
      actionKey: 'errors.unauthorized.action',
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
      titleKey: 'errors.rateLimit.title',
      messageKey: 'errors.rateLimit.message',
      actionKey: 'errors.rateLimit.action',
    },
    [ErrorCode.AI_PROVIDER_ERROR]: {
      titleKey: 'errors.aiUnavailable.title',
      messageKey: 'errors.aiUnavailable.message',
      actionKey: 'errors.aiUnavailable.action',
    },
    [ErrorCode.AI_TIMEOUT]: {
      titleKey: 'errors.aiTimeout.title',
      messageKey: 'errors.aiTimeout.message',
      actionKey: 'errors.aiTimeout.action',
    },
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
      titleKey: 'errors.serverError.title',
      messageKey: 'errors.serverError.message',
      actionKey: 'errors.serverError.action',
    },
    // ... more mappings
  };

  // ============================================================================
  // Error Handler
  // ============================================================================

  export interface UserFacingError {
    title: string;
    message: string;
    action?: string;
    code: ErrorCode;
    correlationId?: string;
    canRetry: boolean;
  }

  /**
   * Convert API error to user-friendly message
   */
  export function handleAPIError(
    error: APIErrorResponse | Error,
    t: (key: string, options?: any) => string
  ): UserFacingError {
    // Log error for debugging
    logger.error('API Error:', error);

    // If it's a typed API error response
    if ('error' in error && error.error) {
      const { code, message, correlationId } = error.error;
      const errorConfig = ERROR_MESSAGES[code];

      return {
        title: t(errorConfig.titleKey),
        message: t(errorConfig.messageKey),
        action: errorConfig.actionKey ? t(errorConfig.actionKey) : undefined,
        code,
        correlationId,
        canRetry: isRetryableError(code),
      };
    }

    // Generic error fallback
    return {
      title: t('errors.generic.title'),
      message: t('errors.generic.message'),
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      canRetry: false,
    };
  }

  /**
   * Determine if error is retryable
   */
  function isRetryableError(code: ErrorCode): boolean {
    return [
      ErrorCode.AI_TIMEOUT,
      ErrorCode.AI_PROVIDER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
    ].includes(code);
  }

  /**
   * Display error to user (toast or modal)
   */
  export function displayError(
    error: UserFacingError,
    displayMethod: 'toast' | 'modal' = 'toast'
  ): void {
    // Integrate with your toast/modal system
    // Example: toast.error(error.title, error.message);

    logger.warn('Displaying error to user:', {
      code: error.code,
      correlationId: error.correlationId,
      method: displayMethod,
    });
  }
  ```
- **Estimated Time**: 4 hours
- **Phase**: Phase 2 (Module 2.2 extension)
- **Priority**: **HIGH**

---

#### **Task TR2.2: Update InsightsService with Error Handling**
- **File**: `apps/frontend/src/services/insightsService.ts`
- **Description**: Integrate error handler into AI service
- **Details**:
  ```typescript
  import { handleAPIError, displayError, ErrorCode } from './errorHandlerService';
  import { useTranslation } from 'react-i18next';

  class InsightsService {
    async getAIInsights(timeRange: '7d' | '30d'): Promise<AIInsight[]> {
      try {
        const response = await fetch('/api/analyze-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({ timeRange, /* ... */ }),
        });

        const data = await response.json();

        // Check for API error response
        if (!data.success) {
          const userError = handleAPIError(data, t);
          displayError(userError, 'toast');

          // Return empty array (graceful degradation)
          return [];
        }

        return data.insights;

      } catch (error) {
        // Network error or JSON parse error
        const userError = handleAPIError(error, t);
        displayError(userError, 'toast');

        logger.error('Failed to fetch AI insights', { error });
        return [];
      }
    }
  }
  ```
- **Estimated Time**: 2 hours
- **Phase**: Phase 2 (Module 2.2 extension)
- **Dependencies**: Task TR2.1

---

#### **Task TR2.3: Add Error i18n Strings**
- **File**: `apps/frontend/public/locales/en/errors.json` (new namespace)
- **Description**: User-facing error messages (English canonical)
- **Details**:
  ```json
  {
    "unauthorized": {
      "title": "Authentication Required",
      "message": "Please sign in to use AI Coach features.",
      "action": "Go to Settings"
    },
    "rateLimit": {
      "title": "Too Many Requests",
      "message": "You've reached the hourly limit for AI insights. Please try again later.",
      "action": "Try Again Later"
    },
    "aiUnavailable": {
      "title": "AI Service Unavailable",
      "message": "Our AI coach is temporarily unavailable. Using local insights instead.",
      "action": "Retry"
    },
    "aiTimeout": {
      "title": "Request Timeout",
      "message": "AI analysis is taking longer than expected. Please try again.",
      "action": "Retry"
    },
    "serverError": {
      "title": "Something Went Wrong",
      "message": "We're experiencing technical difficulties. Our team has been notified.",
      "action": "Contact Support"
    },
    "generic": {
      "title": "Error",
      "message": "An unexpected error occurred. Please try again."
    }
  }
  ```
- **Estimated Time**: 1 hour
- **Phase**: Phase 2 (Module 2.5 extension)

---

## Requirement 3: Comprehensive Logging Strategy

### Frontend Logging Standards

#### **Task TR3.1: Enhance Logger Utility**
- **File**: `apps/frontend/src/utils/logger.ts` (extend)
- **Description**: Add structured logging for API calls
- **Details**:
  ```typescript
  // Extend existing logger

  /**
   * Log API request start
   */
  export function logAPIRequest(
    method: string,
    endpoint: string,
    correlationId: string
  ): void {
    if (!DEBUG) return;

    logger.info('→ API Request', {
      method,
      endpoint,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log API response success
   */
  export function logAPISuccess(
    method: string,
    endpoint: string,
    correlationId: string,
    durationMs: number
  ): void {
    if (!DEBUG) return;

    logger.info('✓ API Success', {
      method,
      endpoint,
      correlationId,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log API response failure
   */
  export function logAPIFailure(
    method: string,
    endpoint: string,
    correlationId: string,
    error: any,
    durationMs: number
  ): void {
    // Always log errors (even if DEBUG is false)
    logger.error('✗ API Failure', {
      method,
      endpoint,
      correlationId,
      error: error.message || error,
      errorCode: error.code,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  }
  ```
- **Estimated Time**: 1 hour
- **Phase**: Phase 2 (Module 2.2 extension)

---

### Backend Logging Standards

All edge functions must follow this pattern:

```typescript
// Example: analyze-progress/index.ts

import { logInfo, logError, logWarn } from '../_shared/logger.ts';

Deno.serve(async (req) => {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();

  // Log request start
  logInfo(correlationId, 'Received progress analysis request', {
    method: req.method,
    url: req.url,
  });

  try {
    // 1. Auth validation
    logInfo(correlationId, 'Validating authentication');
    const authResult = await validateAuth(req, correlationId);
    if (authResult instanceof Response) {
      logWarn(correlationId, 'Authentication failed');
      return authResult;
    }
    logInfo(correlationId, 'Authentication successful', { userId: authResult.userId });

    // 2. Input validation
    logInfo(correlationId, 'Validating request payload');
    const payload = await req.json();
    // ... validation logic

    // 3. Rate limiting
    logInfo(correlationId, 'Checking rate limit');
    const rateLimitResult = await checkRateLimit(authResult.userId, 'progress_analysis', correlationId);
    if (rateLimitResult instanceof Response) {
      logWarn(correlationId, 'Rate limit exceeded');
      return rateLimitResult;
    }

    // 4. AI call
    logInfo(correlationId, 'Calling Mistral API', {
      model: 'mistral-small-latest',
      inputTokensEstimate: payload.length,
    });
    const aiResponse = await callMistralAPI(/* ... */);
    logInfo(correlationId, 'Mistral API call successful', {
      outputTokens: aiResponse.usage.total_tokens,
    });

    // 5. Usage logging
    await logAIUsage({ /* ... */ success: true });

    // 6. Success response
    const duration = Date.now() - startTime;
    logInfo(correlationId, 'Progress analysis completed successfully', {
      durationMs: duration,
      insightsGenerated: aiResponse.insights.length,
    });

    return new Response(JSON.stringify({ success: true, insights: /* ... */ }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        'X-Processing-Time-Ms': duration.toString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(correlationId, 'Progress analysis failed', {
      error: error.message,
      stack: error.stack,
      durationMs: duration,
    });

    // Log failed AI usage
    await logAIUsage({ /* ... */ success: false, errorCode: error.code });

    return handleInternalError(correlationId, error);
  }
});
```

---

## Requirement 4: Status Transparency & User Feedback

### Loading States

Every AI-powered feature must have:
1. **Loading indicator** during API calls
2. **Progress messages** for long operations
3. **Success confirmation** after completion
4. **Error messages** with retry options

#### **Task TR4.1: Create AI Loading Component**
- **File**: `apps/frontend/src/components/coaching/AILoadingState.tsx`
- **Description**: Reusable loading state for AI operations
- **Details**:
  ```tsx
  interface AILoadingStateProps {
    message?: string;
    showCancelButton?: boolean;
    onCancel?: () => void;
  }

  export const AILoadingState: React.FC<AILoadingStateProps> = ({
    message = 'Your AI coach is analyzing your progress...',
    showCancelButton = false,
    onCancel,
  }) => {
    return (
      <div className="ai-loading-state">
        {/* Animated brain or sparkle icon */}
        <div className="ai-loading-icon" aria-live="polite" aria-busy="true">
          <svg>{ /* ... sparkle animation */ }</svg>
        </div>

        <p className="ai-loading-message">{message}</p>

        {/* Progress dots */}
        <div className="ai-loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {showCancelButton && (
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    );
  };
  ```
- **Estimated Time**: 3 hours
- **Phase**: Phase 2 (Module 2.2)
- **Priority**: HIGH

---

#### **Task TR4.2: Add Retry Mechanism to AI Services**
- **File**: `apps/frontend/src/services/insightsService.ts` (extend)
- **Description**: Automatic retry with exponential backoff
- **Details**:
  ```typescript
  /**
   * Retry failed AI requests with exponential backoff
   */
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;

        // Only retry on retryable errors
        if (error.code && !isRetryableError(error.code)) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt}/${maxRetries} in ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Usage
  async getAIInsights(timeRange: '7d' | '30d'): Promise<AIInsight[]> {
    return retryWithBackoff(async () => {
      const response = await fetch(/* ... */);
      // ... handle response
    });
  }
  ```
- **Estimated Time**: 2 hours
- **Phase**: Phase 2 (Module 2.5 extension)

---

## Summary of Technical Requirements

### Mandatory Tasks (CRITICAL Priority)

| Task | Estimated Time | Phase | Description |
|------|----------------|-------|-------------|
| TR1.1 | 1h | Phase 2 | Create shared utilities directory |
| TR1.2 | 1h | Phase 2 | Extend usage-logger for multiple request types |
| TR1.3 | 3h | Phase 2 | Create shared error handler module |
| TR1.4 | 4h | Phase 2 | Create shared security module |
| TR2.1 | 4h | Phase 2 | Create frontend error handler service |
| TR2.2 | 2h | Phase 2 | Update services with error handling |
| TR2.3 | 1h | Phase 2 | Add error i18n strings |
| TR3.1 | 1h | Phase 2 | Enhance logger utility |
| TR4.1 | 3h | Phase 2 | Create AI loading component |
| TR4.2 | 2h | Phase 2 | Add retry mechanism |
| **Total** | **22h** | Phase 2 | **Added to Phase 2 baseline** |

### Updated Phase 2 Estimate

| Component | Original | Technical Req. | Revised |
|-----------|----------|----------------|---------|
| Phase 2 Core | 92h | +22h | **114h** |
| **New Duration** | 2.5 weeks | +0.5 weeks | **~3 weeks** |

### Benefits

✅ **Code Reusability**: No duplication of logging/error handling
✅ **Cost Control**: All AI calls logged to `ai_usage_logs` table
✅ **User Experience**: Clear error messages, retry logic, loading states
✅ **Debugging**: Correlation IDs trace requests end-to-end
✅ **Operational Excellence**: Comprehensive logging for troubleshooting

---

## Appendix: Example End-to-End Flow

### Scenario: User Requests AI Insights

**Frontend** (`CoachPage.tsx`):
```tsx
const { insights, loading, error } = useCoachingInsights();

if (loading) {
  return <AILoadingState message="Analyzing your progress..." />;
}

if (error) {
  return <ErrorDisplay error={error} onRetry={() => refresh()} />;
}

return <InsightsFeed insights={insights} />;
```

**Frontend Service** (`insightsService.ts`):
```typescript
const correlationId = crypto.randomUUID();
logAPIRequest('POST', '/api/analyze-progress', correlationId);

try {
  const response = await retryWithBackoff(() =>
    fetch(url, { headers: { 'X-Correlation-ID': correlationId } })
  );

  logAPISuccess('POST', '/api/analyze-progress', correlationId, duration);
  return response.insights;

} catch (error) {
  logAPIFailure('POST', '/api/analyze-progress', correlationId, error, duration);
  const userError = handleAPIError(error, t);
  displayError(userError);
  throw userError;
}
```

**Edge Function** (`analyze-progress/index.ts`):
```typescript
const correlationId = req.headers.get('X-Correlation-ID') || crypto.randomUUID();

logInfo(correlationId, 'Starting progress analysis');

try {
  // Auth
  const { userId } = await validateAuth(req, correlationId);

  // Rate limit
  await checkRateLimit(userId, 'progress_analysis', correlationId);

  // AI call
  const aiResponse = await mistralClient.chat(/* ... */);

  // Log usage
  await logAIUsage({
    correlationId,
    userId,
    provider: 'mistral',
    model: 'mistral-small-latest',
    usage: extractMistralUsage(aiResponse),
    success: true,
    requestType: 'progress_analysis',
  });

  logInfo(correlationId, 'Progress analysis completed successfully');

  return new Response(JSON.stringify({ success: true, insights: /* ... */ }), {
    headers: { 'X-Correlation-ID': correlationId },
  });

} catch (error) {
  await logAIUsage({ /* ... */ success: false });
  logError(correlationId, 'Progress analysis failed', error);
  return handleInternalError(correlationId, error);
}
```

**Database** (`ai_usage_logs` table):
```sql
SELECT
  correlation_id,
  user_id,
  request_type,
  total_tokens,
  total_cost_usd,
  success,
  processing_time_ms
FROM ai_usage_logs
WHERE request_type = 'progress_analysis'
ORDER BY created_at DESC;
```

---

**End of Technical Requirements Addendum**
