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

    // Parse request body
    const body = await req.json();
    const { shareToken, catalogId } = body;

    // Validate required fields
    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'shareToken is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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

    // Determine target catalog
    let targetCatalogId = catalogId;
    if (!catalogId) {
      // Only use default catalog if none was provided
      targetCatalogId = 'general-fitness';
      console.log('No catalog ID provided, using default catalog:', targetCatalogId);
    } else {
      // Verify the provided catalog exists
      const { data: catalog, error: catalogError } = await supabase
        .from('exercise_catalogs')
        .select('id')
        .eq('id', targetCatalogId)
        .single();

      if (catalogError || !catalog) {
        console.error('Invalid catalog ID provided:', catalogError);
        return new Response(
          JSON.stringify({ error: 'Invalid catalog ID' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      console.log('Using provided catalog:', targetCatalogId);
    }

    // Look up share record and exercise details
    const { data: shareData, error: shareError } = await supabase
      .from('exercise_shares')
      .select(`
        id,
        exercise_id,
        owner_id,
        expires_at,
        deleted,
        exercises (
          id,
          name,
          description,
          category,
          exercise_type,
          difficulty_level,
          muscle_groups,
          equipment_needed,
          rep_duration_seconds,
          custom_video_url,
          has_video,
          instructions,
          copy_count,
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

    // Check if user is trying to save their own exercise
    if (shareData.owner_id === userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot save your own shared exercise' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const originalExercise = shareData.exercises;
    if (!originalExercise) {
      return new Response(
        JSON.stringify({ error: 'Exercise not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user has already saved this exercise (look for existing copy)
    const { data: existingExercise } = await supabase
      .from('exercises')
      .select('id, name')
      .eq('owner_id', userId)
      .eq('shared_from_exercise_id', originalExercise.id)
      .eq('deleted', false)
      .single();

    if (existingExercise) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Exercise already saved to your library',
          exerciseId: existingExercise.id,
          exerciseName: existingExercise.name
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const now = new Date().toISOString();
    const newExerciseId = crypto.randomUUID();

    // Create a copy of the shared exercise for the user
    const newExercise = {
      id: newExerciseId,
      owner_id: userId,
      name: `${originalExercise.name} (Shared)`,
      description: originalExercise.description,
      category: originalExercise.category,
      exercise_type: originalExercise.exercise_type,
      difficulty_level: originalExercise.difficulty_level,
      muscle_groups: originalExercise.muscle_groups,
      equipment_needed: originalExercise.equipment_needed,
      rep_duration_seconds: originalExercise.rep_duration_seconds,
      custom_video_url: originalExercise.custom_video_url,
      has_video: originalExercise.has_video,
      instructions: originalExercise.instructions,
      catalog_id: targetCatalogId,
      shared_from_exercise_id: originalExercise.id,
      shared_from_user_id: shareData.owner_id,
      is_shared_copy: true,
      copy_count: 0,
      created_at: now,
      updated_at: now,
      deleted: false,
      version: 1
    };

    const { error: exerciseInsertError } = await supabase
      .from('exercises')
      .insert(newExercise);

    if (exerciseInsertError) {
      console.error('Exercise insert error:', exerciseInsertError);
      return new Response(
        JSON.stringify({
          error: 'Failed to save exercise to your library',
          details: exerciseInsertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Increment copy_count on the original exercise
    await supabase
      .from('exercises')
      .update({
        copy_count: originalExercise.copy_count ? originalExercise.copy_count + 1 : 1,
        updated_at: now
      })
      .eq('id', originalExercise.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        exerciseId: newExerciseId,
        exerciseName: newExercise.name,
        message: 'Exercise successfully saved to your library',
        hasVideo: originalExercise.has_video || !!originalExercise.custom_video_url,
        sharedFromExerciseId: originalExercise.id,
        sharedFromUserId: shareData.owner_id
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in save-shared-exercise function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});