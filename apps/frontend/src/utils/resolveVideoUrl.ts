import { storageService } from '../services/storageService';
import { supabase } from '../config/supabase';
import logger from './logger';

/**
 * Resolves video URLs, handling both regular URLs, blob-pending-sync:// URLs, and shared-video:// URLs
 * For blob-pending-sync URLs, fetches the actual video data from IndexedDB and creates a blob URL
 * For shared-video URLs, fetches video data from the original exercise's video files
 * If video data is missing locally but exists in cloud storage, downloads it first
 */
export async function resolveVideoUrl(videoUrl: string | null | undefined): Promise<string | null> {
  if (!videoUrl) return null;

  // For regular URLs (http, https, blob, etc.), return them directly
  if (!videoUrl.startsWith('blob-pending-sync://') && !videoUrl.startsWith('shared-video://')) {
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
    // Extract exercise ID from blob-pending-sync URL format: blob-pending-sync://{exerciseId}/{filename}
    const match = videoUrl.match(/^blob-pending-sync:\/\/([^/]+)\//);
    if (!match) {
      logger.warn('🎥 [ResolveVideo] Invalid blob-pending-sync URL format:', videoUrl);
      return null;
    }

    const exerciseId = match[1];
    logger.log('🎥 [ResolveVideo] Resolving blob-pending-sync URL for exercise:', exerciseId);

    // Get the stored video file from IndexedDB
    const storedVideoFile = await storageService.getVideoFile(exerciseId);

    if (storedVideoFile?.file_data) {
      // Create a blob URL from the stored file data
      const blobUrl = URL.createObjectURL(storedVideoFile.file_data);
      logger.log('🎥 [ResolveVideo] Successfully created blob URL from local data:', {
        exerciseId,
        originalUrl: videoUrl,
        blobUrl,
        fileSize: storedVideoFile.file_size,
        mimeType: storedVideoFile.mime_type
      });
      return blobUrl;
    }

    // If no local data but we have a video record with storage_path, try downloading from cloud
    if (storedVideoFile?.storage_path && !storedVideoFile.file_data) {
      logger.log('🎥 [ResolveVideo] Video exists in cloud storage, downloading:', storedVideoFile.storage_path);

      try {
        // Download video from Supabase Storage
        const { data, error } = await supabase.storage
          .from('videos')
          .download(storedVideoFile.storage_path);

        if (error) {
          logger.error('🎥 [ResolveVideo] Failed to download video from storage:', error);
          return null;
        }

        if (data) {
          // Store the downloaded video data back in IndexedDB
          const arrayBuffer = await data.arrayBuffer();
          const file = new File([arrayBuffer], storedVideoFile.file_name, {
            type: storedVideoFile.mime_type
          });

          // Update the local record with the downloaded data
          await storageService.saveVideoFile(exerciseId, file);

          // Create and return blob URL
          const blobUrl = URL.createObjectURL(data);
          logger.log('🎥 [ResolveVideo] Successfully downloaded and created blob URL:', {
            exerciseId,
            originalUrl: videoUrl,
            blobUrl,
            fileSize: data.size,
            mimeType: data.type
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
    logger.error('🎥 [ResolveVideo] Failed to resolve blob-pending-sync URL:', error);
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