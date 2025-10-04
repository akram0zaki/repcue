import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateJWT } from '../_shared/auth.ts'
import { RateLimiter, extractClientIP } from '../_shared/rate-limiter.ts'
import { Logger, generateCorrelationId } from './logger.ts'

/**
 * Export Data Edge Function
 * Exports user data from Supabase database with comprehensive error handling
 * and observability
 */
serve(async (req) => {
  const correlationId = generateCorrelationId();
  const logger = new Logger(correlationId);

  logger.info('Export data request received', {
    method: req.method,
    origin: req.headers.get('origin'),
    userAgent: req.headers.get('user-agent'),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.debug('CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate HTTP method
    if (req.method !== 'GET') {
      logger.warn('Invalid HTTP method', { method: req.method });
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
          correlationId,
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      return new Response(
        JSON.stringify({
          error: 'Missing authorization header',
          message: 'Please sign in to export your data',
          correlationId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract and validate JWT
    const jwt = authHeader.replace('Bearer ', '');
    logger.debug('Validating JWT token');

    let userId: string;
    try {
      const validatedUserId = await validateJWT(jwt);
      if (!validatedUserId) {
        logger.warn('JWT validation failed - no user ID returned');
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired token',
            message: 'Your session has expired. Please sign in again',
            correlationId,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      userId = validatedUserId;
      logger.setUserId(userId);
      logger.info('JWT validated successfully');
    } catch (jwtError) {
      logger.error('JWT validation exception', {
        error: jwtError instanceof Error ? jwtError.message : String(jwtError),
        stack: jwtError instanceof Error ? jwtError.stack : undefined,
      });
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          message: 'Unable to verify your identity. Please sign in again',
          correlationId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing required environment variables', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          message: 'Export service is temporarily unavailable. Please contact support',
          correlationId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    logger.debug('Creating Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get client IP for audit logging
    const clientIP = extractClientIP(req);
    logger.debug('Client IP extracted', { clientIP });

    // Check rate limiting
    logger.debug('Checking rate limit');
    const rateLimiter = new RateLimiter(supabase);
    let rateLimitResult;

    try {
      rateLimitResult = await rateLimiter.checkRateLimit('export-data', userId, clientIP);
    } catch (rateLimitError) {
      logger.error('Rate limit check failed', {
        error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
        stack: rateLimitError instanceof Error ? rateLimitError.stack : undefined,
      });
      return new Response(
        JSON.stringify({
          error: 'Rate limit check failed',
          message: 'Unable to verify request limits. Please try again',
          correlationId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime?.toISOString(),
      });
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitResult.message || 'You can request up to 3 exports per day',
          retryAfter: rateLimitResult.resetTime?.toISOString(),
          correlationId,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.getTime().toString() || '',
            'Retry-After': rateLimitResult.resetTime
              ? Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString()
              : '3600',
          },
          status: 429
        }
      );
    }

    logger.info('Rate limit check passed', { remaining: rateLimitResult.remaining });

    // Export user data via RPC function
    logger.info('Calling export_user_data RPC function');
    const { data: exportData, error: exportError } = await supabase.rpc('export_user_data', {
      p_user_id: userId
    });

    if (exportError) {
      logger.error('RPC export_user_data failed', {
        error: exportError.message,
        code: exportError.code,
        details: exportError.details,
        hint: exportError.hint,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to export data',
          message: 'Unable to retrieve your data. Please try again later or contact support',
          details: Deno.env.get('DEBUG') === 'true' ? exportError.message : undefined,
          correlationId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Validate export data is not null/undefined
    if (exportData === null || exportData === undefined) {
      logger.error('Export data is null or undefined', {
        dataType: typeof exportData,
        isNull: exportData === null,
        isUndefined: exportData === undefined,
      });
      return new Response(
        JSON.stringify({
          error: 'No data returned',
          message: 'Export function returned no data. This may indicate a database issue',
          correlationId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Validate export data structure
    if (typeof exportData !== 'object') {
      logger.error('Export data has invalid type', {
        dataType: typeof exportData,
        data: String(exportData).substring(0, 100),
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid data format',
          message: 'Export function returned invalid data format',
          correlationId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    logger.info('Export data retrieved successfully', {
      dataKeys: Object.keys(exportData as Record<string, unknown>),
    });

    // Update profile to track export request
    logger.debug('Updating profile export timestamp');
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ data_export_requested_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (profileUpdateError) {
      logger.warn('Failed to update profile export timestamp', {
        error: profileUpdateError.message,
        code: profileUpdateError.code,
      });
      // Continue despite profile update failure - non-critical
    } else {
      logger.debug('Profile export timestamp updated');
    }

    // Format the response with proper headers for download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `repcue-data-export-${timestamp}.json`;

    logger.info('Export completed successfully', { filename });

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Correlation-ID': correlationId,
        },
        status: 200
      }
    );

  } catch (error) {
    logger.error('Unexpected error in export-data function', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later',
        details: Deno.env.get('DEBUG') === 'true' && error instanceof Error
          ? error.message
          : undefined,
        correlationId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        status: 500
      }
    );
  }
});
