import type { ExerciseMedia } from '../types/media';
import type { Exercise } from '../types';

// Select the best fitting video variant for given (or current) viewport.
// Tall -> portrait, wide -> landscape, else square; graceful fallback ordering.
// Security: returns only static asset paths defined in trusted JSON metadata.
export function selectVideoVariant(media: ExerciseMedia | null | undefined, viewportWidth?: number, viewportHeight?: number): string | null {
  if (!media || !media.video) return null;
  const vw = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  const vh = viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
  if (vh > vw && media.video.portrait) return media.video.portrait;
  if (vw > vh && media.video.landscape) return media.video.landscape;
  return media.video.square || media.video.portrait || media.video.landscape || null;
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
