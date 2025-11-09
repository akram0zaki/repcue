import type { ExerciseMedia, VideoAspect, VideoFormat, VideoResolution } from '../types/media';
import type { Exercise } from '../types';
import { VIDEO_R2_ENABLED } from '../config/features';
import logger from './logger';

/**
 * Detect browser codec support using HTMLVideoElement.canPlayType
 * Prefers WebM (VP9) over MP4 (H.264) for better compression
 */
function detectCodecSupport(): VideoFormat[] {
  if (typeof document === 'undefined') {
    return ['webm', 'mp4']; // SSR fallback
  }

  const video = document.createElement('video');
  const formats: VideoFormat[] = [];

  // Check WebM VP9 support
  if (video.canPlayType('video/webm; codecs="vp9"') !== '') {
    formats.push('webm');
  }

  // Check MP4 H.264 support (universal fallback)
  if (video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '') {
    formats.push('mp4');
  }

  return formats.length > 0 ? formats : ['mp4']; // Default to mp4 if detection fails
}

// Cache codec support result (doesn't change during session)
let cachedCodecSupport: VideoFormat[] | null = null;

function getCodecSupport(): VideoFormat[] {
  if (!cachedCodecSupport) {
    cachedCodecSupport = detectCodecSupport();
  }
  return cachedCodecSupport;
}

/**
 * Determine best aspect ratio based on viewport dimensions
 */
function selectAspect(viewportWidth: number, viewportHeight: number): VideoAspect {
  const aspectRatio = viewportWidth / viewportHeight;
  
  // Portrait: tall viewports (< 0.75 aspect ratio)
  if (aspectRatio < 0.75) {
    return 'portrait';
  }
  
  // Landscape: wide viewports (> 1.33 aspect ratio)
  if (aspectRatio > 1.33) {
    return 'landscape';
  }
  
  // Square: everything else
  return 'square';
}

/**
 * Select best resolution based on viewport size and available variants
 * Prefers native resolution or next higher, with fallback to lower resolutions
 */
function selectResolution(
  availableResolutions: VideoResolution[],
  viewportWidth: number,
  viewportHeight: number
): VideoResolution | null {
  if (availableResolutions.length === 0) return null;

  // Determine target resolution based on viewport
  const maxDim = Math.max(viewportWidth, viewportHeight);
  
  // Sort resolutions numerically
  const sorted = [...availableResolutions].sort((a, b) => {
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    return aNum - bNum;
  });

  // Find best match (prefer equal or next higher)
  for (const res of sorted) {
    const resNum = parseInt(res, 10);
    if (resNum >= maxDim) {
      return res;
    }
  }

  // Fallback to highest available
  return sorted[sorted.length - 1];
}

/**
 * Select best video variant from R2 variants structure
 * Returns URL of best matching variant or null if none available
 */
function selectFromVariants(
  media: ExerciseMedia,
  viewportWidth: number,
  viewportHeight: number
): string | null {
  if (!media.variants) return null;

  // Determine preferred aspect ratio
  const preferredAspect = selectAspect(viewportWidth, viewportHeight);
  
  // Try preferred aspect first, then fallback to others
  const aspectFallbackOrder: VideoAspect[] = [
    preferredAspect,
    preferredAspect === 'portrait' ? 'square' : 'portrait',
    preferredAspect === 'landscape' ? 'square' : 'landscape',
  ];

  // Get codec support order (prefer WebM)
  const formatPreference = getCodecSupport();

  // Try each aspect ratio in order
  for (const aspect of aspectFallbackOrder) {
    const aspectVariants = media.variants[aspect];
    if (!aspectVariants) continue;

    // Get available resolutions for this aspect
    const availableResolutions = Object.keys(aspectVariants) as VideoResolution[];
    
    // Select best resolution
    const resolution = selectResolution(availableResolutions, viewportWidth, viewportHeight);
    if (!resolution) continue;

    const resolutionVariants = aspectVariants[resolution];
    if (!resolutionVariants) continue;

    // Try each format in preference order
    for (const format of formatPreference) {
      const variant = resolutionVariants[format];
      if (variant?.url) {
        logger.log(`[Video] Selected R2 variant: ${aspect}/${resolution}/${format} -> ${variant.url}`);
        return variant.url;
      }
    }
  }

  logger.warn('[Video] No suitable R2 variant found');
  return null;
}

/**
 * Legacy video selection logic (backward compatibility)
 * Select the best fitting video variant for given (or current) viewport.
 * Tall -> portrait, wide -> landscape, else square; graceful fallback ordering.
 * Security: returns only static asset paths defined in trusted JSON metadata.
 */
function selectFromLegacy(
  media: ExerciseMedia,
  viewportWidth: number,
  viewportHeight: number
): string | null {
  if (!media.video) return null;
  
  const aspect = selectAspect(viewportWidth, viewportHeight);
  
  if (aspect === 'portrait' && media.video.portrait) return media.video.portrait;
  if (aspect === 'landscape' && media.video.landscape) return media.video.landscape;
  
  // Fallback order: square -> portrait -> landscape
  return media.video.square || media.video.portrait || media.video.landscape || null;
}

/**
 * Main video variant selection function
 * Supports both R2 variants (new) and legacy video paths
 */
export function selectVideoVariant(
  media: ExerciseMedia | null | undefined,
  viewportWidth?: number,
  viewportHeight?: number
): string | null {
  if (!media) return null;

  const vw = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  const vh = viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);

  // Use R2 variants if feature flag enabled and variants present
  if (VIDEO_R2_ENABLED && media.variants) {
    const url = selectFromVariants(media, vw, vh);
    if (url) return url;
    
    // Fallback to legacy if R2 selection fails
    logger.warn('[Video] R2 selection failed, falling back to legacy');
  }

  // Use legacy video selection
  return selectFromLegacy(media, vw, vh);
}

// Helper function to get video URL for any exercise (built-in or custom)
// For custom exercises with custom_video_url, returns that URL directly
// For built-in exercises, uses the media index and viewport-based selection
export function getExerciseVideoUrl(
  exercise: Exercise | null | undefined,
  mediaIndex: { [key: string]: ExerciseMedia } | null | undefined,
  viewportWidth?: number,
  viewportHeight?: number
): string | null {
  if (!exercise) return null;

  // For custom exercises with custom video URL, return it directly
  if (exercise.custom_video_url) {
    return exercise.custom_video_url;
  }

  // For built-in exercises, use the media index
  if (mediaIndex) {
    const media = mediaIndex[exercise.id];
    return selectVideoVariant(media, viewportWidth, viewportHeight);
  }

  return null;
}

export default selectVideoVariant;
