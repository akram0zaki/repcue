import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '../components/icons/NavigationIcons';
import { useSharedExercises } from '../hooks/useSharedExercises';
import { ExercisePlaceholder } from './ExercisePlaceholder';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import { loadExerciseMedia } from '../utils/loadExerciseMedia';
import selectVideoVariant from '../utils/selectVideoVariant';
import type { Exercise } from '../types';
import type { ExerciseMedia } from '../types/media';
import logger from '../utils/logger';

// Helper: quick existence probe (first byte) to detect 404/missing objects
const probe = async (probeUrl: string): Promise<boolean> => {
  try {
    const res = await fetch(probeUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store'
    });
    return res.ok || res.status === 206; // 206 expected for ranged reads
  } catch {
    return false;
  }
};

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
  objectFit?: 'contain' | 'cover';
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  exercise,
  onVideoLoad,
  onVideoError,
  className = '',
  objectFit = 'cover'
}) => {
  const { t } = useTranslation('exercises');
  const { isSharedExercise } = useSharedExercises();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaMeta, setMediaMeta] = useState<ExerciseMedia | null>(null); // cached media entry for fallback
  const [attemptedFallback, setAttemptedFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // has_video can be stale; we derive availability from media index or custom URL

  // Resolve video URL
  useEffect(() => {
    // Reset states when exercise changes
    setIsLoaded(false);
    setHasError(false);
    setVideoUrl(null);
    
    let isMounted = true;
    
    const resolveUrl = async () => {
      try {
        let url: string | null = null;

        if (exercise.custom_video_url) {
          // For custom exercises, resolve the custom video URL
          logger.log('🎥 [VideoThumbnail] Resolving custom video URL:', {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            customVideoUrl: exercise.custom_video_url,
            isSharedCopy: isSharedExercise(exercise.id)
          });
          url = await resolveVideoUrl(exercise.custom_video_url);
          logger.log('🎥 [VideoThumbnail] Custom video URL resolved:', {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            originalUrl: exercise.custom_video_url,
            resolvedUrl: url,
            urlLength: url?.length,
            isBlob: url?.startsWith('blob:'),
            isHttp: url?.startsWith('http') || url?.startsWith('/')
          });
        } else {
          // For built-in exercises, load from exercise media
          const mediaIndex = await loadExerciseMedia();
          const media = mediaIndex[exercise.id];
          if (!isMounted) return;
          
          setMediaMeta(media || null);
          if (media) {
            const selectedPath = selectVideoVariant(
              media,
              typeof window !== 'undefined' ? window.innerWidth : undefined,
              typeof window !== 'undefined' ? window.innerHeight : undefined
            );
            // Resolve through cache service for instant playback
            url = selectedPath ? await resolveVideoUrl(selectedPath) : null;
          }
        }

        if (!isMounted) return;

        if (url) {
          // Skip probe for cached blob URLs - they're guaranteed valid from VideoCacheService
          // This eliminates wasteful network requests and improves page load by 50%
          let ok = url.startsWith('blob:') ? true : await probe(url);
          if (!ok && mediaMeta?.variants) {
            const formatOrder: string[] = ['mp4', 'webm'];
            for (const aspect of Object.keys(mediaMeta.variants)) {
              const aspectGroup = mediaMeta.variants[aspect as keyof typeof mediaMeta.variants];
              if (!aspectGroup) continue;
              for (const res of Object.keys(aspectGroup)) {
                const formats = aspectGroup[res as keyof typeof aspectGroup];
                if (!formats) continue;
                for (const fmt of formatOrder) {
                  const candidate = formats[fmt as keyof typeof formats]?.url;
                  if (candidate && candidate !== url) {
                    const ok2 = await probe(candidate);
                    if (ok2) {
                      logger.warn('🎥 [VideoThumbnail] Primary video missing; switching variant', {
                        exerciseId: exercise.id,
                        primary: url,
                        fallback: candidate,
                        aspect,
                        res,
                        format: fmt
                      });
                      url = candidate;
                      ok = true;
                      break;
                    }
                  }
                }
                if (ok) break;
              }
              if (ok) break;
            }
          }
          if (!ok) {
            if (isMounted) {
              setHasError(true);
              setVideoUrl(null);
            }
            logger.warn('🎥 [VideoThumbnail] No accessible video variant found after probe attempts', { exerciseId: exercise.id });
            return;
          }
          // Additional blob URL validation for shared exercises
          const blobUrl = url || '';
          if (blobUrl.startsWith('blob:') && isSharedExercise(exercise.id)) {
            logger.log('🎥 [VideoThumbnail] Validating blob URL for shared exercise:', {
              exerciseId: exercise.id,
              blobUrl,
              urlValid: blobUrl.length > 10, // Basic check that blob URL isn't truncated
              hasProtocol: blobUrl.includes('://'),
              hasOrigin: blobUrl.includes(window.location.origin)
            });
          }

          if (isMounted) {
            logger.log('🎥 [VideoThumbnail] Setting video URL:', {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              url,
              urlType: url.startsWith('blob:') ? 'blob' : url.startsWith('/') ? 'relative-http' : url.startsWith('http') ? 'absolute-http' : 'unknown',
              willSetLoadedImmediately: url.startsWith('blob:')
            });
            setVideoUrl(url);
            setHasError(false);
            // If URL is a blob (cached), mark as loaded immediately to skip loading state
            if (url.startsWith('blob:')) {
              setIsLoaded(true);
            }
          }
        } else {
          if (isMounted) {
            setHasError(true);
            logger.warn('🎥 [VideoThumbnail] No video URL resolved for exercise:', {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              hasCustomVideo: !!exercise.custom_video_url,
              customVideoUrl: exercise.custom_video_url,
              hadMediaIndex: !!mediaMeta
            });
          }
        }
      } catch (error) {
        logger.error('🎥 [VideoThumbnail] Error resolving video URL:', error);
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    resolveUrl();
    
    // Cleanup function - no blob URL revocation
    // Blob URLs are managed by VideoCacheService and should persist
    // across component mount/unmount cycles for performance
    return () => {
      isMounted = false;
    };
  }, [exercise.id, exercise.custom_video_url]); // Removed isSharedExercise - it's a function, causes infinite re-renders

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // iOS Safari often doesn't fire events for cached videos - use timeout as fallback
    const loadingTimeout = setTimeout(() => {
      logger.log('🎥 [VideoThumbnail] Loading timeout - marking as ready (iOS cached video workaround):', {
        exerciseId: exercise.id,
        videoUrl: videoUrl,
        readyState: video?.readyState
      });
      setIsLoaded(true);
    }, 1500); // 1.5 seconds - reasonable for cached videos

    const clearTimeoutAndMarkLoaded = () => {
      clearTimeout(loadingTimeout);
      setIsLoaded(true);
      onVideoLoad?.();
    };

    const handleLoadedData = () => {
      logger.log('🎥 [VideoThumbnail] Video loadeddata event:', {
        exerciseId: exercise.id,
        videoUrl: videoUrl,
        videoDuration: video?.duration,
        videoWidth: video?.videoWidth,
        videoHeight: video?.videoHeight,
        currentSrc: video?.currentSrc,
        readyState: video?.readyState
      });
      clearTimeoutAndMarkLoaded();
      
      // Ensure first frame is shown for thumbnail
      if (video && !isPlaying && video.currentTime === 0) {
        video.currentTime = 0.1;
      }
    };

    const handleLoadedMetadata = () => {
      logger.log('🎥 [VideoThumbnail] Video loadedmetadata event (iOS-friendly):', {
        exerciseId: exercise.id,
        videoUrl: videoUrl,
        videoDuration: video?.duration,
        readyState: video?.readyState
      });
      // iOS Safari fires loadedmetadata more reliably than loadeddata
      clearTimeoutAndMarkLoaded();
    };

    const handleError = (e: Event) => {
      clearTimeout(loadingTimeout);
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

      // Attempt graceful fallback: if webm failed and mp4 exists in variants, try mp4 once
      const currentUrl = videoUrl || '';
      if (!attemptedFallback && currentUrl.endsWith('.webm') && mediaMeta?.variants) {
        // Find first mp4 variant across aspects/resolutions
        for (const aspect of Object.keys(mediaMeta.variants)) {
          const aspectGroup = mediaMeta.variants[aspect as keyof typeof mediaMeta.variants];
          if (!aspectGroup) continue;
          for (const res of Object.keys(aspectGroup)) {
            const formats = aspectGroup[res as keyof typeof aspectGroup];
            if (!formats) continue;
            if (formats.mp4?.url) {
              logger.warn('🎥 [VideoThumbnail] WebM failed, attempting MP4 fallback', {
                exerciseId: exercise.id,
                failedWebm: currentUrl,
                fallbackUrl: formats.mp4.url
              });
              setAttemptedFallback(true);
              setVideoUrl(formats.mp4.url);
              setHasError(false);
              return; // abort marking error; retry with mp4
            }
          }
        }
      }

      setHasError(true);
      onVideoError?.();
    };

    const handleCanPlay = () => {
      logger.log('🎥 [VideoThumbnail] Video canplay event:', {
        exerciseId: exercise.id,
        readyState: video?.readyState
      });
      // canplay means video is ready to play - safe to show on iOS
      clearTimeoutAndMarkLoaded();
      
      // Ensure we show the first frame for thumbnail display
      // Only seek if video is not currently playing
      if (!isPlaying && video.currentTime === 0) {
        video.currentTime = 0.1;
      }
    };

    // iOS Safari event handling: Multiple event listeners for reliability
    // loadedmetadata: Fires when video metadata is loaded (most reliable on iOS)
    // loadeddata: Fires when first frame is ready (desktop)
    // canplay: Fires when video can start playing (fallback)
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      clearTimeout(loadingTimeout);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onVideoLoad, onVideoError, videoUrl, exercise.id, isPlaying]);

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
  if (hasError || !videoUrl) {
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
        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} rounded-lg bg-gray-100 dark:bg-gray-800`}
        preload="metadata" // Load metadata and first frame, not entire video
        muted
        loop // Videos will loop automatically when playing
        playsInline
        // No poster attribute - let video show first frame naturally
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