import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateJWT } from '../_shared/auth.ts'
import { processSyncRequest } from '../_shared/sync-processor.ts'
import { RateLimiter, extractClientIP } from '../_shared/rate-limiter.ts'

interface SyncRequest {
  since?: string;
  tables: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  clientInfo?: {
    appVersion: string;
    deviceId: string;
  };
}

interface SyncResponse {
  changes: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  cursor: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract and validate JWT
    const jwt = authHeader.replace('Bearer ', '')
    const userId = await validateJWT(jwt)
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body = await req.json() as SyncRequest
    
    // Validate request structure
    if (!body.tables || typeof body.tables !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing or invalid tables' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Extract client IP for rate limiting and audit logging
    const clientIP = extractClientIP(req)

    // Check rate limiting
    const rateLimiter = new RateLimiter(supabase)
    const rateLimitResult = await rateLimiter.checkRateLimit('sync', userId, clientIP)
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: rateLimitResult.message,
          retryAfter: rateLimitResult.resetTime?.toISOString()
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.getTime().toString() || ''
          },
          status: 429
        }
      )
    }

    // Log sync request start
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: 'SYNC_REQUEST_START',
      p_resource_type: 'sync',
      p_resource_id: userId,
      p_details: {
        tables: Object.keys(body.tables),
        since: body.since,
        client_info: body.clientInfo
      },
      p_ip_address: clientIP,
      p_user_agent: req.headers.get('User-Agent'),
      p_success: true
    })

    // Process sync request
    const syncResponse = await processSyncRequest(supabase, userId, body)

    // Log sync request completion
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: 'SYNC_REQUEST_COMPLETE',
      p_resource_type: 'sync',
      p_resource_id: userId,
      p_details: {
        tables_processed: Object.keys(syncResponse.changes).length,
        cursor: syncResponse.cursor
      },
      p_ip_address: clientIP,
      p_user_agent: req.headers.get('User-Agent'),
      p_success: true
    })

    return new Response(
      JSON.stringify(syncResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})