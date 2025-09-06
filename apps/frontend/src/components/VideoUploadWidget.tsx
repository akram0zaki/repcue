import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

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

  const canUpload = flags.canUploadVideos || false;

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (max 50MB for now)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(t('video.fileTooLarge'));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError(t('video.invalidFileType'));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      if (canUpload && supabase) {
        // Real upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${exerciseId}_${Date.now()}.${fileExt}`;
        const filePath = `exercise-videos/${fileName}`;

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('exercise-videos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          // Save video metadata to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: dbError } = await supabase.from('exercise_videos').insert({
              exercise_id: exerciseId,
              uploader_id: user.id,
              video_url: urlData.publicUrl,
              file_size: file.size,
              duration_seconds: null, // Could be extracted from video metadata
              is_approved: false // Requires admin approval
              // Let database handle: id, created_at, updated_at, deleted, version
            });
            
            if (dbError) {
              console.error('Database error saving video metadata:', dbError);
              throw dbError;
            }
          }

          onVideoUploaded(urlData.publicUrl);
        }
      } else {
        // Fallback: simulate upload for testing
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 10;
          });
        }, 200);

        // Simulate upload completion
        setTimeout(() => {
          clearInterval(progressInterval);
          const simulatedUrl = `placeholder://uploads/exercises/${exerciseId}/${file.name}`;
          onVideoUploaded(simulatedUrl);
        }, 2000);
      }

    } catch (error) {
      console.error('Video upload failed:', error);
      setError(error instanceof Error ? error.message : t('video.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveVideo = () => {
    onVideoUploaded('');
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
      <h4 className="font-medium text-gray-900 dark:text-white">
        {t('video.exerciseVideo')}
      </h4>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {currentVideoUrl && !currentVideoUrl.startsWith('placeholder://') ? (
        <div className="current-video bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <video 
            src={currentVideoUrl} 
            controls 
            className="w-full max-h-64 rounded-md mb-3"
            onError={() => setError(t('video.loadError'))}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('video.currentVideo')}
            </span>
            <button 
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