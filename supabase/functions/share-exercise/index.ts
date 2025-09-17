// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Rate limiting in-memory store (for demo purposes, production would use Redis/external storage)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // 10 shares per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// JWT validation function
async function validateJWT(jwt: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      console.log('JWT validation failed:', error?.message || 'No user');
      return null;
    }

    return user.id;
  } catch (e) {
    console.log('JWT validation error:', e.message);
    return null;
  }
}

// Rate limiting check
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  // Increment count
  userLimit.count++;
  return true;
}

// Email validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize email input
function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    // Extract JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const jwt = authHeader.slice(7); // Remove 'Bearer ' prefix
    const userId = await validateJWT(jwt);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 10 shares per hour.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { exerciseId, isPublic = true, recipientEmail } = body;

    // Validate required fields
    if (!exerciseId) {
      return new Response(
        JSON.stringify({ error: 'exerciseId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate recipient email if provided
    if (recipientEmail) {
      if (!validateEmail(recipientEmail)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the exercise
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, name, owner_id')
      .eq('id', exerciseId)
      .eq('owner_id', userId)
      .eq('deleted', false)
      .single();

    if (exerciseError || !exercise) {
      if (exerciseError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Exercise not found or you do not own this exercise' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.error('Exercise query error:', exerciseError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify exercise ownership' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate share token using the database function
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_share_token');

    if (tokenError || !tokenData) {
      console.error('Token generation error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate share token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const shareToken = tokenData;

    // Create share record
    const shareData = {
      exercise_id: exerciseId,
      owner_id: userId,
      shared_with_user_id: recipientEmail ? null : null, // For public shares
      permission_level: 'view',
      share_token: shareToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      version: 1
    };

    const { data: shareRecord, error: shareError } = await supabase
      .from('exercise_shares')
      .insert(shareData)
      .select('id, share_token')
      .single();

    if (shareError) {
      console.error('Share creation error:', shareError);
      return new Response(
        JSON.stringify({ error: 'Failed to create share record' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate share URL
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/v1', '') || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        shareUrl,
        shareToken,
        exerciseName: exercise.name
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in share-exercise function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});