// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function should be publicly accessible for privacy-first users
// Set verify_jwt: false in deployment configuration

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Interface definitions matching the design document
interface VersionCheckRequest {
  current_version: string;
  client_id?: string;
  user_consent?: boolean;
  platform?: string;
}

interface VersionCheckResponse {
  update_available: boolean;
  latest_version?: string;
  update_policy?: 'force' | 'critical' | 'optional';
  changelog?: {
    new_features?: string[];
    improvements?: string[];
    bug_fixes?: string[];
    security_updates?: string[];
  };
  download_url?: string;
  force_update?: boolean;
  message?: string;
}

// Version comparison utility
function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(n => parseInt(n, 10));
  const latestParts = latest.split('.').map(n => parseInt(n, 10));

  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse request body
    const body: VersionCheckRequest = await req.json();

    if (!body.current_version) {
      return new Response(
        JSON.stringify({ error: 'current_version is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate version format (semantic versioning: x.y.z)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(body.current_version)) {
      return new Response(
        JSON.stringify({ error: 'Invalid version format. Expected semantic versioning (x.y.z)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          update_available: false,
          message: 'Unable to check for updates. Please try again later.'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Version check requested - Current: ${body.current_version}, User consent: ${body.user_consent || false}`);

    // Query the latest active version
    const { data: latestVersion, error: versionError } = await supabase
      .from('app_versions')
      .select('*')
      .eq('is_active', true)
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    if (versionError) {
      console.error('Database query error:', versionError);

      // Graceful degradation - return no update available if database is unavailable
      return new Response(
        JSON.stringify({
          update_available: false,
          message: 'Unable to check for updates. Please try again later.'
        } as VersionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!latestVersion) {
      console.log('No active version found in database');
      return new Response(
        JSON.stringify({
          update_available: false,
          message: 'No updates available at this time.'
        } as VersionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Compare versions
    const versionComparison = compareVersions(body.current_version, latestVersion.version_number);
    const updateAvailable = versionComparison < 0;

    console.log(`Version comparison - Current: ${body.current_version}, Latest: ${latestVersion.version_number}, Update available: ${updateAvailable}`);

    // If no update is needed
    if (!updateAvailable) {
      return new Response(
        JSON.stringify({
          update_available: false,
          latest_version: latestVersion.version_number,
          message: 'You are running the latest version.'
        } as VersionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Privacy-respecting: Only proceed with detailed update info if user has consented
    // or if it's a force update (which bypasses consent for security)
    const isForceUpdate = latestVersion.update_policy === 'force';
    const canProvideDetailedInfo = body.user_consent === true || isForceUpdate;

    if (!canProvideDetailedInfo) {
      // Basic update notification without detailed information
      return new Response(
        JSON.stringify({
          update_available: true,
          latest_version: latestVersion.version_number,
          message: 'An update is available. Enable cloud sync to get detailed update information.'
        } as VersionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare detailed update response
    const response: VersionCheckResponse = {
      update_available: true,
      latest_version: latestVersion.version_number,
      update_policy: latestVersion.update_policy as 'force' | 'critical' | 'optional',
      force_update: isForceUpdate,
      changelog: latestVersion.changelog || undefined,
      message: getUpdateMessage(latestVersion.update_policy)
    };

    // Add download URL for PWA reload
    if (body.platform) {
      response.download_url = `${supabaseUrl.replace('/rest/v1', '')}/`;
    }

    console.log(`Returning update response - Policy: ${latestVersion.update_policy}, Version: ${latestVersion.version_number}`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in check-version function:', error);

    // Graceful error handling - don't break the app
    return new Response(
      JSON.stringify({
        update_available: false,
        message: 'Unable to check for updates. Please try again later.'
      } as VersionCheckResponse),
      {
        status: 200, // Return 200 to avoid breaking the client app
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to generate user-friendly update messages
function getUpdateMessage(updatePolicy: string): string {
  switch (updatePolicy) {
    case 'force':
      return 'A critical security update is required. The app will update automatically.';
    case 'critical':
      return 'An important update is available with security improvements and bug fixes.';
    case 'optional':
      return 'A new update is available with new features and improvements.';
    default:
      return 'An update is available.';
  }
}