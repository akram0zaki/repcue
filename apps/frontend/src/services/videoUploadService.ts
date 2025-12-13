/**
 * Video Upload Service
 * 
 * Handles background upload of custom exercise videos to Supabase Storage.
 * Videos are stored locally first (offline-first), then uploaded when online.
 * 
 * Architecture:
 * 1. User adds video → stored in IndexedDB with upload_pending=true
 * 2. This service monitors for pending uploads
 * 3. When online, uploads directly to Supabase Storage (NOT via sync function)
 * 4. On success, updates video_files record with storage_path
 * 5. The storage_path reference syncs normally via correctSyncService
 */

import { supabase } from '../config/supabase';
import logger from '../utils/logger';

// Types
interface PendingVideoFile {
  id: string;
  exercise_id: string;
  file_name: string;
  file_data: Blob | File | null;
  file_size: number;
  mime_type: string;
  owner_id?: string | null;
  upload_pending: boolean;
  storage_path?: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted?: boolean;
}

interface UploadResult {
  success: boolean;
  videoFileId: string;
  storagePath?: string;
  error?: string;
}

interface UploadProgress {
  videoFileId: string;
  exerciseId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  progress?: number; // 0-100
  error?: string;
}

type UploadProgressCallback = (progress: UploadProgress) => void;

// Constants
const MAX_UPLOAD_SIZE_MB = 50; // 50MB max video size
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const UPLOAD_RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
const STORAGE_BUCKET = 'exercise-videos';

