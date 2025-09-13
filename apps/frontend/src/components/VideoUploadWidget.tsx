import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { storageService } from '../services/storageService';
import logger from '../utils/logger';

interface VideoUploadWidgetProps {
  exerciseId: string;
  currentVideoUrl?: string;
  onVideoUploaded: (videoUrl: string) => void;
  className?: string;
}

export const VideoUploadWidget: React.FC<VideoUploadWidgetProps> = ({
  exerciseId,
  currentVideoUrl,
  onVideoUploaded,
  className = ''
}) => {
  const { t } = useTranslation();
  const { flags } = useFeatureFlags();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [actualVideoUrl, setActualVideoUrl] = useState<string | null>(null);

  const canUpload = flags.canUploadVideos || false;

  // Effect to restore blob URL from IndexedDB when component mounts or video URL changes
  useEffect(() => {
    const restoreBlobUrl = async () => {
      if (!currentVideoUrl || !currentVideoUrl.startsWith('blob-pending-sync://')) {
        // For regular URLs (http, https, etc), use them directly
        setActualVideoUrl(currentVideoUrl || null);
        return;
      }

      try {
        logger.log('🎥 [VideoDisplay] Restoring blob URL from IndexedDB for exercise:', exerciseId);
        
        // Get the stored video file from IndexedDB
        const storedVideoFile = await storageService.getVideoFile(exerciseId);
        
        if (storedVideoFile) {
          logger.log('🎥 [VideoDisplay] Found stored video file:', {
            id: storedVideoFile.id,
            exercise_id: storedVideoFile.exercise_id,
            file_name: storedVideoFile.file_name,
            file_size: storedVideoFile.file_size,
            mime_type: storedVideoFile.mime_type,
            hasFileData: !!storedVideoFile.file_data,
            fileDataType: typeof storedVideoFile.file_data,
            fileDataConstructor: storedVideoFile.file_data?.constructor?.name,
            fileDataSize: storedVideoFile.file_data?.size,
            fileDataType_blob: storedVideoFile.file_data?.type
          });

          if (storedVideoFile.file_data) {
            // Create a blob URL directly from the stored Blob/File
            const newBlobUrl = URL.createObjectURL(storedVideoFile.file_data);
            setActualVideoUrl(newBlobUrl);
            logger.log('🎥 [VideoDisplay] Successfully restored blob URL from stored file:', {
              newBlobUrl,
              fileSize: storedVideoFile.file_size,
              mimeType: storedVideoFile.mime_type,
              fileBlobSize: storedVideoFile.file_data.size,
              fileBlobType: storedVideoFile.file_data.type
            });
          } else {
            logger.warn('🎥 [VideoDisplay] Stored video file has no file_data:', {
              storedVideoFile: Object.keys(storedVideoFile)
            });
            setActualVideoUrl(null);
            setVideoLoadError(true);
          }
        } else {
          logger.warn('🎥 [VideoDisplay] No stored video file found for exercise:', exerciseId);
          setActualVideoUrl(null);
          setVideoLoadError(true);
        }
      } catch (error) {
        logger.error('🎥 [VideoDisplay] Failed to restore blob URL from IndexedDB:', error);
        setActualVideoUrl(null);
        setVideoLoadError(true);
      }
    };

    // Add a small delay to ensure IndexedDB transaction completes
    const timeoutId = setTimeout(restoreBlobUrl, 100);
    return () => clearTimeout(timeoutId);
  }, [currentVideoUrl, exerciseId]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (actualVideoUrl && actualVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(actualVideoUrl);
      }
    };
  }, [actualVideoUrl]);

  const handleVideoUpload = async (file: File) => {
    logger.log('🎥 [VideoUpload] Starting offline-first upload process', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      exerciseId
    });

    if (!file) {
      logger.warn('🎥 [VideoUpload] No file provided');
      return;
    }

    // Validate file size (max 50MB for now)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      logger.warn('🎥 [VideoUpload] File too large', { size: file.size, maxSize });
      setError(t('video.fileTooLarge'));
      return;
    }

    // Validate file type with specific format support
    const supportedTypes = [
      'video/mp4',
      'video/webm', 
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/quicktime'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      logger.warn('🎥 [VideoUpload] Unsupported video format', { 
        type: file.type,
        supportedTypes 
      });
      setError(t('video.unsupportedFormat'));
      return;
    }

    logger.log('🎥 [VideoUpload] File validation passed, creating local blob URL...');
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setVideoLoadError(false);

    try {
      // OFFLINE-FIRST: Store the video file in IndexedDB with dirty flag
      logger.log('🎥 [VideoUpload] Storing video file in IndexedDB for offline-first approach');
      
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10; // Slower progress since we're actually storing data
        });
      }, 150);

      // Store in IndexedDB via storage service
      const localVideoUrl = await storageService.saveVideoFile(exerciseId, file);
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      logger.log('🎥 [VideoUpload] Video file stored in IndexedDB successfully');
      logger.log('🎥 [VideoUpload] Local video URL:', localVideoUrl);
      
      // Create a blob URL for immediate display
      const immediateBlobUrl = URL.createObjectURL(file);
      setActualVideoUrl(immediateBlobUrl);
      
      // Return the blob URL for immediate use
      onVideoUploaded(localVideoUrl);
      
      logger.log('🎥 [VideoUpload] Video ready for offline use, sync will handle cloud upload when online');

    } catch (error) {
      logger.error('🎥 [VideoUpload] Failed to create local blob URL:', error);
      setError(error instanceof Error ? error.message : t('video.uploadFailed'));
    } finally {
      // Clean up after short delay to show completion
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleRemoveVideo = async () => {
    logger.log('🎥 [VideoUpload] Removing video file');
    
    try {
      // Clean up video file from IndexedDB
      await storageService.deleteVideoFile(exerciseId);
      logger.log('🎥 [VideoUpload] Video file removed from IndexedDB');
    } catch (error) {
      logger.warn('🎥 [VideoUpload] Failed to remove video file from IndexedDB:', error);
    }
    
    // Clean up the current blob URL
    if (actualVideoUrl && actualVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(actualVideoUrl);
    }
    
    setActualVideoUrl(null);
    onVideoUploaded('');
    setError(null);
    setVideoLoadError(false);
  };

  const handleVideoLoadError = (event: any) => {
    const videoElement = event.target;
    const mediaError = videoElement?.error;
    const errorCode = mediaError?.code;
    const errorMessage = mediaError?.message;
    
    logger.error('🎥 [VideoDisplay] Video failed to load', { 
      currentVideoUrl,
      isPlaceholder: currentVideoUrl?.startsWith('placeholder://'),
      error: mediaError,
      networkState: videoElement?.networkState,
      readyState: videoElement?.readyState,
      errorCode,
      errorMessage
    });
    
    setVideoLoadError(true);
    
    // Provide specific error messages based on MediaError codes and messages
    let userFriendlyError = t('video.loadError', 'Failed to load video.');
    let shouldDeleteFile = false;
    
    if (errorCode === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
      shouldDeleteFile = true; // Delete files that can't be played
      if (errorMessage?.includes('DEMUXER_ERROR_NO_SUPPORTED_STREAMS')) {
        userFriendlyError = t('video.codecNotSupported', 
          'This video uses an unsupported codec. Try converting to H.264 MP4 format for better browser compatibility.') + 
          ' ' + t('video.codecSuggestion', 'Recommended: Use FFmpeg or HandBrake to convert to MP4 with H.264 video and AAC audio.');
      } else if (errorMessage?.includes('FORMAT_ERROR')) {
        userFriendlyError = t('video.formatError', 
          'Video format not recognized. Please use a standard MP4, WebM, or OGG video file.');
      } else {
        userFriendlyError = t('video.formatNotSupported', 
          'Video format not supported by your browser. Try using MP4 with H.264 codec.');
      }
    } else if (errorCode === 3) { // MEDIA_ERR_DECODE
      shouldDeleteFile = true; // Delete corrupted files
      userFriendlyError = t('video.decodeError', 
        'Video file appears corrupted or uses unsupported encoding. Try re-encoding the video.');
    } else if (errorCode === 2) { // MEDIA_ERR_NETWORK
      userFriendlyError = t('video.networkError', 
        'Network error while loading video. Check your connection and try again.');
    } else if (errorCode === 1) { // MEDIA_ERR_ABORTED
      userFriendlyError = t('video.loadAborted', 
        'Video loading was interrupted. Please try uploading again.');
    }
    
    // Clean up IndexedDB for files that can't be played
    if (shouldDeleteFile && currentVideoUrl?.startsWith('blob-pending-sync://')) {
      logger.log('🎥 [VideoDisplay] Removing unplayable video file from IndexedDB');
      storageService.deleteVideoFile(exerciseId)
        .then(() => {
          logger.log('🎥 [VideoDisplay] Unplayable video file removed from IndexedDB');
          // Reset the video URL to indicate no video
          onVideoUploaded('');
          setActualVideoUrl(null);
        })
        .catch((cleanupError) => {
          logger.warn('🎥 [VideoDisplay] Failed to clean up unplayable video file:', cleanupError);
        });
    }
    
    setError(userFriendlyError);
  };

  const handleVideoLoaded = () => {
    logger.log('🎥 [VideoDisplay] Video loaded successfully', { currentVideoUrl, actualVideoUrl });
    setVideoLoadError(false);
    setError(null);
  };

  if (!canUpload) {
    return (
      <div className={`video-upload-disabled space-y-3 ${className}`}>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            {t('video.exerciseVideo')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('video.uploadsNotAvailable')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('video.urlPlaceholderHelper')}
          </p>
          <input
            type="url"
            placeholder={t('video.urlPlaceholder')}
            defaultValue={currentVideoUrl}
            onChange={(e) => onVideoUploaded(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`video-upload-widget space-y-4 ${className}`}>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {currentVideoUrl && !currentVideoUrl.startsWith('placeholder://') ? (
        <div className="current-video bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          {(() => {
            // Check if this is a local blob video pending sync
            const isLocalBlob = currentVideoUrl.startsWith('blob-pending-sync://');
            
            return !videoLoadError && actualVideoUrl ? (
              <>
                <video 
                  src={actualVideoUrl} 
                  controls 
                  className="w-full max-h-64 rounded-md mb-3"
                  onError={handleVideoLoadError}
                  onLoadedData={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                />
                {isLocalBlob && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-blue-800 dark:text-blue-200">
                        {t('video.pendingSync', 'Video ready offline - will sync when online')}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-md mb-3 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('video.cannotDisplay', 'Cannot display video')}</p>
                </div>
              </div>
            );
          })()}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {(() => {
                if (videoLoadError) {
                  return t('video.videoWithIssues', 'Video with issues');
                }
                if (currentVideoUrl.startsWith('blob-pending-sync://')) {
                  return t('video.localVideo', 'Local video (offline-ready)');
                }
                return t('video.currentVideo');
              })()}
            </span>
            <button 
              type="button"
              onClick={handleRemoveVideo}
              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              {t('video.removeVideo')}
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-area border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
            disabled={uploading}
            className="hidden"
            id={`video-upload-${exerciseId}`}
          />
          
          {uploading ? (
            <div className="upload-progress space-y-3">
              <div className="progress-bar bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="progress-fill bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploadProgress}% {t('video.uploaded')}
              </p>
            </div>
          ) : (
            <>
              <label
                htmlFor={`video-upload-${exerciseId}`}
                className="cursor-pointer inline-flex flex-col items-center space-y-2"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('video.clickToUpload')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('video.supportedFormats')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('video.maxFileSize')}
                  </p>
                </div>
              </label>
            </>
          )}
        </div>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('video.uploadHint')}
      </p>
    </div>
  );
};

export default VideoUploadWidget;