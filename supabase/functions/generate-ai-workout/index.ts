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
 * Validates JWT and returns user ID
 */
async function validateJWT(jwt: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[generate-ai-workout] Missing Supabase environment variables');
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      console.log('[generate-ai-workout] JWT validation failed:', error?.message || 'No user');
      return null;
    }

    return user.id;
  } catch (e) {
    console.error('[generate-ai-workout] JWT validation error:', e.message);
    return null;
  }
}

/**
 * Main request handler
 */
serve(async (req) => {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logError(correlationId, 'Missing or invalid Authorization header', null);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const userId = await validateJWT(jwt);

    if (!userId) {
      logError(correlationId, 'JWT validation failed', { userId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      logError(correlationId, 'Rate limit exceeded', { userId, limit: rateLimitResult.limit });
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You can only generate ${rateLimitResult.limit} workouts per hour. Please try again later.`,
          retryAfter: rateLimitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter)
          }
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      logError(correlationId, 'Invalid JSON in request body', { error: e.message });
      return new Response(
        JSON.stringify({ error: 'Invalid request body', message: 'Request body must be valid JSON' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request schema
    const validationResult = validateRequest(requestBody);
    if (!validationResult.valid) {
      logError(correlationId, 'Request validation failed', { errors: validationResult.errors });
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: 'Request body does not match expected schema',
          errors: validationResult.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    logError(correlationId, 'Unhandled error in generate-ai-workout', {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while generating your workout. Please try again later.',
        correlationId
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId
        }
      }
    );
  }
});
