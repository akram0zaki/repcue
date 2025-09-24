// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

interface StatusResponse {
  status: 'live' | 'maintenance' | 'error';
  version: string;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        status: 'error',
        version: 'unknown',
        timestamp: new Date().toISOString()
      } as StatusResponse), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Status check requested');

    // Query the latest active version - simple query for just the version
    const { data: latestVersion, error: versionError } = await supabase
      .from('app_versions')
      .select('version_number')
      .eq('is_active', true)
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    if (versionError || !latestVersion) {
      console.error('Database query error:', versionError);
      return new Response(JSON.stringify({
        status: 'error',
        version: 'unknown',
        timestamp: new Date().toISOString()
      } as StatusResponse), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Status check - Current version: ${latestVersion.version_number}`);

    // Return successful status
    const response: StatusResponse = {
      status: 'live',
      version: latestVersion.version_number,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Unexpected error in get-status function:', error);

    return new Response(JSON.stringify({
      status: 'error',
      version: 'unknown',
      timestamp: new Date().toISOString()
    } as StatusResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});