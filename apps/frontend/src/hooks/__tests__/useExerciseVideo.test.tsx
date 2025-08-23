import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useExerciseVideo from '../useExerciseVideo';
import * as telemetry from '../../telemetry/videoTelemetry';
import { ConsentService } from '../../services/consentService';
import type { Exercise } from '../../types';
import type { ExerciseMediaIndex } from '../../types/media';

const exercise: Exercise = {
  id: 'jumping-jacks',
  name: 'Jumping Jacks',
  description: 'A basic warmup move',
  category: 'cardio',
  exerciseType: 'repetition-based',
  defaultSets: 1,
  defaultReps: 10,
  isFavorite: false,
  tags: [],
  hasVideo: true
};

const mediaIndex: ExerciseMediaIndex = {
  'jumping-jacks': { id: 'jumping-jacks', repsPerLoop: 1, fps: 30, video: { square: '/videos/jumping-jacks-square.mp4' } }
};

beforeEach(() => {
  // Provide a typed stub for matchMedia
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia;
  // Reset spies between tests
  vi.restoreAllMocks();
});

describe('useExerciseVideo', () => {
  it('returns null video when exercise.hasVideo is false', () => {
    const { result } = renderHook(() => useExerciseVideo({ exercise: { ...exercise, hasVideo: false }, mediaIndex, enabled: true, isRunning: false, isActiveMovement: false, isPaused: false }));
    expect(result.current.media).toBeNull();
    expect(result.current.videoUrl).toBeNull();
  });
  it('selects a variant when available', () => {
    const { result } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: false, isActiveMovement: false, isPaused: false }));
    expect(result.current.videoUrl).toBe('/videos/jumping-jacks-square.mp4');
  });
  it('does not play when active movement flag is false though running is true', () => {
  const playSpy = vi.fn();
  // Provide a minimal constructor-compatible stub for HTMLVideoElement
  global.HTMLVideoElement = class { play = playSpy; pause = vi.fn(); addEventListener(){} removeEventListener(){} } as unknown as typeof HTMLVideoElement;
    renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: false, isPaused: false }));
    expect(playSpy).not.toHaveBeenCalled();
  });
  it('resets video time when isRunning becomes false', () => {
    let currentRunning = true;
  const playSpy = vi.fn();
  const pauseSpy = vi.fn();
    let currentTimeSet = 0;
  // Minimal constructor-compatible stub for HTMLVideoElement with currentTime
  global.HTMLVideoElement = class { play = playSpy; pause = pauseSpy; addEventListener(){} removeEventListener(){} set currentTime(v:number){ currentTimeSet = v; } get currentTime(){ return currentTimeSet; } } as unknown as typeof HTMLVideoElement;
    const { rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: currentRunning, isActiveMovement: currentRunning, isPaused: false }));
    // Transition to stopped
    currentRunning = false;
    rerender();
    expect(currentTimeSet).toBe(0);
  });
  it.skip('gracefully falls back when video element fires error (pending integration test with DOM video element)', async () => {
  const listeners: Record<string, Array<(...args: unknown[]) => unknown>> = { error: [], loadeddata: [], timeupdate: [] };
    // minimal mock with event system
    global.HTMLVideoElement = class { 
      play = vi.fn(); pause = vi.fn();
      addEventListener(ev:string, cb:(...args: unknown[]) => unknown){ (listeners[ev] ||= []).push(cb); }
      removeEventListener(){}
    } as unknown as typeof HTMLVideoElement;
  const { result, rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: true, isPaused: false }));
    // Simulate error
  await act(async () => { listeners.error.forEach(fn => fn()); });
  // Force rerender to flush updated state from internal hook setters
  rerender();
  expect(result.current.error).toBeTruthy();
  });

  it('plays video when all gating conditions satisfied', () => {
    const playSpy = vi.fn();
    const pauseSpy = vi.fn();
    // Track listeners so we mirror real behaviour (not needed for this specific test but keeps parity)
    const listeners: Record<string, Array<(...args: unknown[]) => unknown>> = { timeupdate: [], loadeddata: [], error: [] };
    // minimal mock element implementation
    class mockVideoEl {
      play = () => { playSpy(); return Promise.resolve(); };
      pause = pauseSpy;
      currentTime = 0;
      addEventListener(ev: string, cb: (...args: unknown[]) => unknown){ (listeners[ev] ||= []).push(cb); }
      removeEventListener(){}
      paused = false;
    }
    // Provide constructor globally (some code may instanceof check)
  global.HTMLVideoElement = mockVideoEl as unknown as typeof HTMLVideoElement;
    // Render initially with movement disabled so we can attach ref before enabling playback
    let running = false; let active = false;
    const { result, rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: running, isActiveMovement: active, isPaused: false }));
    // Attach mock element to ref like a component would
    act(() => { // ensure React processes subsequent effects predictably
      result.current.videoRef.current = new mockVideoEl() as unknown as HTMLVideoElement;
    });
    // Now enable running + active movement which flips shouldPlay false->true triggering effect
    running = true; active = true;
    rerender();
    expect(playSpy).toHaveBeenCalled();
  });

  it('does not play when reduced motion preference active', () => {
    // Force reduced motion with typed stub
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;
  const playSpy = vi.fn();
  // minimal constructor stub for tests
  global.HTMLVideoElement = class { play = playSpy; pause = vi.fn(); addEventListener(){} removeEventListener(){} } as unknown as typeof HTMLVideoElement;
    renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: true, isPaused: false }));
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('records telemetry on error when analytics consent granted', async () => {
    const recordSpy = vi.spyOn(telemetry, 'recordVideoLoadError').mockImplementation(async () => {});
    // Mock consent service to grant analytics
    vi.spyOn(ConsentService, 'getInstance').mockReturnValue({
      hasAnalyticsConsent: () => true,
    } as any);
    const listeners: Record<string, Array<(...args: unknown[]) => unknown>> = { error: [], loadeddata: [], timeupdate: [] };
    class mockVideoEl {
      play = () => Promise.resolve();
      pause = vi.fn();
      currentTime = 0;
      paused = false;
      addEventListener(ev: string, cb: (...args: unknown[]) => unknown){ (listeners[ev] ||= []).push(cb); }
      removeEventListener(){}
    }
  global.HTMLVideoElement = mockVideoEl as unknown as typeof HTMLVideoElement;
    // Start with inactive so we can assign ref first
    let running = false; let active = false;
    const { result, rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: running, isActiveMovement: active, isPaused: false }));
    act(() => { // attach element
      result.current.videoRef.current = new mockVideoEl() as unknown as HTMLVideoElement;
    });
    // Enable active movement to register listeners in effect
    running = true; active = true;
    rerender();
    // Fire error listeners
    await act(async () => { listeners.error.forEach(fn => fn()); });
    // Rerender to flush state updates from setError
    rerender();
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it('does not record telemetry on error without analytics consent', async () => {
    const recordSpy = vi.spyOn(telemetry, 'recordVideoLoadError').mockImplementation(async () => {});
    // Mock consent service to deny analytics
    vi.spyOn(ConsentService, 'getInstance').mockReturnValue({
      hasAnalyticsConsent: () => false,
    } as any);
    const listeners: Record<string, Array<(...args: unknown[]) => unknown>> = { error: [], loadeddata: [], timeupdate: [] };
  // minimal constructor stub for tests
  global.HTMLVideoElement = class { 
      play = vi.fn(); pause = vi.fn();
      addEventListener(ev:string, cb:(...args: unknown[]) => unknown){ (listeners[ev] ||= []).push(cb); }
      removeEventListener(){}
  } as unknown as typeof HTMLVideoElement;
    const { rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: true, isPaused: false }));
    await act(async () => { listeners.error.forEach(fn => fn()); });
    rerender();
    expect(recordSpy).not.toHaveBeenCalled();
  });
});
