import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from './icons/NavigationIcons';
import { ExercisePlaceholder } from './ExercisePlaceholder';
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

// Fullscreen icon
const FullscreenIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

// Exit fullscreen icon
const ExitFullscreenIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

interface SharedExerciseVideoProps {
  exercise: Exercise;
  className?: string;
}

/**
 * Video component specifically for shared exercise pages.
 * 
 * Handles two scenarios differently:
 * 1. Built-in exercises: Shows thumbnail poster + video with preload="none"
 * 2. User-uploaded videos: Loads video with preload="metadata" to generate thumbnail from first frame
 * 
 * Features:
 * - Fill/Fit toggle (default: Fit)
 * - Fullscreen support
 * - Play/pause on click
 */
export const SharedExerciseVideo: React.FC<SharedExerciseVideoProps> = ({
  exercise,
  className = ''
}) => {
  const { t } = useTranslation(['exercises', 'common']);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if this is a custom/user-uploaded video
  const isCustomVideo = !!exercise.custom_video_url;

  // Auto-hide controls after 2 seconds when playing
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [isPlaying]);

  // Show controls and schedule hide
  const handleShowControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // Hide controls immediately on mouse leave (only when playing)
  const handleHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      setShowControls(false);
    }
  }, [isPlaying]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // Toggle fit mode
  const handleToggleFitMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFitMode(prev => prev === 'fit' ? 'fill' : 'fit');
  }, []);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      logger.error('[SharedExerciseVideo] Fullscreen toggle failed:', error);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Resolve video URL
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setVideoUrl(null);
    setThumbnailUrl(null);
    
    let isMounted = true;
    
    const resolveUrl = async () => {
      try {
        if (isCustomVideo) {
          // For custom exercises on shared page, the URL is already resolved by the edge function
          // It should be a signed URL directly usable
          if (isMounted) {
            setVideoUrl(exercise.custom_video_url!);
            // No thumbnail for custom videos - we'll generate from first frame
          }
        } else {
          // For built-in exercises, load from exercise media index
          const mediaIndex = await loadExerciseMedia();
          const media = mediaIndex[exercise.id];
          
          if (!isMounted) return;
          
          if (media) {
            // Extract thumbnail URL if available
            if (media.thumbnail) {
              setThumbnailUrl(media.thumbnail);
              setIsLoaded(true);
            }
            
            const selectedPath = selectVideoVariant(
              media,
              typeof window !== 'undefined' ? window.innerWidth : undefined,
              typeof window !== 'undefined' ? window.innerHeight : undefined
            );
            
            if (selectedPath) {
              setVideoUrl(selectedPath);
            }
          }
        }
      } catch (error) {
        logger.error('[SharedExerciseVideo] Error resolving video URL:', error);
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    resolveUrl();
    
    return () => {
      isMounted = false;
    };
  }, [exercise.id, exercise.custom_video_url, isCustomVideo]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      
      // For custom videos without thumbnail, seek to first frame to show as poster
      if (isCustomVideo && !isPlaying && video.currentTime === 0) {
        video.currentTime = 0.1;
      }
    };

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    const handleError = () => {
      logger.error('[SharedExerciseVideo] Video loading error:', {
        exerciseId: exercise.id,
        videoUrl,
        isCustomVideo
      });
      setHasError(true);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      // Ensure first frame is visible for thumbnail
      if (isCustomVideo && !isPlaying && video.currentTime === 0) {
        video.currentTime = 0.1;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl, exercise.id, isCustomVideo, isPlaying]);

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      // Show controls and keep them visible when paused
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        // Schedule hide after play starts
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 2000);
      }).catch((error) => {
        logger.error('[SharedExerciseVideo] Video play failed:', error);
        setHasError(true);
      });
    }
  }, [isPlaying]);

  // If no video available, show placeholder
  if (hasError || !videoUrl) {
    return (
      <div className={`relative ${className}`}>
        <ExercisePlaceholder size="md" />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('common:videoUnavailable', { defaultValue: 'Video unavailable' })}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative group cursor-pointer ${className} ${isFullscreen ? 'bg-black flex items-center justify-center' : ''}`}
      onMouseEnter={handleShowControls}
      onMouseLeave={handleHideControls}
      onTouchStart={handleShowControls}
    >
      {/* Video Element */}
      <video
        key={videoUrl}
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        className={`w-full h-full rounded-lg bg-gray-100 dark:bg-gray-800 ${
          fitMode === 'fit' ? 'object-contain' : 'object-cover'
        } ${isFullscreen ? 'max-h-screen' : ''}`}
        // For custom videos: preload metadata to get first frame as thumbnail
        // For built-in videos: preload none since we have poster image
        preload={isCustomVideo ? 'metadata' : 'none'}
        muted
        loop
        playsInline
        crossOrigin="anonymous"
      />

      {/* Loading State - Only show for custom videos without loaded state */}
      {!isLoaded && !hasError && isCustomVideo && (
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
        {/* Gradient backdrop */}
        <div className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${
          showControls || !isPlaying ? 'bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-100' : 'opacity-0'
        }`} />

        <button
          className="relative flex items-center justify-center w-14 h-14 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-full shadow-lg hover:scale-105 transition-all duration-200 transform"
          aria-label={isPlaying ? t('common:pauseVideo', { defaultValue: 'Pause video' }) : t('common:playVideo', { defaultValue: 'Play video' })}
        >
          {isPlaying ? (
            <PauseIcon size={20} />
          ) : (
            <PlayIcon size={20} className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Top Controls Bar */}
      <div className={`absolute top-2 left-2 right-2 flex items-center justify-between transition-opacity duration-200 ${
        showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Left side - Fit/Fill toggle */}
        <button
          type="button"
          onClick={handleToggleFitMode}
          className="px-3 py-1.5 text-xs font-medium bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors backdrop-blur-sm border border-gray-200 dark:border-gray-600"
          aria-label={fitMode === 'fit' ? t('common:timer.fit', { defaultValue: 'Fit' }) : t('common:timer.fill', { defaultValue: 'Fill' })}
          title={fitMode === 'fit' ? t('common:timer.switchToFill', { defaultValue: 'Switch to Fill mode' }) : t('common:timer.switchToFit', { defaultValue: 'Switch to Fit mode' })}
        >
          {fitMode === 'fit' ? t('common:timer.fit', { defaultValue: 'Fit' }) : t('common:timer.fill', { defaultValue: 'Fill' })}
        </button>

        {/* Right side - Custom badge and Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Custom video indicator badge */}
          {isCustomVideo && isLoaded && (
            <span className="px-2 py-1 text-xs font-medium bg-primary-500/90 text-white rounded-lg">
              {t('exercises:customVideo', { defaultValue: 'Custom' })}
            </span>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors backdrop-blur-sm border border-gray-200 dark:border-gray-600"
            aria-label={isFullscreen ? t('common:exitFullscreen', { defaultValue: 'Exit fullscreen' }) : t('common:enterFullscreen', { defaultValue: 'Enter fullscreen' })}
            title={isFullscreen ? t('common:exitFullscreen', { defaultValue: 'Exit fullscreen' }) : t('common:enterFullscreen', { defaultValue: 'Enter fullscreen' })}
          >
            {isFullscreen ? <ExitFullscreenIcon size={18} /> : <FullscreenIcon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
