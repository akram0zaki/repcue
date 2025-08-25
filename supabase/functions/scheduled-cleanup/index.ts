import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    // Validate that this is called by a cron job or authorized service
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET') || 'default-cron-secret'
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
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

    console.log('Starting scheduled data cleanup...')

    // Run data retention cleanup
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_retained_data')

    if (cleanupError) {
      console.error('Data cleanup error:', cleanupError)
      return new Response(
        JSON.stringify({ 
          error: 'Cleanup failed',
          details: cleanupError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('Data cleanup completed:', cleanupResult)

    // Clean up old rate limit logs
    const rateLimitCleanupQuery = `
      DELETE FROM audit_logs 
      WHERE action = 'API_REQUEST' 
      AND resource_type = 'rate_limit' 
      AND created_at < NOW() - INTERVAL '7 days'
    `

    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('exec_sql', { sql: rateLimitCleanupQuery })

    if (rateLimitError) {
      console.warn('Rate limit cleanup warning:', rateLimitError)
    } else {
      console.log('Rate limit logs cleaned up:', rateLimitResult)
    }

    // Log the cleanup operation
    await supabase.rpc('log_audit_event', {
      p_user_id: null,
      p_action: 'SCHEDULED_CLEANUP',
      p_resource_type: 'system',
      p_resource_id: 'data_retention',
      p_details: {
        cleanup_result: cleanupResult,
        rate_limit_cleanup: rateLimitResult,
        timestamp: new Date().toISOString()
      },
      p_ip_address: null,
      p_user_agent: 'Scheduled-Cleanup-Job',
      p_success: true
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data cleanup completed successfully',
        details: {
          data_cleanup: cleanupResult,
          rate_limit_cleanup: rateLimitResult,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Scheduled cleanup error:', error)
    
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