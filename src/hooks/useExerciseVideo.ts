import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '../types';
import type { ExerciseMediaIndex, ExerciseMedia } from '../types/media';
import { VIDEO_DEMOS_ENABLED } from '../config/features';

interface UseExerciseVideoOptions {
  exercise: Exercise | null | undefined;
  mediaIndex: ExerciseMediaIndex | null | undefined;
  enabled: boolean; // user + feature toggle
  isRunning: boolean;
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
export function useExerciseVideo({ exercise, mediaIndex, enabled, isRunning, isPaused }: UseExerciseVideoOptions): UseExerciseVideoResult {
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
    if (!exercise || !mediaIndex || !exercise.hasVideo) {
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

  // Playback management
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const shouldPlay = VIDEO_DEMOS_ENABLED && enabled && !reducedMotion && !!videoUrl && isRunning && !isPaused;
    if (!shouldPlay) { if (!v.paused) v.pause(); return; }
    v.play().catch(err => console.warn('Video play rejected', err));
  }, [enabled, isRunning, isPaused, videoUrl, reducedMotion]);

  // Ready / error state tracking
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setReady(false); setError(null);
    const loaded = () => setReady(true);
    const failed = () => setError(new Error('video-load-failed'));
    v.addEventListener('loadeddata', loaded);
    v.addEventListener('error', failed);
    return () => { v.removeEventListener('loadeddata', loaded); v.removeEventListener('error', failed); };
  }, [videoUrl]);

  return { videoRef, media, videoUrl, ready, error, onLoop };
}

export default useExerciseVideo;
