/**
 * Video Prefetch Hook
 * 
 * Intelligently prefetches exercise videos based on context and user behavior:
 * - Workout mode: Prefetch all workout videos
 * - Rest period: Prefetch next exercise video
 * - Exercise browsing: Prefetch visible exercise videos
 * - Idle time: Background prefetch of frequently used videos
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Exercise, Workout } from '../types';
import type { ExerciseMediaIndex } from '../types/media';
import { VideoCacheService } from '../services/videoCacheService';
import { selectVideoVariant } from '../utils/selectVideoVariant';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import logger from '../utils/logger';

export interface PrefetchStrategy {
  // Prefetch all videos when workout starts
  workoutVideos: boolean;
  
  // Prefetch next exercise during rest
  nextExercise: boolean;
  
  // Prefetch videos in viewport during browsing
  visibleExercises: boolean;
  
  // Background prefetch on idle
  idleBackground: boolean;
}

// Default prefetch strategy (WiFi-friendly)
export const DEFAULT_PREFETCH_STRATEGY: PrefetchStrategy = {
  workoutVideos: true,
  nextExercise: true,
  visibleExercises: false,
  idleBackground: false,
};

export interface UseVideoPrefetchOptions {
  enabled?: boolean;
  strategy?: Partial<PrefetchStrategy>;
  mediaIndex?: ExerciseMediaIndex | null;
  exercises?: Exercise[]; // Required for resolving workout exercises by ID
}

export function useVideoPrefetch(options: UseVideoPrefetchOptions = {}) {
  const {
    enabled = true,
    strategy = DEFAULT_PREFETCH_STRATEGY,
    mediaIndex,
    exercises = [],
  } = options;

  const mergedStrategy = { ...DEFAULT_PREFETCH_STRATEGY, ...strategy };
  const prefetchQueueRef = useRef<Set<string>>(new Set());
  const isPrefetchingRef = useRef(false);
  const videoCacheService = useRef(VideoCacheService.getInstance());

  /**
   * Add URL to prefetch queue (de-duplicated)
   */
  const queuePrefetch = useCallback((url: string) => {
    if (url && !prefetchQueueRef.current.has(url)) {
      prefetchQueueRef.current.add(url);
    }
  }, []);

  /**
   * Process prefetch queue in background
   */
  const processPrefetchQueue = useCallback(async () => {
    if (isPrefetchingRef.current || prefetchQueueRef.current.size === 0) {
      return;
    }

    isPrefetchingRef.current = true;

    try {
      const urls = Array.from(prefetchQueueRef.current);
      prefetchQueueRef.current.clear();

      logger.log('[VideoPrefetch] Processing queue:', urls.length, 'videos');
      
      await videoCacheService.current.prefetchVideos(urls);
      
      logger.log('[VideoPrefetch] Queue processed successfully');
    } catch (error) {
      logger.error('[VideoPrefetch] Error processing queue:', error);
    } finally {
      isPrefetchingRef.current = false;
    }
  }, []);

  /**
   * Schedule prefetch using requestIdleCallback (non-blocking)
   */
  const schedulePrefetch = useCallback(() => {
    if (!enabled) return;

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => processPrefetchQueue(), { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(processPrefetchQueue, 100);
    }
  }, [enabled, processPrefetchQueue]);

  /**
   * Prefetch single exercise video
   */
  const prefetchExercise = useCallback(async (exercise: Exercise | null | undefined) => {
    if (!enabled || !exercise || !mediaIndex) return;

    try {
      let videoUrl: string | null = null;

      // Handle custom video URL
      if (exercise.custom_video_url) {
        videoUrl = await resolveVideoUrl(exercise.custom_video_url);
      } else {
        // Handle built-in exercise with media index
        const media = mediaIndex[exercise.id];
        if (media) {
          videoUrl = selectVideoVariant(media);
        }
      }

      if (videoUrl) {
        queuePrefetch(videoUrl);
        schedulePrefetch();
      }
    } catch (error) {
      logger.error('[VideoPrefetch] Error prefetching exercise:', error);
    }
  }, [enabled, mediaIndex, queuePrefetch, schedulePrefetch]);

  /**
   * Prefetch all videos in a workout
   */
  const prefetchWorkout = useCallback(async (workout: Workout | null | undefined) => {
    if (!enabled || !workout || !mergedStrategy.workoutVideos || !mediaIndex || exercises.length === 0) return;

    try {
      logger.log('[VideoPrefetch] Prefetching workout videos:', workout.name);

      for (const workoutExercise of workout.exercises) {
        // Look up the actual exercise by exercise_id
        const exercise = exercises.find(ex => ex.id === workoutExercise.exercise_id);
        if (!exercise) continue;

        let videoUrl: string | null = null;

        // Handle custom video URL
        if (exercise.custom_video_url) {
          videoUrl = await resolveVideoUrl(exercise.custom_video_url);
        } else {
          // Handle built-in exercise
          const media = mediaIndex[exercise.id];
          if (media) {
            videoUrl = selectVideoVariant(media);
          }
        }

        if (videoUrl) {
          queuePrefetch(videoUrl);
        }
      }

      schedulePrefetch();
    } catch (error) {
      logger.error('[VideoPrefetch] Error prefetching workout:', error);
    }
  }, [enabled, mergedStrategy.workoutVideos, mediaIndex, exercises, queuePrefetch, schedulePrefetch]);

  /**
   * Prefetch next exercise during rest
   */
  const prefetchNext = useCallback(async (nextExercise: Exercise | null | undefined) => {
    if (!enabled || !mergedStrategy.nextExercise || !nextExercise) return;

    logger.log('[VideoPrefetch] Prefetching next exercise:', nextExercise.name);
    await prefetchExercise(nextExercise);
  }, [enabled, mergedStrategy.nextExercise, prefetchExercise]);

  /**
   * Prefetch multiple exercises (e.g., visible in list)
   */
  const prefetchExercises = useCallback(async (exercises: Exercise[]) => {
    if (!enabled || !mergedStrategy.visibleExercises || !mediaIndex) return;

    try {
      logger.log('[VideoPrefetch] Prefetching exercises:', exercises.length);

      for (const exercise of exercises) {
        let videoUrl: string | null = null;

        // Handle custom video URL
        if (exercise.custom_video_url) {
          videoUrl = await resolveVideoUrl(exercise.custom_video_url);
        } else {
          // Handle built-in exercise
          const media = mediaIndex[exercise.id];
          if (media) {
            videoUrl = selectVideoVariant(media);
          }
        }

        if (videoUrl) {
          queuePrefetch(videoUrl);
        }
      }

      schedulePrefetch();
    } catch (error) {
      logger.error('[VideoPrefetch] Error prefetching exercises:', error);
    }
  }, [enabled, mergedStrategy.visibleExercises, mediaIndex, queuePrefetch, schedulePrefetch]);

  /**
   * Clear prefetch queue
   */
  const clearQueue = useCallback(() => {
    prefetchQueueRef.current.clear();
  }, []);

  return {
    prefetchExercise,
    prefetchWorkout,
    prefetchNext,
    prefetchExercises,
    clearQueue,
    isEnabled: enabled,
    strategy: mergedStrategy,
  };
}

/**
 * Hook for workout-specific prefetching
 * Automatically prefetches workout videos on mount
 */
export function useWorkoutVideoPrefetch(
  workout: Workout | null | undefined,
  options: UseVideoPrefetchOptions = {}
) {
  const prefetch = useVideoPrefetch(options);

  useEffect(() => {
    if (workout && prefetch.isEnabled) {
      prefetch.prefetchWorkout(workout);
    }
  }, [workout, prefetch.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return prefetch;
}

/**
 * Hook for next exercise prefetching during rest
 */
export function useNextExercisePrefetch(
  nextExercise: Exercise | null | undefined,
  isResting: boolean,
  options: UseVideoPrefetchOptions = {}
) {
  const prefetch = useVideoPrefetch(options);

  useEffect(() => {
    if (isResting && nextExercise && prefetch.isEnabled) {
      prefetch.prefetchNext(nextExercise);
    }
  }, [isResting, nextExercise, prefetch.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return prefetch;
}

export default useVideoPrefetch;
