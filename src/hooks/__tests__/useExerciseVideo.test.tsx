import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
    const { result } = renderHook(() => useExerciseVideo({ exercise: { ...exercise, hasVideo: false }, mediaIndex, enabled: true, isRunning: false, isPaused: false }));
    expect(result.current.media).toBeNull();
    expect(result.current.videoUrl).toBeNull();
  });
  it('selects a variant when available', () => {
    const { result } = renderHook(() => useExerciseVideo({ exercise, mediaIndex, enabled: true, isRunning: false, isPaused: false }));
    expect(result.current.videoUrl).toBe('/videos/jumping-jacks-square.mp4');
  });
});
