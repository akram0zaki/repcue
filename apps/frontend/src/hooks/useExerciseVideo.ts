import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '../types';
import type { ExerciseMediaIndex, ExerciseMedia } from '../types/media';
import { VIDEO_DEMOS_ENABLED } from '../config/features';
import { recordVideoLoadError } from '../telemetry/videoTelemetry';

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
export function useExerciseVideo({ exercise, mediaIndex, enabled, isRunning, isActiveMovement, isPaused }: UseExerciseVideoOptions): UseExerciseVideoResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [media, setMedia] = useState<ExerciseMedia | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loopHandlersRef = useRef<Set<() => void>>(new Set());
  const lastTimeRef = useRef(0);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onLoop = useCallback((handler: () => void) => {
    loopHandlersRef.current.add(handler);
  }, []);

  // Resolve metadata & choose initial variant (square -> portrait -> landscape)
  useEffect(() => {
    if (!exercise || !mediaIndex || !exercise.has_video) {
      setMedia(null);
      setVideoUrl(null);
      setReady(false);
      return;
    }
    const m = mediaIndex[exercise.id];
    setMedia(m ?? null);
    if (!m) { setVideoUrl(null); return; }
    const chosen = m.video.square || m.video.portrait || m.video.landscape || null;
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
  const shouldPlay = VIDEO_DEMOS_ENABLED && enabled && !reducedMotion && !!videoUrl && isActiveMovement && !isPaused && isRunning;

  // Playback management (initial + dependency changes)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!shouldPlay) { if (!v.paused) v.pause(); return; }
    // In tests, play() is often stubbed; still invoke it synchronously.
    // Always call play() when shouldPlay flips true so spies observe it.
    const maybePromise = v.play();
    if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
      (maybePromise as Promise<void>).catch(() => {});
    }
  }, [shouldPlay]);

  // Resume after visibility change (e.g., user switched tabs/routes and came back)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const v = videoRef.current;
        if (v && shouldPlay && v.paused) {
          v.play().catch(err => console.debug('Auto-resume play rejected', err));
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [shouldPlay]);

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
  }, [videoUrl, shouldPlay, exercise]);

  return { videoRef, media, videoUrl, ready, error, onLoop };
}

export default useExerciseVideo;
