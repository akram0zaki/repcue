// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
/**
 * analyze-progress Edge Function
 *
 * Analyzes user workout progress using AI and generates personalized coaching insights.
 *
 * POST /functions/v1/analyze-progress
 * Authorization: Bearer <JWT>
 *
 * Request body: UserAnalyticsData (see prompt-builder.ts)
 * Response: ParsedInsights with AI-generated coaching recommendations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo, logWarn, generateCorrelationId } from './logger.ts';
import { buildProgressAnalysisPrompt, type UserAnalyticsData } from './prompt-builder.ts';
import { parseInsights, sanitizeParsedInsights, type ParsedInsights } from './insight-parser.ts';
import { logAIUsage, extractMistralUsage } from '../_shared/usage-logger.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Rate limiting configuration
const RATE_LIMIT_MAX = 10; // 10 requests per hour per user (more generous than workout generation)
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cache TTL (24 hours as per PRD)
const CACHE_TTL_HOURS = 24;

/**
 * Generates a simple hash from a string (for stable insight IDs)
 * Uses the same algorithm as frontend for consistency
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 for shorter string
  return Math.abs(hash).toString(36);
}

/**
 * Generates stable ID for AI insight based on content
 * Format: ai-{type}-{titleHash}
 * This ensures same insight content gets same ID across requests (for dismissal persistence)
 */
function generateStableInsightId(insight: any): string {
  const titleHash = simpleHash(insight.title.toLowerCase().trim());
  return `ai-${insight.type}-${titleHash}`;
}

/**
 * Rate limit check
 */
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; limit: number; retryAfter?: number }> {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, limit: RATE_LIMIT_MAX };
  }

  if (userLimit.count < RATE_LIMIT_MAX) {
    userLimit.count++;
    rateLimitStore.set(userId, userLimit);
    return { allowed: true, limit: RATE_LIMIT_MAX };
  }

  const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
  return { allowed: false, limit: RATE_LIMIT_MAX, retryAfter };
}

/**
 * Validates JWT and returns user ID
 */
async function validateJWT(jwt: string, correlationId: string): Promise<{ userId: string | null; error: string | null }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      logError(correlationId, 'Missing Supabase environment variables', {});
      return { userId: null, error: 'Server configuration error' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      logError(correlationId, 'JWT validation failed', { error: error?.message });
      return { userId: null, error: 'Authentication failed' };
    }

    return { userId: user.id, error: null };
  } catch (e) {
    logError(correlationId, 'JWT validation exception', { error: e.message });
    return { userId: null, error: 'Authentication error' };
  }
}

/**
 * Check cache for existing insights
 */
async function getCachedInsights(
  userId: string,
  locale: string,
  correlationId: string
): Promise<ParsedInsights | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logWarn(correlationId, 'Cache check skipped - missing environment variables', {});
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coaching_ai_cache')
      .select('insights_data, created_at')
      .eq('user_id', userId)
      .eq('locale', locale)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      logInfo(correlationId, 'No valid cache found', { userId, locale });
      return null;
    }

    logInfo(correlationId, 'Cache hit', { userId, locale, cacheAge: Date.now() - new Date(data.created_at).getTime() });
    return data.insights_data as ParsedInsights;

  } catch (e) {
    logWarn(correlationId, 'Cache check failed', { error: e.message });
    return null;
  }
}

/**
 * Store insights in cache
 */
async function cacheInsights(
  userId: string,
  locale: string,
  insights: ParsedInsights,
  correlationId: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logWarn(correlationId, 'Caching skipped - missing environment variables', {});
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

    const { error } = await supabase
      .from('coaching_ai_cache')
      .insert({
        user_id: userId,
        locale: locale,
        insights_data: insights,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      logError(correlationId, 'Failed to cache insights', { error: error.message });
    } else {
      logInfo(correlationId, 'Insights cached successfully', { userId, locale, expiresAt: expiresAt.toISOString() });
    }

  } catch (e) {
    logError(correlationId, 'Exception during caching', { error: e.message });
  }
}

/**
 * Generate AI insights using Mistral API
 */