class VideoUploadService {
  private static instance: VideoUploadService;
  private isProcessing = false;
  private uploadQueue: Map<string, PendingVideoFile> = new Map();
  private retryCount: Map<string, number> = new Map();
  private progressCallbacks: Set<UploadProgressCallback> = new Set();
  private onlineHandler: (() => void) | null = null;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): VideoUploadService {
    if (!VideoUploadService.instance) {
      VideoUploadService.instance = new VideoUploadService();
    }
    return VideoUploadService.instance;
  }

  /**
   * Initialize the service and start monitoring for pending uploads
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.log('[VideoUpload] Initializing video upload service');

    // Listen for online events to trigger uploads
    this.onlineHandler = () => {
      logger.log('[VideoUpload] Network online, checking for pending uploads');
      this.processPendingUploads();
    };
    window.addEventListener('online', this.onlineHandler);

    // Check for pending uploads on init if online
    if (navigator.onLine) {
      // Delay to allow app to fully initialize
      setTimeout(() => this.processPendingUploads(), 5000);
    }

    this.initialized = true;
    logger.log('[VideoUpload] Video upload service initialized');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    this.progressCallbacks.clear();
    this.uploadQueue.clear();
    this.retryCount.clear();
    this.initialized = false;
  }

  /**
   * Subscribe to upload progress updates
   */
  onProgress(callback: UploadProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Notify all progress subscribers
   */
  private notifyProgress(progress: UploadProgress): void {
    this.progressCallbacks.forEach(cb => {
      try {
        cb(progress);
      } catch (e) {
        logger.warn('[VideoUpload] Progress callback error:', e);
      }
    });
  }

  /**
   * Check for and process all pending video uploads
   */
  async processPendingUploads(): Promise<void> {
    if (this.isProcessing) {
      logger.log('[VideoUpload] Already processing uploads, skipping');
      return;
    }

    if (!navigator.onLine) {
      logger.log('[VideoUpload] Offline, skipping upload processing');
      return;
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('[VideoUpload] No authenticated user, skipping uploads');
      return;
    }

    this.isProcessing = true;
    logger.log('[VideoUpload] Starting to process pending uploads');

    try {
      // Get pending video files from IndexedDB
      const pendingFiles = await this.getPendingVideoFiles(user.id);
      
      if (pendingFiles.length === 0) {
        logger.log('[VideoUpload] No pending uploads found');
        return;
      }

      logger.log(`[VideoUpload] Found ${pendingFiles.length} pending uploads`);

      // Process each pending file
      for (const videoFile of pendingFiles) {
        // Skip if already in queue and uploading
        if (this.uploadQueue.has(videoFile.id)) {
          continue;
        }

        this.uploadQueue.set(videoFile.id, videoFile);
        const result = await this.uploadVideoFile(videoFile, user.id);

        if (result.success) {
          logger.log(`[VideoUpload] Successfully uploaded: ${videoFile.file_name}`);
          this.retryCount.delete(videoFile.id);
        } else {
          logger.warn(`[VideoUpload] Failed to upload: ${videoFile.file_name}`, result.error);
          await this.scheduleRetry(videoFile);
        }

        this.uploadQueue.delete(videoFile.id);
      }
    } catch (error) {
      logger.error('[VideoUpload] Error processing pending uploads:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get all video files pending upload for the current user
   */
  private async getPendingVideoFiles(userId: string): Promise<PendingVideoFile[]> {
    try {
      // Dynamically import storage service to avoid circular dependency
      const { StorageService } = await import('./storageService');
      const storage = StorageService.getInstance();
      const db = storage.getDatabase();

      if (!db || !db.video_files) {
        logger.warn('[VideoUpload] Database or video_files table not available');
        return [];
      }

      // Get ALL video files first for debugging
      const allFiles = await db.video_files.toArray();
      logger.log('[VideoUpload] All video files in IndexedDB:', allFiles.length);
      
      // Log details of each file for debugging
      allFiles.forEach((vf, i) => {
        logger.log(`[VideoUpload] File ${i + 1}:`, {
          id: vf.id,
          exercise_id: vf.exercise_id,
          file_name: vf.file_name,
          owner_id: vf.owner_id,
          upload_pending: vf.upload_pending,
          upload_pending_type: typeof vf.upload_pending,
          deleted: vf.deleted,
          has_file_data: vf.file_data !== null && vf.file_data !== undefined,
          file_data_type: vf.file_data ? typeof vf.file_data : 'null'
        });
      });

      // Filter for pending uploads owned by this user
      // Note: IndexedDB may store booleans as 1/0, so check both
      const pendingFiles = allFiles.filter((vf) => 
        (vf.upload_pending === true || (vf.upload_pending as unknown) === 1) &&
        vf.owner_id === userId && 
        !vf.deleted && 
        vf.file_data !== null &&
        vf.file_data !== undefined
      );
      
      logger.log(`[VideoUpload] Filtered pending files for user ${userId}:`, pendingFiles.length);
      
      // Deduplicate: keep only one pending upload per exercise (most recent by updated_at)
      // This prevents multiple uploads to the same exercise when user re-attaches videos
      const exerciseMap = new Map<string, PendingVideoFile>();
      for (const vf of pendingFiles) {
        const existing = exerciseMap.get(vf.exercise_id);
        if (!existing || (vf.updated_at && existing.updated_at && vf.updated_at > existing.updated_at)) {
          exerciseMap.set(vf.exercise_id, vf as PendingVideoFile);
        }
      }
      
      const dedupedFiles = Array.from(exerciseMap.values());
      if (dedupedFiles.length !== pendingFiles.length) {
        logger.log(`[VideoUpload] Deduplicated from ${pendingFiles.length} to ${dedupedFiles.length} files`);
      }
      
      return dedupedFiles;
    } catch (error) {
      logger.error('[VideoUpload] Error getting pending video files:', error);
      return [];
    }
  }

  /**
   * Upload a single video file to Supabase Storage
   */
  private async uploadVideoFile(videoFile: PendingVideoFile, userId: string): Promise<UploadResult> {
    const { id, exercise_id, file_name, file_data, file_size, mime_type } = videoFile;

    // Notify progress: starting
    this.notifyProgress({
      videoFileId: id,
      exerciseId: exercise_id,
      fileName: file_name,
      status: 'uploading',
      progress: 0
    });

    try {
      // Validate file size
      if (file_size > MAX_UPLOAD_SIZE_BYTES) {
        throw new Error(`Video file too large: ${(file_size / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`);
      }

      // Validate we have file data
      if (!file_data) {
        throw new Error('No file data available for upload');
      }

      // Generate storage path: userId/exerciseId/fileName
      const storagePath = `${userId}/${exercise_id}/${file_name}`;

      logger.log(`[VideoUpload] Uploading to: ${storagePath}`, {
        fileSize: file_size,
        mimeType: mime_type
      });

      // Convert File/Blob to ArrayBuffer for upload
      const arrayBuffer = await (file_data as Blob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, uint8Array, {
          contentType: mime_type || 'video/mp4',
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      logger.log(`[VideoUpload] Upload successful: ${uploadData.path}`);

      // Update the video_files record in IndexedDB
      await this.markUploadComplete(id, uploadData.path, exercise_id, file_name);

      // Notify progress: success
      this.notifyProgress({
        videoFileId: id,
        exerciseId: exercise_id,
        fileName: file_name,
        status: 'success',
        progress: 100
      });

      return {
        success: true,
        videoFileId: id,
        storagePath: uploadData.path
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Notify progress: failed
      this.notifyProgress({
        videoFileId: id,
        exerciseId: exercise_id,
        fileName: file_name,
        status: 'failed',
        error: errorMessage
      });

      return {
        success: false,
        videoFileId: id,
        error: errorMessage
      };
    }
  }

  /**
   * Mark a video file as successfully uploaded
   */
  private async markUploadComplete(
    videoFileId: string, 
    storagePath: string,
    exerciseId: string,
    fileName: string
  ): Promise<void> {
    try {
      const { StorageService } = await import('./storageService');
      const storage = StorageService.getInstance();
      const db = storage.getDatabase();

      if (!db) {
        throw new Error('Database not available');
      }

      const now = new Date().toISOString();

      // Get the current video_files record from IndexedDB
      const videoFile = await db.video_files.get(videoFileId);
      if (!videoFile) {
        throw new Error(`Video file record not found: ${videoFileId}`);
      }

      // Update video_files record in IndexedDB
      await db.video_files.update(videoFileId, {
        upload_pending: false,
        storage_path: storagePath,
        file_data: undefined, // Clear the blob data to save space (it's in cloud now)
        updated_at: now,
        dirty: 0, // Not dirty since we're syncing directly
        op: 'upsert'
      });

      // Also mark any OTHER pending video_files for this exercise as deleted (cleanup duplicates)
      // This handles cases where user attached video multiple times before upload completed
      const allVideoFiles = await db.video_files.where('exercise_id').equals(exerciseId).toArray();
      for (const vf of allVideoFiles) {
        if (vf.id !== videoFileId && (vf.upload_pending === true || (vf.upload_pending as unknown) === 1)) {
          logger.log(`[VideoUpload] Cleaning up duplicate pending entry: ${vf.id}`);
          await db.video_files.update(vf.id, {
            upload_pending: false,
            deleted: true,
            file_data: undefined,
            updated_at: now
          });
        }
      }

      // Also insert/update the video_files record in Supabase directly
      // This is needed because video_files is not in regular sync scope (to avoid blob serialization)
      // Use exercise_id,owner_id for conflict resolution since that's the unique constraint
      const { error: upsertError } = await supabase
        .from('video_files')
        .upsert({
          id: videoFileId,
          owner_id: videoFile.owner_id,
          exercise_id: exerciseId,
          file_name: fileName,
          file_size: videoFile.file_size,
          mime_type: videoFile.mime_type,
          upload_pending: false,
          storage_path: storagePath,
          created_at: videoFile.created_at,
          updated_at: now,
          deleted: false,
          version: (videoFile.version || 0) + 1
        }, { 
          onConflict: 'exercise_id,owner_id',
          ignoreDuplicates: false // Update existing record
        });

      if (upsertError) {
        logger.warn(`[VideoUpload] Failed to sync video_files to Supabase: ${upsertError.message}`);
        // Don't throw - local record is updated, sync can happen later
      } else {
        logger.log(`[VideoUpload] Synced video_files record to Supabase: ${videoFileId}`);
      }

      // Update the exercise's custom_video_url to indicate sync complete
      const exercise = await db.exercises.get(exerciseId);
      if (exercise) {
        await db.exercises.update(exerciseId, {
          custom_video_url: `blob-video://${exerciseId}/${fileName}`,
          has_video: true,
          updated_at: now,
          dirty: 1,
          op: 'upsert'
        });
        logger.log(`[VideoUpload] Updated exercise ${exerciseId} with synced video URL`);
      }

      logger.log(`[VideoUpload] Marked upload complete for ${videoFileId}`);
    } catch (error) {
      logger.error('[VideoUpload] Error marking upload complete:', error);
      throw error;
    }
  }

  /**
   * Schedule a retry for a failed upload
   */
  private async scheduleRetry(videoFile: PendingVideoFile): Promise<void> {
    const currentRetry = this.retryCount.get(videoFile.id) || 0;
    
    if (currentRetry >= UPLOAD_RETRY_DELAYS.length) {
      logger.warn(`[VideoUpload] Max retries reached for ${videoFile.file_name}, giving up`);
      this.retryCount.delete(videoFile.id);
      return;
    }

    const delay = UPLOAD_RETRY_DELAYS[currentRetry];
    this.retryCount.set(videoFile.id, currentRetry + 1);

    logger.log(`[VideoUpload] Scheduling retry ${currentRetry + 1} for ${videoFile.file_name} in ${delay}ms`);

    setTimeout(() => {
      if (navigator.onLine) {
        this.processPendingUploads();
      }
    }, delay);
  }

  /**
   * Manually trigger upload for a specific video file
   */
  async uploadNow(videoFileId: string): Promise<UploadResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, videoFileId, error: 'Not authenticated' };
    }

    if (!navigator.onLine) {
      return { success: false, videoFileId, error: 'No network connection' };
    }

    const pendingFiles = await this.getPendingVideoFiles(user.id);
    const videoFile = pendingFiles.find(f => f.id === videoFileId);

    if (!videoFile) {
      return { success: false, videoFileId, error: 'Video file not found or already uploaded' };
    }

    return this.uploadVideoFile(videoFile, user.id);
  }

  /**
   * Get the count of pending uploads
   */
  async getPendingCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const pendingFiles = await this.getPendingVideoFiles(user.id);
    return pendingFiles.length;
  }

  /**
   * Check if a specific video is pending upload
   */
  async isUploadPending(videoFileId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const pendingFiles = await this.getPendingVideoFiles(user.id);
    return pendingFiles.some(f => f.id === videoFileId);
  }
}

export default VideoUploadService;
export type { UploadProgress, UploadResult, PendingVideoFile };
