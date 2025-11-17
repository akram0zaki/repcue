import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '../types';
import type { ExerciseMediaIndex, ExerciseMedia } from '../types/media';
import { VIDEO_DEMOS_ENABLED } from '../config/features';
import { recordVideoLoadError } from '../telemetry/videoTelemetry';
import { resolveVideoUrl } from '../utils/resolveVideoUrl';
import { selectVideoVariant } from '../utils/selectVideoVariant';
import logger from '../utils/logger';

interface UseExerciseVideoOptions {
  exercise: Exercise | null | undefined;
  mediaIndex: ExerciseMediaIndex | null | undefined;
  enabled: boolean; // user + feature toggle
  // Raw timer running state (used for reset handling)
  isRunning: boolean;
  // Movement-active state (running & not resting/countdown) governing playback
  isActiveMovement: boolean;
  // Explicit paused state (manual pause UI, if any)
  isPaused: boolean;
  // Speed multiplier for video playback (0.5 = faster, 2.0 = slower)
  repSpeedFactor: number;
}

interface UseExerciseVideoResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  media: ExerciseMedia | null;
  videoUrl: string | null;
  ready: boolean;
  error: Error | null;
  onLoop: (handler: () => void) => void;
}

// Phase 1 hook: metadata resolution + loop boundary detection + basic playback gating.
export function useExerciseVideo({ exercise, mediaIndex, enabled, isRunning, isActiveMovement, isPaused, repSpeedFactor }: UseExerciseVideoOptions): UseExerciseVideoResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [media, setMedia] = useState<ExerciseMedia | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loopHandlersRef = useRef<Set<() => void>>(new Set());
  const lastTimeRef = useRef(0);
  const reducedMotion = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const mediaQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      return mediaQuery ? mediaQuery.matches : false;
    } catch {
      return false;
    }
  })();

  const onLoop = useCallback((handler: () => void) => {
    loopHandlersRef.current.add(handler);
  }, []);

  // Resolve metadata & choose initial variant (R2 variants preferred, fallback to legacy)
  useEffect(() => {
    if (!exercise) {
      setMedia(null);
      setVideoUrl(null);
      setReady(false);
      return;
    }

    // For custom exercises with custom_video_url, create a mock media object and resolve URL
    if (exercise.custom_video_url) {
      const resolveCustomVideo = async () => {
        try {
          const resolvedUrl = await resolveVideoUrl(exercise.custom_video_url);
          if (resolvedUrl) {
            // Create a mock media object for custom exercises
            const mockMedia: ExerciseMedia = {
              id: exercise.id,
              repsPerLoop: 1,
              fps: 30,
              video: {
                square: resolvedUrl
              }
            };
            setMedia(mockMedia);
            setVideoUrl(resolvedUrl);
          } else {
            setMedia(null);
            setVideoUrl(null);
          }
        } catch {
          setMedia(null);
          setVideoUrl(null);
        }
      };

      resolveCustomVideo();
      return;
    }

    // For built-in exercises (or any exercise without custom URL), use the media index
    if (!mediaIndex) {
      setMedia(null);
      setVideoUrl(null);
      setReady(false);
      return;
    }

    const m = mediaIndex[exercise.id];
    setMedia(m ?? null);
    if (!m) { setVideoUrl(null); return; }
    // Prefer R2 variants selection with viewport-aware choice
    const chosen = selectVideoVariant(m);
    setVideoUrl(chosen ?? null);
  }, [exercise, mediaIndex]);

  // Loop boundary detection via timeupdate wrap-around
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const handleTimeUpdate = () => {
      const t = v.currentTime;
      if (t < lastTimeRef.current - 0.1) {
        loopHandlersRef.current.forEach(fn => { try { fn(); } catch (e) { console.error('Loop handler error', e); } });
      }
      lastTimeRef.current = t;
    };
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => v.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoUrl]);

  // Reusable play condition
  // Only play during active movement phase (timer running & not countdown/rest)
  // Debug override: allow disabling autoplay without hiding the video
  const disableAutoplay = typeof window !== 'undefined' && (window as Window & { __DISABLE_VIDEO_AUTOPLAY__?: boolean }).__DISABLE_VIDEO_AUTOPLAY__ === true;
  const shouldPlay = VIDEO_DEMOS_ENABLED && enabled && !reducedMotion && !!videoUrl && isActiveMovement && !isPaused && isRunning && !disableAutoplay;

  // Apply playback speed multiplier
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    // Convert rep_speed_factor to playback rate (inverse: 0.5 = 2x speed, 2.0 = 0.5x speed)
    const playbackRate = 1 / repSpeedFactor;
    v.playbackRate = playbackRate;
    console.log('🎥 [Video Playback Rate] Set to:', playbackRate, '| Factor:', repSpeedFactor, '| Actual value:', v.playbackRate);
  }, [repSpeedFactor, videoUrl]);

  // Monitor playback rate changes (detect if something is overriding it)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const handleRateChange = () => {
      const expected = 1 / repSpeedFactor;
      console.log('🎥 [ratechange event] Playback rate changed to:', v.playbackRate, '| Expected:', expected);
      if (Math.abs(v.playbackRate - expected) > 0.01) {
        console.warn('⚠️ [ratechange] Playback rate differs from expected! Correcting...');
        v.playbackRate = expected;
      }
    };
    
    v.addEventListener('ratechange', handleRateChange);
    return () => v.removeEventListener('ratechange', handleRateChange);
  }, [repSpeedFactor]);

  // Playback management (initial + dependency changes)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!shouldPlay) { if (!v.paused) v.pause(); return; }
    // Ensure playback rate is set before playing
    const playbackRate = 1 / repSpeedFactor;
    console.log('🎥 [Playback mgmt] Setting rate before play:', playbackRate);
    v.playbackRate = playbackRate;
    console.log('🎥 [Playback mgmt] Rate after setting:', v.playbackRate);
    // In tests, play() is often stubbed; still invoke it synchronously.
    // Always call play() when shouldPlay flips true so spies observe it.
    const maybePromise = v.play();
    console.log('🎥 [Playback mgmt] Called play(), rate is now:', v.playbackRate);
    if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
      (maybePromise as Promise<void>).catch(() => {});
    }
  }, [shouldPlay, repSpeedFactor]);

  // Resume after visibility change (e.g., user switched tabs/routes and came back)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const v = videoRef.current;
        if (v && shouldPlay && v.paused) {
          // Ensure playback rate is set before resuming
          v.playbackRate = 1 / repSpeedFactor;
          v.play().catch(err => console.debug('Auto-resume play rejected', err));
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [shouldPlay, repSpeedFactor]);

  // When timer stops or resets, ensure video seeks to start for consistent next start
  useEffect(() => {
    if (!isRunning) {
      const v = videoRef.current;
      if (v) {
        try { v.currentTime = 0; } catch { /* noop */ }
      }
      lastTimeRef.current = 0; // Reset loop detection baseline
    }
  }, [isRunning]);

  // Ready / error state tracking (+ retry play on load for race conditions)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setReady(false); setError(null);
    const loaded = () => {
      setReady(true);
      // Apply playback rate when video loads
      const playbackRate = 1 / repSpeedFactor;
      v.playbackRate = playbackRate;
      logger.log('[video] Applied playback rate on load:', playbackRate);
      // Attempt play again in case metadata arrived after initial effect
      if (shouldPlay && v.paused) {
        v.play().catch(() => {});
      }
    };
    const failed = () => {
      // Phase 3 T-3.1: graceful fallback on error (404/network)
      setError(new Error('video-load-failed'));
      // Phase 4 telemetry: consent-aware bounded local log
      if (exercise && videoUrl) {
        recordVideoLoadError({ exercise_id: exercise.id, url: videoUrl, reason: 'element-error' });
      }
    };
    v.addEventListener('loadeddata', loaded);
    v.addEventListener('error', failed);
    return () => { v.removeEventListener('loadeddata', loaded); v.removeEventListener('error', failed); };
  }, [videoUrl, shouldPlay, exercise, repSpeedFactor]);

  // Cleanup blob URLs when component unmounts or video URL changes
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return { videoRef, media, videoUrl, ready, error, onLoop };
}

export default useExerciseVideo;
