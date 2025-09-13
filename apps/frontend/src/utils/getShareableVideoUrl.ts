import logger from './logger';
import { StorageService } from '../services/storageService';

/**
 * Converts blob-pending-sync URLs to shareable Supabase storage URLs
 * For sharing exercises with external users who don't have local access
 */
export async function getShareableVideoUrl(customVideoUrl: string | null): Promise<string | null> {
  if (!customVideoUrl) return null;

  // If it's already a storage URL, return as-is
  if (customVideoUrl.startsWith('http')) {
    return customVideoUrl;
  }

  // Handle blob-pending-sync URLs
  if (customVideoUrl.startsWith('blob-pending-sync://')) {
    try {
      // Extract exercise ID from blob-pending-sync URL format: blob-pending-sync://{exerciseId}/{filename}
      const match = customVideoUrl.match(/^blob-pending-sync:\/\/([^/]+)\//);
      if (!match) {
        logger.warn('🔗 [ShareableUrl] Invalid blob-pending-sync URL format:', customVideoUrl);
        return null;
      }

      const exerciseId = match[1];
      logger.debug('🔗 [ShareableUrl] Looking up storage URL for exercise:', exerciseId);

      // Look up the video file in IndexedDB to get the storage path
      const storage = StorageService.getInstance();
      const videoFiles = await storage.getVideoFilesByExerciseId(exerciseId);
      const videoFile = videoFiles.find(vf => !vf.deleted && vf.storage_path);

      if (!videoFile?.storage_path) {
        logger.warn('🔗 [ShareableUrl] No storage path found for exercise:', exerciseId);
        return null;
      }

      // Convert to public storage URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const shareableUrl = `${supabaseUrl}/storage/v1/object/public/videos/${videoFile.storage_path}`;

      logger.debug('🔗 [ShareableUrl] Converted to shareable URL:', shareableUrl);
      return shareableUrl;

    } catch (error) {
      logger.error('🔗 [ShareableUrl] Failed to convert blob-pending-sync URL:', error);
      return null;
    }
  }

  // For other URL types, return null
  logger.warn('🔗 [ShareableUrl] Unsupported URL format for sharing:', customVideoUrl);
  return null;
}

/**
 * Gets the appropriate video URL based on context
 * - For local playback: returns blob-pending-sync URL (handled by resolveVideoUrl)
 * - For sharing: returns Supabase storage URL
 */
export async function getContextualVideoUrl(customVideoUrl: string | null, context: 'playback' | 'sharing'): Promise<string | null> {
  if (!customVideoUrl) return null;

  if (context === 'sharing') {
    return getShareableVideoUrl(customVideoUrl);
  }

  // For playback context, return the original URL (resolveVideoUrl handles conversion)
  return customVideoUrl;
}