// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Extract share token from query parameter
    const url = new URL(req.url);
    const shareToken = url.searchParams.get('token');

    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'Share token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate token format (basic check)
    if (shareToken.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid share token format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Look up share record with exercise details
    const { data: shareData, error: shareError } = await supabase
      .from('exercise_shares')
      .select(`
        id,
        exercise_id,
        owner_id,
        permission_level,
        created_at,
        expires_at,
        deleted,
        exercises (
          id,
          name,
          description,
          muscle_group,
          primary_muscles,
          secondary_muscles,
          equipment,
          type,
          difficulty,
          rep_duration_seconds,
          custom_video_url,
          video_file_id,
          custom_instructions,
          created_at,
          updated_at
        )
      `)
      .eq('share_token', shareToken)
      .eq('deleted', false)
      .single();

    if (shareError || !shareData) {
      if (shareError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Share token not found or has expired' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.error('Share lookup error:', shareError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve shared exercise' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if share has expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Share token has expired' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get owner profile information (display name only)
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', shareData.owner_id)
      .single();

    // Prepare exercise data (remove sensitive fields)
    const exercise = shareData.exercises;
    if (!exercise) {
      return new Response(
        JSON.stringify({ error: 'Exercise not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Clean exercise data for public viewing
    const publicExercise = {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      muscle_group: exercise.muscle_group,
      primary_muscles: exercise.primary_muscles,
      secondary_muscles: exercise.secondary_muscles,
      equipment: exercise.equipment,
      type: exercise.type,
      difficulty: exercise.difficulty,
      rep_duration_seconds: exercise.rep_duration_seconds,
      custom_video_url: exercise.custom_video_url,
      video_file_id: exercise.video_file_id,
      custom_instructions: exercise.custom_instructions,
      created_at: exercise.created_at,
      updated_at: exercise.updated_at
    };

    // Prepare share information
    const shareInfo = {
      sharedBy: ownerData?.display_name || ownerData?.username || 'Anonymous User',
      sharedAt: shareData.created_at,
      isPublic: !shareData.shared_with_user_id,
      permissionLevel: shareData.permission_level,
      expiresAt: shareData.expires_at
    };

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        exercise: publicExercise,
        shareInfo
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-shared-exercise function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});