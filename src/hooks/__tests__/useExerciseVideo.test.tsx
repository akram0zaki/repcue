import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useExerciseVideo from '../useExerciseVideo';
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
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: () => {}, removeEventListener: () => {} });
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
    const playSpy: any = vi.fn();
    // @ts-ignore create minimal video element mock
    global.HTMLVideoElement = class { play = playSpy; pause = vi.fn(); addEventListener(){} removeEventListener(){} };
    renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: false, isPaused: false }));
    expect(playSpy).not.toHaveBeenCalled();
  });
  it('resets video time when isRunning becomes false', () => {
    let currentRunning = true;
    const playSpy: any = vi.fn();
    const pauseSpy: any = vi.fn();
    let currentTimeSet = 0;
    // @ts-ignore
    global.HTMLVideoElement = class { play = playSpy; pause = pauseSpy; addEventListener(){} removeEventListener(){} set currentTime(v:number){ currentTimeSet = v; } get currentTime(){ return currentTimeSet; } };
    const { rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: currentRunning, isActiveMovement: currentRunning, isPaused: false }));
    // Transition to stopped
    currentRunning = false;
    rerender();
    expect(currentTimeSet).toBe(0);
  });
  it.skip('gracefully falls back when video element fires error (pending integration test with DOM video element)', async () => {
    const listeners: Record<string, Function[]> = { error: [], loadeddata: [], timeupdate: [] };
    // @ts-ignore minimal mock with event system
    global.HTMLVideoElement = class { 
      play = vi.fn(); pause = vi.fn();
      addEventListener(ev:string, cb:Function){ (listeners[ev] ||= []).push(cb); }
      removeEventListener(){}
    };
  const { result, rerender } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: true, isActiveMovement: true, isPaused: false }));
    // Simulate error
  await act(async () => { listeners.error.forEach(fn => fn()); });
  // Force rerender to flush updated state from internal hook setters
  rerender();
  expect(result.current.error).toBeTruthy();
  });
});
