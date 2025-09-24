import { storageService } from '../services/storageService';
import { supabase } from '../config/supabase';
import logger from './logger';

/**
 * Resolves video URLs, handling:
 *  - Regular (http/https/blob) URLs: returned directly
 *  - blob-pending-sync://{exerciseId}/{filename}: local file stored, upload still pending
 *  - blob-video://{exerciseId}/{filename}: local file stored & cloud-confirmed (stable scheme)
 *  - shared-video://{originalExerciseId}/{originalOwnerId}: reuse another exercise's video
 *
 * For blob-* schemes we look up IndexedDB (via storageService) and materialize a runtime blob: URL.
 * If the binary is missing but a storage_path exists we attempt a download (covers recovery cases).
 * For shared videos we reference the original exercise's stored video file.
 */
export async function resolveVideoUrl(videoUrl: string | null | undefined): Promise<string | null> {
  if (!videoUrl) return null;

  // For regular URLs (http, https, blob, etc.), return them directly
  if (!videoUrl.startsWith('blob-pending-sync://') && !videoUrl.startsWith('blob-video://') && !videoUrl.startsWith('shared-video://')) {
    return videoUrl;
  }

  // Handle shared video URLs: shared-video://{originalExerciseId}/{originalOwnerId}
  if (videoUrl.startsWith('shared-video://')) {
    try {
      const match = videoUrl.match(/^shared-video:\/\/([^/]+)\/([^/]+)$/);
      if (!match) {
        logger.warn('🎥 [ResolveVideo] Invalid shared-video URL format:', videoUrl);
        return null;
      }

      const [, originalExerciseId, originalOwnerId] = match;
      logger.log('🎥 [ResolveVideo] Resolving shared video URL for original exercise:', {
        originalExerciseId,
        originalOwnerId,
        sharedVideoUrl: videoUrl
      });

      // Try to get the video file for the original exercise ID
      const originalVideoFile = await storageService.getVideoFile(originalExerciseId);

      if (originalVideoFile?.file_data) {
        // Create a blob URL from the original exercise's video data
        const blobUrl = URL.createObjectURL(originalVideoFile.file_data);
        logger.log('🎥 [ResolveVideo] Successfully created blob URL from shared video data:', {
          originalExerciseId,
          originalOwnerId,
          sharedVideoUrl: videoUrl,
          blobUrl,
          fileSize: originalVideoFile.file_size,
          mimeType: originalVideoFile.mime_type
        });

        // Validate the created blob URL by attempting to fetch it
        try {
          const response = await fetch(blobUrl, { method: 'HEAD' });
          logger.log('🎥 [ResolveVideo] Shared video blob URL validation:', {
            originalExerciseId,
            blobUrl,
            isValid: response.ok,
            status: response.status,
            contentType: response.headers.get('Content-Type'),
            contentLength: response.headers.get('Content-Length'),
            expectedMimeType: originalVideoFile.mime_type
          });
        } catch (validateError) {
          logger.error('🎥 [ResolveVideo] Shared video blob URL validation failed:', {
            originalExerciseId,
            blobUrl,
            error: validateError
          });
        }

        return blobUrl;
      }

      logger.warn('🎥 [ResolveVideo] No video file data found for shared exercise:', {
        originalExerciseId,
        originalOwnerId,
        sharedVideoUrl: videoUrl
      });
      return null;
    } catch (error) {
      logger.error('🎥 [ResolveVideo] Failed to resolve shared-video URL:', error);
      return null;
    }
  }

  try {
    // Handle both blob-pending-sync:// and blob-video:// (stable) schemes
    const isPendingScheme = videoUrl.startsWith('blob-pending-sync://');
    const isStableScheme = videoUrl.startsWith('blob-video://');

    if (!isPendingScheme && !isStableScheme) {
      // Not a blob-* scheme (shared handled earlier)
      return null;
    }

    const match = videoUrl.match(/^blob-(?:pending-sync|video):\/\/([^/]+)\//);
    if (!match) {
      logger.warn('🎥 [ResolveVideo] Invalid blob video URL format:', videoUrl);
      return null;
    }

    const exerciseId = match[1];
    logger.log('🎥 [ResolveVideo] Resolving', {
      exerciseId,
      scheme: isPendingScheme ? 'blob-pending-sync' : 'blob-video',
      videoUrl
    });

    // Get the stored video file from IndexedDB
    const storedVideoFile = await storageService.getVideoFile(exerciseId);

    if (storedVideoFile?.file_data) {
      // Skip the problematic validation that was causing deletion
      // Just create the blob URL directly

      // Create blob URL from stored file data using proper Blob constructor
      let blobUrl: string;

      if (storedVideoFile.file_data instanceof File) {
        // Convert File to ArrayBuffer then to Blob for better Firefox compatibility
        const arrayBuffer = await storedVideoFile.file_data.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: storedVideoFile.mime_type });
        blobUrl = URL.createObjectURL(blob);
      } else {
        // Direct blob creation if it's already a Blob
        blobUrl = URL.createObjectURL(storedVideoFile.file_data);
      }

      logger.log('🎥 [ResolveVideo] Successfully created blob URL from local data:', {
        exerciseId,
        originalUrl: videoUrl,
        blobUrl,
        fileSize: storedVideoFile.file_size,
        mimeType: storedVideoFile.mime_type,
        dataType: storedVideoFile.file_data.constructor.name
      });

      return blobUrl;
    }

    // If no local data but we have a video record with storage_path, try downloading from cloud
    if (storedVideoFile?.storage_path && !storedVideoFile.file_data) {
      logger.log('🎥 [ResolveVideo] Video exists in cloud storage, downloading:', storedVideoFile.storage_path);

      try {
        // Check if this is a shared exercise video by examining the storage path
        // Shared exercise videos have paths like: {original_owner_id}/{exercise_id}/{filename}
        // We can detect this by checking if the exercise doesn't belong to the current user
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;
        const isSharedExercise = currentUserId &&
          !storedVideoFile.storage_path.startsWith(currentUserId);

        let data, error;

        if (isSharedExercise) {
          logger.log('🎥 [ResolveVideo] Detected shared exercise, using download-shared-video edge function:', {
            exerciseId,
            storagePath: storedVideoFile.storage_path,
            currentUserId
          });

          // Use the download-shared-video edge function for shared exercises
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            logger.error('🎥 [ResolveVideo] No valid session for shared video download');
            return null;
          }

          // Extract originalOwnerId from storage path: {originalOwnerId}/{exerciseId}/{filename}
          const pathParts = storedVideoFile.storage_path.split('/');
          const originalOwnerId = pathParts[0];
          const originalExerciseId = pathParts[1];

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-shared-video`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              exerciseId: exerciseId,
              originalExerciseId: originalExerciseId,
              originalOwnerId: originalOwnerId
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('🎥 [ResolveVideo] Shared video download failed:', {
              exerciseId,
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            return null;
          }

          data = await response.blob();
          error = null;
        } else {
          // Download video from Supabase Storage directly (for user's own exercises)
          // All videos are stored in exercise-videos bucket only
          const storageResponse = await supabase.storage
            .from('exercise-videos')
            .download(storedVideoFile.storage_path);

          data = storageResponse.data;
          error = storageResponse.error;
        }

        if (error) {
          logger.error('🎥 [ResolveVideo] Failed to download video from storage:', error);

          // For shared exercises with download failures, check if we can provide a fallback
          if (videoUrl.startsWith('blob-pending-sync://')) {
            logger.warn('🎥 [ResolveVideo] Download failed for shared exercise - no video available', {
              exerciseId,
              storagePath: storedVideoFile.storage_path,
              error: error.message
            });
          }

          return null;
        }

        if (data) {
          // Validate MP4 signature before processing
          const arrayBuffer = await data.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
          const signature = Array.from(bytes.slice(4, 8)).map(b => String.fromCharCode(b)).join('');

          logger.log('🎥 [ResolveVideo] Downloaded file validation:', {
            exerciseId,
            fileSize: arrayBuffer.byteLength,
            expectedSize: data.size,
            signature,
            isValidMP4: signature === 'ftyp',
            firstBytesHex: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
          });

          if (signature !== 'ftyp') {
            logger.error('🎥 [ResolveVideo] Downloaded file is not a valid MP4:', {
              exerciseId,
              expectedSignature: 'ftyp',
              actualSignature: signature,
              storagePath: storedVideoFile.storage_path
            });
            return null;
          }

          // Store the downloaded video data back in IndexedDB
          const file = new File([arrayBuffer], storedVideoFile.file_name, {
            type: storedVideoFile.mime_type
          });

          // Update the local record with the downloaded data
          await storageService.saveVideoFile(exerciseId, file);

          // Create blob URL directly from the ArrayBuffer instead of the Blob
          // This works better with Firefox and IndexedDB
          const directBlob = new Blob([arrayBuffer], { type: storedVideoFile.mime_type });
          const blobUrl = URL.createObjectURL(directBlob);

          logger.log('🎥 [ResolveVideo] Successfully downloaded and created blob URL from ArrayBuffer:', {
            exerciseId,
            originalUrl: videoUrl,
            blobUrl,
            fileSize: arrayBuffer.byteLength,
            mimeType: storedVideoFile.mime_type
          });

          return blobUrl;
        }
      } catch (downloadError) {
        logger.error('🎥 [ResolveVideo] Error during video download:', downloadError);
      }
    }

    logger.warn('🎥 [ResolveVideo] No video file data found locally or in cloud storage for exercise:', exerciseId);
    return null;
  } catch (error) {
    logger.error('🎥 [ResolveVideo] Failed to resolve blob video URL:', error);
    return null;
  }
}

/**
 * Creates a cleanup function to revoke blob URLs when they're no longer needed
 */
export function createVideoUrlCleanup(blobUrl: string | null): () => void {
  return () => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  };
}