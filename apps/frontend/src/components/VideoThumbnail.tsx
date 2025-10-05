import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '../components/icons/NavigationIcons';
import { useSharedExercises } from '../hooks/useSharedExercises';
import { ExercisePlaceholder } from './ExercisePlaceholder';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import selectVideoVariant from '../utils/selectVideoVariant';
import type { Exercise } from '../types';
import logger from '../utils/logger';

// Simple pause icon component
const PauseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

interface VideoThumbnailProps {
  exercise: Exercise;
  onVideoLoad?: () => void;
  onVideoError?: () => void;
  className?: string;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  exercise,
  onVideoLoad,
  onVideoError,
  className = ''
}) => {
  const { t } = useTranslation('exercises');
  const { isSharedExercise } = useSharedExercises();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = exercise.has_video || exercise.custom_video_url;

  // Resolve video URL
  useEffect(() => {
    if (!hasVideo) return;

    const resolveUrl = async () => {
      try {
        let url: string | null = null;

        if (exercise.custom_video_url) {
          // For custom exercises, resolve the custom video URL
          // logger.log('🎥 [VideoThumbnail] Resolving custom video URL:', {
          //   exerciseId: exercise.id,
          //   customVideoUrl: exercise.custom_video_url,
          //   isSharedCopy: isSharedExercise(exercise.id)
          // });
          url = await resolveVideoUrl(exercise.custom_video_url);
          // logger.log('🎥 [VideoThumbnail] Custom video URL resolved:', {
          //   exerciseId: exercise.id,
          //   originalUrl: exercise.custom_video_url,
          //   resolvedUrl: url,
          //   isBlob: url?.startsWith('blob:')
          // });
        } else if (exercise.has_video) {
          // For built-in exercises, load from exercise media
          const mediaIndex = await loadExerciseMedia();
          const media = mediaIndex[exercise.id];
          if (media) {
            url = selectVideoVariant(
              media,
              typeof window !== 'undefined' ? window.innerWidth : undefined,
              typeof window !== 'undefined' ? window.innerHeight : undefined
            );
          }
        }

        if (url) {
          // Additional blob URL validation for shared exercises
          if (url.startsWith('blob:') && isSharedExercise(exercise.id)) {
            logger.log('🎥 [VideoThumbnail] Validating blob URL for shared exercise:', {
              exerciseId: exercise.id,
              blobUrl: url,
              urlValid: url.length > 10, // Basic check that blob URL isn't truncated
              hasProtocol: url.includes('://'),
              hasOrigin: url.includes(window.location.origin)
            });
          }

          setVideoUrl(url);
          setHasError(false);
        } else {
          setHasError(true);
          logger.warn('🎥 [VideoThumbnail] No video URL resolved for exercise:', exercise.id);
        }
      } catch (error) {
        logger.error('🎥 [VideoThumbnail] Error resolving video URL:', error);
        setHasError(true);
      }
    };

    resolveUrl();
  }, [exercise.id, exercise.has_video, exercise.custom_video_url, hasVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedData = () => {
      logger.log('🎥 [VideoThumbnail] Video loaded successfully:', {
        exerciseId: exercise.id,
        videoUrl: videoUrl,
        videoDuration: video?.duration,
        videoWidth: video?.videoWidth,
        videoHeight: video?.videoHeight,
        currentSrc: video?.currentSrc
      });
      setIsLoaded(true);
      onVideoLoad?.();
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const videoError = target.error;

      // Enhanced debugging for video errors
      logger.error('🎥 [VideoThumbnail] Video loading error:', {
        exerciseId: exercise.id,
        videoSrc: video.src,
        videoUrl: videoUrl,
        isCustomVideo: !!exercise.custom_video_url,
        isSharedCopy: isSharedExercise(exercise.id),
        originalVideoUrl: exercise.custom_video_url,
        error: e,
        videoError: {
          code: videoError?.code,
          message: videoError?.message,
          MEDIA_ERR_ABORTED: videoError?.code === 1,
          MEDIA_ERR_NETWORK: videoError?.code === 2,
          MEDIA_ERR_DECODE: videoError?.code === 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: videoError?.code === 4
        },
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc,
        duration: video.duration
      });

      // Check if it's a MIME type/format issue (code 4)
      if (videoError?.code === 4) {
        logger.error('🎥 [VideoThumbnail] MEDIA_ERR_SRC_NOT_SUPPORTED - Video format not supported by browser:', {
          exerciseId: exercise.id,
          blobUrl: videoUrl,
          videoSrc: video.src,
          isSharedExercise: isSharedExercise(exercise.id),
          possibleCauses: [
            'Corrupted MP4 metadata',
            'Invalid file format',
            'Incomplete download',
            'Browser codec compatibility'
          ]
        });

        // For shared exercises with corrupted videos, try to clear cache and reload
        if (isSharedExercise(exercise.id) && videoUrl?.startsWith('blob:')) {
          logger.warn('🎥 [VideoThumbnail] Attempting to clear corrupted shared video cache');

          // Clear the video cache for this exercise (non-blocking)
          import('../services/storageService').then(({ storageService }) => {
            storageService.deleteVideoFile(exercise.id).then(() => {
              // logger.log('🎥 [VideoThumbnail] Video cache cleared, reload page to re-download');
            }).catch((cacheError) => {
              logger.error('🎥 [VideoThumbnail] Failed to clear video cache:', cacheError);
            });
          });
        }
      }

      setHasError(true);
      onVideoError?.();
    };

    const handleCanPlay = () => {
      // Ensure we show the first frame
      if (video.currentTime === 0) {
        video.currentTime = 0.1;
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onVideoLoad, onVideoError, videoUrl, exercise.id]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click events
    const video = videoRef.current;
    if (!video) {
      logger.warn('🎥 [VideoThumbnail] No video element found for play/pause');
      return;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        logger.error('🎥 [VideoThumbnail] Video play failed:', { exerciseId: exercise.id, error });
        setHasError(true);
      });
    }
  };

  // If no video or error, show placeholder
  if (!hasVideo || hasError || !videoUrl) {
    return (
      <div className={`relative ${className}`}>
        <ExercisePlaceholder size="md" />
      </div>
    );
  }

  return (
    <div 
      className={`relative group cursor-pointer ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        key={videoUrl} // Force re-render when URL changes
        ref={videoRef}
        src={videoUrl || undefined}
        className="w-full h-full object-cover rounded-lg bg-gray-100 dark:bg-gray-800"
        preload="auto" // Changed from metadata to auto to ensure video loads
        muted
        loop // Videos will loop automatically when playing
        playsInline
        poster="" // Empty poster to avoid default browser poster
      />

      {/* Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Play/Pause Overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center rounded-lg transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handlePlayPause}
      >
        {/* Gradient backdrop only when hovering or paused */}
        <div className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${
          showControls || !isPlaying ? 'bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-100' : 'opacity-0'
        }`} />

        <button
          className="relative flex items-center justify-center w-12 h-12 text-white hover:scale-105 transition-all duration-200 transform"
          aria-label={isPlaying ? t('common.pauseVideo', { defaultValue: 'Pause video' }) : t('common.playVideo', { defaultValue: 'Play video' })} // i18n-exempt: default value provided for accessibility
        >
          {isPlaying ? (
            <PauseIcon size={16} />
          ) : (
            <PlayIcon size={16} className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};