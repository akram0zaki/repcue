// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
/**
 * generate-ai-workout Edge Function
 *
 * Generates personalized workout plans using AI based on user profile and preferences.
 *
 * POST /functions/v1/generate-ai-workout
 * Authorization: Bearer <JWT>
 *
 * Request body: AIWorkoutRequest (see types)
 * Response: AIWorkoutResponse with generated workouts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, checkRateLimit, sanitizeInput } from './security.ts';
import { generateWorkouts } from './workout-generator.ts';
import { logError, logInfo, generateCorrelationId } from './logger.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

/**
 * Validates JWT and returns user ID with detailed error info
 */
async function validateJWT(jwt: string, correlationId: string): Promise<{ userId: string | null; error: string | null }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');

      logError(correlationId, 'Missing Supabase environment variables', {
        missingVariables: missingVars
      });
      return {
        userId: null,
        error: `Server configuration error: Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error) {
      logError(correlationId, 'JWT validation failed - Supabase auth error', {
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN'
      });
      return {
        userId: null,
        error: `Authentication failed: ${error.message}`
      };
    }

    if (!user) {
      logError(correlationId, 'JWT validation failed - No user returned', {});
      return {
        userId: null,
        error: 'Authentication failed: Invalid or expired token'
      };
    }

    logInfo(correlationId, 'JWT validation successful', { userId: user.id });
    return { userId: user.id, error: null };

  } catch (e) {
    logError(correlationId, 'JWT validation exception', {
      error: e.message,
      stack: e.stack
    });
    return {
      userId: null,
      error: `Authentication error: ${e.message}`
    };
  }
}

/**
 * Main request handler
 */
serve(async (req) => {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  try {
    logInfo(correlationId, 'Incoming request', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers.get('content-type'),
        'origin': req.headers.get('origin'),
        'user-agent': req.headers.get('user-agent')
      }
    });

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      logInfo(correlationId, 'CORS preflight request', {});
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      logError(correlationId, 'Method not allowed', { method: req.method });
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: `HTTP ${req.method} is not supported. Use POST instead.`,
          correlationId
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    // Extract JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logError(correlationId, 'Missing Authorization header', {});
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing Authorization header. Please include a valid Bearer token.',
          correlationId
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      logError(correlationId, 'Invalid Authorization header format', { headerPrefix: authHeader.substring(0, 10) });
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid Authorization header format. Expected "Bearer <token>".',
          correlationId
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { userId, error: authError } = await validateJWT(jwt, correlationId);

    if (!userId || authError) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: authError || 'Authentication failed',
          correlationId
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      logError(correlationId, 'Rate limit exceeded', {
        userId,
        limit: rateLimitResult.limit,
        retryAfter: rateLimitResult.retryAfter
      });
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You can only generate ${rateLimitResult.limit} workouts per hour. Please try again in ${Math.ceil(rateLimitResult.retryAfter / 60)} minutes.`,
          retryAfter: rateLimitResult.retryAfter,
          correlationId
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-Correlation-Id': correlationId
          }
        }
      );
    }

    logInfo(correlationId, 'Rate limit check passed', { userId, remainingRequests: rateLimitResult.limit - (rateLimitResult.count || 0) });

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      logInfo(correlationId, 'Request body parsed successfully', {
        hasResponses: !!requestBody?.responses,
        locale: requestBody?.locale
      });
    } catch (e) {
      logError(correlationId, 'Failed to parse request body as JSON', {
        error: e.message,
        errorName: e.name
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          message: `Request body must be valid JSON. Error: ${e.message}`,
          correlationId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    // Validate request schema
    const validationResult = validateRequest(requestBody);
    if (!validationResult.valid) {
      logError(correlationId, 'Request validation failed', {
        errors: validationResult.errors,
        errorCount: validationResult.errors?.length || 0
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: 'Request body does not match expected schema. Please check the following validation errors:',
          errors: validationResult.errors,
          correlationId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId }
        }
      );
    }

    logInfo(correlationId, 'Request validation passed', {
      goal: requestBody.responses?.goal,
      fitnessLevel: requestBody.responses?.fitnessLevel,
      hasInjuries: !!requestBody.responses?.injuries
    });

    // Sanitize user inputs
    const sanitizedRequest = sanitizeInput(requestBody);

    logInfo(correlationId, 'Processing AI workout generation request', {
      userId,
      locale: sanitizedRequest.locale,
      goal: sanitizedRequest.responses.goal,
      fitnessLevel: sanitizedRequest.responses.fitnessLevel
    });

    // Generate workouts
    const workouts = await generateWorkouts(sanitizedRequest, userId, correlationId);

    const duration = Date.now() - startTime;
    logInfo(correlationId, 'AI workout generation completed', {
      userId,
      workoutCount: workouts.length,
      durationMs: duration
    });

    // Return success response
    return new Response(
      JSON.stringify({
        workouts,
        metadata: {
          correlationId,
          generatedAt: new Date().toISOString(),
          processingTimeMs: duration
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId
        }
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Categorize errors for better user feedback
    let statusCode = 500;
    let userMessage = 'An unexpected error occurred while generating your workout. Please try again later.';
    let errorType = 'UNKNOWN_ERROR';

    if (error.message.includes('ANTHROPIC_API_KEY')) {
      statusCode = 503;
      userMessage = 'AI service is not configured. Please contact support.';
      errorType = 'AI_CONFIG_ERROR';
    } else if (error.message.includes('Exercise catalog is empty')) {
      statusCode = 503;
      userMessage = 'Exercise database is currently unavailable. Please try again later.';
      errorType = 'DATABASE_ERROR';
    } else if (error.message.includes('Database error')) {
      statusCode = 503;
      userMessage = 'Database connection failed. Please try again later.';
      errorType = 'DATABASE_ERROR';
    } else if (error.message.includes('AI generation failed')) {
      statusCode = 503;
      userMessage = 'AI service is temporarily unavailable. Please try again later.';
      errorType = 'AI_SERVICE_ERROR';
    } else if (error.message.includes('timed out')) {
      statusCode = 504;
      userMessage = 'Request timed out. The AI is taking longer than expected. Please try again.';
      errorType = 'TIMEOUT_ERROR';
    } else if (error.message.includes('Failed to parse AI response')) {
      statusCode = 502;
      userMessage = 'AI generated an invalid response. Please try again.';
      errorType = 'AI_PARSE_ERROR';
    } else if (error.message.includes('AI response failed validation')) {
      statusCode = 502;
      userMessage = 'AI generated an invalid workout plan. Please try again.';
      errorType = 'AI_VALIDATION_ERROR';
    }

    logError(correlationId, 'Unhandled error in generate-ai-workout', {
      errorType,
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      durationMs: duration,
      statusCode
    });

    return new Response(
      JSON.stringify({
        error: errorType,
        message: userMessage,
        details: process.env.DEBUG === 'true' ? error.message : undefined,
        correlationId,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId
        }
      }
    );
  }
});