async function generateAIInsights(
  analyticsData: UserAnalyticsData,
  correlationId: string,
  userId: string
): Promise<ParsedInsights> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not configured');
  }

  const startTime = Date.now();
  const model = 'mistral-small-latest';

  // Build prompt
  const prompt = buildProgressAnalysisPrompt(analyticsData, correlationId);

  logInfo(correlationId, 'Calling Mistral API', {
    model,
    promptLength: prompt.length
  });

  // Call Mistral API with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
  
  let response;
  try {
    response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logError(correlationId, 'Mistral API timeout after 25 seconds');
      
      // Log failed AI usage
      const processingTimeMs = Date.now() - startTime;
      await logAIUsage({
        correlationId,
        userId,
        provider: 'mistral',
        model,
        usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        processingTimeMs,
        success: false,
        requestType: 'coaching_insights',
        errorCode: 'TIMEOUT',
        logInfo,
        logWarn,
        logError
      });
      
      throw new Error('Mistral API request timed out after 25 seconds');
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    logError(correlationId, 'Mistral API error', {
      status: response.status,
      error: errorText
    });
    
    // Log failed AI usage
    const processingTimeMs = Date.now() - startTime;
    await logAIUsage({
      correlationId,
      userId,
      provider: 'mistral',
      model,
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      processingTimeMs,
      success: false,
      requestType: 'coaching_insights',
      errorCode: `HTTP_${response.status}`,
      logInfo,
      logWarn,
      logError
    });
    
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const result = await response.json();
  const completion = result.choices?.[0]?.message?.content;

  if (!completion) {
    logError(correlationId, 'Invalid Mistral response', { result });
    
    // Log failed AI usage
    const processingTimeMs = Date.now() - startTime;
    await logAIUsage({
      correlationId,
      userId,
      provider: 'mistral',
      model,
      usage: extractMistralUsage(result),
      processingTimeMs,
      success: false,
      requestType: 'coaching_insights',
      errorCode: 'INVALID_RESPONSE',
      logInfo,
      logWarn,
      logError
    });
    
    throw new Error('Invalid response from Mistral API');
  }

  logInfo(correlationId, 'Mistral API call successful', {
    completionLength: completion.length,
    usage: result.usage
  });

  // Log successful AI usage
  const processingTimeMs = Date.now() - startTime;
  await logAIUsage({
    correlationId,
    userId,
    provider: 'mistral',
    model,
    usage: extractMistralUsage(result),
    processingTimeMs,
    success: true,
    requestType: 'coaching_insights',
    logInfo,
    logWarn,
    logError
  });

  // Parse and validate response
  const parsed = parseInsights(completion, correlationId);
  return sanitizeParsedInsights(parsed);
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
      url: req.url
    });

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', correlationId }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header', correlationId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { userId, error: authError } = await validateJWT(jwt, correlationId);

    if (!userId || authError) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication failed', correlationId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      logWarn(correlationId, 'Rate limit exceeded', { userId });
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You can analyze progress ${rateLimitResult.limit} times per hour. Please try again later.`,
          retryAfter: rateLimitResult.retryAfter,
          correlationId
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

    // Parse request body first to get locale
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', correlationId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract locale from request body
    const analyticsPayload = requestBody.analytics || requestBody;
    const userLocale = analyticsPayload.locale || 'en';

    // Check cache with locale
    const cachedInsights = await getCachedInsights(userId, userLocale, correlationId);
    if (cachedInsights) {
      const duration = Date.now() - startTime;
      logInfo(correlationId, 'Returning cached insights', { userId, locale: userLocale, durationMs: duration });
      
      // Transform cached AI insights to match CoachingInsight interface
      // Ensure each insight has a stable ID based on content (for dismissal persistence)
      const transformedCachedInsights = {
        ...cachedInsights,
        insights: cachedInsights.insights.map((insight) => ({
          ...insight,
          id: insight.id || generateStableInsightId(insight),
          source: 'ai' as const,
          dismissible: true,
          createdAt: insight.createdAt || new Date().toISOString()
        }))
      };
      
      return new Response(
        JSON.stringify({
          ...transformedCachedInsights,
          metadata: {
            correlationId,
            generatedAt: new Date().toISOString(),
            processingTimeMs: duration,
            cached: true
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract analytics data from request body
    // Frontend sends { analytics: AnalyticsSummary } where AnalyticsSummary contains
    // statistics, streak, and muscleGroupBalance as separate properties
    // Note: analyticsPayload already extracted above for locale
    
    // Transform AnalyticsSummary structure to flat UserAnalyticsData expected by prompt builder
    const analyticsData: UserAnalyticsData = {
      // From statistics object
      totalWorkouts: analyticsPayload.statistics?.totalWorkouts || 0,
      totalDuration: analyticsPayload.statistics?.totalDuration || 0,
      totalExercises: analyticsPayload.statistics?.totalExercises || 0,
      totalReps: analyticsPayload.statistics?.totalReps || 0,
      averageWorkoutDuration: analyticsPayload.statistics?.averageWorkoutDuration || 0,
      workoutsPerWeek: analyticsPayload.statistics?.workoutsPerWeek || 0,
      mostActiveDay: analyticsPayload.statistics?.mostActiveDay || 'Unknown',
      mostActiveCategory: analyticsPayload.statistics?.mostActiveCategory || null,
      
      // From streak object
      currentStreak: analyticsPayload.streak?.currentStreak || 0,
      longestStreak: analyticsPayload.streak?.longestStreak || 0,
      isActiveToday: analyticsPayload.streak?.isActiveToday || false,
      
      // Muscle group balance (already in correct format)
      muscleGroupBalance: analyticsPayload.muscleGroupBalance || [],
      
      // Week-over-week change (optional)
      weekOverWeekChange: analyticsPayload.weekOverWeekChange,
      
      // User metadata
      locale: analyticsPayload.locale || 'en',
      userId: userId
    };

    logInfo(correlationId, 'Generating AI insights', {
      userId,
      totalWorkouts: analyticsData.totalWorkouts,
      currentStreak: analyticsData.currentStreak,
      muscleGroups: analyticsData.muscleGroupBalance?.length || 0
    });

    // Generate insights
    const insights = await generateAIInsights(analyticsData, correlationId, userId);

    // Transform AI insights to match CoachingInsight interface
    // Generate stable IDs based on content (for dismissal persistence)
    const transformedInsights = {
      ...insights,
      insights: insights.insights.map((insight) => ({
        id: generateStableInsightId(insight),
        ...insight,
        source: 'ai' as const,
        dismissible: true,
        createdAt: new Date().toISOString()
      }))
    };

    // Cache insights with locale
    await cacheInsights(userId, analyticsData.locale, transformedInsights, correlationId);

    const duration = Date.now() - startTime;
    logInfo(correlationId, 'AI insights generated successfully', {
      userId,
      insightCount: transformedInsights.insights.length,
      durationMs: duration
    });

    return new Response(
      JSON.stringify({
        ...transformedInsights,
        metadata: {
          correlationId,
          generatedAt: new Date().toISOString(),
          processingTimeMs: duration,
          cached: false
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    let statusCode = 500;
    let userMessage = 'An unexpected error occurred while analyzing your progress.';
    let errorType = 'UNKNOWN_ERROR';

    if (error.message.includes('MISTRAL_API_KEY')) {
      statusCode = 503;
      userMessage = 'AI service is not configured. Please contact support.';
      errorType = 'AI_CONFIG_ERROR';
    } else if (error.message.includes('Mistral API')) {
      statusCode = 503;
      userMessage = 'AI service is temporarily unavailable. Please try again later.';
      errorType = 'AI_SERVICE_ERROR';
    } else if (error.message.includes('Failed to parse')) {
      statusCode = 502;
      userMessage = 'AI generated an invalid response. Please try again.';
      errorType = 'AI_PARSE_ERROR';
    }

    logError(correlationId, 'Error in analyze-progress', {
      errorType,
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    return new Response(
      JSON.stringify({
        error: errorType,
        message: userMessage,
        correlationId
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
