import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateJWT } from '../_shared/auth.ts'
import { RateLimiter, extractClientIP } from '../_shared/rate-limiter.ts'

interface DeleteAccountRequest {
  confirmation: string; // User must type "DELETE" to confirm
  reason?: string; // Optional deletion reason
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
    const body = await req.json() as DeleteAccountRequest
    
    // Validate confirmation
    if (body.confirmation !== 'DELETE') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid confirmation', 
          message: 'You must type "DELETE" to confirm account deletion' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get client IP for audit logging
    const clientIP = extractClientIP(req)

    // Check rate limiting
    const rateLimiter = new RateLimiter(supabase)
    const rateLimitResult = await rateLimiter.checkRateLimit('delete-account', userId, clientIP)
    
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

    // Mark account for deletion (30-day grace period)
    const { error: markError } = await supabase.rpc('mark_account_for_deletion', {
      p_user_id: userId
    })

    if (markError) {
      console.error('Error marking account for deletion:', markError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process deletion request',
          message: 'Please try again later or contact support'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Log the deletion request with reason
    await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: 'ACCOUNT_DELETION_REQUESTED',
      p_resource_type: 'user_account',
      p_resource_id: userId,
      p_details: {
        reason: body.reason || 'No reason provided',
        ip_address: clientIP,
        grace_period_days: 30
      },
      p_ip_address: clientIP,
      p_user_agent: req.headers.get('User-Agent'),
      p_success: true
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion requested successfully',
        gracePeriod: '30 days',
        details: 'Your account has been marked for deletion. You have 30 days to reactivate it by logging in. After this period, all your data will be permanently deleted.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Delete account error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to process account deletion request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})