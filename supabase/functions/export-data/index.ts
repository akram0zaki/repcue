import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateJWT } from '../_shared/auth.ts'
import { RateLimiter, extractClientIP } from '../_shared/rate-limiter.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate method
    if (req.method !== 'GET') {
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
    const rateLimitResult = await rateLimiter.checkRateLimit('export-data', userId, clientIP)
    
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

    // Export user data
    const { data: exportData, error: exportError } = await supabase.rpc('export_user_data', {
      p_user_id: userId
    })

    if (exportError) {
      console.error('Error exporting user data:', exportError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to export data',
          message: 'Please try again later or contact support'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Update profile to track export request
    await supabase
      .from('profiles')
      .update({ data_export_requested_at: new Date().toISOString() })
      .eq('user_id', userId)

    // Format the response with proper headers for download
    const filename = `repcue-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json`
    
    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Export data error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to export user data'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})