import type { ExerciseMedia } from '../types/media';

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

export default selectVideoVariant;
