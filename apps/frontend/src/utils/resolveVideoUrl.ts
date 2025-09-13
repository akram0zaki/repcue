import { storageService } from '../services/storageService';
import logger from './logger';

/**
 * Resolves video URLs, handling both regular URLs and blob-pending-sync:// URLs
 * For blob-pending-sync URLs, fetches the actual video data from IndexedDB and creates a blob URL
 */
export async function resolveVideoUrl(videoUrl: string | null | undefined): Promise<string | null> {
  if (!videoUrl) return null;

  // For regular URLs (http, https, blob, etc.), return them directly
  if (!videoUrl.startsWith('blob-pending-sync://')) {
    return videoUrl;
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
      logger.log('🎥 [ResolveVideo] Successfully created blob URL:', {
        exerciseId,
        originalUrl: videoUrl,
        blobUrl,
        fileSize: storedVideoFile.file_size,
        mimeType: storedVideoFile.mime_type
      });
      return blobUrl;
    } else {
      logger.warn('🎥 [ResolveVideo] No video file data found for exercise:', exerciseId);
      return null;
    }
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