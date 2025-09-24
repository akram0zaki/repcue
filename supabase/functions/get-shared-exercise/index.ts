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

    // Initialize Supabase client with service role key for database access
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
    console.log(`Looking up share token: ${shareToken}`);

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
          category,
          muscle_groups,
          equipment_needed,
          exercise_type,
          difficulty_level,
          rep_duration_seconds,
          custom_video_url,
          instructions,
          version,
          created_at,
          updated_at
        )
      `)
      .eq('share_token', shareToken)
      .eq('deleted', false)
      .single();

    if (shareError || !shareData) {
      console.error('Share lookup error:', shareError);
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
      .select('display_name')
      .eq('owner_id', shareData.owner_id)
      .single();

    console.log(`Owner lookup for ${shareData.owner_id}:`, ownerData, ownerError);

    console.log(`Found share record for exercise: ${shareData.exercises?.name}`);

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

    // Get video file from storage if available
    let videoUrl = null;
    if (exercise.custom_video_url && (
      exercise.custom_video_url.startsWith('blob://') ||
      exercise.custom_video_url.startsWith('blob-pending-sync://')
    )) {
      // Look up the actual video file in storage
      const { data: videoFile } = await supabase
        .from('video_files')
        .select('id, storage_path')
        .eq('exercise_id', exercise.id)
        .eq('upload_pending', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (videoFile?.storage_path) {
        // Check if file actually exists in storage by trying to download it
        // NOTE: Bucket name updated from 'videos' to 'exercise-videos' to match upload path in sync_v2
        const { data: fileData, error: fileError } = await supabase.storage
          .from('exercise-videos')
          .download(videoFile.storage_path);

        console.log(`Checking file existence for: ${videoFile.storage_path}`, !!fileData, fileError?.message);

        if (fileData && !fileError) {
          // Generate signed URL for anonymous access (valid for 1 hour)
          const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from('exercise-videos')
            .createSignedUrl(videoFile.storage_path, 3600); // 1 hour expiry

          if (signedUrl && !signedUrlError) {
            videoUrl = signedUrl.signedUrl;
            console.log(`Generated signed video URL for anonymous access (expires in 1h)`);
          } else {
            console.error(`Failed to create signed URL: ${signedUrlError?.message}`);
          }
        } else {
          console.log(`Video file not found in storage: ${videoFile.storage_path} - ${fileError?.message}`);

          // Recovery mechanism: Mark video and related data as dirty to trigger re-sync
          console.log(`Attempting to recover video file by marking as dirty for sync...`);

          try {
            // Update the video_files record to mark it as needing upload
            const { error: updateError } = await supabase
              .from('video_files')
              .update({
                upload_pending: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', videoFile.id);

            if (updateError) {
              console.error(`Failed to mark video as dirty:`, updateError);
            } else {
              console.log(`Successfully marked video ${videoFile.id} as dirty for re-sync`);
            }

            // Mark the exercise as dirty to trigger sync with incremented version
            const { error: exerciseUpdateError } = await supabase
              .from('exercises')
              .update({
                updated_at: new Date().toISOString(),
                version: exercise.version + 1
              })
              .eq('id', exercise.id);

            if (exerciseUpdateError) {
              console.error(`Failed to mark exercise as dirty:`, exerciseUpdateError);
            } else {
              console.log(`Successfully marked exercise ${exercise.id} as dirty for re-sync (v${exercise.version + 1})`);
            }

            // Mark all related video files for this exercise as needing sync
            const { error: allVideosError } = await supabase
              .from('video_files')
              .update({
                upload_pending: true,
                updated_at: new Date().toISOString()
              })
              .eq('exercise_id', exercise.id)
              .eq('deleted', false);

            if (allVideosError) {
              console.error(`Failed to mark all videos as dirty:`, allVideosError);
            } else {
              console.log(`Successfully marked all videos for exercise ${exercise.id} as dirty for re-sync`);
            }

            // Update sync cursor to trigger owner's next sync
            const { error: cursorError } = await supabase
              .from('sync_cursors')
              .update({
                updated_at: new Date().toISOString()
              })
              .eq('owner_id', shareData.owner_id);

            if (cursorError) {
              console.error(`Failed to update sync cursor:`, cursorError);
            } else {
              console.log(`Successfully updated sync cursor for owner ${shareData.owner_id}`);
            }

          } catch (recoveryError) {
            console.error(`Video recovery failed:`, recoveryError);
          }
        }
      }
    } else if (exercise.custom_video_url &&
      (exercise.custom_video_url.startsWith('http://') ||
       exercise.custom_video_url.startsWith('https://'))) {
      // Use existing HTTP URL
      videoUrl = exercise.custom_video_url;
    }

    // Clean exercise data for public viewing
    const publicExercise = {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      category: exercise.category,
      muscle_groups: exercise.muscle_groups,
      equipment_needed: exercise.equipment_needed,
      exercise_type: exercise.exercise_type,
      difficulty_level: exercise.difficulty_level,
      rep_duration_seconds: exercise.rep_duration_seconds,
      custom_video_url: videoUrl,
      instructions: exercise.instructions,
      created_at: exercise.created_at,
      updated_at: exercise.updated_at
    };

    // Prepare share information
    const shareInfo = {
      sharedBy: ownerData?.display_name || 'Anonymous User',
      sharedAt: shareData.created_at,
      isPublic: !shareData.shared_with_user_id,
      permissionLevel: shareData.permission_level,
      expiresAt: shareData.expires_at,
      videoRecoveryTriggered: !videoUrl && exercise.custom_video_url && (
        exercise.custom_video_url.startsWith('blob://') ||
        exercise.custom_video_url.startsWith('blob-pending-sync://')
      )
    };

    console.log(`Successfully returning shared exercise: ${publicExercise.name}`);

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