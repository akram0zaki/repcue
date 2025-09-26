import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log('=== DOWNLOAD SHARED VIDEO FUNCTION START ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({
        error: 'Missing authorization'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { exerciseId, originalExerciseId, originalOwnerId } = await req.json();
    console.log('Request params:', { exerciseId, originalExerciseId, originalOwnerId });

    if (!exerciseId || !originalExerciseId || !originalOwnerId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: exerciseId, originalExerciseId, originalOwnerId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false }
    });

    // Verify user authentication
    const jwt = authHeader.slice(7);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(jwt);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has access via user_favorites (reference-based sharing)
    console.log('Verifying user has shared exercise reference...');
    const { data: favoriteRecord, error: verifyError } = await supabaseService
      .from('user_favorites')
      .select('id, item_id')
      .eq('owner_id', user.id)
      .eq('item_type', 'exercise')
      .eq('item_id', originalExerciseId)
      .eq('exercise_type', 'shared')
      .eq('deleted', false)
      .maybeSingle();

    if (verifyError || !favoriteRecord) {
      console.error('User does not have access to this shared exercise via favorites:', verifyError);

      // FALLBACK: Also check if user owns the exercise directly
      const { data: ownedExercise, error: ownerError } = await supabaseService
        .from('exercises')
        .select('id, owner_id')
        .eq('id', originalExerciseId)
        .eq('owner_id', user.id)
        .eq('deleted', false)
        .single();

      if (ownerError || !ownedExercise) {
        console.error('User does not own the exercise either:', ownerError);
        return new Response(JSON.stringify({
          error: 'Access denied: shared exercise not found or not owned by user'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('User owns the exercise directly, allowing access');
    } else {
      console.log('User has shared exercise reference, allowing access');
    }

    // Find the video file record
    console.log('Finding video file for original exercise...');
    const { data: videoFileRecords, error: queryError } = await supabaseService
      .from('video_files')
      .select('file_name, storage_path, file_size, mime_type')
      .eq('exercise_id', originalExerciseId)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError || !videoFileRecords || videoFileRecords.length === 0) {
      console.error('No video file found:', queryError);
      return new Response(JSON.stringify({
        error: 'No video file found for this exercise'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const videoFileRecord = videoFileRecords[0];
    console.log('Found video file:', videoFileRecord);

    // Download the video file using service role access
    console.log('Downloading video file from storage...');
    const { data: videoBlob, error: downloadError } = await supabaseService.storage
      .from('exercise-videos')
      .download(videoFileRecord.storage_path);

    if (downloadError || !videoBlob) {
      console.error('Failed to download video file:', downloadError);
      return new Response(JSON.stringify({
        error: 'Failed to download video file',
        details: downloadError?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Video downloaded successfully:', {
      size: videoBlob.size,
      type: videoBlob.type
    });

    // Return the video file directly
    return new Response(videoBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': videoFileRecord.mime_type || 'video/mp4',
        'Content-Disposition': `attachment; filename="${videoFileRecord.file_name}"`,
        'Content-Length': videoBlob.size.toString()
      }
    });

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Error:', error);
    const errMsg = (error && typeof error === 'object' && 'message' in error) ? (error as any).message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});